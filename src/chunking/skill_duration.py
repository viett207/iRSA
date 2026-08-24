"""Deterministic Skill Duration Calculator with Interval Merging, Precision Tracking & As-Of Date Injection.

Features & Guarantees:
1. Gathers date intervals from entries where the skill is verified/grounded.
2. Merges overlapping and parallel intervals to prevent double-counting parallel jobs.
3. Separates verified duration (from job history) from self-declared duration (from Summary/Skills).
4. Date Precision & Confidence Tracking: distinguishes between 'month' and 'year' precision with confidence scores.
5. Injects `as_of_date` context (Production = dynamic pipeline execution date, Test = fixed deterministic date).
6. Records `calculated_as_of` metadata on all duration results.
7. Detects experience duration discrepancies (e.g. self-claimed 5 years vs 2 years verified).
8. Strictly grounds all calculations in evidence_block_ids.
"""

from __future__ import annotations

import logging
import re
from datetime import UTC, datetime, timezone
from typing import Any

from src.chunking.date_parser import DateRangeParser, parse_date_range
from src.models.cv_fingerprint import (
    CVFingerprint,
    ExperienceEntry,
    PipelineContext,
    ProjectEntry,
    SkillAttachment,
    SkillDurationResult,
    SkillMention,
)

from src.models.evidence import CVSection, EvidenceBlock

logger = logging.getLogger(__name__)


def month_index_to_str(idx: int) -> str:
    """Convert integer month index (year * 12 + month) to 'YYYY-MM' format."""
    year = (idx - 1) // 12
    month = (idx - 1) % 12 + 1
    return f"{year:04d}-{month:02d}"


def resolve_as_of_date(
    as_of_date: datetime | str | None = None,
    default_year: int | None = None,
    default_month: int | None = None,
) -> tuple[int, int, str]:
    """Resolve (year, month, 'YYYY-MM-DD') tuple from diverse as_of_date inputs."""
    if as_of_date is not None:
        if isinstance(as_of_date, datetime):
            return as_of_date.year, as_of_date.month, as_of_date.strftime("%Y-%m-%d")
        if isinstance(as_of_date, str) and as_of_date.strip():
            cleaned = as_of_date.strip()
            m = re.match(r"^(\d{4})[-\/\.](\d{1,2})", cleaned)
            if m:
                y, mth = int(m.group(1)), int(m.group(2))
                return y, mth, f"{y:04d}-{mth:02d}-01"
            m_y = re.match(r"^(\d{4})", cleaned)
            if m_y:
                y = int(m_y.group(1))
                return y, 1, f"{y:04d}-01-01"

    if default_year is not None and default_month is not None:
        return default_year, default_month, f"{default_year:04d}-{default_month:02d}-01"

    now = datetime.now(timezone.utc)
    return now.year, now.month, now.strftime("%Y-%m-%d")


def parse_date_string_to_month_index(
    date_str: str | None,
    default_month: int = 1,
    ref_year: int = 2026,
    ref_month: int = 8,
) -> tuple[int | None, str]:
    """Parse date string to (month_index, precision: 'month' | 'year' | 'unknown')."""
    if not date_str or not str(date_str).strip():
        return None, "unknown"

    cleaned = str(date_str).strip().lower()

    # Current / Present keywords
    if cleaned in ("present", "hiện tại", "hien tai", "nay", "đến nay", "current", "now", "ongoing"):
        return ref_year * 12 + ref_month, "month"

    # Pattern: MM/YYYY or MM-YYYY or MM.YYYY or YYYY-MM
    m_ym = re.search(r"^(19\d\d|20\d\d)[-\/\.](0?[1-9]|1[0-2])$", cleaned)
    if m_ym:
        y, m = int(m_ym.group(1)), int(m_ym.group(2))
        return y * 12 + m, "month"

    m_my = re.search(r"^(0?[1-9]|1[0-2])[-\/\.](19\d\d|20\d\d)$", cleaned)
    if m_my:
        m, y = int(m_my.group(1)), int(m_my.group(2))
        return y * 12 + m, "month"

    # Pattern: YYYY alone
    m_y = re.search(r"\b(19\d\d|20\d\d)\b", cleaned)
    if m_y:
        y = int(m_y.group(1))
        return y * 12 + default_month, "year"

    return None, "unknown"


def merge_month_intervals(intervals: list[tuple[int, int]]) -> list[tuple[int, int]]:
    """Merge overlapping and consecutive month intervals into disjoint unified intervals."""
    if not intervals:
        return []

    sorted_intervals = sorted(intervals, key=lambda x: (x[0], x[1]))
    merged: list[list[int]] = []

    for start_idx, end_idx in sorted_intervals:
        if not merged:
            merged.append([start_idx, end_idx])
        else:
            last_start, last_end = merged[-1]
            if start_idx <= last_end + 1:
                merged[-1][1] = max(last_end, end_idx)
            else:
                merged.append([start_idx, end_idx])

    return [(m[0], m[1]) for m in merged]


class SkillDurationCalculator:
    """Calculates grounded, non-overlapping skill duration metrics from CV entries."""

    def __init__(
        self,
        context: PipelineContext | None = None,
        date_parser: DateRangeParser | None = None,
        as_of_date: datetime | str | None = None,
        scoring_timezone: str | None = None,
        policy_version: str = "v1",
        reference_year: int | None = None,
        reference_month: int | None = None,
    ):
        self.date_parser = date_parser or DateRangeParser()

        if context is not None:
            self.context = context
        elif as_of_date is not None or scoring_timezone is not None:
            self.context = PipelineContext.create(
                scoring_timezone=scoring_timezone,
                as_of_date_override=as_of_date,
                policy_version=policy_version,
            )
        elif reference_year is not None and reference_month is not None:
            ref_dt = datetime(reference_year, reference_month, 1, tzinfo=timezone.utc)
            self.context = PipelineContext.create(
                request_time_utc=ref_dt,
                scoring_timezone=scoring_timezone or "Asia/Ho_Chi_Minh",
                policy_version=policy_version,
            )
        else:
            self.context = PipelineContext.create(
                scoring_timezone=scoring_timezone or "Asia/Ho_Chi_Minh",
                policy_version=policy_version,
            )

        self.ref_year = self.context.local_as_of.year
        self.ref_month = self.context.local_as_of.month
        self.as_of_str = self.context.as_of_local_date
        self.as_of_ym = self.context.as_of_ym
        self.scoring_timezone = self.context.timezone_name
        self.policy_version = self.context.policy_version


    def extract_entry_interval(
        self,
        entry: ExperienceEntry | ProjectEntry,
        evidence_map: dict[str, EvidenceBlock] | None = None,
    ) -> tuple[int, int, str, str, str, list[str]] | None:
        """Extract a credible (start_idx, end_idx, start_str, end_str, precision, assumptions) from an entry.

        Returns None if date range is missing, invalid, or unreliable.
        """
        start_date = getattr(entry, "start_date", None)
        end_date = getattr(entry, "end_date", None)
        is_current = getattr(entry, "is_current", False)

        start_idx: int | None = None
        end_idx: int | None = None
        start_prec = "unknown"
        end_prec = "unknown"
        assumptions: list[str] = []

        entry_label = getattr(entry, "company", None) or getattr(entry, "project_name", None) or getattr(entry, "role", None) or "entry"

        # 1. Try parsing explicit start_date and end_date on entry
        if start_date:
            start_idx, start_prec = parse_date_string_to_month_index(
                start_date, default_month=1, ref_year=self.ref_year, ref_month=self.ref_month
            )

        if end_date:
            end_idx, end_prec = parse_date_string_to_month_index(
                end_date, default_month=12, ref_year=self.ref_year, ref_month=self.ref_month
            )
        elif is_current:
            end_idx = self.ref_year * 12 + self.ref_month
            end_prec = "month"

        # 2. If dates missing on entry, try parsing from evidence blocks text
        if (start_idx is None or end_idx is None) and evidence_map:
            for b_id in entry.evidence_block_ids:
                block = evidence_map.get(b_id)
                if block and block.text:
                    parsed_dr = self.date_parser.parse(block.text)
                    if parsed_dr and parsed_dr.confidence >= 0.7:
                        if start_idx is None and parsed_dr.start.year:
                            start_idx = parsed_dr.start.year * 12 + (parsed_dr.start.month or 1)
                            start_prec = "month" if parsed_dr.start.month else "year"
                        if end_idx is None:
                            if parsed_dr.end.is_present:
                                end_idx = self.ref_year * 12 + self.ref_month
                                end_prec = "month"
                            elif parsed_dr.end.year:
                                end_idx = parsed_dr.end.year * 12 + (parsed_dr.end.month or 12)
                                end_prec = "month" if parsed_dr.end.month else "year"
                    if start_idx is not None and end_idx is not None:
                        break

        # Validate credibility of interval
        if start_idx is None or end_idx is None:
            return None

        # Sanity: start must be <= end and years within reasonable bounds
        if start_idx > end_idx or start_idx < (1970 * 12 + 1) or end_idx > ((self.ref_year + 5) * 12 + 12):
            return None

        # Determine precision and record assumptions
        if start_prec == "year" or end_prec == "year":
            precision = "year"
            assumptions.append(f"assumed_full_year_bounds_for_{entry_label}")
        else:
            precision = "month"

        start_str = month_index_to_str(start_idx)
        end_str = month_index_to_str(end_idx)
        return start_idx, end_idx, start_str, end_str, precision, assumptions

    def calculate_skill_duration(
        self,
        skill_name: str,
        experience_entries: list[ExperienceEntry] | None = None,
        project_entries: list[ProjectEntry] | None = None,
        skill_mentions: list[SkillMention] | None = None,
        evidence_blocks: list[EvidenceBlock] | dict[str, EvidenceBlock] | None = None,
        raw_text: str | None = None,
    ) -> SkillDurationResult:
        """Calculate verified vs declared duration metrics for a single skill."""
        norm_skill = skill_name.strip()
        skill_lower = norm_skill.lower()

        exp_entries = experience_entries or []
        proj_entries = project_entries or []
        mentions = skill_mentions or []

        if isinstance(evidence_blocks, dict):
            ev_map = evidence_blocks
        elif isinstance(evidence_blocks, list):
            ev_map = {b.block_id: b for b in evidence_blocks}
        else:
            ev_map = {}

        # ----------------------------------------------------------------------
        # 1. Identify Contributing Entries & Extract Intervals
        # ----------------------------------------------------------------------
        contributing_entry_ids: list[str] = []
        contributing_summaries: list[dict[str, Any]] = []
        raw_intervals: list[tuple[int, int]] = []
        grounding_block_ids: list[str] = []
        all_assumptions: list[str] = []
        precisions: set[str] = set()

        all_entries: list[tuple[str, str, ExperienceEntry | ProjectEntry]] = []
        for exp in exp_entries:
            all_entries.append(("experience", exp.entry_id or "exp_entry", exp))
        for proj in proj_entries:
            all_entries.append(("project", proj.project_id or "proj_entry", proj))

        for entry_type, entry_id, entry in all_entries:
            skill_matched = False

            if hasattr(entry, "skill_attachments") and entry.skill_attachments:
                for att in entry.skill_attachments:
                    if att.skill_name.lower() == skill_lower and att.status == "attached":
                        skill_matched = True
                        if att.evidence_id and att.evidence_id not in grounding_block_ids:
                            grounding_block_ids.append(att.evidence_id)

            if not skill_matched and hasattr(entry, "technologies") and entry.technologies:
                for tech in entry.technologies:
                    if tech.lower() == skill_lower:
                        skill_matched = True
                        break

            if not skill_matched:
                for m in mentions:
                    if m.skill_name.lower() == skill_lower and m.attached_entry_id == entry_id:
                        skill_matched = True
                        for b_id in m.evidence_block_ids:
                            if b_id not in grounding_block_ids:
                                grounding_block_ids.append(b_id)
                        break

            if skill_matched:
                interval_res = self.extract_entry_interval(entry, evidence_map=ev_map)
                if interval_res is not None:
                    s_idx, e_idx, s_str, e_str, prec, asm = interval_res
                    dur_m = e_idx - s_idx + 1

                    raw_intervals.append((s_idx, e_idx))
                    contributing_entry_ids.append(entry_id)
                    precisions.add(prec)
                    all_assumptions.extend(asm)

                    entry_label = getattr(entry, "company", None) or getattr(entry, "project_name", None) or getattr(entry, "role", None) or entry_id
                    contributing_summaries.append({
                        "entry_id": entry_id,
                        "entry_type": entry_type,
                        "name": entry_label,
                        "start_date": s_str,
                        "end_date": e_str,
                        "duration_months": dur_m,
                        "precision": prec,
                    })
                    for b_id in entry.evidence_block_ids:
                        if b_id not in grounding_block_ids:
                            grounding_block_ids.append(b_id)

        # ----------------------------------------------------------------------
        # 2. Merge Intervals & Calculate Verified Duration
        # ----------------------------------------------------------------------
        merged_month_intervals = merge_month_intervals(raw_intervals)
        verified_months = sum((e - s + 1) for s, e in merged_month_intervals)
        verified_years = round(verified_months / 12.0, 1)

        merged_str_intervals = [
            (month_index_to_str(s), month_index_to_str(e))
            for s, e in merged_month_intervals
        ]

        # Determine aggregate precision and confidence penalty
        if not precisions:
            overall_precision = "month"
            confidence_score = 1.0
        elif "year" in precisions and "month" in precisions:
            overall_precision = "mixed"
            confidence_score = 0.90
        elif "year" in precisions:
            overall_precision = "year"
            confidence_score = 0.85
        else:
            overall_precision = "month"
            confidence_score = 1.0

        # ----------------------------------------------------------------------
        # 3. Extract Declared Duration (Summary / Skills Sections)
        # ----------------------------------------------------------------------
        declared_months: int | None = None
        declared_years: float | None = None

        for m in mentions:
            if m.skill_name.lower() == skill_lower:
                if m.years_experience is not None and m.years_experience > 0:
                    cand_years = float(m.years_experience)
                    cand_months = int(cand_years * 12)
                    if declared_years is None or cand_years > declared_years:
                        declared_years = cand_years
                        declared_months = cand_months
                    for b_id in m.evidence_block_ids:
                        if b_id not in grounding_block_ids:
                            grounding_block_ids.append(b_id)

        declared_scan = self.extract_declared_durations_from_text(
            raw_text=raw_text,
            evidence_blocks=list(ev_map.values()),
            target_skill=norm_skill,
        )
        if declared_scan:
            scan_months, scan_years, scan_block_ids = declared_scan
            if declared_years is None or scan_years > declared_years:
                declared_years = scan_years
                declared_months = scan_months
            for b_id in scan_block_ids:
                if b_id not in grounding_block_ids:
                    grounding_block_ids.append(b_id)

        # ----------------------------------------------------------------------
        # 4. Discrepancy Analysis
        # ----------------------------------------------------------------------
        has_discrepancy = False
        discrepancy_months = 0
        if declared_months is not None and declared_months > verified_months:
            if declared_months - verified_months >= 3:
                has_discrepancy = True
                discrepancy_months = declared_months - verified_months

        return SkillDurationResult(
            skill_name=norm_skill,
            verified_duration_months=verified_months,
            verified_duration_years=verified_years,
            declared_duration_months=declared_months,
            declared_duration_years=declared_years,
            contributing_entry_ids=contributing_entry_ids,
            contributing_entries_summary=contributing_summaries,
            merged_intervals=merged_str_intervals,
            has_discrepancy=has_discrepancy,
            discrepancy_months=discrepancy_months,
            calculated_as_of=self.as_of_str,
            scoring_timezone=self.scoring_timezone,
            as_of_local_date=self.as_of_str,
            as_of_ym=self.as_of_ym,
            policy_version=self.policy_version,
            date_precision=overall_precision,
            confidence=confidence_score,
            assumptions=all_assumptions,
            audit_metadata=self.context.to_audit_metadata(),
            evidence_block_ids=grounding_block_ids,
            metadata={
                "raw_intervals_count": len(raw_intervals),
                "merged_intervals_count": len(merged_month_intervals),
                "as_of_year": self.ref_year,
                "as_of_month": self.ref_month,
                "scoring_timezone": self.scoring_timezone,
                "policy_version": self.policy_version,
            },
        )


    def extract_declared_durations_from_text(
        self,
        raw_text: str | None = None,
        evidence_blocks: list[EvidenceBlock] | None = None,
        target_skill: str | None = None,
    ) -> tuple[int, float, list[str]] | None:
        """Extract self-declared duration for a skill from Summary / Header text."""
        blocks = evidence_blocks or []
        summary_blocks = [
            b for b in blocks
            if getattr(b, "section", None) in (CVSection.SUMMARY, "summary", CVSection.HEADER, "header", CVSection.SKILLS, "skills")
        ]

        texts_to_check: list[tuple[str, str | None]] = []
        if summary_blocks:
            for b in summary_blocks:
                texts_to_check.append((b.text, b.block_id))
        elif raw_text:
            texts_to_check.append((raw_text, None))

        skill_pattern = re.escape(target_skill) if target_skill else r"[A-Za-z0-9_\+#\.]+"

        p1 = re.compile(
            r"(?:có\s+|hơn\s+|gần\s+)?(\d+(?:\.\d+)?)\s*(?:năm|\+?\s*years?)\s*(?:kinh nghiệm|exp|experience)?(?:\s+(?:với|về|trong|làm việc|phát triển|in|with|of))?\s*(?:[A-Za-z0-9_\s,]*?)(" + skill_pattern + r")\b",
            re.IGNORECASE,
        )

        p2 = re.compile(
            r"\b(" + skill_pattern + r")\s*[:\-\(]\s*(?:hơn\s+|khoảng\s+)?(\d+(?:\.\d+)?)\s*(?:năm|\+?\s*years?|\+?\s*yrs?)\b",
            re.IGNORECASE,
        )

        p_general = re.compile(
            r"(?:có\s+|hơn\s+|gần\s+)?(\d+(?:\.\d+)?)\s*(?:năm|\+?\s*years?)\s*(?:kinh nghiệm|experience)",
            re.IGNORECASE,
        )

        best_years: float | None = None
        best_b_ids: list[str] = []

        for text, b_id in texts_to_check:
            for m in p1.finditer(text):
                try:
                    yrs = float(m.group(1))
                    if best_years is None or yrs > best_years:
                        best_years = yrs
                        if b_id:
                            best_b_ids = [b_id]
                except ValueError:
                    pass

            for m in p2.finditer(text):
                try:
                    yrs = float(m.group(2))
                    if best_years is None or yrs > best_years:
                        best_years = yrs
                        if b_id:
                            best_b_ids = [b_id]
                except ValueError:
                    pass

            if target_skill and target_skill.lower() in text.lower():
                for m in p_general.finditer(text):
                    try:
                        yrs = float(m.group(1))
                        if best_years is None or yrs > best_years:
                            best_years = yrs
                            if b_id:
                                best_b_ids = [b_id]
                    except ValueError:
                        pass

        if best_years is not None and best_years > 0:
            months = int(best_years * 12)
            return months, best_years, best_b_ids

        return None

    def calculate_all_skill_durations(
        self,
        skill_mentions: list[SkillMention],
        experience_entries: list[ExperienceEntry] | None = None,
        project_entries: list[ProjectEntry] | None = None,
        evidence_blocks: list[EvidenceBlock] | dict[str, EvidenceBlock] | None = None,
        raw_text: str | None = None,
    ) -> dict[str, SkillDurationResult]:
        """Calculate duration results for all unique skills."""
        all_skills: set[str] = set()
        for m in skill_mentions:
            all_skills.add(m.skill_name)
        for exp in (experience_entries or []):
            for t in (exp.technologies or []):
                all_skills.add(t)
        for proj in (project_entries or []):
            for t in (proj.technologies or []):
                all_skills.add(t)

        results: dict[str, SkillDurationResult] = {}
        for s in all_skills:
            results[s] = self.calculate_skill_duration(
                skill_name=s,
                experience_entries=experience_entries,
                project_entries=project_entries,
                skill_mentions=skill_mentions,
                evidence_blocks=evidence_blocks,
                raw_text=raw_text,
            )
        return results

    def calculate_fingerprint_durations(
        self,
        fingerprint: CVFingerprint,
    ) -> dict[str, SkillDurationResult]:
        """Calculate duration metrics for all skills in a CVFingerprint."""
        ev_map = fingerprint.get_evidence_map()
        return self.calculate_all_skill_durations(
            skill_mentions=fingerprint.normalized_skill_mentions,
            experience_entries=fingerprint.experience_entries,
            project_entries=fingerprint.project_entries,
            evidence_blocks=ev_map,
        )


def calculate_skill_duration(
    skill_name: str,
    experience_entries: list[ExperienceEntry] | None = None,
    project_entries: list[ProjectEntry] | None = None,
    skill_mentions: list[SkillMention] | None = None,
    evidence_blocks: list[EvidenceBlock] | None = None,
    raw_text: str | None = None,
    as_of_date: datetime | str | None = None,
    context: PipelineContext | None = None,
    scoring_timezone: str | None = None,
    policy_version: str = "v1",
) -> SkillDurationResult:
    """Functional helper to calculate verified vs declared duration for a single skill."""
    calc = SkillDurationCalculator(
        context=context,
        as_of_date=as_of_date,
        scoring_timezone=scoring_timezone,
        policy_version=policy_version,
    )
    return calc.calculate_skill_duration(
        skill_name=skill_name,
        experience_entries=experience_entries,
        project_entries=project_entries,
        skill_mentions=skill_mentions,
        evidence_blocks=evidence_blocks,
        raw_text=raw_text,
    )

def calculate_all_skill_durations(
    skill_mentions: list[SkillMention],
    experience_entries: list[ExperienceEntry] | None = None,
    project_entries: list[ProjectEntry] | None = None,
    evidence_blocks: list[EvidenceBlock] | None = None,
    raw_text: str | None = None,
    as_of_date: datetime | str | None = None,
    context: PipelineContext | None = None,
    scoring_timezone: str | None = None,
    policy_version: str = "v1",
) -> dict[str, SkillDurationResult]:
    """Functional helper to calculate durations for all candidate skills."""
    calc = SkillDurationCalculator(
        context=context,
        as_of_date=as_of_date,
        scoring_timezone=scoring_timezone,
        policy_version=policy_version,
    )
    return calc.calculate_all_skill_durations(
        skill_mentions=skill_mentions,
        experience_entries=experience_entries,
        project_entries=project_entries,
        evidence_blocks=evidence_blocks,
        raw_text=raw_text,
    )
