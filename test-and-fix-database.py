#!/usr/bin/env python3
"""Test database data on remote server and fix if needed"""

import paramiko
import sys

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("="*60)
    print("TESTING DATABASE ON REMOTE SERVER")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # 1. Check if PostgreSQL is running
    print("1. CHECKING POSTGRESQL SERVICE")
    print("-"*40)
    
    stdin, stdout, stderr = ssh.exec_command("systemctl status postgresql | grep Active")
    output = stdout.read().decode()
    print(f"PostgreSQL status: {output.strip()}")
    
    if "inactive" in output or "dead" in output:
        print("Starting PostgreSQL...")
        stdin, stdout, stderr = ssh.exec_command("systemctl start postgresql")
        stdout.read()
        stdin, stdout, stderr = ssh.exec_command("systemctl enable postgresql")
        stdout.read()
        print("✅ PostgreSQL started")
    
    # 2. List all databases
    print("\n2. LISTING ALL DATABASES")
    print("-"*40)
    
    stdin, stdout, stderr = ssh.exec_command('sudo -u postgres psql -c "\\l" | grep -E "growth|List"')
    output = stdout.read().decode()
    print(output)
    
    # 3. Check if growth_compass database exists
    print("\n3. CHECKING GROWTH_COMPASS DATABASE")
    print("-"*40)
    
    check_db = """sudo -u postgres psql -c "SELECT datname FROM pg_database WHERE datname = 'growth_compass';" """
    stdin, stdout, stderr = ssh.exec_command(check_db)
    output = stdout.read().decode()
    
    if "growth_compass" not in output:
        print("❌ Database 'growth_compass' does NOT exist!")
        print("Creating database...")
        
        create_db = """sudo -u postgres psql << 'EOF'
CREATE USER growthcompass WITH PASSWORD 'secure_password_123';
CREATE DATABASE growth_compass OWNER growthcompass;
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;
EOF"""
        stdin, stdout, stderr = ssh.exec_command(create_db)
        output = stdout.read().decode()
        print("✅ Database created")
    else:
        print("✅ Database 'growth_compass' exists")
    
    # 4. Check tables in the database
    print("\n4. CHECKING TABLES IN DATABASE")
    print("-"*40)
    
    check_tables = """sudo -u postgres psql growth_compass -c "\\dt" """
    stdin, stdout, stderr = ssh.exec_command(check_tables)
    output = stdout.read().decode()
    
    if "No relations found" in output or "users" not in output:
        print("❌ No tables found in database!")
        print("\nCreating all tables...")
        
        # Create all required tables
        create_tables = """sudo -u postgres psql growth_compass << 'SQLEOF'
-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    password VARCHAR(255),
    role VARCHAR(50) DEFAULT 'student',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    student_number VARCHAR(100) UNIQUE,
    student_id_external VARCHAR(100),
    grade_level VARCHAR(10),
    parent_email VARCHAR(255),
    parent_phone VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50),
    day_of_week VARCHAR(20),
    start_time TIME,
    end_time TIME,
    instructor_id UUID,
    status VARCHAR(50) DEFAULT 'active',
    max_students INTEGER DEFAULT 20,
    current_students INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, course_id)
);

-- Class sessions table
CREATE TABLE IF NOT EXISTS class_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    session_date DATE,
    topic VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(course_id, session_date)
);

-- Attendances table
CREATE TABLE IF NOT EXISTS attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'present',
    attitude_efforts DECIMAL(3,2),
    asking_questions DECIMAL(3,2),
    application_skills DECIMAL(3,2),
    application_feedback DECIMAL(3,2),
    notes TEXT,
    session_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, session_id)
);

-- Parsed student feedback table
CREATE TABLE IF NOT EXISTS parsed_student_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    session_id UUID REFERENCES class_sessions(id),
    course_id UUID REFERENCES courses(id),
    feedback_date DATE,
    speech_topic TEXT,
    motion TEXT,
    side VARCHAR(50),
    speech_type VARCHAR(50),
    content_score DECIMAL(4,2),
    style_score DECIMAL(4,2),
    strategy_score DECIMAL(4,2),
    poi_score DECIMAL(4,2),
    total_score DECIMAL(5,2),
    best_moments TEXT,
    needs_improvement TEXT,
    instructor_name VARCHAR(100),
    raw_scores JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Growth metrics table
CREATE TABLE IF NOT EXISTS growth_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    metric_type VARCHAR(100),
    metric_date DATE,
    value DECIMAL(10,2),
    percentile INTEGER,
    trend VARCHAR(20),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO growthcompass;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO growthcompass;

SELECT 'Tables created' as status;
SQLEOF"""
        
        stdin, stdout, stderr = ssh.exec_command(create_tables)
        output = stdout.read().decode()
        print("✅ Tables created")
    else:
        print("Tables found:")
        print(output)
    
    # 5. Check data in tables
    print("\n5. CHECKING DATA IN TABLES")
    print("-"*40)
    
    check_data = """sudo -u postgres psql growth_compass -t -c "
    SELECT 'users: ' || COUNT(*) FROM users
    UNION ALL SELECT 'students: ' || COUNT(*) FROM students
    UNION ALL SELECT 'courses: ' || COUNT(*) FROM courses
    UNION ALL SELECT 'enrollments: ' || COUNT(*) FROM enrollments
    UNION ALL SELECT 'class_sessions: ' || COUNT(*) FROM class_sessions
    UNION ALL SELECT 'attendances: ' || COUNT(*) FROM attendances
    UNION ALL SELECT 'feedback: ' || COUNT(*) FROM parsed_student_feedback
    UNION ALL SELECT 'growth_metrics: ' || COUNT(*) FROM growth_metrics;
    " """
    
    stdin, stdout, stderr = ssh.exec_command(check_data)
    output = stdout.read().decode()
    print("Current data counts:")
    print(output)
    
    # Check if data is empty
    if "users: 0" in output or "courses: 0" in output:
        print("\n❌ DATABASE IS EMPTY! Need to import data.")
        
        # 6. Check if data files exist
        print("\n6. CHECKING DATA FILES")
        print("-"*40)
        
        stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/growth-compass/*.xlsx 2>/dev/null | head -5")
        files = stdout.read().decode()
        
        if files:
            print("Excel files found:")
            print(files)
            
            # 7. Import data
            print("\n7. IMPORTING DATA")
            print("-"*40)
            
            # First check if import script exists
            stdin, stdout, stderr = ssh.exec_command("ls -la /var/www/growth-compass/import-all-data.js 2>/dev/null")
            import_script = stdout.read().decode()
            
            if "import-all-data.js" in import_script:
                print("Running existing import script...")
                stdin, stdout, stderr = ssh.exec_command("cd /var/www/growth-compass && node import-all-data.js", get_pty=True)
                
                for line in stdout:
                    line = line.strip()
                    if line and ("Created" in line or "Imported" in line or "Error" in line):
                        print(line[:150])
            else:
                print("Import script not found. Need to create it or import manually.")
        else:
            print("No Excel data files found in /var/www/growth-compass/")
            print("Data files need to be uploaded first.")
    
    # 8. Test database connection from Node.js
    print("\n8. TESTING DATABASE FROM NODE.js")
    print("-"*40)
    
    test_node = """cd /var/www/growth-compass && node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass'
});

pool.query('SELECT COUNT(*) as count FROM users', (err, res) => {
  if (err) {
    console.log('❌ Connection failed:', err.message);
  } else {
    console.log('✅ Connected! User count:', res.rows[0].count);
  }
  pool.end();
});
" """
    
    stdin, stdout, stderr = ssh.exec_command(test_node)
    output = stdout.read().decode()
    print(output)
    
    # 9. Run deployment script
    print("\n9. RUNNING DEPLOYMENT SCRIPT")
    print("-"*40)
    
    print("Executing deployment script...")
    stdin, stdout, stderr = ssh.exec_command("cd /var/www/growth-compass && bash deploy.sh", get_pty=True)
    
    for line in stdout:
        line = line.strip()
        if line and not line.startswith("npm"):
            print(line[:150])
    
    # 10. Final verification
    print("\n10. FINAL VERIFICATION")
    print("-"*40)
    
    # Check if app is running
    stdin, stdout, stderr = ssh.exec_command("pm2 list | grep growth-compass")
    pm2_status = stdout.read().decode()
    if "online" in pm2_status:
        print("✅ App is running")
    else:
        print("❌ App is not running")
    
    # Test API endpoint
    stdin, stdout, stderr = ssh.exec_command("curl -s http://localhost:9001/api/courses 2>/dev/null | head -c 200")
    api_response = stdout.read().decode()
    print(f"API Response: {api_response[:200] if api_response else 'No response'}")
    
    # Final data check
    stdin, stdout, stderr = ssh.exec_command("""sudo -u postgres psql growth_compass -t -c "
    SELECT 'Total records: ' || (
        (SELECT COUNT(*) FROM users) + 
        (SELECT COUNT(*) FROM students) + 
        (SELECT COUNT(*) FROM courses)
    );" """)
    total = stdout.read().decode()
    print(f"Database status: {total.strip()}")
    
    print("\n" + "="*60)
    print("TESTING COMPLETE")
    print("="*60)
    
finally:
    ssh.close()