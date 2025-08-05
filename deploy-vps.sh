#!/bin/bash

# VPS Deployment Script for Growth Compass
# Server: 62.171.175.130
# Port: 9001

set -e  # Exit on error

echo "🚀 Starting VPS deployment for Growth Compass..."

# Configuration
VPS_HOST="62.171.175.130"
VPS_USER="root"
VPS_PASSWORD="63r4k5PS"
VPS_PORT="9001"
APP_DIR="/root/apps/growth-compass"
REPO_URL=$(git config --get remote.origin.url)
BRANCH=$(git branch --show-current)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}📋 Deployment Configuration:${NC}"
echo "   Server: $VPS_HOST"
echo "   Directory: $APP_DIR"
echo "   Port: $VPS_PORT"
echo "   Branch: $BRANCH"

# Create SSH command with password
SSH_CMD="sshpass -p '$VPS_PASSWORD' ssh -o StrictHostKeyChecking=no $VPS_USER@$VPS_HOST"
SCP_CMD="sshpass -p '$VPS_PASSWORD' scp -o StrictHostKeyChecking=no"

# Check if sshpass is installed
if ! command -v sshpass &> /dev/null; then
    echo -e "${RED}❌ sshpass is required but not installed.${NC}"
    echo "Install it with: brew install hudochenkov/sshpass/sshpass"
    exit 1
fi

# Step 1: Push local changes to GitHub
echo -e "\n${YELLOW}📤 Step 1: Pushing local changes to GitHub...${NC}"
git add -A
git commit -m "Auto-commit before VPS deployment" || true
git push origin $BRANCH

# Step 2: Setup application directory on VPS
echo -e "\n${YELLOW}📁 Step 2: Setting up application directory on VPS...${NC}"
$SSH_CMD << EOF
  set -e
  
  # Create apps directory if it doesn't exist
  mkdir -p /root/apps
  
  # Clone or update repository
  if [ -d "$APP_DIR" ]; then
    echo "Repository exists. Pulling latest changes..."
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/$BRANCH
    git pull origin $BRANCH
  else
    echo "Cloning repository..."
    cd /root/apps
    git clone $REPO_URL growth-compass
    cd $APP_DIR
    git checkout $BRANCH
  fi
EOF

# Step 3: Copy environment files
echo -e "\n${YELLOW}📋 Step 3: Copying environment configuration...${NC}"
if [ -f ".env.local" ]; then
  $SCP_CMD .env.local $VPS_USER@$VPS_HOST:$APP_DIR/.env.local
fi
if [ -f ".env.production" ]; then
  $SCP_CMD .env.production $VPS_USER@$VPS_HOST:$APP_DIR/.env.production
fi

# Step 4: Install dependencies and build
echo -e "\n${YELLOW}📦 Step 4: Installing dependencies and building...${NC}"
$SSH_CMD << EOF
  set -e
  cd $APP_DIR
  
  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  
  # Install dependencies
  echo "Installing dependencies..."
  npm ci --production=false
  
  # Build the application
  echo "Building application..."
  NODE_ENV=production npm run build
EOF

# Step 5: Configure firewall for port 9001
echo -e "\n${YELLOW}🔒 Step 5: Configuring firewall...${NC}"
$SSH_CMD << EOF
  set -e
  
  # Check if ufw is installed
  if command -v ufw &> /dev/null; then
    echo "Configuring UFW firewall..."
    ufw allow $VPS_PORT/tcp
    ufw --force enable
  fi
  
  # Check if firewalld is installed
  if command -v firewall-cmd &> /dev/null; then
    echo "Configuring firewalld..."
    firewall-cmd --permanent --add-port=$VPS_PORT/tcp
    firewall-cmd --reload
  fi
  
  # Check if iptables is being used directly
  if ! command -v ufw &> /dev/null && ! command -v firewall-cmd &> /dev/null; then
    echo "Configuring iptables..."
    iptables -A INPUT -p tcp --dport $VPS_PORT -j ACCEPT
    # Save iptables rules
    if command -v iptables-save &> /dev/null; then
      iptables-save > /etc/iptables/rules.v4
    fi
  fi
EOF

# Step 6: Setup PM2 for process management
echo -e "\n${YELLOW}🔄 Step 6: Setting up PM2 process manager...${NC}"
$SSH_CMD << EOF
  set -e
  cd $APP_DIR
  
  # Install PM2 globally if not installed
  if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
  fi
  
  # Create PM2 ecosystem file
  cat > ecosystem.config.js << 'EOFILE'
module.exports = {
  apps: [{
    name: 'growth-compass',
    script: 'npm',
    args: 'start',
    cwd: '$APP_DIR',
    env: {
      NODE_ENV: 'production',
      PORT: '$VPS_PORT'
    },
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOFILE
  
  # Create logs directory
  mkdir -p logs
  
  # Stop existing process if running
  pm2 stop growth-compass || true
  pm2 delete growth-compass || true
  
  # Start the application
  pm2 start ecosystem.config.js
  
  # Save PM2 configuration
  pm2 save
  
  # Setup PM2 to start on boot
  pm2 startup systemd -u root --hp /root || true
EOF

# Step 7: Setup Nginx reverse proxy (optional)
echo -e "\n${YELLOW}🌐 Step 7: Checking Nginx configuration...${NC}"
$SSH_CMD << EOF
  set -e
  
  if command -v nginx &> /dev/null; then
    echo "Nginx is installed. Creating configuration..."
    
    # Create Nginx configuration
    cat > /etc/nginx/sites-available/growth-compass << 'EONGINX'
server {
    listen 80;
    server_name _;
    
    location /growth-compass {
        proxy_pass http://localhost:$VPS_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
EONGINX
    
    # Enable the site if not already enabled
    if [ ! -L /etc/nginx/sites-enabled/growth-compass ]; then
      ln -s /etc/nginx/sites-available/growth-compass /etc/nginx/sites-enabled/
    fi
    
    # Test and reload Nginx
    nginx -t && systemctl reload nginx
    echo "Nginx configured successfully"
  else
    echo "Nginx not installed. Application will be accessible directly on port $VPS_PORT"
  fi
EOF

# Step 8: Verify deployment
echo -e "\n${YELLOW}✅ Step 8: Verifying deployment...${NC}"
$SSH_CMD << EOF
  set -e
  cd $APP_DIR
  
  # Check if the application is running
  pm2 status growth-compass
  
  # Test if the port is listening
  if netstat -tuln | grep -q ":$VPS_PORT "; then
    echo -e "${GREEN}✅ Application is listening on port $VPS_PORT${NC}"
  else
    echo -e "${RED}❌ Application is NOT listening on port $VPS_PORT${NC}"
  fi
  
  # Show application logs
  echo -e "\n📋 Recent application logs:"
  pm2 logs growth-compass --lines 10 --nostream
EOF

# Step 9: Display access information
echo -e "\n${GREEN}🎉 Deployment complete!${NC}"
echo -e "\n📌 Access Information:"
echo -e "   Direct URL: http://$VPS_HOST:$VPS_PORT"
if $SSH_CMD "command -v nginx &> /dev/null" 2>/dev/null; then
  echo -e "   Nginx URL: http://$VPS_HOST/growth-compass"
fi
echo -e "\n📊 Monitoring Commands:"
echo -e "   SSH to server: ssh $VPS_USER@$VPS_HOST"
echo -e "   View logs: pm2 logs growth-compass"
echo -e "   Monitor: pm2 monit"
echo -e "   Restart: pm2 restart growth-compass"
echo -e "   Stop: pm2 stop growth-compass"

# Create local convenience scripts
echo -e "\n${YELLOW}📝 Creating convenience scripts...${NC}"

# Create SSH script
cat > vps-ssh.sh << 'EOSCRIPT'
#!/bin/bash
sshpass -p '63r4k5PS' ssh root@62.171.175.130
EOSCRIPT
chmod +x vps-ssh.sh

# Create logs script
cat > vps-logs.sh << 'EOSCRIPT'
#!/bin/bash
sshpass -p '63r4k5PS' ssh root@62.171.175.130 "cd /root/apps/growth-compass && pm2 logs growth-compass"
EOSCRIPT
chmod +x vps-logs.sh

# Create restart script
cat > vps-restart.sh << 'EOSCRIPT'
#!/bin/bash
sshpass -p '63r4k5PS' ssh root@62.171.175.130 "cd /root/apps/growth-compass && pm2 restart growth-compass"
EOSCRIPT
chmod +x vps-restart.sh

echo -e "${GREEN}✅ Convenience scripts created:${NC}"
echo "   ./vps-ssh.sh     - SSH to VPS"
echo "   ./vps-logs.sh    - View application logs"
echo "   ./vps-restart.sh - Restart application"

echo -e "\n${GREEN}✨ Deployment completed successfully!${NC}"