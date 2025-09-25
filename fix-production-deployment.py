#!/usr/bin/env python3
"""Fix production deployment - ensure app runs properly in headless/production mode"""

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
    
    if show_output and output:
        # Clean ANSI codes
        import re
        clean = re.sub(r'\x1b\[[0-9;]*m', '', output)
        print(clean[:2000] if len(clean) > 2000 else clean)
    
    return output, error

try:
    print("="*60)
    print("FIXING PRODUCTION DEPLOYMENT")
    print("="*60)
    
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("✅ Connected to VPS\n")
    
    # 1. Check current status
    print("1. CHECKING CURRENT STATUS")
    print("-"*40)
    
    output, _ = execute_command(ssh, "pm2 list", "Current PM2 processes:")
    
    output, _ = execute_command(ssh, "netstat -tlnp | grep 9001", "Port 9001 status:", False)
    if "9001" in output:
        print("✅ Port 9001 is listening")
    else:
        print("❌ Port 9001 is NOT listening")
    
    # 2. Stop everything cleanly
    print("\n2. STOPPING ALL GROWTH-COMPASS PROCESSES")
    print("-"*40)
    
    execute_command(ssh, "pm2 stop growth-compass 2>/dev/null || true", "Stopping growth-compass...")
    execute_command(ssh, "pm2 delete growth-compass 2>/dev/null || true", "Deleting old process...")
    execute_command(ssh, "pkill -f 'next-server.*9001' 2>/dev/null || true", "Killing any orphaned processes...")
    
    # 3. Fix environment and configuration
    print("\n3. FIXING ENVIRONMENT CONFIGURATION")
    print("-"*40)
    
    # Create proper .env file
    env_config = """cd /var/www/growth-compass && cat > .env << 'ENVEOF'
# Database Configuration
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
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
    
    execute_command(ssh, env_config, "Creating proper .env file...", False)
    print("✅ Environment configured")
    
    # 4. Create PM2 ecosystem file for proper production deployment
    print("\n4. CREATING PM2 ECOSYSTEM FILE")
    print("-"*40)
    
    ecosystem_config = """cd /var/www/growth-compass && cat > ecosystem.config.js << 'ECOEOF'
module.exports = {
  apps: [{
    name: 'growth-compass',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/growth-compass',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 9001,
      HOST: '0.0.0.0'
    },
    error_file: '/var/www/growth-compass/logs/err.log',
    out_file: '/var/www/growth-compass/logs/out.log',
    log_file: '/var/www/growth-compass/logs/combined.log',
    time: true,
    merge_logs: true,
    min_uptime: '10s',
    max_restarts: 10,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};
ECOEOF"""
    
    execute_command(ssh, ecosystem_config, "Creating PM2 ecosystem file...", False)
    execute_command(ssh, "cd /var/www/growth-compass && mkdir -p logs", "Creating logs directory...", False)
    print("✅ PM2 ecosystem file created")
    
    # 5. Build the application
    print("\n5. BUILDING APPLICATION")
    print("-"*40)
    
    execute_command(ssh, "cd /var/www/growth-compass && rm -rf .next", "Clearing old build...", False)
    
    print("Building application (this takes 2-3 minutes)...")
    build_output, build_error = execute_command(
        ssh, 
        "cd /var/www/growth-compass && npm run build 2>&1",
        show_output=False
    )
    
    if "Compiled successfully" in build_output:
        print("✅ Build successful!")
    else:
        print("❌ Build failed!")
        errors = [line for line in build_output.split('\n') if 'error' in line.lower()][:5]
        for error in errors:
            print(f"  {error[:100]}")
        sys.exit(1)
    
    # 6. Start with PM2 using ecosystem file
    print("\n6. STARTING APPLICATION WITH PM2")
    print("-"*40)
    
    start_output, _ = execute_command(
        ssh,
        "cd /var/www/growth-compass && pm2 start ecosystem.config.js",
        "Starting with ecosystem config..."
    )
    
    # Save PM2 configuration
    execute_command(ssh, "pm2 save", "Saving PM2 configuration...", False)
    
    # Setup PM2 startup script
    execute_command(ssh, "pm2 startup systemd -u root --hp /root", "Setting up PM2 startup...", False)
    
    # Wait for application to start
    print("\nWaiting for application to start...")
    time.sleep(10)
    
    # 7. Verify deployment
    print("\n7. VERIFYING DEPLOYMENT")
    print("-"*40)
    
    # Check PM2 status
    output, _ = execute_command(ssh, "pm2 show growth-compass", show_output=False)
    if "online" in output:
        print("✅ Application is online in PM2")
    else:
        print("❌ Application is not online")
    
    # Check port
    output, _ = execute_command(ssh, "netstat -tlnp | grep 9001", show_output=False)
    if "9001" in output:
        print("✅ Port 9001 is listening")
    else:
        print("❌ Port 9001 is not listening")
    
    # Test HTTP response
    output, _ = execute_command(
        ssh,
        "curl -s -o /dev/null -w '%{http_code}' http://localhost:9001",
        show_output=False
    )
    http_code = output.strip()
    print(f"Local HTTP test: {http_code}")
    
    # Test external access
    output, _ = execute_command(
        ssh,
        f"curl -s -o /dev/null -w '%{{http_code}}' http://{VPS_HOST}:9001",
        show_output=False
    )
    external_code = output.strip()
    print(f"External HTTP test: {external_code}")
    
    # Check logs for errors
    print("\nRecent application logs:")
    output, _ = execute_command(
        ssh,
        "pm2 logs growth-compass --lines 5 --nostream 2>&1 | grep -v 'PM2' | tail -5",
        show_output=False
    )
    for line in output.split('\n')[:5]:
        if line.strip():
            print(f"  {line.strip()[:100]}")
    
    # 8. Final status
    print("\n" + "="*60)
    
    if external_code in ["200", "307", "302"]:
        print("✅ DEPLOYMENT SUCCESSFUL!")
        print("="*60)
        print(f"\n🌐 Application is running at: http://{VPS_HOST}:9001")
        print("\n✅ Production deployment fixed:")
        print("   • Running in production mode")
        print("   • PM2 ecosystem configured")
        print("   • Auto-restart enabled")
        print("   • Logs saved to /var/www/growth-compass/logs/")
        print("   • Will start on system reboot")
    else:
        print("⚠️ DEPLOYMENT PARTIALLY SUCCESSFUL")
        print("Application may need manual checking")
        print("\nTo check logs:")
        print(f"  ssh {VPS_USER}@{VPS_HOST}")
        print("  pm2 logs growth-compass")
    
    print("="*60)
    
finally:
    ssh.close()