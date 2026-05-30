#!/bin/bash
# ============================================================
# XANVYOR RECON - Full Auto-Deploy Script
# Domain: xanvyorrecon.id
# VPS IP: 76.13.198.125
# Supports: Ubuntu/Debian AND CentOS/RHEL/AlmaLinux/Rocky
# ============================================================
# Don't use set -e - we handle errors manually

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

APP_DIR="/opt/xanvyor-recon"
APP_PORT=3000
DOMAIN="xanvyorrecon.id"
REPO_URL="https://github.com/ucpaistorer/xanvyor-recon.git"

# ============================================================
# Step 1: Stop existing services
# ============================================================
echo -e "${YELLOW}[1/12] Stopping existing services...${NC}"
systemctl stop xanvyor-recon 2>/dev/null || true
pkill -f "node.*server.js" 2>/dev/null || true
sleep 2
echo -e "${GREEN}Services stopped!${NC}"

# ============================================================
# Step 2: System Update & Dependencies
# ============================================================
echo -e "${YELLOW}[2/12] Updating system & installing dependencies...${NC}"

if command -v apt-get &> /dev/null; then
  PKG_MANAGER="apt"
  apt-get update -y
  apt-get upgrade -y
  apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw nginx certbot python3-certbot-nginx
elif command -v dnf &> /dev/null; then
  PKG_MANAGER="dnf"
  dnf update -y
  dnf install -y curl wget git unzip nginx certbot python3-certbot-nginx firewalld
  systemctl enable firewalld; systemctl start firewalld
elif command -v yum &> /dev/null; then
  PKG_MANAGER="yum"
  yum update -y
  yum install -y curl wget git unzip nginx certbot python3-certbot-nginx firewalld
  systemctl enable firewalld; systemctl start firewalld
fi

echo -e "${GREEN}Dependencies installed!${NC}"

# ============================================================
# Step 3: Install Node.js via NVM
# ============================================================
echo -e "${YELLOW}[3/12] Installing Node.js 20...${NC}"
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20

NODE_BIN=$(which node)
echo -e "${GREEN}Node.js: $(node -v) at ${NODE_BIN}${NC}"

# ============================================================
# Step 4: Install Bun
# ============================================================
echo -e "${YELLOW}[4/12] Installing Bun runtime...${NC}"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo -e "${GREEN}Bun: $(bun --version 2>/dev/null || echo 'installed')${NC}"

# ============================================================
# Step 5: Clone/Update Repository
# ============================================================
echo -e "${YELLOW}[5/12] Cloning XANVYOR RECON repository...${NC}"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  git clean -fd
else
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
echo -e "${GREEN}Repository ready!${NC}"

# ============================================================
# Step 6: Install Dependencies & Database
# ============================================================
echo -e "${YELLOW}[6/12] Installing dependencies & setting up database...${NC}"
cd "$APP_DIR"

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

npm install 2>&1 | tail -5
npx prisma generate

mkdir -p "$APP_DIR/db"
export DATABASE_URL="file:$APP_DIR/db/custom.db"

npx prisma db push --skip-generate

echo -e "${YELLOW}Seeding database with API keys...${NC}"
npx prisma db seed 2>/dev/null || bunx tsx prisma/seed.ts 2>/dev/null || node -e "
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
echo -e "${GREEN}Database ready!${NC}"

# ============================================================
# Step 7: Build the project
# ============================================================
echo -e "${YELLOW}[7/12] Building Next.js project (this takes 2-5 min)...${NC}"
cd "$APP_DIR"

export DATABASE_URL="file:$APP_DIR/db/custom.db"
export NODE_ENV="production"

npm run build 2>&1 | tail -20

echo -e "${YELLOW}Preparing standalone build...${NC}"
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

mkdir -p .next/standalone/db
cp -f db/custom.db .next/standalone/db/custom.db 2>/dev/null || true

mkdir -p .next/standalone/prisma
cp -f prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true
cp -r node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null || true
cp -r node_modules/@prisma .next/standalone/node_modules/@prisma 2>/dev/null || true

cat > .next/standalone/.env << PRODENV
DATABASE_URL=file:$APP_DIR/db/custom.db
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
PRODENV

echo -e "${GREEN}Build completed!${NC}"

# ============================================================
# Step 8: Startup script
# ============================================================
echo -e "${YELLOW}[8/12] Creating startup script...${NC}"

cat > $APP_DIR/start-production.sh << 'STARTSCRIPT'
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
export DATABASE_URL="file:/opt/xanvyor-recon/db/custom.db"
export NODE_ENV=production
export PORT=3000
export HOSTNAME=0.0.0.0
cd /opt/xanvyor-recon/.next/standalone
exec node server.js
STARTSCRIPT
chmod +x $APP_DIR/start-production.sh

echo -e "${GREEN}Startup script created!${NC}"

# ============================================================
# Step 9: Systemd Service
# ============================================================
echo -e "${YELLOW}[9/12] Configuring systemd service...${NC}"

cat > /etc/systemd/system/xanvyor-recon.service << EOF
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target nginx.service
Wants=nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${APP_DIR}/db/custom.db
Environment=PATH=/root/.nvm/versions/node/$(node -v)/bin:/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=${APP_DIR}/start-production.sh
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon

echo -e "${GREEN}Service configured!${NC}"

# ============================================================
# Step 10: Nginx
# ============================================================
echo -e "${YELLOW}[10/12] Configuring Nginx reverse proxy...${NC}"

rm -f /etc/nginx/sites-enabled/xanvyor-recon 2>/dev/null
rm -f /etc/nginx/sites-available/xanvyor-recon 2>/dev/null
rm -f /etc/nginx/conf.d/xanvyor-recon.conf 2>/dev/null

cat > /etc/nginx/conf.d/xanvyor-recon.conf << 'NGINX'
server {
    listen 80;
    listen [::]:80;
    server_name xanvyorrecon.id www.xanvyorrecon.id;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name xanvyorrecon.id www.xanvyorrecon.id;

    ssl_certificate /etc/nginx/ssl/xanvyor-recon.crt;
    ssl_certificate_key /etc/nginx/ssl/xanvyor-recon.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

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

    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        expires 365d;
        add_header Cache-Control "public, immutable";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 600s;
        proxy_connect_timeout 120s;
    }
}
NGINX

mkdir -p /etc/nginx/ssl /var/www/html

if [ ! -f /etc/nginx/ssl/xanvyor-recon.crt ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/xanvyor-recon.key \
    -out /etc/nginx/ssl/xanvyor-recon.crt \
    -subj "/CN=xanvyorrecon.id/O=XANVYOR/C=ID" 2>/dev/null || true
fi

rm -f /etc/nginx/sites-enabled/default 2>/dev/null

nginx -t 2>&1 && systemctl restart nginx || {
  echo -e "${YELLOW}HTTPS config failed, using HTTP-only...${NC}"
  cat > /etc/nginx/conf.d/xanvyor-recon.conf << 'NGINX_SIMPLE'
server {
    listen 80;
    listen [::]:80;
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
        proxy_read_timeout 300s;
    }
}
NGINX_SIMPLE
  nginx -t && systemctl restart nginx
}

echo -e "${GREEN}Nginx configured!${NC}"

# ============================================================
# Step 11: Firewall
# ============================================================
echo -e "${YELLOW}[11/12] Configuring firewall...${NC}"

if [ "$PKG_MANAGER" = "apt" ]; then
  ufw --force enable
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force reload
else
  firewall-cmd --permanent --add-service=ssh
  firewall-cmd --permanent --add-service=http
  firewall-cmd --permanent --add-service=https
  firewall-cmd --reload
fi

echo -e "${GREEN}Firewall configured!${NC}"

# ============================================================
# Step 12: SSL & DNS
# ============================================================
echo -e "${YELLOW}[12/12] Setting up SSL...${NC}"
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "76.13.198.125")
DNS_IP=$(dig +short ${DOMAIN} A 2>/dev/null | tail -1 || echo "")

if [ "$DNS_IP" = "$SERVER_IP" ]; then
  echo -e "${GREEN}DNS is pointing to this server! Setting up SSL...${NC}"
  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} --redirect 2>&1 || {
    echo -e "${YELLOW}certbot nginx plugin failed, trying standalone...${NC}"
    systemctl stop nginx
    certbot certonly --standalone -d ${DOMAIN} -d www.${DOMAIN} --non-interactive --agree-tos --email admin@${DOMAIN} 2>&1 || true
    systemctl start nginx
  }
else
  echo -e "${YELLOW}⚠️  DNS not pointing here yet. Update DNS at Hostinger:${NC}"
  echo -e "  A record '@' -> ${SERVER_IP}"
  echo -e "  A record 'www' -> ${SERVER_IP}"
  echo -e "  Then: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
fi

# SSL auto-renewal
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | crontab -

# ============================================================
# Final Verification
# ============================================================
echo ""
echo -e "${YELLOW}Waiting for app to start...${NC}"
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302"; then
    break
  fi
  sleep 2
done

if systemctl is-active --quiet xanvyor-recon; then
  echo -e "${GREEN}✅ XANVYOR RECON: RUNNING${NC}"
else
  echo -e "${RED}❌ XANVYOR RECON: NOT RUNNING${NC}"
  journalctl -u xanvyor-recon --no-pager -n 20
fi

if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✅ Nginx: RUNNING${NC}"
else
  echo -e "${RED}❌ Nginx: NOT RUNNING${NC}"
fi

if [ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
  echo -e "${GREEN}✅ SSL: Let's Encrypt CERTIFICATE INSTALLED${NC}"
fi

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 XANVYOR RECON DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Access: ${GREEN}http://${DOMAIN}${NC} or ${GREEN}http://76.13.198.125${NC}"
echo ""
echo -e "Login with API Key:"
echo -e "  ${YELLOW}5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e${NC}"
echo ""
echo -e "Admin Key:"
echo -e "  ${YELLOW}recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e${NC}"
echo ""
echo -e "Commands:"
echo -e "  Status:  ${CYAN}systemctl status xanvyor-recon${NC}"
echo -e "  Logs:    ${CYAN}journalctl -u xanvyor-recon -f${NC}"
echo -e "  Restart: ${CYAN}systemctl restart xanvyor-recon${NC}"
