import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger("webhook_handler")

class WebhookHandler:
    @staticmethod
    def parse_push_event(payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Parses a GitHub push webhook event and extracts changed files, commits, and repo info."""
        try:
            # 1. Verify this is a push payload
            if "ref" not in payload or "repository" not in payload:
                logger.warning("Invalid payload structure: missing 'ref' or 'repository'")
                return None

            ref = payload["ref"]
            # Extract branch from refs/heads/branch_name
            branch = ref.split("/")[-1] if "/" in ref else "main"

            repository = payload["repository"]
            repo_name = repository.get("name", "unknown")
            clone_url = repository.get("clone_url")

            if not clone_url:
                logger.warning("Repository payload missing 'clone_url'")
                return None

            commits = payload.get("commits", [])
            if not commits:
                logger.info("Push webhook received, but no commits found in payload.")
                return {
                    "repo_name": repo_name,
                    "clone_url": clone_url,
                    "branch": branch,
                    "commits": [],
                    "added": [],
                    "modified": [],
                    "deleted": []
                }

            # Gather aggregated list of changed files
            added_files = set()
            modified_files = set()
            deleted_files = set()
            
            latest_commit = commits[-1]
            commit_hash = latest_commit.get("id")
            author = latest_commit.get("author", {}).get("name", "Unknown Author")
            message = latest_commit.get("message", "No commit message")
            timestamp = latest_commit.get("timestamp")

            for commit in commits:
                for file in commit.get("added", []):
                    added_files.add(file)
                for file in commit.get("modified", []):
                    modified_files.add(file)
                for file in commit.get("deleted", []):
                    deleted_files.add(file)

            # Resolve overlaps (e.g. if a file was added and then modified, it's just 'added')
            resolved_added = list(added_files - deleted_files)
            resolved_modified = list(modified_files - added_files - deleted_files)
            resolved_deleted = list(deleted_files)

            logger.info(f"Parsed push webhook on {repo_name}:{branch}. Commit: {commit_hash} by {author}.")
            logger.info(f"Changes: {len(resolved_added)} added, {len(resolved_modified)} modified, {len(resolved_deleted)} deleted.")

            return {
                "repo_name": repo_name,
                "clone_url": clone_url,
                "branch": branch,
                "commit_hash": commit_hash,
                "author": author,
                "message": message,
                "timestamp": timestamp,
                "added": resolved_added,
                "modified": resolved_modified,
                "deleted": resolved_deleted
            }
        except Exception as e:
            logger.error(f"Error parsing push webhook event: {e}")
            return None

webhook_handler = WebhookHandler()
