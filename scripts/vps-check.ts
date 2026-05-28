import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

function execCmd(conn: Client, cmd: string, timeout = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout: ${cmd.substring(0, 60)}`)), timeout);
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
  console.log('✅ Connected!');
  try {
    console.log('--- Server Info ---');
    console.log(await execCmd(conn, 'uname -a'));
    console.log(await execCmd(conn, 'free -h | head -2'));
    console.log(await execCmd(conn, 'df -h / | tail -1'));
    
    console.log('--- Software ---');
    console.log('Node:', (await execCmd(conn, 'node --version 2>/dev/null || echo NOT_FOUND')).trim());
    console.log('NPM:', (await execCmd(conn, 'npm --version 2>/dev/null || echo NOT_FOUND')).trim());
    console.log('Bun:', (await execCmd(conn, 'bun --version 2>/dev/null || echo NOT_FOUND')).trim());
    console.log('Nginx:', (await execCmd(conn, 'nginx -v 2>&1 || echo NOT_FOUND')).trim());
    console.log('Caddy:', (await execCmd(conn, 'caddy version 2>&1 || echo NOT_FOUND')).trim());
    
    console.log('--- Existing sites ---');
    console.log(await execCmd(conn, 'ls /etc/nginx/sites-enabled/ 2>/dev/null || echo none'));
    console.log('Caddy:', (await execCmd(conn, 'cat /etc/caddy/Caddyfile 2>/dev/null || echo none')).substring(0, 500));
    
    console.log('--- Running services ---');
    console.log(await execCmd(conn, 'systemctl list-units --type=service --state=running | grep -E "nginx|caddy|node|next" || echo none'));
    
    console.log('--- Port 3000 ---');
    console.log(await execCmd(conn, 'ss -tlnp | grep 3000 || echo "Port 3000 free"'));
    
    console.log('--- DNS Check ---');
    console.log(await execCmd(conn, 'dig +short xanvyorrecon.id 2>/dev/null || host xanvyorrecon.id 2>/dev/null || echo "no dig/host"'));
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
