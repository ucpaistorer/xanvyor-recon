#!/bin/bash
# ============================================================
# XANVYOR RECON - Complete Fix & Deploy Script
# Fixes: SSL, Database, Features, Service
# Domain: xanvyorrecon.id | VPS: 76.13.198.125
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║   XANVYOR RECON - Complete Fix & Deploy System       ║"
echo "║   All features will be working after this script      ║"
echo "╚═══════════════════════════════════════════════════════╝"
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
pkill -f "next start" 2>/dev/null || true
pkill -f "bun.*start" 2>/dev/null || true
# Stop any PM2 processes
pm2 delete all 2>/dev/null || true
sleep 2
echo -e "${GREEN}Services stopped!${NC}"

# ============================================================
# Step 2: Install system dependencies
# ============================================================
echo -e "${YELLOW}[2/12] Installing system dependencies...${NC}"
export DEBIAN_FRONTEND=noninteractive
if command -v apt-get &> /dev/null; then
  apt-get update -y
  apt-get install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw nginx certbot python3-certbot-nginx build-essential python3
elif command -v dnf &> /dev/null; then
  dnf update -y
  dnf install -y curl wget git unzip nginx certbot python3-certbot-nginx
elif command -v yum &> /dev/null; then
  yum update -y
  yum install -y curl wget git unzip nginx certbot python3-certbot-nginx
fi
echo -e "${GREEN}System dependencies installed!${NC}"

# ============================================================
# Step 3: Install Node.js 20 via NVM
# ============================================================
echo -e "${YELLOW}[3/12] Setting up Node.js 20...${NC}"
export NVM_DIR="$HOME/.nvm"
if [ ! -d "$NVM_DIR" ]; then
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
nvm install 20
nvm use 20
nvm alias default 20

NODE_BIN=$(which node)
NPM_BIN=$(which npm)
echo -e "${GREEN}Node.js: $(node -v) at ${NODE_BIN}${NC}"
echo -e "${GREEN}npm: $(npm -v)${NC}"

# ============================================================
# Step 4: Install Bun
# ============================================================
echo -e "${YELLOW}[4/12] Installing Bun...${NC}"
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
echo -e "${YELLOW}[5/12] Cloning/updating repository...${NC}"
if [ -d "$APP_DIR/.git" ]; then
  cd "$APP_DIR"
  git fetch origin
  git reset --hard origin/main
  git clean -fd
else
  # Kill any process using port 3000
  fuser -k 3000/tcp 2>/dev/null || true
  
  # Remove old directory completely
  rm -rf "$APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
  cd "$APP_DIR"
fi
echo -e "${GREEN}Repository updated!${NC}"

# ============================================================
# Step 6: Install dependencies & Generate Prisma
# ============================================================
echo -e "${YELLOW}[6/12] Installing dependencies...${NC}"
cd "$APP_DIR"

# Load nvm for this shell
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

npm install 2>&1 | tail -5

# Generate Prisma client
echo -e "${YELLOW}Generating Prisma client...${NC}"
npx prisma generate

# Create database directory
mkdir -p "$APP_DIR/db"

# Set DATABASE_URL for build
export DATABASE_URL="file:$APP_DIR/db/custom.db"

# Push database schema
echo -e "${YELLOW}Creating database schema...${NC}"
npx prisma db push --skip-generate

# Seed database with API keys
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

echo -e "${GREEN}Dependencies and database ready!${NC}"

# ============================================================
# Step 7: Build the Next.js project
# ============================================================
echo -e "${YELLOW}[7/12] Building Next.js project (this takes 2-5 minutes)...${NC}"
cd "$APP_DIR"

export DATABASE_URL="file:$APP_DIR/db/custom.db"
export NODE_ENV="production"

npm run build 2>&1 | tail -20

# Copy static files to standalone output
echo -e "${YELLOW}Preparing standalone build...${NC}"
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true

# Copy the database file to standalone
mkdir -p .next/standalone/db
cp -f db/custom.db .next/standalone/db/custom.db 2>/dev/null || true

# Copy prisma schema and client to standalone
mkdir -p .next/standalone/prisma
cp -f prisma/schema.prisma .next/standalone/prisma/ 2>/dev/null || true
cp -r node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null || true
cp -r node_modules/@prisma .next/standalone/node_modules/@prisma 2>/dev/null || true

# Create production .env
cat > .next/standalone/.env << PRODENV
DATABASE_URL=file:$APP_DIR/db/custom.db
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
PRODENV

echo -e "${GREEN}Build completed!${NC}"

# ============================================================
# Step 8: Create startup script
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
# Step 9: Configure Systemd Service
# ============================================================
echo -e "${YELLOW}[9/12] Configuring systemd service...${NC}"

NODE_BIN_PATH=$(which node)
NODE_VERSION=$(node -v)

cat > /etc/systemd/system/xanvyor-recon.service << EOF
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target nginx.service
Wants=nginx.service

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=PORT=$APP_PORT
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:$APP_DIR/db/custom.db
Environment=PATH=/root/.nvm/versions/node/$NODE_VERSION/bin:/root/.bun/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=$APP_DIR/start-production.sh
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

echo -e "${GREEN}Service configured and started!${NC}"

# ============================================================
# Step 10: Configure Nginx
# ============================================================
echo -e "${YELLOW}[10/12] Configuring Nginx reverse proxy...${NC}"

# Remove ALL existing configs for our domain
rm -f /etc/nginx/sites-enabled/xanvyor-recon 2>/dev/null
rm -f /etc/nginx/sites-available/xanvyor-recon 2>/dev/null
rm -f /etc/nginx/conf.d/xanvyor-recon.conf 2>/dev/null
rm -f /etc/nginx/sites-enabled/default 2>/dev/null

# Create webroot for certbot challenges
mkdir -p /var/www/html

# Create self-signed certificate as fallback
mkdir -p /etc/nginx/ssl
if [ ! -f /etc/nginx/ssl/xanvyor-recon.crt ]; then
  openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/xanvyor-recon.key \
    -out /etc/nginx/ssl/xanvyor-recon.crt \
    -subj "/CN=xanvyorrecon.id/O=XANVYOR/C=ID" 2>/dev/null || true
fi

cat > /etc/nginx/conf.d/xanvyor-recon.conf << 'NGINX'
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name xanvyorrecon.id www.xanvyorrecon.id;

    # Let's Encrypt challenge
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name xanvyorrecon.id www.xanvyorrecon.id;

    ssl_certificate /etc/nginx/ssl/xanvyor-recon.crt;
    ssl_certificate_key /etc/nginx/ssl/xanvyor-recon.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

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
        proxy_send_timeout 300s;
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

# Test nginx config
nginx -t 2>&1 && systemctl restart nginx || {
  echo -e "${RED}Nginx config error, trying simpler config...${NC}"
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
        proxy_connect_timeout 75s;
    }
}
NGINX_SIMPLE
  nginx -t && systemctl restart nginx
}

echo -e "${GREEN}Nginx configured!${NC}"

# ============================================================
# Step 11: Setup SSL with Let's Encrypt
# ============================================================
echo -e "${YELLOW}[11/12] Setting up SSL certificate...${NC}"

SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "76.13.198.125")
DNS_IP=$(dig +short ${DOMAIN} A 2>/dev/null | tail -1 || echo "")
WWW_DNS_IP=$(dig +short www.${DOMAIN} A 2>/dev/null | tail -1 || echo "")

echo -e "Server IP: ${SERVER_IP}"
echo -e "${DOMAIN} DNS: ${DNS_IP:-not resolving}"

if [ "$DNS_IP" = "$SERVER_IP" ] || [ "$WWW_DNS_IP" = "$SERVER_IP" ]; then
  echo -e "${GREEN}DNS is pointing to this server! Setting up SSL...${NC}"
  
  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN} \
    --non-interactive --agree-tos --email admin@${DOMAIN} --redirect \
    2>&1 || {
      echo -e "${YELLOW}Standard certbot failed, trying standalone mode...${NC}"
      systemctl stop nginx
      certbot certonly --standalone -d ${DOMAIN} -d www.${DOMAIN} \
        --non-interactive --agree-tos --email admin@${DOMAIN} 2>&1 || {
        echo -e "${YELLOW}Standalone also failed, trying webroot mode...${NC}"
        systemctl start nginx
        sleep 2
        certbot certonly --webroot -w /var/www/html \
          -d ${DOMAIN} -d www.${DOMAIN} \
          --non-interactive --agree-tos --email admin@${DOMAIN} 2>&1 || {
          echo -e "${RED}SSL setup failed. Will use HTTP for now.${NC}"
          echo -e "${YELLOW}To manually setup SSL later, run:${NC}"
          echo -e "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
        }
      }
      systemctl start nginx
    }
    
  if [ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
    echo -e "${GREEN}SSL certificate obtained! Updating Nginx...${NC}"
    nginx -t && systemctl restart nginx
  fi
else
  echo -e "${YELLOW}⚠️  DNS NOT POINTING TO THIS SERVER YET!${NC}"
  echo -e "${YELLOW}Current: ${DOMAIN} -> ${DNS_IP:-'not resolving'}${NC}"
  echo -e "${YELLOW}Needed:  ${DOMAIN} -> ${SERVER_IP}${NC}"
  echo ""
  echo -e "${CYAN}DNS UPDATE REQUIRED:${NC}"
  echo -e "  1. Go to your domain registrar's DNS settings"
  echo -e "  2. Edit A record '@' -> ${SERVER_IP}"
  echo -e "  3. Add/Edit A record 'www' -> ${SERVER_IP}"
  echo -e "  4. Wait 5-30 min for DNS propagation"
  echo -e "  5. Then run: certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  echo ""
  echo -e "${YELLOW}The site is available on HTTP at: http://${DOMAIN}${NC}"
fi

# ============================================================
# Step 12: Final Verification & Health Check
# ============================================================
echo -e "${YELLOW}[12/12] Final verification...${NC}"

echo "Waiting for application to start..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q "200\|301\|302"; then
    echo -e "${GREEN}App is running on port 3000!${NC}"
    break
  fi
  echo -n "."
  sleep 2
done
echo ""

# Check services
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  SERVICE STATUS${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"

if systemctl is-active --quiet xanvyor-recon; then
  echo -e "${GREEN}✅ XANVYOR RECON service: RUNNING${NC}"
else
  echo -e "${RED}❌ XANVYOR RECON service: NOT RUNNING${NC}"
  journalctl -u xanvyor-recon --no-pager -n 30
fi

if systemctl is-active --quiet nginx; then
  echo -e "${GREEN}✅ Nginx: RUNNING${NC}"
else
  echo -e "${RED}❌ Nginx: NOT RUNNING${NC}"
  systemctl status nginx --no-pager -l
fi

if [ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
  echo -e "${GREEN}✅ SSL Certificate: INSTALLED (Let's Encrypt)${NC}"
elif [ -f /etc/nginx/ssl/xanvyor-recon.crt ]; then
  echo -e "${YELLOW}⚠️  SSL Certificate: Self-signed (browsers will show warning)${NC}"
else
  echo -e "${YELLOW}⚠️  SSL Certificate: NOT INSTALLED${NC}"
fi

if [ -f "$APP_DIR/db/custom.db" ]; then
  echo -e "${GREEN}✅ Database: EXISTS${NC}"
else
  echo -e "${RED}❌ Database: NOT FOUND${NC}"
fi

API_TEST=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/validate 2>/dev/null || echo "000")
if [ "$API_TEST" = "200" ] || [ "$API_TEST" = "405" ] || [ "$API_TEST" = "400" ]; then
  echo -e "${GREEN}✅ API Routes: WORKING${NC}"
else
  echo -e "${RED}❌ API Routes: NOT WORKING (HTTP ${API_TEST})${NC}"
fi

# Test a full OSINT feature
echo ""
echo -e "${YELLOW}Testing OSINT feature (IP lookup)...${NC}"
OSINT_TEST=$(curl -s -X POST http://localhost:3000/api/osint/ip \
  -H "Content-Type: application/json" \
  -d '{"ip":"8.8.8.8"}' 2>/dev/null)

if echo "$OSINT_TEST" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ OSINT IP Lookup: WORKING${NC}"
elif echo "$OSINT_TEST" | grep -q '"error"'; then
  echo -e "${RED}❌ OSINT IP Lookup: ERROR${NC}"
  echo "Error: $(echo $OSINT_TEST | head -c 200)"
else
  echo -e "${YELLOW}⚠️  OSINT IP Lookup: No response or timeout${NC}"
fi

# Print final summary
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 XANVYOR RECON DEPLOYMENT COMPLETE!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Access your application:"
if [ -f /etc/letsencrypt/live/${DOMAIN}/fullchain.pem ]; then
  echo -e "  ${GREEN}https://${DOMAIN}${NC}"
else
  echo -e "  ${GREEN}http://${DOMAIN}${NC}"
  echo -e "  ${GREEN}http://76.13.198.125${NC}"
fi
echo ""
echo -e "API Keys (login with these):"
echo -e "  ${YELLOW}Admin: recon-admin-5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e${NC}"
echo -e "  ${YELLOW}User:  5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e${NC}"
echo ""
echo -e "Useful commands:"
echo -e "  Status:  ${CYAN}systemctl status xanvyor-recon${NC}"
echo -e "  Logs:    ${CYAN}journalctl -u xanvyor-recon -f${NC}"
echo -e "  Restart: ${CYAN}systemctl restart xanvyor-recon${NC}"
echo -e "  Nginx:   ${CYAN}systemctl status nginx${NC}"
echo -e "  SSL:     ${CYAN}certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}${NC}"
echo ""

# Auto-renew SSL certificate
echo -e "${YELLOW}Setting up auto-renewal for SSL...${NC}"
(crontab -l 2>/dev/null; echo "0 3 * * * certbot renew --quiet --post-hook 'systemctl reload nginx'") | sort -u | crontab -
echo -e "${GREEN}SSL auto-renewal configured!${NC}"

# Set up auto-update cron (pull latest code every hour)
echo -e "${YELLOW}Setting up auto-update cron...${NC}"
(crontab -l 2>/dev/null; echo "0 * * * * cd /opt/xanvyor-recon && git fetch origin && git reset --hard origin/main && npm install && npx prisma generate && npm run build && systemctl restart xanvyor-recon 2>/dev/null") | sort -u | crontab -
echo -e "${GREEN}Auto-update cron configured!${NC}"
