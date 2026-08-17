# JD--CV baseline matches

`synthetic_jd_cv_baseline_v1.jsonl` scores the 360 pending-review pairs by
comparing the full Silver `description_original` (JD) with the full synthetic
`resume_text_original` (CV). It reports detected skills, matched and missing
skills, title alignment, and the experience evidence actually stated in the JD.

The overall score is a transparent heuristic, not a hiring decision, recruiter
label, training target, or Golden asset. A missing JD requirement is left
unassessed; it is never treated as a pass.

Regenerate after either input batch changes:

```powershell
.\.venv\Scripts\python.exe scripts\score_jd_cv_baseline.py
```
