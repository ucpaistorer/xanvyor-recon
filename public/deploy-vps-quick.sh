#!/bin/bash
# ================================================================
# XANVYOR RECON - Quick VPS Deploy
# ================================================================
# Paste in your Hostinger VPS Browser Terminal:
# bash <(curl -sL https://xanvyorrecon.id/deploy-vps-quick.sh)
# ================================================================
set -e

APP="/opt/xanvyor-recon"
PORT=3000

echo "🚀 XANVYOR RECON - Quick Deploy"
echo "================================"

# 1. System setup
echo "[1/6] System setup..."
apt-get update -yqq
if ! command -v node; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null 2>&1
  apt-get install -y nodejs >/dev/null 2>&1
fi
if ! command -v bun; then
  curl -fsSL https://bun.sh/install | bash >/dev/null 2>&1
  source ~/.bashrc
fi

# 2. Create app
echo "[2/6] Creating application..."
mkdir -p $APP && cd $APP

# Create next.js project from scratch on the VPS
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*" --yes >/dev/null 2>&1 || true

# Install all dependencies
echo "[3/6] Installing dependencies..."
bun add @prisma/client prisma z-ai-web-dev-sdk framer-motion lucide-react react-markdown sharp class-variance-authority clsx tailwind-merge @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-progress @radix-ui/react-scroll-area @radix-ui/react-separator @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toast @radix-ui/react-tooltip @radix-ui/react-label @radix-ui/react-popover sonner next-themes uuid zustand 2>&1 | tail -3

# Configure ZAI SDK
echo "[4/6] Configuring AI..."
cat > /etc/.z-ai-config << 'ZAI'
{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a","chatId":"chat-6c4c97ee-bf32-4ba0-ae34-f327d1fde15d","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGJhMjJiNjYtMDFjZC00ZGU3LWIzZTYtNDdlOTljYjY0YzVlIiwiY2hhdF9pZCI6ImNoYXQtNmM0Yzk3ZWUtYmYzMi00YmEwLWFlMzQtZjMyN2QxZmRlMTVkIiwicGxhdGZvcm0iOiJ6YWkifQ.meJuplvKgyh61kwGZJenZoKXnN5xbUvaA_KWgA_Ed9c","userId":"dba22b66-01cd-4de7-b3e6-47e99cb64c5e"}
ZAI

# 5. Set up database
echo "[5/6] Database setup..."
cat > .env << EOF
DATABASE_URL=file:$APP/db/production.db
EOF
mkdir -p db

# 6. Nginx + Service
echo "[6/6] Final setup..."
apt-get install -y nginx certbot python3-certbot-nginx >/dev/null 2>&1

cat > /etc/nginx/sites-available/xanvyor << 'NGX'
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
        proxy_read_timeout 120s;
    }
}
NGX

ln -sf /etc/nginx/sites-available/xanvyor /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t 2>/dev/null && systemctl restart nginx

cat > /etc/systemd/system/xanvyor.service << SYS
[Unit]
Description=XANVYOR RECON
After=network.target
[Service]
Type=simple
User=root
WorkingDirectory=$APP
Environment=NODE_ENV=production
ExecStart=$(which bun) run start
Restart=on-failure
[Install]
WantedBy=multi-user.target
SYS

systemctl daemon-reload
systemctl enable xanvyor

echo ""
echo "✅ VPS SETUP COMPLETE!"
echo ""
echo "⚠️  NEXT STEPS:"
echo "1. Upload source code to $APP"
echo "2. Run: cd $APP && bun run db:push && bun run build"
echo "3. Run: systemctl start xanvyor"
echo "4. SSL: certbot --nginx -d xanvyorrecon.id"
echo ""
echo "🌐 https://xanvyorrecon.id"
