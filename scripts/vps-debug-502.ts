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
      stream.on('close', () => { resolve(stdout + (stderr ? '\n' + stderr : '')); });
    });
  });
}

async function main() {
  await new Promise<void>((resolve, reject) => {
    conn.on('ready', () => { console.log('[SSH] Connected!'); resolve(); });
    conn.on('error', reject);
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
    // Check service status
    console.log('[1] Service status...');
    console.log(await exec('systemctl status xanvyor-recon --no-pager | head -15'));
    
    // Check logs
    console.log('\n[2] Recent logs...');
    console.log(await exec('journalctl -u xanvyor-recon --no-pager -n 30'));

    // Restart and check
    console.log('\n[3] Restarting...');
    await exec('systemctl restart xanvyor-recon');
    await new Promise(r => setTimeout(r, 5000));
    console.log(await exec('systemctl is-active xanvyor-recon'));
    
    // Direct test
    console.log('\n[4] Direct port test...');
    console.log(await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/'));
    
    // Nginx test
    console.log('\n[5] Nginx test...');
    console.log(await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost/'));
    console.log(await exec('nginx -t 2>&1'));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
