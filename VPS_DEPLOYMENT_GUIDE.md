# VPS Deployment Guide for Growth Compass

## Server Information
- **IP Address**: 62.171.175.130
- **Port**: 9001
- **SSH User**: root
- **SSH Password**: 63r4k5PS
- **Sudo Password**: srijanishero

## Data Files Location
The following data files are essential for the application:
1. **first.xlsx** - Contains course and student information for first batch
2. **second.xlsx** - Contains course and student information for second batch
3. **attendance_report.xlsx** - Contains quantitative attendance evaluations (0-4 star ratings)
4. **data/Overall/Srijan/** - Folder containing Srijan's attendance records

## Manual Deployment Steps

### 1. Connect to VPS Server
```bash
ssh root@62.171.175.130
# Password: 63r4k5PS
```

### 2. Install Required Software
```bash
# Update system
apt-get update -y
apt-get upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

# Install PM2
npm install -g pm2

# Install PostgreSQL
apt-get install -y postgresql postgresql-contrib
systemctl start postgresql
systemctl enable postgresql

# Install Nginx
apt-get install -y nginx

# Install Git
apt-get install -y git
```

### 3. Setup PostgreSQL Database
```bash
sudo -u postgres psql
```

In PostgreSQL prompt:
```sql
CREATE USER growthcompass WITH PASSWORD 'secure_password_123';
CREATE DATABASE growth_compass OWNER growthcompass;
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;
\q
```

### 4. Clone and Setup Application
```bash
# Create application directory
mkdir -p /var/www/growth-compass
cd /var/www/growth-compass

# Clone repository
git clone https://github.com/srijan816/growth.git .

# Install dependencies
npm install

# Create environment file
cat > .env << 'EOF'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=your-secret-key-here-minimum-32-characters
NODE_ENV=production
PORT=9001
EOF
```

### 5. Upload Data Files
From your local machine:
```bash
# Upload Excel files
scp first.xlsx root@62.171.175.130:/var/www/growth-compass/
scp second.xlsx root@62.171.175.130:/var/www/growth-compass/
scp attendance_report.xlsx root@62.171.175.130:/var/www/growth-compass/

# Upload Srijan's data folder
scp -r data/Overall/Srijan root@62.171.175.130:/var/www/growth-compass/data/Overall/
```

### 6. Import Data into Database
On the VPS server:
```bash
cd /var/www/growth-compass

# Run database migrations
npm run migrate

# Import data
npx tsx scripts/import-complete-data.ts
```

### 7. Build and Start Application
```bash
# Build the application
npm run build

# Create PM2 configuration
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'growth-compass',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 9001
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

### 8. Configure Nginx Reverse Proxy
```bash
cat > /etc/nginx/sites-available/growth-compass << 'EOF'
server {
    listen 80;
    server_name 62.171.175.130;

    location / {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/growth-compass /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 9. Configure Firewall
```bash
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 9001/tcp
ufw --force enable
```

## Verification Steps

### Check Application Status
```bash
# Check PM2 status
pm2 status
pm2 logs growth-compass

# Check if port is listening
netstat -tlnp | grep 9001

# Check Nginx status
systemctl status nginx

# Check PostgreSQL
sudo -u postgres psql -c "SELECT COUNT(*) FROM students;" growth_compass
```

### Test Application
1. Open browser and navigate to: http://62.171.175.130:9001
2. Login with Srijan's account
3. Verify data is loaded correctly

## Troubleshooting

### If application doesn't start:
```bash
# Check logs
pm2 logs growth-compass --lines 100

# Restart application
pm2 restart growth-compass

# Check environment variables
pm2 env growth-compass
```

### If database connection fails:
```bash
# Check PostgreSQL is running
systemctl status postgresql

# Test database connection
psql -U growthcompass -d growth_compass -h localhost

# Check database exists
sudo -u postgres psql -l
```

### If Nginx fails:
```bash
# Test configuration
nginx -t

# Check error logs
tail -f /var/log/nginx/error.log

# Restart Nginx
systemctl restart nginx
```

## Data Import Notes

### Attendance Data Structure
- Ratings are on 0-4 star scale with 0.5 increments
- Four categories: Attitude & Efforts, Asking Questions, Application of Skills, Application of Feedback
- Non-zero values in any category indicate presence
- Data source: attendance_report.xlsx

### Course Data Structure
- Course codes are sheet names in first.xlsx and second.xlsx
- Row 1 contains day and time information
- Student information starts from row 2
- Contains: Student Number, Name, Grade, Section

### Feedback Data
- Already parsed and stored in database
- Segregated into quantitative and qualitative aspects
- Available for debate speeches

## Maintenance Commands

### Update Application
```bash
cd /var/www/growth-compass
git pull origin main
npm install
npm run build
pm2 restart growth-compass
```

### Backup Database
```bash
pg_dump -U growthcompass growth_compass > backup_$(date +%Y%m%d).sql
```

### View Logs
```bash
# Application logs
pm2 logs growth-compass

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-*.log
```

## Important URLs
- **Application**: http://62.171.175.130:9001
- **Parent Portal**: http://62.171.175.130:9001/parents
- **API Endpoints**: http://62.171.175.130:9001/api

## Security Notes
1. Change default passwords after deployment
2. Set up SSL certificate with Let's Encrypt
3. Configure proper backup strategy
4. Monitor server resources regularly
5. Keep system and dependencies updated