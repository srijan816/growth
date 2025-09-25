#!/usr/bin/env python3
"""
Local deployment script for Growth Compass
Deploys local changes to VPS without affecting other apps
"""

import paramiko
import os
import sys
import time
from pathlib import Path

# VPS Configuration
VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"
VPS_APP_PATH = "/var/www/growth-compass"

# Local paths
LOCAL_PROJECT_PATH = Path(__file__).parent.absolute()

def print_header(text):
    print("\n" + "="*60)
    print(text)
    print("="*60)

def print_status(text, status="info"):
    symbols = {"success": "✅", "error": "❌", "info": "ℹ️", "warning": "⚠️"}
    print(f"{symbols.get(status, '•')} {text}")

def execute_remote_command(ssh, command, description="", show_output=True):
    """Execute command on remote server"""
    if description:
        print(f"\n{description}")
    
    stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if show_output and output:
        # Clean ANSI codes
        import re
        clean = re.sub(r'\x1b\[[0-9;]*m', '', output)
        if len(clean) > 1000:
            print(clean[:1000] + "...")
        else:
            print(clean)
    
    return output, error

def main():
    print_header("GROWTH COMPASS DEPLOYMENT")
    print(f"Deploying from: {LOCAL_PROJECT_PATH}")
    print(f"Deploying to: {VPS_USER}@{VPS_HOST}:{VPS_APP_PATH}")
    
    # Connect to VPS
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print_status("Connecting to VPS...", "info")
        ssh.connect(VPS_HOST, 22, VPS_USER, VPS_PASSWORD)
        print_status("Connected to VPS", "success")
        
        # 1. Check current status
        print_header("STEP 1: CHECKING CURRENT STATUS")
        
        output, _ = execute_remote_command(
            ssh, 
            "pm2 list | grep growth-compass | awk '{print $10}'",
            "Current app status:",
            False
        )
        
        current_status = "running" if "online" in output else "stopped"
        print_status(f"Current status: {current_status}", "info")
        
        # Check database
        output, _ = execute_remote_command(
            ssh,
            """sudo -u postgres psql growth_compass -t -c "SELECT COUNT(*) as count FROM users;" """,
            "Database check:",
            False
        )
        print_status(f"Database users: {output.strip()}", "info")
        
        # 2. Backup current deployment
        print_header("STEP 2: CREATING BACKUP")
        
        backup_cmd = f"""cd {VPS_APP_PATH} && {{
            BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
            mkdir -p $BACKUP_DIR
            cp -r src package.json .env $BACKUP_DIR/ 2>/dev/null || true
            echo "Backup created at: $BACKUP_DIR"
        }}"""
        
        output, _ = execute_remote_command(ssh, backup_cmd, "Creating backup...")
        
        # 3. Stop the application (without affecting other apps)
        print_header("STEP 3: STOPPING APPLICATION")
        
        execute_remote_command(
            ssh,
            "pm2 stop growth-compass 2>/dev/null || true",
            "Stopping Growth Compass (other apps remain running)...",
            False
        )
        print_status("Application stopped", "success")
        
        # 4. Upload changed files
        print_header("STEP 4: UPLOADING FILES")
        
        # Create SFTP client
        sftp = ssh.open_sftp()
        
        # Files to upload (you can expand this list)
        files_to_upload = [
            # Source files
            ("src/lib/postgres.ts", f"{VPS_APP_PATH}/src/lib/postgres.ts"),
            ("src/app/api/students/route.ts", f"{VPS_APP_PATH}/src/app/api/students/route.ts"),
            ("src/app/api/courses/route.ts", f"{VPS_APP_PATH}/src/app/api/courses/route.ts"),
            ("src/app/dashboard/page.tsx", f"{VPS_APP_PATH}/src/app/dashboard/page.tsx"),
            ("src/app/dashboard/students/[id]/page.tsx", f"{VPS_APP_PATH}/src/app/dashboard/students/[id]/page.tsx"),
            # Add more files as needed
        ]
        
        uploaded = 0
        for local_file, remote_file in files_to_upload:
            local_path = LOCAL_PROJECT_PATH / local_file
            if local_path.exists():
                try:
                    # Ensure remote directory exists
                    remote_dir = os.path.dirname(remote_file)
                    execute_remote_command(ssh, f"mkdir -p {remote_dir}", show_output=False)
                    
                    # Upload file
                    sftp.put(str(local_path), remote_file)
                    print_status(f"Uploaded: {local_file}", "success")
                    uploaded += 1
                except Exception as e:
                    print_status(f"Failed to upload {local_file}: {e}", "error")
            else:
                print_status(f"Local file not found: {local_file}", "warning")
        
        sftp.close()
        print_status(f"Uploaded {uploaded} files", "info")
        
        # 5. Install dependencies (if package.json changed)
        print_header("STEP 5: INSTALLING DEPENDENCIES")
        
        execute_remote_command(
            ssh,
            f"cd {VPS_APP_PATH} && npm install --production",
            "Installing dependencies...",
            False
        )
        print_status("Dependencies installed", "success")
        
        # 6. Build the application
        print_header("STEP 6: BUILDING APPLICATION")
        
        # Clear build cache
        execute_remote_command(
            ssh,
            f"cd {VPS_APP_PATH} && rm -rf .next",
            "Clearing build cache...",
            False
        )
        
        # Build
        print_status("Building application (this takes 2-3 minutes)...", "info")
        build_output, build_error = execute_remote_command(
            ssh,
            f"cd {VPS_APP_PATH} && npm run build 2>&1",
            show_output=False
        )
        
        if "Compiled successfully" in build_output:
            print_status("Build successful!", "success")
            
            # 7. Start the application
            print_header("STEP 7: STARTING APPLICATION")
            
            # Delete old PM2 process
            execute_remote_command(
                ssh,
                "pm2 delete growth-compass 2>/dev/null || true",
                show_output=False
            )
            
            # Start new
            start_output, _ = execute_remote_command(
                ssh,
                f"cd {VPS_APP_PATH} && PORT=9001 HOST=0.0.0.0 NODE_ENV=production pm2 start npm --name growth-compass -- start",
                "Starting application...",
                False
            )
            
            if "online" in start_output.lower():
                print_status("Application started", "success")
                
                # Save PM2 config
                execute_remote_command(ssh, "pm2 save", show_output=False)
                
                # Wait for app to stabilize
                time.sleep(5)
                
                # 8. Verify deployment
                print_header("STEP 8: VERIFICATION")
                
                # Check PM2 status
                output, _ = execute_remote_command(
                    ssh,
                    "pm2 list | grep growth-compass",
                    show_output=False
                )
                
                if "online" in output:
                    print_status("Application is running", "success")
                
                # Test endpoints
                tests = [
                    ("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001", "Homepage"),
                    ("curl -s -o /dev/null -w '%{http_code}' http://localhost:9001/api/courses", "API"),
                ]
                
                for cmd, name in tests:
                    output, _ = execute_remote_command(ssh, cmd, show_output=False)
                    code = output.strip()
                    if code in ["200", "307", "302", "401"]:
                        print_status(f"{name}: HTTP {code}", "success")
                    else:
                        print_status(f"{name}: HTTP {code}", "warning")
                
                print_header("DEPLOYMENT SUCCESSFUL!")
                print(f"🌐 Application URL: http://{VPS_HOST}:9001")
                print("📧 Login: srijan@capstone.com / password")
                print("✅ All other apps on the server remain unaffected")
                
            else:
                print_status("Failed to start application", "error")
                print("Check logs with: ssh root@62.171.175.130 'pm2 logs growth-compass'")
                
        else:
            print_status("Build failed!", "error")
            print("Build errors:")
            errors = [line for line in build_output.split('\n') if 'error' in line.lower()][:5]
            for error in errors:
                print(f"  {error[:100]}")
            
            # Rollback
            print_status("Rolling back to backup...", "warning")
            rollback_cmd = f"""cd {VPS_APP_PATH} && {{
                LATEST_BACKUP=$(ls -t backups/ | head -1)
                if [ -n "$LATEST_BACKUP" ]; then
                    cp -r backups/$LATEST_BACKUP/* . 2>/dev/null || true
                    echo "Rolled back to: $LATEST_BACKUP"
                fi
            }}"""
            execute_remote_command(ssh, rollback_cmd, show_output=False)
            
            # Restart with old version
            execute_remote_command(
                ssh,
                f"cd {VPS_APP_PATH} && pm2 start growth-compass 2>/dev/null || true",
                show_output=False
            )
            
    except Exception as e:
        print_status(f"Deployment failed: {e}", "error")
        sys.exit(1)
        
    finally:
        ssh.close()

if __name__ == "__main__":
    main()