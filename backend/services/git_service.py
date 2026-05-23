import os
import shutil
import logging
from typing import List, Dict, Any, Optional
import git

logger = logging.getLogger("git_service")

class GitService:
    @staticmethod
    def is_git_url(url: str) -> bool:
        """Check if the string looks like a git remote URL."""
        return url.startswith("http://") or url.startswith("https://") or url.startswith("git@")

    def clone_or_pull(self, clone_url: str, local_path: str, branch: str = "main") -> str:
        """Clones a remote repository, or pulls if already cloned. If it's a local folder, verifies it."""
        if not self.is_git_url(clone_url):
            # It's a local folder path! Just verify it exists.
            if os.path.exists(clone_url):
                logger.info(f"Using local directory path: {clone_url}")
                return clone_url
            else:
                raise ValueError(f"Local directory path does not exist: {clone_url}")

        # Remote git URL cloning
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        if os.path.exists(local_path) and os.path.exists(os.path.join(local_path, ".git")):
            try:
                logger.info(f"Repository already cloned. Pulling latest from {branch}...")
                repo = git.Repo(local_path)
                repo.git.checkout(branch)
                origin = repo.remotes.origin
                origin.pull()
                logger.info("Successfully pulled latest code.")
                return local_path
            except Exception as e:
                logger.warning(f"Git pull failed: {e}. Attempting clean clone...")
                shutil.rmtree(local_path, ignore_errors=True)

        logger.info(f"Cloning {clone_url} (branch: {branch}) into {local_path}...")
        try:
            git.Repo.clone_from(clone_url, local_path, branch=branch)
        except git.GitCommandError as e:
            logger.warning(f"Clone failed for branch '{branch}': {e}. Retrying with default branch...")
            if os.path.exists(local_path) and not os.path.exists(os.path.join(local_path, ".git")):
                shutil.rmtree(local_path, ignore_errors=True)
            git.Repo.clone_from(clone_url, local_path)
        logger.info("Clone completed successfully.")
        return local_path

    def list_source_files(self, local_path: str) -> List[str]:
        """Scans the directory for source files, ignoring binary/vcs/package cache patterns."""
        ignored_dirs = {
            ".git", ".github", "node_modules", ".next", "venv", ".venv", "env",
            "__pycache__", "dist", "build", "out", "target", "bin", "obj", ".idea", ".vscode"
        }
        ignored_extensions = {
            ".png", ".jpg", ".jpeg", ".gif", ".ico", ".pdf", ".zip", ".tar", ".gz",
            ".mp4", ".mp3", ".wav", ".exe", ".dll", ".so", ".dylib", ".class", ".pyc",
            ".lock", "-lock.json", ".svg", ".woff", ".woff2", ".ttf", ".eot"
        }
        
        source_files = []
        for root, dirs, files in os.walk(local_path):
            # Prune ignored directories in-place
            dirs[:] = [d for d in dirs if d not in ignored_dirs and not d.startswith(".")]
            
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in ignored_extensions or file.startswith("."):
                    continue
                    
                full_path = os.path.join(root, file)
                # Save path relative to repository root
                rel_path = os.path.relpath(full_path, local_path)
                source_files.append(rel_path)
                
        return source_files

    def get_commit_history(self, local_path: str, limit: int = 15) -> List[Dict[str, Any]]:
        """Extracts git commit history logs."""
        try:
            if not os.path.exists(os.path.join(local_path, ".git")):
                logger.info("Local path has no .git metadata; commit history unavailable for plain directory ingestion.")
                return []
                
            repo = git.Repo(local_path)
            commits = list(repo.iter_commits(max_count=limit))
            
            history = []
            for commit in commits:
                history.append({
                    "commit_hash": commit.hexsha,
                    "author": str(commit.author),
                    "message": commit.message.strip(),
                    "timestamp": commit.committed_datetime.isoformat()
                })
            return history
        except Exception as e:
            logger.error(f"Failed to read commit history: {e}")
            return []

    def get_latest_commit_diff(self, local_path: str) -> Dict[str, List[str]]:
        """Finds added, modified, or deleted files between the head and previous commit."""
        results = {"added": [], "modified": [], "deleted": []}
        try:
            if not os.path.exists(os.path.join(local_path, ".git")):
                return results

            repo = git.Repo(local_path)
            commits = list(repo.iter_commits(max_count=2))
            
            if len(commits) < 2:
                # First commit or single commit: treat all current files as added
                results["added"] = self.list_source_files(local_path)
                return results

            head = commits[0]
            prev = commits[1]
            diffs = prev.diff(head)

            for diff in diffs:
                change_type = diff.change_type
                if change_type == "A": # Added
                    results["added"].append(diff.b_path)
                elif change_type == "M": # Modified
                    results["modified"].append(diff.b_path)
                elif change_type == "D": # Deleted
                    results["deleted"].append(diff.a_path)
                elif change_type == "R": # Renamed
                    results["deleted"].append(diff.a_path)
                    results["added"].append(diff.b_path)

            return results
        except Exception as e:
            logger.error(f"Failed to fetch commit diff: {e}")
            return results

git_service = GitService()
