"""Unit tests for resume parser models."""

import pytest
from app.services.parser.models import ParsedResume, Experience, Education


class TestExperience:
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
        assert exp.start_date == "01/2020"
        assert exp.end_date == "12/2022"
        assert exp.duration_months == 36

    def test_experience_default_values(self):
        """Test experience with default values."""
        exp = Experience(company="Acme", role="Developer")

        assert exp.start_date is None
        assert exp.end_date is None
        assert exp.description == ""
        assert exp.duration_months == 0


class TestEducation:
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
        assert edu.field == "Computer Science"
        assert edu.year == 2020

    def test_education_default_values(self):
        """Test education with default values."""
        edu = Education(institution="University")

        assert edu.degree == ""
        assert edu.field == ""
        assert edu.year is None


class TestParsedResume:
    """Tests for ParsedResume model."""

    def test_parsed_resume_creation(self):
        """Test basic resume creation."""
        resume = ParsedResume(
            full_name="Nguyen Van A",
            email="a@example.com",
            phone="0912345678",
            skills=["Python", "Django", "PostgreSQL"],
            total_experience_years=3.5,
            raw_text="Sample resume text",
            parse_method="text"
        )

        assert resume.full_name == "Nguyen Van A"
        assert resume.email == "a@example.com"
        assert resume.phone == "0912345678"
        assert len(resume.skills) == 3
        assert resume.total_experience_years == 3.5
        assert resume.parse_method == "text"

    def test_parsed_resume_to_dict(self):
        """Test resume conversion to dictionary."""
        exp = Experience(company="ABC", role="Dev")
        edu = Education(institution="XYZ University", degree="Bachelor")

        resume = ParsedResume(
            full_name="John Doe",
            email="john@example.com",
            phone="0123456789",
            skills=["Python", "Java"],
            experience=[exp],
            education=[edu],
            total_experience_years=2.0,
            raw_text="Sample text",
            parse_method="ocr"
        )

        resume_dict = resume.to_dict()

        assert resume_dict["full_name"] == "John Doe"
        assert resume_dict["email"] == "john@example.com"
        assert resume_dict["phone"] == "0123456789"
        assert len(resume_dict["skills"]) == 2
        assert len(resume_dict["experience"]) == 1
        assert len(resume_dict["education"]) == 1
        assert resume_dict["total_experience_years"] == 2.0
        assert resume_dict["parse_method"] == "ocr"

    def test_parsed_resume_default_values(self):
        """Test resume with default values."""
        resume = ParsedResume()

        assert resume.full_name == ""
        assert resume.email == ""
        assert resume.phone == ""
        assert resume.skills == []
        assert resume.experience == []
        assert resume.education == []
        assert resume.total_experience_years == 0.0
        assert resume.parse_method == "text"

    def test_parsed_resume_empty_experience_in_dict(self):
        """Test resume dict with no experience."""
        resume = ParsedResume(full_name="Test")
        resume_dict = resume.to_dict()

        assert resume_dict["experience"] == []
        assert resume_dict["education"] == []

    def test_parsed_resume_skills_list(self):
        """Test resume skills management."""
        resume = ParsedResume(skills=["React", "Node.js", "MongoDB"])

        assert "React" in resume.skills
        assert "Node.js" in resume.skills
        assert "MongoDB" in resume.skills
        assert len(resume.skills) == 3
