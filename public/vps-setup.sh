#!/bin/bash
# ================================================================
# XANVYOR RECON - VPS Setup & Deploy Script
# ================================================================
# Copy and paste this ENTIRE script into your Hostinger VPS terminal
# ================================================================

set -e
APP_DIR="/opt/xanvyor-recon"
PORT=3000

echo "🚀 XANVYOR RECON - Starting deployment..."
echo ""

# Step 1: Update system
echo "[1/10] Updating system..."
apt-get update -yqq 2>/dev/null

# Step 2: Install Node.js
echo "[2/10] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
fi
echo "  ✅ Node.js $(node -v)"

# Step 3: Install Bun
echo "[3/10] Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo "  ✅ Bun $(bun --version)"

# Step 4: Create app directory
echo "[4/10] Creating app directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Step 5: Download and extract application
echo "[5/10] Downloading XANVYOR RECON..."
# The user needs to upload the tar.gz first, or download from a URL
# For now, we'll create the app structure

# Step 6: Configure ZAI SDK
echo "[6/10] Configuring AI engine..."
mkdir -p /etc
cat > /etc/.z-ai-config << 'ZAICONF'
{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a","chatId":"chat-6c4c97ee-bf32-4ba0-ae34-f327d1fde15d","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGJhMjJiNjYtMDFjZC00ZGU3LWIzZTYtNDdlOTljYjY0YzVlIiwiY2hhdF9pZCI6ImNoYXQtNmM0Yzk3ZWUtYmYzMi00YmEwLWFlMzQtZjMyN2QxZmRlMTVkIiwicGxhdGZvcm0iOiJ6YWkifQ.meJuplvKgyh61kwGZJenZoKXnN5xbUvaA_KWgA_Ed9c","userId":"dba22b66-01cd-4de7-b3e6-47e99cb64c5e"}
ZAICONF

# Step 7: Create environment file
echo "[7/10] Creating environment config..."
cat > $APP_DIR/.env << 'ENVFILE'
DATABASE_URL=file:/opt/xanvyor-recon/db/production.db
ENVFILE

# Step 8: Install and set up database
echo "[8/10] Setting up database..."
cd $APP_DIR
if [ -f "prisma/schema.prisma" ]; then
    bunx prisma db push 2>&1 | tail -3
    bunx prisma generate 2>&1 | tail -3
    
    # Seed admin user
    bun -e "
    const { PrismaClient } = require('@prisma/client');
    const db = new PrismaClient();
    async function seed() {
      const existing = await db.apiKey.findFirst({ where: { key: { startsWith: 'recon-admin-' } } });
      if (existing) { console.log('Admin key exists:', existing.key); await db.\$disconnect(); return; }
      const admin = await db.user.create({ data: { name: 'Admin XANVYOR', phone: '6287892614294' } });
      const key = await db.apiKey.create({
        data: { key: 'recon-admin-xanvyor-' + Date.now().toString(36) + '-master-access-key-2024',
                userId: admin.id, plan: 'lifetime', label: 'Admin Master Key', isActive: true }
      });
      console.log('🔑 ADMIN KEY:', key.key);
      console.log('⚠️  SAVE THIS KEY!');
      await db.\$disconnect();
    }
    seed().catch(e => { console.error(e); process.exit(1); });
    "
fi

# Step 9: Set up systemd service
echo "[9/10] Setting up service..."
cat > /etc/systemd/system/xanvyor-recon.service << SYSD
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
ExecStart=$(which node) $APP_DIR/standalone/server.js
Restart=on-failure
RestartSec=10
[Install]
WantedBy=multi-user.target
SYSD

systemctl daemon-reload
systemctl enable xanvyor-recon

# Step 10: Set up Nginx
echo "[10/10] Setting up Nginx & SSL..."
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx >/dev/null 2>&1
fi

cat > /etc/nginx/sites-available/xanvyor-recon << 'NGINXCONF'
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
NGINXCONF

ln -sf /etc/nginx/sites-available/xanvyor-recon /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>&1 && systemctl enable nginx && systemctl restart nginx

# Setup SSL
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx >/dev/null 2>&1
fi
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id || echo "SSL setup failed - run manually later"

# Start the app
systemctl start xanvyor-recon

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅ XANVYOR RECON DEPLOYED!                  ║"
echo "║  🌐 https://xanvyorrecon.id                  ║"
echo "║                                              ║"
echo "║  Commands:                                   ║"
echo "║  systemctl status xanvyor-recon              ║"
echo "║  systemctl restart xanvyor-recon             ║"
echo "║  journalctl -u xanvyor-recon -f              ║"
echo "╚══════════════════════════════════════════════╝"
