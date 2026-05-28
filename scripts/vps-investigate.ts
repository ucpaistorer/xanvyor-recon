import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';
const REMOTE_DIR = '/var/www/xanvyor-recon';

function execCmd(conn: Client, cmd: string, timeout = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timeout`)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); reject(err); return; }
      let out = '';
      stream.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
      stream.on('close', () => { clearTimeout(timer); resolve(out); });
      stream.stderr?.on('data', (d: Buffer) => { out += d.toString(); process.stdout.write(d.toString()); });
    });
  });
}

const conn = new Client();
conn.on('ready', async () => {
  try {
    // Check what process is on 3002
    console.log('=== Process on 3002 ===');
    console.log(await execCmd(conn, 'ss -tlnp | grep 3002'));
    console.log(await execCmd(conn, 'ps aux | grep 3002 | grep -v grep'));
    
    // Check ALL systemd services
    console.log('\n=== All custom systemd services ===');
    console.log(await execCmd(conn, 'systemctl list-unit-files | grep -E "xanvyor|recon|next|node" || echo "none"'));
    
    // Check crontab
    console.log('\n=== Crontab ===');
    console.log(await execCmd(conn, 'crontab -l 2>/dev/null || echo "no crontab"'));
    console.log(await execCmd(conn, 'ls /etc/cron.d/ 2>/dev/null'));
    
    // Check database
    console.log('\n=== Database ===');
    console.log(await execCmd(conn, `ls -la ${REMOTE_DIR}/db/ 2>/dev/null`));
    console.log(await execCmd(conn, `ls -la ${REMOTE_DIR}/.next/standalone/db/ 2>/dev/null || echo "no standalone db"`));
    
    // Check the database directly with sqlite3
    console.log('\n=== DB contents ===');
    console.log(await execCmd(conn, `sqlite3 ${REMOTE_DIR}/db/custom.db "SELECT key, plan, isActive FROM ApiKey;" 2>/dev/null || echo "sqlite3 not found or db error"`));
    
    // Check environment
    console.log('\n=== .env files ===');
    console.log(await execCmd(conn, `cat ${REMOTE_DIR}/.env`));
    console.log(await execCmd(conn, `cat ${REMOTE_DIR}/.next/standalone/.env 2>/dev/null || echo "no standalone env"`));
    
    // Check which process is actually running on 3002
    console.log('\n=== Process details ===');
    const pid = await execCmd(conn, `ss -tlnp | grep ':3002 ' | grep -oP 'pid=\\K[0-9]+' | head -1`);
    const pidNum = pid.trim();
    if (pidNum) {
      console.log('PID:', pidNum);
      console.log(await execCmd(conn, `ls -la /proc/${pidNum}/cwd 2>/dev/null`));
      console.log(await execCmd(conn, `cat /proc/${pidNum}/cmdline 2>/dev/null | tr '\\0' ' '`));
      console.log(await execCmd(conn, `cat /proc/${pidNum}/environ 2>/dev/null | tr '\\0' '\\n' | grep DATABASE`));
    }
    
    // Kill the process forcefully and stop systemd
    console.log('\n=== Killing ===');
    await execCmd(conn, 'systemctl stop xanvyor-recon 2>/dev/null');
    await execCmd(conn, 'systemctl disable xanvyor-recon 2>/dev/null');
    if (pidNum) {
      await execCmd(conn, `kill -9 ${pidNum} 2>/dev/null`);
    }
    await execCmd(conn, 'pkill -9 -f "next start" 2>/dev/null');
    await execCmd(conn, 'pkill -9 -f "server.js" 2>/dev/null');
    await new Promise(r => setTimeout(r, 3000));
    console.log('After kill:', (await execCmd(conn, 'ss -tlnp | grep 3002 || echo "PORT_FREE"')).trim());
    
  } catch (e) { console.error('Error:', e); }
  finally { conn.end(); }
});
conn.on('error', (e) => { console.error('SSH Error:', e.message); process.exit(1); });
conn.connect({ host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS, readyTimeout: 15000 });
