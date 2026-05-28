#!/bin/bash
set -e

# ================================================
# XANVYOR RECON - VPS Deployment Script
# Domain: xanvyorrecon.id
# ================================================

APP_DIR="/root/xanvyorrecon"
APP_PORT=3000
DOMAIN="xanvyorrecon.id"

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
node -e '
const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");
const prisma = new PrismaClient();
async function main() {
  const keys = await prisma.apiKey.findMany({ include: { user: true } });
  console.log("Existing keys:", keys.length);
  let adminKey = await prisma.apiKey.findFirst({ where: { key: { startsWith: "recon-admin-" } } });
  if (!adminKey) {
    const admin = await prisma.user.create({ data: { name: "Admin Owner" } });
    const key = "recon-admin-" + Date.now().toString(36) + "-" + crypto.randomBytes(32).toString("hex");
    await prisma.apiKey.create({ data: { key, userId: admin.id, plan: "lifetime", isActive: true, label: "Admin Key" } });
    console.log("Created admin key:", key.substring(0, 30) + "...");
  }
  let userKey = await prisma.apiKey.findUnique({ where: { key: "QCg6KXpYqKomtQXKGa0pngYzM9u5QpZvwqZjMupP3d3a869e" } });
  if (!userKey) {
    const user = await prisma.user.create({ data: { name: "XANVYOR Admin", phone: "6287892614294" } });
    await prisma.apiKey.create({ data: { key: "QCg6KXpYqKomtQXKGa0pngYzM9u5QpZvwqZjMupP3d3a869e", userId: user.id, plan: "lifetime", isActive: true, label: "Admin Owner Key" } });
    console.log("Created user API key");
  } else { console.log("User key already exists"); }
  await prisma.$disconnect();
}
main().catch(console.error);
'

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
echo "API Key: QCg6KXpYqKomtQXKGa0pngYzM9u5QpZvwqZjMupP3d3a869e"
echo "Admin access: Login with API key above"
echo "WhatsApp: wa.me/6287892614294"
echo ""
echo "PM2 Status:"
pm2 status
