"""Deterministic Skill Attachment & Grounding Engine for CV Analysis.

Binds each SkillMention to the enclosing ExperienceEntry or ProjectEntry based on:
1. Block ownership (shared EvidenceBlock IDs).
2. Span containment (character offset containment within entry bounding spans).

Guarantees & Constraints:
- Strict evidence preservation: every attachment retains evidence_id.
- Anti-pollution: skills originating from the Skills section are NEVER attached to Experience entries.
- Unresolved marking: skill mentions with section=unknown are strictly marked as unresolved.
- Supports both Vietnamese diacritics and English CV structures.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from src.chunking.section_detector import SectionDetector
from src.chunking.text_chunker import TextChunker
from src.models.cv_fingerprint import (
    CVFingerprint,
    ExperienceEntry,
    ProjectEntry,
    SkillAttachment,
    SkillAttachmentStatus,
    SkillMention,
)
from src.models.evidence import ChunkLevel, CVSection, EvidenceBlock

logger = logging.getLogger(__name__)

# Standard skill keyword normalization dictionary
CANONICAL_SKILL_MAP: dict[str, str] = {
    "python": "Python",
    "fastapi": "FastAPI",
    "django": "Django",
    "flask": "Flask",
    "docker": "Docker",
    "kubernetes": "Kubernetes",
    "k8s": "Kubernetes",
    "postgresql": "PostgreSQL",
    "postgres": "PostgreSQL",
    "mysql": "MySQL",
    "redis": "Redis",
    "mongodb": "MongoDB",
    "mongo": "MongoDB",
    "aws": "AWS",
    "gcp": "GCP",
    "azure": "Azure",
    "kafka": "Kafka",
    "rabbitmq": "RabbitMQ",
    "react": "React",
    "reactjs": "React",
    "react.js": "React",
    "vue": "Vue",
    "vuejs": "Vue",
    "vue.js": "Vue",
    "angular": "Angular",
    "angularjs": "Angular",
    "nodejs": "Node.js",
    "node.js": "Node.js",
    "nestjs": "NestJS",
    "express": "Express",
    "express.js": "Express",
    "java": "Java",
    "spring": "Spring",
    "spring boot": "Spring Boot",
    "spring cloud": "Spring Cloud",
    "hibernate": "Hibernate",
    "php": "PHP",
    "laravel": "Laravel",
    "symfony": "Symfony",
    "golang": "Golang",
    "go": "Golang",
    "rust": "Rust",
    "c++": "C++",
    "c#": "C#",
    "c": "C",
    "r": "R",
    "rstudio": "R",
    "r studio": "R",
    "swift": "Swift",

    "kotlin": "Kotlin",
    "scala": "Scala",
    ".net": ".NET",
    "dotnet": ".NET",
    "typescript": "TypeScript",
    "javascript": "JavaScript",
    "js": "JavaScript",
    "ts": "TypeScript",
    "git": "Git",
    "github actions": "GitHub Actions",
    "gitlab ci": "GitLab CI",
    "jenkins": "Jenkins",
    "ci/cd": "CI/CD",
    "linux": "Linux",
    "elasticsearch": "Elasticsearch",
    "graphql": "GraphQL",
    "restful api": "RESTful API",
    "rest api": "REST API",
    "rest": "REST API",
    "microservices": "Microservices",
    "pandas": "Pandas",
    "numpy": "NumPy",
    "scikit-learn": "Scikit-Learn",
    "tensorflow": "TensorFlow",
    "pytorch": "PyTorch",
    "airflow": "Airflow",
    "celery": "Celery",
    "spark": "Spark",
    "hadoop": "Hadoop",
    "html": "HTML",
    "css": "CSS",
    "tailwind": "Tailwind CSS",
    "bootstrap": "Bootstrap",
}

# Domain categorization map
SKILL_CATEGORY_MAP: dict[str, str] = {
    "Python": "backend",
    "FastAPI": "backend",
    "Django": "backend",
    "Flask": "backend",
    "Java": "backend",
    "Spring Boot": "backend",
    "Spring": "backend",
    "PHP": "backend",
    "Laravel": "backend",
    "Golang": "backend",
    "Rust": "backend",
    "Node.js": "backend",
    "NestJS": "backend",
    "Express": "backend",
    ".NET": "backend",
    "C#": "backend",
    "C++": "backend",
    "C": "backend",
    "R": "data_science",
    "Swift": "mobile",
    "Kotlin": "mobile",
    "Scala": "backend",
    "React": "frontend",
    "Vue": "frontend",
    "Angular": "frontend",
    "TypeScript": "frontend",
    "JavaScript": "frontend",
    "HTML": "frontend",
    "CSS": "frontend",
    "Tailwind CSS": "frontend",
    "Bootstrap": "frontend",
    "PostgreSQL": "database",
    "MySQL": "database",
    "MongoDB": "database",
    "Redis": "database",
    "Elasticsearch": "database",
    "Docker": "devops",
    "Kubernetes": "devops",
    "AWS": "cloud",
    "GCP": "cloud",
    "Azure": "cloud",
    "CI/CD": "devops",
    "GitHub Actions": "devops",
    "GitLab CI": "devops",
    "Jenkins": "devops",
    "Linux": "devops",
    "Git": "tools",
    "Kafka": "backend",
    "RabbitMQ": "backend",
    "RESTful API": "backend",
    "REST API": "backend",
    "Microservices": "architecture",
    "Pandas": "data_science",
    "NumPy": "data_science",
    "Scikit-Learn": "data_science",
    "PyTorch": "ai_ml",
    "TensorFlow": "ai_ml",
}

# ==============================================================================
# SHORT / AMBIGUOUS SKILL DISAMBIGUATION ENGINE (4-Tier Defense)
# ==============================================================================

# Skills that are ambiguous due to short length or collision with common words.
# These require contextual validation before being accepted as a skill match.
AMBIGUOUS_SKILLS: set[str] = {"C", "R", "Golang"}  # Golang because "go" matches English verb

# Tier 1: Compound patterns — high-confidence contextual patterns (confidence = 0.95)
# These patterns are checked BEFORE standalone regex to capture strong signals.
COMPOUND_PATTERNS: dict[str, list[re.Pattern]] = {
    "C": [
        re.compile(r"\bC\s*/\s*C\+\+", re.IGNORECASE),            # "C/C++"
        re.compile(r"\bC\+\+\s*/\s*C\b", re.IGNORECASE),           # "C++/C"
        re.compile(r"\blập trình\s+C\b", re.IGNORECASE),            # "lập trình C"
        re.compile(r"\bngôn ngữ\s+C\b", re.IGNORECASE),             # "ngôn ngữ C"
        re.compile(r"\bC\s+programming\b", re.IGNORECASE),           # "C programming"
        re.compile(r"\bC\s+language\b", re.IGNORECASE),              # "C language"
        re.compile(r"\b(?:ANSI|ISO|GNU|Standard)\s+C\b"),            # "ANSI C", "GNU C" (case-sensitive)
        re.compile(r"\bC(?:89|90|95|99|11|17|18|23)\b"),             # "C99", "C11", "C17"
    ],
    "R": [
        re.compile(r"\bR\s+programming\b", re.IGNORECASE),           # "R programming"
        re.compile(r"\blập trình\s+R\b", re.IGNORECASE),             # "lập trình R"
        re.compile(r"\bR\s*Studio\b", re.IGNORECASE),                # "R Studio" / "RStudio"
        re.compile(r"\bRStudio\b", re.IGNORECASE),                   # "RStudio"
        re.compile(r"\bR\s+Shiny\b", re.IGNORECASE),                 # "R Shiny"
        re.compile(r"\bggplot2?\b", re.IGNORECASE),                  # ggplot -> R ecosystem
        re.compile(r"\btidyverse\b", re.IGNORECASE),                 # tidyverse -> R ecosystem
        re.compile(r"\bdplyr\b", re.IGNORECASE),                     # dplyr -> R ecosystem
        re.compile(r"\bCRAN\b"),                                     # CRAN package repo
        re.compile(r"\bngôn ngữ\s+R\b", re.IGNORECASE),             # "ngôn ngữ R"
    ],
    "Golang": [
        re.compile(r"\bGo(?:lang)?\s+(?:developer|engineer|programming|lập trình)\b", re.IGNORECASE),
        re.compile(r"\blập trình\s+Go(?:lang)?\b", re.IGNORECASE),   # "lập trình Go"
        re.compile(r"\bgoroutines?\b", re.IGNORECASE),               # Go-specific
        re.compile(r"\bgofmt\b", re.IGNORECASE),                     # Go tool
        re.compile(r"\bgo\s+mod(?:ule)?\b", re.IGNORECASE),          # "go mod"
        re.compile(r"\bGo\s*/\s*Golang\b", re.IGNORECASE),           # "Go/Golang"
        re.compile(r"\bgin\s+framework\b", re.IGNORECASE),           # Gin framework (Go)
        re.compile(r"\becho\s+framework\b", re.IGNORECASE),          # Echo framework (Go)
        re.compile(r"\bngôn ngữ\s+Go\b", re.IGNORECASE),            # "ngôn ngữ Go"
    ],
}

# Tier 2: Positive context signals — keywords near (±50 chars) the match that confirm tech intent
TECH_CONTEXT_POSITIVE_SIGNALS: list[re.Pattern] = [
    re.compile(r"\b(?:lập trình|programming|language|ngôn ngữ)\b", re.IGNORECASE),
    re.compile(r"\b(?:framework|library|thư viện|SDK|API|package|packages|repo|repository)\b", re.IGNORECASE),
    re.compile(r"\b(?:compiler|IDE|biên dịch|debug|compile|RStudio|CRAN|ggplot|Shiny)\b", re.IGNORECASE),
    re.compile(r"\b(?:kỹ năng|skills?|technical|stack|tools?|công nghệ|technology|tech)\b", re.IGNORECASE),
    re.compile(r"\b(?:developer|engineer|lập trình viên|kỹ sư|programmer|coder)\b", re.IGNORECASE),
    re.compile(r"\b(?:backend|frontend|fullstack|full-stack|devops|data|database|hệ thống|system)\b", re.IGNORECASE),
    re.compile(r"\b(?:code|coding|develop|phát triển|xây dựng|implement|sử dụng|using|with|bằng|và|and|goroutines?|gRPC|gofmt|protobuf)\b", re.IGNORECASE),

    # Skill list separator: "Python, C, Java" or "C/C++" or "C & C++"
    re.compile(r"[,/|&+]", re.IGNORECASE),
]


# Tier 2: Negative context signals — phrases near the match that indicate NON-tech meaning
TECH_CONTEXT_NEGATIVE_PATTERNS: dict[str, list[re.Pattern]] = {
    "C": [
        re.compile(r"\b(?:grade|vitamin|type|class|level|group|category|series|round|section|part|article|phần|mục|phụ lục)\s+C\b", re.IGNORECASE),
        re.compile(r"\bhạng\s+C\b", re.IGNORECASE),
        re.compile(r"\bloại\s+C\b", re.IGNORECASE),
        re.compile(r"\bnhóm\s+C\b", re.IGNORECASE),
        re.compile(r"\bbằng\s+C\b", re.IGNORECASE),
        re.compile(r"\bgiấy phép(?:\s+lái xe)?\s+(?:hạng\s+|loại\s+)?C\b", re.IGNORECASE),
        re.compile(r"\blái xe\s+(?:hạng\s+|loại\s+)?C\b", re.IGNORECASE),
        re.compile(r"\bcấp\s+C\b", re.IGNORECASE),
        re.compile(r"\btrình độ\s+C\b", re.IGNORECASE),
        re.compile(r"\btiêu chuẩn\s+C\b", re.IGNORECASE),
        re.compile(r"\bhepat(?:itis|it)\s+C\b", re.IGNORECASE),
    ],
    "R": [
        re.compile(r"\b(?:appendix|section|part|article|regulation|form|schedule|chapter|phụ lục|mục|phần|điều)\s+R\b", re.IGNORECASE),
        re.compile(r"\bnhóm\s+R\b", re.IGNORECASE),
        re.compile(r"\bloại\s+R\b", re.IGNORECASE),
        re.compile(r"\bhạng\s+R\b", re.IGNORECASE),
        re.compile(r"\bphần\s+R\b", re.IGNORECASE),
    ],
    "Golang": [
        re.compile(r"\bgo\s+to\s+market\b", re.IGNORECASE),
        re.compile(r"\bgo-to-market\b", re.IGNORECASE),
        re.compile(r"\bgo-no-go\b", re.IGNORECASE),
        re.compile(r"\bgo\s+no\s+go\b", re.IGNORECASE),
        re.compile(r"\bgo\s+to\b", re.IGNORECASE),
        re.compile(r"\bgo\s+for\b", re.IGNORECASE),
        re.compile(r"\bgo\s+ahead\b", re.IGNORECASE),
        re.compile(r"\blet'?s\s+go\b", re.IGNORECASE),
        re.compile(r"\bready\s+to\s+go\b", re.IGNORECASE),
        re.compile(r"\bgo-to\b", re.IGNORECASE),
        re.compile(r"\bon\s+the\s+go\b", re.IGNORECASE),
        re.compile(r"\bgo\s+back\b", re.IGNORECASE),
        re.compile(r"\bgo\s+through\b", re.IGNORECASE),
        re.compile(r"\bgo\s+over\b", re.IGNORECASE),
        re.compile(r"\bgo\s+with\b", re.IGNORECASE),
        re.compile(r"\bgo\s+into\b", re.IGNORECASE),
        re.compile(r"\bgo\s+beyond\b", re.IGNORECASE),
        re.compile(r"\bgo\s+live\b", re.IGNORECASE),
    ],
}


# Tier 3: Section-weighted confidence multipliers for ambiguous skills
SECTION_CONFIDENCE_WEIGHTS: dict[str, float] = {
    "skills": 1.00,
    "experience": 0.95,
    "projects": 0.95,
    "education": 0.85,
    "summary": 0.80,
    "certifications": 0.85,
    "awards": 0.70,
    "unknown": 0.60,
}

# Context extraction radius (characters on each side of match)
CONTEXT_RADIUS: int = 60


def _is_ambiguous_skill(canonical_name: str) -> bool:
    """Check if a canonical skill name requires contextual disambiguation."""
    return canonical_name in AMBIGUOUS_SKILLS


def _check_compound_patterns(canonical_name: str, full_text: str) -> list[tuple[int, int]]:
    """Scan full text for compound patterns that strongly confirm a short/ambiguous skill.

    Returns list of (start, end) spans where compound matches were found.
    """
    patterns = COMPOUND_PATTERNS.get(canonical_name, [])
    spans = []
    for pat in patterns:
        for m in pat.finditer(full_text):
            spans.append((m.start(), m.end()))
    return spans


def _has_negative_context(canonical_name: str, text: str, match_start: int, match_end: int) -> bool:
    """Check if the surrounding context contains negative signals that indicate non-tech meaning.

    Examines a window of ±CONTEXT_RADIUS characters around the match.
    """
    neg_patterns = TECH_CONTEXT_NEGATIVE_PATTERNS.get(canonical_name, [])
    if not neg_patterns:
        return False

    ctx_start = max(0, match_start - CONTEXT_RADIUS)
    ctx_end = min(len(text), match_end + CONTEXT_RADIUS)
    context = text[ctx_start:ctx_end]

    for pat in neg_patterns:
        if pat.search(context):
            return True
    return False


def _has_positive_context(text: str, match_start: int, match_end: int) -> bool:
    """Check if surrounding context contains positive tech signals (±CONTEXT_RADIUS chars)."""
    ctx_start = max(0, match_start - CONTEXT_RADIUS)
    ctx_end = min(len(text), match_end + CONTEXT_RADIUS)
    context = text[ctx_start:ctx_end]

    for pat in TECH_CONTEXT_POSITIVE_SIGNALS:
        if pat.search(context):
            return True
    return False


def _get_section_confidence_weight(section: str) -> float:
    """Get section-weighted confidence multiplier for ambiguous skills."""
    return SECTION_CONFIDENCE_WEIGHTS.get(section.lower(), 0.60)



class SkillBinder:
    """Binds candidate skill mentions to specific ExperienceEntry or ProjectEntry facts."""

    def __init__(self, detector: SectionDetector | None = None):
        self.detector = detector or SectionDetector()

    def bind_skill_mention(
        self,
        mention: SkillMention,
        experience_entries: list[ExperienceEntry] | None = None,
        project_entries: list[ProjectEntry] | None = None,
        evidence_map: dict[str, EvidenceBlock] | None = None,
    ) -> list[SkillAttachment]:
        """Bind a single SkillMention to matching experience or project entries.

        Evaluates every grounding EvidenceBlock ID in the mention:
        1. section == UNKNOWN -> Mark as UNRESOLVED.
        2. section == SKILLS -> Mark as SKILLS_SECTION (NEVER attach to Experience).
        3. Match by Block Ownership (block ID in entry.evidence_block_ids).
        4. Match by Span Containment (char span inside entry's bounding range).
        5. Preserves evidence_id on all created SkillAttachment instances.
        """
        exp_entries = experience_entries or []
        proj_entries = project_entries or []
        ev_map = evidence_map or {}

        # Pre-compute entry bounding spans
        exp_spans: list[tuple[ExperienceEntry, int | None, int | None]] = []
        for exp in exp_entries:
            e_blocks = [ev_map[b_id] for b_id in exp.evidence_block_ids if b_id in ev_map]
            if e_blocks:
                min_s = min(b.char_start for b in e_blocks)
                max_e = max(b.char_end for b in e_blocks)
                exp_spans.append((exp, min_s, max_e))
            else:
                exp_spans.append((exp, None, None))

        proj_spans: list[tuple[ProjectEntry, int | None, int | None]] = []
        for proj in proj_entries:
            p_blocks = [ev_map[b_id] for b_id in proj.evidence_block_ids if b_id in ev_map]
            if p_blocks:
                min_s = min(b.char_start for b in p_blocks)
                max_e = max(b.char_end for b in p_blocks)
                proj_spans.append((proj, min_s, max_e))
            else:
                proj_spans.append((proj, None, None))

        attachments: list[SkillAttachment] = []

        # Iterate over all grounding evidence block IDs
        block_ids = mention.evidence_block_ids or []
        if not block_ids:
            # Fallback if no block IDs provided
            fallback_att = SkillAttachment(
                skill_name=mention.skill_name,
                raw_mention=mention.raw_mention or mention.skill_name,
                target_type=None,
                target_id=None,
                target_name=None,
                evidence_id="unknown_block",
                evidence_block_ids=[],
                section="unknown",
                status=SkillAttachmentStatus.UNRESOLVED.value,
                confidence=mention.confidence,
                metadata={"reason": "Missing evidence_block_ids in SkillMention"},
            )
            attachments.append(fallback_att)
            return attachments

        for block_id in block_ids:
            block = ev_map.get(block_id)

            # Determine section and character offsets
            if block is not None:
                sec = block.section.value if isinstance(block.section, CVSection) else str(block.section or "").lower()
                c_start = block.char_start
                c_end = block.char_end
            else:
                sec = str(mention.metadata.get("section", "unknown")).lower()
                c_start = None
                c_end = None

            if c_start is None and mention.char_spans:
                c_start, c_end = mention.char_spans[0]

            span_tuple = (c_start, c_end) if c_start is not None and c_end is not None else None

            # ------------------------------------------------------------------
            # RULE 3: Section is UNKNOWN -> MUST be marked UNRESOLVED
            # ------------------------------------------------------------------
            if sec == "unknown" or sec == CVSection.UNKNOWN.value or not sec:
                att = SkillAttachment(
                    skill_name=mention.skill_name,
                    raw_mention=mention.raw_mention or mention.skill_name,
                    target_type=None,
                    target_id=None,
                    target_name=None,
                    evidence_id=block_id,
                    evidence_block_ids=[block_id],
                    section="unknown",
                    char_span=span_tuple,
                    status=SkillAttachmentStatus.UNRESOLVED.value,
                    confidence=mention.confidence,
                    metadata={"reason": "Section is unknown; mention cannot be safely resolved to an experience or project entry."},
                )
                attachments.append(att)
                continue

            # ------------------------------------------------------------------
            # RULE 2: Skills from SKILLS section -> NEVER attach to Experience
            # ------------------------------------------------------------------
            if sec == "skills" or sec == CVSection.SKILLS.value:
                att = SkillAttachment(
                    skill_name=mention.skill_name,
                    raw_mention=mention.raw_mention or mention.skill_name,
                    target_type=None,
                    target_id=None,
                    target_name=None,
                    evidence_id=block_id,
                    evidence_block_ids=[block_id],
                    section="skills",
                    char_span=span_tuple,
                    status=SkillAttachmentStatus.SKILLS_SECTION.value,
                    confidence=mention.confidence,
                    metadata={"reason": "Skill originated from Skills inventory section; not attached to Experience or Project."},
                )
                attachments.append(att)
                continue

            # ------------------------------------------------------------------
            # RULE 1: Match by Block Ownership or Span Containment
            # ------------------------------------------------------------------
            matched_target_type: str | None = None
            matched_target_id: str | None = None
            matched_target_name: str | None = None
            binding_method: str | None = None
            matched_entry: Any = None

            # 1. Match by Block Ownership (Project first, then Experience)
            for proj, _, _ in proj_spans:
                if block_id in proj.evidence_block_ids:
                    matched_target_type = "project"
                    matched_target_id = proj.project_id
                    matched_target_name = proj.project_name
                    binding_method = "block_ownership"
                    matched_entry = proj
                    break

            if not matched_target_type:
                for exp, _, _ in exp_spans:
                    if block_id in exp.evidence_block_ids:
                        matched_target_type = "experience"
                        matched_target_id = exp.entry_id
                        matched_target_name = exp.company or exp.role
                        binding_method = "block_ownership"
                        matched_entry = exp
                        break

            # 2. Match by Span Containment (if not matched by block ID)
            if not matched_target_type and c_start is not None and c_end is not None:
                # Check Projects
                for proj, p_start, p_end in proj_spans:
                    if p_start is not None and p_end is not None:
                        if p_start <= c_start and c_end <= p_end:
                            matched_target_type = "project"
                            matched_target_id = proj.project_id
                            matched_target_name = proj.project_name
                            binding_method = "span_containment"
                            matched_entry = proj
                            break

                # Check Experience (only if section is experience or compatible)
                if not matched_target_type and sec != "skills":
                    for exp, e_start, e_end in exp_spans:
                        if e_start is not None and e_end is not None:
                            if e_start <= c_start and c_end <= e_end:
                                matched_target_type = "experience"
                                matched_target_id = exp.entry_id
                                matched_target_name = exp.company or exp.role
                                binding_method = "span_containment"
                                matched_entry = exp
                                break

            # 3. Create Attachment Record
            if matched_target_type and matched_entry is not None:
                att = SkillAttachment(
                    skill_name=mention.skill_name,
                    raw_mention=mention.raw_mention or mention.skill_name,
                    target_type=matched_target_type,  # type: ignore
                    target_id=matched_target_id,
                    target_name=matched_target_name,
                    evidence_id=block_id,
                    evidence_block_ids=[block_id],
                    section=sec,
                    char_span=span_tuple,
                    status=SkillAttachmentStatus.ATTACHED.value,
                    confidence=mention.confidence,
                    metadata={"binding_method": binding_method},
                )
                attachments.append(att)

                # Attach to target entry's skill_attachments list
                existing_att_ids = {a.evidence_id for a in matched_entry.skill_attachments if a.skill_name == att.skill_name}
                if block_id not in existing_att_ids:
                    matched_entry.skill_attachments.append(att)

                # Synchronize technologies field
                if hasattr(matched_entry, "technologies") and matched_entry.technologies is not None:
                    if att.skill_name not in matched_entry.technologies:
                        matched_entry.technologies.append(att.skill_name)
            else:
                att = SkillAttachment(
                    skill_name=mention.skill_name,
                    raw_mention=mention.raw_mention or mention.skill_name,
                    target_type=None,
                    target_id=None,
                    target_name=None,
                    evidence_id=block_id,
                    evidence_block_ids=[block_id],
                    section=sec,
                    char_span=span_tuple,
                    status=SkillAttachmentStatus.UNATTACHED.value,
                    confidence=mention.confidence,
                    metadata={"reason": f"Mention in section '{sec}' is not contained in any experience or project entry."},
                )
                attachments.append(att)

        return attachments

    def bind_all(
        self,
        skill_mentions: list[SkillMention],
        experience_entries: list[ExperienceEntry] | None = None,
        project_entries: list[ProjectEntry] | None = None,
        evidence_blocks: list[EvidenceBlock] | dict[str, EvidenceBlock] | None = None,
    ) -> list[SkillAttachment]:
        """Bind all SkillMentions to Experience and Project entries.

        Updates skill_mentions with resolution fields and returns all created SkillAttachment objects.
        """
        exp_entries = experience_entries or []
        proj_entries = project_entries or []

        # Convert evidence_blocks to dictionary map
        if isinstance(evidence_blocks, dict):
            ev_map = evidence_blocks
        elif isinstance(evidence_blocks, list):
            ev_map = {b.block_id: b for b in evidence_blocks}
        else:
            ev_map = {}

        all_attachments: list[SkillAttachment] = []

        for mention in skill_mentions:
            att_list = self.bind_skill_mention(
                mention=mention,
                experience_entries=exp_entries,
                project_entries=proj_entries,
                evidence_map=ev_map,
            )
            all_attachments.extend(att_list)

            # Update mention status
            attached_atts = [a for a in att_list if a.status == SkillAttachmentStatus.ATTACHED.value]
            unresolved_atts = [a for a in att_list if a.status == SkillAttachmentStatus.UNRESOLVED.value]
            skills_sec_atts = [a for a in att_list if a.status == SkillAttachmentStatus.SKILLS_SECTION.value]

            if attached_atts:
                first_att = attached_atts[0]
                mention.attached_entry_id = first_att.target_id
                mention.attached_entry_type = first_att.target_type
                mention.attachment_status = SkillAttachmentStatus.ATTACHED.value
                mention.primary_evidence_id = first_att.evidence_id
                mention.is_unresolved = False
            elif unresolved_atts:
                first_un = unresolved_atts[0]
                mention.attachment_status = SkillAttachmentStatus.UNRESOLVED.value
                mention.primary_evidence_id = first_un.evidence_id
                mention.is_unresolved = True
            elif skills_sec_atts:
                first_sk = skills_sec_atts[0]
                mention.attachment_status = SkillAttachmentStatus.SKILLS_SECTION.value
                mention.primary_evidence_id = first_sk.evidence_id
                mention.is_unresolved = False
            else:
                mention.attachment_status = SkillAttachmentStatus.UNATTACHED.value
                mention.is_unresolved = False
                if att_list:
                    mention.primary_evidence_id = att_list[0].evidence_id

        return all_attachments

    def extract_skill_mentions(
        self,
        text_or_blocks: str | list[EvidenceBlock],
        known_skills: list[str] | None = None,
        doc_id: str = "doc",
    ) -> list[SkillMention]:
        """Extract grounded SkillMention instances from raw text or EvidenceBlocks.

        Uses regex word boundary matching with canonical normalization.
        For ambiguous/short skills (C, R, Go), applies the 4-tier disambiguation engine:
          Tier 1: Compound pattern pre-scan (e.g. "C/C++", "R Studio", "Go developer")
          Tier 2: Negative context rejection (e.g. "Grade C", "ready to go")
          Tier 3: Positive context validation (e.g. nearby "programming", "kỹ năng")
          Tier 4: Section-weighted confidence (skills/experience sections boost, unknown penalizes)
        """
        if isinstance(text_or_blocks, str):
            if not text_or_blocks.strip():
                return []
            raw_text_for_compound = text_or_blocks
            blocks = TextChunker.chunk_to_evidence_blocks(text_or_blocks, detector=self.detector)
        else:
            blocks = text_or_blocks
            # Reconstruct raw text from blocks for compound pattern scanning
            raw_text_for_compound = "\n".join(b.text for b in blocks)

        if not blocks:
            return []

        # Prefer line/sentence blocks for precise 1-to-1 section attribution and no multi-window duplication
        line_blocks = [
            b for b in blocks
            if (getattr(b, "chunk_level", None) in ("line", ChunkLevel.LINE, "sentence", ChunkLevel.SENTENCE))
        ]
        target_blocks = line_blocks if line_blocks else blocks

        # Determine target skill keywords
        skill_dict = dict(CANONICAL_SKILL_MAP)
        if known_skills:
            for s in known_skills:
                skill_dict[s.lower()] = s

        # ======================================================================
        # TIER 1: Compound Pattern Pre-Scan
        # Detect high-confidence compound patterns BEFORE standard regex scanning.
        # e.g. "C/C++", "lập trình C", "R Studio", "Go developer"
        # ======================================================================
        compound_confirmed: dict[str, set[tuple[int, int]]] = {}  # canonical -> set of doc-level spans
        for canonical_name in AMBIGUOUS_SKILLS:
            compound_spans = _check_compound_patterns(canonical_name, raw_text_for_compound)
            if compound_spans:
                compound_confirmed[canonical_name] = set(compound_spans)

        # Build combined regex pattern for fast single-pass matching
        # Sort keys by length descending to match multi-word phrases first (e.g. "Spring Boot" before "Spring")
        sorted_keys = sorted(skill_dict.keys(), key=lambda k: len(k), reverse=True)
        escaped_keys = [re.escape(k) for k in sorted_keys]
        pattern_str = r"(?<![A-Za-z0-9_#+])(" + "|".join(escaped_keys) + r")(?![A-Za-z0-9_#+])"
        skill_regex = re.compile(pattern_str, re.IGNORECASE)

        mentions: list[SkillMention] = []
        seen_spans: set[tuple[str, int, int]] = set()

        for block in target_blocks:
            # Skip heading blocks themselves
            if block.metadata.get("is_heading") is True:
                continue

            text = block.text
            sec = block.section.value if isinstance(block.section, CVSection) else str(block.section or "unknown").lower()

            for match in skill_regex.finditer(text):
                raw_str = match.group(0)
                norm_name = skill_dict.get(raw_str.lower(), raw_str)
                span_start = block.char_start + match.start()
                span_end = block.char_start + match.end()

                span_key = (norm_name, span_start, span_end)
                if span_key in seen_spans:
                    continue
                seen_spans.add(span_key)

                # ==============================================================
                # 4-TIER DISAMBIGUATION FOR AMBIGUOUS SKILLS
                # ==============================================================
                confidence = 0.95  # default for non-ambiguous skills
                disambiguation_method = "standard"

                if _is_ambiguous_skill(norm_name):
                    # --- Tier 1: Was this match part of a compound pattern? ---
                    if norm_name in compound_confirmed:
                        # Check if this standalone match position overlaps with any compound span
                        is_compound = any(
                            cs <= span_start and span_end <= ce
                            for cs, ce in compound_confirmed[norm_name]
                        )
                        if is_compound:
                            confidence = 0.95
                            disambiguation_method = "compound_pattern"
                        else:
                            # Standalone match, needs further validation
                            confidence, disambiguation_method = self._validate_ambiguous_match(
                                norm_name, raw_text_for_compound, span_start, span_end, sec
                            )
                    else:
                        # No compound patterns found at all, validate standalone
                        confidence, disambiguation_method = self._validate_ambiguous_match(
                            norm_name, raw_text_for_compound, span_start, span_end, sec
                        )

                    # If confidence is 0 after disambiguation, reject this match
                    if confidence <= 0.0:
                        logger.debug(
                            "Rejected ambiguous skill '%s' at [%d:%d] (method=%s, section=%s)",
                            norm_name, span_start, span_end, disambiguation_method, sec,
                        )
                        continue

                mention = SkillMention(
                    skill_name=norm_name,
                    category=SKILL_CATEGORY_MAP.get(norm_name, "general"),
                    raw_mention=raw_str,
                    proficiency_level="unknown",
                    confidence=round(confidence, 3),
                    evidence_block_ids=[block.block_id],
                    char_spans=[(span_start, span_end)],
                    metadata={
                        "section": sec,
                        "disambiguation_method": disambiguation_method,
                    },
                )
                mentions.append(mention)

        return mentions

    def _validate_ambiguous_match(
        self,
        canonical_name: str,
        full_text: str,
        match_start: int,
        match_end: int,
        section: str,
    ) -> tuple[float, str]:
        """Validate an ambiguous skill match through Tiers 2-4.

        Returns:
            (confidence, disambiguation_method)
            confidence = 0.0 means the match should be rejected.
        """
        # --- Tier 2: Negative context check → reject if present ---
        if _has_negative_context(canonical_name, full_text, match_start, match_end):
            return 0.0, "rejected_negative_context"

        # --- Tier 3: Positive context check ---
        if _has_positive_context(full_text, match_start, match_end):
            # Positive signal found, apply section weight
            section_weight = _get_section_confidence_weight(section)
            confidence = round(0.90 * section_weight, 3)
            return confidence, "positive_context"

        # --- Tier 4: Section-only validation (no explicit context signals) ---
        # 1-letter skills (C, R) without positive context are only accepted in 'skills' section.
        # In experience/projects, 1-letter skills require positive context or compound patterns.
        if len(canonical_name) == 1:
            if section.lower() == "skills":
                section_weight = _get_section_confidence_weight(section)
                confidence = round(0.75 * section_weight, 3)
                return confidence, "section_context"
            return 0.0, "rejected_no_context"

        # Multi-letter ambiguous skills (e.g. Golang / Go)
        tech_sections = {"skills", "experience", "projects"}
        if section.lower() in tech_sections:
            section_weight = _get_section_confidence_weight(section)
            confidence = round(0.75 * section_weight, 3)
            return confidence, "section_context"

        # No positive context, not in a technical section → reject
        return 0.0, "rejected_no_context"




    def bind_cv_fingerprint(self, fingerprint: CVFingerprint) -> CVFingerprint:
        """Bind all skill mentions in a CVFingerprint and update its entries."""
        fingerprint.bind_skill_mentions()
        return fingerprint


def attach_skills_to_entries(
    skill_mentions: list[SkillMention],
    experience_entries: list[ExperienceEntry] | None = None,
    project_entries: list[ProjectEntry] | None = None,
    evidence_blocks: list[EvidenceBlock] | None = None,
) -> list[SkillAttachment]:
    """Top-level functional helper to bind skill mentions to experience and project entries."""
    binder = SkillBinder()
    return binder.bind_all(
        skill_mentions=skill_mentions,
        experience_entries=experience_entries,
        project_entries=project_entries,
        evidence_blocks=evidence_blocks,
    )


def bind_skills(
    skill_mentions: list[SkillMention],
    experience_entries: list[ExperienceEntry] | None = None,
    project_entries: list[ProjectEntry] | None = None,
    evidence_blocks: list[EvidenceBlock] | dict[str, EvidenceBlock] | None = None,
) -> list[SkillAttachment]:
    """Alias for attach_skills_to_entries supporting evidence dictionary mapping."""
    binder = SkillBinder()
    return binder.bind_all(
        skill_mentions=skill_mentions,
        experience_entries=experience_entries,
        project_entries=project_entries,
        evidence_blocks=evidence_blocks,
    )


def extract_and_bind_skills(
    raw_text: str,
    experience_entries: list[ExperienceEntry] | None = None,
    project_entries: list[ProjectEntry] | None = None,
    known_skills: list[str] | None = None,
    detector: SectionDetector | None = None,
) -> tuple[list[SkillMention], list[SkillAttachment]]:
    """Complete pipeline: chunk raw text, extract grounded skills, and bind to experience/project entries."""
    sec_detector = detector or SectionDetector()
    blocks = TextChunker.chunk_to_evidence_blocks(raw_text, detector=sec_detector)
    binder = SkillBinder(detector=sec_detector)

    mentions = binder.extract_skill_mentions(blocks, known_skills=known_skills)
    attachments = binder.bind_all(
        skill_mentions=mentions,
        experience_entries=experience_entries,
        project_entries=project_entries,
        evidence_blocks=blocks,
    )
    return mentions, attachments
