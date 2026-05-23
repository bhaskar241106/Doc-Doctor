import os
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

from backend.services.db_service import db
from backend.services.git_service import git_service
from backend.rag.chunker import chunker
from backend.rag.vector_store import vector_store
from backend.parsers.ast_parser import parse_python_file
from backend.parsers.tree_sitter_fallback import parse_general_file
from backend.generators.doc_generator import doc_generator
from backend.utils.config import settings

logger = logging.getLogger("doc_orchestrator")

class DocOrchestrator:
    async def ingest_new_repository(self, name: str, clone_url: str, branch: str = "main") -> Dict[str, Any]:
        """Runs the initial full repository ingestion and synchronization pipeline."""
        # 1. Setup paths
        repo_slug = name.lower().replace("/", "_").replace("\\", "_")
        local_path = os.path.join(os.path.abspath(settings.CLONE_DIR), repo_slug)

        # 2. Clone repository
        logger.info(f"Cloning/Pulling repository: {clone_url}")
        git_service.clone_or_pull(clone_url, local_path, branch)

        # 3. Create or get SQLite record
        existing_repos = db.get_repositories()
        repo_data = None
        for r in existing_repos:
            if r["clone_url"] == clone_url:
                repo_data = r
                break
                
        if not repo_data:
            repo_data = db.create_repository(name, clone_url, local_path, branch)
        
        repo_id = repo_data["id"]

        # Clear old vectors if re-ingesting
        vector_store.clear_repo(repo_id)

        # 4. Scan source files
        source_files = git_service.list_source_files(local_path)
        logger.info(f"Scanned {len(source_files)} source files for indexing.")

        # Let's accumulate structural highlights for document generation
        structural_summaries = []
        api_metadata_list = []

        # 5. Parse, Chunk, Embed and Store
        for rel_path in source_files:
            full_path = os.path.join(local_path, rel_path)
            if not os.path.exists(full_path):
                continue
                
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                language = chunker.detect_language(rel_path)
                file_chunks = []
                ast_info = {}

                # Apply language specific parser
                if language == "python":
                    ast_info = parse_python_file(content)
                    if ast_info.get("success"):
                        file_chunks = chunker.chunk_python_ast(rel_path, content, ast_info)
                        # Keep track of python classes/methods for API docs
                        api_metadata_list.append({
                            "filename": rel_path,
                            "classes": ast_info.get("classes", []),
                            "functions": ast_info.get("functions", [])
                        })
                elif language in ("javascript", "typescript", "go", "java"):
                    gen_info = parse_general_file(content, rel_path)
                    if gen_info.get("success"):
                        file_chunks = chunker.chunk_general_code(rel_path, content, gen_info)
                        api_metadata_list.append({
                            "filename": rel_path,
                            "classes": gen_info.get("classes", []),
                            "functions": gen_info.get("functions", [])
                        })

                # Fallback to standard line chunking if empty or not parsed structurally
                if not file_chunks:
                    file_chunks = chunker.chunk_file_fallback(rel_path, content, language)

                # Store in ChromaDB
                await vector_store.add_file_chunks(repo_id, file_chunks)

                # Extract key summary items for the generators
                if len(content.strip()) > 0:
                    summary_prefix = f"- **{rel_path}** ({language}): "
                    if language == "python" and ast_info.get("docstring"):
                        structural_summaries.append(summary_prefix + ast_info["docstring"].splitlines()[0])
                    elif ast_info.get("classes"):
                        cls_names = [c["name"] for c in ast_info["classes"]]
                        structural_summaries.append(summary_prefix + f"Contains classes: {', '.join(cls_names)}")
                    elif ast_info.get("functions"):
                        fn_names = [f["name"] for f in ast_info["functions"]]
                        structural_summaries.append(summary_prefix + f"Contains functions: {', '.join(fn_names[:5])}")
                    else:
                        structural_summaries.append(summary_prefix + f"General source code file.")

            except Exception as e:
                logger.error(f"Failed to process file {rel_path}: {e}")

        # Combine structural summaries into string
        summaries_block = "\n".join(structural_summaries[:30]) # limit context length

        # 6. Generate Living Documents
        logger.info("Initializing living documentation generation...")
        
        # README
        readme_md = await doc_generator.generate_readme(name, source_files, summaries_block)
        db.upsert_document(repo_id, "readme", "README.md", readme_md)

        # API Docs
        api_md = await doc_generator.generate_api_docs(name, api_metadata_list[:30])
        db.upsert_document(repo_id, "api_docs", "API Reference", api_md)

        # Architecture
        arch_context = "Summary of classes/methods and codebase patterns:\n" + summaries_block
        arch_md = await doc_generator.generate_architecture_summary(name, source_files, arch_context)
        db.upsert_document(repo_id, "architecture", "Architecture Breakdown", arch_md)

        # Onboarding
        onboard_md = await doc_generator.generate_onboarding_guide(name, source_files, summaries_block)
        db.upsert_document(repo_id, "onboarding", "Developer Onboarding Guide", onboard_md)

        # Deployment & DevOps
        infra_files = [f for f in source_files if any(keyword in f.lower() for keyword in ["docker", "compose", "deploy", "kube", "actions", "yml", "yaml", "workflow", "nginx", "setup", "requirements", "package.json"])]
        infra_context = "Infrastructure & deployment configurations found:\n" + "\n".join([f"- {f}" for f in infra_files[:15]])
        deploy_md = await doc_generator.generate_deployment_docs(name, source_files, infra_context)
        db.upsert_document(repo_id, "deployment", "Systems Deployment Guide", deploy_md)

        # Update last sync
        db.update_repo_sync_time(repo_id)
        
        logger.info(f"Repository {name} successfully ingested and initial documents generated!")
        return db.get_repository(repo_id)

    async def generate_document_on_demand(self, repo_id: int, doc_type: str) -> Optional[Dict[str, Any]]:
        """
        Generates a specific document type on demand.
        Sets document status to 'generating', executes the LLM generation, and updates to 'completed' or 'failed'.
        """
        # Get repository metadata
        repo = db.get_repository(repo_id)
        if not repo:
            logger.error(f"Cannot generate document. Repository {repo_id} not found.")
            return None

        # Insert placeholder document in DB as 'generating'
        db.upsert_document(
            repo_id=repo_id,
            doc_type=doc_type,
            title=f"Generating {doc_type.replace('_', ' ').title()}...",
            content="",
            status="generating",
            file_path=os.path.join(repo["local_path"], f"docdoctor_{doc_type}.md")
        )

        try:
            logger.info(f"Generating document on demand: repo={repo_id} type={doc_type}")
            local_path = repo["local_path"]
            source_files = git_service.list_source_files(local_path)
            
            # Read structural summaries to inject context
            structural_summaries = []
            api_metadata_list = []
            for rel_path in source_files[:20]:
                full_path = os.path.join(local_path, rel_path)
                if not os.path.exists(full_path):
                    continue
                try:
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    lang = chunker.detect_language(rel_path)
                    if lang == "python":
                        ast = parse_python_file(content)
                        if ast.get("success"):
                            api_metadata_list.append({
                                "filename": rel_path,
                                "classes": ast.get("classes", []),
                                "functions": ast.get("functions", [])
                            })
                            if ast.get("docstring"):
                                structural_summaries.append(f"- **{rel_path}**: {ast['docstring'].splitlines()[0]}")
                    elif lang in ("javascript", "typescript", "go", "java"):
                        gen = parse_general_file(content, rel_path)
                        if gen.get("success"):
                            api_metadata_list.append({
                                "filename": rel_path,
                                "classes": gen.get("classes", []),
                                "functions": gen.get("functions", [])
                            })
                except Exception:
                    pass

            summaries_block = "\n".join(structural_summaries) if structural_summaries else "Source files summary context."

            # Route by document type
            if doc_type == "readme":
                md_content = await doc_generator.generate_readme(repo["name"], source_files, summaries_block)
                title = "README.md"
            elif doc_type == "api_docs":
                md_content = await doc_generator.generate_api_docs(repo["name"], api_metadata_list)
                title = "API Reference"
            elif doc_type == "architecture":
                arch_context = "Summary of classes/methods and codebase patterns:\n" + summaries_block
                md_content = await doc_generator.generate_architecture_summary(repo["name"], source_files, arch_context)
                title = "Architecture Breakdown"
            elif doc_type == "onboarding":
                md_content = await doc_generator.generate_onboarding_guide(repo["name"], source_files, summaries_block)
                title = "Developer Onboarding Guide"
            elif doc_type == "deployment":
                infra_files = [f for f in source_files if any(keyword in f.lower() for keyword in ["docker", "compose", "deploy", "kube", "actions", "yml", "yaml", "workflow", "nginx", "setup", "requirements", "package.json"])]
                infra_context = "Infrastructure & deployment configurations found:\n" + "\n".join([f"- {f}" for f in infra_files[:15]])
                md_content = await doc_generator.generate_deployment_docs(repo["name"], source_files, infra_context)
                title = "Systems Deployment Guide"
            elif doc_type == "pr_summary":
                # Extract latest commit details from local git repo if available
                commits = git_service.get_commit_history(local_path, limit=1)
                if commits:
                    latest = commits[0]
                    author = latest["author"]
                    message = latest["message"]
                    commit_hash = latest["commit_hash"]
                    diff = git_service.get_latest_commit_diff(local_path)
                else:
                    author = "Developer"
                    message = "Initial Codebase Synchronisation"
                    commit_hash = "push_fallback"
                    diff = {"added": source_files[:10], "modified": [], "deleted": []}

                md_content = await doc_generator.generate_pr_summary(
                    repo_name=repo["name"],
                    author=author,
                    commit_message=message,
                    diff_files=diff
                )
                title = f"Commit {commit_hash[:7].upper()} Summary"
            else:
                raise ValueError(f"Invalid document type: {doc_type}")

            # Write generated file to local repo directory as well for sync verification
            doc_file_name = f"DEPLOYMENT.md" if doc_type == "deployment" else f"{doc_type.upper()}.md"
            file_path = os.path.join(local_path, doc_file_name)
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(md_content)
                logger.info(f"Saved generated file locally at: {file_path}")
            except Exception as e:
                logger.error(f"Failed to write file physically: {e}")

            # Update document to completed
            res = db.upsert_document(
                repo_id=repo_id,
                doc_type=doc_type,
                title=title,
                content=md_content,
                status="completed",
                file_path=file_path
            )
            return res

        except Exception as e:
            logger.error(f"Failed on-demand document generation for repo={repo_id} type={doc_type}: {e}")
            db.upsert_document(
                repo_id=repo_id,
                doc_type=doc_type,
                title=f"{doc_type.replace('_', ' ').title()} Generation Failed",
                content=f"[Error during generation: {e}]",
                status="failed",
                error_message=str(e)
            )
            return None

    async def synchronize_webhook_push(self, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Handles GitHub push event webhook, updates local copy, synchronizes vector store, and triggers AI summaries."""
        from backend.github import webhook_handler
        
        # 1. Parse payload details
        parsed = webhook_handler.parse_push_event(payload)
        if not parsed:
            return None

        clone_url = parsed["clone_url"]
        branch = parsed["branch"]

        # Find matching repository
        repos = db.get_repositories()
        repo_data = None
        for r in repos:
            if r["clone_url"] == clone_url:
                repo_data = r
                break

        if not repo_data:
            logger.warning(f"Push webhook received for repository not connected locally: {clone_url}")
            return None

        repo_id = repo_data["id"]
        local_path = repo_data["local_path"]

        # 2. Record commit activity
        db.add_commit_activity(
            repo_id=repo_id,
            commit_hash=parsed.get("commit_hash", "push_event"),
            author=parsed.get("author", "Unknown"),
            message=parsed.get("message", "Triggered webhook push sync"),
            timestamp=parsed.get("timestamp") or datetime.utcnow().isoformat(),
            changed_files=parsed.get("added", []) + parsed.get("modified", []) + parsed.get("deleted", [])
        )

        # 3. Pull latest repository updates
        git_service.clone_or_pull(clone_url, local_path, branch)

        # 4. Synchronize vector embeddings
        deleted_files = parsed.get("deleted", [])
        added_files = parsed.get("added", [])
        modified_files = parsed.get("modified", [])

        # Process deleted files: drop their vectors
        for filename in deleted_files:
            vector_store.delete_file_chunks(repo_id, filename)

        # Process added and modified files: extract new blocks and embeddings
        files_to_index = added_files + modified_files
        for filename in files_to_index:
            full_path = os.path.join(local_path, filename)
            if not os.path.exists(full_path):
                continue

            # First delete old chunks (for modified files)
            vector_store.delete_file_chunks(repo_id, filename)

            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()

                language = chunker.detect_language(filename)
                file_chunks = []
                
                # Parsing structures
                if language == "python":
                    ast_info = parse_python_file(content)
                    if ast_info.get("success"):
                        file_chunks = chunker.chunk_python_ast(filename, content, ast_info)
                elif language in ("javascript", "typescript", "go", "java"):
                    gen_info = parse_general_file(content, filename)
                    if gen_info.get("success"):
                        file_chunks = chunker.chunk_general_code(filename, content, gen_info)

                if not file_chunks:
                    file_chunks = chunker.chunk_file_fallback(filename, content, language)

                # Insert updated embeddings
                await vector_store.add_file_chunks(repo_id, file_chunks)
            except Exception as e:
                logger.error(f"Failed to synchronize file {filename}: {e}")

        # 5. Generate Commit PR summary
        pr_sum_md = await doc_generator.generate_pr_summary(
            repo_name=repo_data["name"],
            author=parsed.get("author", "Developer"),
            commit_message=parsed.get("message", ""),
            diff_files={"added": added_files, "modified": modified_files, "deleted": deleted_files}
        )
        db.upsert_document(repo_id, "pr_summary", f"Commit {parsed.get('commit_hash', 'Sync')[:7]} Summary", pr_sum_md)

        # 6. Regenerate living documentation in the background to prevent stale state
        source_files = git_service.list_source_files(local_path)
        
        # Read a quick summary of files to feed LLM
        structural_summaries = []
        api_metadata_list = []
        for rel_path in source_files[:20]: # read first 20 for brief summary context
            full_path = os.path.join(local_path, rel_path)
            if not os.path.exists(full_path):
                continue
            try:
                with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                lang = chunker.detect_language(rel_path)
                if lang == "python":
                    ast = parse_python_file(content)
                    if ast.get("success"):
                        api_metadata_list.append({
                            "filename": rel_path,
                            "classes": ast.get("classes", []),
                            "functions": ast.get("functions", [])
                        })
                        if ast.get("docstring"):
                            structural_summaries.append(f"- **{rel_path}**: {ast['docstring'].splitlines()[0]}")
                elif lang in ("javascript", "typescript", "go", "java"):
                    gen = parse_general_file(content, rel_path)
                    if gen.get("success"):
                        api_metadata_list.append({
                            "filename": rel_path,
                            "classes": gen.get("classes", []),
                            "functions": gen.get("functions", [])
                        })
            except Exception:
                pass

        summaries_block = "\n".join(structural_summaries) if structural_summaries else "Source files updated in latest push."

        # Re-generate README, API, and onboarding asynchronously
        readme_md = await doc_generator.generate_readme(repo_data["name"], source_files, summaries_block)
        db.upsert_document(repo_id, "readme", "README.md", readme_md)

        api_md = await doc_generator.generate_api_docs(repo_data["name"], api_metadata_list)
        db.upsert_document(repo_id, "api_docs", "API Reference", api_md)

        arch_context = "Summary of classes/methods and codebase patterns:\n" + summaries_block
        arch_md = await doc_generator.generate_architecture_summary(repo_data["name"], source_files, arch_context)
        db.upsert_document(repo_id, "architecture", "Architecture Breakdown", arch_md)

        onboard_md = await doc_generator.generate_onboarding_guide(repo_data["name"], source_files, summaries_block)
        db.upsert_document(repo_id, "onboarding", "Developer Onboarding Guide", onboard_md)

        # Deployment & DevOps
        infra_files = [f for f in source_files if any(keyword in f.lower() for keyword in ["docker", "compose", "deploy", "kube", "actions", "yml", "yaml", "workflow", "nginx", "setup", "requirements", "package.json"])]
        infra_context = "Infrastructure & deployment configurations found:\n" + "\n".join([f"- {f}" for f in infra_files[:15]])
        deploy_md = await doc_generator.generate_deployment_docs(repo_data["name"], source_files, infra_context)
        db.upsert_document(repo_id, "deployment", "Systems Deployment Guide", deploy_md)

        # Update last sync time
        db.update_repo_sync_time(repo_id)

        logger.info(f"Webhook push sync completed successfully for {repo_data['name']}")
        return db.get_repository(repo_id)

orchestrator = DocOrchestrator()
