"""Unit tests for Gemini API Key Rotation and LLM Service using standard unittest."""

import asyncio
import unittest
from unittest.mock import MagicMock, AsyncMock

from src.config import Settings
from src.services.llm_service import RotatingGeminiLLM


class TestGeminiKeyRotation(unittest.TestCase):
    def test_parsed_gemini_api_keys(self):
        """Test parsing multiple Gemini API keys from comma-separated string."""
        settings = Settings(gemini_api_keys="key_1, key_2 , key_3")
        keys = settings.parsed_gemini_api_keys
        self.assertEqual(keys, ["key_1", "key_2", "key_3"])

        # Fallback single key
        settings_single = Settings(gemini_api_key="single_key")
        self.assertEqual(settings_single.parsed_gemini_api_keys, ["single_key"])

    def test_rotating_gemini_llm_init(self):
        """Test initialization of RotatingGeminiLLM."""
        rotator = RotatingGeminiLLM(api_keys=["key1", "key2", "key3"], model_name="gemini-1.5-flash")
        self.assertEqual(rotator.api_keys, ["key1", "key2", "key3"])
        self.assertEqual(rotator.current_index, 0)
        self.assertEqual(rotator.current_key, "key1")

    def test_rotating_gemini_llm_rotation_on_failure(self):
        """Test that RotatingGeminiLLM automatically rotates to key2 when key1 fails."""
        rotator = RotatingGeminiLLM(api_keys=["key1_bad", "key2_good"])

        # Mock async llm instances using AsyncMock
        mock_llm1 = MagicMock()
        mock_llm1.ainvoke = AsyncMock(side_effect=Exception("429 ResourceHasBeenExhausted: Quota exceeded"))

        mock_llm2 = MagicMock()
        mock_response = MagicMock()
        mock_response.content = "Success response from key 2"
        mock_llm2.ainvoke = AsyncMock(return_value=mock_response)

        rotator._llms = [mock_llm1, mock_llm2]

        async def run_test():
            return await rotator.ainvoke("Test prompt")

        result = asyncio.run(run_test())

        self.assertEqual(result.content, "Success response from key 2")
        self.assertEqual(rotator.current_index, 1)
        self.assertEqual(rotator.current_key, "key2_good")
        self.assertEqual(mock_llm1.ainvoke.call_count, 1)
        self.assertEqual(mock_llm2.ainvoke.call_count, 1)

    def test_rotating_gemini_llm_generate_content_async(self):
        """Test generate_content_async method of RotatingGeminiLLM."""
        rotator = RotatingGeminiLLM(api_keys=["key1"], model_name="gemini-1.5-flash")

        # Mock direct genai
        mock_response = MagicMock()
        mock_response.text = "Async response"

        with unittest.mock.patch("google.generativeai.GenerativeModel") as MockModel:
            mock_instance = MockModel.return_value
            mock_instance.generate_content_async = AsyncMock(return_value=mock_response)

            async def run_test():
                return await rotator.generate_content_async("Hello")

            result = asyncio.run(run_test())
            self.assertEqual(result.text, "Async response")


if __name__ == "__main__":
    unittest.main()
