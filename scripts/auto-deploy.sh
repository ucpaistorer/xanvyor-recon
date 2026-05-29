#!/bin/bash
set -e
APP_DIR="/opt/xanvyor-recon"
REPO_URL="https://github.com/ucpaistorer/xanvyor-recon.git"
DOMAIN="xanvyorrecon.id"
VPS_IP="76.13.198.125"

echo ""
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║       XANVYOR RECON - VPS DEPLOYMENT             ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo ""

# 1. Install Node.js 20
echo ">>> [1/8] Installing Node.js 20..."
if command -v node &> /dev/null && [[ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -ge 18 ]]; then
    echo "    Node.js $(node -v) already installed"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
    echo "    Node.js $(node -v) installed"
fi

# 2. Build tools
echo ">>> [2/8] Installing build dependencies..."
apt-get update -y
apt-get install -y build-essential python3 curl git nginx certbot python3-certbot-nginx

# 3. Nginx
echo ">>> [3/8] Starting Nginx..."
systemctl enable nginx
systemctl start nginx || true

# 4. Clone/update project
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

# 5. Install & configure
echo ">>> [5/8] Installing dependencies..."
cd $APP_DIR
npm install --legacy-peer-deps 2>&1 | tail -3
npx prisma generate

echo "DATABASE_URL=file:$APP_DIR/db/xanvyor.db" > $APP_DIR/.env
mkdir -p $APP_DIR/db

# 6. Database
echo ">>> [6/8] Setting up database..."
npx prisma db push

# Seed with ALL API keys including the new one
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
    where: { key: '5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e' },
    update: { isActive: true, plan: 'lifetime', label: 'New Admin Key' },
    create: { key: '5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e', userId: admin.id, plan: 'lifetime', label: 'New Admin Key', isActive: true }
  });
  await prisma.apiKey.upsert({
    where: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' },
    update: { isActive: true, plan: 'lifetime', label: 'Admin Master Key' },
    create: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'Admin Master Key', isActive: true }
  });
  await prisma.apiKey.upsert({
    where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' },
    update: { isActive: true, plan: 'lifetime', label: 'User Key' },
    create: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'User Key', isActive: true }
  });
  console.log('    Database seeded with all API keys');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect());
"

# Build
echo "    Building project..."
npm run build 2>&1 | tail -5
echo "    Build complete!"

# 7. Nginx config
echo ">>> [7/8] Configuring Nginx..."
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

# 8. Systemd service
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
sleep 5

if systemctl is-active --quiet xanvyor-recon; then
    echo ""
    echo "  ╔═══════════════════════════════════════════════════╗"
    echo "  ║   ✅ XANVYOR RECON BERHASIL DIDEPLOY!           ║"
    echo "  ╚═══════════════════════════════════════════════════╝"
    echo ""
    echo "  🌐 Website: http://$VPS_IP"
    echo "  🌐 Domain:  http://$DOMAIN (setelah DNS update)"
    echo ""
    echo "  🔑 New Admin Key: 5CwJXmXOXUMMc6YdFwJxmM9Gev7zrgrJPlX5kWcq1ed6480e"
    echo "  🔑 Master Key:    recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
    echo "  🔑 User Key:      8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
else
    echo "  ❌ Service gagal start! Checking logs..."
    journalctl -u xanvyor-recon --no-pager -n 30
fi

# SSL
echo ""
echo "  >>> Mencoba install SSL..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect 2>/dev/null && echo "  ✅ SSL installed!" || echo "  ⚠️  SSL deferred - DNS perlu diupdate dulu"

echo ""
echo "  DNS: A Record xanvyorrecon.id → 76.13.198.125"
echo "  Setelah DNS: certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id"
echo ""
