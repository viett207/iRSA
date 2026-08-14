import pytest

from src.agents.graph import agent_graph


@pytest.mark.asyncio
async def test_agent_graph_basic_flow():
    sample_state = {
        "application_id": 1,
        "candidate_name": "Nguyen Van A",
        "job_title": "Python Developer",
        "resume_text": "Kỹ năng: Python, FastAPI. Kinh nghiệm 3 năm lập trình backend.",
        "must_have_skills": ["Python", "FastAPI"],
        "nice_to_have_skills": ["Docker"],
        "min_experience_years": 2,
        "min_education": "bachelor",
    }
    result = await agent_graph.ainvoke(sample_state)
    assert isinstance(result, dict)
    assert "overall_score" in result
    assert "interview_questions" in result
    assert "verification_passed" in result

