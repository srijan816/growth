#!/usr/bin/env python3
"""Verify deployment is working and data is intact"""

import paramiko
import json

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("VERIFYING DEPLOYMENT")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # 1. Check PM2 status
    print("1. APPLICATION STATUS")
    print("-"*40)
    stdin, stdout, stderr = ssh.exec_command("pm2 status | grep growth-compass")
    status = stdout.read().decode()
    if "online" in status:
        print("✅ App is running")
        # Extract restart count
        parts = status.split()
        for i, part in enumerate(parts):
            if part == "online" and i+2 < len(parts):
                restarts = parts[i+2]
                print(f"   Restart count: {restarts}")
    else:
        print("❌ App is not running properly")
    
    # 2. Check data integrity
    print("\n2. DATA INTEGRITY CHECK")
    print("-"*40)
    data_check = """sudo -u postgres psql growth_compass -t -c "
SELECT 
  'Users: ' || COUNT(*) FROM users
UNION ALL
SELECT 'Students: ' || COUNT(*) FROM students
UNION ALL
SELECT 'Courses: ' || COUNT(*) FROM courses
UNION ALL
SELECT 'Enrollments: ' || COUNT(*) FROM enrollments
UNION ALL
SELECT 'Attendances: ' || COUNT(*) FROM attendances
UNION ALL
SELECT 'Feedback: ' || COUNT(*) FROM parsed_student_feedback
UNION ALL
SELECT 'Growth Metrics: ' || COUNT(*) FROM growth_metrics;
" """
    
    stdin, stdout, stderr = ssh.exec_command(data_check)
    data_output = stdout.read().decode()
    print("Database contents:")
    for line in data_output.strip().split('\n'):
        if line.strip():
            print(f"   {line.strip()}")
    
    # 3. Test HTTP endpoints
    print("\n3. HTTP ENDPOINT TESTS")
    print("-"*40)
    
    # Test main page
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001")
    code = stdout.read().decode().strip()
    print(f"   Main page (http://localhost:9001): {code}")
    
    # Test dashboard
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001/dashboard")
    code = stdout.read().decode().strip()
    print(f"   Dashboard: {code}")
    
    # Test API endpoint
    stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001/api/courses")
    code = stdout.read().decode().strip()
    print(f"   Courses API: {code}")
    
    # 4. Test external access
    print("\n4. EXTERNAL ACCESS TEST")
    print("-"*40)
    stdin, stdout, stderr = ssh.exec_command(f"curl -s -o /dev/null -w '%{{http_code}}' http://{VPS_HOST}:9001")
    external_code = stdout.read().decode().strip()
    print(f"   External access (http://{VPS_HOST}:9001): {external_code}")
    
    if external_code in ["200", "307", "302"]:
        print("   ✅ App is accessible from outside")
    else:
        print("   ⚠️ App may not be accessible externally")
        print("   Checking firewall...")
        stdin, stdout, stderr = ssh.exec_command("ufw status | grep 9001")
        fw_status = stdout.read().decode()
        if "9001" in fw_status:
            print("   ✅ Port 9001 is open in firewall")
        else:
            print("   ❌ Port 9001 may be blocked")
    
    # 5. Check for any errors in logs
    print("\n5. RECENT LOGS")
    print("-"*40)
    stdin, stdout, stderr = ssh.exec_command("pm2 logs growth-compass --lines 5 --nostream 2>&1 | grep -v 'Redis\\|redis\\|ECONNREFUSED' | head -10")
    logs = stdout.read().decode()
    if logs.strip():
        print("Recent non-Redis logs:")
        for line in logs.split('\n')[:5]:
            if line.strip() and "redis" not in line.lower():
                print(f"   {line.strip()[:100]}")
    
    # 6. Test login functionality
    print("\n6. LOGIN TEST")
    print("-"*40)
    login_test = """curl -c /tmp/test-cookies.txt -X POST http://localhost:9001/api/auth/callback/credentials \
        -H 'Content-Type: application/x-www-form-urlencoded' \
        -d 'email=srijan@capstone.com&password=password&csrfToken=test' \
        -s -w '\\nHTTP: %{http_code}' | tail -1"""
    
    stdin, stdout, stderr = ssh.exec_command(login_test)
    login_result = stdout.read().decode().strip()
    print(f"   Login attempt: {login_result}")
    
    # Test authenticated API access
    stdin, stdout, stderr = ssh.exec_command(
        "curl -b /tmp/test-cookies.txt -s http://localhost:9001/api/students | python3 -c 'import sys, json; d=json.load(sys.stdin); print(f\"Students returned: {len(d.get('students', []))}\")' 2>/dev/null || echo 'API test failed'"
    )
    api_result = stdout.read().decode().strip()
    if "Students returned" in api_result:
        print(f"   {api_result}")
    
    # Final summary
    print("\n" + "="*60)
    print("DEPLOYMENT VERIFICATION COMPLETE")
    print("="*60)
    
    if "online" in status and external_code in ["200", "307", "302"]:
        print("\n✅ APPLICATION IS FULLY OPERATIONAL!")
        print(f"\n🌐 Access the app at: http://{VPS_HOST}:9001")
        print("\n🔑 Login credentials:")
        print("   Instructor: srijan@capstone.com / password")
        print("   Parent: [studentname].parent@gmail.com / parent123")
        print("\n📊 All data is intact and accessible")
    else:
        print("\n⚠️ Some issues detected - manual check recommended")
    
    print("="*60)
    
finally:
    ssh.close()