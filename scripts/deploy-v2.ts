import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';

const HOST = '76.13.198.125', USER = 'root', PASS = '753951Ucup##';
const DIR = '/home/xanvyor-recon';

function ssh(cmd: string, timeout = 120000): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => { conn.end(); reject(new Error('Timeout')); }, timeout);
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); reject(err); return; }
        let out = '';
        stream.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
        stream.stderr?.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
        stream.on('close', () => { clearTimeout(timer); conn.end(); resolve(out); });
      });
    });
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 15000 });
  });
}

function uploadFile(local: string, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); reject(err); return; }
        const rs = createReadStream(local);
        const ws = sftp.createWriteStream(remote);
        ws.on('close', () => { conn.end(); resolve(); });
        ws.on('error', (e) => { conn.end(); reject(e); });
        rs.pipe(ws);
      });
    });
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 15000 });
  });
}

async function main() {
  // Step 1: Stop and kill
  console.log('🛑 Stopping...');
  await ssh('systemctl stop xanvyor-recon 2>/dev/null; kill -9 $(lsof -ti:3002) 2>/dev/null; sleep 2');
  
  // Step 2: Install ALL dependencies (including dev for postcss/tailwind)
  console.log('\n📥 Installing ALL dependencies...');
  await ssh(`cd ${DIR} && npm install 2>&1 | tail -3`, 300000);
  
  // Step 3: Check if .next exists and has BUILD_ID
  console.log('\n📋 Checking build...');
  const buildId = await ssh(`cat ${DIR}/.next/BUILD_ID 2>/dev/null || echo "NO_BUILD"`);
  console.log('BUILD_ID:', buildId.trim());
  
  // If no build, upload our tarball and extract it again
  if (buildId.includes('NO_BUILD')) {
    console.log('\n📤 Uploading build...');
    await uploadFile('/tmp/xanvyor-full.tar.gz', '/tmp/xanvyor-full.tar.gz');
    console.log('Extracting...');
    await ssh(`cd ${DIR} && tar -xzf /tmp/xanvyor-full.tar.gz && rm /tmp/xanvyor-full.tar.gz`);
  }
  
  // Step 4: Verify .next structure
  console.log('\n📋 Verifying build...');
  console.log(await ssh(`ls ${DIR}/.next/ | head -20`));
  console.log('BUILD_ID:', (await ssh(`cat ${DIR}/.next/BUILD_ID 2>/dev/null || echo "MISSING"`)).trim());
  console.log('Has server:', (await ssh(`ls ${DIR}/.next/server/ 2>/dev/null | head -3 || echo "NO"`)).trim());
  
  // Step 5: Setup env and DB
  await ssh(`echo 'DATABASE_URL=file:${DIR}/db/custom.db' > ${DIR}/.env`);
  await ssh(`cd ${DIR} && npx prisma generate 2>&1 | tail -2`);
  await ssh(`cd ${DIR} && npx prisma db push 2>&1 | tail -2`);
  
  // Step 6: Seed keys
  console.log('\n🔑 Seeding...');
  await ssh(`cd ${DIR} && node -e "
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function s() {
  const e = await db.apiKey.findFirst({ where: { key: '8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a' } });
  if(e){console.log('EXISTS');await db.\\$disconnect();return;}
  const u=await db.user.create({data:{name:'XANVYOR Admin',phone:'6287892614294'}});
  await db.apiKey.create({data:{key:'8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',userId:u.id,plan:'lifetime',label:'Admin',isActive:true}});
  const u2=await db.user.create({data:{name:'Admin Owner',phone:'6287892614294'}});
  await db.apiKey.create({data:{key:'recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a',userId:u2.id,plan:'lifetime',label:'Admin Master',isActive:true}});
  console.log('SEEDED');
  await db.\\$disconnect();
}
s();
" 2>&1`);
  
  // Step 7: Verify DB
  const dbCheck = await ssh(`sqlite3 ${DIR}/db/custom.db "SELECT key FROM ApiKey WHERE key LIKE '8vv2%';" 2>/dev/null`);
  console.log('DB check:', dbCheck.trim());
  
  // Step 8: Start with next start
  console.log('\n🚀 Starting...');
  await ssh(`cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON
After=network.target

[Service]
Type=simple
WorkingDirectory=${DIR}
ExecStart=/usr/bin/node ${DIR}/node_modules/next/dist/bin/next start -p 3002
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:${DIR}/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable xanvyor-recon 2>/dev/null`);
  
  await ssh('systemctl start xanvyor-recon; sleep 8');
  
  // Step 9: Check
  const status = await ssh('systemctl is-active xanvyor-recon 2>/dev/null');
  console.log('Service:', status.trim());
  
  const logs = await ssh('journalctl -u xanvyor-recon --no-pager -n 15 2>&1');
  console.log('Recent logs:\n', logs);
  
  const http = await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "FAIL"');
  console.log('HTTP:', http.trim());
  
  if (http.trim() === '200') {
    const api = await ssh(`curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}' 2>/dev/null`);
    console.log('API:', api.trim().substring(0, 300));
  }
}

main().catch(console.error);
