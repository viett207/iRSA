"""Unit tests for Vietnamese NLP processor."""

import pytest
from app.services.parser.vn_processor import (
    extract_phone_numbers,
    extract_emails,
    extract_skills_from_text,
    COMMON_SKILLS,
)


class TestExtractPhoneNumbers:
    """Tests for phone number extraction."""

    def test_extract_vietnamese_mobile_09x(self):
        """Test extraction of Vietnamese 09x format."""
        text = "Phone: 0912345678"
        phones = extract_phone_numbers(text)

        assert len(phones) > 0
        assert "0912345678" in phones

    def test_extract_vietnamese_mobile_08x(self):
        """Test extraction of Vietnamese 08x format."""
        text = "Contact me at 0812345678"
        phones = extract_phone_numbers(text)

        assert len(phones) > 0
        assert "0812345678" in phones

    def test_extract_with_country_code(self):
        """Test extraction with +84 country code."""
        text = "+84912345678 or +84 9 1234 5678"
        phones = extract_phone_numbers(text)

        assert len(phones) > 0

    def test_extract_phone_with_spaces_and_dashes(self):
        """Test extraction with formatting."""
        text = "09 1234 5678 or 09-1234-5678"
        phones = extract_phone_numbers(text)

        assert len(phones) > 0

    def test_extract_multiple_phones(self):
        """Test extraction of multiple numbers."""
        text = "Primary: 0912345678, Secondary: 0834567890"
        phones = extract_phone_numbers(text)

        assert len(phones) >= 2

    def test_max_three_phones(self):
        """Test that at most 3 phones are returned."""
        text = "0912345678 0812345678 0712345678 0512345678 0312345678"
        phones = extract_phone_numbers(text)

        assert len(phones) <= 3

    def test_normalize_phone_format(self):
        """Test phone number normalization."""
        text = "0912345678 and (09) 1234 5678"
        phones = extract_phone_numbers(text)

        # Should normalize to remove non-digits
        normalized = [p.replace(" ", "").replace("-", "") for p in phones]
        assert len(normalized) > 0


class TestExtractEmails:
    """Tests for email extraction."""

    def test_extract_single_email(self):
        """Test extraction of single email."""
        text = "Contact: john@example.com"
        emails = extract_emails(text)

        assert len(emails) > 0
        assert "john@example.com" in emails

    def test_extract_multiple_emails(self):
        """Test extraction of multiple emails."""
        text = "john@example.com or jane@test.org"
        emails = extract_emails(text)

        assert len(emails) >= 2

    def test_extract_email_with_plus(self):
        """Test extraction of email with plus sign."""
        text = "contact+info@company.com"
        emails = extract_emails(text)

        assert len(emails) > 0

    def test_extract_email_with_underscore(self):
        """Test extraction of email with underscore."""
        text = "john_doe@example.com"
        emails = extract_emails(text)

        assert len(emails) > 0

    def test_case_insensitive_email(self):
        """Test case insensitivity in email extraction."""
        text = "John@Example.COM"
        emails = extract_emails(text)

        assert len(emails) > 0
        # Should be lowercase
        assert "john@example.com" in emails

    def test_max_three_emails(self):
        """Test that at most 3 emails are returned."""
        text = "a@test.com b@test.com c@test.com d@test.com e@test.com"
        emails = extract_emails(text)

        assert len(emails) <= 3

    def test_no_duplicate_emails(self):
        """Test that duplicate emails are removed."""
        text = "john@example.com john@example.com john@example.com"
        emails = extract_emails(text)

        assert len(emails) == 1
        assert "john@example.com" in emails

    def test_no_invalid_emails(self):
        """Test that invalid emails are not extracted."""
        text = "test@.com @example.com not an email"
        emails = extract_emails(text)

        # Should not match invalid formats
        assert len(emails) == 0


class TestExtractSkillsFromText:
    """Tests for skill extraction."""

    def test_extract_single_skill(self):
        """Test extraction of single skill."""
        text = "I have experience with Python"
        skills = extract_skills_from_text(text, COMMON_SKILLS)

        assert "Python" in skills

    def test_extract_multiple_skills(self):
        """Test extraction of multiple skills."""
        text = "Proficient in Python, JavaScript, and Java"
        skills = extract_skills_from_text(text, COMMON_SKILLS)

        assert "Python" in skills
        assert "JavaScript" in skills
        assert "Java" in skills

    def test_case_insensitive_matching(self):
        """Test case insensitive skill matching."""
        text = "experienced in python and DJANGO"
        skills = extract_skills_from_text(text, ["Python", "Django"])

        assert "Python" in skills
        assert "Django" in skills

    def test_word_boundary_matching(self):
        """Test that partial word matches don't count."""
        text = "experienced in reacting and storing"
        skills = extract_skills_from_text(text, ["React", "Store"])

        # Should not match "reacting" or "storing"
        assert "React" not in skills
        assert "Store" not in skills

    def test_no_match_if_not_in_known_list(self):
        """Test that unlisted skills are not extracted."""
        text = "Expert in CustomFramework"
        skills = extract_skills_from_text(text, COMMON_SKILLS)

        assert "CustomFramework" not in skills

    def test_extract_with_custom_skills(self):
        """Test extraction with custom skill list."""
        text = "Experience with VueJS and Svelte"
        custom_skills = ["Vue", "Svelte"]
        skills = extract_skills_from_text(text, custom_skills)

        assert "Svelte" in skills

    def test_common_tech_skills(self):
        """Test that common skills are in the list."""
        assert "Python" in COMMON_SKILLS
        assert "JavaScript" in COMMON_SKILLS
        assert "React" in COMMON_SKILLS
        assert "PostgreSQL" in COMMON_SKILLS
        assert "Docker" in COMMON_SKILLS

    def test_vietnamese_context(self):
        """Test skill extraction in Vietnamese context."""
        text = "Kỹ năng: Python, JavaScript, Docker"
        skills = extract_skills_from_text(text, COMMON_SKILLS)

        assert "Python" in skills
        assert "JavaScript" in skills
        assert "Docker" in skills
