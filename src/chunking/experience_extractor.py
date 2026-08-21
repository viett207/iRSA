"""Deterministic Experience Extractor for Vietnamese & English CVs (Rule & Regex-based, No LLM).

Segments the Experience section into individual typed `ExperienceEntry` objects:
- entry_id: Deterministic unique ID for each work experience fact.
- role: Extracted job title / position (or None if not found, with MISSING_ROLE diagnostic).
- company: Extracted employer / company name (or None if not found, with MISSING_COMPANY diagnostic).
- date range: Parsed via DateRangeParser (start_date, end_date, duration_months, is_current).
- evidence_block_ids: List of EvidenceBlock IDs strictly grounding this experience fact.
- responsibilities: Clean list of duty bullet points.
- technologies: Extracted technologies & frameworks used in this role.
- confidence: Explainable score based on extracted signals.
- metadata: Diagnostics and raw extracted headers.

Guarantees:
- Never fabricates missing fields (uses None + diagnostics).
- Fully supports Vietnamese diacritics and English job headers.
- Multi-line entry grouping and span grounding fidelity.
"""

import re
import unicodedata

from src.chunking.date_parser import DateRangeParser
from src.chunking.section_detector import SectionDetector
from src.chunking.text_chunker import TextChunker
from src.models.cv_fingerprint import ExperienceEntry
from src.models.evidence import CVSection, EvidenceBlock

# Common technology keywords to detect in experience descriptions
KNOWN_TECH_KEYWORDS = [
    "Python", "FastAPI", "Django", "Flask", "Java", "Spring Boot", "Spring Cloud", "Spring",
    "Hibernate", "PHP", "Laravel", "Symfony", "Yii", "JavaScript", "TypeScript", "React",
    "ReactJS", "Vue", "VueJS", "Angular", "Node.js", "NodeJS", "NestJS", "Express",
    "C++", "C#", ".NET", "Golang", "Go", "Rust", "Ruby", "Rails", "Scala", "Kotlin", "Swift",
    "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Oracle", "Cassandra",
    "Docker", "Kubernetes", "K8s", "AWS", "GCP", "Azure", "CI/CD", "GitHub Actions", "GitLab CI",
    "Jenkins", "Kafka", "RabbitMQ", "GraphQL", "RESTful API", "REST API", "Microservices",
    "Linux", "Git", "Postman", "Beautiful Soup", "Celery", "Airflow", "Pandas", "NumPy",
]

# Company prefix patterns in Vietnamese and English
COMPANY_PREFIXES = [
    r"công ty(?:\s+cổ phần|\s+tnhh|\s+cp|\s+mtv|\s+liên doanh)?",
    r"cty(?:\s+cổ phần|\s+tnhh|\s+cp)?",
    r"tập đoàn",
    r"doanh nghiệp",
    r"studio",
    r"lab",
    r"ngân hàng",
    r"bank",
    r"company",
    r"corporation",
    r"corp",
    r"inc",
    r"llc",
    r"jsc",
]


class ExperienceExtractor:
    """Extracts structured ExperienceEntry facts from CV evidence blocks."""

    def __init__(
        self,
        date_parser: DateRangeParser | None = None,
        detector: SectionDetector | None = None,
    ):
        self.date_parser = date_parser or DateRangeParser()
        self.detector = detector or SectionDetector()

    def extract_entries(
        self,
        raw_text: str,
        evidence_blocks: list[EvidenceBlock] | None = None,
        doc_id: str = "doc",
    ) -> list[ExperienceEntry]:
        """Extract all work experience entries from raw text or pre-chunked evidence blocks."""
        if not raw_text or not raw_text.strip():
            return []

        # 1. Obtain line-level evidence blocks
        if evidence_blocks is None:
            blocks = TextChunker.chunk_to_evidence_blocks(raw_text, detector=self.detector)
        else:
            blocks = evidence_blocks

        # 2. Filter for experience section blocks
        exp_blocks = [
            b for b in blocks
            if (b.section == CVSection.EXPERIENCE.value if isinstance(b.section, CVSection) else b.section == "experience")
            and (b.chunk_level == "line" or b.chunk_level == "sentence")
        ]

        # If no blocks marked as experience (e.g. section detection failed/unknown), fallback to scanning all line blocks
        if not exp_blocks:
            exp_blocks = [b for b in blocks if b.chunk_level == "line" or b.chunk_level == "sentence"]

        if not exp_blocks:
            return []

        # 3. Cluster blocks into discrete job entries
        clusters = self._cluster_experience_blocks(exp_blocks)

        # 4. Parse each cluster into an ExperienceEntry
        entries: list[ExperienceEntry] = []
        for idx, cluster in enumerate(clusters, start=1):
            entry = self._parse_cluster(cluster, idx=idx, doc_id=doc_id)
            if entry is not None:
                entries.append(entry)

        return entries

    def _cluster_experience_blocks(self, blocks: list[EvidenceBlock]) -> list[list[EvidenceBlock]]:
        """Cluster contiguous lines belonging to the same job position."""
        clusters: list[list[EvidenceBlock]] = []
        current_cluster: list[EvidenceBlock] = []

        for block in blocks:
            text = block.text.strip()
            # Ignore section headings themselves
            if block.metadata.get("is_heading") is True:
                continue

            if self._is_new_experience_header(text) and current_cluster:
                # Start new cluster
                clusters.append(current_cluster)
                current_cluster = [block]
            else:
                current_cluster.append(block)

        if current_cluster:
            clusters.append(current_cluster)

        return clusters

    def _is_new_experience_header(self, line: str) -> bool:
        """Heuristic to detect if a line starts a new job entry."""
        if not line:
            return False

        # Bullet lines never start a new company header
        if re.match(r"^[\-\*\+•\–]\s+", line):
            return False

        # 1. Starts with numbered item (e.g. "1. Công ty...", "2. VNG Corp...")
        if re.match(r"^\d+[\.\)]\s+(?:Công ty|Cty|Tập đoàn|At|Tại|[A-Za-zÀ-ỹ])", line, re.IGNORECASE):
            return True

        # 2. Contains company label
        if re.search(r"^(?:Công ty|Cty|Doanh nghiệp|Tập đoàn|Company|Employer)\s*[:\-–]", line, re.IGNORECASE):
            return True

        # 3. Starts with company keywords and contains a date or parentheses
        for p in COMPANY_PREFIXES:
            if re.search(rf"\b{p}\b", line, re.IGNORECASE) and (
                "(" in line or "-" in line or "–" in line or self.date_parser.parse(line) is not None
            ):
                return True

        # 4. Contains a date range on the line itself (e.g. "(06/2022 - 06/2024)" or "01/2022 - 12/2023")
        dr = self.date_parser.parse(line)
        if dr is not None and (dr.precision == "month" or dr.duration_months and dr.duration_months > 1):
            # If line has date range AND not just a bullet point
            return True

        return False

    def _parse_cluster(self, cluster: list[EvidenceBlock], idx: int, doc_id: str) -> ExperienceEntry | None:
        """Parse a cluster of EvidenceBlocks into a structured ExperienceEntry."""
        if not cluster:
            return None

        full_cluster_text = "\n".join(b.text.strip() for b in cluster)
        evidence_ids = [b.block_id for b in cluster]

        # 1. Deterministic entry_id
        entry_id = f"exp_{doc_id}_{idx:02d}"

        # 2. Extract Date Range
        dr = self.date_parser.parse(full_cluster_text)
        start_date: str | None = None
        end_date: str | None = None
        duration_months: int | None = None
        is_current = False

        if dr is not None:
            start_date = dr.start.iso_str
            end_date = dr.end.iso_str
            duration_months = dr.duration_months
            is_current = dr.end.is_present

        # 3. Extract Role and Company
        company = self._extract_company(cluster)
        role = self._extract_role(cluster)

        # 4. Extract Responsibilities (bullet lines)
        responsibilities = self._extract_responsibilities(cluster)

        # 5. Extract Technologies
        technologies = self._extract_technologies(full_cluster_text)

        # 6. Calculate Confidence and Diagnostics
        diagnostics: list[str] = []
        score = 0.0

        if company:
            score += 0.35
        else:
            diagnostics.append("MISSING_COMPANY")

        if role:
            score += 0.35
        else:
            diagnostics.append("MISSING_ROLE")

        if dr is not None:
            score += 0.25
        else:
            diagnostics.append("MISSING_DATE_RANGE")

        if responsibilities:
            score += 0.05

        confidence = round(min(1.0, max(0.20, score)), 2)

        return ExperienceEntry(
            entry_id=entry_id,
            company=company,
            role=role,
            start_date=start_date,
            end_date=end_date,
            duration_months=duration_months,
            is_current=is_current,
            responsibilities=responsibilities,
            technologies=technologies,
            confidence=confidence,
            evidence_block_ids=evidence_ids,
            metadata={
                "diagnostics": diagnostics,
                "lines_count": len(cluster),
                "has_date_range": dr is not None,
            },
        )

    def _extract_company(self, cluster: list[EvidenceBlock]) -> str | None:
        """Extract employer or company name from cluster lines without fabrication."""
        for block in cluster:
            line = block.text.strip()

            # Rule A: Explicit label "Công ty: ABC" or "Company: ABC"
            m_label = re.search(
                r"(?:Công ty|Cty|Doanh nghiệp|Tập đoàn|Company|Employer)\s*[:\-–]\s*([^\n\(\)\|]+)",
                line,
                re.IGNORECASE,
            )
            if m_label:
                comp = m_label.group(1).strip(" .:,;()[]")
                if comp:
                    return self._clean_company_name(comp)

            # Rule B: Line starting with Company prefix
            # e.g. "Công ty Cổ phần Giải pháp Công nghệ ABC (06/2022 - 06/2024)"
            # or "1. Công ty TNHH Phần mềm Công nghệ FPT (01/2022 - 12/2023)"
            clean_line = re.sub(r"^\d+[\.\)]\s+", "", line)
            clean_line = re.sub(r"^(?:Tại|At)\s+", "", clean_line, flags=re.IGNORECASE)

            for p in COMPANY_PREFIXES:
                if re.search(rf"\b{p}\b", clean_line, re.IGNORECASE):
                    # Remove date parts, parentheses, and trailing role
                    comp = re.split(r"[\(\[\:\,\|]|\s+-\s+\d|\s+–\s+\d", clean_line)[0].strip()
                    if comp and len(comp) > 3:
                        return self._clean_company_name(comp)

        return None

    def _extract_role(self, cluster: list[EvidenceBlock]) -> str | None:
        """Extract job title / role held from cluster lines without fabrication."""
        for block in cluster:
            line = block.text.strip()

            # Rule A: Explicit label "Vị trí: Lập trình viên Backend" or "Role: Senior Dev"
            m_label = re.search(
                r"(?:Vị trí|Chức danh|Chức vụ|Vai trò|Role|Title|Position|Job title)\s*[:\-–]\s*([^\n\(\)\|]+)",
                line,
                re.IGNORECASE,
            )
            if m_label:
                role = m_label.group(1).strip(" .:,;()[]")
                if role:
                    return self._clean_role_name(role)

            # Rule B: Line containing common engineering job titles
            # e.g. "Python Software Engineer", "Backend Developer PHP"
            # Exclude lines that are clearly company names or bullets
            if not re.match(r"^[\-\*\+•\–]\s+", line) and not re.search(r"\b(?:Công ty|Cty|Tập đoàn)\b", line, re.IGNORECASE):
                role_match = re.search(
                    r"\b(?:Senior|Junior|Lead|Principal|Staff|Intern|Fresher|Thực tập sinh|Trưởng nhóm|Kiến trúc sư|Kỹ sư|Lập trình viên|Chuyên viên)?"
                    r"\s*(?:Python|Java|PHP|Frontend|Backend|Fullstack|DevOps|Cloud|Data|AI|ML|Software|QA|QC)?"
                    r"\s*(?:Developer|Engineer|Architect|Programmer|Consultant|Manager|Specialist|Lập trình viên|Kỹ sư|Chuyên viên|Kiến trúc sư)\b[^\n\(\)\|]*",
                    line,
                    re.IGNORECASE,
                )
                if role_match:
                    r_text = role_match.group(0).strip(" .:,;()[]")
                    if len(r_text) > 3:
                        return self._clean_role_name(r_text)

        return None

    def _extract_responsibilities(self, cluster: list[EvidenceBlock]) -> list[str]:
        """Extract duty bullet points from cluster lines."""
        responsibilities: list[str] = []
        for block in cluster:
            line = block.text.strip()
            # Bullet point match
            m_bullet = re.match(r"^[\-\*\+•\–]\s*(.+)$", line)
            if m_bullet:
                resp = m_bullet.group(1).strip()
                if resp:
                    responsibilities.append(resp)

        return responsibilities

    def _extract_technologies(self, text: str) -> list[str]:
        """Detect technologies and frameworks mentioned in text."""
        found: list[str] = []
        text_lower = text.lower()

        for tech in KNOWN_TECH_KEYWORDS:
            # Word boundary regex search
            escaped = re.escape(tech.lower())
            if re.search(rf"\b{escaped}\b", text_lower):
                found.append(tech)

        return found

    def _clean_company_name(self, name: str) -> str:
        """Normalize company name string."""
        name = unicodedata.normalize("NFC", name).strip()
        # Remove trailing dashes or dates
        name = re.sub(r"\s*[\-\–]\s*\d+.*$", "", name)
        return name.strip(" .:,;()[]-–—")

    def _clean_role_name(self, role: str) -> str:
        """Normalize job role name string."""
        role = unicodedata.normalize("NFC", role).strip()
        return role.strip(" .:,;()[]-–—")


# Global default instance
_default_extractor = ExperienceExtractor()


def extract_experience_entries(
    raw_text: str,
    evidence_blocks: list[EvidenceBlock] | None = None,
    doc_id: str = "doc",
) -> list[ExperienceEntry]:
    """Convenience function to extract experience entries from CV text or evidence blocks."""
    return _default_extractor.extract_entries(raw_text, evidence_blocks=evidence_blocks, doc_id=doc_id)

