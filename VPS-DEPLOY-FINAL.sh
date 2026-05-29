#!/bin/bash
# =============================================================
# XANVYOR RECON - VPS Deployment (Copy & Paste to VPS)
# =============================================================
# 
# STEP 1: SSH into your VPS
#   ssh root@76.13.198.125
#
# STEP 2: Paste this entire script and press Enter
#
# STEP 3: Update DNS in Hostinger panel
#   A Record: xanvyorrecon.id → 76.13.198.125
#   A Record: www.xanvyorrecon.id → 76.13.198.125
#
# =============================================================

set -e

APP_DIR="/opt/xanvyor-recon"
PROJECT_URL="https://litter.catbox.moe/2o10ba.gz"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     XANVYOR RECON - VPS Deployment              ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Install Node.js 20
echo "[1/7] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
echo "✅ Node.js installed"

# 2. Install Nginx & Certbot
echo "[2/7] Installing Nginx & Certbot..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx
echo "✅ Nginx installed"

# 3. Download & extract project
echo "[3/7] Downloading XANVYOR RECON..."
mkdir -p $APP_DIR
cd $APP_DIR
curl -sL "$PROJECT_URL" -o /tmp/xanvyor.tar.gz
tar xzf /tmp/xanvyor.tar.gz -C $APP_DIR
rm -f /tmp/xanvyor.tar.gz
echo "✅ Project downloaded"

# 4. Install deps & build
echo "[4/7] Installing dependencies & building..."
cd $APP_DIR
npm install --legacy-peer-deps
npx prisma generate

# Create .env
echo "DATABASE_URL=file:$APP_DIR/db/xanvyor.db" > $APP_DIR/.env
mkdir -p $APP_DIR/db

# Push DB schema
npx prisma db push

# Seed database with admin keys
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
  console.log('✅ Database seeded');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect());
"

# Build
npm run build
echo "✅ Build complete"

# 5. Configure Nginx
echo "[5/7] Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/xanvyorrecon.id << 'EOF'
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
EOF

ln -sf /etc/nginx/sites-available/xanvyorrecon.id /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "✅ Nginx configured"

# 6. Systemd service
echo "[6/7] Creating systemd service..."
NODE_PATH=$(which node)
cat > /etc/systemd/system/xanvyor-recon.service << EOF
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$APP_DIR
Environment=NODE_ENV=production
Environment=DATABASE_URL=file:$APP_DIR/db/xanvyor.db
ExecStart=$NODE_PATH $APP_DIR/.next/standalone/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon
echo "✅ Service started"

# 7. SSL
echo "[7/7] Installing SSL certificate..."
sleep 5
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id \
  --non-interactive --agree-tos --email admin@xanvyorrecon.id --redirect 2>/dev/null || \
  echo "⚠️ SSL failed - run: certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ XANVYOR RECON DEPLOYED!                    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "🌐 https://xanvyorrecon.id"
echo ""
echo "🔑 Admin Key: recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo "🔑 User Key:  8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo ""
echo "⚠️ DNS: Update Hostinger DNS to point to 76.13.198.125"
echo "   A Record: xanvyorrecon.id → 76.13.198.125"
echo "   A Record: www → 76.13.198.125"
