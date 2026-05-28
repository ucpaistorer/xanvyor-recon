import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

const conn = new Client();

function exec(cmd: string, timeout: number = 60000): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log(`[SSH] > ${cmd.substring(0, 100)}...`);
    conn.exec(cmd, { timeout }, (err, stream) => {
      if (err) return reject(err);
      let stdout = '';
      let stderr = '';
      stream.on('data', (data: Buffer) => { stdout += data.toString(); });
      stream.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });
      stream.on('close', () => {
        if (stderr) console.log(`[SSH] stderr: ${stderr.substring(0, 300)}`);
        resolve(stdout);
      });
    });
  });
}

async function main() {
  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => { console.log('[SSH] Connected!'); resolve(); });
    conn.on('error', (err) => { console.error('[SSH] Error:', err.message); reject(err); });
    conn.connect({
      host: VPS_HOST,
      port: 22,
      username: VPS_USER,
      password: VPS_PASS,
      readyTimeout: 30000,
      algorithms: {
        kex: ['diffie-hellman-group14-sha256', 'diffie-hellman-group14-sha1', 'ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group-exchange-sha256'],
        hostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ssh-ed25519', 'rsa-sha2-256', 'rsa-sha2-512'],
      }
    });
  });

  try {
    // Check environment
    console.log('\n=== VPS Environment ===');
    console.log(await exec('uname -a'));
    console.log(await exec('cat /etc/os-release | head -5'));
    console.log('Disk:', await exec('df -h / | tail -1'));
    console.log('Memory:', await exec('free -h | grep Mem'));
    console.log('Node:', await exec('node -v 2>/dev/null || echo "NOT INSTALLED"'));
    console.log('NPM:', await exec('npm -v 2>/dev/null || echo "NOT INSTALLED"'));
    console.log('Bun:', await exec('bun -v 2>/dev/null || echo "NOT INSTALLED"'));
    console.log('Git:', await exec('git --version 2>/dev/null || echo "NOT INSTALLED"'));
    console.log('Nginx:', await exec('nginx -v 2>&1 || echo "NOT INSTALLED"'));
    console.log('PM2:', await exec('pm2 -v 2>/dev/null || echo "NOT INSTALLED"'));

    // Check if any web server is already running
    console.log('\n=== Running Services ===');
    console.log(await exec('ss -tlnp | grep -E ":(80|443|3000|8080)" || echo "No web services"'));
    console.log(await exec('systemctl list-units --type=service --state=running | grep -E "nginx|apache|node|xanvyor" || echo "No relevant services"'));

    // Check DNS
    console.log('\n=== DNS Check ===');
    console.log(await exec('dig +short xanvyorrecon.id 2>/dev/null || nslookup xanvyorrecon.id 2>/dev/null || echo "DNS tools not available"'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
