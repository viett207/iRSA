"""Pytest configuration and fixtures for testing."""

import pytest
import sys
from unittest.mock import MagicMock, patch

# Mock database drivers before importing app modules
sys.modules['asyncpg'] = MagicMock()
sys.modules['psycopg2'] = MagicMock()

# Patch database module creation before app imports
with patch('sqlalchemy.create_engine', MagicMock()):
    with patch('sqlalchemy.ext.asyncio.create_async_engine', MagicMock()):
        with patch('sqlalchemy.orm.sessionmaker', MagicMock()):
            pass


@pytest.fixture
def sample_resume_data():
    """Sample resume data for testing."""
    return {
        "full_name": "Nguyen Van A",
        "email": "a@example.com",
        "phone": "0912345678",
        "skills": ["Python", "Django", "PostgreSQL"],
        "raw_text": "Sample resume content",
        "parse_method": "text"
    }


@pytest.fixture
def sample_job_criteria():
    """Sample job criteria for testing."""
    return {
        "must_have_skills": ["Python", "Django"],
        "nice_to_have_skills": ["Docker"],
        "min_experience_years": 2.0,
        "max_experience_years": None,
        "min_education": "bachelor"
    }
