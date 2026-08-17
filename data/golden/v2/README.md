# Golden v2 promotion gate

Production Golden data may be placed in this directory only after a batch
satisfies all gates:

1. Full provenance: source, source URL/ID, collection time, terms or permission reference, and raw checksum.
2. Valid bilingual schema with original-language text retained.
3. Deduplication and manual QA completed.
4. Candidate data has documented consent and is PII-redacted for agent use.
5. Real recruiter-reviewed job--candidate labels exist for the evaluation split.
