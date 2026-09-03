"""Unit tests for Gemini API Key Rotation and LLM Service using standard unittest."""

import asyncio
import unittest
from unittest.mock import AsyncMock, MagicMock

from src.config import Settings
from src.services.llm_service import (
    FallbackCompositeLLM,
    RotatingGeminiLLM,
    RotatingGroqLLM,
    get_agent_llm,
)


class TestGeminiKeyRotation(unittest.TestCase):
    def test_parsed_gemini_api_keys(self):
        """Test parsing multiple Gemini API keys from comma-separated string."""
        settings = Settings(gemini_api_keys="key_1, key_2 , key_3")
        keys = settings.parsed_gemini_api_keys
        self.assertEqual(keys, ["key_1", "key_2", "key_3"])

        # Fallback single key
        settings_single = Settings(gemini_api_key="single_key")
        self.assertEqual(settings_single.parsed_gemini_api_keys, ["single_key"])

        settings_auth_key = Settings(gemini_api_key="AQ.example-auth-key")
        self.assertEqual(settings_auth_key.parsed_gemini_api_keys, ["AQ.example-auth-key"])

    def test_default_model_is_gemini_3_6_flash(self):
        settings = Settings(_env_file=None)
        self.assertEqual(settings.model_name, "gemini-3.6-flash")

    def test_rotating_gemini_llm_init(self):
        """Test initialization of RotatingGeminiLLM."""
        rotator = RotatingGeminiLLM(api_keys=["key1", "key2", "key3"], model_name="gemini-3.6-flash")
        self.assertEqual(rotator.api_keys, ["key1", "key2", "key3"])
        self.assertEqual(rotator.current_index, 0)
        self.assertEqual(rotator.current_key, "key1")

    def test_rotating_gemini_llm_rotation_on_failure(self):
        """Test that RotatingGeminiLLM automatically rotates to key2 when key1 fails."""
        rotator = RotatingGeminiLLM(api_keys=["key1_bad", "key2_good"])

        # Mock async Google Gen AI clients
        mock_llm1 = MagicMock()
        mock_llm1.aio.models.generate_content = AsyncMock(
            side_effect=Exception("429 ResourceHasBeenExhausted: Quota exceeded")
        )

        mock_llm2 = MagicMock()
        mock_response = MagicMock()
        mock_response.text = "Success response from key 2"
        mock_llm2.aio.models.generate_content = AsyncMock(return_value=mock_response)

        rotator._clients = [mock_llm1, mock_llm2]

        async def run_test():
            return await rotator.ainvoke("Test prompt")

        result = asyncio.run(run_test())

        self.assertEqual(result.content, "Success response from key 2")
        self.assertEqual(rotator.current_index, 1)
        self.assertEqual(rotator.current_key, "key2_good")
        self.assertEqual(mock_llm1.aio.models.generate_content.call_count, 1)
        self.assertEqual(mock_llm2.aio.models.generate_content.call_count, 1)

    def test_rotating_gemini_llm_generate_content_async(self):
        """Test generate_content_async method of RotatingGeminiLLM."""
        rotator = RotatingGeminiLLM(api_keys=["key1"], model_name="gemini-3.6-flash")

        mock_response = MagicMock()
        mock_response.text = "Async response"
        mock_client = MagicMock()
        mock_client.aio.models.generate_content = AsyncMock(return_value=mock_response)
        rotator._clients = [mock_client]

        async def run_test():
            return await rotator.generate_content_async("Hello")

        result = asyncio.run(run_test())
        self.assertEqual(result.text, "Async response")


class TestGroqKeyRotation(unittest.TestCase):
    def test_parsed_groq_api_keys(self):
        """Test parsing multiple Groq API keys from comma-separated string."""
        settings = Settings(groq_api_keys="gsk_1, gsk_2 , gsk_3")
        keys = settings.parsed_groq_api_keys
        self.assertEqual(keys, ["gsk_1", "gsk_2", "gsk_3"])

        # Fallback single key
        settings_single = Settings(groq_api_key="gsk_single")
        self.assertEqual(settings_single.parsed_groq_api_keys, ["gsk_single"])

        # Filter placeholders
        settings_placeholder = Settings(groq_api_key="your_groq_api_key_here")
        self.assertEqual(settings_placeholder.parsed_groq_api_keys, [])

    def test_rotating_groq_llm_init(self):
        """Test initialization of RotatingGroqLLM."""
        rotator = RotatingGroqLLM(
            api_keys=["gsk_1", "gsk_2"],
            model_name="llama-3.3-70b-versatile",
            temperature=0.3,
        )
        self.assertEqual(rotator.api_keys, ["gsk_1", "gsk_2"])
        self.assertEqual(rotator.current_index, 0)
        self.assertEqual(rotator.current_key, "gsk_1")
        self.assertEqual(rotator.model_name, "llama-3.3-70b-versatile")
        self.assertEqual(rotator.temperature, 0.3)

    def test_rotating_groq_llm_normalizes_gemini_model(self):
        """Test that RotatingGroqLLM defaults to llama-3.3-70b-versatile if given a Gemini model name."""
        rotator = RotatingGroqLLM(api_keys=["gsk_1"], model_name="gemini-3.6-flash")
        self.assertEqual(rotator.model_name, "llama-3.3-70b-versatile")

    def test_rotating_groq_llm_rotation_on_failure(self):
        """Test that RotatingGroqLLM automatically rotates to key2 when key1 fails with 429."""
        rotator = RotatingGroqLLM(api_keys=["gsk_bad", "gsk_good"])

        mock_client1 = MagicMock()
        mock_client1.chat.completions.create = AsyncMock(
            side_effect=Exception("429 rate_limit_exceeded: Rate limit reached")
        )

        mock_client2 = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Groq response from key 2"
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_client2.chat.completions.create = AsyncMock(return_value=mock_response)

        rotator._async_clients = [mock_client1, mock_client2]

        async def run_test():
            return await rotator.ainvoke("Test prompt")

        result = asyncio.run(run_test())

        self.assertEqual(result.content, "Groq response from key 2")
        self.assertEqual(rotator.current_index, 1)
        self.assertEqual(rotator.current_key, "gsk_good")
        self.assertEqual(mock_client1.chat.completions.create.call_count, 1)
        self.assertEqual(mock_client2.chat.completions.create.call_count, 1)

    def test_rotating_groq_llm_invoke_sync(self):
        """Test synchronous invoke of RotatingGroqLLM."""
        rotator = RotatingGroqLLM(api_keys=["gsk_1"])

        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Sync Groq response"
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create = MagicMock(return_value=mock_response)

        rotator._sync_clients = [mock_client]

        result = rotator.invoke("Hello sync")
        self.assertEqual(result.content, "Sync Groq response")
        self.assertEqual(result.text, "Sync Groq response")

    def test_rotating_groq_llm_generate_content_async(self):
        """Test generate_content_async interface for Groq."""
        rotator = RotatingGroqLLM(api_keys=["gsk_1"])

        mock_client = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = "Async Groq content"
        mock_response = MagicMock()
        mock_response.choices = [mock_choice]
        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        rotator._async_clients = [mock_client]

        async def run_test():
            return await rotator.generate_content_async("Generate content")

        result = asyncio.run(run_test())
        self.assertEqual(result.text, "Async Groq content")


class TestFallbackCompositeLLM(unittest.TestCase):
    def test_fallback_composite_primary_success(self):
        primary = MagicMock()
        primary.ainvoke = AsyncMock(return_value=MagicMock(content="Primary success"))
        fallback = MagicMock()
        fallback.ainvoke = AsyncMock(return_value=MagicMock(content="Fallback success"))

        composite = FallbackCompositeLLM(primary=primary, fallback=fallback, primary_name="Primary", fallback_name="Fallback")

        async def run_test():
            return await composite.ainvoke("Test")

        res = asyncio.run(run_test())
        self.assertEqual(res.content, "Primary success")
        fallback.ainvoke.assert_not_called()

    def test_fallback_composite_activates_on_primary_failure(self):
        primary = MagicMock()
        primary.ainvoke = AsyncMock(side_effect=Exception("Primary failed with 429 Quota Exceeded"))
        fallback = MagicMock()
        fallback.ainvoke = AsyncMock(return_value=MagicMock(content="Fallback success"))

        composite = FallbackCompositeLLM(primary=primary, fallback=fallback, primary_name="Primary", fallback_name="Fallback")

        async def run_test():
            return await composite.ainvoke("Test")

        res = asyncio.run(run_test())
        self.assertEqual(res.content, "Fallback success")
        fallback.ainvoke.assert_called_once()


class TestGetAgentLLMSelection(unittest.TestCase):
    def test_get_agent_llm_groq_only(self):
        """When only Groq API key is set, returns RotatingGroqLLM."""
        from unittest.mock import patch

        mock_settings = Settings(
            groq_api_key="gsk_valid_key",
            gemini_api_key="",
            gemini_api_keys="",
            openai_api_key="",
            groq_model="llama-3.3-70b-versatile",
        )
        with patch("src.services.llm_service.get_settings", return_value=mock_settings):
            llm = get_agent_llm()
            self.assertIsInstance(llm, RotatingGroqLLM)
            self.assertEqual(llm.current_key, "gsk_valid_key")
            self.assertEqual(llm.model_name, "llama-3.3-70b-versatile")

    def test_get_agent_llm_explicit_provider_groq(self):
        """When LLM_PROVIDER is set to groq, returns RotatingGroqLLM even if Gemini keys exist."""
        from unittest.mock import patch

        mock_settings = Settings(
            llm_provider="groq",
            groq_api_key="gsk_valid_key",
            gemini_api_key="gemini_key",
            openai_api_key="",
        )
        with patch("src.services.llm_service.get_settings", return_value=mock_settings):
            llm = get_agent_llm()
            self.assertIsInstance(llm, RotatingGroqLLM)
            self.assertEqual(llm.current_key, "gsk_valid_key")

    def test_get_agent_llm_both_keys_fallback_composite(self):
        """When both Gemini and Groq keys are configured without explicit provider, returns FallbackCompositeLLM."""
        from unittest.mock import patch

        mock_settings = Settings(
            llm_provider="",
            groq_api_key="gsk_valid_key",
            gemini_api_key="gemini_key",
            openai_api_key="",
        )
        with patch("src.services.llm_service.get_settings", return_value=mock_settings):
            llm = get_agent_llm()
            self.assertIsInstance(llm, FallbackCompositeLLM)
            self.assertEqual(llm.primary_name, "Gemini")
            self.assertEqual(llm.fallback_name, "Groq")


if __name__ == "__main__":
    unittest.main()
