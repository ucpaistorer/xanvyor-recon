#!/bin/bash
# =============================================================
# XANVYOR RECON - VPS One-Click Deployment Script
# =============================================================
# Run this on your VPS:
#   ssh root@76.13.198.125
#   bash <(curl -sL https://litter.catbox.moe/2o10ba.gz) 
# 
# OR copy this entire script and paste it into your VPS terminal
# =============================================================

set -e

# Project download URL
PROJECT_URL="https://litter.catbox.moe/2o10ba.gz"
APP_DIR="/opt/xanvyor-recon"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     XANVYOR RECON - VPS Deployment Script       ║"
echo "║     Domain: xanvyorrecon.id                      ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# 1. Install Node.js 20
echo "[1/7] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "✅ Node.js $(node -v)"

# 2. Install Nginx
echo "[2/7] Installing Nginx..."
apt-get update -y
apt-get install -y nginx certbot python3-certbot-nginx
systemctl enable nginx
systemctl start nginx
echo "✅ Nginx installed"

# 3. Download project
echo "[3/7] Downloading XANVYOR RECON..."
mkdir -p $APP_DIR
cd $APP_DIR
curl -sL "$PROJECT_URL" -o /tmp/xanvyor-recon.tar.gz
tar xzf /tmp/xanvyor-recon.tar.gz -C $APP_DIR
rm -f /tmp/xanvyor-recon.tar.gz
echo "✅ Project downloaded to $APP_DIR"

# 4. Install dependencies and build
echo "[4/7] Installing dependencies..."
npm install --legacy-peer-deps
echo "✅ Dependencies installed"

# Generate Prisma client
echo "Generating Prisma client..."
npx prisma generate

# Create .env if needed
if [ ! -f "$APP_DIR/.env" ]; then
  echo "DATABASE_URL=file:$APP_DIR/db/xanvyor.db" > $APP_DIR/.env
fi
mkdir -p $APP_DIR/db

# Push database schema
echo "Pushing database schema..."
npx prisma db push

# Seed admin user and API keys
echo "Seeding database..."
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
    create: {
      key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
      userId: admin.id, plan: 'lifetime', label: 'Admin Master Key', isActive: true
    }
  });
  await prisma.apiKey.upsert({
    where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' },
    update: { isActive: true, plan: 'lifetime', label: 'Admin Key' },
    create: {
      key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',
      userId: admin.id, plan: 'lifetime', label: 'Admin Key', isActive: true
    }
  });
  console.log('✅ Database seeded!');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect());
"

# Build the project
echo "Building Next.js project (this takes 1-2 minutes)..."
npm run build
echo "✅ Build complete"

# 5. Configure Nginx
echo "[5/7] Configuring Nginx..."
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
echo "✅ Nginx configured"

# 6. Create systemd service
echo "[6/7] Creating systemd service..."
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
ExecStart=$(which node) $APP_DIR/.next/standalone/server.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon
echo "✅ Service created and started"

# 7. Install SSL certificate
echo "[7/7] Installing SSL certificate..."
sleep 5
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id \
  --non-interactive --agree-tos --email admin@xanvyorrecon.id --redirect 2>/dev/null || {
  echo "⚠️ SSL failed. Run manually: certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id"
}

# Done!
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║   ✅ XANVYOR RECON DEPLOYED SUCCESSFULLY!       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
echo "🌐 Website:     https://xanvyorrecon.id"
echo "🔑 Admin Key:   recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo "🔑 User Key:    8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"
echo ""
echo "📋 DNS Setup Required:"
echo "   Point these A records in Hostinger to this VPS IP (76.13.198.125):"
echo "   - xanvyorrecon.id     →  A  →  76.13.198.125"
echo "   - www.xanvyorrecon.id →  A  →  76.13.198.125"
echo ""
echo "📋 Useful Commands:"
echo "   systemctl status xanvyor-recon    # Check status"
echo "   systemctl restart xanvyor-recon   # Restart app"
echo "   journalctl -u xanvyor-recon -f    # View logs"
echo ""
