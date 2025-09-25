#!/usr/bin/env python3
"""Run the data import script on VPS"""

import paramiko

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print("Connecting to VPS...")
    ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
    print("Connected! Running data import...")
    
    # Run the import script we created earlier
    command = "cd /var/www/growth-compass && node import-data.js"
    
    print("  Importing data from Excel files...")
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    
    # Stream output
    for line in stdout:
        print(line.strip())
    
    error = stderr.read().decode()
    if error and "Warning" not in error:
        print(f"Error: {error}")
    
    print("\n✅ Data import complete!")
    print(f"🌐 Application is ready at: http://{VPS_HOST}:9001")
    print("\n📝 Login credentials:")
    print("  Email: srijan@capstone.com")
    print("  Password: password")
    
finally:
    ssh.close()