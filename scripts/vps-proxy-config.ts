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
    // First test if the VPS can reach the sandbox
    console.log('\n[1] Testing connectivity from VPS to sandbox...');
    console.log(await exec('curl -s --max-time 10 http://47.57.242.119:81/ -o /dev/null -w "HTTP %{http_code}" 2>&1'));
    
    // Test the proxy endpoint
    console.log('\n[2] Testing proxy endpoint from VPS...');
    console.log(await exec('curl -s --max-time 10 http://47.57.242.119:81/health?XTransformPort=3001 2>&1'));
    
    // Test web search through proxy
    console.log('\n[3] Testing web search proxy from VPS...');
    console.log(await exec('curl -s --max-time 30 -X POST "http://47.57.242.119:81/web-search?XTransformPort=3001" -H "Content-Type: application/json" -d \'{"query":"test","num":2}\' 2>&1 | head -200', 45000));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
