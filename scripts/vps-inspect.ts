import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

const conn = new Client();

function exec(cmd: string, timeout: number = 30000): Promise<string> {
  return new Promise((resolve, reject) => {
    conn.exec(cmd, { timeout }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data: Buffer) => { stdout += data.toString(); });
      stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      stream.on('close', () => { resolve(stdout + (stderr ? '\nSTDERR: ' + stderr : '')); });
    });
  });
}

async function main() {
  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => { console.log('[SSH] Connected!'); resolve(); });
    conn.on('error', (err) => { reject(err); });
    conn.connect({
      host: VPS_HOST, port: 22, username: VPS_USER, password: VPS_PASS,
      readyTimeout: 30000,
      algorithms: {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256'],
        hostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
      }
    });
  });

  try {
    // Check all IP addresses on the VPS
    console.log('=== IP Addresses ===');
    console.log(await exec('ip addr show | grep "inet " | awk "{print \\$2}"'));

    // Check nginx config
    console.log('\n=== Nginx Config ===');
    console.log(await exec('ls -la /etc/nginx/sites-enabled/ 2>/dev/null; ls -la /etc/nginx/conf.d/ 2>/dev/null'));
    console.log(await exec('cat /etc/nginx/conf.d/xanvyor*.conf 2>/dev/null || cat /etc/nginx/sites-available/xanvyor* 2>/dev/null || echo "No xanvyor config found"'));
    console.log(await exec('cat /etc/nginx/nginx.conf | head -50'));

    // Check current xanvyor service
    console.log('\n=== XANVYOR Service ===');
    console.log(await exec('cat /etc/systemd/system/xanvyor-recon.service'));
    console.log(await exec('systemctl status xanvyor-recon --no-pager | head -20'));

    // Check current app
    console.log('\n=== Current App ===');
    console.log(await exec('ls -la /opt/xanvyor-recon/ 2>/dev/null || echo "No /opt/xanvyor-recon"'));
    console.log(await exec('ls -la /root/xanvyor* 2>/dev/null || echo "No /root/xanvyor"'));
    console.log(await exec('find / -maxdepth 3 -name "server.js" -path "*/.next/*" 2>/dev/null | head -5'));

    // Check what's on port 3000
    console.log('\n=== Port 3000 ===');
    console.log(await exec('ls -la /proc/2637662/cwd 2>/dev/null || echo "Process check failed"'));
    console.log(await exec('readlink /proc/2637662/cwd 2>/dev/null || echo "CWD check failed"'));
    console.log(await exec('cat /proc/2637662/cmdline 2>/dev/null | tr "\\0" " " || echo "cmdline check failed"'));

    // Test the current app
    console.log('\n=== Current App Test ===');
    console.log(await exec('curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000/ 2>&1'));
    console.log(await exec('curl -s http://localhost:3000/ 2>&1 | head -20'));

    // Check PM2
    console.log('\n=== PM2 ===');
    console.log(await exec('pm2 list 2>&1'));

    // Check SSL
    console.log('\n=== SSL ===');
    console.log(await exec('ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "No SSL certs"'));
    console.log(await exec('certbot certificates 2>&1 | head -20'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
