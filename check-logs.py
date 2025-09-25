#!/usr/bin/env python3
"""Check PM2 logs for the Growth Compass app"""

import paramiko

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    
    # Check PM2 logs
    stdin, stdout, stderr = ssh.exec_command("pm2 logs growth-compass --lines 50 --nostream")
    logs = stdout.read().decode()
    print("PM2 Logs for growth-compass:")
    print("=" * 50)
    print(logs)
    
    # Check if the app is actually running
    stdin, stdout, stderr = ssh.exec_command("pm2 describe growth-compass")
    status = stdout.read().decode()
    print("\n\nApp Status:")
    print("=" * 50)
    print(status)
    
finally:
    ssh.close()