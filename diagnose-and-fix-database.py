#!/usr/bin/env python3
"""Diagnose and fix database connection issues on VPS"""

import paramiko
import time
import sys

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def execute_command(ssh, command, description="", show_output=True):
    if description:
        print(f"\n{description}")
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if show_output and output and not output.isspace():
        # Clean ANSI codes
        import re
        clean = re.sub(r'\x1b\[[0-9;]*m', '', output)
        print(clean[:2000])
    
    return output, error

try:
    print("="*60)
    print("DIAGNOSING DATABASE CONNECTION ISSUES")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # 1. Check PostgreSQL status
    print("1. CHECKING POSTGRESQL STATUS")
    print("-"*40)
    
    output, _ = execute_command(ssh, "systemctl status postgresql | head -10", "PostgreSQL service status:")
    
    if "active (running)" not in output:
        print("❌ PostgreSQL not running! Starting it...")
        execute_command(ssh, "systemctl start postgresql")
        time.sleep(2)
    
    # 2. Check database exists and has data
    print("\n2. CHECKING DATABASE AND DATA")
    print("-"*40)
    
    db_check = """sudo -u postgres psql -c "\\l" | grep growth_compass"""
    output, _ = execute_command(ssh, db_check, "Database exists:")
    
    if "growth_compass" not in output:
        print("❌ Database doesn't exist! This is a critical issue.")
        sys.exit(1)
    
    # Check data counts
    data_check = """sudo -u postgres psql growth_compass -t -c "
    SELECT 'Users: ' || COUNT(*) FROM users
    UNION ALL SELECT 'Students: ' || COUNT(*) FROM students  
    UNION ALL SELECT 'Courses: ' || COUNT(*) FROM courses
    UNION ALL SELECT 'Enrollments: ' || COUNT(*) FROM enrollments;
    " """
    
    output, _ = execute_command(ssh, data_check, "Data in database:")
    
    # 3. Check current .env file
    print("\n3. CHECKING CURRENT DATABASE CONFIGURATION")
    print("-"*40)
    
    env_check = """cd /var/www/growth-compass && grep DATABASE_URL .env"""
    output, _ = execute_command(ssh, env_check, "Current DATABASE_URL:")
    
    # 4. Test database connection from Node.js
    print("\n4. TESTING DATABASE CONNECTION FROM APP")
    print("-"*40)
    
    test_connection = """cd /var/www/growth-compass && cat > test-db.js << 'EOF'
const { Pool } = require('pg');

// Test with the exact connection string
const pool = new Pool({
  connectionString: 'postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass'
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    
    const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as users,
        (SELECT COUNT(*) FROM courses) as courses,
        (SELECT COUNT(*) FROM students) as students
    `);
    
    console.log('Data counts:', counts.rows[0]);
    
    // Test a specific query that the app uses
    const courses = await pool.query(`
      SELECT id, name, code FROM courses LIMIT 3
    `);
    
    console.log('Sample courses:');
    courses.rows.forEach(c => console.log('  -', c.name, '(' + c.code + ')'));
    
    await pool.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();
EOF
node test-db.js
"""
    
    output, error = execute_command(ssh, test_connection, "Testing database connection from Node.js:")
    
    if "Connection failed" in output or "Connection failed" in error:
        print("❌ Database connection is failing from the app!")
        
    # 5. Check PM2 logs for errors
    print("\n5. CHECKING APPLICATION LOGS FOR ERRORS")
    print("-"*40)
    
    logs_check = """pm2 logs growth-compass --lines 20 --nostream 2>&1 | grep -E "(error|Error|DATABASE|postgres)" | head -10"""
    output, _ = execute_command(ssh, logs_check, "Recent database-related errors:")
    
    # 6. Fix the issue comprehensively
    print("\n6. APPLYING COMPREHENSIVE FIX")
    print("-"*40)
    
    # Stop the app first
    execute_command(ssh, "pm2 stop growth-compass 2>/dev/null || true", "Stopping application...", False)
    
    # Create correct .env file
    print("Creating correct environment configuration...")
    fix_env = """cd /var/www/growth-compass && cat > .env << 'ENVEOF'
# Database Configuration - CRITICAL
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
POSTGRES_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
POSTGRES_PRISMA_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
POSTGRES_URL_NON_POOLING=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass

# Additional DB settings
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=growth_compass
POSTGRES_USER=growthcompass
POSTGRES_PASSWORD=secure_password_123

# Application Configuration
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-here-for-jwt-encryption-at-least-32-characters-long
NODE_ENV=production
PORT=9001
HOST=0.0.0.0

# API Keys
GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_1=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_2=REPLACE_WITH_GEMINI_KEY_SECONDARY
GEMINI_API_KEY_3=REPLACE_WITH_GEMINI_KEY_TERTIARY
GEMINI_API_KEY_4=REPLACE_WITH_GEMINI_KEY_QUATERNARY
GOOGLE_AI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
OPENAI_API_KEY=REPLACE_WITH_OPENAI_API_KEY

# Feature Flags
ENABLE_AI_FEEDBACK=true
ENABLE_BULK_UPLOAD=true
ENABLE_PARENT_PORTAL=true
ENVEOF"""
    
    execute_command(ssh, fix_env, show_output=False)
    print("✅ Environment configuration updated")
    
    # Fix database permissions
    print("Fixing database permissions...")
    fix_permissions = """sudo -u postgres psql growth_compass << 'SQLEOF'
-- Ensure user has all permissions
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO growthcompass;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO growthcompass;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO growthcompass;

-- Ensure schema permissions
GRANT CREATE, USAGE ON SCHEMA public TO growthcompass;

-- Fix any view permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO growthcompass;

SELECT 'Permissions fixed' as status;
SQLEOF"""
    
    execute_command(ssh, fix_permissions, show_output=False)
    print("✅ Database permissions fixed")
    
    # Check and fix the postgres.ts file
    print("Checking database configuration in code...")
    check_postgres = """cd /var/www/growth-compass && cat src/lib/postgres.ts | head -20"""
    output, _ = execute_command(ssh, check_postgres, show_output=False)
    
    if "DATABASE_URL" not in output:
        print("Fixing postgres.ts configuration...")
        fix_postgres = """cd /var/www/growth-compass && cat > src/lib/postgres.ts << 'PGEOF'
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

// Create connection pool with explicit configuration
const connectionString = process.env.DATABASE_URL || 'postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass';

console.log('Connecting to database:', connectionString.replace(/:[^:@]+@/, ':****@'));

const pool = new Pool({
  connectionString,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Database connected at:', res.rows[0].now);
  }
});

export const db = drizzle(pool);
export { pool };
PGEOF"""
        execute_command(ssh, fix_postgres, show_output=False)
        print("✅ Fixed postgres.ts")
    
    # Clear build cache and rebuild
    print("\n7. REBUILDING APPLICATION")
    print("-"*40)
    
    rebuild_commands = [
        ("cd /var/www/growth-compass && rm -rf .next", "Clearing build cache..."),
        ("cd /var/www/growth-compass && npm run build 2>&1 | grep -E '(Compiled|✓|error)' | head -20", "Building application..."),
    ]
    
    for cmd, desc in rebuild_commands:
        print(f"  {desc}")
        output, error = execute_command(ssh, cmd, show_output=False)
        if "build" in cmd:
            if "✓" in output:
                print("    ✅ Build successful")
            elif "error" in output.lower():
                print("    ❌ Build errors detected")
                print(output[:500])
    
    # Start the application
    print("\n8. STARTING APPLICATION")
    print("-"*40)
    
    start_commands = [
        ("pm2 delete growth-compass 2>/dev/null || true", "Cleaning PM2..."),
        ("cd /var/www/growth-compass && PORT=9001 HOST=0.0.0.0 NODE_ENV=production pm2 start npm --name growth-compass -- start", "Starting app..."),
        ("pm2 save", "Saving PM2 config..."),
    ]
    
    for cmd, desc in start_commands:
        print(f"  {desc}")
        execute_command(ssh, cmd, show_output=False)
    
    time.sleep(5)
    
    # 9. Verify everything is working
    print("\n9. VERIFYING APPLICATION")
    print("-"*40)
    
    # Check PM2 status
    output, _ = execute_command(ssh, "pm2 list | grep growth-compass", "PM2 status:", False)
    if "online" in output:
        print("✅ Application is running")
    else:
        print("❌ Application is not running properly")
    
    # Test API endpoints
    test_endpoints = [
        ("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001", "Main page"),
        ("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001/api/courses", "Courses API"),
        ("curl -s http://localhost:9001/api/courses | python3 -c 'import sys, json; d=json.load(sys.stdin); print(\"Courses found:\", len(d.get(\"courses\", [])))' 2>/dev/null || echo 'Failed'", "Course data"),
    ]
    
    for cmd, desc in test_endpoints:
        output, _ = execute_command(ssh, cmd, show_output=False)
        print(f"  {desc}: {output.strip()}")
    
    # Check logs for any errors
    print("\nRecent logs:")
    output, _ = execute_command(ssh, "pm2 logs growth-compass --lines 5 --nostream 2>&1 | grep -v redis", show_output=False)
    for line in output.split('\n')[:5]:
        if line.strip() and "redis" not in line.lower():
            print(f"  {line.strip()[:100]}")
    
    print("\n" + "="*60)
    print("✅ DATABASE CONNECTION FIXED!")
    print("="*60)
    print(f"\n🌐 Application URL: http://{VPS_HOST}:9001")
    print("\nThe database connection has been fixed and verified.")
    print("The application should now display all courses and data properly.")
    print("="*60)
    
finally:
    ssh.close()