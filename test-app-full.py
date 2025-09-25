#!/usr/bin/env python3
"""Complete testing of Growth Compass app including all pages and functionality"""

import paramiko
import time
import json

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def execute_command(ssh, command):
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    output = stdout.read().decode()
    error = stderr.read().decode()
    return output, error

try:
    print("Connecting to VPS...")
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("Connected! Starting app and testing...")
    
    # Start the app with PM2
    print("\n1. Starting the application...")
    commands = [
        ("pm2 delete growth-compass 2>/dev/null || true", "Cleaning old process..."),
        ("cd /var/www/growth-compass && PORT=9001 HOST=0.0.0.0 pm2 start npm --name growth-compass -- start", "Starting app..."),
        ("pm2 save", "Saving PM2 config..."),
        ("sleep 10", "Waiting for app to start..."),
        ("pm2 status", "Checking PM2 status..."),
    ]
    
    for command, description in commands:
        print(f"  {description}")
        output, error = execute_command(ssh, command)
        if "status" in command:
            print(output)
    
    # Test different pages and API endpoints
    print("\n2. Testing application endpoints...")
    
    test_urls = [
        ("/", "Home page"),
        ("/api/health", "Health check"),
        ("/dashboard", "Dashboard"),
        ("/api/students", "Students API"),
        ("/api/courses", "Courses API"),
        ("/api/classes/weekly", "Weekly classes API"),
        ("/api/classes/today", "Today's classes API"),
        ("/dashboard/students", "Students page"),
        ("/dashboard/today", "Today page"),
        ("/attendance", "Attendance page"),
        ("/recording", "Recording page"),
    ]
    
    print("\n3. Testing each endpoint:")
    for path, description in test_urls:
        print(f"\n  Testing {description} ({path})...")
        cmd = f"curl -s -o /dev/null -w '%{{http_code}}' http://localhost:9001{path}"
        output, error = execute_command(ssh, cmd)
        status_code = output.strip()
        
        if status_code in ['200', '301', '302', '307', '308']:
            print(f"    ✅ {description}: HTTP {status_code} - OK")
        elif status_code == '401':
            print(f"    ⚠️  {description}: HTTP {status_code} - Requires authentication")
        elif status_code == '404':
            print(f"    ❌ {description}: HTTP {status_code} - Not found")
        else:
            print(f"    ⚠️  {description}: HTTP {status_code}")
    
    # Test API with data
    print("\n4. Testing API with POST requests:")
    
    # Test login endpoint
    print("\n  Testing authentication...")
    login_cmd = """curl -X POST http://localhost:9001/api/auth/callback/credentials \
        -H 'Content-Type: application/json' \
        -d '{"email":"srijan@capstone.com","password":"password"}' \
        -s -o /dev/null -w '%{http_code}'"""
    output, error = execute_command(ssh, login_cmd)
    print(f"    Login endpoint: HTTP {output.strip()}")
    
    # Check database connection
    print("\n5. Testing database connection...")
    db_test = """cd /var/www/growth-compass && cat > test-db.js << 'EOF'
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass'
});

async function testDB() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    
    // Check tables
    const tables = await pool.query(`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY tablename
    `);
    console.log('\\n📊 Tables found:', tables.rows.length);
    tables.rows.forEach(t => console.log('  -', t.tablename));
    
    // Check for test data
    const users = await pool.query('SELECT COUNT(*) FROM users');
    console.log('\\n👥 Users count:', users.rows[0].count);
    
    const students = await pool.query('SELECT COUNT(*) FROM students');
    console.log('📚 Students count:', students.rows[0].count);
    
    const courses = await pool.query('SELECT COUNT(*) FROM courses');
    console.log('🎓 Courses count:', courses.rows[0].count);
    
    await pool.end();
  } catch (err) {
    console.error('❌ Database error:', err.message);
  }
}

testDB();
EOF
node test-db.js
rm test-db.js"""
    
    output, error = execute_command(ssh, db_test)
    print(output)
    
    # Check PM2 logs for errors
    print("\n6. Checking application logs for errors...")
    log_cmd = "pm2 logs growth-compass --lines 20 --nostream | grep -i error | head -5"
    output, error = execute_command(ssh, log_cmd)
    if output.strip():
        print("  Recent errors found:")
        print(output[:500])
    else:
        print("  ✅ No recent errors in logs")
    
    # Test external access
    print("\n7. Testing external access...")
    external_test = f"curl -s -o /dev/null -w '%{{http_code}}' http://{VPS_HOST}:9001"
    output, error = execute_command(ssh, external_test)
    status = output.strip()
    if status in ['200', '301', '302', '307', '308']:
        print(f"  ✅ External access working: HTTP {status}")
    else:
        print(f"  ❌ External access issue: HTTP {status}")
    
    # Check port listening
    print("\n8. Checking if port 9001 is listening...")
    port_check = "netstat -tlnp | grep 9001"
    output, error = execute_command(ssh, port_check)
    if "9001" in output:
        print(f"  ✅ Port 9001 is listening:\n    {output.strip()}")
    else:
        print("  ❌ Port 9001 is not listening")
    
    print("\n" + "="*60)
    print("✅ Testing complete!")
    print(f"🌐 Application should be accessible at: http://{VPS_HOST}:9001")
    print("="*60)
    
    # Final PM2 status
    print("\nFinal PM2 Status:")
    output, error = execute_command(ssh, "pm2 status")
    print(output)
    
finally:
    ssh.close()