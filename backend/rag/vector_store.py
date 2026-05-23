import chromadb
import logging
import asyncio
from typing import List, Dict, Any, Optional
from backend.utils.config import settings
from backend.services.ai_service import ai_service

logger = logging.getLogger("vector_store")

class VectorStore:
    def __init__(self, persist_dir: str = settings.CHROMADB_DIR):
        self.persist_dir = persist_dir
        self.client = chromadb.PersistentClient(path=persist_dir)

    def _get_collection_name(self, repo_id: int) -> str:
        return f"repo_{repo_id}"

    def _get_or_create_collection(self, repo_id: int):
        name = self._get_collection_name(repo_id)
        # ChromaDB collections must be between 3 and 63 chars, start/end alphanumeric, contain only alphanumeric, _ or -
        return self.client.get_or_create_collection(name=name)

    async def add_file_chunks(self, repo_id: int, chunks: List[Dict[str, Any]]):
        """Generates embeddings for chunks and adds them to ChromaDB."""
        if not chunks:
            return

        collection = self._get_or_create_collection(repo_id)
        
        ids = []
        documents = []
        metadatas = []
        embeddings = []

        logger.info(f"Generating embeddings for {len(chunks)} chunks in Repository ID {repo_id}...")

        # Process chunks sequentially or in parallel batches
        # Sequential with small sleep is safe, but async makes it clean
        for idx, chunk in enumerate(chunks):
            content = chunk["content"]
            meta = chunk["metadata"]
            
            # 1. Fetch local embedding via AI service
            embed = await ai_service.get_embeddings(content)
            
            # Generate unique chunk ID
            filename_clean = meta["filename"].replace("/", "_").replace("\\", "_")
            chunk_id = f"chunk_{filename_clean}_{meta['start_line']}_{meta['end_line']}_{idx}"
            
            ids.append(chunk_id)
            documents.append(content)
            embeddings.append(embed)
            
            # ChromaDB metadatas can only contain str, int, float, bool
            clean_meta = {}
            for k, v in meta.items():
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                else:
                    clean_meta[k] = str(v)
            metadatas.append(clean_meta)

        # Insert to collection
        collection.add(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )
        logger.info(f"Successfully added {len(chunks)} chunks to vector store.")

    def delete_file_chunks(self, repo_id: int, filename: str):
        """Deletes all vector records matching a specific filename."""
        try:
            collection = self._get_or_create_collection(repo_id)
            # Query and delete where metadata filename matches
            collection.delete(where={"filename": filename})
            logger.info(f"Deleted vector chunks for file '{filename}' in Repo {repo_id}")
        except Exception as e:
            logger.error(f"Error deleting chunks for file {filename}: {e}")

    def clear_repo(self, repo_id: int):
        """Completely drops a repository vector collection."""
        try:
            name = self._get_collection_name(repo_id)
            self.client.delete_collection(name=name)
            logger.info(f"Cleared vector collection {name}")
        except Exception as e:
            logger.warning(f"Failed to clear collection: {e}")

    async def search_code(self, repo_id: int, query: str, limit: int = 6) -> List[Dict[str, Any]]:
        """Query vector database for code chunks matching the semantic search query."""
        try:
            collection = self._get_or_create_collection(repo_id)
            
            # Retrieve embedding for query
            query_embedding = await ai_service.get_embeddings(query)
            
            # Query ChromaDB
            results = collection.query(
                query_embeddings=[query_embedding],
                n_results=limit
            )
            
            formatted_results = []
            if results and results.get("documents"):
                documents = results["documents"][0]
                metadatas = results["metadatas"][0]
                distances = results["distances"][0] if "distances" in results else [0.0] * len(documents)
                
                for doc, meta, dist in zip(documents, metadatas, distances):
                    formatted_results.append({
                        "content": doc,
                        "metadata": meta,
                        "distance": dist
                    })
            return formatted_results
        except Exception as e:
            logger.error(f"Error querying vector store: {e}")
            return []

vector_store = VectorStore()
