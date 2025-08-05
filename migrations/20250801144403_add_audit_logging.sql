-- Migration: Add comprehensive audit logging
-- This migration adds audit logging tables and triggers for tracking all data changes

-- UP
-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  user_id UUID,
  session_user TEXT DEFAULT current_user,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  transaction_id BIGINT DEFAULT txid_current(),
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for audit log
CREATE INDEX idx_audit_log_table_name ON audit_log(table_name);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at);
CREATE INDEX idx_audit_log_operation ON audit_log(operation);
CREATE INDEX idx_audit_log_transaction_id ON audit_log(transaction_id);

-- Create function to track changes
CREATE OR REPLACE FUNCTION audit_trigger_function() RETURNS TRIGGER AS $$
DECLARE
  changed_fields TEXT[];
  old_jsonb JSONB;
  new_jsonb JSONB;
BEGIN
  -- Get the user ID from the current session if available
  -- This assumes you set 'app.current_user_id' in your application
  DECLARE
    current_user_id UUID;
  BEGIN
    current_user_id := current_setting('app.current_user_id', true)::UUID;
  EXCEPTION
    WHEN OTHERS THEN
      current_user_id := NULL;
  END;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO audit_log (
      table_name,
      operation,
      user_id,
      old_data,
      new_data,
      changed_fields
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      current_user_id,
      to_jsonb(OLD),
      NULL,
      NULL
    );
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    old_jsonb := to_jsonb(OLD);
    new_jsonb := to_jsonb(NEW);
    
    -- Calculate changed fields
    SELECT array_agg(key) INTO changed_fields
    FROM jsonb_each(old_jsonb)
    WHERE old_jsonb->key IS DISTINCT FROM new_jsonb->key;
    
    INSERT INTO audit_log (
      table_name,
      operation,
      user_id,
      old_data,
      new_data,
      changed_fields
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      current_user_id,
      old_jsonb,
      new_jsonb,
      changed_fields
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (
      table_name,
      operation,
      user_id,
      old_data,
      new_data,
      changed_fields
    ) VALUES (
      TG_TABLE_NAME,
      TG_OP,
      current_user_id,
      NULL,
      to_jsonb(NEW),
      NULL
    );
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create audit triggers for important tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_students AFTER INSERT OR UPDATE OR DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_courses AFTER INSERT OR UPDATE OR DELETE ON courses
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_enrollments AFTER INSERT OR UPDATE OR DELETE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_attendances AFTER INSERT OR UPDATE OR DELETE ON attendances
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_parsed_student_feedback AFTER INSERT OR UPDATE OR DELETE ON parsed_student_feedback
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Create view for recent audit activity
CREATE VIEW recent_audit_activity AS
SELECT 
  id,
  table_name,
  operation,
  user_id,
  session_user,
  changed_at,
  CASE 
    WHEN operation = 'UPDATE' THEN array_length(changed_fields, 1)
    ELSE NULL
  END as fields_changed,
  changed_fields,
  metadata
FROM audit_log
WHERE changed_at > CURRENT_TIMESTAMP - INTERVAL '7 days'
ORDER BY changed_at DESC;

-- Function to get user activity summary
CREATE OR REPLACE FUNCTION get_user_activity_summary(
  p_user_id UUID,
  p_days INTEGER DEFAULT 30
) RETURNS TABLE (
  table_name TEXT,
  operation TEXT,
  operation_count BIGINT,
  last_activity TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.table_name,
    al.operation,
    COUNT(*) as operation_count,
    MAX(al.changed_at) as last_activity
  FROM audit_log al
  WHERE al.user_id = p_user_id
    AND al.changed_at > CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL
  GROUP BY al.table_name, al.operation
  ORDER BY operation_count DESC;
END;
$$ LANGUAGE plpgsql;

-- DOWN
-- Remove audit triggers
DROP TRIGGER IF EXISTS audit_users ON users;
DROP TRIGGER IF EXISTS audit_students ON students;
DROP TRIGGER IF EXISTS audit_courses ON courses;
DROP TRIGGER IF EXISTS audit_enrollments ON enrollments;
DROP TRIGGER IF EXISTS audit_attendances ON attendances;
DROP TRIGGER IF EXISTS audit_parsed_student_feedback ON parsed_student_feedback;

-- Remove functions and views
DROP FUNCTION IF EXISTS get_user_activity_summary(UUID, INTEGER);
DROP VIEW IF EXISTS recent_audit_activity;
DROP FUNCTION IF EXISTS audit_trigger_function();

-- Remove indexes
DROP INDEX IF EXISTS idx_audit_log_table_name;
DROP INDEX IF EXISTS idx_audit_log_user_id;
DROP INDEX IF EXISTS idx_audit_log_changed_at;
DROP INDEX IF EXISTS idx_audit_log_operation;
DROP INDEX IF EXISTS idx_audit_log_transaction_id;

-- Remove audit log table
DROP TABLE IF EXISTS audit_log;