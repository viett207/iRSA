# Silver job corpora

`open_dataset_jobs_v1.jsonl` contains public-job snapshots with source and QA
limitations recorded on each record. It is not Golden data.

`project_authored_onet_bilingual_v1.jsonl` contains fictional Vietnamese and
English benchmark JDs written by this project with O*NET 30.3 as an attributed
CC BY 4.0 occupational reference. Each record begins as
`pending_human_review`; the matching review queue is stored under `data/labels/`.

Neither corpus may be promoted to `data/golden/` until its relevant review and
promotion gates are satisfied.
