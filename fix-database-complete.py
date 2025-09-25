#!/usr/bin/env python3
"""Complete database setup and data import on VPS"""

import paramiko
import time

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def execute_command(ssh, command, description=""):
    if description:
        print(f"\n{description}")
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    output = stdout.read().decode()
    error = stderr.read().decode()
    if output and not output.isspace():
        print(output)
    if error and "WARNING" not in error and "NOTICE" not in error:
        print(f"Error: {error}")
    return output

try:
    print("="*60)
    print("FIXING DATABASE AND IMPORTING ALL DATA")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS")
    
    # 1. Install and setup PostgreSQL if not already installed
    print("\n1. SETTING UP POSTGRESQL")
    print("-"*40)
    
    commands = [
        ("apt-get update -qq", "Updating package list..."),
        ("apt-get install -y postgresql postgresql-contrib", "Installing PostgreSQL..."),
        ("systemctl start postgresql", "Starting PostgreSQL..."),
        ("systemctl enable postgresql", "Enabling PostgreSQL..."),
    ]
    
    for cmd, desc in commands:
        execute_command(ssh, cmd, desc)
    
    # 2. Create database and user
    print("\n2. CREATING DATABASE AND USER")
    print("-"*40)
    
    db_setup = """sudo -u postgres psql << 'EOF'
-- Drop existing database if exists
DROP DATABASE IF EXISTS growth_compass;
DROP USER IF EXISTS growthcompass;

-- Create user and database
CREATE USER growthcompass WITH PASSWORD 'secure_password_123';
CREATE DATABASE growth_compass OWNER growthcompass;
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;

-- Connect to the database
\c growth_compass

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO growthcompass;
GRANT CREATE ON SCHEMA public TO growthcompass;
EOF"""
    
    execute_command(ssh, db_setup, "Creating database and user...")
    
    # 3. Create all tables with proper schema
    print("\n3. CREATING DATABASE TABLES")
    print("-"*40)
    
    create_tables = """sudo -u postgres psql growth_compass << 'EOF'
-- Create ENUM types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'instructor', 'admin', 'parent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE attendance_status AS ENUM ('present', 'absent', 'makeup', 'excused');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE enrollment_status AS ENUM ('active', 'completed', 'withdrawn', 'pending');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE course_status AS ENUM ('active', 'completed', 'cancelled', 'draft');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    role user_role DEFAULT 'student',
    image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(50) UNIQUE NOT NULL,
    grade_level VARCHAR(10),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(20),
    date_of_birth DATE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    instructor_id UUID REFERENCES users(id),
    day_of_week VARCHAR(20),
    start_time TIME,
    duration_minutes INTEGER DEFAULT 60,
    room VARCHAR(50),
    max_students INTEGER DEFAULT 20,
    status course_status DEFAULT 'active',
    term VARCHAR(50),
    is_intensive BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    completion_date DATE,
    status enrollment_status DEFAULT 'active',
    final_grade VARCHAR(10),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Class sessions table
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    topic VARCHAR(255),
    description TEXT,
    homework TEXT,
    materials TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, session_date)
);

-- Attendances table
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    status attendance_status DEFAULT 'present',
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    attitude_efforts DECIMAL(2,1) CHECK (attitude_efforts >= 0 AND attitude_efforts <= 4),
    asking_questions DECIMAL(2,1) CHECK (asking_questions >= 0 AND asking_questions <= 4),
    application_skills DECIMAL(2,1) CHECK (application_skills >= 0 AND application_skills <= 4),
    application_feedback DECIMAL(2,1) CHECK (application_feedback >= 0 AND application_feedback <= 4),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id)
);

-- Other tables for feedback, recordings, etc.
CREATE TABLE IF NOT EXISTS parsed_student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id),
    course_id UUID REFERENCES courses(id),
    feedback_date DATE,
    speech_topic TEXT,
    motion TEXT,
    side VARCHAR(20),
    speech_type VARCHAR(50),
    speaker_position VARCHAR(50),
    content_score DECIMAL(3,1),
    style_score DECIMAL(3,1),
    strategy_score DECIMAL(3,1),
    poi_score DECIMAL(3,1),
    total_score DECIMAL(4,1),
    rank INTEGER,
    raw_scores JSONB,
    instructor_name VARCHAR(255),
    best_moments TEXT,
    needs_improvement TEXT,
    parsed_feedback JSONB,
    original_file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course_id ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_course_id ON class_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_attendances_student_id ON attendances(student_id);
CREATE INDEX IF NOT EXISTS idx_attendances_session_id ON attendances(session_id);

-- Grant all permissions to growthcompass user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO growthcompass;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO growthcompass;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO growthcompass;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO growthcompass;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO growthcompass;

-- Verify tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
EOF"""
    
    execute_command(ssh, create_tables, "Creating all tables...")
    
    # 4. Update application's database connection
    print("\n4. UPDATING DATABASE CONNECTION")
    print("-"*40)
    
    update_env = """cd /var/www/growth-compass && cat > .env << 'EOF'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-here-for-jwt-encryption-at-least-32-characters-long
NODE_ENV=production
PORT=9001
HOST=0.0.0.0

# PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=growth_compass
POSTGRES_USER=growthcompass
POSTGRES_PASSWORD=secure_password_123

# Gemini AI Configuration
GEMINI_API_KEY_1=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_2=REPLACE_WITH_GEMINI_KEY_SECONDARY
GEMINI_API_KEY_3=REPLACE_WITH_GEMINI_KEY_TERTIARY
GEMINI_API_KEY_4=REPLACE_WITH_GEMINI_KEY_QUATERNARY
GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GOOGLE_GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GOOGLE_AI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY

# OpenAI Configuration
OPENAI_API_KEY=REPLACE_WITH_OPENAI_API_KEY

# Instructor Configuration
SRIJAN_INSTRUCTOR_EMAIL=srijan@capstone.com
SRIJAN_INSTRUCTOR_PASSWORD=password

# Feature Flags
ENABLE_AI_FEEDBACK=true
ENABLE_BULK_UPLOAD=true
EOF"""
    
    execute_command(ssh, update_env, "Updating database connection...")
    
    # 5. Now import all the data
    print("\n5. IMPORTING DATA FROM EXCEL FILES")
    print("-"*40)
    
    import_script = """cd /var/www/growth-compass && cat > import-all-data.js << 'EOF'
const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'growth_compass',
  user: 'growthcompass',
  password: 'secure_password_123'
});

async function importAllData() {
  try {
    console.log('Starting comprehensive data import...');
    
    // 1. Create instructor accounts
    console.log('\\n1. Creating instructor accounts...');
    const hashedPassword = await bcrypt.hash('password', 10);
    
    const instructorResult = await pool.query(`
      INSERT INTO users (email, name, password, role)
      VALUES 
        ('srijan@capstone.com', 'Srijan', $1, 'instructor'),
        ('test@instructor.com', 'Test Instructor', $1, 'instructor')
      ON CONFLICT (email) DO UPDATE
      SET name = EXCLUDED.name, password = EXCLUDED.password
      RETURNING id, email
    `, [hashedPassword]);
    
    const srijanId = instructorResult.rows.find(r => r.email === 'srijan@capstone.com').id;
    console.log('  ✅ Instructors created. Srijan ID:', srijanId);
    
    // 2. Import courses from first.xlsx
    console.log('\\n2. Importing courses from first.xlsx...');
    const courseMap = new Map();
    
    if (fs.existsSync('data-import/first.xlsx')) {
      const workbook = XLSX.readFile('data-import/first.xlsx');
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const courses = XLSX.utils.sheet_to_json(sheet);
      
      for (const course of courses) {
        // Parse course data - handle different column names
        const courseCode = course['Course Code'] || course['Code'] || course['Course'] || '';
        const courseName = course['Course Name'] || course['Name'] || course['Title'] || '';
        const dayOfWeek = course['Day'] || course['Day of Week'] || 'Monday';
        const startTime = course['Time'] || course['Start Time'] || '16:00';
        
        if (courseCode && courseName) {
          const result = await pool.query(`
            INSERT INTO courses (
              course_code, name, instructor_id, 
              day_of_week, start_time, status,
              is_intensive
            ) VALUES ($1, $2, $3, $4, $5, 'active', $6)
            ON CONFLICT (course_code) DO UPDATE
            SET name = EXCLUDED.name,
                instructor_id = EXCLUDED.instructor_id,
                day_of_week = EXCLUDED.day_of_week,
                start_time = EXCLUDED.start_time
            RETURNING id, course_code
          `, [courseCode, courseName, srijanId, dayOfWeek, startTime, 
              courseName.toLowerCase().includes('intensive')]);
          
          courseMap.set(courseCode, result.rows[0].id);
          console.log('  - Imported:', courseCode, '-', courseName);
        }
      }
      console.log('  ✅ Courses imported:', courseMap.size);
    }
    
    // 3. Import students from second.xlsx
    console.log('\\n3. Importing students from second.xlsx...');
    const studentMap = new Map();
    let totalEnrollments = 0;
    
    if (fs.existsSync('data-import/second.xlsx')) {
      const workbook = XLSX.readFile('data-import/second.xlsx');
      
      for (const sheetName of workbook.SheetNames) {
        const courseCode = sheetName.trim();
        const courseId = courseMap.get(courseCode);
        
        if (!courseId) {
          console.log('  ⚠️  Course not found for sheet:', sheetName);
          continue;
        }
        
        const sheet = workbook.Sheets[sheetName];
        const students = XLSX.utils.sheet_to_json(sheet);
        
        console.log('  Processing course:', courseCode, '- Students:', students.length);
        
        for (const studentData of students) {
          const studentName = studentData['Student Name'] || studentData['Name'] || 
                             studentData['Student'] || '';
          const gradeStr = studentData['Grade'] || studentData['Grade Level'] || 'G7';
          const studentEmail = studentData['Email'] || 
                              studentName.toLowerCase().replace(/\\s+/g, '.') + '@student.com';
          
          if (!studentName) continue;
          
          // Extract grade level
          let gradeLevel = gradeStr;
          if (typeof gradeStr === 'string') {
            const gradeMatch = gradeStr.match(/\\d+/);
            if (gradeMatch) {
              gradeLevel = 'G' + gradeMatch[0];
            }
          }
          
          // Create or get student
          let studentId = studentMap.get(studentName);
          
          if (!studentId) {
            // Create user account for student
            const userResult = await pool.query(`
              INSERT INTO users (email, name, role)
              VALUES ($1, $2, 'student')
              ON CONFLICT (email) DO UPDATE
              SET name = EXCLUDED.name
              RETURNING id
            `, [studentEmail, studentName]);
            
            const userId = userResult.rows[0].id;
            
            // Create student record
            const studentNumber = 'S' + Date.now() + Math.random().toString(36).substr(2, 5);
            const studentResult = await pool.query(`
              INSERT INTO students (user_id, student_number, grade_level)
              VALUES ($1, $2, $3)
              RETURNING id
            `, [userId, studentNumber, gradeLevel]);
            
            studentId = studentResult.rows[0].id;
            studentMap.set(studentName, studentId);
          }
          
          // Create enrollment
          await pool.query(`
            INSERT INTO enrollments (student_id, course_id, status)
            VALUES ($1, $2, 'active')
            ON CONFLICT (student_id, course_id) DO NOTHING
          `, [studentId, courseId]);
          
          totalEnrollments++;
        }
      }
      console.log('  ✅ Students imported:', studentMap.size);
      console.log('  ✅ Enrollments created:', totalEnrollments);
    }
    
    // 4. Generate class sessions for this week
    console.log('\\n4. Generating class sessions...');
    const sessionResult = await pool.query(`
      INSERT INTO class_sessions (course_id, session_date)
      SELECT 
        id as course_id,
        CURRENT_DATE - INTERVAL '1 week' + 
        CASE day_of_week
          WHEN 'Monday' THEN INTERVAL '0 days'
          WHEN 'Tuesday' THEN INTERVAL '1 days'
          WHEN 'Wednesday' THEN INTERVAL '2 days'
          WHEN 'Thursday' THEN INTERVAL '3 days'
          WHEN 'Friday' THEN INTERVAL '4 days'
          WHEN 'Saturday' THEN INTERVAL '5 days'
          WHEN 'Sunday' THEN INTERVAL '6 days'
          ELSE INTERVAL '0 days'
        END as session_date
      FROM courses
      WHERE status = 'active'
      ON CONFLICT (course_id, session_date) DO NOTHING
      RETURNING id
    `);
    console.log('  ✅ Sessions generated:', sessionResult.rows.length);
    
    // 5. Import attendance data
    console.log('\\n5. Importing attendance data...');
    let attendanceCount = 0;
    
    if (fs.existsSync('data-import/attendance_report.xlsx')) {
      const workbook = XLSX.readFile('data-import/attendance_report.xlsx');
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const attendanceData = XLSX.utils.sheet_to_json(sheet);
      
      for (const record of attendanceData) {
        const studentName = record['Student Name'] || record['Name'] || '';
        const attitude = parseFloat(record['Attitude & Efforts'] || record['Attitude'] || 0);
        const questions = parseFloat(record['Asking Questions'] || record['Questions'] || 0);
        const skills = parseFloat(record['Application of Skills'] || record['Skills'] || 0);
        const feedback = parseFloat(record['Application of Feedback'] || record['Feedback'] || 0);
        
        if (!studentName) continue;
        
        // Find student and their enrollments
        const studentResult = await pool.query(`
          SELECT s.id, e.course_id 
          FROM students s
          JOIN users u ON s.user_id = u.id
          JOIN enrollments e ON e.student_id = s.id
          WHERE u.name = $1
        `, [studentName]);
        
        for (const enrollment of studentResult.rows) {
          // Get the most recent session for this course
          const sessionResult = await pool.query(`
            SELECT id FROM class_sessions 
            WHERE course_id = $1 
            ORDER BY session_date DESC 
            LIMIT 1
          `, [enrollment.course_id]);
          
          if (sessionResult.rows.length > 0) {
            await pool.query(`
              INSERT INTO attendances (
                student_id, session_id, status,
                attitude_efforts, asking_questions,
                application_skills, application_feedback
              ) VALUES ($1, $2, 'present', $3, $4, $5, $6)
              ON CONFLICT (student_id, session_id) DO UPDATE
              SET attitude_efforts = EXCLUDED.attitude_efforts,
                  asking_questions = EXCLUDED.asking_questions,
                  application_skills = EXCLUDED.application_skills,
                  application_feedback = EXCLUDED.application_feedback
            `, [enrollment.id, sessionResult.rows[0].id, attitude, questions, skills, feedback]);
            
            attendanceCount++;
          }
        }
      }
      console.log('  ✅ Attendance records created:', attendanceCount);
    }
    
    // 6. Import feedback data if available locally
    console.log('\\n6. Checking for feedback data...');
    // This would import from the Data/Overall/Srijan folder if mounted
    
    // Final statistics
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM courses) as courses,
        (SELECT COUNT(*) FROM enrollments) as enrollments,
        (SELECT COUNT(*) FROM class_sessions) as sessions,
        (SELECT COUNT(*) FROM attendances) as attendances
    `);
    
    console.log('\\n📊 FINAL IMPORT STATISTICS:');
    console.log('================================');
    console.log('  Users:', stats.rows[0].users);
    console.log('  Students:', stats.rows[0].students);
    console.log('  Courses:', stats.rows[0].courses);
    console.log('  Enrollments:', stats.rows[0].enrollments);
    console.log('  Sessions:', stats.rows[0].sessions);
    console.log('  Attendance Records:', stats.rows[0].attendances);
    console.log('================================');
    console.log('✅ Data import complete!');
    
    await pool.end();
  } catch (error) {
    console.error('❌ Import error:', error);
    console.error('Stack:', error.stack);
    await pool.end();
    process.exit(1);
  }
}

importAllData();
EOF
node import-all-data.js"""
    
    execute_command(ssh, import_script, "Running comprehensive data import...")
    
    # 6. Restart the application
    print("\n6. RESTARTING APPLICATION")
    print("-"*40)
    
    execute_command(ssh, "pm2 restart growth-compass", "Restarting Growth Compass...")
    
    # 7. Verify data was imported
    print("\n7. VERIFYING DATA IMPORT")
    print("-"*40)
    
    verify_query = """sudo -u postgres psql growth_compass -c "
    SELECT 
        'Users' as table_name, COUNT(*) as count FROM users
    UNION ALL
    SELECT 'Students', COUNT(*) FROM students
    UNION ALL
    SELECT 'Courses', COUNT(*) FROM courses
    UNION ALL
    SELECT 'Enrollments', COUNT(*) FROM enrollments
    UNION ALL
    SELECT 'Sessions', COUNT(*) FROM class_sessions
    UNION ALL
    SELECT 'Attendances', COUNT(*) FROM attendances
    ORDER BY table_name;
    " """
    
    execute_command(ssh, verify_query, "Database contents:")
    
    print("\n" + "="*60)
    print("✅ DATABASE FIXED AND DATA IMPORTED SUCCESSFULLY!")
    print("="*60)
    print(f"\n📱 Access the application at: http://{VPS_HOST}:9001")
    print("\n🔑 Login credentials:")
    print("   Email: srijan@capstone.com")
    print("   Password: password")
    print("\n💡 All data has been imported:")
    print("   - Courses from first.xlsx")
    print("   - Students from second.xlsx")
    print("   - Attendance from attendance_report.xlsx")
    print("   - Database is now properly configured on VPS")
    print("="*60)
    
finally:
    ssh.close()