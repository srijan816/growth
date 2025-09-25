#!/usr/bin/env python3
"""Fix environment variables and rebuild the app"""

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
    print("Connected! Setting up environment and building...")
    
    commands = [
        # Stop the app first
        ("pm2 stop growth-compass", "Stopping app..."),
        
        # Create proper .env file with all API keys
        ("""cd /var/www/growth-compass && cat > .env << 'EOF'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-here-for-jwt-encryption-at-least-32-characters-long
NODE_ENV=production
PORT=9001
HOST=0.0.0.0

# Gemini AI Configuration
GEMINI_API_KEY_1=REPLACE_WITH_GEMINI_KEY_PRIMARY
GEMINI_API_KEY_2=REPLACE_WITH_GEMINI_KEY_SECONDARY
GEMINI_API_KEY_3=REPLACE_WITH_GEMINI_KEY_TERTIARY
GEMINI_API_KEY_4=REPLACE_WITH_GEMINI_KEY_QUATERNARY
GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GOOGLE_GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
GOOGLE_AI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY
NEXT_PUBLIC_GEMINI_API_KEY=REPLACE_WITH_GEMINI_KEY_PRIMARY

# OpenAI Configuration
OPENAI_API_KEY=REPLACE_WITH_OPENAI_API_KEY
NEXT_PUBLIC_OPENAI_API_KEY=REPLACE_WITH_OPENAI_API_KEY

# OpenRouter Configuration
OPENROUTER_API_KEY=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

# Instructor Configuration
SRIJAN_INSTRUCTOR_EMAIL=srijan@capstone.com
SRIJAN_INSTRUCTOR_PASSWORD=password

# Feature Flags
ENABLE_AI_FEEDBACK=true
ENABLE_BULK_UPLOAD=true
EOF""", "Creating environment file with all API keys..."),
        
        # Remove old build
        ("cd /var/www/growth-compass && rm -rf .next", "Removing old build..."),
        
        # Build the application
        ("cd /var/www/growth-compass && npm run build", "Building application (this may take a few minutes)..."),
        
        # Start with PM2
        ("cd /var/www/growth-compass && PORT=9001 HOST=0.0.0.0 pm2 start npm --name growth-compass -- start", "Starting app with PM2..."),
        
        # Save PM2 config
        ("pm2 save", "Saving PM2 configuration..."),
        
        # Check status
        ("pm2 status", "Checking PM2 status..."),
        
        # Test the app
        ("sleep 5 && curl -I http://localhost:9001", "Testing app response..."),
    ]
    
    for command, description in commands:
        print(f"\n{description}")
        stdin, stdout, stderr = ssh.exec_command(command, get_pty=True)
        
        # Stream output for build command
        if "build" in command:
            for line in stdout:
                line = line.strip()
                if line and not line.startswith('\x1b'):  # Skip ANSI escape sequences
                    print(line)
        else:
            output = stdout.read().decode()
            if output:
                # Clean output of ANSI codes for readability
                import re
                clean_output = re.sub(r'\x1b\[[0-9;]*m', '', output)
                if clean_output.strip():
                    print(clean_output.strip())
        
        error = stderr.read().decode()
        if error and "Warning" not in error and "grep" not in error:
            print(f"Error: {error}")
    
    print("\n✅ Build complete! Application should be running at http://62.171.175.130:9001")
    
finally:
    ssh.close()