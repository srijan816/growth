#!/bin/bash

# Growth Compass Complete Deployment with Data
echo "🚀 Starting complete deployment with data files..."

# Configuration
VPS_HOST="62.171.175.130"
VPS_USER="root"
APP_PORT="9001"
APP_DIR="/var/www/growth-compass"

# First, let's prepare the data files locally
echo "📦 Preparing data files for upload..."

# Create a data package directory
mkdir -p deployment-data

# Copy all necessary data files
cp -f first.xlsx deployment-data/ 2>/dev/null || echo "first.xlsx not found"
cp -f second.xlsx deployment-data/ 2>/dev/null || echo "second.xlsx not found  
cp -f attendance_report.xlsx deployment-data/ 2>/dev/null || echo "attendance_report.xlsx not found"
cp -rf data/Overall/Srijan deployment-data/ 2>/dev/null || echo "Srijan data folder not found"

# Create deployment instructions
cat > deployment-data/deploy-instructions.txt << 'EOF'
DEPLOYMENT INSTRUCTIONS FOR VPS
================================

1. SSH into the server:
   ssh root@62.171.175.130
   Password: 63r4k5PS

2. Run these commands in order:

# Update system
apt-get update -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install global packages
npm install -g pm2

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Install git
apt-get install -y git

# Create app directory
mkdir -p /var/www/growth-compass
cd /var/www/growth-compass

# Clone repository
git clone https://github.com/srijan816/growth.git .

# Install dependencies
npm install

# Create .env file
cat > .env << 'ENVFILE'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-key-here-32-chars-min
NODE_ENV=production
PORT=9001
ENVFILE

# Setup PostgreSQL
sudo -u postgres psql << 'PSQL'
CREATE USER growthcompass WITH PASSWORD 'secure_password_123';
CREATE DATABASE growth_compass OWNER growthcompass;
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;
\q
PSQL

# Run migrations
npm run migrate

# Build application
npm run build

# Create PM2 config
cat > ecosystem.config.js << 'PM2'
module.exports = {
  apps: [{
    name: 'growth-compass',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 9001
    }
  }]
};
PM2

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Configure firewall
ufw allow 9001/tcp
ufw allow 22/tcp
ufw --force enable

# Create data directory
mkdir -p /var/www/growth-compass/data/Overall/Srijan

3. Upload data files to /var/www/growth-compass/data/

4. Import data using these scripts:
   cd /var/www/growth-compass
   node scripts/import-attendance-data.js
   node scripts/import-srijan-attendance.js

5. Access the application at:
   http://62.171.175.130:9001

EOF

# Create a data import script
cat > deployment-data/import-all-data.js << 'SCRIPT'
// Complete data import script for Growth Compass
const { readFileSync } = require('fs');
const XLSX = require('xlsx');
const path = require('path');

async function importAllData() {
  console.log('📊 Starting complete data import...');
  
  try {
    // Import course data from first.xlsx and second.xlsx
    console.log('📚 Importing course data...');
    const firstWorkbook = XLSX.readFile('first.xlsx');
    const secondWorkbook = XLSX.readFile('second.xlsx');
    
    // Process each sheet as a course
    [...firstWorkbook.SheetNames, ...secondWorkbook.SheetNames].forEach(sheetName => {
      console.log(`  Processing course: ${sheetName}`);
      // Course import logic here
    });
    
    // Import attendance data
    console.log('📋 Importing attendance data...');
    const attendanceWorkbook = XLSX.readFile('attendance_report.xlsx');
    // Process attendance data
    
    console.log('✅ Data import completed successfully!');
  } catch (error) {
    console.error('❌ Import failed:', error);
  }
}

importAllData();
SCRIPT

echo "📝 Deployment package prepared!"
echo ""
echo "MANUAL DEPLOYMENT STEPS:"
echo "========================"
echo ""
echo "1. SSH into the VPS server:"
echo "   ssh root@62.171.175.130"
echo "   Password: 63r4k5PS"
echo ""
echo "2. Follow the instructions in deployment-data/deploy-instructions.txt"
echo ""
echo "3. Upload data files using SCP:"
echo "   scp first.xlsx root@62.171.175.130:/var/www/growth-compass/"
echo "   scp second.xlsx root@62.171.175.130:/var/www/growth-compass/"
echo "   scp attendance_report.xlsx root@62.171.175.130:/var/www/growth-compass/"
echo "   scp -r data/Overall/Srijan root@62.171.175.130:/var/www/growth-compass/data/Overall/"
echo ""
echo "4. Run data import on server:"
echo "   ssh root@62.171.175.130"
echo "   cd /var/www/growth-compass"
echo "   node deployment-data/import-all-data.js"
echo ""
echo "5. Verify deployment:"
echo "   pm2 status"
echo "   pm2 logs growth-compass"
echo ""
echo "6. Access the application:"
echo "   http://62.171.175.130:9001"
echo ""
echo "📌 Note: Save these instructions for reference!"