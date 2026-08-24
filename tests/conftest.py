import os
from pathlib import Path
import sys
import json
from unittest.mock import AsyncMock, MagicMock, patch

# Set test environment flags before app imports
os.environ["APP_ENV"] = "test"

# Tests must never call real LLM APIs. Env vars take precedence over .env in
# pydantic-settings, so blanking them here forces get_agent_llm() into fallback mode
_BLOCKED_LLM_ENV_VARS = ("GEMINI_API_KEY", "GEMINI_API_KEYS", "OPENAI_API_KEY")
for _var in _BLOCKED_LLM_ENV_VARS:
    os.environ[_var] = ""

# Add backend directory to sys.path so 'app' imports resolve
BACKEND_DIR = Path(__file__).resolve().parent.parent / "backend"
sys.path.insert(0, str(BACKEND_DIR))

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from src.main import app


SAMPLE_EVALUATION_RESPONSE = {
    "overall_score": 85.0,
    "overall_assessment": "Ứng viên đáp ứng tốt các yêu cầu về Python và FastAPI.",
    "recommendation": "GOOD_FIT",
    "skill_assessments": [
        {
            "skill": "Python",
            "found": True,
            "confidence": 95.0,
            "evidence": "Kỹ năng: Python, FastAPI.",
            "level": "intermediate",
        },
        {
            "skill": "FastAPI",
            "found": True,
            "confidence": 95.0,
            "evidence": "Kỹ năng: Python, FastAPI.",
            "level": "intermediate",
        },
        {
            "skill": "Docker",
            "found": False,
            "confidence": 95.0,
            "evidence": "Không tìm thấy trong CV",
            "level": "unknown",
        },
    ],
    "experience_assessment": {
        "detected_years": 3.0,
        "relevant_years": 3.0,
        "confidence": 90.0,
        "summary": "3 năm lập trình backend",
    },
    "education_assessment": {
        "detected_level": "bachelor",
        "field_relevant": True,
        "summary": "Trình độ cử nhân phù hợp",
    },
    "strengths": ["Thành thạo Python và FastAPI", "3 năm kinh nghiệm backend"],
    "concerns": ["Chưa có kinh nghiệm Docker"],
}

SAMPLE_QUESTIONS_RESPONSE = [
    {
        "question": "Anh/Chị đã sử dụng FastAPI để xây dựng kiến trúc API như thế nào?",
        "category": "technical",
        "target_skill": "FastAPI",
        "purpose": "Đánh giá kiến thức chuyên sâu về FastAPI",
    },
    {
        "question": "Anh/Chị đã từng xử lý bài toán hiệu năng nào trong Python?",
        "category": "technical",
        "target_skill": "Python",
        "purpose": "Kiểm tra kinh nghiệm thực tế với Python",
    },
]


class MockAgentLLM:
    """Mock LLM that returns appropriate structured evaluation or question JSON."""

    def __init__(self, temperature: float = 0.2):
        self.temperature = temperature

    async def ainvoke(self, messages, **kwargs):
        # Distinguish between evaluator prompt and question gen prompt by checking message content
        prompt_text = str(messages)
        if "QUESTION" in prompt_text or "interview questions" in prompt_text.lower() or "candidate:" in prompt_text.lower():
            content = json.dumps(SAMPLE_QUESTIONS_RESPONSE, ensure_ascii=False)
        else:
            content = json.dumps(SAMPLE_EVALUATION_RESPONSE, ensure_ascii=False)

        mock_resp = MagicMock()
        mock_resp.content = content
        mock_resp.text = content
        return mock_resp

    def invoke(self, messages, **kwargs):
        prompt_text = str(messages)
        if "QUESTION" in prompt_text or "interview questions" in prompt_text.lower() or "candidate:" in prompt_text.lower():
            content = json.dumps(SAMPLE_QUESTIONS_RESPONSE, ensure_ascii=False)
        else:
            content = json.dumps(SAMPLE_EVALUATION_RESPONSE, ensure_ascii=False)

        mock_resp = MagicMock()
        mock_resp.content = content
        mock_resp.text = content
        return mock_resp


@pytest.fixture(autouse=True)
def mock_agent_llm_for_tests(monkeypatch):
    """Automatically mock get_agent_llm and isolate vector store during tests."""
    mock_factory = lambda temperature=None: MockAgentLLM(temperature or 0.2)

    # Patch get_agent_llm in all namespaces where it was imported
    import src.services.llm_service as llm_service
    monkeypatch.setattr(llm_service, "get_agent_llm", mock_factory)

    try:
        import src.agents.nodes.evaluator_node as eval_node
        monkeypatch.setattr(eval_node, "get_agent_llm", mock_factory)
    except (ImportError, AttributeError):
        pass

    try:
        import src.agents.nodes.question_gen_node as qgen_node
        monkeypatch.setattr(qgen_node, "get_agent_llm", mock_factory)
    except (ImportError, AttributeError):
        pass

    # Isolate LocalVectorStore from downloading / loading heavy sentence_transformers in tests
    try:
        from src.chunking.vector_store import LocalVectorStore
        def mock_ensure_model(self):
            self._model = None
            self._load_attempted = True
        monkeypatch.setattr(LocalVectorStore, "_ensure_model", mock_ensure_model)
    except (ImportError, AttributeError):
        pass


@pytest_asyncio.fixture
async def client():
    """Async HTTP client for testing API endpoints."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def mock_llm():
    """Mock LLM fixture for custom test overrides."""
    mock = AsyncMock()
    mock.ainvoke.return_value = AsyncMock(content="Mocked LLM response")
    return mock


@pytest.fixture
def all_cv_fixtures():
    """Fixture providing all anti-hallucination CV fixtures."""
    from tests.fixtures.cv_fixtures import CV_FIXTURES
    return CV_FIXTURES


@pytest.fixture
def all_jd_fixtures():
    """Fixture providing all JD criteria fixtures."""
    from tests.fixtures.jd_fixtures import JD_FIXTURES
    return JD_FIXTURES



