#!/usr/bin/env python3
"""Fix database permissions and run import"""

import paramiko

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS...")
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("Connected! Fixing permissions and importing data...")
    
    # Grant permissions
    grant_permissions = """sudo -u postgres psql growth_compass << 'EOF'
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO growthcompass;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO growthcompass;
GRANT CREATE ON SCHEMA public TO growthcompass;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO growthcompass;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO growthcompass;
EOF"""
    
    print("\n1. Granting database permissions...")
    stdin, stdout, stderr = ssh.exec_command(grant_permissions, get_pty=True)
    output = stdout.read().decode()
    print(output)
    
    # Now run the import
    print("\n2. Running data import...")
    import_command = "cd /var/www/growth-compass && node import-data.js"
    stdin, stdout, stderr = ssh.exec_command(import_command, get_pty=True)
    
    # Stream output
    for line in stdout:
        print(line.strip())
    
    # Restart the app to pick up new data
    print("\n3. Restarting application...")
    restart_command = "pm2 restart growth-compass"
    stdin, stdout, stderr = ssh.exec_command(restart_command, get_pty=True)
    output = stdout.read().decode()
    print(output)
    
    print("\n✅ Complete! The application is ready.")
    print(f"🌐 Access it at: http://{VPS_HOST}:9001")
    print("\n📝 Login with:")
    print("  Email: srijan@capstone.com")
    print("  Password: password")
    
finally:
    ssh.close()