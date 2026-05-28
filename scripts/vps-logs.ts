import { Client } from 'ssh2';
const HOST = '76.13.198.125', USER = 'root', PASS = '753951Ucup##';
function ssh(cmd: string, timeout = 30000): Promise<string> {
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

async function main() {
  console.log('=== Journal logs ===');
  console.log(await ssh('journalctl -u xanvyor-recon --no-pager -n 30 2>&1'));
  
  console.log('\n=== Port check ===');
  console.log(await ssh('ss -tlnp | grep 3002 || echo "PORT_FREE"'));
  
  console.log('\n=== Try running manually ===');
  console.log(await ssh('cd /home/xanvyor-recon/.next/standalone && PORT=3002 DATABASE_URL=file:/home/xanvyor-recon/.next/standalone/db/custom.db NODE_ENV=production node server.js 2>&1 & sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null && kill %1 2>/dev/null', 30000));
  
  console.log('\n=== Try next start instead ===');
  console.log(await ssh('cd /home/xanvyor-recon && PORT=3002 DATABASE_URL=file:/home/xanvyor-recon/db/custom.db NODE_ENV=production node_modules/.bin/next start -p 3002 2>&1 & sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 2>/dev/null && kill %1 2>/dev/null', 30000));
}

main().catch(console.error);
