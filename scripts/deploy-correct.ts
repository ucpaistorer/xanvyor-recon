import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const APP_DIR = '/home/xanvyor-recon';  // The ACTUAL app directory managed by CyberPanel

function execCmd(conn: Client, cmd: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout`)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); reject(err); return; }
      let out = '';
      stream.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
      stream.on('close', () => { clearTimeout(timer); resolve(out); });
      stream.stderr?.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  try {
    // Step 0: Check the actual app directory
    console.log('=== Checking actual app directory ===');
    console.log(await execCmd(conn, `ls -la ${APP_DIR}/ | head -20`));
    console.log(await execCmd(conn, `cat ${APP_DIR}/.env 2>/dev/null || echo "no .env"`));
    console.log(await execCmd(conn, `cat ${APP_DIR}/server.js 2>/dev/null | head -5`));
    console.log(await execCmd(conn, `sqlite3 ${APP_DIR}/db/custom.db "SELECT key, plan, isActive FROM ApiKey LIMIT 10;" 2>/dev/null || echo "no db here"`));
    
    // Step 1: Kill the process on port 3002
    console.log('\n🛑 Step 1: Killing process on 3002...');
    const pid = (await execCmd(conn, `ss -tlnp | grep ':3002 ' | grep -oP 'pid=\\K[0-9]+' | head -1`)).trim();
    console.log('PID:', pid);
    if (pid) {
      await execCmd(conn, `kill -9 ${pid} 2>/dev/null; sleep 2`);
    }
    await execCmd(conn, 'systemctl stop xanvyor-recon 2>/dev/null');
    
    // Verify it's dead
    await new Promise(r => setTimeout(r, 3000));
    const portCheck = await execCmd(conn, 'ss -tlnp | grep 3002 || echo "PORT_FREE"');
    console.log('Port check:', portCheck.trim());
    
    if (!portCheck.includes('PORT_FREE')) {
      // Might be managed by CyberPanel - check
      console.log('Checking CyberPanel processes...');
      await execCmd(conn, 'systemctl list-units | grep -i cyber 2>/dev/null | head -5');
      // Try kill again
      const pid2 = (await execCmd(conn, `ss -tlnp | grep ':3002 ' | grep -oP 'pid=\\K[0-9]+' | head -1`)).trim();
      if (pid2) await execCmd(conn, `kill -9 ${pid2} 2>/dev/null; sleep 3`);
    }
    
    // Step 2: Clean the app directory (keep .env and db)
    console.log('\n🧹 Step 2: Cleaning app directory...');
    await execCmd(conn, `cd ${APP_DIR} && rm -rf src .next node_modules prisma public package.json bun.lock next.config.ts tsconfig.json postcss.config.mjs components.json tailwind.config.ts eslint.config.mjs server.js package-lock.json deploy.tar.gz 2>/dev/null`);
    
    // Step 3: Upload tarball
    console.log('\n📤 Step 3: Uploading build...');
    const sftp = await new Promise<any>((resolve, reject) => {
      conn.sftp((err, sftp) => { err ? reject(err) : resolve(sftp); });
    });
    
    const fileSize = statSync('/tmp/xanvyor-full.tar.gz').size;
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream('/tmp/xanvyor-full.tar.gz');
      const ws = sftp.createWriteStream('/tmp/xanvyor-full.tar.gz');
      ws.on('close', () => { console.log(`  ✅ Uploaded ${(fileSize/1024/1024).toFixed(1)} MB`); resolve(); });
      ws.on('error', reject);
      rs.pipe(ws);
    });
    
    // Step 4: Extract to app dir
    console.log('\n📦 Step 4: Extracting...');
    await execCmd(conn, `cd ${APP_DIR} && tar -xzf /tmp/xanvyor-full.tar.gz 2>&1 && echo "✅ Extracted"`);
    await execCmd(conn, 'rm /tmp/xanvyor-full.tar.gz');
    
    // Step 5: Update .env
    console.log('\n⚙️ Step 5: Setting up environment...');
    await execCmd(conn, `echo 'DATABASE_URL=file:${APP_DIR}/db/custom.db' > ${APP_DIR}/.env`);
    
    // Step 6: Install dependencies
    console.log('\n📥 Step 6: Installing dependencies...');
    await execCmd(conn, `cd ${APP_DIR} && npm install --omit=dev 2>&1 | tail -5`, 300000);
    
    // Step 7: Setup Prisma
    console.log('\n🗄️ Step 7: Setting up database...');
    await execCmd(conn, `cd ${APP_DIR} && npx prisma generate 2>&1 | tail -3`);
    await execCmd(conn, `cd ${APP_DIR} && npx prisma db push 2>&1 | tail -3`);
    
    // Step 8: Seed admin keys in this DB
    console.log('\n🔑 Step 8: Seeding admin keys...');
    await execCmd(conn, `cd ${APP_DIR} && node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function seed() {
  try {
    const existing = await db.apiKey.findFirst({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
    if (existing) { console.log('Keys exist'); await db.\\$disconnect(); return; }
    const user = await db.user.create({ data: { name: 'XANVYOR Admin', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: user.id, plan: 'lifetime', label: 'Admin', isActive: true } });
    const adminUser = await db.user.create({ data: { name: 'Admin Owner', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: adminUser.id, plan: 'lifetime', label: 'Admin Master', isActive: true } });
    console.log('✅ Keys seeded');
  } catch(e) { console.error(e.message); }
  await db.\\$disconnect();
}
seed();
" 2>&1`);
    
    // Step 9: Copy standalone with prisma for proper server
    console.log('\n📋 Step 9: Setting up standalone server...');
    
    // Copy static and public to standalone
    await execCmd(conn, `cp -r ${APP_DIR}/.next/static ${APP_DIR}/.next/standalone/.next/ 2>/dev/null`);
    await execCmd(conn, `cp -r ${APP_DIR}/public ${APP_DIR}/.next/standalone/ 2>/dev/null`);
    
    // Copy Prisma to standalone
    await execCmd(conn, `mkdir -p ${APP_DIR}/.next/standalone/node_modules/.prisma`);
    await execCmd(conn, `mkdir -p ${APP_DIR}/.next/standalone/node_modules/@prisma`);
    await execCmd(conn, `cp -r ${APP_DIR}/node_modules/.prisma/* ${APP_DIR}/.next/standalone/node_modules/.prisma/ 2>/dev/null`);
    await execCmd(conn, `cp -r ${APP_DIR}/node_modules/@prisma/client ${APP_DIR}/.next/standalone/node_modules/@prisma/ 2>/dev/null`);
    await execCmd(conn, `cp -r ${APP_DIR}/node_modules/@prisma/engines ${APP_DIR}/.next/standalone/node_modules/@prisma/ 2>/dev/null`);
    
    // Copy db to standalone
    await execCmd(conn, `mkdir -p ${APP_DIR}/.next/standalone/db`);
    await execCmd(conn, `cp ${APP_DIR}/db/custom.db ${APP_DIR}/.next/standalone/db/ 2>/dev/null`);
    
    // Set .env in standalone
    await execCmd(conn, `echo 'DATABASE_URL=file:${APP_DIR}/.next/standalone/db/custom.db' > ${APP_DIR}/.next/standalone/.env`);
    
    console.log('✅ Standalone prepared');
    
    // Step 10: Update systemd service
    console.log('\n⚙️ Step 10: Updating systemd service...');
    await execCmd(conn, `cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${APP_DIR}/.next/standalone
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${APP_DIR}/.next/standalone/db/custom.db

[Install]
WantedBy=multi-user.target
EOF`);

    await execCmd(conn, 'systemctl daemon-reload');
    await execCmd(conn, 'systemctl enable xanvyor-recon 2>/dev/null');
    
    // Step 11: Start the service
    console.log('\n🚀 Step 11: Starting service...');
    
    // First, kill whatever is on port 3002 one more time
    await execCmd(conn, `fuser -k 3002/tcp 2>/dev/null; sleep 2`);
    const portNow = await execCmd(conn, 'ss -tlnp | grep 3002 || echo "FREE"');
    console.log('Port before start:', portNow.trim());
    
    await execCmd(conn, 'systemctl start xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 10000));
    
    const status = await execCmd(conn, 'systemctl status xanvyor-recon 2>&1 | head -12');
    console.log('\n📊 Service Status:\n', status);
    
    // Step 12: Verify
    console.log('\n✅ Step 12: Final verification...');
    const httpCode = await execCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3002');
    console.log('HTTP Status:', httpCode.trim());
    
    const apiTest = await execCmd(conn, `curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}'`);
    console.log('API Validate:', apiTest.trim().substring(0, 200));
    
    const adminTest = await execCmd(conn, `curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}'`);
    console.log('Admin Validate:', adminTest.trim().substring(0, 200));
    
    // Check external access
    const extHttp = await execCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" https://xanvyorrecon.id 2>/dev/null || curl -s -o /dev/null -w "%{http_code}" http://xanvyorrecon.id 2>/dev/null');
    console.log('External HTTPS/HTTP:', extHttp.trim());
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 DEPLOYMENT SUMMARY');
    console.log('='.repeat(50));
    console.log(`📁 App: ${APP_DIR}/.next/standalone`);
    console.log(`📡 Port: 3002`);
    console.log(`🔑 API Key: 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);
    console.log(`👑 Admin Key: recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a`);
    console.log(`🌐 Site: https://xanvyorrecon.id`);
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
