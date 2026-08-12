"""Unit tests for Vietnamese NLP processor - isolated version."""

import re


def extract_phone_numbers(text: str) -> list[str]:
    """Extract Vietnamese phone numbers from text."""
    patterns = [
        r"\+84\s*\d{9,10}",
        r"0[3578]\d{8}",
        r"0[9]\d{8}",
        r"\(\+84\)\s*\d{9,10}",
    ]

    phones = []
    for pattern in patterns:
        matches = re.findall(pattern, text.replace(" ", "").replace("-", ""))
        phones.extend(matches)

    normalized = []
    for phone in phones:
        clean = re.sub(r"[^\d+]", "", phone)
        if clean not in normalized:
            normalized.append(clean)

    return normalized[:3]


def extract_emails(text: str) -> list[str]:
    """Extract email addresses from text."""
    pattern = r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}"
    emails = re.findall(pattern, text.lower())
    return list(set(emails))[:3]


def extract_skills_from_text(text: str, known_skills: list[str]) -> list[str]:
    """Extract skills from text by matching against known skill list."""
    text_lower = text.lower()
    found_skills = []

    for skill in known_skills:
        pattern = r"\b" + re.escape(skill.lower()) + r"\b"
        if re.search(pattern, text_lower):
            found_skills.append(skill)

    return found_skills


class TestExtractPhoneNumbers:
    """Tests for phone number extraction."""

    def test_extract_09x_format(self):
        """Test extraction of 09x format."""
        text = "Phone: 0912345678"
        phones = extract_phone_numbers(text)

        assert len(phones) > 0
        assert "0912345678" in phones

    def test_extract_08x_format(self):
        """Test extraction of 08x format."""
        text = "Contact: 0812345678"
        phones = extract_phone_numbers(text)

        assert len(phones) > 0
        assert "0812345678" in phones

    def test_extract_with_country_code(self):
        """Test extraction with +84."""
        text = "+84912345678"
        phones = extract_phone_numbers(text)

        assert len(phones) > 0

    def test_max_three_phones(self):
        """Test max 3 phones returned."""
        text = "0912345678 0812345678 0712345678 0512345678 0312345678"
        phones = extract_phone_numbers(text)

        assert len(phones) <= 3

    def test_no_duplicate_phones(self):
        """Test no duplicates."""
        text = "0912345678 0912345678 0912345678"
        phones = extract_phone_numbers(text)

        assert len(phones) == 1


class TestExtractEmails:
    """Tests for email extraction."""

    def test_extract_single_email(self):
        """Test single email extraction."""
        text = "contact: john@example.com"
        emails = extract_emails(text)

        assert len(emails) > 0
        assert "john@example.com" in emails

    def test_extract_multiple_emails(self):
        """Test multiple emails."""
        text = "john@example.com or jane@test.org"
        emails = extract_emails(text)

        assert len(emails) >= 2

    def test_email_case_insensitive(self):
        """Test case insensitivity."""
        text = "John@Example.COM"
        emails = extract_emails(text)

        assert len(emails) > 0
        assert "john@example.com" in emails

    def test_max_three_emails(self):
        """Test max 3 emails."""
        text = "a@t.com b@t.com c@t.com d@t.com e@t.com"
        emails = extract_emails(text)

        assert len(emails) <= 3

    def test_no_duplicate_emails(self):
        """Test no duplicates."""
        text = "john@example.com john@example.com john@example.com"
        emails = extract_emails(text)

        assert len(emails) == 1
        assert "john@example.com" in emails

    def test_invalid_email_format(self):
        """Test that invalid emails are not extracted."""
        text = "test@.com @example.com"
        emails = extract_emails(text)

        assert len(emails) == 0


class TestExtractSkills:
    """Tests for skill extraction."""

    def test_extract_single_skill(self):
        """Test single skill."""
        text = "experienced with Python"
        skills = extract_skills_from_text(text, ["Python"])

        assert "Python" in skills

    def test_extract_multiple_skills(self):
        """Test multiple skills."""
        text = "Python, JavaScript, Java"
        skills = extract_skills_from_text(
            text,
            ["Python", "JavaScript", "Java"]
        )

        assert "Python" in skills
        assert "JavaScript" in skills
        assert "Java" in skills

    def test_case_insensitive(self):
        """Test case insensitivity."""
        text = "python and django"
        skills = extract_skills_from_text(text, ["Python", "Django"])

        assert "Python" in skills
        assert "Django" in skills

    def test_word_boundary_matching(self):
        """Test word boundaries."""
        text = "reacting and storing"
        skills = extract_skills_from_text(text, ["React", "Store"])

        # Should not match partial words
        assert "React" not in skills
        assert "Store" not in skills

    def test_no_match_unlisted_skills(self):
        """Test unlisted skills not extracted."""
        text = "Expert in CustomFramework"
        skills = extract_skills_from_text(text, ["Python"])

        assert "CustomFramework" not in skills
        assert len(skills) == 0

    def test_empty_known_skills(self):
        """Test with empty skill list."""
        text = "Python and Django"
        skills = extract_skills_from_text(text, [])

        assert len(skills) == 0

    def test_empty_text(self):
        """Test with empty text."""
        text = ""
        skills = extract_skills_from_text(text, ["Python"])

        assert len(skills) == 0
