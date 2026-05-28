#!/bin/bash
# ================================================================
# XANVYOR RECON - One-Click VPS Installer
# ================================================================
# Paste this into your VPS terminal:
# bash <(curl -s https://xanvyorrecon.id/install.sh)
# ================================================================

set -e

APP_DIR="/opt/xanvyor-recon"
PORT=3000
ZAI_API_KEY="8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"

echo "╔══════════════════════════════════════════════╗"
echo "║     XANVYOR RECON - VPS Installer           ║"
echo "║     AI-Powered OSINT Intelligence Platform   ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Update system
echo "[1/9] Updating system packages..."
apt-get update -yqq

# Install Node.js 20
echo "[2/9] Installing Node.js 20..."
if ! command -v node &> /dev/null || [[ "$(node -v | cut -d. -f1)" != "v20" && "$(node -v | cut -d. -f1)" != "v22" ]]; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
    apt-get install -y nodejs >/dev/null 2>&1
fi
echo "  Node: $(node -v)"

# Install Bun
echo "[3/9] Installing Bun..."
if ! command -v bun &> /dev/null; then
    curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
fi
echo "  Bun: $(bun --version)"

# Create app directory
echo "[4/9] Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Create package.json
echo "[5/9] Creating application files..."
cat > package.json << 'PKGJSON'
{
  "name": "xanvyor-recon",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "NODE_ENV=production node server.js",
    "db:push": "prisma db push",
    "db:generate": "prisma generate"
  },
  "dependencies": {
    "next": "^16.1.1",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@prisma/client": "^6.11.1",
    "prisma": "^6.11.1",
    "z-ai-web-dev-sdk": "^0.0.18",
    "framer-motion": "^12.23.2",
    "lucide-react": "^0.525.0",
    "react-markdown": "^10.1.0",
    "sharp": "^0.34.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.1",
    "@radix-ui/react-accordion": "^1.2.11",
    "@radix-ui/react-alert-dialog": "^1.1.14",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-badge": "latest",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-progress": "^1.1.7",
    "@radix-ui/react-scroll-area": "^1.2.9",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-switch": "^1.2.5",
    "@radix-ui/react-tabs": "^1.1.12",
    "@radix-ui/react-toast": "^1.2.14",
    "@radix-ui/react-tooltip": "^1.2.7",
    "sonner": "^2.0.6",
    "tailwindcss": "^4",
    "next-themes": "^0.4.6",
    "uuid": "^11.1.0",
    "zustand": "^5.0.6"
  }
}
PKGJSON

# Install dependencies
echo "[6/9] Installing dependencies (this may take a few minutes)..."
bun install --production 2>&1 | tail -3

# Create ZAI config
echo "[7/9] Configuring AI SDK..."
mkdir -p /etc
cat > /etc/.z-ai-config << ZAICONF
{"baseUrl": "https://internal-api.z.ai/v1", "apiKey": "$ZAI_API_KEY", "chatId": "chat-6c4c97ee-bf32-4ba0-ae34-f327d1fde15d", "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGJhMjJiNjYtMDFjZC00ZGU3LWIzZTYtNDdlOTljYjY0YzVlIiwiY2hhdF9pZCI6ImNoYXQtNmM0Yzk3ZWUtYmYzMi00YmEwLWFlMzQtZjMyN2QxZmRlMTVkIiwicGxhdGZvcm0iOiJ6YWkifQ.meJuplvKgyh61kwGZJenZoKXnN5xbUvaA_KWgA_Ed9c", "userId": "dba22b66-01cd-4de7-b3e6-47e99cb64c5e"}
ZAICONF

# Create environment file
cat > .env << ENVFILE
DATABASE_URL=file:$APP_DIR/db/production.db
ENVFILE

# Set up Prisma
echo "[8/9] Setting up database..."
mkdir -p db
bunx prisma db push 2>&1 | tail -3
bunx prisma generate 2>&1 | tail -3

# Create systemd service
echo "[9/9] Creating systemd service..."
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
ExecStart=$(which node) server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SYSD

systemctl daemon-reload
systemctl enable xanvyor-recon

# Set up Nginx
echo "Setting up Nginx reverse proxy..."
apt-get install -y nginx >/dev/null 2>&1

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

# Open firewall
ufw allow 22/tcp >/dev/null 2>&1
ufw allow 80/tcp >/dev/null 2>&1
ufw allow 443/tcp >/dev/null 2>&1
ufw --force enable >/dev/null 2>&1

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  XANVYOR RECON DEPLOYED SUCCESSFULLY!        ║"
echo "║                                              ║"
echo "║  IMPORTANT: Upload the application build     ║"
echo "║  files to /opt/xanvyor-recon/ before         ║"
echo "║  starting the service.                       ║"
echo "║                                              ║"
echo "║  Then run:                                   ║"
echo "║  systemctl start xanvyor-recon               ║"
echo "╚══════════════════════════════════════════════╝"
