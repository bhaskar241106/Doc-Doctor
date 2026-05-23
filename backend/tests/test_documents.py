import unittest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from backend.utils.config import get_ai_settings
from backend.services.db_service import db
from backend.api.routes import get_repository_document_by_type, regenerate_repository_document

class TestRepositoryDocuments(unittest.IsolatedAsyncioTestCase):
    """Validation test suite for robust repository document auto-generation and status management."""

    @patch("backend.api.routes.db")
    async def test_get_document_repository_not_found(self, mock_db):
        """Verify requesting documents for non-existent repositories returns 404 with reason."""
        mock_db.get_repository.return_value = None

        bg_tasks = MagicMock()
        response = await get_repository_document_by_type(repo_id=999, doc_type="readme", background_tasks=bg_tasks)

        self.assertEqual(response.status_code, 404)
        body = json.loads(response.body.decode())
        self.assertEqual(body["status"], "missing")
        self.assertEqual(body["reason"], "repository_not_found")

    @patch("backend.api.routes.db")
    async def test_get_document_invalid_type(self, mock_db):
        """Verify requesting an invalid document type returns 400 with reason."""
        mock_db.get_repository.return_value = {"id": 1, "name": "DocDoctor"}

        bg_tasks = MagicMock()
        response = await get_repository_document_by_type(repo_id=1, doc_type="invalid_doc", background_tasks=bg_tasks)

        self.assertEqual(response.status_code, 400)
        body = json.loads(response.body.decode())
        self.assertEqual(body["status"], "missing")
        self.assertEqual(body["reason"], "invalid_document_type")

    @patch("backend.api.routes.db")
    @patch("backend.api.routes.orchestrator")
    async def test_get_document_missing_queues_generation(self, mock_orchestrator, mock_db):
        """Verify that requesting a missing document returns 202, sets status to pending, and queues background generation."""
        mock_db.get_repository.return_value = {"id": 1, "name": "DocDoctor"}
        mock_db.get_document_by_type.return_value = None # Document does not exist in DB

        bg_tasks = MagicMock()
        response = await get_repository_document_by_type(repo_id=1, doc_type="pr_summary", background_tasks=bg_tasks)

        # Assert status is 202 Accepted
        self.assertEqual(response.status_code, 202)
        body = json.loads(response.body.decode())
        self.assertEqual(body["status"], "pending")
        self.assertEqual(body["reason"], "generation_in_progress")

        # Verify DB upserted placeholder status
        mock_db.upsert_document.assert_called_once_with(
            repo_id=1,
            doc_type="pr_summary",
            title="Generating Pr Summary...",
            content="",
            status="pending"
        )
        # Verify generation task was queued in background
        bg_tasks.add_task.assert_called_once_with(
            mock_orchestrator.generate_document_on_demand,
            1,
            "pr_summary"
        )

    @patch("backend.api.routes.db")
    async def test_get_document_generating(self, mock_db):
        """Verify that requesting a document that is currently generating returns 202 status."""
        mock_db.get_repository.return_value = {"id": 1, "name": "DocDoctor"}
        mock_db.get_document_by_type.return_value = {
            "repo_id": 1,
            "doc_type": "architecture",
            "title": "Generating Architecture...",
            "content": "",
            "status": "generating"
        }

        bg_tasks = MagicMock()
        response = await get_repository_document_by_type(repo_id=1, doc_type="architecture", background_tasks=bg_tasks)

        self.assertEqual(response.status_code, 202)
        body = json.loads(response.body.decode())
        self.assertEqual(body["status"], "generating")
        self.assertEqual(body["reason"], "generation_in_progress")

    @patch("backend.api.routes.db")
    async def test_get_document_failed(self, mock_db):
        """Verify that requesting a failed document returns 500 status with error details."""
        mock_db.get_repository.return_value = {"id": 1, "name": "DocDoctor"}
        mock_db.get_document_by_type.return_value = {
            "repo_id": 1,
            "doc_type": "api_docs",
            "title": "API Generation Failed",
            "content": "",
            "status": "failed",
            "error_message": "LLM Connection Timeout"
        }

        bg_tasks = MagicMock()
        response = await get_repository_document_by_type(repo_id=1, doc_type="api_docs", background_tasks=bg_tasks)

        self.assertEqual(response.status_code, 500)
        body = json.loads(response.body.decode())
        self.assertEqual(body["status"], "failed")
        self.assertEqual(body["reason"], "generation_failed")
        self.assertEqual(body["error"], "LLM Connection Timeout")

    @patch("backend.api.routes.db")
    async def test_get_document_completed_success(self, mock_db):
        """Verify requesting a completed document returns the document payload cleanly."""
        mock_db.get_repository.return_value = {"id": 1, "name": "DocDoctor"}
        mock_doc = {
            "id": 42,
            "repo_id": 1,
            "doc_type": "readme",
            "title": "README.md",
            "content": "# Unified README",
            "status": "completed",
            "file_path": "/path/to/readme.md"
        }
        mock_db.get_document_by_type.return_value = mock_doc

        bg_tasks = MagicMock()
        response = await get_repository_document_by_type(repo_id=1, doc_type="readme", background_tasks=bg_tasks)

        # Returns raw dict document object directly
        self.assertEqual(response, mock_doc)

    @patch("backend.api.routes.db")
    @patch("backend.api.routes.orchestrator")
    async def test_regenerate_document(self, mock_orchestrator, mock_db):
        """Verify that calling regenerate sets status to pending and queues background task."""
        mock_db.get_repository.return_value = {"id": 1, "name": "DocDoctor"}

        bg_tasks = MagicMock()
        response = await regenerate_repository_document(repo_id=1, doc_type="onboarding", background_tasks=bg_tasks)

        self.assertEqual(response["status"], "pending")
        self.assertEqual(response["reason"], "generation_in_progress")

        # Verify DB locked placeholder to pending
        mock_db.upsert_document.assert_called_once_with(
            repo_id=1,
            doc_type="onboarding",
            title="Regenerating Onboarding...",
            content="",
            status="pending"
        )
        # Verify background generation task was queued
        bg_tasks.add_task.assert_called_once_with(
            mock_orchestrator.generate_document_on_demand,
            1,
            "onboarding"
        )

    def test_database_cascade_delete_cleanup(self):
        """Verify that deleting a repository cascadingly deletes all its documents in the SQLite database."""
        # 1. Create a dummy repository
        repo = db.create_repository(
            name="TestDeleteRepo",
            clone_url="https://github.com/test/repo",
            local_path="./data/test_delete_path",
            branch="main"
        )
        repo_id = repo["id"]

        # 2. Add dummy documents
        db.upsert_document(repo_id, "readme", "README.md", "# Test Content", "completed")
        db.upsert_document(repo_id, "pr_summary", "Commit Summary", "PR Content", "completed")

        # Verify they exist in DB
        docs = db.get_documents_by_repo(repo_id)
        self.assertEqual(len(docs), 2)

        # 3. Delete the repository
        deleted = db.delete_repository(repo_id)
        self.assertTrue(deleted)

        # 4. Verify documents are deleted cascadingly due to foreign key cascade
        remaining_docs = db.get_documents_by_repo(repo_id)
        self.assertEqual(len(remaining_docs), 0)


if __name__ == "__main__":
    unittest.main()
