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
    // Check DNS resolution for internal-api.z.ai
    console.log('[1] DNS check for internal-api.z.ai:');
    console.log(await exec('dig +short internal-api.z.ai 2>/dev/null || nslookup internal-api.z.ai 2>/dev/null || echo "Cannot resolve"'));
    
    // Try to connect
    console.log('\n[2] Connection test:');
    console.log(await exec('curl -s --max-time 10 -o /dev/null -w "HTTP %{http_code}" https://internal-api.z.ai/v1 2>&1 || echo "Connection failed"'));
    
    // Check what IP it resolves to
    console.log('\n[3] Detailed DNS:');
    console.log(await exec('dig internal-api.z.ai ANY +noall +answer 2>/dev/null || echo "No DNS"'));
    
    // Try the ZAI API directly
    console.log('\n[4] Direct API test:');
    console.log(await exec('curl -s --max-time 10 -H "Authorization: Bearer 8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a" -H "X-Z-AI-From: Z" -H "Content-Type: application/json" -d \'{"function_name":"web_search","arguments":{"query":"test","num":5}}\' https://internal-api.z.ai/v1/functions/invoke 2>&1 | head -100'));

    // Check if we can use a proxy setup - test connectivity to the sandbox
    console.log('\n[5] Check if sandbox is reachable:');
    // The sandbox uses caddy gateway, check if we can reach it
    
  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
