#!/bin/bash
# ================================================================
# XANVYOR RECON - ONE-CLICK VPS DEPLOYMENT
# ================================================================
# Just run: curl -sL https://litter.catbox.moe/DEPLOY.sh | bash
# Or: wget -qO- https://litter.catbox.moe/DEPLOY.sh | bash
# ================================================================

set -e

APP_DIR="/opt/xanvyor-recon"
REPO_URL="https://github.com/ucpaistorer/xanvyor-recon.git"
DOMAIN="xanvyorrecon.id"
VPS_IP="76.13.198.125"

echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║       XANVYOR RECON - VPS DEPLOYMENT             ║"
echo "  ║      全自动部署 - Zero Configuration Required     ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""

# ===== STEP 1: System Updates & Node.js =====
echo ">>> [1/8] Installing Node.js 20..."
if command -v node &> /dev/null && [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -ge 18 ]]; then
    echo "    Node.js $(node -v) already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "    Node.js $(node -v) installed"
fi

# ===== STEP 2: Build Tools =====
echo ">>> [2/8] Installing build dependencies..."
apt-get update -y
apt-get install -y build-essential python3 curl git nginx certbot python3-certbot-nginx
echo "    Build tools installed"

# ===== STEP 3: Nginx Setup =====
echo ">>> [3/8] Starting Nginx..."
systemctl enable nginx
systemctl start nginx || true
echo "    Nginx running"

# ===== STEP 4: Clone/Update Project =====
echo ">>> [4/8] Getting XANVYOR RECON source code..."
if [ -d "$APP_DIR/.git" ]; then
    cd $APP_DIR
    git fetch origin
    git reset --hard origin/main
    echo "    Project updated from GitHub"
else
    rm -rf $APP_DIR
    git clone $REPO_URL $APP_DIR
    cd $APP_DIR
    echo "    Project cloned from GitHub"
fi

# ===== STEP 5: Install & Build =====
echo ">>> [5/8] Installing dependencies..."
cd $APP_DIR
npm install --legacy-peer-deps 2>&1 | tail -3
npx prisma generate

# Create .env
echo "DATABASE_URL=file:$APP_DIR/db/xanvyor.db" > $APP_DIR/.env
mkdir -p $APP_DIR/db

# Push DB schema
echo ">>> [6/8] Setting up database..."
npx prisma db push

# Seed database with API keys
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
  console.log('    Database seeded with API keys');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect());
"

# Build the project
echo "    Building XANVYOR RECON..."
npm run build 2>&1 | tail -5
echo "    Build complete!"

# ===== STEP 7: Configure Nginx =====
echo ">>> [7/8] Configuring Nginx reverse proxy..."
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
    client_max_body_size 50M;
}
NGINXEOF

ln -sf /etc/nginx/sites-available/xanvyorrecon.id /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
echo "    Nginx configured"

# ===== STEP 8: Systemd Service =====
echo ">>> [8/8] Creating systemd service..."
NODE_PATH=$(which node)
cat > /etc/systemd/system/xanvyor-recon.service << SVCEOF
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
SVCEOF

systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon
echo "    Service started!"

# Wait for app to start
sleep 5

# Check service status
if systemctl is-active --quiet xanvyor-recon; then
    echo ""
    echo "  ╔═══════════════════════════════════════════════════╗"
    echo "  ║   ✅ XANVYOR RECON BERHASIL DIDEPLOY!           ║"
    echo "  ╚═══════════════════════════════════════════════════╝"
    echo ""
    echo "  🌐 Website: http://$VPS_IP:80"
    echo "  🌐 Domain:  http://$DOMAIN (setelah DNS diupdate)"
    echo ""
    echo "  🔑 Admin Key: recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
    echo "  🔑 User Key:  8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
    echo ""
else
    echo ""
    echo "  ❌ Service gagal start! Checking logs..."
    journalctl -u xanvyor-recon --no-pager -n 30
    echo ""
    echo "  Coba restart manual: systemctl restart xanvyor-recon"
fi

# SSL Certificate (will only work after DNS is pointed)
echo ""
echo "  >>> Mencoba install SSL certificate..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN \
    --non-interactive --agree-tos --email admin@$DOMAIN --redirect 2>/dev/null && \
    echo "  ✅ SSL installed! https://$DOMAIN" || \
    echo "  ⚠️  SSL belum bisa - DNS perlu diupdate dulu:"
echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║   DNS UPDATE REQUIRED (di Hostinger Panel):      ║"
echo "  ║   A Record: xanvyorrecon.id → 76.13.198.125     ║"
echo "  ║   A Record: www → 76.13.198.125                  ║"
echo "  ║                                                   ║"
echo "  ║   Setelah DNS update, jalankan:                   ║"
echo "  ║   certbot --nginx -d xanvyorrecon.id              ║"
echo "  ║        -d www.xanvyorrecon.id                     ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""
