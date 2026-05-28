import { Client } from 'ssh2';
import { createReadStream } from 'fs';
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

async function main() {
  // Stop
  await ssh('systemctl stop xanvyor-recon 2>/dev/null; kill -9 $(lsof -ti:3002) 2>/dev/null; sleep 2');
  
  // Step 1: Install ALL dependencies including dev
  console.log('📥 Installing ALL deps (including dev)...');
  await ssh(`cd ${DIR} && npm install 2>&1 | tail -5`, 300000);
  
  // Step 2: Make sure postcss and tailwind are installed
  console.log('\n📦 Installing postcss/tailwind...');
  await ssh(`cd ${DIR} && npm install @tailwindcss/postcss tailwindcss 2>&1 | tail -3`, 120000);
  
  // Step 3: Build on VPS
  console.log('\n🔨 Building on VPS...');
  const buildResult = await ssh(`cd ${DIR} && DATABASE_URL=file:${DIR}/db/custom.db npx next build 2>&1 | tail -40`, 600000);
  console.log('Build result:\n', buildResult);
  
  // Check if build succeeded
  if (buildResult.includes('error') && !buildResult.includes('Route (app)')) {
    console.log('⚠️ Build may have failed. Checking...');
    const buildId = await ssh(`cat ${DIR}/.next/BUILD_ID 2>/dev/null || echo "NO_BUILD"`);
    console.log('BUILD_ID:', buildId.trim());
    
    if (buildId.includes('NO_BUILD')) {
      console.log('❌ Build failed. Let me check what went wrong...');
      return;
    }
  }
  
  // Step 4: Seed keys
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
  
  // Step 5: Start service
  console.log('\n🚀 Starting...');
  await ssh(`systemctl start xanvyor-recon; sleep 10`);
  
  // Step 6: Verify
  const status = await ssh('systemctl is-active xanvyor-recon 2>/dev/null');
  console.log('Service:', status.trim());
  
  const logs = await ssh('journalctl -u xanvyor-recon --no-pager -n 10 2>&1');
  console.log('Logs:', logs);
  
  const http = await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "FAIL"');
  console.log('HTTP:', http.trim());
  
  if (http.trim() === '200') {
    const title = await ssh('curl -s http://localhost:3002 | grep -o "<title>[^<]*</title>" | head -1');
    console.log('Title:', title.trim());
    
    const api = await ssh(`curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}' 2>/dev/null`);
    console.log('API:', api.trim().substring(0, 200));
  }
}

main().catch(console.error);
