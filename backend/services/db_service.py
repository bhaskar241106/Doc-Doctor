import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any
from backend.utils.config import settings

class DBService:
    def __init__(self, db_path: str = settings.METADATA_DB_PATH):
        self.db_path = db_path
        self._init_db()

    def _get_conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def _init_db(self):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            
            # Repositories table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS repositories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                clone_url TEXT NOT NULL,
                local_path TEXT NOT NULL,
                branch TEXT NOT NULL,
                created_at TEXT NOT NULL,
                last_sync_at TEXT
            )
            """)

            # Generated documents table
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_id INTEGER NOT NULL,
                doc_type TEXT NOT NULL,
                title TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE,
                UNIQUE(repo_id, doc_type)
            )
            """)

            # Commit activity / pushes
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS commit_activities (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                repo_id INTEGER NOT NULL,
                commit_hash TEXT NOT NULL,
                author TEXT NOT NULL,
                message TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                changed_files TEXT NOT NULL,
                FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
            )
            """)

            # Chat Sessions
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id TEXT PRIMARY KEY,
                repo_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                created_at TEXT NOT NULL,
                FOREIGN KEY (repo_id) REFERENCES repositories(id) ON DELETE CASCADE
            )
            """)

            # Chat Messages
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS chat_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                citations TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
            )
            """)

            # System Settings
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS system_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
            """)
            
            conn.commit()

    # Repository operations
    def create_repository(self, name: str, clone_url: str, local_path: str, branch: str = "main") -> Dict[str, Any]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            created_at = datetime.utcnow().isoformat()
            cursor.execute(
                "INSERT INTO repositories (name, clone_url, local_path, branch, created_at) VALUES (?, ?, ?, ?, ?)",
                (name, clone_url, local_path, branch, created_at)
            )
            repo_id = cursor.lastrowid
            conn.commit()
            return {
                "id": repo_id,
                "name": name,
                "clone_url": clone_url,
                "local_path": local_path,
                "branch": branch,
                "created_at": created_at,
                "last_sync_at": None
            }

    def get_repositories(self) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repositories ORDER BY id DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_repository(self, repo_id: int) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM repositories WHERE id = ?", (repo_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    def update_repo_sync_time(self, repo_id: int):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()
            cursor.execute(
                "UPDATE repositories SET last_sync_at = ? WHERE id = ?",
                (now, repo_id)
            )
            conn.commit()

    def delete_repository(self, repo_id: int) -> bool:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM repositories WHERE id = ?", (repo_id,))
            conn.commit()
            return cursor.rowcount > 0

    # Document operations
    def upsert_document(self, repo_id: int, doc_type: str, title: str, content: str) -> Dict[str, Any]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            now = datetime.utcnow().isoformat()
            
            # Check if document exists
            cursor.execute(
                "SELECT id FROM documents WHERE repo_id = ? AND doc_type = ?",
                (repo_id, doc_type)
            )
            row = cursor.fetchone()
            
            if row:
                doc_id = row['id']
                cursor.execute(
                    "UPDATE documents SET title = ?, content = ?, updated_at = ? WHERE id = ?",
                    (title, content, now, doc_id)
                )
            else:
                cursor.execute(
                    "INSERT INTO documents (repo_id, doc_type, title, content, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                    (repo_id, doc_type, title, content, now, now)
                )
                doc_id = cursor.lastrowid
                
            conn.commit()
            return {
                "id": doc_id,
                "repo_id": repo_id,
                "doc_type": doc_type,
                "title": title,
                "content": content,
                "created_at": now,
                "updated_at": now
            }

    def get_documents_by_repo(self, repo_id: int) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents WHERE repo_id = ?", (repo_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_document_by_type(self, repo_id: int, doc_type: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents WHERE repo_id = ? AND doc_type = ?", (repo_id, doc_type))
            row = cursor.fetchone()
            return dict(row) if row else None

    # Commit operations
    def add_commit_activity(self, repo_id: int, commit_hash: str, author: str, message: str, timestamp: str, changed_files: List[str]) -> Dict[str, Any]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            files_str = json.dumps(changed_files)
            cursor.execute(
                "INSERT INTO commit_activities (repo_id, commit_hash, author, message, timestamp, changed_files) VALUES (?, ?, ?, ?, ?, ?)",
                (repo_id, commit_hash, author, message, timestamp, files_str)
            )
            activity_id = cursor.lastrowid
            conn.commit()
            return {
                "id": activity_id,
                "repo_id": repo_id,
                "commit_hash": commit_hash,
                "author": author,
                "message": message,
                "timestamp": timestamp,
                "changed_files": changed_files
            }

    def get_commit_activities(self, repo_id: int) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM commit_activities WHERE repo_id = ? ORDER BY id DESC LIMIT 50", (repo_id,))
            rows = cursor.fetchall()
            results = []
            for row in rows:
                item = dict(row)
                item['changed_files'] = json.loads(item['changed_files'])
                results.append(item)
            return results

    # Chat Sessions operations
    def create_chat_session(self, repo_id: int, title: str) -> Dict[str, Any]:
        session_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO chat_sessions (id, repo_id, title, created_at) VALUES (?, ?, ?, ?)",
                (session_id, repo_id, title, created_at)
            )
            conn.commit()
            return {
                "id": session_id,
                "repo_id": repo_id,
                "title": title,
                "created_at": created_at
            }

    def get_chat_sessions(self, repo_id: int) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM chat_sessions WHERE repo_id = ? ORDER BY created_at DESC", (repo_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_chat_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

    # Chat Message operations
    def add_chat_message(self, session_id: str, role: str, content: str, citations: List[str]) -> Dict[str, Any]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            citations_str = json.dumps(citations)
            timestamp = datetime.utcnow().isoformat()
            cursor.execute(
                "INSERT INTO chat_messages (session_id, role, content, citations, timestamp) VALUES (?, ?, ?, ?, ?)",
                (session_id, role, content, citations_str, timestamp)
            )
            msg_id = cursor.lastrowid
            conn.commit()
            return {
                "id": msg_id,
                "session_id": session_id,
                "role": role,
                "content": content,
                "citations": citations,
                "timestamp": timestamp
            }

    def get_chat_messages(self, session_id: str) -> List[Dict[str, Any]]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM chat_messages WHERE session_id = ? ORDER BY id ASC", (session_id,))
            rows = cursor.fetchall()
            results = []
            for row in rows:
                item = dict(row)
                item['citations'] = json.loads(item['citations'])
                results.append(item)
            return results

    # System settings operations
    def get_setting(self, key: str, default: Optional[str] = None) -> Optional[str]:
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM system_settings WHERE key = ?", (key,))
            row = cursor.fetchone()
            return row["value"] if row else default

    def set_setting(self, key: str, value: str):
        with self._get_conn() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)",
                (key, value)
            )
            conn.commit()

db = DBService()
