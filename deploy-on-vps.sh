#!/bin/bash
set -e

# ================================================
# XANVYOR RECON - VPS Deployment Script
# Domain: xanvyorrecon.id
# API Key: 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a
# ================================================

APP_DIR="/root/xanvyorrecon"
APP_PORT=3000
DOMAIN="xanvyorrecon.id"
API_KEY="8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"

echo "================================================"
echo "  XANVYOR RECON - VPS Deployment"
echo "  Domain: $DOMAIN"
echo "================================================"

# 1. Update system
echo "[1/10] Updating system..."
apt-get update -qq

# 2. Install Node.js
echo "[2/10] Installing Node.js..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
echo "Node.js: $(node --version)"
echo "npm: $(npm --version)"

# 3. Install Bun
echo "[3/10] Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash
    export PATH="$HOME/.bun/bin:$PATH"
    echo 'export PATH="$HOME/.bun/bin:$PATH"' >> ~/.bashrc
fi
echo "Bun: $(bun --version)"

# 4. Install PM2
echo "[4/10] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# 5. Extract project (if archive exists)
echo "[5/10] Setting up project..."
mkdir -p $APP_DIR
cd $APP_DIR

if [ -f "project.tar.gz" ]; then
    echo "Extracting project archive..."
    tar xzf project.tar.gz
    rm project.tar.gz
fi

# 6. Install dependencies
echo "[6/10] Installing dependencies..."
bun install

# 7. Database setup
echo "[7/10] Setting up database..."
bun run db:push

# 8. Seed admin keys
echo "[8/10] Seeding database..."
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  // Create admin user
  let admin = await prisma.user.findFirst({ where: { name: { contains: 'admin' } } });
  if (!admin) {
    admin = await prisma.user.create({ data: { name: 'Admin Owner', phone: '6287892614294' } });
    console.log('Created admin user');
  }

  // Create user API key
  const apiKey = '${API_KEY}';
  let existingKey = await prisma.apiKey.findUnique({ where: { key: apiKey } });
  if (!existingKey) {
    await prisma.apiKey.create({ data: { key: apiKey, userId: admin.id, plan: 'lifetime', isActive: true, label: 'admin-primary', expiresAt: null } });
    console.log('Created user API key');
  } else {
    console.log('User API key already exists');
  }

  // Create recon-admin prefixed key
  const adminApiKey = 'recon-admin-${API_KEY}';
  let existingAdminKey = await prisma.apiKey.findUnique({ where: { key: adminApiKey } });
  if (!existingAdminKey) {
    await prisma.apiKey.create({ data: { key: adminApiKey, userId: admin.id, plan: 'lifetime', isActive: true, label: 'admin-super', expiresAt: null } });
    console.log('Created admin API key');
  } else {
    console.log('Admin API key already exists');
  }

  await prisma.\$disconnect();
}
main().catch(console.error);
"

# 9. Build
echo "[9/10] Building project..."
bun run build

# 10. Configure and start
echo "[10/10] Starting application..."

# Stop existing process
pm2 delete xanvyorrecon 2>/dev/null || true
fuser -k $APP_PORT/tcp 2>/dev/null || true
sleep 2

# Start with PM2
export PORT=$APP_PORT
pm2 start ".next/standalone/server.js" --name xanvyorrecon
pm2 save
pm2 startup 2>/dev/null || true

# Configure reverse proxy
echo ""
echo "Configuring reverse proxy..."

if command -v caddy &> /dev/null; then
    echo "Using Caddy..."
    if ! grep -q "xanvyorrecon" /etc/caddy/Caddyfile 2>/dev/null; then
        cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak.$(date +%s) 2>/dev/null
        cat >> /etc/caddy/Caddyfile << 'CADDYBLOCK'

# XANVYOR RECON - xanvyorrecon.id
xanvyorrecon.id {
    reverse_proxy localhost:3000
    encode gzip
}
www.xanvyorrecon.id {
    redir https://xanvyorrecon.id{uri} permanent
}
CADDYBLOCK
        systemctl reload caddy 2>/dev/null || caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
    else
        systemctl reload caddy 2>/dev/null || caddy reload --config /etc/caddy/Caddyfile 2>/dev/null || true
    fi
else
    echo "Using Nginx..."
    if ! command -v nginx &> /dev/null; then
        apt-get install -y nginx
    fi

    cat > /etc/nginx/sites-available/xanvyorrecon << 'NGINXBLOCK'
server {
    listen 80;
    listen [::]:80;
    server_name xanvyorrecon.id www.xanvyorrecon.id;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }
}
NGINXBLOCK

    ln -sf /etc/nginx/sites-available/xanvyorrecon /etc/nginx/sites-enabled/
    nginx -t && (systemctl reload nginx 2>/dev/null || systemctl restart nginx)

    # SSL
    if ! command -v certbot &> /dev/null; then
        apt-get install -y certbot python3-certbot-nginx 2>/dev/null
    fi
    certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id 2>/dev/null || echo "SSL setup done or already exists"
fi

echo ""
echo "================================================"
echo "  XANVYOR RECON Deployed Successfully!"
echo "================================================"
echo ""
echo "Website: https://$DOMAIN"
echo "API Key: $API_KEY"
echo "Admin key: recon-admin-$API_KEY"
echo "Admin access: Login with either API key above"
echo "WhatsApp: wa.me/6287892614294"
echo ""
echo "PM2 Status:"
pm2 status
