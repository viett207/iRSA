# Recruitment data pipeline

This directory uses an immutable, versioned pipeline for the bilingual
recruitment agent.

- `raw/`: original API responses or partner exports. Never edit or delete a
raw batch. Each batch must record source, request time, permission/terms
  reference, and a checksum.
- `silver/`: normalized, deduplicated records. Invalid records go to a
  quarantine file; they are not silently discarded.
- `labels/`: recruiter-reviewed job--candidate relevance labels.
- `experimental/`: local development corpora that retain known source-rights
  or QA blockers. They are never Golden data and must not be redistributed.
- `golden/`: only records that pass the documented promotion gates.

Synthetic candidate profiles may be kept in `silver/candidates/` for local
development and offline evaluation. They must be clearly marked synthetic,
contain no PII, and must never be promoted to `golden/` or presented as real
applicants.

No public resume may be collected without a documented consent or partner data
agreement. For public job boards, use only the documented posting API of a
named employer after recording its terms or permission reference. Credentials,
where an approved source requires them, stay in environment variables and must
never be stored under `data/` or committed to Git.
