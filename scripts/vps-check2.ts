import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

function execCmd(conn: Client, cmd: string, timeout = 30000): Promise<string> {
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
  try {
    // Check what's on port 3000
    console.log('--- Port 3000 process ---');
    console.log(await execCmd(conn, 'ls -la /proc/2637662/cwd 2>/dev/null || echo "proc not found"'));
    console.log(await execCmd(conn, 'cat /proc/2637662/cmdline 2>/dev/null | tr "\\0" " " || echo "proc not found"'));
    console.log(await execCmd(conn, 'ps aux | grep -E "next|node" | head -10'));
    
    // Check nginx default config
    console.log('--- Nginx config ---');
    console.log(await execCmd(conn, 'cat /etc/nginx/nginx.conf 2>/dev/null | head -40'));
    console.log(await execCmd(conn, 'ls /etc/nginx/conf.d/ 2>/dev/null'));
    console.log(await execCmd(conn, 'cat /etc/nginx/conf.d/*.conf 2>/dev/null | head -60'));
    
    // Check what websites are running
    console.log('--- Existing web apps ---');
    console.log(await execCmd(conn, 'ls -la /var/www/ 2>/dev/null'));
    console.log(await execCmd(conn, 'ls -la /home/ 2>/dev/null'));
    
    // Check if there's a systemd service for port 3000
    console.log('--- Systemd services ---');
    console.log(await execCmd(conn, 'systemctl list-units --type=service --state=running 2>/dev/null | grep -E "node|next|xanvyor|recon" || echo "none found"'));
    
    // Check curl localhost:3000
    console.log('--- Current site on :3000 ---');
    console.log(await execCmd(conn, 'curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:3000 2>/dev/null'));
    console.log((await execCmd(conn, 'curl -s http://localhost:3000 2>/dev/null | head -5')).substring(0, 300));
    
    // Check IP of the server
    console.log('--- Server IPs ---');
    console.log(await execCmd(conn, 'ip addr show | grep "inet " | head -5'));
    console.log(await execCmd(conn, 'curl -s ifconfig.me 2>/dev/null || echo "cant check"'));
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
