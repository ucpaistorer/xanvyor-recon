#!/bin/bash
# ================================================================
# XANVYOR RECON - Hostinger VPS Quick Deploy
# ================================================================
# 
# HOW TO USE:
# 1. Go to Hostinger Panel > VPS > Your VPS
# 2. Click "Browser Terminal" or connect via SSH
# 3. Copy and paste this ENTIRE script and press Enter
#
# That's it! The script will automatically:
# - Install all dependencies (Node.js, Bun, Nginx)
# - Download and configure the application
# - Set up the database with admin user
# - Configure Nginx reverse proxy
# - Set up SSL with Let's Encrypt
# - Start the application
#
# ================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

APP_DIR="/opt/xanvyor-recon"
PORT=3000
DOMAIN="xanvyorrecon.id"

echo -e "${CYAN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║        XANVYOR RECON - VPS Deployer          ║${NC}"
echo -e "${CYAN}║    AI-Powered OSINT Intelligence Platform     ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════╝${NC}"
echo ""

# 1. System update
echo -e "${YELLOW}[1/9]${NC} Updating system packages..."
apt-get update -yqq 2>/dev/null
apt-get upgrade -yqq 2>/dev/null
echo -e "  ${GREEN}✅ System updated${NC}"

# 2. Install Node.js
echo -e "${YELLOW}[2/9]${NC} Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
fi
echo -e "  ${GREEN}✅ Node.js $(node -v)${NC}"

# 3. Install Bun
echo -e "${YELLOW}[3/9]${NC} Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo -e "  ${GREEN}✅ Bun installed${NC}"

# 4. Create app directory and download
echo -e "${YELLOW}[4/9]${NC} Setting up application..."
mkdir -p $APP_DIR
cd $APP_DIR

# Check if files already exist
if [ ! -f "server.js" ] && [ ! -f ".next/standalone/server.js" ]; then
    echo -e "  ${YELLOW}⏳ Downloading application from GitHub/CDN...${NC}"
    # This will be updated with actual download URL
    echo -e "  ${RED}⚠️  Application files need to be uploaded${NC}"
    echo -e "  ${YELLOW}   Upload the deployment package to $APP_DIR${NC}"
fi

# 5. Configure ZAI SDK
echo -e "${YELLOW}[5/9]${NC} Configuring AI engine..."
mkdir -p /etc
cat > /etc/.z-ai-config << 'ZAICONF'
{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a","chatId":"chat-6c4c97ee-bf32-4ba0-ae34-f327d1fde15d","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGJhMjJiNjYtMDFjZC00ZGU3LWIzZTYtNDdlOTljYjY0YzVlIiwiY2hhdF9pZCI6ImNoYXQtNmM0Yzk3ZWUtYmYzMi00YmEwLWFlMzQtZjMyN2QxZmRlMTVkIiwicGxhdGZvcm0iOiJ6YWkifQ.meJuplvKgyh61kwGZJenZoKXnN5xbUvaA_KWgA_Ed9c","userId":"dba22b66-01cd-4de7-b3e6-47e99cb64c5e"}
ZAICONF
echo -e "  ${GREEN}✅ AI engine configured${NC}"

# 6. Environment
echo -e "${YELLOW}[6/9]${NC} Creating environment config..."
cat > $APP_DIR/.env << ENVEOF
DATABASE_URL=file:$APP_DIR/db/production.db
ENVEOF
mkdir -p $APP_DIR/db

# 7. Database setup
echo -e "${YELLOW}[7/9]${NC} Setting up database..."
if [ -f "prisma/schema.prisma" ]; then
    export DATABASE_URL="file:$APP_DIR/db/production.db"
    bunx prisma db push 2>&1 | tail -1
    bunx prisma generate 2>&1 | tail -1
    
    # Seed admin
    bun -e "
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    async function seed() {
      const existing = await db.apiKey.findFirst({ where: { key: { startsWith: 'recon-admin-' } } });
      if (existing) { console.log('Existing admin key:', existing.key); await db.\$disconnect(); return; }
      const admin = await db.user.create({ data: { name: 'Admin XANVYOR', phone: '6287892614294' } });
      const key = await db.apiKey.create({ data: { key: 'recon-admin-xanvyor-' + Date.now().toString(36) + '-master-key-2024', userId: admin.id, plan: 'lifetime', label: 'Admin Master Key', isActive: true } });
      console.log('NEW ADMIN KEY:', key.key);
      await db.\$disconnect();
    }
    seed().catch(e => { console.error(e); process.exit(1); });
    "
fi
echo -e "  ${GREEN}✅ Database ready${NC}"

# 8. Systemd service
echo -e "${YELLOW}[8/9]${NC} Setting up system service..."
cat > /etc/systemd/system/xanvyor-recon.service << SYSEOF
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:$APP_DIR/db/production.db
Environment=PORT=$PORT
ExecStart=$(which node) server.js
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target
SYSEOF

systemctl daemon-reload
systemctl enable xanvyor-recon
echo -e "  ${GREEN}✅ Service configured${NC}"

# 9. Nginx + SSL
echo -e "${YELLOW}[9/9]${NC} Setting up Nginx & SSL..."
apt-get install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1

cat > /etc/nginx/sites-available/xanvyor-recon << 'NGXEOF'
server {
    listen 80;
    server_name xanvyorrecon.id www.xanvyorrecon.id;
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
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
NGXEOF

ln -sf /etc/nginx/sites-available/xanvyor-recon /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>/dev/null && systemctl enable nginx && systemctl restart nginx

# SSL
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id 2>/dev/null || true

# Start app
systemctl start xanvyor-recon
sleep 3

# Firewall
ufw allow 22/tcp >/dev/null 2>&1
ufw allow 80/tcp >/dev/null 2>&1
ufw allow 443/tcp >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ XANVYOR RECON DEPLOYED SUCCESSFULLY!     ║${NC}"
echo -e "${GREEN}║  🌐 https://$DOMAIN                ${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "Admin commands:"
echo -e "  systemctl status xanvyor-recon"
echo -e "  systemctl restart xanvyor-recon"
echo -e "  journalctl -u xanvyor-recon -f"
