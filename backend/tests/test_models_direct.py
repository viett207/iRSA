"""Unit tests for parser models using direct imports."""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Import directly without going through app/__init__
from app.services.parser.models import ParsedResume, Experience, Education


class TestExperienceDirect:
    """Tests for Experience model."""

    def test_experience_creation(self):
        """Test basic experience creation."""
        exp = Experience(
            company="Tech Corp",
            role="Senior Developer",
            start_date="01/2020",
            end_date="12/2022",
            description="Led team of 5 developers",
            duration_months=36
        )

        assert exp.company == "Tech Corp"
        assert exp.role == "Senior Developer"
        assert exp.duration_months == 36

    def test_experience_default_values(self):
        """Test experience with default values."""
        exp = Experience(company="Acme", role="Developer")

        assert exp.start_date is None
        assert exp.description == ""
        assert exp.duration_months == 0


class TestEducationDirect:
    """Tests for Education model."""

    def test_education_creation(self):
        """Test basic education creation."""
        edu = Education(
            institution="FPT University",
            degree="Bachelor",
            field="Computer Science",
            year=2020
        )

        assert edu.institution == "FPT University"
        assert edu.degree == "Bachelor"
        assert edu.year == 2020

    def test_education_defaults(self):
        """Test education with defaults."""
        edu = Education(institution="University")

        assert edu.degree == ""
        assert edu.field == ""
        assert edu.year is None


class TestParsedResumeDirect:
    """Tests for ParsedResume model."""

    def test_parsed_resume_creation(self):
        """Test resume creation."""
        resume = ParsedResume(
            full_name="Nguyen Van A",
            email="a@example.com",
            phone="0912345678",
            skills=["Python", "Django"],
            total_experience_years=3.5
        )

        assert resume.full_name == "Nguyen Van A"
        assert len(resume.skills) == 2
        assert resume.total_experience_years == 3.5

    def test_resume_to_dict(self):
        """Test conversion to dictionary."""
        exp = Experience(company="ABC", role="Dev")
        edu = Education(institution="XYZ University", degree="Bachelor")

        resume = ParsedResume(
            full_name="John Doe",
            experience=[exp],
            education=[edu],
            total_experience_years=2.0
        )

        resume_dict = resume.to_dict()

        assert resume_dict["full_name"] == "John Doe"
        assert len(resume_dict["experience"]) == 1
        assert len(resume_dict["education"]) == 1

    def test_resume_defaults(self):
        """Test resume default values."""
        resume = ParsedResume()

        assert resume.full_name == ""
        assert resume.email == ""
        assert resume.skills == []
        assert resume.experience == []
        assert resume.education == []
        assert resume.parse_method == "text"
