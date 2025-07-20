-- Rename sessions table to class_sessions
ALTER TABLE sessions RENAME TO class_sessions;

-- Update any foreign key constraints that reference the old table name
-- The constraints should automatically update with the table rename, but we'll verify constraint names

-- Update indexes if they have table-specific names
ALTER INDEX IF EXISTS sessions_pkey RENAME TO class_sessions_pkey;
ALTER INDEX IF EXISTS sessions_course_id_idx RENAME TO class_sessions_course_id_idx;
ALTER INDEX IF EXISTS sessions_session_date_idx RENAME TO class_sessions_session_date_idx;