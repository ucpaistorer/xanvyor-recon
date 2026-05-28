import { Client } from 'ssh2';
const HOST = '76.13.198.125', USER = 'root', PASS = '753951Ucup##';
function ssh(cmd: string, timeout = 60000): Promise<string> {
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
  // Step 1: Stop service and kill old process
  console.log('🛑 Stopping service...');
  await ssh('systemctl stop xanvyor-recon 2>/dev/null; kill -9 $(lsof -ti:3002) 2>/dev/null; sleep 2');
  
  // Verify port is free
  const portCheck = await ssh('ss -tlnp | grep 3002 || echo "PORT_FREE"');
  console.log('Port:', portCheck.trim());
  
  // Step 2: Rebuild on the VPS to ensure compatibility
  console.log('\n🔨 Rebuilding on VPS...');
  const buildOutput = await ssh(`cd /home/xanvyor-recon && DATABASE_URL=file:/home/xanvyor-recon/db/custom.db npx next build 2>&1 | tail -20`, 300000);
  console.log('Build output:', buildOutput.substring(buildOutput.length - 500));
  
  // Step 3: Update systemd to use next start
  console.log('\n⚙️ Updating systemd...');
  await ssh(`cat > /etc/systemd/system/xanvyor-recon.service << 'EOF'
[Unit]
Description=XANVYOR RECON
After=network.target

[Service]
Type=simple
WorkingDirectory=/home/xanvyor-recon
ExecStart=/usr/bin/node /home/xanvyor-recon/node_modules/next/dist/bin/next start -p 3002
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3002
Environment=HOSTNAME=0.0.0.0
Environment=DATABASE_URL=file:/home/xanvyor-recon/db/custom.db

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload`);
  
  // Step 4: Start service
  console.log('\n🚀 Starting service...');
  await ssh('systemctl start xanvyor-recon; sleep 8');
  
  // Step 5: Check
  const status = await ssh('systemctl status xanvyor-recon 2>&1 | head -15');
  console.log('\n📊 Status:\n', status);
  
  const logs = await ssh('journalctl -u xanvyor-recon --no-pager -n 10 2>&1');
  console.log('Logs:', logs);
  
  const http = await ssh('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null || echo "FAILED"');
  console.log('HTTP:', http.trim());
  
  if (http.trim() === '200') {
    const apiTest = await ssh(`curl -s -X POST http://localhost:3002/api/auth/validate -H "Content-Type: application/json" -d '{"apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}' 2>/dev/null`);
    console.log('API:', apiTest.trim().substring(0, 200));
  }
}

main().catch(console.error);
