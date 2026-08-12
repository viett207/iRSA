"""LLM Factory service for initializing Gemini & OpenAI models."""

import os
import logging
from typing import Any
from src.config import get_settings

logger = logging.getLogger(__name__)


def get_agent_llm(temperature: float | None = None) -> Any:
    """Initialize LLM (Gemini or OpenAI) for AI Agent."""
    settings = get_settings()
    temp = temperature if temperature is not None else settings.llm_temperature
    gemini_key = settings.gemini_api_key or os.environ.get("GEMINI_API_KEY", "")
    openai_key = settings.openai_api_key or os.environ.get("OPENAI_API_KEY", "")

    # 1. Try ChatGoogleGenerativeAI if Gemini Key exists
    if gemini_key:
        try:
            from langchain_google_genai import ChatGoogleGenerativeAI
            logger.info("Initializing ChatGoogleGenerativeAI (gemini-1.5-flash)...")
            return ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=gemini_key,
                temperature=temp,
            )
        except Exception as e:
            logger.warning(f"Failed to load ChatGoogleGenerativeAI: {e}")

    # 2. Try ChatOpenAI if OpenAI Key exists
    if openai_key:
        try:
            from langchain_openai import ChatOpenAI
            logger.info("Initializing ChatOpenAI (gpt-4o-mini)...")
            return ChatOpenAI(
                model=settings.model_name or "gpt-4o-mini",
                api_key=openai_key,
                temperature=temp,
            )
        except Exception as e:
            logger.warning(f"Failed to load ChatOpenAI: {e}")

    # 3. Direct Google GenerativeAI fallback (via google.generativeai)
    if gemini_key:
        try:
            import google.generativeai as genai
            genai.configure(api_key=gemini_key)
            logger.info("Using direct google.generativeai client fallback.")
            return genai.GenerativeModel("gemini-1.5-flash")
        except Exception as e:
            logger.warning(f"Direct google.generativeai failed: {e}")

    logger.warning("No LLM API keys provided. Agent will operate in fallback mode.")
    return None
