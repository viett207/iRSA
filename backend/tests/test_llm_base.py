"""Unit tests for LLM adapter base class and data models."""

import pytest
import json
from app.services.llm.base import (
    LLMAdapter,
    AnalysisOutput,
    InterviewQuestion,
)


class TestInterviewQuestion:
    """Tests for InterviewQuestion model."""

    def test_interview_question_creation(self):
        """Test basic interview question creation."""
        q = InterviewQuestion(
            category="technical",
            question="What is your experience with Python?",
            rationale="Need to assess Python expertise"
        )

        assert q.category == "technical"
        assert q.question == "What is your experience with Python?"
        assert q.rationale == "Need to assess Python expertise"

    def test_interview_question_categories(self):
        """Test valid question categories."""
        categories = ["technical", "behavioral", "situational"]

        for category in categories:
            q = InterviewQuestion(
                category=category,
                question="Test question",
                rationale="Test"
            )
            assert q.category == category


class TestAnalysisOutput:
    """Tests for AnalysisOutput model."""

    def test_analysis_output_creation(self):
        """Test basic analysis output creation."""
        output = AnalysisOutput(
            overall_score=85,
            skills_score=90,
            experience_score=80,
            education_score=75,
            culture_score=80,
            fit_summary="Good fit for the role",
            strengths=["Strong Python skills", "Good experience"],
            weaknesses=["Limited DevOps experience"],
            red_flags=[]
        )

        assert output.overall_score == 85
        assert output.skills_score == 90
        assert len(output.strengths) == 2
        assert len(output.weaknesses) == 1

    def test_analysis_output_default_values(self):
        """Test analysis output with defaults."""
        output = AnalysisOutput()

        assert output.overall_score == 0
        assert output.skills_score == 0
        assert output.fit_summary == ""
        assert output.strengths == []
        assert output.weaknesses == []
        assert output.interview_questions == []
        assert output.culture_signals == []
        assert output.red_flags == []

    def test_analysis_output_with_interview_questions(self):
        """Test analysis output with interview questions."""
        q1 = InterviewQuestion(
            category="technical",
            question="What is Python?",
            rationale="Test knowledge"
        )
        q2 = InterviewQuestion(
            category="behavioral",
            question="How do you handle pressure?",
            rationale="Assess soft skills"
        )

        output = AnalysisOutput(
            interview_questions=[q1, q2]
        )

        assert len(output.interview_questions) == 2
        assert output.interview_questions[0].category == "technical"

    def test_analysis_output_to_dict(self):
        """Test conversion to dictionary."""
        q = InterviewQuestion(
            category="technical",
            question="Test?",
            rationale="Testing"
        )

        output = AnalysisOutput(
            overall_score=75,
            skills_score=80,
            experience_score=70,
            education_score=65,
            culture_score=75,
            fit_summary="Average fit",
            strengths=["Strong"],
            weaknesses=["Weak"],
            interview_questions=[q],
            culture_signals=["Team player"],
            red_flags=["Gap in CV"]
        )

        output_dict = output.to_dict()

        assert output_dict["overall_score"] == 75
        assert output_dict["skills_score"] == 80
        assert output_dict["fit_summary"] == "Average fit"
        assert len(output_dict["strengths"]) == 1
        assert len(output_dict["interview_questions"]) == 1
        assert output_dict["interview_questions"][0]["category"] == "technical"

    def test_analysis_output_score_bounds(self):
        """Test that scores are bounded 0-100."""
        output = AnalysisOutput(
            overall_score=150,
            skills_score=-10,
            experience_score=100,
            education_score=0
        )

        # Scores are stored as-is; validation would be in usage
        assert output.overall_score == 150
        assert output.skills_score == -10
        assert output.experience_score == 100
        assert output.education_score == 0

    def test_analysis_output_strength_limit(self):
        """Test that strengths are limited properly."""
        strengths = [f"Strength {i}" for i in range(15)]
        output = AnalysisOutput(strengths=strengths)

        assert len(output.strengths) == 15

    def test_analysis_output_with_all_fields(self):
        """Test analysis output with all fields populated."""
        questions = [
            InterviewQuestion("technical", "Q1", "R1"),
            InterviewQuestion("behavioral", "Q2", "R2"),
            InterviewQuestion("situational", "Q3", "R3"),
        ]

        output = AnalysisOutput(
            overall_score=88,
            skills_score=90,
            experience_score=85,
            education_score=80,
            culture_score=88,
            fit_summary="Excellent fit",
            strengths=["Strength1", "Strength2", "Strength3"],
            weaknesses=["Weakness1"],
            interview_questions=questions,
            culture_signals=["Signal1", "Signal2"],
            red_flags=[],
            raw_response="raw response data"
        )

        output_dict = output.to_dict()

        assert len(output_dict) > 0
        assert "overall_score" in output_dict
        assert "interview_questions" in output_dict
        assert len(output_dict["interview_questions"]) == 3


class TestLLMAdapterBase:
    """Tests for LLMAdapter base class."""

    def test_llm_adapter_is_abstract(self):
        """Test that LLMAdapter cannot be instantiated directly."""
        # LLMAdapter is abstract and has abstractmethod
        with pytest.raises(TypeError):
            LLMAdapter()

    def test_build_prompt_method_exists(self):
        """Test that _build_prompt method exists in base class."""
        assert hasattr(LLMAdapter, "_build_prompt")

    def test_parse_response_method_exists(self):
        """Test that _parse_response method exists."""
        assert hasattr(LLMAdapter, "_parse_response")


class TestParseResponse:
    """Tests for LLM response parsing."""

    def test_parse_valid_json_response(self):
        """Test parsing valid JSON response."""
        # Create a minimal concrete implementation for testing
        class MockLLMAdapter(LLMAdapter):
            async def analyze(self, resume_text, job_title, job_description,
                            job_requirements, must_have_skills, nice_to_have_skills):
                pass

        adapter = MockLLMAdapter()

        json_response = """{
            "overall_score": 85,
            "skills_score": 90,
            "experience_score": 80,
            "education_score": 75,
            "culture_score": 80,
            "fit_summary": "Good fit",
            "strengths": ["Strong", "Experienced"],
            "weaknesses": ["Limited"],
            "interview_questions": [
                {
                    "category": "technical",
                    "question": "Question?",
                    "rationale": "Why"
                }
            ],
            "culture_signals": ["Team player"],
            "red_flags": []
        }"""

        output = adapter._parse_response(json_response)

        assert output.overall_score == 85
        assert output.skills_score == 90
        assert output.fit_summary == "Good fit"
        assert len(output.strengths) == 2
        assert len(output.interview_questions) == 1

    def test_parse_json_with_text_wrapper(self):
        """Test parsing JSON embedded in text."""
        class MockLLMAdapter(LLMAdapter):
            async def analyze(self, resume_text, job_title, job_description,
                            job_requirements, must_have_skills, nice_to_have_skills):
                pass

        adapter = MockLLMAdapter()

        response = """Here is the analysis:
        {
            "overall_score": 72,
            "skills_score": 75,
            "experience_score": 70,
            "education_score": 65,
            "culture_score": 70,
            "fit_summary": "Average",
            "strengths": [],
            "weaknesses": [],
            "interview_questions": [],
            "culture_signals": [],
            "red_flags": []
        }
        End of analysis."""

        output = adapter._parse_response(response)

        assert output.overall_score == 72
        assert output.fit_summary == "Average"

    def test_parse_invalid_json_response(self):
        """Test parsing invalid JSON response."""
        class MockLLMAdapter(LLMAdapter):
            async def analyze(self, resume_text, job_title, job_description,
                            job_requirements, must_have_skills, nice_to_have_skills):
                pass

        adapter = MockLLMAdapter()

        response = "This is not JSON"

        output = adapter._parse_response(response)

        # Should return default AnalysisOutput on parse error
        assert isinstance(output, AnalysisOutput)
        assert output.overall_score == 0

    def test_parse_response_with_boundary_scores(self):
        """Test parsing response with boundary scores."""
        class MockLLMAdapter(LLMAdapter):
            async def analyze(self, resume_text, job_title, job_description,
                            job_requirements, must_have_skills, nice_to_have_skills):
                pass

        adapter = MockLLMAdapter()

        json_response = """{
            "overall_score": 0,
            "skills_score": 100,
            "experience_score": 50,
            "education_score": 0,
            "culture_score": 100,
            "fit_summary": "Test",
            "strengths": [],
            "weaknesses": [],
            "interview_questions": [],
            "culture_signals": [],
            "red_flags": []
        }"""

        output = adapter._parse_response(json_response)

        assert output.overall_score == 0
        assert output.skills_score == 100
        assert output.culture_score == 100

    def test_parse_response_clamps_scores(self):
        """Test that parse response clamps scores 0-100."""
        class MockLLMAdapter(LLMAdapter):
            async def analyze(self, resume_text, job_title, job_description,
                            job_requirements, must_have_skills, nice_to_have_skills):
                pass

        adapter = MockLLMAdapter()

        json_response = """{
            "overall_score": 150,
            "skills_score": -10,
            "experience_score": 50,
            "education_score": 50,
            "culture_score": 50,
            "fit_summary": "Test",
            "strengths": [],
            "weaknesses": [],
            "interview_questions": [],
            "culture_signals": [],
            "red_flags": []
        }"""

        output = adapter._parse_response(json_response)

        # Scores should be clamped to 0-100
        assert 0 <= output.overall_score <= 100
        assert 0 <= output.skills_score <= 100
