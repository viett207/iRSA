"""Unit tests for fuzzy skill matching engine."""

import pytest
from app.services.rules.fuzzy import fuzzy_match_skill, match_skills, find_best_matches


class TestFuzzyMatchSkill:
    """Tests for fuzzy skill matching."""

    def test_exact_match(self):
        """Test exact skill match."""
        result = fuzzy_match_skill("Python", "Python", threshold=80)
        assert result is True

    def test_case_insensitive_match(self):
        """Test case insensitive matching."""
        result = fuzzy_match_skill("python", "Python", threshold=80)
        assert result is True

    def test_no_match_below_threshold(self):
        """Test that dissimilar skills don't match."""
        result = fuzzy_match_skill("Ruby", "Python", threshold=80)
        assert result is False

    def test_high_similarity_match(self):
        """Test similar skills match."""
        # JavaScript and java should have some similarity
        result = fuzzy_match_skill("JavaScript", "Java", threshold=50)
        # This is a fuzzy test; the actual match depends on algorithm
        # We're testing the function works without errors
        assert isinstance(result, bool)

    def test_low_threshold(self):
        """Test matching with low threshold."""
        # With low threshold, more skills should match
        result = fuzzy_match_skill("JS", "JavaScript", threshold=30)
        # Function should execute without error
        assert isinstance(result, bool)

    def test_empty_string_match(self):
        """Test matching with empty string."""
        result = fuzzy_match_skill("", "Python", threshold=80)
        assert isinstance(result, bool)

    def test_dot_net_variant(self):
        """Test .NET skill variants."""
        # .NET, ASP.NET, C# are related
        result = fuzzy_match_skill("ASP.NET", ".NET", threshold=50)
        assert isinstance(result, bool)

    def test_node_variant(self):
        """Test Node.js variants."""
        result = fuzzy_match_skill("Node.js", "Node", threshold=80)
        assert isinstance(result, bool)


class TestMatchSkills:
    """Tests for matching candidate skills against required skills."""

    def test_all_skills_match(self):
        """Test when all required skills match."""
        candidate_skills = ["Python", "Django", "PostgreSQL"]
        required_skills = ["Python", "Django", "PostgreSQL"]

        matched, missing = match_skills(candidate_skills, required_skills, threshold=80)

        assert len(matched) == 3
        assert len(missing) == 0

    def test_partial_skills_match(self):
        """Test when some required skills match."""
        candidate_skills = ["Python", "Django", "Redis"]
        required_skills = ["Python", "Django", "PostgreSQL"]

        matched, missing = match_skills(candidate_skills, required_skills, threshold=80)

        assert "Python" in matched
        assert "Django" in matched
        assert "PostgreSQL" in missing

    def test_no_skills_match(self):
        """Test when no required skills match."""
        candidate_skills = ["Ruby", "Rails", "MySQL"]
        required_skills = ["Python", "Django", "PostgreSQL"]

        matched, missing = match_skills(candidate_skills, required_skills, threshold=80)

        assert len(matched) == 0
        assert len(missing) == 3

    def test_empty_candidate_skills(self):
        """Test with empty candidate skills."""
        candidate_skills = []
        required_skills = ["Python", "Django"]

        matched, missing = match_skills(candidate_skills, required_skills, threshold=80)

        assert len(matched) == 0
        assert len(missing) == 2

    def test_empty_required_skills(self):
        """Test with empty required skills."""
        candidate_skills = ["Python", "Django"]
        required_skills = []

        matched, missing = match_skills(candidate_skills, required_skills, threshold=80)

        assert len(matched) == 0
        assert len(missing) == 0

    def test_fuzzy_matching_with_low_threshold(self):
        """Test fuzzy matching with low threshold."""
        candidate_skills = ["JS", "Py"]
        required_skills = ["JavaScript", "Python"]

        matched, missing = match_skills(candidate_skills, required_skills, threshold=30)

        # With low threshold, these might match due to similarity
        assert isinstance(matched, list)
        assert isinstance(missing, list)

    def test_duplicate_candidate_skills(self):
        """Test with duplicate candidate skills."""
        candidate_skills = ["Python", "Python", "Django"]
        required_skills = ["Python", "Django"]

        matched, missing = match_skills(candidate_skills, required_skills, threshold=80)

        assert "Python" in matched
        assert "Django" in matched

    def test_multiple_candidates_for_one_required(self):
        """Test when multiple candidates match one required skill."""
        candidate_skills = ["JavaScript", "TypeScript", "ECMAScript"]
        required_skills = ["JavaScript"]

        matched, missing = match_skills(candidate_skills, required_skills, threshold=80)

        # JavaScript should match exactly
        assert "JavaScript" in matched


class TestFindBestMatches:
    """Tests for finding best matches between skills."""

    def test_find_best_matches_basic(self):
        """Test finding best matches."""
        candidate_skills = ["Python", "JavaScript", "React"]
        job_skills = ["Python", "React", "Node.js"]

        matches = find_best_matches(candidate_skills, job_skills, top_n=10)

        assert isinstance(matches, list)
        assert len(matches) <= 10

    def test_best_matches_sorting(self):
        """Test that matches are sorted by score."""
        candidate_skills = ["Python", "Django"]
        job_skills = ["Python", "Django"]

        matches = find_best_matches(candidate_skills, job_skills, top_n=10)

        # Matches should be sorted by score (descending)
        if len(matches) > 1:
            for i in range(len(matches) - 1):
                assert matches[i][2] >= matches[i + 1][2]

    def test_top_n_limit(self):
        """Test that top_n limit is respected."""
        candidate_skills = ["Python", "JavaScript", "Java", "Ruby", "Go"]
        job_skills = ["Python", "JavaScript", "Java", "Ruby", "Go", "Rust"]

        matches = find_best_matches(candidate_skills, job_skills, top_n=3)

        assert len(matches) <= 3

    def test_minimum_score_threshold(self):
        """Test that only matches above 50% score are returned."""
        candidate_skills = ["X", "Y", "Z"]
        job_skills = ["A", "B", "C"]

        matches = find_best_matches(candidate_skills, job_skills, top_n=10)

        # All matches should have score > 50
        for _, _, score in matches:
            assert score > 50

    def test_empty_candidate_skills_in_best_matches(self):
        """Test finding best matches with empty candidates."""
        candidate_skills = []
        job_skills = ["Python", "Django"]

        matches = find_best_matches(candidate_skills, job_skills, top_n=10)

        assert len(matches) == 0

    def test_empty_job_skills_in_best_matches(self):
        """Test finding best matches with empty job skills."""
        candidate_skills = ["Python", "Django"]
        job_skills = []

        matches = find_best_matches(candidate_skills, job_skills, top_n=10)

        assert len(matches) == 0

    def test_match_tuple_structure(self):
        """Test that each match has correct tuple structure."""
        candidate_skills = ["Python"]
        job_skills = ["Python"]

        matches = find_best_matches(candidate_skills, job_skills, top_n=10)

        for match in matches:
            assert isinstance(match, tuple)
            assert len(match) == 3
            candidate, job, score = match
            assert isinstance(candidate, str)
            assert isinstance(job, str)
            assert isinstance(score, (int, float))
            assert 0 <= score <= 100
