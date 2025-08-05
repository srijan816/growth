# Important Data Notes

## Current Data State
- **94 real students** from uploaded feedback documents
- **1,378 feedback entries** parsed from Word documents
- **0 attendance records** (no real attendance data was uploaded)
- **106 enrollments** linking students to courses

## Why Data Might Disappear

If you notice data disappearing after restart, it could be due to:

1. **Migration Issues**: The file `migrations/20250125_fix_all_schedule_issues.sql` contains DELETE statements that remove class sessions. If this migration reruns, it will delete data.

2. **Database Location**: Your PostgreSQL data is stored at `/opt/homebrew/var/postgresql@14`. Make sure this directory persists between restarts.

3. **Database Connection**: Ensure you're always connecting to the same database (`growth_compass`) and not a different one.

## How to Prevent Data Loss

1. **Check migration status before running**:
   ```bash
   psql -U tikaram -d growth_compass -c "SELECT version FROM schema_migrations ORDER BY executed_at DESC LIMIT 10;"
   ```

2. **Backup your data regularly**:
   ```bash
   pg_dump -U tikaram growth_compass > growth_compass_backup.sql
   ```

3. **Restore from backup if needed**:
   ```bash
   psql -U tikaram -d growth_compass < growth_compass_backup.sql
   ```

## What Data We Have

### Real Student Feedback
- Parsed from Word documents in `data/Overall/` directory
- Contains detailed feedback from instructors (Srijan, Saurav, etc.)
- Includes rubric scores for secondary students
- Includes qualitative feedback for primary students

### No Real Attendance Data
- The system expects attendance data with 4 rating categories:
  - Attitude & Efforts
  - Asking Questions
  - Application of Skills
  - Application of Feedback
- This data was not included in the uploaded files
- Performance metrics depend on this attendance data

## Login Credentials
- Email: `srijan@capstone.com`
- Password: `password`

## If Data Disappears Again

1. Check if migrations ran:
   ```bash
   tail -50 logs/development.log | grep -i migration
   ```

2. Check PostgreSQL is running:
   ```bash
   pg_ctl status
   ```

3. Verify database exists:
   ```bash
   psql -U tikaram -l | grep growth_compass
   ```

4. Count records:
   ```bash
   psql -U tikaram -d growth_compass -c "SELECT COUNT(*) FROM students;"
   psql -U tikaram -d growth_compass -c "SELECT COUNT(*) FROM parsed_student_feedback;"
   ```

## Important Files
- Database migrations: `/migrations/` directory
- Uploaded feedback data: `/data/Overall/` directory
- Database connection: Check `.env.local` for DATABASE_URL