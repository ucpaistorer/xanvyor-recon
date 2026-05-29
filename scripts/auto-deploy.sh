#!/bin/bash
set -e
APP_DIR="/opt/xanvyor-recon"
REPO_URL="https://github.com/ucpaistorer/xanvyor-recon.git"
echo "=== XANVYOR RECON - Auto Deploy ==="
if ! command -v node &> /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
node -v
apt-get update -y
apt-get install -y build-essential python3 curl git nginx certbot python3-certbot-nginx
systemctl enable nginx && systemctl start nginx || true
if [ -d "$APP_DIR/.git" ]; then
  cd $APP_DIR && git pull origin main || true
else
  rm -rf $APP_DIR
  git clone $REPO_URL $APP_DIR
  cd $APP_DIR
fi
cd $APP_DIR
npm install --legacy-peer-deps
npx prisma generate
echo "DATABASE_URL=file:$APP_DIR/db/xanvyor.db" > $APP_DIR/.env
mkdir -p $APP_DIR/db
npx prisma db push
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const admin = await prisma.user.upsert({ where: { id: 'admin-001' }, update: {}, create: { id: 'admin-001', name: 'Admin', phone: '6287892614294' } });
  await prisma.apiKey.upsert({ where: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' }, update: { isActive: true, plan: 'lifetime', label: 'Admin Master Key' }, create: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'Admin Master Key', isActive: true } });
  await prisma.apiKey.upsert({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' }, update: { isActive: true, plan: 'lifetime', label: 'Admin Key' }, create: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: admin.id, plan: 'lifetime', label: 'Admin Key', isActive: true } });
  console.log('DB seeded');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.\$disconnect());
"
npm run build
cat > /etc/nginx/sites-available/xanvyorrecon.id << 'NGINX'
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
NGINX
ln -sf /etc/nginx/sites-available/xanvyorrecon.id /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
NODE_PATH=$(which node)
cat > /etc/systemd/system/xanvyor-recon.service << SVC
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
SVC
systemctl daemon-reload
systemctl enable xanvyor-recon
systemctl restart xanvyor-recon
sleep 5
certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id --redirect 2>/dev/null || echo "SSL deferred - DNS not ready yet"
echo "=== XANVYOR RECON DEPLOYED! ==="
echo "Visit: http://76.13.198.125"
echo "Domain: http://xanvyorrecon.id (after DNS update)"
