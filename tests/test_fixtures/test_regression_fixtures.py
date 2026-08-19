"""Unit tests to validate integrity and requirements of all 12 CV & JD regression fixtures."""

import pytest
from tests.fixtures.cv_fixtures import CV_FIXTURES, get_cv_fixture, list_cv_fixture_keys
from tests.fixtures.jd_fixtures import JD_FIXTURES, get_jd_fixture, list_jd_fixture_keys


REQUIRED_CV_KEYS = [
    "python_in_skills_only",
    "python_in_experience_with_date_range",
    "jd_requires_3y_cv_proves_1y",
    "summary_claims_5y_history_proves_2y",
    "no_python_cv",
    "unusual_section_headings",
    "keyword_stuffed_cv",
    "overlapping_jobs_cv",
    "project_without_date_range",
    "certification_with_date",
    "vietnamese_standard_cv",
    "english_standard_cv",
]


def test_all_12_cv_fixtures_present():
    """Verify all 12 required CV scenarios exist in the fixture registry."""
    keys = list_cv_fixture_keys()
    assert len(keys) == 12
    for req_key in REQUIRED_CV_KEYS:
        assert req_key in keys, f"Missing required CV fixture: {req_key}"


def test_cv_fixture_structure():
    """Verify every CV fixture has proper structure and non-empty fields."""
    for key, fixture in CV_FIXTURES.items():
        assert "id" in fixture
        assert "name" in fixture
        assert "description" in fixture
        assert "raw_text" in fixture and len(fixture["raw_text"].strip()) > 50
        assert "ground_truth" in fixture and isinstance(fixture["ground_truth"], dict)


def test_scenario_1_python_in_skills_only():
    """Scenario 1: Python only appears in Skills section, not in Experience."""
    cv = get_cv_fixture("python_in_skills_only")
    gt = cv["ground_truth"]
    assert gt["python_in_skills"] is True
    assert gt["python_in_experience"] is False
    assert gt["proven_python_years"] == 0.0
    assert "PHP" in cv["raw_text"]


def test_scenario_2_python_in_experience_with_date_range():
    """Scenario 2: Python inside Experience with specific date range."""
    cv = get_cv_fixture("python_in_experience_with_date_range")
    gt = cv["ground_truth"]
    assert gt["python_in_experience"] is True
    assert gt["proven_python_years"] == 2.0
    assert "01/2022 - 12/2023" in cv["raw_text"]
    assert "FastAPI" in cv["raw_text"]


def test_scenario_3_jd_requires_3y_cv_proves_1y():
    """Scenario 3: Candidate has only 1 year experience, failing 3-year requirement."""
    cv = get_cv_fixture("jd_requires_3y_cv_proves_1y")
    gt = cv["ground_truth"]
    assert gt["total_experience_years"] == 1.0
    assert gt["meets_3_year_requirement"] is False


def test_scenario_4_summary_claims_5y_history_proves_2y():
    """Scenario 4: Summary self-claims 5 years but work history only proves 2 years."""
    cv = get_cv_fixture("summary_claims_5y_history_proves_2y")
    gt = cv["ground_truth"]
    assert gt["claimed_years_in_summary"] == 5.0
    assert gt["proven_years_in_history"] == 2.0
    assert gt["discrepancy_detected"] is True
    assert "hơn 5 năm kinh nghiệm" in cv["raw_text"]
    assert "2 năm kinh nghiệm" in cv["raw_text"]


def test_scenario_5_no_python_cv():
    """Scenario 5: No Python keywords anywhere in the CV text."""
    cv = get_cv_fixture("no_python_cv")
    gt = cv["ground_truth"]
    assert gt["has_python"] is False
    assert "python" not in cv["raw_text"].lower()
    assert "Java" in cv["raw_text"]


def test_scenario_6_unusual_section_headings():
    """Scenario 6: Uses unusual / stylized section headings."""
    cv = get_cv_fixture("unusual_section_headings")
    gt = cv["ground_truth"]
    assert len(gt["unusual_headings"]) >= 3
    for heading in gt["unusual_headings"]:
        assert heading in cv["raw_text"]


def test_scenario_7_keyword_stuffed_cv():
    """Scenario 7: Keyword stuffed resume without project context."""
    cv = get_cv_fixture("keyword_stuffed_cv")
    gt = cv["ground_truth"]
    assert gt["is_keyword_stuffed"] is True
    assert gt["proven_python_years"] == 0.0
    assert gt["actual_work_experience_months"] == 6


def test_scenario_8_overlapping_jobs_cv():
    """Scenario 8: Two overlapping jobs spanning the same calendar period."""
    cv = get_cv_fixture("overlapping_jobs_cv")
    gt = cv["ground_truth"]
    assert gt["has_overlapping_dates"] is True
    assert gt["raw_sum_years"] == 3.0
    assert gt["deduplicated_calendar_years"] == 2.0


def test_scenario_9_project_without_date_range():
    """Scenario 9: Projects described in detail without date ranges."""
    cv = get_cv_fixture("project_without_date_range")
    gt = cv["ground_truth"]
    assert gt["has_projects"] is True
    assert gt["projects_have_dates"] is False
    assert gt["verifiable_employment_years"] == 0.0


def test_scenario_10_certification_with_date():
    """Scenario 10: Certifications with verifiable issue dates."""
    cv = get_cv_fixture("certification_with_date")
    gt = cv["ground_truth"]
    assert gt["has_valid_certifications"] is True
    assert len(gt["certs"]) >= 2
    assert "AWS Certified Solutions Architect" in cv["raw_text"]
    assert "11/2023" in cv["raw_text"]


def test_scenario_11_vietnamese_standard_cv():
    """Scenario 11: Pure Vietnamese resume with standard diacritics and structure."""
    cv = get_cv_fixture("vietnamese_standard_cv")
    gt = cv["ground_truth"]
    assert gt["language"] == "vi"
    assert "KINH NGHIỆM LÀM VIỆC" in cv["raw_text"]
    assert "TRÌNH ĐỘ HỌC VẤN" in cv["raw_text"]
    assert "Đại học Bách Khoa Hà Nội" in cv["raw_text"]


def test_scenario_12_english_standard_cv():
    """Scenario 12: Pure English resume with international standard structure."""
    cv = get_cv_fixture("english_standard_cv")
    gt = cv["ground_truth"]
    assert gt["language"] == "en"
    assert "PROFESSIONAL EXPERIENCE" in cv["raw_text"]
    assert "TECHNICAL SKILLS" in cv["raw_text"]
    assert "EDUCATION" in cv["raw_text"]


def test_jd_fixtures_structure():
    """Verify all 6 JD criteria fixtures are properly configured."""
    jd_keys = list_jd_fixture_keys()
    assert len(jd_keys) >= 6
    assert "python_backend_mid" in jd_keys
    assert "junior_python_dev" in jd_keys
    assert "senior_python_architect" in jd_keys

    mid_jd = get_jd_fixture("python_backend_mid")
    assert mid_jd["min_experience_years"] == 3
    assert "Python" in mid_jd["must_have_skills"]
    assert "FastAPI" in mid_jd["must_have_skills"]


def test_get_fixture_invalid_key():
    """Verify appropriate KeyError when requesting non-existent fixtures."""
    with pytest.raises(KeyError, match="CV fixture 'non_existent' not found"):
        get_cv_fixture("non_existent")

    with pytest.raises(KeyError, match="JD fixture 'non_existent' not found"):
        get_jd_fixture("non_existent")
