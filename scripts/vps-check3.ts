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
    // Check existing xanvyorrecon config
    console.log('--- Existing xanvyorrecon nginx config ---');
    console.log(await execCmd(conn, 'cat /etc/nginx/conf.d/xanvyorrecon.conf 2>/dev/null || echo "NOT FOUND"'));
    
    // Check /var/www/xanvyor-recon and /home/xanvyor-recon
    console.log('--- /var/www/xanvyor-recon ---');
    console.log(await execCmd(conn, 'ls -la /var/www/xanvyor-recon/ 2>/dev/null || echo "NOT FOUND"'));
    
    console.log('--- /home/xanvyor-recon ---');
    console.log(await execCmd(conn, 'ls -la /home/xanvyor-recon/ 2>/dev/null || echo "NOT FOUND"'));
    
    // Check all nginx configs
    console.log('--- All nginx conf.d ---');
    console.log(await execCmd(conn, 'ls -la /etc/nginx/conf.d/'));
    
    // Check SSL certs
    console.log('--- SSL certs for xanvyorrecon ---');
    console.log(await execCmd(conn, 'ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "no certbot"'));
    console.log(await execCmd(conn, 'ls -la /etc/letsencrypt/live/xanvyorrecon.id/ 2>/dev/null || echo "no cert"'));
    
    // Check ucpaistore config to see what ports are used
    console.log('--- ucpaistore config ---');
    console.log(await execCmd(conn, 'cat /etc/nginx/conf.d/ucpaistore.conf 2>/dev/null | head -20'));
    
    // Check available ports
    console.log('--- Used ports ---');
    console.log(await execCmd(conn, 'ss -tlnp | grep -E "3000|3001|3002|3003|8080|8888"'));
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
