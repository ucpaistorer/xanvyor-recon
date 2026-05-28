#!/bin/bash
# ================================================================
# XANVYOR RECON - VPS Deployment Script
# ================================================================
# Run this script on your VPS to deploy the application
# Usage: bash deploy-vps.sh
# ================================================================

set -e

APP_DIR="/opt/xanvyor-recon"
PORT=3000

echo "================================================"
echo "  XANVYOR RECON - VPS Deployment"
echo "================================================"

# 1. Update system
echo "[1/8] Updating system..."
apt-get update -y

# 2. Install Node.js 20.x
echo "[2/8] Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node version: $(node --version)"
echo "npm version: $(npm --version)"

# 3. Install Bun
echo "[3/8] Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo "Bun version: $(bun --version)"

# 4. Create app directory
echo "[4/8] Setting up application directory..."
mkdir -p $APP_DIR

# 5. Copy application files (assumes they're in the same directory as this script)
echo "[5/8] Installing application..."
cd $APP_DIR

# If this script is run from the deploy package, files should be present
# Otherwise, copy from the upload location
if [ -f "package.json" ]; then
    echo "Application files found, installing dependencies..."
    bun install --production
else
    echo "ERROR: Application files not found!"
    echo "Please upload the deployment package first."
    exit 1
fi

# 6. Create ZAI config
echo "[6/8] Configuring ZAI SDK..."
cat > /etc/.z-ai-config << 'ZAI_CONFIG'
{"baseUrl": "https://internal-api.z.ai/v1", "apiKey": "8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a", "chatId": "chat-6c4c97ee-bf32-4ba0-ae34-f327d1fde15d", "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGJhMjJiNjYtMDFjZC00ZGU3LWIzZTYtNDdlOTljYjY0YzVlIiwiY2hhdF9pZCI6ImNoYXQtNmM0Yzk3ZWUtYmYzMi00YmEwLWFlMzQtZjMyN2QxZmRlMTVkIiwicGxhdGZvcm0iOiJ6YWkifQ.meJuplvKgyh61kwGZJenZoKXnN5xbUvaA_KWgA_Ed9c", "userId": "dba22b66-01cd-4de7-b3e6-47e99cb64c5e"}
ZAI_CONFIG

# 7. Set up database
echo "[7/8] Setting up database..."
export DATABASE_URL="file:$APP_DIR/db/production.db"
cd $APP_DIR
bunx prisma db push
bunx prisma generate

# Seed admin user
bun -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function seed() {
  const existing = await db.apiKey.findFirst({ where: { key: { startsWith: 'recon-admin-' } } });
  if (existing) {
    console.log('Admin key already exists:', existing.key);
    await db.\$disconnect();
    return;
  }
  const admin = await db.user.create({ data: { name: 'Admin XANVYOR', phone: '6287892614294' } });
  const adminKey = await db.apiKey.create({
    data: {
      key: 'recon-admin-xanvyor-' + Date.now().toString(36) + '-master-access-key-2024',
      userId: admin.id,
      plan: 'lifetime',
      label: 'Admin Master Key',
      isActive: true,
    }
  });
  console.log('ADMIN KEY CREATED:', adminKey.key);
  console.log('SAVE THIS KEY - you need it to login!');
  await db.\$disconnect();
}
seed().catch(e => { console.error(e); process.exit(1); });
"

# 8. Set up systemd service
echo "[8/8] Setting up systemd service..."
cat > /etc/systemd/system/xanvyor-recon.service << SERVICE
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
ExecStart=$APP_DIR/node_modules/.bin/next start -p $PORT
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

# Also set up with Caddy/Nginx reverse proxy
echo ""
echo "================================================"
echo "  Setting up Nginx reverse proxy..."
echo "================================================"
if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
fi

cat > /etc/nginx/sites-available/xanvyor-recon << NGINX
server {
    listen 80;
    server_name xanvyorrecon.id www.xanvyorrecon.id;
    
    client_max_body_size 50M;
    
    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/xanvyor-recon /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl enable nginx && systemctl restart nginx

# Enable and start the app
systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl start xanvyor-recon

# Install Certbot for SSL
echo ""
echo "================================================"
echo "  Setting up SSL with Let's Encrypt..."
echo "================================================"
if ! command -v certbot &> /dev/null; then
    apt-get install -y certbot python3-certbot-nginx
fi
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id

# Open firewall
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw --force enable

echo ""
echo "================================================"
echo "  DEPLOYMENT COMPLETE!"
echo "================================================"
echo ""
echo "  Your XANVYOR RECON platform is now running at:"
echo "  https://xanvyorrecon.id"
echo ""
echo "  Admin API Key has been created above."
echo "  Use it to login to the admin panel."
echo ""
echo "  Useful commands:"
echo "  - systemctl status xanvyor-recon"
echo "  - systemctl restart xanvyor-recon"
echo "  - journalctl -u xanvyor-recon -f"
echo "================================================"
