#!/usr/bin/env python3
"""Setup database tables and upload data files"""

import paramiko
import os
from pathlib import Path

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS...")
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("Connected!")
    
    # 1. Run database migrations
    print("\n1. Running database migrations...")
    commands = [
        ("cd /var/www/growth-compass && npm run migrate", "Running migrations..."),
    ]
    
    for command, description in commands:
        print(f"  {description}")
        stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
        output = stdout.read().decode()
        error = stderr.read().decode()
        if output:
            print(output)
        if error and "npm WARN" not in error:
            print(f"Error: {error}")
    
    # 2. Upload data files using SFTP
    print("\n2. Uploading data files...")
    sftp = ssh.open_sftp()
    
    # Create data directory on VPS
    try:
        sftp.mkdir("/var/www/growth-compass/data-import")
    except:
        pass  # Directory might already exist
    
    # Files to upload
    local_base = Path("/Users/tikaram/Downloads/claude-code/student-growth/growth-compass")
    files_to_upload = [
        "first.xlsx",
        "second.xlsx", 
        "attendance_report.xlsx",
        "student_name.xlsx"
    ]
    
    for filename in files_to_upload:
        local_path = local_base / filename
        remote_path = f"/var/www/growth-compass/data-import/{filename}"
        
        if local_path.exists():
            print(f"  Uploading {filename}...")
            sftp.put(str(local_path), remote_path)
            print(f"    ✅ Uploaded {filename}")
        else:
            print(f"    ⚠️  {filename} not found locally")
    
    # Upload Data folder if it exists
    data_folder = local_base / "Data"
    if data_folder.exists():
        print("\n  Uploading Data folder structure...")
        # Create remote Data directory
        try:
            sftp.mkdir("/var/www/growth-compass/Data")
        except:
            pass
        
        # Upload Srijan's feedback data
        srijan_path = data_folder / "Overall" / "Srijan"
        if srijan_path.exists():
            # Create directory structure
            try:
                sftp.mkdir("/var/www/growth-compass/Data/Overall")
                sftp.mkdir("/var/www/growth-compass/Data/Overall/Srijan")
            except:
                pass
            
            # Upload all files in Srijan folder
            for file in srijan_path.glob("*"):
                if file.is_file():
                    remote_file = f"/var/www/growth-compass/Data/Overall/Srijan/{file.name}"
                    print(f"    Uploading {file.name}...")
                    sftp.put(str(file), remote_file)
    
    sftp.close()
    
    # 3. Create and run data import script on VPS
    print("\n3. Creating data import script on VPS...")
    import_script = """cd /var/www/growth-compass && cat > import-data.js << 'EOF'
const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: 'postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass'
});

async function importData() {
  try {
    console.log('Starting data import...');
    
    // 1. Create Srijan instructor account
    console.log('\\n1. Creating instructor account...');
    const hashedPassword = await bcrypt.hash('password', 10);
    
    await pool.query(`
      INSERT INTO users (id, email, name, password, role, created_at, updated_at)
      VALUES 
        (gen_random_uuid(), 'srijan@capstone.com', 'Srijan', $1, 'instructor', NOW(), NOW()),
        (gen_random_uuid(), 'test@instructor.com', 'Test Instructor', $1, 'instructor', NOW(), NOW())
      ON CONFLICT (email) DO NOTHING
    `, [hashedPassword]);
    
    const instructorResult = await pool.query(
      "SELECT id FROM users WHERE email = 'srijan@capstone.com'"
    );
    const instructorId = instructorResult.rows[0]?.id;
    console.log('  ✅ Instructor created:', instructorId);
    
    // 2. Import courses from first.xlsx
    console.log('\\n2. Importing courses...');
    if (fs.existsSync('data-import/first.xlsx')) {
      const workbook = XLSX.readFile('data-import/first.xlsx');
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(sheet);
      
      for (const row of data) {
        const courseCode = row['Course Code'] || row['Course'];
        const courseName = row['Course Name'] || row['Name'];
        const dayOfWeek = row['Day'] || 'Monday';
        const startTime = row['Time'] || '16:00';
        
        if (courseCode && courseName) {
          await pool.query(`
            INSERT INTO courses (
              id, course_code, name, instructor_id, 
              day_of_week, start_time, status, 
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(), $1, $2, $3, 
              $4, $5, 'active',
              NOW(), NOW()
            ) ON CONFLICT (course_code) DO UPDATE
            SET name = EXCLUDED.name,
                instructor_id = EXCLUDED.instructor_id
          `, [courseCode, courseName, instructorId, dayOfWeek, startTime]);
        }
      }
      console.log('  ✅ Courses imported');
    }
    
    // 3. Import students from second.xlsx
    console.log('\\n3. Importing students and enrollments...');
    if (fs.existsSync('data-import/second.xlsx')) {
      const workbook = XLSX.readFile('data-import/second.xlsx');
      
      for (const sheetName of workbook.SheetNames) {
        const courseCode = sheetName;
        const sheet = workbook.Sheets[sheetName];
        const students = XLSX.utils.sheet_to_json(sheet);
        
        // Get course ID
        const courseResult = await pool.query(
          "SELECT id FROM courses WHERE course_code = $1",
          [courseCode]
        );
        const courseId = courseResult.rows[0]?.id;
        
        if (courseId) {
          for (const student of students) {
            const studentName = student['Student Name'] || student['Name'];
            const studentNumber = student['Student ID'] || student['ID'] || 
                                 Math.random().toString(36).substring(7);
            const gradeLevel = student['Grade'] || 'G7';
            
            if (studentName) {
              // Create user for student
              const userResult = await pool.query(`
                INSERT INTO users (id, email, name, role, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, 'student', NOW(), NOW())
                ON CONFLICT (email) DO UPDATE
                SET name = EXCLUDED.name
                RETURNING id
              `, [`student${studentNumber}@school.com`, studentName]);
              
              const userId = userResult.rows[0].id;
              
              // Create student record
              const studentResult = await pool.query(`
                INSERT INTO students (
                  id, user_id, student_number, grade_level,
                  created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, $3, NOW(), NOW()
                ) ON CONFLICT (student_number) DO UPDATE
                SET grade_level = EXCLUDED.grade_level
                RETURNING id
              `, [userId, studentNumber, gradeLevel]);
              
              const studentId = studentResult.rows[0].id;
              
              // Create enrollment
              await pool.query(`
                INSERT INTO enrollments (
                  id, student_id, course_id, enrollment_date,
                  status, created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, NOW(),
                  'active', NOW(), NOW()
                ) ON CONFLICT (student_id, course_id) DO NOTHING
              `, [studentId, courseId]);
            }
          }
        }
      }
      console.log('  ✅ Students and enrollments imported');
    }
    
    // 4. Generate class sessions
    console.log('\\n4. Generating class sessions...');
    await pool.query(`
      INSERT INTO class_sessions (id, course_id, session_date, created_at, updated_at)
      SELECT 
        gen_random_uuid(),
        id as course_id,
        date_trunc('week', CURRENT_DATE) + 
        CASE day_of_week
          WHEN 'Monday' THEN INTERVAL '0 days'
          WHEN 'Tuesday' THEN INTERVAL '1 days'
          WHEN 'Wednesday' THEN INTERVAL '2 days'
          WHEN 'Thursday' THEN INTERVAL '3 days'
          WHEN 'Friday' THEN INTERVAL '4 days'
          WHEN 'Saturday' THEN INTERVAL '5 days'
          WHEN 'Sunday' THEN INTERVAL '6 days'
        END as session_date,
        NOW(),
        NOW()
      FROM courses
      WHERE status = 'active'
      ON CONFLICT DO NOTHING
    `);
    console.log('  ✅ Class sessions generated');
    
    // 5. Import attendance data
    console.log('\\n5. Importing attendance data...');
    if (fs.existsSync('data-import/attendance_report.xlsx')) {
      const workbook = XLSX.readFile('data-import/attendance_report.xlsx');
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const attendanceData = XLSX.utils.sheet_to_json(sheet);
      
      for (const record of attendanceData) {
        const studentName = record['Student Name'] || record['Name'];
        const attitude = parseFloat(record['Attitude'] || 0);
        const questions = parseFloat(record['Questions'] || 0);
        const skills = parseFloat(record['Skills'] || 0);
        const feedback = parseFloat(record['Feedback'] || 0);
        
        if (studentName && (attitude || questions || skills || feedback)) {
          // Find student
          const studentResult = await pool.query(`
            SELECT s.id, e.course_id 
            FROM students s
            JOIN users u ON s.user_id = u.id
            JOIN enrollments e ON e.student_id = s.id
            WHERE u.name = $1
            LIMIT 1
          `, [studentName]);
          
          if (studentResult.rows.length > 0) {
            const { id: studentId, course_id: courseId } = studentResult.rows[0];
            
            // Get latest session for the course
            const sessionResult = await pool.query(`
              SELECT id FROM class_sessions 
              WHERE course_id = $1 
              ORDER BY session_date DESC 
              LIMIT 1
            `, [courseId]);
            
            if (sessionResult.rows.length > 0) {
              const sessionId = sessionResult.rows[0].id;
              
              await pool.query(`
                INSERT INTO attendances (
                  id, student_id, session_id, status,
                  attitude_efforts, asking_questions,
                  application_skills, application_feedback,
                  created_at, updated_at
                ) VALUES (
                  gen_random_uuid(), $1, $2, 'present',
                  $3, $4, $5, $6,
                  NOW(), NOW()
                ) ON CONFLICT (student_id, session_id) DO UPDATE
                SET attitude_efforts = EXCLUDED.attitude_efforts,
                    asking_questions = EXCLUDED.asking_questions,
                    application_skills = EXCLUDED.application_skills,
                    application_feedback = EXCLUDED.application_feedback
              `, [studentId, sessionId, attitude, questions, skills, feedback]);
            }
          }
        }
      }
      console.log('  ✅ Attendance data imported');
    }
    
    // Final stats
    const stats = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM courses) as courses,
        (SELECT COUNT(*) FROM enrollments) as enrollments,
        (SELECT COUNT(*) FROM class_sessions) as sessions,
        (SELECT COUNT(*) FROM attendances) as attendances
    `);
    
    console.log('\\n📊 Import Statistics:');
    console.log('  Users:', stats.rows[0].users);
    console.log('  Students:', stats.rows[0].students);
    console.log('  Courses:', stats.rows[0].courses);
    console.log('  Enrollments:', stats.rows[0].enrollments);
    console.log('  Sessions:', stats.rows[0].sessions);
    console.log('  Attendances:', stats.rows[0].attendances);
    
    console.log('\\n✅ Data import complete!');
    await pool.end();
  } catch (error) {
    console.error('❌ Import error:', error);
    await pool.end();
    process.exit(1);
  }
}

importData();
EOF
node import-data.js"""
    
    print("  Running data import...")
    stdin, stdout, stderr = ssh.exec_command(import_script, get_pty=True)
    output = stdout.read().decode()
    print(output)
    
    print("\n✅ Database setup and data import complete!")
    print(f"🌐 Application is ready at: http://{VPS_HOST}:9001")
    print("\n📝 Login credentials:")
    print("  Email: srijan@capstone.com")
    print("  Password: password")
    
finally:
    ssh.close()