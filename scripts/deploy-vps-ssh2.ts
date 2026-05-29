import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';
import { join } from 'path';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const REMOTE_DIR = '/var/www/xanvyor-recon';
const TARBALL_LOCAL = '/tmp/xanvyor-deploy.tar.gz';
const TARBALL_REMOTE = '/tmp/xanvyor-deploy.tar.gz';

function execCommand(conn: Client, cmd: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Command timed out: ${cmd.substring(0, 100)}`)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); reject(err); return; }
      let stdout = '';
      let stderr = '';
      stream.on('data', (data: Buffer) => { stdout += data.toString(); process.stdout.write(data.toString()); });
      stream.on('close', () => { clearTimeout(timer); resolve(stdout + stderr); });
      stream.stderr?.on('data', (data: Buffer) => { stderr += data.toString(); process.stdout.write(data.toString()); });
    });
  });
}

async function deploy() {
  console.log('🚀 XANVYOR RECON - VPS Deployment');
  console.log('====================================');
  console.log(`📡 Connecting to ${VPS_HOST}...`);

  const conn = new Client();

  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => { console.log('✅ SSH Connected!'); resolve(); });
    conn.on('error', (err) => { console.error('❌ SSH failed:', err.message); reject(err); });
    conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 30000 });
  });

  try {
    // Step 1: Check server
    console.log('\n📋 Step 1: Server check...');
    await execCommand(conn, 'uname -a && echo "---" && cat /etc/os-release | head -4 && echo "---" && free -h | head -2 && echo "---" && df -h / | tail -1');

    // Step 2: Install Node.js if needed
    console.log('\n📦 Step 2: Checking Node.js...');
    const nodeOut = await execCommand(conn, 'node --version 2>/dev/null || echo "NOT_FOUND"');
    if (nodeOut.includes('NOT_FOUND')) {
      console.log('Installing Node.js 20...');
      await execCommand(conn, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1 | tail -3 && apt-get install -y nodejs 2>&1 | tail -3', 180000);
    }
    console.log('Node.js:', (await execCommand(conn, 'node --version')).trim());

    // Install bun if needed
    const bunOut = await execCommand(conn, 'bun --version 2>/dev/null || echo "NOT_FOUND"');
    if (bunOut.includes('NOT_FOUND')) {
      console.log('Installing Bun...');
      await execCommand(conn, 'curl -fsSL https://bun.sh/install | bash 2>&1 | tail -5', 180000);
      await execCommand(conn, 'export PATH="$HOME/.bun/bin:$PATH" && echo "Bun: $(bun --version)"');
    }

    // Step 3: Transfer tarball via SFTP
    console.log('\n📤 Step 3: Uploading deployment package...');
    const fileSize = statSync(TARBALL_LOCAL).size;
    console.log(`Package size: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

    const sftp = await new Promise<any>((resolve, reject) => {
      conn.sftp((err, sftp) => { err ? reject(err) : resolve(sftp); });
    });

    await new Promise<void>((resolve, reject) => {
      const readStream = createReadStream(TARBALL_LOCAL);
      const writeStream = sftp.createWriteStream(TARBALL_REMOTE);
      
      let uploaded = 0;
      readStream.on('data', (chunk: Buffer) => {
        uploaded += chunk.length;
        const pct = ((uploaded / fileSize) * 100).toFixed(0);
        if (uploaded % (1024 * 512) < chunk.length) {
          process.stdout.write(`\r  Upload: ${pct}% (${(uploaded / 1024 / 1024).toFixed(1)}/${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
        }
      });
      
      writeStream.on('close', () => {
        console.log('\n  ✅ Upload complete!');
        resolve();
      });
      writeStream.on('error', reject);
      readStream.pipe(writeStream);
    });

    // Step 4: Extract and set up on VPS
    console.log('\n🔧 Step 4: Setting up on VPS...');
    await execCommand(conn, `mkdir -p ${REMOTE_DIR}`);
    await execCommand(conn, `cd ${REMOTE_DIR} && tar -xzf ${TARBALL_REMOTE} 2>&1 && echo "✅ Extracted"`);
    await execCommand(conn, `rm ${TARBALL_REMOTE} && echo "✅ Cleaned tarball"`);

    // Step 5: Install dependencies
    console.log('\n📥 Step 5: Installing dependencies...');
    await execCommand(conn, `cd ${REMOTE_DIR} && npm install --production 2>&1 | tail -5`, 180000);

    // Step 6: Generate Prisma client and push schema
    console.log('\n🗄️  Step 6: Setting up database...');
    await execCommand(conn, `cd ${REMOTE_DIR} && npx prisma generate 2>&1 | tail -3`, 60000);
    await execCommand(conn, `cd ${REMOTE_DIR} && npx prisma db push 2>&1 | tail -3`, 60000);

    // Step 7: Seed admin API key
    console.log('\n🔑 Step 7: Seeding admin key...');
    await execCommand(conn, `cd ${REMOTE_DIR} && node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function seed() {
  const existing = await db.apiKey.findFirst({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
  if (existing) { console.log('Key already exists'); await db.\\$disconnect(); return; }
  const user = await db.user.create({ data: { name: 'XANVYOR Admin', phone: '6287892614294' } });
  await db.apiKey.create({ data: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: user.id, plan: 'lifetime', label: 'Admin', isActive: true } });
  console.log('Admin key seeded');
  const adminUser = await db.user.create({ data: { name: 'Admin Owner', phone: '6287892614294' } });
  await db.apiKey.create({ data: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: adminUser.id, plan: 'lifetime', label: 'Admin Master', isActive: true } });
  console.log('Admin master key seeded');
  await db.\\$disconnect();
}
seed().catch(e => { console.error(e.message); process.exit(1); });
" 2>&1`, 30000);

    // Step 8: Check web server (Nginx/Caddy) and configure
    console.log('\n🌐 Step 8: Configuring web server...');
    
    // Check existing web servers
    const nginxInstalled = (await execCommand(conn, 'which nginx 2>/dev/null && echo "YES" || echo "NO"')).includes('YES');
    const caddyInstalled = (await execCommand(conn, 'which caddy 2>/dev/null && echo "YES" || echo "NO"')).includes('YES');
    
    console.log(`Nginx: ${nginxInstalled ? 'installed' : 'not found'}`);
    console.log(`Caddy: ${caddyInstalled ? 'installed' : 'not found'}`);

    // Check existing sites to NOT touch them
    const existingSites = await execCommand(conn, 'ls /etc/nginx/sites-enabled/ 2>/dev/null || echo "none"');
    console.log('Existing Nginx sites:', existingSites.trim());
    
    const existingCaddy = await execCommand(conn, 'cat /etc/caddy/Caddyfile 2>/dev/null || echo "none"');
    console.log('Existing Caddy config:', existingCaddy.trim().substring(0, 200));

    if (nginxInstalled) {
      // Configure Nginx reverse proxy
      console.log('Setting up Nginx config for xanvyorrecon.id...');
      await execCommand(conn, `cat > /etc/nginx/sites-available/xanvyorrecon.id << 'NGINX_EOF'
server {
    listen 80;
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
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    client_max_body_size 20M;
}
NGINX_EOF
echo "✅ Nginx config created"`);

      await execCommand(conn, 'ln -sf /etc/nginx/sites-available/xanvyorrecon.id /etc/nginx/sites-enabled/xanvyorrecon.id 2>/dev/null; echo "✅ Nginx symlink created"');
      await execCommand(conn, 'nginx -t 2>&1 && echo "✅ Nginx config valid" || echo "⚠️ Nginx config issue"');
    } else if (caddyInstalled) {
      // Add Caddy config
      console.log('Setting up Caddy config for xanvyorrecon.id...');
      // Backup existing Caddyfile
      await execCommand(conn, 'cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.bak 2>/dev/null; true');
      
      // We'll append to existing Caddyfile without touching other sites
      await execCommand(conn, `cat >> /etc/caddy/Caddyfile << 'CADDY_EOF'

xanvyorrecon.id, www.xanvyorrecon.id {
    reverse_proxy 127.0.0.1:3000
    encode gzip
}
CADDY_EOF
echo "✅ Caddy config appended"`);
    } else {
      // Install Nginx
      console.log('Installing Nginx...');
      await execCommand(conn, 'apt-get update -qq && apt-get install -y nginx 2>&1 | tail -5', 180000);
      
      await execCommand(conn, `cat > /etc/nginx/sites-available/xanvyorrecon.id << 'NGINX_EOF'
server {
    listen 80;
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
        proxy_read_timeout 120s;
        proxy_send_timeout 120s;
    }

    client_max_body_size 20M;
}
NGINX_EOF
echo "✅ Nginx config created"`);

      await execCommand(conn, 'ln -sf /etc/nginx/sites-available/xanvyorrecon.id /etc/nginx/sites-enabled/xanvyorrecon.id 2>/dev/null');
      await execCommand(conn, 'rm -f /etc/nginx/sites-enabled/default 2>/dev/null; true');
      await execCommand(conn, 'nginx -t 2>&1');
    }

    // Step 9: Create systemd service for the app
    console.log('\n⚙️  Step 9: Creating systemd service...');
    await execCommand(conn, `cat > /etc/systemd/system/xanvyor-recon.service << 'SYSTEMD_EOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}
ExecStart=${REMOTE_DIR}/node_modules/.bin/next start -p 3000
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=DATABASE_URL=file:${REMOTE_DIR}/db/custom.db

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF
echo "✅ Systemd service created"`);

    // Also try standalone mode
    await execCommand(conn, `cat > /etc/systemd/system/xanvyor-recon.service << 'SYSTEMD_EOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}
ExecStart=/usr/bin/node ${REMOTE_DIR}/.next/standalone/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${REMOTE_DIR}/db/custom.db

[Install]
WantedBy=multi-user.target
SYSTEMD_EOF
echo "✅ Systemd service updated (standalone mode)"`);

    await execCommand(conn, 'systemctl daemon-reload 2>&1 && echo "✅ Daemon reloaded"');

    // Step 10: Start the application
    console.log('\n🚀 Step 10: Starting application...');
    await execCommand(conn, 'systemctl enable xanvyor-recon 2>&1');
    await execCommand(conn, 'systemctl restart xanvyor-recon 2>&1');
    
    // Wait a moment for startup
    await new Promise(r => setTimeout(r, 5000));
    
    const status = await execCommand(conn, 'systemctl status xanvyor-recon 2>&1 | head -15');
    console.log('\n📊 Service status:\n', status);

    // Restart web server
    if (nginxInstalled) {
      await execCommand(conn, 'systemctl restart nginx 2>&1 && echo "✅ Nginx restarted"');
    }
    if (caddyInstalled) {
      await execCommand(conn, 'systemctl restart caddy 2>&1 && echo "✅ Caddy restarted"');
    }

    // Step 11: Check if SSL exists, if not try certbot
    console.log('\n🔒 Step 11: Checking SSL...');
    const sslCheck = await execCommand(conn, 'which certbot 2>/dev/null && echo "YES" || echo "NO"');
    if (!sslCheck.includes('YES')) {
      console.log('Installing certbot...');
      await execCommand(conn, 'apt-get install -y certbot python3-certbot-nginx 2>&1 | tail -3', 180000);
    }
    
    // Try SSL
    const sslAttempt = await execCommand(conn, 'certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id 2>&1 | tail -10', 120000);
    console.log('SSL result:', sslAttempt);

    // Final verification
    console.log('\n✅ Step 12: Final verification...');
    const curlLocal = await execCommand(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "FAILED"');
    console.log('Local HTTP check:', curlLocal.trim());
    
    const curlDomain = await execCommand(conn, 'curl -s -o /dev/null -w "%{http_code}" http://xanvyorrecon.id 2>/dev/null || echo "FAILED"');
    console.log('Domain HTTP check:', curlDomain.trim());

    console.log('\n🎉 Deployment complete!');
    console.log('================================');
    console.log(`🌐 Website: http://${DOMAIN}`);
    console.log(`🔑 Admin API Key: 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);
    console.log(`👑 Admin Master Key: recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);

  } catch (error) {
    console.error('\n❌ Deployment error:', error);
  } finally {
    conn.end();
  }
}

deploy().catch(console.error);
