"""Job Description & Criteria Fixtures for Scoring & Evaluation Regression Testing."""

from typing import Dict, Any, List


JD_FIXTURES: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------------------
    # 1. Standard Python Backend Mid-Level (Yêu cầu 3 năm)
    # -------------------------------------------------------------------------
    "python_backend_mid": {
        "id": "JD-01",
        "title": "Kỹ sư Lập trình Python Backend (Mid-level)",
        "department": "Kỹ thuật Công nghệ",
        "must_have_skills": ["Python", "FastAPI", "PostgreSQL"],
        "nice_to_have_skills": ["Docker", "Redis", "Celery"],
        "min_experience_years": 3,
        "max_experience_years": 5,
        "min_education": "bachelor",
        "weight_skills": 60,
        "weight_experience": 30,
        "weight_education": 10,
        "description": "Chịu trách nhiệm thiết kế, lập trình API backend và tối ưu hóa hệ thống bằng Python/FastAPI.",
    },

    # -------------------------------------------------------------------------
    # 2. Junior Python Developer (Yêu cầu 1 năm)
    # -------------------------------------------------------------------------
    "junior_python_dev": {
        "id": "JD-02",
        "title": "Junior Python Developer",
        "department": "Phát triển Phần mềm",
        "must_have_skills": ["Python", "Django"],
        "nice_to_have_skills": ["Git", "MySQL"],
        "min_experience_years": 1,
        "max_experience_years": 2,
        "min_education": "bachelor",
        "weight_skills": 50,
        "weight_experience": 30,
        "weight_education": 20,
        "description": "Lập trình backend cơ bản với Python Django, xây dựng website thương mại điện tử.",
    },

    # -------------------------------------------------------------------------
    # 3. Senior Backend Architect (Yêu cầu 5 năm)
    # -------------------------------------------------------------------------
    "senior_python_architect": {
        "id": "JD-03",
        "title": "Senior Python Backend Architect",
        "department": "Kiến trúc Hệ thống",
        "must_have_skills": ["Python", "FastAPI", "Microservices", "Redis", "Kafka"],
        "nice_to_have_skills": ["Kubernetes", "AWS", "CI/CD"],
        "min_experience_years": 5,
        "max_experience_years": 10,
        "min_education": "bachelor",
        "weight_skills": 50,
        "weight_experience": 40,
        "weight_education": 10,
        "description": "Thiết kế kiến trúc phân tán chịu tải cao, microservices và message streaming.",
    },

    # -------------------------------------------------------------------------
    # 4. Senior Java Engineer (Vị trí chuyên Java)
    # -------------------------------------------------------------------------
    "senior_java_engineer": {
        "id": "JD-04",
        "title": "Senior Java Developer",
        "department": "Core Banking",
        "must_have_skills": ["Java", "Spring Boot", "Kafka"],
        "nice_to_have_skills": ["Docker", "Kubernetes", "Redis"],
        "min_experience_years": 4,
        "max_experience_years": 8,
        "min_education": "bachelor",
        "weight_skills": 60,
        "weight_experience": 30,
        "weight_education": 10,
        "description": "Phát triển hệ thống lõi ngân hàng với Java Spring Boot và Apache Kafka.",
    },

    # -------------------------------------------------------------------------
    # 5. Data Analyst (Yêu cầu kỹ năng văn phòng & SQL)
    # -------------------------------------------------------------------------
    "data_analyst": {
        "id": "JD-05",
        "title": "Chuyên viên Phân tích Dữ liệu (Data Analyst)",
        "department": "Dữ liệu & Phân tích",
        "must_have_skills": ["SQL", "Excel", "Power BI"],
        "nice_to_have_skills": ["Python", "VLOOKUP", "Pivot Table"],
        "min_experience_years": 2,
        "max_experience_years": 4,
        "min_education": "bachelor",
        "weight_skills": 60,
        "weight_experience": 30,
        "weight_education": 10,
        "description": "Thu thập, làm sạch dữ liệu, xây dựng Dashboard báo cáo quản trị bằng Excel và Power BI.",
    },

    # -------------------------------------------------------------------------
    # 6. Job không có Criteria (Kiểm tra fallback)
    # -------------------------------------------------------------------------
    "empty_criteria_job": {
        "id": "JD-06",
        "title": "Vị trí thử nghiệm không cấu hình tiêu chí",
        "department": "R&D",
        "must_have_skills": [],
        "nice_to_have_skills": [],
        "min_experience_years": 0,
        "max_experience_years": None,
        "min_education": None,
        "weight_skills": None,
        "weight_experience": None,
        "weight_education": None,
        "description": "Dùng để kiểm thử cơ chế fallback khi Job chưa được nhập JobCriteria.",
    }
}


def get_jd_fixture(fixture_key: str) -> Dict[str, Any]:
    """Retrieve a specific JD fixture by its dictionary key."""
    if fixture_key not in JD_FIXTURES:
        raise KeyError(f"JD fixture '{fixture_key}' not found. Available keys: {list(JD_FIXTURES.keys())}")
    return JD_FIXTURES[fixture_key]


def list_jd_fixture_keys() -> List[str]:
    """Return all available JD fixture keys."""
    return list(JD_FIXTURES.keys())
