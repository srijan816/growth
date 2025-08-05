#!/bin/bash

# Growth Compass VPS Deployment Script
# Server: 62.171.175.130
# Port: 9001

echo "🚀 Starting Growth Compass deployment to VPS..."

# Configuration
VPS_HOST="62.171.175.130"
VPS_USER="root"
VPS_PASSWORD="63r4k5PS"
APP_PORT="9001"
APP_DIR="/var/www/growth-compass"
REPO_URL="https://github.com/srijan816/growth.git"

# Create deployment commands
DEPLOY_COMMANDS=$(cat <<'EOF'
# Update system
echo "📦 Updating system packages..."
apt-get update -y

# Install Node.js 20 if not present
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install PM2 globally if not present
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Install PostgreSQL if not present
if ! command -v psql &> /dev/null; then
    echo "📦 Installing PostgreSQL..."
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Create app directory
echo "📁 Creating application directory..."
mkdir -p /var/www/growth-compass
cd /var/www/growth-compass

# Clone or pull latest code
if [ -d ".git" ]; then
    echo "📥 Pulling latest code..."
    git pull origin main
else
    echo "📥 Cloning repository..."
    git clone https://github.com/srijan816/growth.git .
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Create .env file if not exists
if [ ! -f ".env" ]; then
    echo "🔧 Creating .env file..."
    cat > .env << 'ENVFILE'
DATABASE_URL=postgresql://growthcompass:secure_password_123@localhost:5432/growth_compass
NEXTAUTH_URL=http://62.171.175.130:9001
NEXTAUTH_SECRET=$(openssl rand -base64 32)
NODE_ENV=production
PORT=9001
ENVFILE
fi

# Setup PostgreSQL database
echo "🗄️ Setting up PostgreSQL database..."
sudo -u postgres psql << 'PSQL'
CREATE USER growthcompass WITH PASSWORD 'secure_password_123';
CREATE DATABASE growth_compass OWNER growthcompass;
GRANT ALL PRIVILEGES ON DATABASE growth_compass TO growthcompass;
PSQL

# Run database migrations
echo "🗄️ Running database migrations..."
npm run migrate

# Build the application
echo "🔨 Building application..."
npm run build

# Configure PM2
echo "⚙️ Configuring PM2..."
cat > ecosystem.config.js << 'PM2CONFIG'
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
PM2CONFIG

# Stop existing PM2 process if running
pm2 stop growth-compass 2>/dev/null || true
pm2 delete growth-compass 2>/dev/null || true

# Start application with PM2
echo "🚀 Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root

# Configure firewall
echo "🔒 Configuring firewall..."
ufw allow 9001/tcp
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
echo "y" | ufw enable

# Configure Nginx as reverse proxy
echo "🌐 Configuring Nginx..."
apt-get install -y nginx

cat > /etc/nginx/sites-available/growth-compass << 'NGINX'
server {
    listen 80;
    server_name 62.171.175.130;

    location / {
        proxy_pass http://localhost:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/growth-compass /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

echo "✅ Deployment complete!"
echo "📱 Application is running at: http://62.171.175.130:9001"
echo "📊 PM2 Status:"
pm2 status
EOF
)

# Execute deployment via SSH
echo "🔐 Connecting to VPS..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST "$DEPLOY_COMMANDS"

echo "🎉 Deployment script completed!"
echo "🌐 Access your application at: http://62.171.175.130:9001"
echo "📊 To check status: ssh root@62.171.175.130 'pm2 status'"