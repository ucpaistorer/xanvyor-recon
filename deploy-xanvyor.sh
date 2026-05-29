#!/bin/bash
# =============================================================
# XANVYOR RECON - VPS Deployment Script
# Domain: xanvyorrecon.id
# =============================================================
set -e

echo "=========================================="
echo "  XANVYOR RECON - VPS Deployment"
echo "  Domain: xanvyorrecon.id"
echo "=========================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root${NC}"
  exit 1
fi

# ---- STEP 1: Install Node.js ----
echo -e "${CYAN}[1/7] Installing Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo -e "${GREEN}Node.js $(node -v) installed${NC}"

# ---- STEP 2: Install Bun ----
echo -e "${CYAN}[2/7] Installing Bun...${NC}"
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo -e "${GREEN}Bun installed${NC}"

# ---- STEP 3: Install Nginx ----
echo -e "${CYAN}[3/7] Installing Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
  apt-get update -y
  apt-get install -y nginx
fi
systemctl enable nginx
systemctl start nginx
echo -e "${GREEN}Nginx installed${NC}"

# ---- STEP 4: Clone/Setup Project ----
APP_DIR="/opt/xanvyor-recon"
echo -e "${CYAN}[4/7] Setting up project at ${APP_DIR}...${NC}"

if [ -d "$APP_DIR" ]; then
  echo -e "${YELLOW}Project directory exists, updating...${NC}"
  cd "$APP_DIR"
  if [ -d ".git" ]; then
    git pull origin main 2>/dev/null || true
  fi
else
  mkdir -p "$APP_DIR"
  cd "$APP_DIR"
  # If git repo exists, clone it; otherwise we'll set up from uploaded files
  git clone https://github.com/xanvyor/recon.git . 2>/dev/null || true
fi

cd "$APP_DIR"

# Install dependencies
echo -e "${CYAN}Installing dependencies...${NC}"
npm install --legacy-peer-deps 2>/dev/null || bun install 2>/dev/null || npm install

# Generate Prisma client
echo -e "${CYAN}Generating Prisma client...${NC}"
npx prisma generate 2>/dev/null || bun run db:generate 2>/dev/null

# Create .env if not exists
if [ ! -f ".env" ]; then
  cat > .env << 'ENVEOF'
DATABASE_URL=file:./db/xanvyor.db
ENVEOF
fi

# Create db directory
mkdir -p db

# Push database schema
echo -e "${CYAN}Pushing database schema...${NC}"
npx prisma db push 2>/dev/null || bun run db:push 2>/dev/null

# Seed admin user and API key
echo -e "${CYAN}Seeding database...${NC}"
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.user.upsert({
    where: { id: 'admin-001' },
    update: {},
    create: { id: 'admin-001', name: 'Admin', phone: '6287892614294' }
  });
  await prisma.apiKey.upsert({
    where: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' },
    update: { isActive: true, plan: 'lifetime', label: 'Admin Master Key' },
    create: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'Admin Master Key', isActive: true }
  });
  await prisma.apiKey.upsert({
    where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' },
    update: { isActive: true, plan: 'lifetime', label: 'Admin Key' },
    create: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'Admin Key', isActive: true }
  });
  console.log('Database seeded successfully!');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect());
"

# Build the project
echo -e "${CYAN}Building Next.js project...${NC}"
npm run build 2>/dev/null || bun run build 2>/dev/null || npx next build

echo -e "${GREEN}Project built successfully!${NC}"

# ---- STEP 5: Configure Nginx ----
echo -e "${CYAN}[5/7] Configuring Nginx for xanvyorrecon.id...${NC}"

cat > /etc/nginx/sites-available/xanvyorrecon.id << 'NGINXEOF'
server {
    listen 80;
    listen [::]:80;
    server_name xanvyorrecon.id www.xanvyorrecon.id;

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
        proxy_send_timeout 300s;
    }

    # Handle large uploads (for image analysis)
    client_max_body_size 50M;
}
NGINXEOF

# Enable the site
ln -sf /etc/nginx/sites-available/xanvyorrecon.id /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx config
nginx -t

# Reload Nginx
systemctl reload nginx

echo -e "${GREEN}Nginx configured${NC}"

# ---- STEP 6: Install SSL with Certbot ----
echo -e "${CYAN}[6/7] Installing SSL certificate...${NC}"
if ! command -v certbot &> /dev/null; then
  apt-get install -y certbot python3-certbot-nginx
fi

# Obtain SSL certificate
echo -e "${YELLOW}Obtaining SSL certificate... (this may take a minute)${NC}"
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id --redirect || {
  echo -e "${YELLOW}SSL certificate installation failed. You can try manually later:${NC}"
  echo -e "${YELLOW}  certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id${NC}"
}

echo -e "${GREEN}SSL configured${NC}"

# ---- STEP 7: Setup systemd service ----
echo -e "${CYAN}[7/7] Setting up systemd service...${NC}"

cat > /etc/systemd/system/xanvyor-recon.service << 'SVCEOF'
[Unit]
Description=XANVYOR RECON - OSINT Intelligence Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xanvyor-recon
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:./db/xanvyor.db
ExecStart=/usr/bin/node .next/standalone/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SVCEOF

# Reload systemd and start service
systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon

echo ""
echo -e "${GREEN}=========================================="
echo -e "  XANVYOR RECON DEPLOYED SUCCESSFULLY!"
echo -e "==========================================${NC}"
echo ""
echo -e "  ${CYAN}Website:${NC}     https://xanvyorrecon.id"
echo -e "  ${CYAN}Admin Key:${NC}   recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo -e "  ${CYAN}User Key:${NC}    8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo ""
echo -e "  ${YELLOW}Important DNS Setup:${NC}"
echo -e "  Make sure your domain DNS points to this VPS IP:"
echo -e "  A Record:  xanvyorrecon.id  ->  $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')"
echo -e "  A Record:  www.xanvyorrecon.id  ->  $(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_VPS_IP')"
echo ""
echo -e "  ${YELLOW}Useful Commands:${NC}"
echo -e "  systemctl status xanvyor-recon   - Check service status"
echo -e "  systemctl restart xanvyor-recon  - Restart the app"
echo -e "  journalctl -u xanvyor-recon -f   - View live logs"
echo ""
