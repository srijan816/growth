# Manual VPS Deployment Commands

Run these commands step by step to deploy Growth Compass on your VPS.

## Step 1: Connect to VPS
```bash
ssh root@62.171.175.130
# Password: 63r4k5PS
```

## Step 2: Install Required Software
Run each command one by one:

```bash
# Update system
apt-get update -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Verify Node installation
node --version
npm --version

# Install PM2 globally
npm install -g pm2

# Install Git
apt-get install -y git

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql
```

## Step 3: Configure Firewall for Port 9001
This is CRITICAL for the app to be accessible:

```bash
# Allow port 9001
ufw allow 9001/tcp
ufw allow 9001
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp

# Enable firewall
ufw --force enable

# Verify port is allowed
ufw status

# Also use iptables as backup
iptables -A INPUT -p tcp --dport 9001 -j ACCEPT
iptables -A OUTPUT -p tcp --sport 9001 -j ACCEPT
iptables-save

# Kill any process using port 9001
fuser -k 9001/tcp
lsof -ti:9001 | xargs kill -9
```

## Step 4: Setup PostgreSQL Database
```bash
# Switch to postgres user and create database
sudo -u postgres psql

# In PostgreSQL prompt, run:
CREATE USER growthcompass WITH PASSWORD 'secure_password_123';
CREATE DATABASE growth_compass OWNER growthcompass;
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;
\q
```

## Step 5: Clone and Setup Application
```bash
# Create directory
mkdir -p /var/www
cd /var/www

# Clone repository
git clone https://github.com/srijan816/growth.git growth-compass
cd growth-compass

# Install dependencies
npm install
```

## Step 6: Create Environment File
```bash
# Create .env file
cat > .env << 'EOF'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-key-here-minimum-32-characters-long-abcdef
NODE_ENV=production
PORT=9001
HOST=0.0.0.0
EOF
```

## Step 7: Run Migrations
```bash
npm run migrate
```

## Step 8: Build the Application
```bash
npm run build
```

## Step 9: Create PM2 Configuration
```bash
cat > ecosystem.config.js << 'EOF'
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
    max_memory_restart: '1G',
    error_file: '/var/log/pm2/growth-error.log',
    out_file: '/var/log/pm2/growth-out.log'
  }]
};
EOF
```

## Step 10: Start Application with PM2
```bash
# Stop any existing PM2 processes
pm2 stop all
pm2 delete all

# Start the application
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd -u root --hp /root
# Copy and run the command that PM2 outputs

# Check status
pm2 status

# View logs
pm2 logs growth-compass --lines 50
```

## Step 11: Verify Deployment
```bash
# Check if application is running on port 9001
netstat -tlnp | grep 9001
ss -tlnp | grep 9001

# Test locally
curl http://localhost:9001

# Check PM2 status
pm2 status

# Monitor application
pm2 monit
```

## Step 12: Upload Data Files (from your local machine)
Open a new terminal on your local machine and run:

```bash
# Upload Excel files
scp first.xlsx root@62.171.175.130:/var/www/growth-compass/
scp second.xlsx root@62.171.175.130:/var/www/growth-compass/
scp attendance_report.xlsx root@62.171.175.130:/var/www/growth-compass/

# Upload Srijan's data folder (if exists)
scp -r data/Overall/Srijan root@62.171.175.130:/var/www/growth-compass/data/Overall/
```

## Step 13: Import Data (back on VPS)
```bash
cd /var/www/growth-compass
npx tsx scripts/import-all-data.ts
```

## Troubleshooting

### If application doesn't start:
```bash
# Check PM2 logs
pm2 logs growth-compass --lines 100

# Check if port is in use
lsof -i :9001

# Restart application
pm2 restart growth-compass

# Check system logs
journalctl -xe
```

### If port 9001 is not accessible:
```bash
# Check firewall status
ufw status verbose

# Check iptables
iptables -L -n | grep 9001

# Add port again
ufw allow 9001
iptables -A INPUT -p tcp --dport 9001 -j ACCEPT
service iptables save

# Restart networking
systemctl restart networking
```

### Test from outside:
Open your browser and go to:
**http://62.171.175.130:9001**

## Useful Commands
```bash
# View application logs
pm2 logs growth-compass

# Restart application
pm2 restart growth-compass

# Stop application
pm2 stop growth-compass

# Monitor resources
pm2 monit

# Application status
pm2 status

# System resource usage
htop
```

## Expected Output
After successful deployment, you should see:
1. PM2 status showing the app as "online"
2. Port 9001 listening in netstat output
3. Application accessible at http://62.171.175.130:9001

---
**IMPORTANT**: Make sure to run all firewall commands to open port 9001!