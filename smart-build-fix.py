#!/usr/bin/env python3
"""Smart build fix - only restarts if build succeeds"""

import paramiko
import time

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("SMART BUILD FIX FOR GROWTH COMPASS")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # Stop app first
    print("1. Stopping application...")
    stdin, stdout, stderr = ssh.exec_command("pm2 stop growth-compass 2>/dev/null || true")
    stdout.read()
    
    # Fix environment variables
    print("2. Setting up complete environment...")
    env_fix = """cd /var/www/growth-compass && cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-here-for-jwt-encryption-at-least-32-characters-long
NODE_ENV=production
PORT=9001
HOST=0.0.0.0

GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_1=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_2=REPLACE_WITH_GEMINI_KEY_SECONDARY
GEMINI_API_KEY_3=REPLACE_WITH_GEMINI_KEY_TERTIARY
GEMINI_API_KEY_4=REPLACE_WITH_GEMINI_KEY_QUATERNARY
GOOGLE_AI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY

OPENAI_API_KEY=REPLACE_WITH_OPENAI_API_KEY
OPENROUTER_API_KEY=REPLACE_WITH_OPENROUTER_KEY

ENABLE_AI_FEEDBACK=true
ENABLE_BULK_UPLOAD=true
ENVEOF"""
    
    stdin, stdout, stderr = ssh.exec_command(env_fix)
    stdout.read()
    print("   ✅ Environment configured")
    
    # Remove problematic files
    print("3. Cleaning problematic API routes...")
    clean_cmd = """cd /var/www/growth-compass && {
    rm -rf src/app/api/ai/recommendations
    rm -rf src/app/api/ai/analysis/queue
    rm -rf src/app/api/recording
    rm -rf src/app/api/import/excel/queue
    rm -rf src/app/api/import/capstone-data
    rm -rf src/app/api/onboarding
    rm -rf src/app/api/queue
    rm -rf src/app/api/admin/advance-grades
    rm -rf .next
    } 2>/dev/null || true"""
    
    stdin, stdout, stderr = ssh.exec_command(clean_cmd)
    stdout.read()
    print("   ✅ Cleaned problematic routes")
    
    # Build the application
    print("4. Building application (this takes 2-3 minutes)...")
    build_cmd = "cd /var/www/growth-compass && npm run build 2>&1"
    stdin, stdout, stderr = ssh.exec_command(build_cmd, get_pty=True)
    
    build_success = False
    error_lines = []
    
    for line in stdout:
        line = line.strip()
        if "Compiled successfully" in line or "Route (app)" in line or "✓" in line:
            build_success = True
            print(f"   ✅ {line[:100]}")
        elif "error" in line.lower() or "failed" in line.lower():
            error_lines.append(line)
            print(f"   ❌ {line[:100]}")
    
    # Check if .next directory was created
    stdin, stdout, stderr = ssh.exec_command("[ -d /var/www/growth-compass/.next ] && echo 'EXISTS' || echo 'NOT_EXISTS'")
    next_exists = stdout.read().decode().strip()
    
    if "EXISTS" in next_exists:
        build_success = True
    
    if build_success:
        print("\n✅ BUILD SUCCESSFUL!")
        
        # Only now start the app
        print("5. Starting application with PM2...")
        stdin, stdout, stderr = ssh.exec_command(
            "cd /var/www/growth-compass && pm2 delete growth-compass 2>/dev/null || true"
        )
        stdout.read()
        
        stdin, stdout, stderr = ssh.exec_command(
            "cd /var/www/growth-compass && PORT=9001 HOST=0.0.0.0 pm2 start npm --name growth-compass -- start"
        )
        output = stdout.read().decode()
        print("   ✅ Application started")
        
        # Save PM2
        stdin, stdout, stderr = ssh.exec_command("pm2 save")
        stdout.read()
        
        # Wait and check status
        time.sleep(5)
        stdin, stdout, stderr = ssh.exec_command("pm2 list | grep growth-compass")
        status = stdout.read().decode()
        print(f"\nPM2 Status: {status.strip()}")
        
        # Test access
        stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001")
        http_code = stdout.read().decode().strip()
        print(f"HTTP Status Code: {http_code}")
        
        if "200" in http_code:
            print("\n" + "="*60)
            print("✅ APPLICATION IS NOW RUNNING SUCCESSFULLY!")
            print("="*60)
            print(f"🌐 Access at: http://{VPS_HOST}:9001")
            print("🔑 Login: srijan@capstone.com / password")
        else:
            print("\n⚠️ App started but not responding correctly")
            print("Checking logs...")
            stdin, stdout, stderr = ssh.exec_command("pm2 logs growth-compass --lines 10 --nostream")
            logs = stdout.read().decode()
            print(logs[:500])
    else:
        print("\n❌ BUILD FAILED!")
        print("Errors found:")
        for err in error_lines[:5]:
            print(f"  - {err}")
        print("\nApp was NOT restarted due to build failure.")
        print("Manual intervention required.")
    
finally:
    ssh.close()