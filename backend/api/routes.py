import json
import logging
from fastapi import APIRouter, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from typing import List, Dict, Any, Optional

from backend.models.schemas import (
    RepositoryCreate, RepositoryResponse, DocumentResponse, 
    CommitActivityResponse, ChatSessionResponse, ChatMessageResponse,
    ChatQuery, ChatResponse, SettingsUpdate, SettingsResponse
)
from backend.services.db_service import db
from backend.services.ai_service import ai_service
from backend.services.git_service import git_service
from backend.rag.vector_store import vector_store
from backend.agents.doc_orchestrator import orchestrator
from backend.utils.config import settings

router = APIRouter()
logger = logging.getLogger("api_routes")

# 1. Health check
@router.get("/health", tags=["System"])
async def health_check():
    ai_ok = await ai_service.check_health()
    provider = ai_service.get_active_provider()
    offline_mode = ai_service.is_offline_mode_active()
    return {
        "status": "healthy",
        "ollama_connected": ai_ok,
        "offline_mode": offline_mode,
        "active_provider": provider,
        "models": {
            "llm": settings.OLLAMA_LLM_MODEL if provider == "local" else settings.OPENAI_LLM_MODEL,
            "embeddings": settings.OLLAMA_EMBED_MODEL if provider == "local" else settings.OPENAI_EMBED_MODEL
        }
    }

# 2. Repositories endpoints
@router.post("/repositories", response_model=RepositoryResponse, status_code=status.HTTP_201_CREATED, tags=["Repositories"])
async def create_repository(repo: RepositoryCreate, background_tasks: BackgroundTasks):
    try:
        # We start the heavy ingestion pipeline as a background task to prevent request timeouts!
        # This is a major premium engineering choice!
        logger.info(f"Received ingestion request for repository: {repo.name} at URL: {repo.clone_url}")
        
        # Resolve a local path if remote
        repo_slug = repo.name.lower().replace("/", "_").replace("\\", "_")
        local_path = repo.local_path or os.path.join(os.path.abspath(settings.CLONE_DIR), repo_slug)
        
        # Save a temporary record in SQLite first
        repo_record = db.create_repository(repo.name, repo.clone_url, local_path, repo.branch)
        
        # Trigger background ingestion
        background_tasks.add_task(
            orchestrator.ingest_new_repository,
            name=repo.name,
            clone_url=repo.clone_url,
            branch=repo.branch
        )
        
        return repo_record
    except Exception as e:
        logger.error(f"Error starting repository ingestion: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repositories", response_model=List[RepositoryResponse], tags=["Repositories"])
async def list_repositories():
    return db.get_repositories()

@router.get("/repositories/{repo_id}", response_model=RepositoryResponse, tags=["Repositories"])
async def get_repository(repo_id: int):
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return repo

@router.delete("/repositories/{repo_id}", status_code=status.HTTP_200_OK, tags=["Repositories"])
async def delete_repository(repo_id: int):
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    
    # 1. Clean local repository files if they are in the clone directory
    if settings.CLONE_DIR in repo["local_path"] and os.path.exists(repo["local_path"]):
        try:
            import shutil
            shutil.rmtree(repo["local_path"], ignore_errors=True)
        except Exception as e:
            logger.error(f"Error deleting folder: {e}")

    # 2. Clear ChromaDB vectors
    vector_store.clear_repo(repo_id)
    
    # 3. Drop from SQLite database
    success = db.delete_repository(repo_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete database record")
        
    return {"message": f"Repository {repo['name']} deleted successfully."}

@router.post("/repositories/{repo_id}/sync", response_model=RepositoryResponse, tags=["Repositories"])
async def trigger_manual_sync(repo_id: int, background_tasks: BackgroundTasks):
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    background_tasks.add_task(
        orchestrator.ingest_new_repository,
        name=repo["name"],
        clone_url=repo["clone_url"],
        branch=repo["branch"]
    )
    return repo

# 3. Commit Activity logs
@router.get("/repositories/{repo_id}/activity", response_model=List[CommitActivityResponse], tags=["Repository Activity"])
async def get_repository_activity(repo_id: int):
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return db.get_commit_activities(repo_id)

# 4. Living Documents explorer
@router.get("/repositories/{repo_id}/documents", response_model=List[DocumentResponse], tags=["Documents"])
async def get_repository_documents(repo_id: int):
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
    return db.get_documents_by_repo(repo_id)

@router.get("/repositories/{repo_id}/documents/{doc_type}", response_model=DocumentResponse, tags=["Documents"])
async def get_repository_document_by_type(repo_id: int, doc_type: str):
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    doc = db.get_document_by_type(repo_id, doc_type)
    if not doc:
        raise HTTPException(
            status_code=404, 
            detail=f"Document of type '{doc_type}' not generated yet. Please wait for sync/ingestion to complete."
        )
    return doc

# 5. AI Chat session creation & queries
@router.post("/chat/session", response_model=ChatSessionResponse, tags=["AI Repository Chat"])
async def create_chat_session(session_data: Dict[str, Any]):
    repo_id = session_data.get("repo_id")
    title = session_data.get("title", "New Repository Chat Session")
    
    if not repo_id:
        raise HTTPException(status_code=400, detail="Missing 'repo_id'")
        
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")
        
    return db.create_chat_session(repo_id, title)

@router.get("/chat/session/{repo_id}", response_model=List[ChatSessionResponse], tags=["AI Repository Chat"])
async def list_chat_sessions(repo_id: int):
    return db.get_chat_sessions(repo_id)

@router.get("/chat/session/{session_id}/messages", response_model=List[ChatMessageResponse], tags=["AI Repository Chat"])
async def get_chat_history(session_id: str):
    session = db.get_chat_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat Session not found")
    return db.get_chat_messages(session_id)

@router.post("/chat/query", tags=["AI Repository Chat"])
async def chat_query(query: ChatQuery):
    if not query.session_id:
        raise HTTPException(status_code=400, detail="Missing 'session_id'")

    session = db.get_chat_session(query.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat Session not found")

    repo_id = session["repo_id"]
    repo = db.get_repository(repo_id)
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found")

    # 1. Save User Message
    db.add_chat_message(query.session_id, "user", query.message, citations=[])

    # 2. Vector Semantic Search RAG Context
    logger.info(f"Executing RAG query for Repository ID {repo_id}: '{query.message}'")
    searchResults = await vector_store.search_code(repo_id, query.message, limit=5)
    
    citations = []
    rag_snippets = []
    
    for item in searchResults:
        meta = item["metadata"]
        filename = meta.get("filename", "unknown_file")
        if filename not in citations:
            citations.append(filename)
            
        start_line = meta.get("start_line", 1)
        end_line = meta.get("end_line", 1)
        code_body = item["content"]
        
        snippet = f"### File: {filename} (Lines: {start_line}-{end_line})\n{code_body}\n"
        rag_snippets.append(snippet)

    # 3. Retrieve past history messages
    history = db.get_chat_messages(query.session_id)
    
    # 4. Formulate messages list
    system_prompt = (
        "You are DocDoctor, a world-class senior AI systems architect and repository intelligence platform.\n"
        "Your task is to answer the user's questions about the codebase using the provided context blocks.\n"
        "RELIABILITY RULES:\n"
        "1. Base your answer strictly on the retrieved code snippets provided below.\n"
        "2. If you don't know or if it's not in the context, be honest and state you cannot find it in the current codebase.\n"
        "3. Cite file paths and lines you references in your answer using markdown links where appropriate.\n"
        "4. Output highly professional, clean markdown with syntax highlighted code blocks.\n"
        f"REPOSITORY CONTEXT:\n"
        f"{chr(10).join(rag_snippets)}"
    )

    ollama_messages = [{"role": "system", "content": system_prompt}]
    
    # Add recent history (up to last 10 messages)
    for msg in history[-10:-1]: # exclude the latest user message which we will format below
        ollama_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
        
    # Append latest user query
    ollama_messages.append({"role": "user", "content": query.message})

    # 5. Streaming chat generator
    async def response_streamer():
        full_response = ""
        # Send initial SSE chunk with citations
        yield f"data: {json.dumps({'citations': citations})}\n\n"
        
        async for text in ai_service.chat_stream(ollama_messages):
            full_response += text
            yield f"data: {json.dumps({'delta': text})}\n\n"
            
        # 6. Save Assistant response in the background
        db.add_chat_message(query.session_id, "assistant", full_response, citations)
        yield "data: [DONE]\n\n"

    return StreamingResponse(response_streamer(), media_type="text/event-stream")

# 6. GitHub webhook listener
@router.post("/github/webhook", status_code=status.HTTP_202_ACCEPTED, tags=["Webhooks"])
async def github_webhook_endpoint(payload: Dict[str, Any], background_tasks: BackgroundTasks):
    logger.info("GitHub Webhook push event received!")
    # Start the synchronization and updates asynchronously
    background_tasks.add_task(orchestrator.synchronize_webhook_push, payload)
    return {"message": "Webhook payload received and queued for sync."}

# 7. System settings endpoints
@router.get("/settings", response_model=SettingsResponse, tags=["System Settings"])
async def get_settings():
    return SettingsResponse(
        ai_provider=db.get_setting("ai_provider", settings.AI_PROVIDER),
        openai_api_key=db.get_setting("openai_api_key", settings.OPENAI_API_KEY),
        offline_mode=db.get_setting("offline_mode", str(settings.OFFLINE_MODE)).lower() in ("1", "true", "yes", "on")
    )

@router.post("/settings", tags=["System Settings"])
async def update_settings(payload: SettingsUpdate):
    provider = payload.ai_provider
    api_key = payload.openai_api_key
    offline_mode = payload.offline_mode
    
    if provider is not None:
        db.set_setting("ai_provider", provider)
        logger.info(f"AI Provider dynamically toggled to: {provider}")
        
    if api_key is not None:
        db.set_setting("openai_api_key", api_key)
        logger.info("OpenAI API key updated dynamically.")

    if offline_mode is not None:
        db.set_setting("offline_mode", str(offline_mode).lower())
        logger.info(f"Offline mode toggled to: {offline_mode}")
        
    return SettingsResponse(
        ai_provider=db.get_setting("ai_provider", settings.AI_PROVIDER),
        openai_api_key=db.get_setting("openai_api_key", settings.OPENAI_API_KEY),
        offline_mode=db.get_setting("offline_mode", str(settings.OFFLINE_MODE)).lower() in ("1", "true", "yes", "on")
    ).dict()
import os
