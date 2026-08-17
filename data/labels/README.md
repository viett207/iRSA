# Recruiter label queue

`synthetic_candidate_job_review_queue_v1.jsonl` is a pending-review queue,
not a labeled dataset. It links the synthetic candidate profiles to the Silver
job corpus and gives a deterministic, weak suggestion only to diversify the
review work.

Review the candidate summary and full CV against the original job description,
then set exactly one `recruiter_label`:

- `strong_match`: meets the core role and nearly all essential skills or experience.
- `partial_match`: plausible candidate but has material, remediable gaps.
- `not_match`: role, core skills, or experience are materially misaligned.
- `insufficient_evidence`: either record lacks enough information to decide.

Set `label_status` to `reviewed`, record a stable reviewer ID and UTC timestamp,
and explain only the decision evidence in `reviewer_notes`. Do not use age,
gender, ethnicity, nationality, disability, photo, name, or other protected
attributes in the decision.

The queue is generated with:

```powershell
.\.venv\Scripts\python.exe scripts\build_candidate_job_review_queue.py
```

Its JSONL output and report remain Git-ignored until a governed promotion
process explicitly approves an immutable, recruiter-reviewed evaluation split.

## VietJobs job QA pilot

`vietjobs_job_qa_queue_v1.jsonl` is a 200-record Vietnamese job-description
pilot sampled across title groups. It is a human-review queue, not Golden data.
Each record keeps the full original description and the source-snapshot
provenance needed for a reviewer to assess it.

For each record, check that the title and description describe a meaningful job,
the language and location are coherent, and the text does not need redaction
for personal contact details. Then set exactly one `review_decision`:

- `approved`: valid, useful JD that passes this content review.
- `needs_remediation`: usable only after a documented fix such as redaction or
  a parsing correction.
- `rejected`: spam, placeholder, duplicate, malformed, or unrelated content.

Set `review_status` to `reviewed`, enter a stable reviewer ID and UTC
timestamp, and record concise evidence in `reviewer_notes`. Do not use the
reviewer notes to reproduce personal contact details.

Generate the queue with:

```powershell
.\.venv\Scripts\python.exe scripts\build_vietjobs_job_qa_queue.py
```

An `approved` decision only completes the content-review stage. These records
still cannot be promoted to the production Golden set because this dataset
snapshot has no original job-posting URL or company provenance. Retain it as a
reviewed Silver corpus; collect jobs from approved ATS or employer sources for
the Golden promotion path.

## Project-authored O*NET benchmark QA

`project_authored_onet_job_review_queue_v1.jsonl` contains every fictional JD
from `project_authored_onet_bilingual_v1.jsonl`. Check language, role/skill
coherence, experience level, non-live-job disclosure and absence of contact or
company-specific claims. Set `review_decision` to `approved`,
`needs_remediation` or `rejected`; then set `review_status` to `reviewed` with
a stable reviewer ID, UTC timestamp and concise notes.

An approved record has controlled content and a clear O*NET attribution, but
the benchmark becomes Golden only after every required review and promotion
gate is complete.

## O*NET benchmark JD--candidate labels

`project_authored_onet_candidate_match_review_queue_v1.jsonl` has three
deterministically selected pairs for each synthetic candidate: likely match,
uncertain match and likely-not match. The suggested bucket is triage only.
Review the full candidate summary and JD, then apply the existing recruiter
label rubric (`strong_match`, `partial_match`, `not_match`, or
`insufficient_evidence`). These labels must not be inferred from overlap alone.

## Automated drafts

`project_authored_onet_automated_job_qa_drafts_v1.jsonl` and
`project_authored_onet_automated_match_label_drafts_v1.jsonl` are deterministic
pre-checks created to accelerate internal development. They never modify the
human-review queues and their `suggested_decision` must not be represented as a
recruiter decision, production hiring decision, or Golden ground truth.
