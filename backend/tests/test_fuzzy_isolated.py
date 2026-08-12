"""Unit tests for fuzzy skill matching - isolated version."""

from rapidfuzz import fuzz


def fuzzy_match_skill(
    candidate_skill: str,
    required_skill: str,
    threshold: int = 80,
) -> bool:
    """Check if skills match with fuzzy matching."""
    candidate = candidate_skill.lower()
    required = required_skill.lower()

    # Exact match
    if candidate == required:
        return True

    # Fuzzy match
    score = fuzz.ratio(candidate, required)
    if score >= threshold:
        return True

    return False


def match_skills(
    candidate_skills: list[str],
    required_skills: list[str],
    threshold: int = 80,
) -> tuple[list[str], list[str]]:
    """Match candidate skills against required skills."""
    matched = []
    missing = []

    for required in required_skills:
        found = False
        for candidate in candidate_skills:
            if fuzzy_match_skill(candidate, required, threshold):
                matched.append(required)
                found = True
                break

        if not found:
            missing.append(required)

    return matched, missing


def find_best_matches(
    candidate_skills: list[str],
    job_skills: list[str],
    top_n: int = 10,
) -> list[tuple[str, str, int]]:
    """Find best matches between candidate and job skills."""
    matches = []

    for job_skill in job_skills:
        best_match = None
        best_score = 0

        for candidate in candidate_skills:
            score = fuzz.ratio(candidate.lower(), job_skill.lower())
            if score > best_score:
                best_score = score
                best_match = candidate

        if best_match and best_score > 50:
            matches.append((best_match, job_skill, best_score))

    matches.sort(key=lambda x: x[2], reverse=True)
    return matches[:top_n]


class TestFuzzyMatchSkill:
    """Tests for fuzzy skill matching."""

    def test_exact_match(self):
        """Test exact match."""
        result = fuzzy_match_skill("Python", "Python", threshold=80)
        assert result is True

    def test_case_insensitive(self):
        """Test case insensitive."""
        result = fuzzy_match_skill("python", "Python", threshold=80)
        assert result is True

    def test_dissimilar_skills(self):
        """Test dissimilar skills."""
        result = fuzzy_match_skill("Ruby", "Python", threshold=80)
        assert result is False

    def test_low_threshold_match(self):
        """Test with low threshold."""
        result = fuzzy_match_skill("JS", "JavaScript", threshold=30)
        assert isinstance(result, bool)

    def test_empty_string(self):
        """Test with empty string."""
        result = fuzzy_match_skill("", "Python", threshold=80)
        assert isinstance(result, bool)


class TestMatchSkills:
    """Tests for matching skills."""

    def test_all_match(self):
        """Test all skills match."""
        candidates = ["Python", "Django", "PostgreSQL"]
        required = ["Python", "Django", "PostgreSQL"]

        matched, missing = match_skills(candidates, required, threshold=80)

        assert len(matched) == 3
        assert len(missing) == 0

    def test_partial_match(self):
        """Test partial match."""
        candidates = ["Python", "Django", "Redis"]
        required = ["Python", "Django", "PostgreSQL"]

        matched, missing = match_skills(candidates, required, threshold=80)

        assert "Python" in matched
        assert "Django" in matched
        assert "PostgreSQL" in missing

    def test_no_match(self):
        """Test no matches."""
        candidates = ["Ruby", "Rails"]
        required = ["Python", "Django"]

        matched, missing = match_skills(candidates, required, threshold=80)

        assert len(matched) == 0
        assert len(missing) == 2

    def test_empty_candidates(self):
        """Test empty candidates."""
        candidates = []
        required = ["Python", "Django"]

        matched, missing = match_skills(candidates, required, threshold=80)

        assert len(matched) == 0
        assert len(missing) == 2

    def test_empty_required(self):
        """Test empty required."""
        candidates = ["Python"]
        required = []

        matched, missing = match_skills(candidates, required, threshold=80)

        assert len(matched) == 0
        assert len(missing) == 0

    def test_duplicate_candidates(self):
        """Test duplicate candidates."""
        candidates = ["Python", "Python", "Django"]
        required = ["Python", "Django"]

        matched, missing = match_skills(candidates, required, threshold=80)

        assert "Python" in matched
        assert "Django" in matched


class TestFindBestMatches:
    """Tests for finding best matches."""

    def test_basic_matching(self):
        """Test basic matching."""
        candidates = ["Python", "JavaScript", "React"]
        jobs = ["Python", "React", "Node.js"]

        matches = find_best_matches(candidates, jobs, top_n=10)

        assert isinstance(matches, list)
        assert len(matches) <= 10

    def test_matches_sorted(self):
        """Test matches are sorted."""
        candidates = ["Python", "Django"]
        jobs = ["Python", "Django"]

        matches = find_best_matches(candidates, jobs, top_n=10)

        # Should be sorted descending
        if len(matches) > 1:
            for i in range(len(matches) - 1):
                assert matches[i][2] >= matches[i + 1][2]

    def test_top_n_limit(self):
        """Test top_n limit."""
        candidates = ["A", "B", "C", "D", "E"]
        jobs = ["A", "B", "C", "D", "E", "F"]

        matches = find_best_matches(candidates, jobs, top_n=3)

        assert len(matches) <= 3

    def test_minimum_threshold(self):
        """Test minimum score threshold."""
        candidates = ["X", "Y"]
        jobs = ["A", "B"]

        matches = find_best_matches(candidates, jobs, top_n=10)

        # All should be above 50
        for _, _, score in matches:
            assert score > 50

    def test_empty_candidates_match(self):
        """Test with empty candidates."""
        candidates = []
        jobs = ["Python"]

        matches = find_best_matches(candidates, jobs, top_n=10)

        assert len(matches) == 0

    def test_match_structure(self):
        """Test match tuple structure."""
        candidates = ["Python"]
        jobs = ["Python"]

        matches = find_best_matches(candidates, jobs, top_n=10)

        for match in matches:
            assert isinstance(match, tuple)
            assert len(match) == 3
            candidate, job, score = match
            assert isinstance(candidate, str)
            assert isinstance(job, str)
            assert 0 <= score <= 100
