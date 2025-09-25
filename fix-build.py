#!/usr/bin/env python3
"""Build and restart the Growth Compass app"""

import paramiko
import time

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS...")
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("Connected! Building the application...")
    
    commands = [
        ("cd /var/www/growth-compass && pm2 stop growth-compass", "Stopping app..."),
        ("cd /var/www/growth-compass && npm run build", "Building application (this will take a few minutes)..."),
        ("cd /var/www/growth-compass && pm2 restart growth-compass", "Restarting app..."),
        ("pm2 status", "Checking status..."),
    ]
    
    for command, description in commands:
        print(f"\n{description}")
        stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
        
        # Stream output for build command
        if "build" in command:
            for line in stdout:
                print(line.strip())
        else:
            output = stdout.read().decode()
            if output:
                print(output)
        
        error = stderr.read().decode()
        if error and "Warning" not in error:
            print(f"Error: {error}")
    
    print("\n✅ Build complete! Application should be running at http://62.171.175.130:9001")
    
finally:
    ssh.close()