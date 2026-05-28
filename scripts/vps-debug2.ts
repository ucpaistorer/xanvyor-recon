import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

function execCmd(conn: Client, cmd: string, timeout = 30000): Promise<string> {
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
    // Get the actual error
    console.log('--- Recent journal logs ---');
    console.log(await execCmd(conn, 'journalctl -u xanvyor-recon --no-pager -n 20 2>&1'));
    
    // Check the next start command
    console.log('--- next binary ---');
    console.log(await execCmd(conn, 'ls -la /var/www/xanvyor-recon/node_modules/.bin/next 2>/dev/null || echo "next not found"'));
    
    // Try running it manually to see the error
    console.log('--- Manual test ---');
    await execCmd(conn, 'fuser -k 3002/tcp 2>/dev/null; sleep 2');
    const manualTest = await execCmd(conn, 'cd /var/www/xanvyor-recon && PORT=3002 DATABASE_URL=file:/var/www/xanvyor-recon/db/custom.db NODE_ENV=production /var/www/xanvyor-recon/node_modules/.bin/next start -p 3002 2>&1 &  sleep 5 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 && kill %1 2>/dev/null');
    console.log(manualTest);
    
    // Check if .next directory is complete
    console.log('--- .next directory ---');
    console.log(await execCmd(conn, 'ls -la /var/www/xanvyor-recon/.next/ 2>/dev/null'));
    console.log(await execCmd(conn, 'ls /var/www/xanvyor-recon/.next/server/ 2>/dev/null | head -5'));
    
    // Check if standalone server.js works
    console.log('--- Standalone test ---');
    const standaloneTest = await execCmd(conn, 'cd /var/www/xanvyor-recon/.next/standalone && PORT=3002 DATABASE_URL=file:/var/www/xanvyor-recon/db/custom.db node server.js 2>&1 & sleep 3 && curl -s -o /dev/null -w "%{http_code}" http://localhost:3002 && kill %1 2>/dev/null', 30000);
    console.log(standaloneTest);
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
