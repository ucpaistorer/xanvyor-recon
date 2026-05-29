#!/bin/bash
# =============================================================
# XANVYOR RECON - Quick Deploy (Copy-Paste to VPS)
# Run this on your VPS: bash <(curl -sL <url>) 
# Or just paste it directly into SSH terminal
# =============================================================

set -e

APP_DIR="/opt/xanvyor-recon"
GITHUB_REPO="https://github.com/xanvyor/recon.git"

echo "🚀 Deploying XANVYOR RECON to VPS..."

# 1. Install Node.js 20
echo "[1/6] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>/dev/null
  apt-get install -y nodejs
fi
echo "✅ Node.js $(node -v)"

# 2. Install Bun
echo "[2/6] Installing Bun..."
if ! command -v bun &> /dev/null; then
  curl -fsSL https://bun.sh/install | bash -s -- -y
  export BUN_INSTALL="$HOME/.bun"
  export PATH="$BUN_INSTALL/bin:$PATH"
fi

# 3. Install Nginx & Certbot
echo "[3/6] Installing Nginx & Certbot..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx

# 4. Setup project
echo "[4/6] Setting up project..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone from GitHub
if [ ! -d ".git" ]; then
  git clone $GITHUB_REPO . 2>/dev/null || echo "Clone from GitHub failed, checking for local files..."
fi

# Install deps
npm install --legacy-peer-deps 2>/dev/null || bun install

# Create .env
cat > .env << 'EOF'
DATABASE_URL=file:./db/xanvyor.db
EOF

# DB setup
mkdir -p db
npx prisma generate
npx prisma db push

# Seed
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.user.upsert({ where: { id: 'admin-001' }, update: {}, create: { id: 'admin-001', name: 'Admin', phone: '6287892614294' } });
  await prisma.apiKey.upsert({ where: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' }, update: { isActive: true, plan: 'lifetime', label: 'Admin Master Key' }, create: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'Admin Master Key', isActive: true } });
  await prisma.apiKey.upsert({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' }, update: { isActive: true, plan: 'lifetime', label: 'Admin Key' }, create: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'Admin Key', isActive: true } });
  console.log('✅ Database seeded!');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect());
"

# Build
echo "Building..."
npm run build || npx next build

# 5. Configure Nginx
echo "[5/6] Configuring Nginx..."
cat > /etc/nginx/sites-available/xanvyorrecon.id << 'NGINX'
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
    client_max_body_size 50M;
}
NGINX

ln -sf /etc/nginx/sites-available/xanvyorrecon.id /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# 6. Systemd service
echo "[6/6] Setting up service..."
cat > /etc/systemd/system/xanvyor-recon.service << 'SVC'
[Unit]
Description=XANVYOR RECON OSINT Platform
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

[Install]
WantedBy=multi-user.target
SVC

systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon

# SSL
echo "Installing SSL..."
sleep 5
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id --redirect 2>/dev/null || echo "⚠️ SSL install failed - run manually: certbot --nginx -d xanvyorrecon.id"

echo ""
echo "✅ XANVYOR RECON DEPLOYED!"
echo "🌐 https://xanvyorrecon.id"
echo "🔑 Admin Key: recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo "🔑 User Key: 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo ""
echo "⚠️ DNS: Point xanvyorrecon.id A record to this VPS IP ($(curl -s ifconfig.me 2>/dev/null))"
