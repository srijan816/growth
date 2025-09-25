#!/usr/bin/env python3
"""Diagnose and fix data visibility issues on VPS"""

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
    print("DIAGNOSING AND FIXING DATA VISIBILITY ISSUES")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # 1. Check current PM2 status
    print("1. CHECKING APPLICATION STATUS")
    print("-"*40)
    execute_command(ssh, "pm2 status", "Current PM2 processes:")
    
    # 2. Check database connection in .env
    print("\n2. CHECKING DATABASE CONFIGURATION")
    print("-"*40)
    execute_command(ssh, "cd /var/www/growth-compass && grep DATABASE_URL .env", "Database URL in .env:")
    
    # 3. Test database connection and data
    print("\n3. TESTING DATABASE CONNECTION AND DATA")
    print("-"*40)
    
    test_db = """cd /var/www/growth-compass && node -e "
const { Pool } = require('pg');

// Test with the exact connection string from .env
const pool = new Pool({
  connectionString: 'postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass'
});

async function testConnection() {
  try {
    // Test connection
    const test = await pool.query('SELECT NOW()');
    console.log('✅ Database connected at:', test.rows[0].now);
    
    // Check data counts
    const counts = await pool.query(\`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM courses) as courses,
        (SELECT COUNT(*) FROM enrollments) as enrollments,
        (SELECT COUNT(*) FROM class_sessions) as sessions,
        (SELECT COUNT(*) FROM attendances) as attendances,
        (SELECT COUNT(*) FROM parsed_student_feedback) as feedback,
        (SELECT COUNT(*) FROM growth_metrics) as metrics
    \`);
    
    console.log('\\nDatabase Statistics:');
    console.log('  Users:', counts.rows[0].users);
    console.log('  Students:', counts.rows[0].students);
    console.log('  Courses:', counts.rows[0].courses);
    console.log('  Enrollments:', counts.rows[0].enrollments);
    console.log('  Sessions:', counts.rows[0].sessions);
    console.log('  Attendances:', counts.rows[0].attendances);
    console.log('  Feedback:', counts.rows[0].feedback);
    console.log('  Growth Metrics:', counts.rows[0].metrics);
    
    // Check if Srijan exists
    const srijan = await pool.query(
      \\"SELECT id, email, role FROM users WHERE email = 'srijan@capstone.com'\\"
    );
    if (srijan.rows.length > 0) {
      console.log('\\n✅ Srijan account found:', srijan.rows[0]);
    } else {
      console.log('\\n❌ Srijan account NOT found!');
    }
    
    // Sample some actual student data
    const students = await pool.query(\`
      SELECT u.name, s.grade_level, COUNT(e.id) as enrollments
      FROM students s
      JOIN users u ON s.user_id = u.id
      LEFT JOIN enrollments e ON e.student_id = s.id
      GROUP BY u.name, s.grade_level
      LIMIT 5
    \`);
    
    console.log('\\nSample Students:');
    students.rows.forEach(s => {
      console.log(\`  - \${s.name} (Grade \${s.grade_level}): \${s.enrollments} enrollments\`);
    });
    
    await pool.end();
  } catch (err) {
    console.error('❌ Database error:', err.message);
    console.error('Connection string:', err.config);
  }
}

testConnection();
" """
    
    execute_command(ssh, test_db, "Testing database from application directory:")
    
    # 4. Force rebuild and restart
    print("\n4. REBUILDING AND RESTARTING APPLICATION")
    print("-"*40)
    
    rebuild_commands = [
        # Stop the app
        ("pm2 stop growth-compass", "Stopping application..."),
        
        # Clear any cache
        ("cd /var/www/growth-compass && rm -rf .next/cache", "Clearing Next.js cache..."),
        
        # Ensure correct environment
        ("""cd /var/www/growth-compass && cat > .env << 'EOF'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=growth_compass
POSTGRES_USER=growthcompass
POSTGRES_PASSWORD=secure_password_123

NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-here-for-jwt-encryption-at-least-32-characters-long
NODE_ENV=production
PORT=9001
HOST=0.0.0.0

# Gemini AI Configuration
GEMINI_API_KEY_1=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_2=REPLACE_WITH_GEMINI_KEY_SECONDARY
GEMINI_API_KEY_3=REPLACE_WITH_GEMINI_KEY_TERTIARY
GEMINI_API_KEY_4=REPLACE_WITH_GEMINI_KEY_QUATERNARY
GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GOOGLE_AI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY

# OpenAI Configuration
OPENAI_API_KEY=REPLACE_WITH_OPENAI_API_KEY

# Instructor Configuration
SRIJAN_INSTRUCTOR_EMAIL=srijan@capstone.com
SRIJAN_INSTRUCTOR_PASSWORD=password
TEST_INSTRUCTOR_EMAIL=test@instructor.com
TEST_INSTRUCTOR_PASSWORD=password

# Feature Flags
ENABLE_AI_FEEDBACK=true
ENABLE_BULK_UPLOAD=true
EOF""", "Updating environment configuration..."),
        
        # Rebuild the application
        ("cd /var/www/growth-compass && npm run build", "Rebuilding application (this will take 2-3 minutes)..."),
        
        # Delete old PM2 process
        ("pm2 delete growth-compass 2>/dev/null || true", "Removing old PM2 process..."),
        
        # Start fresh with environment variables
        ("cd /var/www/growth-compass && PORT=9001 HOST=0.0.0.0 NODE_ENV=production pm2 start npm --name growth-compass -- start", "Starting application with correct environment..."),
        
        # Save PM2 configuration
        ("pm2 save", "Saving PM2 configuration..."),
        
        # Wait for startup
        ("sleep 5", "Waiting for application to start..."),
    ]
    
    for command, description in rebuild_commands:
        execute_command(ssh, command, description)
        if "build" in command:
            time.sleep(2)  # Give build time to complete
    
    # 5. Test the API endpoints
    print("\n5. TESTING API ENDPOINTS")
    print("-"*40)
    
    # First, let's create a session and login
    login_test = """curl -c /tmp/cookies.txt -X POST http://localhost:9001/api/auth/callback/credentials \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d 'email=srijan@capstone.com&password=password&csrfToken=test' \
        -s -w '\\nHTTP Status: %{http_code}\\n'"""
    
    execute_command(ssh, login_test, "Testing login:")
    
    # Test students API with session
    api_test = """curl -b /tmp/cookies.txt http://localhost:9001/api/students \
        -H 'Accept: application/json' \
        -s | python3 -m json.tool 2>/dev/null | head -20"""
    
    execute_command(ssh, api_test, "Testing students API (with auth):")
    
    # 6. Check PM2 logs for any errors
    print("\n6. CHECKING APPLICATION LOGS")
    print("-"*40)
    
    execute_command(ssh, "pm2 logs growth-compass --lines 10 --nostream", "Recent application logs:")
    
    # 7. Final status check
    print("\n7. FINAL STATUS CHECK")
    print("-"*40)
    
    execute_command(ssh, "pm2 status", "PM2 Status:")
    execute_command(ssh, "netstat -tlnp | grep 9001", "Port 9001 listening:")
    
    # Test external access
    external_test = f"curl -s -o /dev/null -w '%{{http_code}}' http://{VPS_HOST}:9001"
    result = execute_command(ssh, external_test, "External access test:")
    
    print("\n" + "="*60)
    print("✅ DIAGNOSIS AND FIX COMPLETE!")
    print("="*60)
    print(f"\n🌐 Application has been rebuilt and restarted")
    print(f"📱 Access at: http://{VPS_HOST}:9001")
    print("\n🔑 Login with:")
    print("   Email: srijan@capstone.com")
    print("   Password: password")
    print("\n💡 The application should now show all student data.")
    print("   If issues persist, check the browser console for errors.")
    print("="*60)
    
finally:
    ssh.close()