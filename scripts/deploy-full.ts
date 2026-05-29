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
    // Step 1: Stop everything on port 3002
    console.log('🛑 Step 1: Stopping all processes...');
    await execCmd(conn, 'systemctl stop xanvyor-recon 2>/dev/null; fuser -k 3002/tcp 2>/dev/null; sleep 1');
    // Kill by finding all node processes on port 3002
    await execCmd(conn, `for pid in $(ss -tlnp | grep ':3002 ' | grep -oP 'pid=\\K[0-9]+'); do kill -9 $pid 2>/dev/null; done; echo "Killed"`);
    await new Promise(r => setTimeout(r, 3000));
    
    const portCheck = await execCmd(conn, 'ss -tlnp | grep 3002 || echo "PORT_FREE"');
    if (!portCheck.includes('PORT_FREE')) {
      console.log('⚠️  Port still in use, trying harder...');
      await execCmd(conn, 'pkill -9 -f "server.js" 2>/dev/null; sleep 2');
    }
    console.log('Port status:', (await execCmd(conn, 'ss -tlnp | grep 3002 || echo "FREE"')).trim());
    
    // Step 2: Wipe and clean
    console.log('\n🧹 Step 2: Cleaning deployment dir...');
    await execCmd(conn, `rm -rf ${REMOTE_DIR}/.next ${REMOTE_DIR}/src ${REMOTE_DIR}/prisma ${REMOTE_DIR}/db ${REMOTE_DIR}/public ${REMOTE_DIR}/node_modules 2>/dev/null`);
    
    // Step 3: Upload full tarball
    console.log('\n📤 Step 3: Uploading full build...');
    const sftp = await new Promise<any>((resolve, reject) => {
      conn.sftp((err, sftp) => { err ? reject(err) : resolve(sftp); });
    });
    
    const fileSize = statSync('/tmp/xanvyor-full.tar.gz').size;
    console.log(`Package: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);
    
    await new Promise<void>((resolve, reject) => {
      const rs = createReadStream('/tmp/xanvyor-full.tar.gz');
      const ws = sftp.createWriteStream('/tmp/xanvyor-full.tar.gz');
      ws.on('close', () => { console.log('  ✅ Upload complete'); resolve(); });
      ws.on('error', reject);
      rs.pipe(ws);
    });
    
    // Step 4: Extract
    console.log('\n📦 Step 4: Extracting...');
    await execCmd(conn, `cd ${REMOTE_DIR} && tar -xzf /tmp/xanvyor-full.tar.gz 2>&1 && echo "✅ Extracted"`);
    await execCmd(conn, 'rm /tmp/xanvyor-full.tar.gz');
    
    // Verify .next structure
    console.log('\n📋 Verifying .next structure...');
    console.log(await execCmd(conn, `ls ${REMOTE_DIR}/.next/ | head -20`));
    console.log('Has server dir:', (await execCmd(conn, `ls ${REMOTE_DIR}/.next/server/ 2>/dev/null | head -3 || echo "NO_SERVER_DIR"`)).trim());
    
    // Step 5: Update .env
    await execCmd(conn, `echo 'DATABASE_URL=file:${REMOTE_DIR}/db/custom.db' > ${REMOTE_DIR}/.env`);
    
    // Step 6: Install deps
    console.log('\n📥 Step 6: Installing dependencies...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npm install --omit=dev 2>&1 | tail -5`, 300000);
    
    // Step 7: Setup Prisma
    console.log('\n🗄️ Step 7: Setting up database...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma generate 2>&1 | tail -3`);
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma db push 2>&1 | tail -3`);
    
    // Step 8: Seed keys
    console.log('\n🔑 Step 8: Seeding admin keys...');
    await execCmd(conn, `cd ${REMOTE_DIR} && node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function seed() {
  try {
    const existing = await db.apiKey.findFirst({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
    if (existing) { console.log('Keys exist already'); await db.\\$disconnect(); return; }
    const user = await db.user.create({ data: { name: 'XANVYOR Admin', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: user.id, plan: 'lifetime', label: 'Admin', isActive: true } });
    const adminUser = await db.user.create({ data: { name: 'Admin Owner', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: adminUser.id, plan: 'lifetime', label: 'Admin Master', isActive: true } });
    console.log('✅ Keys seeded');
  } catch(e) { console.error('Seed error:', e.message); }
  await db.\\$disconnect();
}
seed();
" 2>&1`);
    
    // Step 9: Update systemd to use next start
    console.log('\n⚙️ Step 9: Setting up systemd...');
    await execCmd(conn, `cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}
ExecStart=/usr/bin/node ${REMOTE_DIR}/node_modules/next/dist/bin/next start -p 3002
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${REMOTE_DIR}/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
echo "✅ Service file created"`);

    await execCmd(conn, 'systemctl daemon-reload');
    await execCmd(conn, 'systemctl enable xanvyor-recon 2>&1');
    
    // Step 10: Start
    console.log('\n🚀 Step 10: Starting...');
    await execCmd(conn, 'systemctl start xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 10000));
    
    const status = await execCmd(conn, 'systemctl status xanvyor-recon 2>&1 | head -12');
    console.log('\n📊 Status:\n', status);
    
    // Verify
    console.log('\n✅ Verification...');
    const httpCode = await execCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3002');
    console.log('HTTP:', httpCode.trim());
    
    const apiTest = await execCmd(conn, `curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}'`);
    console.log('API test:', apiTest.trim().substring(0, 200));
    
    const adminTest = await execCmd(conn, `curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}'`);
    console.log('Admin test:', adminTest.trim().substring(0, 200));
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
