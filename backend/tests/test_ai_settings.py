import unittest
import json
from unittest.mock import AsyncMock, patch, MagicMock

from backend.utils.config import AISettings, get_ai_settings, update_ai_settings
from backend.services.ai_service import AIService

class TestAISettingsState(unittest.TestCase):
    """Validation test suite for single source of truth configuration and provider rules."""

    @patch("backend.utils.config.settings")
    @patch("backend.services.db_service.db.get_setting")
    def test_get_ai_settings_default(self, mock_get_setting, mock_settings):
        """Test getting settings falls back to defaults correctly."""
        # Setup static env config mocks to ensure test isolation from local .env
        mock_settings.AI_PROVIDER = "online"
        mock_settings.OPENAI_API_KEY = ""
        mock_settings.OFFLINE_MODE = False
        mock_settings.OLLAMA_BASE_URL = "http://localhost:11434"

        def side_effect(key, default):
            if key == "ai_provider":
                return mock_settings.AI_PROVIDER
            elif key == "openai_api_key":
                return mock_settings.OPENAI_API_KEY
            elif key == "offline_mode":
                return str(mock_settings.OFFLINE_MODE)
            return default
        mock_get_setting.side_effect = side_effect

        ai_settings = get_ai_settings()
        self.assertEqual(ai_settings.provider, "openai") # Standardized online -> openai
        self.assertFalse(ai_settings.offline_mode)
        self.assertEqual(ai_settings.openai_api_key, None)

    @patch("backend.services.db_service.db.get_setting")
    @patch("backend.services.db_service.db.set_setting")
    def test_update_ai_settings(self, mock_set_setting, mock_get_setting):
        """Test updating settings writes to DB and maps online to openai."""
        stored_settings = {}
        
        def get_side_effect(key, default):
            return stored_settings.get(key, default)
        mock_get_setting.side_effect = get_side_effect
        
        def set_side_effect(key, val):
            stored_settings[key] = str(val)
        mock_set_setting.side_effect = set_side_effect

        # Toggle to online/openai and offline_mode=True
        new_settings = update_ai_settings(provider="online", offline_mode=True, openai_api_key="test-key")
        
        self.assertEqual(new_settings.provider, "openai")
        self.assertTrue(new_settings.offline_mode)
        self.assertEqual(new_settings.openai_api_key, "test-key")
        
        # Verify db sets occurred with normalized keys
        mock_set_setting.assert_any_call("ai_provider", "openai")
        mock_set_setting.assert_any_call("offline_mode", "true")
        mock_set_setting.assert_any_call("openai_api_key", "test-key")


class TestAIServiceProviderLogic(unittest.IsolatedAsyncioTestCase):
    """Validation test suite for correct Ollama / OpenAI execution under offline constraints."""

    def setUp(self):
        self.ai_service = AIService()
        self.ai_service.client = AsyncMock() # Mock the httpx AsyncClient

    async def asyncTearDown(self):
        await self.ai_service.close()

    @patch("backend.services.ai_service.get_ai_settings")
    async def test_local_provider_offline_true(self, mock_get_settings):
        """Verify Ollama works when provider=local and offline_mode=True."""
        mock_get_settings.return_value = AISettings(
            provider="local",
            offline_mode=True,
            openai_api_key=None,
            ollama_base_url="http://localhost:11434"
        )
        
        # Mock Ollama success responses
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"embedding": [0.1] * 768, "response": "Local response"}
        self.ai_service.client.post.return_value = mock_resp

        # 1. Embeddings
        embeddings = await self.ai_service.get_embeddings("hello")
        self.assertEqual(len(embeddings), 768)
        self.assertEqual(embeddings[0], 0.1)

        # 2. Text Generation
        response = await self.ai_service.generate("prompt")
        self.assertEqual(response, "Local response")

    @patch("backend.services.ai_service.get_ai_settings")
    async def test_local_provider_offline_false(self, mock_get_settings):
        """Verify Ollama works when provider=local and offline_mode=False."""
        mock_get_settings.return_value = AISettings(
            provider="local",
            offline_mode=False,
            openai_api_key=None,
            ollama_base_url="http://localhost:11434"
        )
        
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {"embedding": [0.2] * 768, "response": "Local response 2"}
        self.ai_service.client.post.return_value = mock_resp

        # 1. Embeddings
        embeddings = await self.ai_service.get_embeddings("hello")
        self.assertEqual(len(embeddings), 768)
        self.assertEqual(embeddings[0], 0.2)

        # 2. Text Generation
        response = await self.ai_service.generate("prompt")
        self.assertEqual(response, "Local response 2")

    @patch("backend.services.ai_service.get_ai_settings")
    async def test_openai_provider_offline_false(self, mock_get_settings):
        """Verify OpenAI works when provider=openai and offline_mode=False."""
        mock_get_settings.return_value = AISettings(
            provider="openai",
            offline_mode=False,
            openai_api_key="valid-key",
            ollama_base_url="http://localhost:11434"
        )
        
        mock_resp = MagicMock()
        mock_resp.status_code = 200
        mock_resp.json.return_value = {
            "data": [{"embedding": [0.5] * 1536}],
            "choices": [{"message": {"content": "OpenAI response"}}]
        }
        self.ai_service.client.post.return_value = mock_resp

        # 1. Embeddings
        embeddings = await self.ai_service.get_embeddings("hello")
        self.assertEqual(len(embeddings), 1536)
        self.assertEqual(embeddings[0], 0.5)

        # 2. Text Generation
        response = await self.ai_service.generate("prompt")
        self.assertEqual(response, "OpenAI response")

    @patch("backend.services.ai_service.get_ai_settings")
    async def test_openai_provider_offline_true(self, mock_get_settings):
        """Verify OpenAI is blocked and raises Exception when provider=openai and offline_mode=True."""
        mock_get_settings.return_value = AISettings(
            provider="openai",
            offline_mode=True,
            openai_api_key="valid-key",
            ollama_base_url="http://localhost:11434"
        )

        # 1. Embeddings should raise exception
        with self.assertRaises(Exception) as context:
            await self.ai_service.get_embeddings("hello")
        self.assertIn("Cloud APIs disabled in offline mode", str(context.exception))

        # 2. Text Generation should raise exception
        with self.assertRaises(Exception) as context:
            await self.ai_service.generate("prompt")
        self.assertIn("Cloud APIs disabled in offline mode", str(context.exception))

    @patch("backend.services.ai_service.get_ai_settings")
    async def test_local_chat_stream(self, mock_get_settings):
        """Verify local chat_stream uses aiter_lines and streams tokens."""
        mock_get_settings.return_value = AISettings(
            provider="local",
            offline_mode=False,
            openai_api_key=None,
            ollama_base_url="http://localhost:11434"
        )

        mock_stream = MagicMock()
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        async def mock_aiter_lines():
            yield json.dumps({"message": {"content": "Hello"}})
            yield json.dumps({"message": {"content": " world"}})
            
        mock_response.aiter_lines = mock_aiter_lines
        mock_stream.return_value.__aenter__.return_value = mock_response
        self.ai_service.client.stream = mock_stream

        chunks = []
        async for chunk in self.ai_service.chat_stream([{"role": "user", "content": "hi"}]):
            chunks.append(chunk)

        self.assertEqual(chunks, ["Hello", " world"])

    @patch("backend.services.ai_service.get_ai_settings")
    async def test_openai_chat_stream(self, mock_get_settings):
        """Verify OpenAI chat_stream uses aiter_lines and streams tokens."""
        mock_get_settings.return_value = AISettings(
            provider="openai",
            offline_mode=False,
            openai_api_key="valid-key",
            ollama_base_url="http://localhost:11434"
        )

        mock_stream = MagicMock()
        mock_response = AsyncMock()
        mock_response.status_code = 200
        
        async def mock_aiter_lines():
            yield "data: " + json.dumps({"choices": [{"delta": {"content": "Hello"}}]})
            yield "data: " + json.dumps({"choices": [{"delta": {"content": " cloud"}}]})
            yield "data: [DONE]"
            
        mock_response.aiter_lines = mock_aiter_lines
        mock_stream.return_value.__aenter__.return_value = mock_response
        self.ai_service.client.stream = mock_stream

        chunks = []
        async for chunk in self.ai_service.chat_stream([{"role": "user", "content": "hi"}]):
            chunks.append(chunk)

        self.assertEqual(chunks, ["Hello", " cloud"])




class TestHealthEndpoint(unittest.IsolatedAsyncioTestCase):
    """Validation test suite for the smart, provider-aware /health check endpoint."""

    @patch("backend.api.routes.get_ai_settings")
    @patch("backend.api.routes.ai_service")
    async def test_health_local_offline(self, mock_ai_service, mock_get_settings):
        """Case 1: provider=local, offline_mode=True. Ollama checked, OpenAI NOT checked."""
        mock_get_settings.return_value = AISettings(
            provider="local",
            offline_mode=True,
            openai_api_key=None,
            ollama_base_url="http://localhost:11434"
        )
        mock_ai_service.check_ollama_connected = AsyncMock(return_value=True)
        mock_ai_service.check_openai_available = AsyncMock() # Should not be called

        from backend.api.routes import health_check
        response = await health_check()

        self.assertEqual(response.status, "healthy")
        self.assertEqual(response.provider, "local")
        self.assertTrue(response.offline_mode)
        self.assertTrue(response.ollama_checked)
        self.assertTrue(response.ollama_connected)
        self.assertFalse(response.openai_checked)
        self.assertIsNone(response.openai_available)
        
        # Verify OpenAI check was skipped entirely
        mock_ai_service.check_openai_available.assert_not_called()

    @patch("backend.api.routes.get_ai_settings")
    @patch("backend.api.routes.ai_service")
    async def test_health_local_online(self, mock_ai_service, mock_get_settings):
        """Case 2: provider=local, offline_mode=False. Ollama checked, OpenAI optionally checked."""
        mock_get_settings.return_value = AISettings(
            provider="local",
            offline_mode=False,
            openai_api_key="mock-openai-key",
            ollama_base_url="http://localhost:11434"
        )
        mock_ai_service.check_ollama_connected = AsyncMock(return_value=True)
        mock_ai_service.check_openai_available = AsyncMock(return_value=True)

        from backend.api.routes import health_check
        response = await health_check()

        self.assertEqual(response.status, "healthy")
        self.assertEqual(response.provider, "local")
        self.assertFalse(response.offline_mode)
        self.assertTrue(response.ollama_checked)
        self.assertTrue(response.ollama_connected)
        self.assertTrue(response.openai_checked)
        self.assertTrue(response.openai_available)
        
        # Verify OpenAI check was called since online mode is active with key
        mock_ai_service.check_openai_available.assert_called_once()

    @patch("backend.api.routes.get_ai_settings")
    @patch("backend.api.routes.ai_service")
    async def test_health_openai_offline(self, mock_ai_service, mock_get_settings):
        """Case 3: provider=openai, offline_mode=True. Ollama skipped, OpenAI skipped and returns degraded."""
        mock_get_settings.return_value = AISettings(
            provider="openai",
            offline_mode=True,
            openai_api_key="mock-openai-key",
            ollama_base_url="http://localhost:11434"
        )
        mock_ai_service.check_ollama_connected = AsyncMock()
        mock_ai_service.check_openai_available = AsyncMock()

        from backend.api.routes import health_check
        response = await health_check()

        self.assertEqual(response.status, "degraded")
        self.assertEqual(response.provider, "online") # Returns online to frontend
        self.assertTrue(response.offline_mode)
        self.assertFalse(response.ollama_checked)
        self.assertIsNone(response.ollama_connected)
        self.assertFalse(response.openai_checked)
        self.assertFalse(response.openai_available)
        self.assertEqual(response.reason, "offline_mode_enabled")

        # Verify no network connectivity checks were run
        mock_ai_service.check_ollama_connected.assert_not_called()
        mock_ai_service.check_openai_available.assert_not_called()

    @patch("backend.api.routes.get_ai_settings")
    @patch("backend.api.routes.ai_service")
    async def test_health_openai_online(self, mock_ai_service, mock_get_settings):
        """Case 4: provider=openai, offline_mode=False. Ollama skipped, OpenAI checked."""
        mock_get_settings.return_value = AISettings(
            provider="openai",
            offline_mode=False,
            openai_api_key="mock-openai-key",
            ollama_base_url="http://localhost:11434"
        )
        mock_ai_service.check_ollama_connected = AsyncMock()
        mock_ai_service.check_openai_available = AsyncMock(return_value=True)

        from backend.api.routes import health_check
        response = await health_check()

        self.assertEqual(response.status, "healthy")
        self.assertEqual(response.provider, "online")
        self.assertFalse(response.offline_mode)
        self.assertFalse(response.ollama_checked)
        self.assertIsNone(response.ollama_connected)
        self.assertTrue(response.openai_checked)
        self.assertTrue(response.openai_available)

        # Verify only OpenAI was tested
        mock_ai_service.check_ollama_connected.assert_not_called()
        mock_ai_service.check_openai_available.assert_called_once()


if __name__ == "__main__":
    unittest.main()
