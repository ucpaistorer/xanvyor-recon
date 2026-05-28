import { Client } from 'ssh2';
import { Buffer } from 'buffer';

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

function uploadBuffer(buffer: Buffer, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const ws = sftp.createWriteStream(remote);
      ws.on('close', () => resolve());
      ws.on('error', reject);
      ws.end(buffer);
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
    const configContent = JSON.stringify({
      baseUrl: "https://internal-api.z.ai/v1",
      apiKey: "8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a",
      chatId: "chat-6c4c97ee-bf32-4ba0-ae34-f327d1fde15d",
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGJhMjJiNjYtMDFjZC00ZGU3LWIzZTYtNDdlOTljYjY0YzVlIiwiY2hhdF9pZCI6ImNoYXQtNmM0Yzk3ZWUtYmYzMi00YmEwLWFlMzQtZjMyN2QxZmRlMTVkIiwicGxhdGZvcm0iOiJ6YWkifQ.meJuplvKgyh61kwGZJenZoKXnN5xbUvaA_KWgA_Ed9c",
      userId: "dba22b66-01cd-4de7-b3e6-47e99cb64c5e"
    });

    // Create .z-ai-config in all 3 locations
    console.log('\n[1] Creating .z-ai-config files...');
    
    // 1. In the app working directory
    await uploadBuffer(Buffer.from(configContent), '/home/xanvyor-recon/.next/standalone/.z-ai-config');
    console.log('Created: /home/xanvyor-recon/.next/standalone/.z-ai-config');
    
    // 2. In root home directory
    await uploadBuffer(Buffer.from(configContent), '/root/.z-ai-config');
    console.log('Created: /root/.z-ai-config');
    
    // 3. In /etc/
    await uploadBuffer(Buffer.from(configContent), '/etc/.z-ai-config');
    console.log('Created: /etc/.z-ai-config');

    // Verify files
    console.log('\n[2] Verifying config files...');
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/.z-ai-config | python3 -c "import json,sys; d=json.load(sys.stdin); print(f\\"baseUrl: {d[\'baseUrl\']}, apiKey: {d[\'apiKey\'][:20]}...\\")" 2>/dev/null || echo "Parse failed"'));

    // Restart the service
    console.log('\n[3] Restarting service...');
    await exec('systemctl restart xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 5000));
    console.log(await exec('systemctl status xanvyor-recon --no-pager | head -10'));

    // Test web search API
    console.log('\n[4] Testing web search API...');
    const testResult = await exec(`curl -s -X POST http://localhost:3002/api/osint/web-search -H 'Content-Type: application/json' -d '{"query":"Google"}' --connect-timeout 30 2>&1 | head -200`);
    console.log(testResult);

    // Test IP API
    console.log('\n[5] Testing IP API...');
    const ipResult = await exec(`curl -s -X POST http://localhost:3002/api/osint/ip -H 'Content-Type: application/json' -d '{"ip":"1.1.1.1"}' --connect-timeout 30 2>&1 | head -200`);
    console.log(ipResult);

    console.log('\n✓ ZAI SDK configuration deployed!');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
