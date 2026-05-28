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
      stream.on('data', (d: Buffer) => { out += d.toString(); });
      stream.on('close', () => { clearTimeout(timer); resolve(out); });
      stream.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  try {
    // Step 1: Stop service and kill old process
    console.log('🛑 Stopping service and killing old process...');
    await execCmd(conn, 'systemctl stop xanvyor-recon 2>/dev/null; fuser -k 3002/tcp 2>/dev/null; sleep 2; echo "Killed"');
    
    // Verify port is free
    const portCheck = await execCmd(conn, 'ss -tlnp | grep 3002 || echo "Port 3002 is free"');
    console.log(portCheck.trim());
    
    // Step 2: Fix standalone - use next start instead of standalone
    // Actually, let's use the full project with next start
    console.log('\n⚙️  Setting up proper deployment...');
    
    // Make sure node_modules has everything
    console.log('Installing all dependencies...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npm install 2>&1 | tail -5`, 300000);
    
    // Generate Prisma
    console.log('Generating Prisma client...');
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma generate 2>&1 | tail -3`);
    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma db push 2>&1 | tail -3`);
    
    // Seed admin key
    console.log('Seeding admin key...');
    await execCmd(conn, `cd ${REMOTE_DIR} && node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function seed() {
  try {
    const existing = await db.apiKey.findFirst({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
    if (existing) { console.log('Key exists'); await db.\\$disconnect(); return; }
    const user = await db.user.create({ data: { name: 'XANVYOR Admin', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: user.id, plan: 'lifetime', label: 'Admin', isActive: true } });
    const adminUser = await db.user.create({ data: { name: 'Admin Owner', phone: '6287892614294' } });
    await db.apiKey.create({ data: { key: 'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a', userId: adminUser.id, plan: 'lifetime', label: 'Admin Master', isActive: true } });
    console.log('✅ Admin keys seeded');
  } catch(e) { console.error(e.message); }
  await db.\\$disconnect();
}
seed();
" 2>&1`);
    
    // Step 3: Update systemd to use next start
    console.log('\n📋 Updating systemd service...');
    await execCmd(conn, `cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON OSINT Platform
After=network.target

[Service]
Type=simple
WorkingDirectory=${REMOTE_DIR}
ExecStart=${REMOTE_DIR}/node_modules/.bin/next start -p 3002
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${REMOTE_DIR}/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
echo "✅ Service updated"`);

    await execCmd(conn, 'systemctl daemon-reload');
    
    // Step 4: Start the service
    console.log('\n🚀 Starting service...');
    await execCmd(conn, 'systemctl start xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 8000));
    
    const status = await execCmd(conn, 'systemctl status xanvyor-recon 2>&1 | head -15');
    console.log('Status:\n', status);
    
    // Step 5: Verify
    console.log('\n✅ Verification...');
    const curl = await execCmd(conn, 'curl -s -o /dev/null -w "%{http_code}" http://localhost:3002');
    console.log('HTTP status:', curl.trim());
    
    const title = await execCmd(conn, 'curl -s http://localhost:3002 | grep -o "<title>[^<]*</title>" | head -1');
    console.log('Page title:', title.trim());
    
    // Check port
    const ports = await execCmd(conn, 'ss -tlnp | grep 3002');
    console.log('Port:', ports.trim());
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
