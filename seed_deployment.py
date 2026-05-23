"""
seed_deployment.py — Seeds the handcrafted DEPLOYMENT.md into the DocDoctor SQLite database,
replacing any stale AI-generated content that may contain API error messages.

Run from project root:
    python seed_deployment.py
"""
import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join("backend", "data", "metadata.db")
DEPLOYMENT_MD_PATH = "DEPLOYMENT.md"

def seed():
    if not os.path.exists(DB_PATH):
        print(f"[ERROR] Database not found at: {DB_PATH}")
        return

    if not os.path.exists(DEPLOYMENT_MD_PATH):
        print(f"[ERROR] DEPLOYMENT.md not found at: {DEPLOYMENT_MD_PATH}")
        return

    with open(DEPLOYMENT_MD_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    cursor = conn.cursor()

    # Get all repositories
    cursor.execute("SELECT id, name FROM repositories ORDER BY id")
    repos = cursor.fetchall()

    if not repos:
        print("[WARN] No repositories found in database. Connect a repo first then re-run this script.")
        conn.close()
        return

    now = datetime.utcnow().isoformat()
    updated = 0

    for repo in repos:
        repo_id = repo["id"]
        repo_name = repo["name"]

        # Check if deployment doc exists
        cursor.execute(
            "SELECT id FROM documents WHERE repo_id = ? AND doc_type = ?",
            (repo_id, "deployment")
        )
        row = cursor.fetchone()

        if row:
            cursor.execute(
                """
                UPDATE documents
                SET title = ?, content = ?, updated_at = ?, status = ?, error_message = NULL
                WHERE repo_id = ? AND doc_type = ?
                """,
                ("Systems Deployment Guide", content, now, "completed", repo_id, "deployment")
            )
            print(f"[OK] Updated deployment doc for repo '{repo_name}' (id={repo_id})")
        else:
            cursor.execute(
                """
                INSERT INTO documents (repo_id, doc_type, title, content, created_at, updated_at, status, file_path, error_message)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (repo_id, "deployment", "Systems Deployment Guide", content, now, now, "completed", DEPLOYMENT_MD_PATH, None)
            )
            print(f"[OK] Inserted deployment doc for repo '{repo_name}' (id={repo_id})")

        updated += 1

    conn.commit()
    conn.close()
    print(f"\n[DONE] Seeded DEPLOYMENT.md for {updated} repository/repositories.")

if __name__ == "__main__":
    seed()
