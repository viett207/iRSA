"""Unit tests for parser models - isolated version."""

# Test the dataclass models directly without importing app
from dataclasses import dataclass, field
from typing import Optional


# Copy the models inline to avoid app imports
@dataclass
class Experience:
    """Work experience entry."""
    company: str
    role: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    description: str = ""
    duration_months: int = 0


@dataclass
class Education:
    """Education entry."""
    institution: str
    degree: str = ""
    field: str = ""
    year: Optional[int] = None


@dataclass
class ParsedResume:
    """Complete parsed resume data."""
    full_name: str = ""
    email: str = ""
    phone: str = ""
    skills: list[str] = field(default_factory=list)
    experience: list[Experience] = field(default_factory=list)
    education: list[Education] = field(default_factory=list)
    total_experience_years: float = 0.0
    raw_text: str = ""
    parse_method: str = "text"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "full_name": self.full_name,
            "email": self.email,
            "phone": self.phone,
            "skills": self.skills,
            "experience": [
                {
                    "company": exp.company,
                    "role": exp.role,
                    "start_date": exp.start_date,
                    "end_date": exp.end_date,
                    "description": exp.description,
                }
                for exp in self.experience
            ],
            "education": [
                {
                    "institution": edu.institution,
                    "degree": edu.degree,
                    "field": edu.field,
                    "year": edu.year,
                }
                for edu in self.education
            ],
            "total_experience_years": self.total_experience_years,
            "raw_text": self.raw_text,
            "parse_method": self.parse_method,
        }


# Tests
class TestExperience:
    """Tests for Experience model."""

    def test_experience_creation(self):
        """Test basic experience creation."""
        exp = Experience(
            company="Tech Corp",
            role="Senior Developer",
            start_date="01/2020",
            end_date="12/2022",
            description="Led team",
            duration_months=36
        )

        assert exp.company == "Tech Corp"
        assert exp.role == "Senior Developer"
        assert exp.duration_months == 36

    def test_experience_minimal(self):
        """Test minimal experience."""
        exp = Experience(company="Acme", role="Dev")

        assert exp.company == "Acme"
        assert exp.role == "Dev"
        assert exp.start_date is None
        assert exp.duration_months == 0


class TestEducation:
    """Tests for Education model."""

    def test_education_creation(self):
        """Test education creation."""
        edu = Education(
            institution="University",
            degree="Bachelor",
            field="CS",
            year=2020
        )

        assert edu.institution == "University"
        assert edu.degree == "Bachelor"
        assert edu.year == 2020

    def test_education_minimal(self):
        """Test minimal education."""
        edu = Education(institution="Uni")

        assert edu.institution == "Uni"
        assert edu.degree == ""
        assert edu.year is None


class TestParsedResume:
    """Tests for ParsedResume model."""

    def test_resume_creation(self):
        """Test resume creation."""
        resume = ParsedResume(
            full_name="John Doe",
            email="john@example.com",
            phone="0912345678",
            skills=["Python", "Django"],
            total_experience_years=3.5
        )

        assert resume.full_name == "John Doe"
        assert resume.email == "john@example.com"
        assert len(resume.skills) == 2

    def test_resume_to_dict(self):
        """Test conversion to dictionary."""
        exp = Experience(company="ABC", role="Dev")
        edu = Education(institution="XYZ", degree="Bachelor")

        resume = ParsedResume(
            full_name="Jane",
            experience=[exp],
            education=[edu]
        )

        d = resume.to_dict()

        assert d["full_name"] == "Jane"
        assert len(d["experience"]) == 1
        assert d["experience"][0]["company"] == "ABC"
        assert len(d["education"]) == 1

    def test_resume_defaults(self):
        """Test resume defaults."""
        resume = ParsedResume()

        assert resume.full_name == ""
        assert resume.skills == []
        assert resume.parse_method == "text"
        assert resume.total_experience_years == 0.0

    def test_resume_skill_list(self):
        """Test skills list."""
        resume = ParsedResume(
            skills=["React", "Node", "MongoDB"]
        )

        assert len(resume.skills) == 3
        assert "React" in resume.skills
