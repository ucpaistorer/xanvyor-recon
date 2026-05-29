#!/bin/bash
# ============================================================
# XANVYOR RECON - Full Auto-Deploy Script
# Domain: xanvyorrecon.id
# VPS IP: 76.13.198.125
# ============================================================
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║     XANVYOR RECON - Auto Deploy System          ║"
echo "║     Domain: xanvyorrecon.id                     ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Configuration
APP_DIR="/opt/xanvyor-recon"
APP_PORT=3000
DOMAIN="xanvyorrecon.id"
REPO_URL="https://github.com/ucpaistorer/xanvyor-recon.git"
NODE_VERSION=20

# ============================================================
# Step 1: System Update & Dependencies
# ============================================================
echo -e "${YELLOW}[1/10] Updating system & installing dependencies...${NC}"
apt-get update -y
apt-get upgrade -y
apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw nginx certbot python3-certbot-nginx

# ============================================================
# Step 2: Install Node.js via NVM
# ============================================================
echo -e "${YELLOW}[2/10] Installing Node.js ${NODE_VERSION}...${NC}"
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install ${NODE_VERSION}
nvm use ${NODE_VERSION}
nvm alias default ${NODE_VERSION}

# Verify Node.js
NODE_PATH=$(which node)
echo -e "${GREEN}Node.js installed: $(node -v) at ${NODE_PATH}${NC}"
echo -e "${GREEN}npm installed: $(npm -v)${NC}"

# ============================================================
# Step 3: Install Bun
# ============================================================
echo -e "${YELLOW}[3/10] Installing Bun runtime...${NC}"
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo -e "${GREEN}Bun installed: $(bun --version)${NC}"

# ============================================================
# Step 4: Clone/Update Repository
# ============================================================
echo -e "${YELLOW}[4/10] Cloning XANVYOR RECON repository...${NC}"
if [ -d "$APP_DIR" ]; then
  echo "Updating existing installation..."
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
else
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi

# ============================================================
# Step 5: Install Dependencies & Build
# ============================================================
echo -e "${YELLOW}[5/10] Installing dependencies & building project...${NC}"
cd "$APP_DIR"

# Load nvm for this shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Seed database
echo -e "${YELLOW}Seeding database with API keys...${NC}"
npx prisma db seed || bunx tsx prisma/seed.ts || node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function seed() {
  const admin = await prisma.user.upsert({ where: {id:'admin-001'}, update:{}, create:{id:'admin-001',name:'Administrator',phone:'+6287892614294'} });
  const keys = [
    { key:'recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e', label:'Admin Master Key', plan:'lifetime' },
    { key:'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', label:'Admin Key #2', plan:'lifetime' },
    { key:'5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e', label:'User Master Key', plan:'lifetime' },
    { key:'8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', label:'User Key #2', plan:'lifetime' },
  ];
  for (const k of keys) {
    await prisma.apiKey.upsert({ where:{key:k.key}, update:{}, create:{key:k.key,userId:admin.id,plan:k.plan,label:k.label,isActive:true} });
  }
  console.log('Seed completed!');
  await prisma.\$disconnect();
}
seed().catch(e => { console.error(e); process.exit(1); });
"

# Build the project
echo -e "${YELLOW}Building Next.js project (this may take a few minutes)...${NC}"
npm run build

echo -e "${GREEN}Build completed successfully!${NC}"

# ============================================================
# Step 6: Configure Systemd Service
# ============================================================
echo -e "${YELLOW}[6/10] Configuring systemd service...${NC}"

# Get the actual node path
NODE_BIN=$(which node)
BUN_BIN=$(which bun)

cat > /etc/systemd/system/xanvyor-recon.service << EOF
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=DATABASE_URL=file:./db/custom.db
Environment=PATH=/root/.nvm/versions/node/$(node -v)/bin:/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=${NODE_BIN} ${APP_DIR}/.next/standalone/server.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Reload and enable
systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon

echo -e "${GREEN}Systemd service configured and started!${NC}"

# ============================================================
# Step 7: Configure Nginx Reverse Proxy
# ============================================================
echo -e "${YELLOW}[7/10] Configuring Nginx reverse proxy...${NC}"

cat > /etc/nginx/sites-available/xanvyor-recon << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name xanvyorrecon.id www.xanvyorrecon.id;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;

    # Max upload size for image analysis
    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # API rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Static files caching
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    # Health check endpoint
    location /health {
        proxy_pass http://127.0.0.1:3000;
        access_log off;
    }
}
NGINX

# Enable the site
rm -f /etc/nginx/sites-enabled/default
ln -sf /etc/nginx/sites-available/xanvyor-recon /etc/nginx/sites-enabled/xanvyor-recon

# Test and restart nginx
nginx -t
systemctl restart nginx

echo -e "${GREEN}Nginx configured!${NC}"

# ============================================================
# Step 8: Configure Firewall
# ============================================================
echo -e "${YELLOW}[8/10] Configuring UFW firewall...${NC}"
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force reload

echo -e "${GREEN}Firewall configured!${NC}"

# ============================================================
# Step 9: SSL Certificate with Certbot
# ============================================================
echo -e "${YELLOW}[9/10] Setting up SSL certificate...${NC}"
# Check if DNS is pointing to this server
CURRENT_IP=$(dig +short ${DOMAIN} | tail -1)
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "76.13.198.125")

if [ "$CURRENT_IP" = "$SERVER_IP" ] || [ "$CURRENT_IP" = "" ]; then
  echo "Attempting SSL certificate setup..."
  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect || {
    echo -e "${YELLOW}SSL setup failed - DNS may not be pointing to this server yet.${NC}"
    echo -e "${YELLOW}Run this after updating DNS: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}${NC}"
  }
else
  echo -e "${YELLOW}DNS for ${DOMAIN} points to ${CURRENT_IP}, not this server (${SERVER_IP})${NC}"
  echo -e "${YELLOW}Update your DNS A record at Hostinger to point to ${SERVER_IP}${NC}"
  echo -e "${YELLOW}Then run: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}${NC}"
fi

# ============================================================
# Step 10: Final Verification
# ============================================================
echo -e "${YELLOW}[10/10] Running final verification...${NC}"

# Wait for app to start
sleep 5

# Check if the app is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|301\|302"; then
  echo -e "${GREEN}✅ Application is running on port 3000!${NC}"
else
  echo -e "${RED}❌ Application may not be running. Checking logs...${NC}"
  journalctl -u xanvyor-recon --no-pager -n 20
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✅ Nginx is running!${NC}"
else
  echo -e "${RED}❌ Nginx is not running${NC}"
fi

# Check systemd service
if systemctl is-active --quiet xanvyor-recon; then
  echo -e "${GREEN}✅ XANVYOR RECON service is running!${NC}"
else
  echo -e "${RED}❌ XANVYOR RECON service is not running${NC}"
  journalctl -u xanvyor-recon --no-pager -n 20
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 XANVYOR RECON DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Access your application at:"
echo -e "  ${GREEN}http://${DOMAIN}${NC}"
echo -e "  ${GREEN}http://$(curl -s ifconfig.me 2>/dev/null || echo '76.13.198.125')${NC}"
echo ""
echo -e "Admin API Keys:"
echo -e "  ${YELLOW}recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e${NC}"
echo -e "  ${YELLOW}recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a${NC}"
echo ""
echo -e "User API Keys:"
echo -e "  ${YELLOW}5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e${NC}"
echo -e "  ${YELLOW}8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a${NC}"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT DNS SETUP:${NC}"
echo -e "  If ${DOMAIN} is not pointing to this server:"
echo -e "  1. Go to Hostinger DNS Zone Editor"
echo -e "  2. Change A record for @ to: 76.13.198.125"
echo -e "  3. Change A record for www to: 76.13.198.125"
echo -e "  4. Wait for DNS propagation (5-30 minutes)"
echo -e "  5. Run: ${CYAN}certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  Check status: ${CYAN}systemctl status xanvyor-recon${NC}"
echo -e "  View logs:    ${CYAN}journalctl -u xanvyor-recon -f${NC}"
echo -e "  Restart:      ${CYAN}systemctl restart xanvyor-recon${NC}"
echo -e "  Rebuild:      ${CYAN}cd ${APP_DIR} && git pull && npm run build && systemctl restart xanvyor-recon${NC}"
echo ""
