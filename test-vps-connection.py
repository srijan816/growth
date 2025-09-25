#!/usr/bin/env python3
"""
Test VPS connection and check what's running
"""

import paramiko
import sys

VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"

def main():
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {VPS_HOST}...")
        ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
        print("Connected!\n")
        
        # Commands to check status
        checks = [
            ("ls -la /root/apps/", "Checking /root/apps directory:"),
            ("ls -la /var/www/", "Checking /var/www directory:"),
            ("pm2 status", "PM2 Status:"),
            ("netstat -tlnp | grep 9001", "Port 9001 status:"),
            ("ufw status | grep 9001", "Firewall status for port 9001:"),
            ("ps aux | grep node", "Node processes:"),
            ("which node", "Node.js location:"),
            ("node --version", "Node.js version:"),
            ("pwd", "Current directory:"),
        ]
        
        for command, description in checks:
            print(f"\n{description}")
            print("-" * 40)
            stdin, stdout, stderr = ssh.exec_command(command)
            output = stdout.read().decode()
            error = stderr.read().decode()
            
            if output:
                print(output)
            if error and "grep" not in command:  # Ignore grep errors
                print(f"Error: {error}")
        
        # Try to fix and start the app
        print("\n\n🔧 ATTEMPTING TO FIX AND START THE APP:")
        print("=" * 50)
        
        fix_commands = [
            # Kill anything on port 9001
            "fuser -k 9001/tcp 2>/dev/null || true",
            
            # Open firewall
            "ufw allow 9001/tcp",
            "ufw allow 9001",
            "iptables -A INPUT -p tcp --dport 9001 -j ACCEPT",
            
            # Check if app exists in /root/apps
            "ls -la /root/apps/growth-compass 2>/dev/null || echo 'App not in /root/apps'",
            
            # Check if app exists in /var/www
            "ls -la /var/www/growth-compass 2>/dev/null || echo 'App not in /var/www'",
            
            # Try to start from /root/apps if it exists
            """
            if [ -d "/root/apps/growth-compass" ]; then
                cd /root/apps/growth-compass
                echo "Found app in /root/apps/growth-compass"
                pm2 stop growth-compass 2>/dev/null || true
                pm2 delete growth-compass 2>/dev/null || true
                PORT=9001 HOST=0.0.0.0 pm2 start npm --name growth-compass -- start
                pm2 save
                echo "Started from /root/apps"
            elif [ -d "/var/www/growth-compass" ]; then
                cd /var/www/growth-compass
                echo "Found app in /var/www/growth-compass"
                pm2 stop growth-compass 2>/dev/null || true
                pm2 delete growth-compass 2>/dev/null || true
                PORT=9001 HOST=0.0.0.0 pm2 start npm --name growth-compass -- start
                pm2 save
                echo "Started from /var/www"
            else
                echo "App not found! Need to clone it."
                mkdir -p /root/apps
                cd /root/apps
                git clone https://github.com/srijan816/growth.git growth-compass
                cd growth-compass
                npm install
                npm run build
                PORT=9001 HOST=0.0.0.0 pm2 start npm --name growth-compass -- start
                pm2 save
                echo "Cloned and started new installation"
            fi
            """,
            
            # Check final status
            "pm2 status",
            "netstat -tlnp | grep 9001",
        ]
        
        for command in fix_commands:
            stdin, stdout, stderr = ssh.exec_command(command)
            output = stdout.read().decode()
            if output:
                print(output)
        
        print("\n✅ Diagnostic complete!")
        print(f"Try accessing: http://{VPS_HOST}:9001")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()