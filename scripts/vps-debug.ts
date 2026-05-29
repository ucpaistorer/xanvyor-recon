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
    // Check service status
    console.log('--- Service Status ---');
    console.log(await execCmd(conn, 'systemctl status xanvyor-recon 2>&1 | head -20'));
    
    // Check service logs
    console.log('--- Service Logs ---');
    console.log(await execCmd(conn, 'journalctl -u xanvyor-recon --no-pager -n 30 2>&1'));
    
    // Check what's on port 3002
    console.log('--- Port 3002 ---');
    console.log(await execCmd(conn, 'ss -tlnp | grep 3002'));
    
    // Check standalone directory
    console.log('--- Standalone dir ---');
    console.log(await execCmd(conn, 'ls -la /var/www/xanvyor-recon/.next/standalone/ 2>/dev/null | head -15'));
    console.log(await execCmd(conn, 'cat /var/www/xanvyor-recon/.next/standalone/server.js 2>/dev/null | head -5'));
    console.log(await execCmd(conn, 'ls /var/www/xanvyor-recon/.next/standalone/node_modules/.prisma 2>/dev/null || echo "No prisma in standalone"'));
    
    // Test the app directly
    console.log('--- Curl test ---');
    console.log(await execCmd(conn, 'curl -s http://localhost:3002 | head -3'));
    
    // Check systemd service file
    console.log('--- Service file ---');
    console.log(await execCmd(conn, 'cat /etc/systemd/system/xanvyor-recon.service'));
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
