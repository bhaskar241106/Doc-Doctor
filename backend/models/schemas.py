from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Literal
from datetime import datetime

class RepositoryBase(BaseModel):
    name: str
    clone_url: str
    branch: str = "main"

class RepositoryCreate(RepositoryBase):
    local_path: Optional[str] = None

class RepositoryResponse(RepositoryBase):
    id: int
    local_path: str
    created_at: str
    last_sync_at: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentBase(BaseModel):
    repo_id: int
    doc_type: str  # 'readme', 'api_docs', 'architecture', 'onboarding', 'changelog', 'pr_summary'
    title: str
    content: str

class DocumentResponse(DocumentBase):
    id: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class CommitActivityBase(BaseModel):
    repo_id: int
    commit_hash: str
    author: str
    message: str
    timestamp: str
    changed_files: List[str]

class CommitActivityResponse(CommitActivityBase):
    id: int

    class Config:
        from_attributes = True

class ChatMessageBase(BaseModel):
    role: str  # 'user', 'assistant'
    content: str
    citations: Optional[List[str]] = []

class ChatMessageCreate(ChatMessageBase):
    session_id: str

class ChatMessageResponse(ChatMessageBase):
    id: int
    session_id: str
    timestamp: str

    class Config:
        from_attributes = True

class ChatSessionBase(BaseModel):
    repo_id: int
    title: str

class ChatSessionResponse(ChatSessionBase):
    id: str
    created_at: str

    class Config:
        from_attributes = True

class SettingsUpdate(BaseModel):
    ai_provider: Optional[Literal["local", "online"]]
    openai_api_key: Optional[str] = None
    offline_mode: Optional[bool] = None

class SettingsResponse(BaseModel):
    ai_provider: str
    openai_api_key: str
    offline_mode: bool

class ChatQuery(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    session_id: str
    answer: str
    citations: List[str] = []
