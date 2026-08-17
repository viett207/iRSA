# Synthetic candidate profiles v1

`synthetic_candidate_profiles_v1.jsonl` is generated locally by
`scripts/generate_synthetic_candidate_profiles.py`. It contains 120
non-identifying, fictional candidate profiles (60 Vietnamese and 60 English)
with structured metadata and `resume_text_original` for exercising the current
resume-matching pipeline.

The JSONL output and its report are intentionally Git-ignored. Regenerate it
with:

```powershell
.\.venv\Scripts\python.exe scripts\generate_synthetic_candidate_profiles.py
```

Use only for development and offline evaluation. The records have no consent
because they do not represent people; they are not recruiter labels, cannot be
used to measure production accuracy, and cannot be promoted to `golden/v2`.

## Consented PDF CVs

`consented_pdf_candidates_v1.jsonl` is created only from PDFs listed in a
consent manifest under `data/raw/candidates/`. The pipeline extracts native PDF
text first and runs OCR only on pages without a usable text layer. It redacts
email addresses, phone numbers, URLs, labeled name/address/ID lines, and marks
every output for manual PII review because free-text names or addresses cannot
be safely resolved by regex alone.

Run it only after each manifest maps a non-identifying `candidate_ref` such as
`cv_001` to the exact PDF filename and confirms consent:

```powershell
.\.venv\Scripts\python.exe scripts\ingest_consented_candidate_pdfs.py
```

The output remains Silver, not Golden, until a privacy reviewer approves it and
recruiters provide reviewed job--candidate labels.
