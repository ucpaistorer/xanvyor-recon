import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';

const HOST = '76.13.198.125';
const USER = 'root';
const PASS = '753951Ucup##';

function ssh(cmd: string, timeout = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    const timer = setTimeout(() => { conn.end(); reject(new Error('Timeout')); }, timeout);
    conn.on('ready', () => {
      conn.exec(cmd, (err, stream) => {
        if (err) { clearTimeout(timer); conn.end(); reject(err); return; }
        let out = '';
        stream.on('data', (d: Buffer) => { out += d.toString(); });
        stream.stderr?.on('data', (d: Buffer) => { out += d.toString(); });
        stream.on('close', () => { clearTimeout(timer); conn.end(); resolve(out); });
      });
    });
    conn.on('error', reject);
    conn.connect({ host: HOST, port: 22, username: USER, password: PASS, readyTimeout: 15000 });
  });
}

async function upload(localPath: string, remotePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      conn.sftp((err, sftp) => {
        if (err) { conn.end(); reject(err); return; }
        const rs = createReadStream(localPath);
        const ws = sftp.createWriteStream(remotePath);
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
  console.log('🚀 Step 1: Killing old process...');
  await ssh('kill -9 $(lsof -ti:3002) 2>/dev/null; systemctl stop xanvyor-recon 2>/dev/null; sleep 2; echo DONE');
  
  console.log('🚀 Step 2: Upload tarball...');
  await upload('/tmp/xanvyor-full.tar.gz', '/tmp/xanvyor-full.tar.gz');
  console.log('✅ Uploaded');
  
  console.log('🚀 Step 3: Extract to /home/xanvyor-recon...');
  const extract = await ssh(`cd /home/xanvyor-recon && rm -rf src .next node_modules prisma public package.json bun.lock next.config.ts tsconfig.json postcss.config.mjs components.json tailwind.config.ts eslint.config.mjs server.js package-lock.json 2>/dev/null; tar -xzf /tmp/xanvyor-full.tar.gz && rm /tmp/xanvyor-full.tar.gz && echo EXTRACTED_OK`, 60000);
  console.log(extract.includes('EXTRACTED_OK') ? '✅ Extracted' : '⚠️ Issue: ' + extract.substring(0, 200));
  
  console.log('🚀 Step 4: Set .env...');
  await ssh(`echo 'DATABASE_URL=file:/home/xanvyor-recon/db/custom.db' > /home/xanvyor-recon/.env`);
  
  console.log('🚀 Step 5: Install deps (this takes a while)...');
  const install = await ssh(`cd /home/xanvyor-recon && npm install --omit=dev 2>&1 | tail -3`, 300000);
  console.log('Install result:', install.trim());
  
  console.log('🚀 Step 6: Prisma setup...');
  await ssh(`cd /home/xanvyor-recon && npx prisma generate 2>&1 | tail -2 && npx prisma db push 2>&1 | tail -2`, 120000);
  
  console.log('🚀 Step 7: Seed admin keys...');
  const seed = await ssh(`cd /home/xanvyor-recon && node -e "
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
"`, 30000);
  console.log('Seed:', seed.trim());
  
  console.log('🚀 Step 8: Setup standalone + prisma...');
  await ssh(`cd /home/xanvyor-recon && \
cp -r .next/static .next/standalone/.next/ && \
cp -r public .next/standalone/ && \
mkdir -p .next/standalone/node_modules/.prisma .next/standalone/node_modules/@prisma .next/standalone/db && \
cp -r node_modules/.prisma/* .next/standalone/node_modules/.prisma/ && \
cp -r node_modules/@prisma/client .next/standalone/node_modules/@prisma/ && \
cp -r node_modules/@prisma/engines .next/standalone/node_modules/@prisma/ && \
cp db/custom.db .next/standalone/db/ && \
echo 'DATABASE_URL=file:/home/xanvyor-recon/.next/standalone/db/custom.db' > .next/standalone/.env && \
echo STANDALONE_OK`, 60000);
  
  console.log('🚀 Step 9: Update systemd...');
  await ssh(`cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/xanvyor-recon/.next/standalone
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:/home/xanvyor-recon/.next/standalone/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload && systemctl enable xanvyor-recon 2>/dev/null && echo SYSTEMD_OK`);
  
  console.log('🚀 Step 10: Start service...');
  await ssh(`fuser -k 3002/tcp 2>/dev/null; sleep 2; systemctl start xanvyor-recon; sleep 5; echo STARTED`);
  
  console.log('🚀 Step 11: Verify...');
  const status = await ssh('systemctl is-active xanvyor-recon 2>/dev/null || echo "FAILED"');
  console.log('Service status:', status.trim());
  
  const http = await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002');
  console.log('HTTP:', http.trim());
  
  const api = await ssh(`curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}'`);
  console.log('API:', api.trim().substring(0, 200));
  
  const title = await ssh('curl -s http://localhost:3002 | grep -o "<title>[^<]*</title>" | head -1');
  console.log('Title:', title.trim());
  
  console.log('\n🎉 DONE!');
}

main().catch(console.error);
