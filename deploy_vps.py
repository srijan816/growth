#!/usr/bin/env python3
"""
VPS Deployment Script for Growth Compass
This script will SSH into the VPS and deploy the application
"""

import paramiko
import time
import sys

# VPS Configuration
VPS_HOST = "62.171.175.130"
VPS_USER = "root"
VPS_PASSWORD = "63r4k5PS"
VPS_PORT = 22

def execute_command(ssh, command, print_output=True):
    """Execute a command on the VPS and return output"""
    stdin, stdout, stderr = ssh.exec_command(command)
    
    output = stdout.read().decode()
    error = stderr.read().decode()
    
    if print_output:
        if output:
            print(f"Output: {output}")
        if error:
            print(f"Error: {error}")
    
    return output, error

def main():
    print("🚀 Starting Growth Compass VPS Deployment...")
    print(f"📡 Connecting to {VPS_HOST}...")
    
    # Create SSH client
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        # Connect to VPS
        ssh.connect(VPS_HOST, VPS_PORT, VPS_USER, VPS_PASSWORD)
        print("✅ Connected to VPS successfully!")
        
        # Commands to execute
        commands = [
            # Update system
            ("apt-get update -y", "Updating system packages..."),
            
            # Install Node.js
            ("curl -fsSL https://deb.nodesource.com/setup_20.x | bash -", "Installing Node.js repository..."),
            ("apt-get install -y nodejs", "Installing Node.js..."),
            
            # Install required packages
            ("npm install -g pm2", "Installing PM2..."),
            ("apt-get install -y git postgresql postgresql-contrib", "Installing Git and PostgreSQL..."),
            
            # Configure firewall - CRITICAL for port 9001
            ("ufw allow 9001/tcp", "Opening port 9001 in firewall..."),
            ("ufw allow 9001", "Allowing port 9001..."),
            ("ufw allow 22/tcp", "Allowing SSH..."),
            ("ufw allow 80/tcp", "Allowing HTTP..."),
            ("ufw allow 443/tcp", "Allowing HTTPS..."),
            ("ufw --force enable", "Enabling firewall..."),
            
            # Open port with iptables as backup
            ("iptables -A INPUT -p tcp --dport 9001 -j ACCEPT", "Opening port 9001 with iptables..."),
            ("iptables -A OUTPUT -p tcp --sport 9001 -j ACCEPT", "Allowing outbound on port 9001..."),
            
            # Kill any existing process on port 9001
            ("fuser -k 9001/tcp || true", "Killing processes on port 9001..."),
            
            # Setup PostgreSQL
            ("""sudo -u postgres psql -c "CREATE USER growthcompass WITH PASSWORD 'secure_password_123';" || true""", "Creating database user..."),
            ("""sudo -u postgres psql -c "CREATE DATABASE growth_compass OWNER growthcompass;" || true""", "Creating database..."),
            ("""sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;" || true""", "Granting privileges..."),
            
            # Clone or update repository
            ("mkdir -p /var/www", "Creating application directory..."),
            ("cd /var/www && [ -d growth-compass ] || git clone https://github.com/srijan816/growth.git growth-compass", "Cloning repository..."),
            ("cd /var/www/growth-compass && git pull origin main", "Updating repository..."),
            
            # Install dependencies
            ("cd /var/www/growth-compass && npm install", "Installing dependencies..."),
            
            # Create environment file
            ("""cd /var/www/growth-compass && cat > .env << 'EOF'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-key-here-minimum-32-characters-long-xyz123
NODE_ENV=production
PORT=9001
HOST=0.0.0.0
EOF""", "Creating environment file..."),
            
            # Run migrations
            ("cd /var/www/growth-compass && npm run migrate || true", "Running database migrations..."),
            
            # Build application
            ("cd /var/www/growth-compass && npm run build", "Building application..."),
            
            # Create PM2 config
            ("""cd /var/www/growth-compass && cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'growth-compass',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/growth-compass',
    env: {
      NODE_ENV: 'production',
      PORT: 9001,
      HOST: '0.0.0.0'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF""", "Creating PM2 configuration..."),
            
            # Stop existing PM2 processes
            ("pm2 stop all || true", "Stopping existing PM2 processes..."),
            ("pm2 delete all || true", "Deleting PM2 processes..."),
            
            # Start application with PM2
            ("cd /var/www/growth-compass && pm2 start ecosystem.config.js", "Starting application with PM2..."),
            ("pm2 save", "Saving PM2 configuration..."),
            ("pm2 startup systemd -u root --hp /root | grep 'sudo' | bash", "Setting up PM2 startup..."),
            
            # Verify deployment
            ("pm2 status", "Checking PM2 status..."),
            ("netstat -tlnp | grep 9001", "Checking if port 9001 is listening..."),
        ]
        
        # Execute each command
        for command, description in commands:
            print(f"\n🔧 {description}")
            output, error = execute_command(ssh, command)
            time.sleep(1)  # Small delay between commands
        
        # Final status check
        print("\n📊 Final Status Check:")
        execute_command(ssh, "pm2 status")
        execute_command(ssh, "netstat -tlnp | grep 9001")
        execute_command(ssh, "ufw status | grep 9001")
        
        print("\n✅ Deployment complete!")
        print("📱 Application should be accessible at: http://62.171.175.130:9001")
        print("\n📝 Next steps:")
        print("1. Upload data files using scp")
        print("2. Run data import script")
        print("3. Access the application in your browser")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)
    finally:
        ssh.close()

if __name__ == "__main__":
    main()