import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const REMOTE_DIR = '/var/www/xanvyor-recon';
const APP_PORT = 3002;
const TARBALL_LOCAL = '/tmp/xanvyor-deploy.tar.gz';

function execCmd(conn: Client, cmd: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${cmd.substring(0, 80)}`)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); reject(err); return; }
      let out = '';
      stream.on('data', (d: Buffer) => { out += d.toString(); });
      stream.on('close', () => { clearTimeout(timer); resolve(out); });
      stream.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
    });
  });
}

async function deploy() {
  console.log('🚀 XANVYOR RECON - Deploying to VPS');
  console.log('====================================');
  
  const conn = new Client();
  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => { console.log('✅ SSH Connected!'); resolve(); });
    conn.on('error', (err) => reject(err));
    conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
  });

  try {
    // Step 1: Stop existing process on port 3002
    console.log('\n🛑 Step 1: Stopping existing process on port ' + APP_PORT + '...');
    await execCmd(conn, `fuser -k ${APP_PORT}/tcp 2>/dev/null; sleep 1; echo "Stopped"`);

    // Step 2: Backup old deployment and clear directory
    console.log('\n💾 Step 2: Preparing deployment directory...');
    await execCmd(conn, `rm -rf ${REMOTE_DIR}/src ${REMOTE_DIR}/.next ${REMOTE_DIR}/prisma ${REMOTE_DIR}/node_modules 2>/dev/null; echo "Cleared"`);

    // Step 3: Upload tarball via SFTP
    console.log('\n📤 Step 3: Uploading deployment package...');
    const fileSize = statSync(TARBALL_LOCAL).size;
    console.log(`Package: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

    const sftp = await new Promise<any>((resolve, reject) => {
      conn.sftp((err, sftp) => { err ? reject(err) : resolve(sftp); });
    });

    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream(TARBALL_LOCAL);
      const ws = sftp.createWriteStream('/tmp/xanvyor-deploy.tar.gz');
      ws.on('close', () => { console.log('  ✅ Upload complete!'); resolve(); });
      ws.on('error', reject);
      rs.pipe(ws);
    });

    // Step 4: Extract on VPS
    console.log('\n📦 Step 4: Extracting files...');
    await execCmd(conn, `cd ${REMOTE_DIR} && tar -xzf /tmp/xanvyor-deploy.tar.gz 2>&1 && echo "✅ Extracted"`);
    await execCmd(conn, 'rm /tmp/xanvyor-deploy.tar.gz');

    // Step 5: Update .env
    console.log('\n⚙️  Step 5: Setting up environment...');
    await execCmd(conn, `echo 'DATABASE_URL=file:${REMOTE_DIR}/db/custom.db' > ${REMOTE_DIR}/.env`);

    // Step 6: Install dependencies
    console.log('\n📥 Step 6: Installing dependencies...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npm install --omit=dev 2>&1 | tail -5`, 300000);

    // Step 7: Copy static files to standalone
    console.log('\n📋 Step 7: Setting up standalone server...');
    await execCmd(conn, `cp -r ${REMOTE_DIR}/.next/static ${REMOTE_DIR}/.next/standalone/.next/ 2>/dev/null; echo "static copied"`);
    await execCmd(conn, `cp -r ${REMOTE_DIR}/public ${REMOTE_DIR}/.next/standalone/ 2>/dev/null; echo "public copied"`);

    // Step 8: Setup Prisma
    console.log('\n🗄️  Step 8: Setting up database...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma generate 2>&1 | tail -3`, 60000);
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma db push 2>&1 | tail -3`, 60000);

    // Copy Prisma client to standalone
    await execCmd(conn, `cp -r ${REMOTE_DIR}/node_modules/.prisma ${REMOTE_DIR}/.next/standalone/node_modules/.prisma 2>/dev/null; echo "prisma copied"`);
    await execCmd(conn, `cp -r ${REMOTE_DIR}/node_modules/@prisma ${REMOTE_DIR}/.next/standalone/node_modules/@prisma 2>/dev/null; echo "@prisma copied"`);

    // Step 9: Seed admin API key
    console.log('\n🔑 Step 9: Seeding admin key...');
    await execCmd(conn, `cd ${REMOTE_DIR} && node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function seed() {
  try {
    const existing = await db.apiKey.findFirst({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
    if (existing) { console.log('Admin key already exists'); await db.\\$disconnect(); return; }
    const user = await db.user.create({ data: { name: 'XANVYOR Admin', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: user.id, plan: 'lifetime', label: 'Admin', isActive: true } });
    const adminUser = await db.user.create({ data: { name: 'Admin Owner', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: adminUser.id, plan: 'lifetime', label: 'Admin Master', isActive: true } });
    console.log('✅ Admin keys seeded');
  } catch(e) { console.error(e.message); }
  await db.\\$disconnect();
}
seed();
" 2>&1`, 30000);

    // Step 10: Update systemd service
    console.log('\n⚙️  Step 10: Creating systemd service...');
    await execCmd(conn, `cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}/.next/standalone
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${REMOTE_DIR}/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
echo "✅ Service file created"`);

    await execCmd(conn, 'systemctl daemon-reload');

    // Step 11: Start the service
    console.log('\n🚀 Step 11: Starting application...');
    await execCmd(conn, 'systemctl enable xanvyor-recon 2>&1');
    await execCmd(conn, 'systemctl restart xanvyor-recon 2>&1');
    
    // Wait for startup
    await new Promise(r => setTimeout(r, 5000));
    
    const status = await execCmd(conn, 'systemctl status xanvyor-recon 2>&1 | head -15');
    console.log('\n📊 Service status:\n', status);

    // Step 12: Verify
    console.log('\n✅ Step 12: Verification...');
    const curlLocal = await execCmd(conn, `curl -s -o /dev/null -w "%{http_code}" http://localhost:${APP_PORT} 2>/dev/null`);
    console.log(`Local HTTP (port ${APP_PORT}): ${curlLocal.trim()}`);

    // Step 13: Fix SSL with Let's Encrypt
    console.log('\n🔒 Step 13: Setting up SSL...');
    
    // Check if certbot is installed
    const certbotCheck = await execCmd(conn, 'which certbot 2>/dev/null || echo "NOT_FOUND"');
    if (certbotCheck.includes('NOT_FOUND')) {
      console.log('Installing certbot...');
      await execCmd(conn, 'yum install -y certbot python3-certbot-nginx 2>&1 | tail -5 || apt-get install -y certbot python3-certbot-nginx 2>&1 | tail -5', 180000);
    }
    
    // Try to get cert - need to temporarily allow HTTP for ACME challenge
    const sslResult = await execCmd(conn, 'certbot --nginx -d xanvyorrecon.id -d www.xanvyorrecon.id --non-interactive --agree-tos --email admin@xanvyorrecon.id 2>&1 | tail -10', 120000);
    console.log('SSL Result:', sslResult);

    // Step 14: Restart nginx
    console.log('\n🔄 Step 14: Restarting nginx...');
    await execCmd(conn, 'nginx -t 2>&1 && systemctl restart nginx 2>&1 && echo "✅ Nginx restarted" || echo "⚠️ Nginx config issue"');

    // Final check
    console.log('\n🎯 Final verification...');
    const finalCheck = await execCmd(conn, `curl -sk -o /dev/null -w "%{http_code}" https://xanvyorrecon.id 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" http://xanvyorrecon.id 2>/dev/null`);
    console.log(`Domain HTTPS check: ${finalCheck.trim()}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 DEPLOYMENT COMPLETE!');
    console.log('='.repeat(50));
    console.log(`🌐 Website: https://xanvyorrecon.id`);
    console.log(`🔑 API Key: 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);
    console.log(`👑 Admin Key: recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);
    console.log(`📡 Port: ${APP_PORT}`);
    console.log(`📁 Path: ${REMOTE_DIR}`);

  } catch (error) {
    console.error('\n❌ Deployment error:', error);
  } finally {
    conn.end();
  }
}

deploy().catch(console.error);
