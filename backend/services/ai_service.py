import httpx
import json
import logging
from typing import List, Dict, Any, AsyncGenerator, Optional
from backend.utils.config import settings
from backend.services.db_service import db

logger = logging.getLogger("ai_service")
logging.basicConfig(level=logging.INFO)

class AIService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)

    def get_active_provider(self) -> str:
        """Dynamically fetch the active provider from SQLite settings table (default to .env)."""
        return db.get_setting("ai_provider", settings.AI_PROVIDER)

    def is_offline_mode_active(self) -> bool:
        """Return whether local Ollama offline mode is enabled."""
        value = db.get_setting("offline_mode", str(settings.OFFLINE_MODE)).lower()
        return value in ("1", "true", "yes", "on")

    def get_api_key(self) -> str:
        """Dynamically fetch the online API key from SQLite settings table (default to .env)."""
        return db.get_setting("openai_api_key", settings.OPENAI_API_KEY)

    async def check_health(self) -> bool:
        """Verify the active provider connection is alive."""
        provider = self.get_active_provider()
        if provider == "local" and not self.is_offline_mode_active():
            logger.info("Local Ollama access is currently disabled by offline mode setting.")
            return False
        
        if provider == "local":
            try:
                response = await self.client.get(f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/tags")
                return response.status_code == 200
            except Exception:
                return False
        else:
            # Online mode
            api_key = self.get_api_key()
            if not api_key:
                logger.warning("OpenAI API key missing in settings")
                return False
            try:
                # Validate the API key by listing available models
                headers = {"Authorization": f"Bearer {api_key}"}
                response = await self.client.get(f"{settings.OPENAI_BASE_URL.rstrip('/')}/models", headers=headers)
                return response.status_code == 200
            except Exception:
                return False

    async def get_embeddings(self, text: str) -> List[float]:
        """Fetch vector embeddings using the active local or online provider."""
        provider = self.get_active_provider()
        
        if provider == "local":
            if not self.is_offline_mode_active():
                logger.warning("Skipping local Ollama embeddings because offline mode is disabled.")
                return [0.0] * 768
            try:
                payload = {"model": settings.OLLAMA_EMBED_MODEL, "prompt": text}
                url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/embeddings"
                response = await self.client.post(url, json=payload)
                if response.status_code == 200:
                    return response.json().get("embedding", [])
            except Exception as e:
                logger.error(f"Local Ollama embedding error: {e}")
            return [0.0] * 768
        else:
            # Online Mode (OpenAI-compatible)
            api_key = self.get_api_key()
            if not api_key:
                logger.error("OpenAI API key missing. Cannot generate online embeddings.")
                return [0.0] * 1536 # OpenAI text-embedding-3-small uses 1536 dims!
                
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": settings.OPENAI_EMBED_MODEL,
                    "input": text
                }
                url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/embeddings"
                response = await self.client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data["data"][0]["embedding"]
            except Exception as e:
                logger.error(f"Online OpenAI embedding error: {e}")
            return [0.0] * 1536

    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        temperature: float = 0.2
    ) -> str:
        """Synthesize technical documentation using the active local or online model."""
        provider = self.get_active_provider()
        
        if provider == "local":
            if not self.is_offline_mode_active():
                return "[Offline mode is disabled. Enable offline mode to run local Ollama models.]"
            try:
                payload = {
                    "model": settings.OLLAMA_LLM_MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": temperature}
                }
                if system_prompt:
                    payload["system"] = system_prompt
                
                url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/generate"
                response = await self.client.post(url, json=payload)
                if response.status_code == 200:
                    return response.json().get("response", "")
            except Exception as e:
                return f"[Local LLM generation error: {e}]"
            return "[Error generating via local Ollama]"
        else:
            # Online Mode (OpenAI-compatible)
            api_key = self.get_api_key()
            if not api_key:
                return "[Error: Online API Key missing! Go to Dashboard/Sidebar settings to configure it.]"
                
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                messages = []
                if system_prompt:
                    messages.append({"role": "system", "content": system_prompt})
                messages.append({"role": "user", "content": prompt})
                
                payload = {
                    "model": settings.OPENAI_LLM_MODEL,
                    "messages": messages,
                    "temperature": temperature
                }
                url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
                response = await self.client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    return response.json()["choices"][0]["message"]["content"]
                else:
                    return f"[Online API Error {response.status_code}: {response.text}]"
            except Exception as e:
                return f"[Online Cloud generation error: {e}]"

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.2
    ) -> AsyncGenerator[str, None]:
        """Stream repository chat responses using active local or online models."""
        provider = self.get_active_provider()
        
        if provider == "local":
            if not self.is_offline_mode_active():
                yield "\n[Offline mode is disabled. Enable offline mode to run local Ollama chat.]"
                return
            try:
                payload = {
                    "model": settings.OLLAMA_LLM_MODEL,
                    "messages": messages,
                    "stream": True,
                    "options": {"temperature": temperature}
                }
                url = f"{settings.OLLAMA_BASE_URL.rstrip('/')}/api/chat"
                async with self.client.stream("POST", url, json=payload) as response:
                    if response.status_code == 200:
                        async for line in response.iter_lines():
                            if line:
                                try:
                                    data = json.loads(line)
                                    content = data.get("message", {}).get("content", "")
                                    if content:
                                        yield content
                                except json.JSONDecodeError:
                                    continue
            except Exception as e:
                yield f"\n[Streaming Connection Error (Ollama): {e}]"
        else:
            # Online Mode (OpenAI-compatible)
            api_key = self.get_api_key()
            if not api_key:
                yield "\n[Error: Web OpenAI API Key missing! Configure your key under settings to chat online.]"
                return
                
            try:
                headers = {
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": settings.OPENAI_LLM_MODEL,
                    "messages": messages,
                    "stream": True,
                    "temperature": temperature
                }
                url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
                
                async with self.client.stream("POST", url, json=payload, headers=headers) as response:
                    if response.status_code != 200:
                        yield f"\n[Online API Error {response.status_code}: {await response.aread()}]"
                        return
                        
                    async for line in response.iter_lines():
                        if line:
                            # OpenAI streams are prefixed with "data: "
                            line_str = line.strip()
                            if line_str.startswith("data: "):
                                data_content = line_str[6:]
                                if data_content == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(data_content)
                                    delta = chunk["choices"][0]["delta"].get("content", "")
                                    if delta:
                                        yield delta
                                except json.JSONDecodeError:
                                    continue
            except Exception as e:
                yield f"\n[Streaming Connection Error (Cloud): {e}]"

    async def close(self):
        await self.client.aclose()

# Global Unified AI Service instance
ai_service = AIService()
