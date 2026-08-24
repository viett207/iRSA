"""Test Fixtures Package for Anti-Hallucination & Scoring Pipeline Testing."""

from tests.fixtures.cv_fixtures import (
    CV_FIXTURES,
    get_cv_fixture,
    list_cv_fixture_keys,
)
from tests.fixtures.jd_fixtures import (
    JD_FIXTURES,
    get_jd_fixture,
    list_jd_fixture_keys,
)

try:
    from tests.fixtures.scoring_fixtures import (
        FIXTURES,
        JDSpec,
        ScoringFixture,
        as_agent_state,
        as_criteria_kwargs,
        as_job_criteria,
        get_fixture,
    )
except ImportError:
    FIXTURES = {}
    JDSpec = None
    ScoringFixture = None
    as_agent_state = None
    as_criteria_kwargs = None
    as_job_criteria = None
    get_fixture = None

__all__ = [
    "CV_FIXTURES",
    "get_cv_fixture",
    "list_cv_fixture_keys",
    "JD_FIXTURES",
    "get_jd_fixture",
    "list_jd_fixture_keys",
    "FIXTURES",
    "JDSpec",
    "ScoringFixture",
    "as_agent_state",
    "as_criteria_kwargs",
    "as_job_criteria",
    "get_fixture",
]
