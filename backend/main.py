import os
import sys
import uvicorn
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Ensure the workspace root is on the import path for package-style imports
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.api import router
from backend.utils.config import settings

# Setup logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("main")

# Initialize FastAPI Application
app = FastAPI(
    title="DocDoctor API",
    description="Autonomous Developer Knowledge Agent and Codebase Intelligence Platform Backend Server.",
    version="1.0.0"
)

# Apply CORS middleware rules for seamless Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Attach API endpoints router under /api
app.include_router(router, prefix="/api")

@app.get("/")
async def root():
    return {
        "message": "Welcome to DocDoctor Autonomous Developer Knowledge Agent Backend Service",
        "api_docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    logger.info(f"Starting DocDoctor API on {settings.HOST}:{settings.PORT}...")
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
