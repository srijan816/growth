#!/bin/bash

# Direct deployment script for Growth Compass
echo "🚀 Deploying Growth Compass to VPS..."

# Create SSH commands file
cat > /tmp/deploy_commands.sh << 'DEPLOY_SCRIPT'
#!/bin/bash

echo "📦 Starting deployment on VPS..."

# Update system
apt-get update -y

# Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 if not present
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo "Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
    
    # Setup database
    sudo -u postgres psql << EOF
CREATE USER growthcompass WITH PASSWORD 'secure_password_123';
CREATE DATABASE growth_compass OWNER growthcompass;
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;
EOF
fi

# Install git if not present
if ! command -v git &> /dev/null; then
    apt-get install -y git
fi

# Configure firewall to allow port 9001
echo "🔒 Configuring firewall..."
ufw allow 9001/tcp
ufw allow 9001
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable
ufw status

# Open port 9001 using iptables as backup
iptables -A INPUT -p tcp --dport 9001 -j ACCEPT
iptables -A OUTPUT -p tcp --sport 9001 -j ACCEPT
iptables-save > /etc/iptables/rules.v4

# Create application directory
mkdir -p /var/www/growth-compass
cd /var/www/growth-compass

# Clone or update repository
if [ -d ".git" ]; then
    echo "Updating repository..."
    git pull origin main
else
    echo "Cloning repository..."
    git clone https://github.com/srijan816/growth.git .
fi

# Install dependencies
echo "Installing dependencies..."
npm install

# Create .env file
cat > .env << 'ENV'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-key-here-minimum-32-characters-long
NODE_ENV=production
PORT=9001
HOST=0.0.0.0
ENV

# Run migrations
echo "Running migrations..."
npm run migrate || true

# Build the application
echo "Building application..."
npm run build

# Stop any existing PM2 processes
pm2 stop all || true
pm2 delete all || true

# Kill any process using port 9001
fuser -k 9001/tcp || true
lsof -ti:9001 | xargs kill -9 || true

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'PM2'
module.exports = {
  apps: [{
    name: 'growth-compass',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 9001,
      HOST: '0.0.0.0'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/growth-compass-error.log',
    out_file: '/var/log/pm2/growth-compass-out.log',
    log_file: '/var/log/pm2/growth-compass-combined.log',
    time: true
  }]
};
PM2

# Start with PM2
echo "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
systemctl restart pm2-root

# Verify the application is running
sleep 5
pm2 status
pm2 logs growth-compass --lines 20

# Check if port is listening
netstat -tlnp | grep 9001
ss -tlnp | grep 9001

# Test the application
curl -I http://localhost:9001 || echo "Local test failed"
curl -I http://62.171.175.130:9001 || echo "External test failed"

echo "✅ Deployment complete!"
echo "📱 Application should be running at: http://62.171.175.130:9001"
echo ""
echo "Check status with: pm2 status"
echo "View logs with: pm2 logs growth-compass"
echo "Monitor with: pm2 monit"

DEPLOY_SCRIPT

# Copy and execute the script on VPS
echo "📤 Uploading deployment script to VPS..."
sshpass -p "63r4k5PS" scp -o StrictHostKeyChecking=no /tmp/deploy_commands.sh root@62.171.175.130:/tmp/

echo "🔧 Executing deployment on VPS..."
sshpass -p "63r4k5PS" ssh -o StrictHostKeyChecking=no root@62.171.175.130 "chmod +x /tmp/deploy_commands.sh && /tmp/deploy_commands.sh"

echo "✅ Deployment initiated! Check http://62.171.175.130:9001"