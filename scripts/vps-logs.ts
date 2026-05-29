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
    // Check recent app logs
    console.log('\n[1] App service logs (recent):');
    console.log(await exec('journalctl -u xanvyor-recon --no-pager -n 30 2>&1'));

    // Test web search locally on VPS
    console.log('\n[2] Testing web search locally...');
    const searchResult = await exec('curl -s --max-time 60 -X POST http://localhost:3002/api/osint/web-search -H "Content-Type: application/json" -d \'{"query":"test"}\' 2>&1 | head -300', 90000);
    console.log(searchResult);

    // Test with a simpler query
    console.log('\n[3] Testing username search...');
    const userResult = await exec('curl -s --max-time 60 -X POST http://localhost:3002/api/osint/username -H "Content-Type: application/json" -d \'{"username":"test"}\' 2>&1 | head -300', 90000);
    console.log(userResult);

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
