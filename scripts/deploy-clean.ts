import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const REMOTE_DIR = '/var/www/xanvyor-recon';

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
    // Step 1: Kill ALL processes on port 3002 aggressively
    console.log('🛑 Killing ALL processes on port 3002...');
    await execCmd(conn, 'systemctl stop xanvyor-recon 2>/dev/null; systemctl disable xanvyor-recon 2>/dev/null');
    await execCmd(conn, 'kill -9 $(lsof -ti:3002) 2>/dev/null; kill -9 $(ss -tlnp | grep 3002 | grep -oP "pid=\\K[0-9]+") 2>/dev/null; echo "Attempted kill"');
    await execCmd(conn, 'pkill -9 -f "xanvyor" 2>/dev/null; pkill -9 -f "3002" 2>/dev/null; echo "Pkill done"');
    await new Promise(r => setTimeout(r, 3000));
    
    // Verify port is free
    const portCheck = await execCmd(conn, 'ss -tlnp | grep 3002 || echo "PORT_FREE"');
    console.log('Port check:', portCheck.trim());
    
    if (!portCheck.includes('PORT_FREE')) {
      // Force kill by PID
      const pid = portCheck.match(/pid=(\d+)/)?.[1];
      if (pid) {
        console.log(`Killing PID ${pid}...`);
        await execCmd(conn, `kill -9 ${pid} 2>/dev/null; sleep 2`);
      }
    }
    
    // Step 2: Clean and re-upload .next properly
    console.log('\n🧹 Cleaning old build...');
    await execCmd(conn, `rm -rf ${REMOTE_DIR}/.next 2>/dev/null`);
    await execCmd(conn, `mkdir -p ${REMOTE_DIR}/.next`);
    
    // Upload the full .next tarball
    console.log('\n📤 Uploading .next build...');
    
    // First create a proper tarball with the complete .next directory
    // We already have the tarball but the .next was incomplete
    // Let's re-extract from the existing tarball
    
    const sftp = await new Promise<any>((resolve, reject) => {
      conn.sftp((err, sftp) => { err ? reject(err) : resolve(sftp); });
    });
    
    // Re-upload tarball  
    const fileSize = statSync('/tmp/xanvyor-deploy.tar.gz').size;
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream('/tmp/xanvyor-deploy.tar.gz');
      const ws = sftp.createWriteStream('/tmp/xanvyor-deploy.tar.gz');
      ws.on('close', () => { console.log('  Upload done'); resolve(); });
      ws.on('error', reject);
      rs.pipe(ws);
    });
    
    // Extract fresh
    console.log('\n📦 Extracting fresh build...');
    await execCmd(conn, `rm -rf ${REMOTE_DIR}/src ${REMOTE_DIR}/prisma ${REMOTE_DIR}/db ${REMOTE_DIR}/public 2>/dev/null`);
    await execCmd(conn, `cd ${REMOTE_DIR} && tar -xzf /tmp/xanvyor-deploy.tar.gz 2>&1 && echo "Extracted OK"`);
    await execCmd(conn, 'rm /tmp/xanvyor-deploy.tar.gz');
    
    // Check .next structure
    console.log('\n📋 Verifying build structure...');
    console.log(await execCmd(conn, `ls -la ${REMOTE_DIR}/.next/`));
    console.log(await execCmd(conn, `ls ${REMOTE_DIR}/.next/server/ 2>/dev/null | head -5 || echo "No server dir"`));
    
    // Step 3: Install deps properly
    console.log('\n📥 Installing dependencies...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npm install 2>&1 | tail -5`, 300000);
    
    // Step 4: Setup Prisma
    console.log('\n🗄️ Setting up database...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma generate 2>&1 | tail -3`);
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma db push 2>&1 | tail -3`);
    
    // Step 5: Seed keys
    console.log('\n🔑 Seeding keys...');
    await execCmd(conn, `cd ${REMOTE_DIR} && node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function seed() {
  try {
    const existing = await db.apiKey.findFirst({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
    if (existing) { console.log('Keys already exist'); await db.\\$disconnect(); return; }
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
    
    // Step 6: Update .env
    await execCmd(conn, `echo 'DATABASE_URL=file:${REMOTE_DIR}/db/custom.db' > ${REMOTE_DIR}/.env`);
    
    // Step 7: Update systemd to use node directly with standalone server
    console.log('\n⚙️ Setting up systemd...');
    
    // Copy Prisma to standalone
    await execCmd(conn, `mkdir -p ${REMOTE_DIR}/.next/standalone/node_modules/.prisma ${REMOTE_DIR}/.next/standalone/node_modules/@prisma`);
    await execCmd(conn, `cp -r ${REMOTE_DIR}/node_modules/.prisma/* ${REMOTE_DIR}/.next/standalone/node_modules/.prisma/ 2>/dev/null; echo "Prisma client copied"`);
    await execCmd(conn, `cp -r ${REMOTE_DIR}/node_modules/@prisma/client ${REMOTE_DIR}/.next/standalone/node_modules/@prisma/ 2>/dev/null; echo "@prisma/client copied"`);
    await execCmd(conn, `cp -r ${REMOTE_DIR}/node_modules/@prisma/engines ${REMOTE_DIR}/.next/standalone/node_modules/@prisma/ 2>/dev/null; echo "engines copied"`);
    
    // Copy static and public to standalone
    await execCmd(conn, `cp -r ${REMOTE_DIR}/.next/static ${REMOTE_DIR}/.next/standalone/.next/ 2>/dev/null; echo "static copied"`);
    await execCmd(conn, `cp -r ${REMOTE_DIR}/public ${REMOTE_DIR}/.next/standalone/ 2>/dev/null; echo "public copied"`);
    await execCmd(conn, `cp ${REMOTE_DIR}/.env ${REMOTE_DIR}/.next/standalone/ 2>/dev/null; echo "env copied"`);
    
    // Copy db to standalone
    await execCmd(conn, `mkdir -p ${REMOTE_DIR}/.next/standalone/db && cp ${REMOTE_DIR}/db/custom.db ${REMOTE_DIR}/.next/standalone/db/ 2>/dev/null; echo "db copied"`);
    
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
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${REMOTE_DIR}/.next/standalone/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
echo "✅ Service updated"`);

    await execCmd(conn, 'systemctl daemon-reload');
    await execCmd(conn, 'systemctl enable xanvyor-recon 2>&1');
    
    // Step 8: Start
    console.log('\n🚀 Starting service...');
    await execCmd(conn, 'systemctl start xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 8000));
    
    const status = await execCmd(conn, 'systemctl status xanvyor-recon 2>&1 | head -12');
    console.log('\n📊 Status:\n', status);
    
    // Verify
    console.log('\n✅ Final check...');
    const httpCode = await execCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3002');
    console.log('HTTP:', httpCode.trim());
    
    const title = await execCmd(conn, 'curl -s http://localhost:3002 | grep -o "<title>[^<]*</title>" | head -1');
    console.log('Title:', title.trim());
    
    const portStatus = await execCmd(conn, 'ss -tlnp | grep 3002');
    console.log('Port:', portStatus.trim());
    
    // Test API
    const apiTest = await execCmd(conn, `curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}'`);
    console.log('API test:', apiTest.trim().substring(0, 200));
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
