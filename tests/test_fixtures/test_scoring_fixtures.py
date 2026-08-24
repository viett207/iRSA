"""Sanity check cho bộ fixture CV/JD — đảm bảo fixture tự nhất quán.

Không test production logic; chỉ khoá các bất biến của dữ liệu fixture để
regression test sau này có nền tin cậy.
"""

import pytest

from tests.fixtures import (
    FIXTURES,
    as_agent_state,
    as_criteria_kwargs,
    as_job_criteria,
    get_fixture,
)

EXPECTED_IDS = {
    "python_only_in_skills",
    "python_in_experience_with_dates",
    "jd_requires_3_years_cv_proves_1",
    "summary_claims_5_history_proves_2",
    "no_python",
    "weird_section_headings",
    "keyword_stuffed",
    "overlapping_jobs",
    "project_no_dates",
    "certification_with_issue_date",
    "vietnamese_cv",
    "english_cv",
}


def test_all_required_cases_present():
    assert set(FIXTURES) == EXPECTED_IDS


@pytest.mark.parametrize("fixture_id", sorted(EXPECTED_IDS))
def test_fixture_is_well_formed(fixture_id):
    fx = get_fixture(fixture_id)
    assert fx.id == fixture_id
    assert fx.description
    assert fx.candidate_name
    assert len(fx.resume_text.strip()) >= 30, "CV quá ngắn sẽ rơi vào nhánh empty-CV guard"
    assert fx.jd.job_title
    assert isinstance(fx.jd.must_have_skills, list) and fx.jd.must_have_skills
    assert fx.jd.weight_skills + fx.jd.weight_experience + fx.jd.weight_education == 100


def test_no_python_fixture_truly_has_no_python():
    fx = get_fixture("no_python")
    assert "python" not in fx.resume_text.lower()
    assert "Python" in fx.jd.must_have_skills


def test_python_only_in_skills_has_no_python_in_experience():
    fx = get_fixture("python_only_in_skills")
    text = fx.resume_text
    exp_section = text[text.index("KINH NGHIỆM LÀM VIỆC"):text.index("HỌC VẤN")]
    assert "python" not in exp_section.lower()
    skills_section = text[text.index("KỸ NĂNG"):text.index("KINH NGHIỆM LÀM VIỆC")]
    assert "python" in skills_section.lower()


def test_summary_claim_exceeds_provable_years():
    fx = get_fixture("summary_claims_5_history_proves_2")
    assert fx.expected["claimed_years"] > fx.expected["provable_python_years"]
    assert "5 năm" in fx.resume_text


def test_overlapping_jobs_naive_sum_exceeds_union():
    fx = get_fixture("overlapping_jobs")
    assert fx.expected["naive_summed_years"] > fx.expected["provable_python_years"]


def test_project_no_dates_has_no_date_ranges():
    import re

    fx = get_fixture("project_no_dates")
    assert not re.search(r"\d{1,2}/\d{4}\s*-\s*\d{1,2}/\d{4}", fx.resume_text)
    assert not re.search(r"\b(19|20)\d{2}\s*-\s*(19|20)\d{2}\b", fx.resume_text)


def test_helpers_produce_consistent_shapes():
    fx = get_fixture("english_cv")

    state = as_agent_state(fx, application_id=42)
    assert state["application_id"] == 42
    assert state["resume_text"] == fx.resume_text
    assert state["must_have_skills"] == fx.jd.must_have_skills
    # Helper trả copy — mutate state không được làm bẩn fixture dùng chung
    state["must_have_skills"].append("XXX")
    assert "XXX" not in fx.jd.must_have_skills

    kwargs = as_criteria_kwargs(fx)
    assert kwargs["min_experience_years"] == fx.jd.min_experience_years
    assert (
        kwargs["weight_skills"] + kwargs["weight_experience"] + kwargs["weight_education"]
        == 100
    )


def test_as_job_criteria_builds_detached_model():
    fx = get_fixture("vietnamese_cv")
    criteria = as_job_criteria(fx)
    assert criteria.must_have_skills == ["Python", "PostgreSQL"]
    assert criteria.min_experience_years == 2
    assert criteria.min_education == "bachelor"
    assert criteria.weight_skills == 60
