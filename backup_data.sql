-- ==========================================================================
-- iRSA Database Backup (Exported at 2026-08-28T12:00:11.949177)
-- ==========================================================================

BEGIN;
-- Temporarily disable triggers/foreign keys to avoid constraint issues during bulk insert
SET session_replication_role = 'replica';

-- Data for table: users (2 rows)
INSERT INTO "users" ("id", "email", "password_hash", "full_name", "phone", "role", "avatar_url", "is_active", "created_at", "updated_at", "email_verified", "email_verification_token", "email_verification_sent_at", "password_reset_token", "password_reset_sent_at", "company_code", "approval_status") VALUES
  (1, 'admin@example.com', '$2b$12$qow8IEs5FI2GXg0PIm5exeb9/g3zCzkxHVu7z6xeHffEoN5akfsgi', 'System Admin', NULL, 'admin', NULL, TRUE, '2026-08-28T05:00:21.614688+00:00', NULL, TRUE, NULL, NULL, NULL, NULL, NULL, 'approved'),
  (2, 'nguyenviet2k72k3@gmail.com', '$2b$12$qEauHDqdxd6mZEhK7Jywp.S3J1LyMIyws9Xm8vIJ7Hs.jpVcNw0VO', 'Nguyễn Việt', NULL, 'candidate', NULL, TRUE, '2026-08-28T05:00:21.614688+00:00', NULL, TRUE, NULL, NULL, NULL, NULL, NULL, 'approved')
ON CONFLICT DO NOTHING;

SELECT setval(pg_get_serial_sequence('"users"', 'id'), COALESCE((SELECT MAX(id) FROM "users"), 1), true) WHERE pg_get_serial_sequence('"users"', 'id') IS NOT NULL;


-- Data for table: alembic_version (1 rows)
INSERT INTO "alembic_version" ("version_num") VALUES
  ('023_notifications')
ON CONFLICT DO NOTHING;


-- Re-enable foreign key constraints
SET session_replication_role = 'origin';
COMMIT;
