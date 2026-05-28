#!/bin/bash
set -e

DEPLOY_DIR="/tmp/xanvyor-recon-deploy"
echo "📦 Creating deployment package..."

rm -rf $DEPLOY_DIR
mkdir -p $DEPLOY_DIR

# Copy essential files
cp -r .next $DEPLOY_DIR/
cp -r public $DEPLOY_DIR/
cp -r prisma $DEPLOY_DIR/
cp -r db $DEPLOY_DIR/
cp package.json $DEPLOY_DIR/
cp bun.lock $DEPLOY_DIR/
cp next.config.ts $DEPLOY_DIR/
cp .env $DEPLOY_DIR/ 2>/dev/null || true
cp Caddyfile $DEPLOY_DIR/

# Create start script
cat > $DEPLOY_DIR/start.sh << 'START'
#!/bin/bash
set -e

# Install dependencies
bun install --production

# Generate Prisma client
bun run db:generate 2>/dev/null || npx prisma generate

# Push database schema
bun run db:push 2>/dev/null || npx prisma db push

# Seed admin key
bun run scripts/seed-admin-key.ts 2>/dev/null || echo "Admin key may already exist"

# Start the server
NODE_ENV=production PORT=3000 bun .next/standalone/server.js
START
chmod +x $DEPLOY_DIR/start.sh

# Create Caddy config for domain
cat > $DEPLOY_DIR/Caddyfile.production << 'CADDY'
xanvyorrecon.id {
    reverse_proxy localhost:3000 {
        header_up Host {host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        header_up X-Real-IP {remote_host}
        transport http {
            read_timeout 120s
            write_timeout 120s
            dial_timeout 30s
        }
    }
}

www.xanvyorrecon.id {
    redir https://xanvyorrecon.id{uri}
}
CADDY

# Create systemd service
cat > $DEPLOY_DIR/xanvyor-recon.service << 'SERVICE'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/xanvyor-recon
ExecStart=/usr/bin/bash /opt/xanvyor-recon/start.sh
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
SERVICE

echo "✅ Deployment package created at $DEPLOY_DIR"
echo ""
echo "To deploy, upload to your VPS and run:"
echo "  scp -r $DEPLOY_DIR/* root@xanvyorrecon.id:/opt/xanvyor-recon/"
echo "  ssh root@xanvyorrecon.id 'cd /opt/xanvyor-recon && bash start.sh'"
