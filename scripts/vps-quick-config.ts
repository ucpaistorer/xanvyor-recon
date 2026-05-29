import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

const conn = new Client();

function exec(cmd: string, timeout: number = 60000): Promise<string> {
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
    // Create .z-ai-config in all locations using echo
    console.log('\n[1] Creating .z-ai-config...');
    await exec(`cat > /home/xanvyor-recon/.next/standalone/.z-ai-config << 'CONFIGEOF'
{"baseUrl":"https://internal-api.z.ai/v1","apiKey":"8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a","chatId":"chat-6c4c97ee-bf32-4ba0-ae34-f327d1fde15d","token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZGJhMjJiNjYtMDFjZC00ZGU3LWIzZTYtNDdlOTljYjY0YzVlIiwiY2hhdF9pZCI6ImNoYXQtNmM0Yzk3ZWUtYmYzMi00YmEwLWFlMzQtZjMyN2QxZmRlMTVkIiwicGxhdGZvcm0iOiJ6YWkifQ.meJuplvKgyh61kwGZJenZoKXnN5xbUvaA_KWgA_Ed9c","userId":"dba22b66-01cd-4de7-b3e6-47e99cb64c5e"}
CONFIGEOF
cp /home/xanvyor-recon/.next/standalone/.z-ai-config /root/.z-ai-config
cp /home/xanvyor-recon/.next/standalone/.z-ai-config /etc/.z-ai-config
echo "Config files created"`);
    
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/.z-ai-config | python3 -c "import json,sys; d=json.load(sys.stdin); print(\'OK: baseUrl=\'+d[\'baseUrl\'])" 2>&1'));

    // Restart
    console.log('\n[2] Restarting service...');
    await exec('systemctl restart xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 3000));
    console.log(await exec('systemctl is-active xanvyor-recon'));

    // Quick test
    console.log('\n[3] Quick test...');
    const httpTest = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/');
    console.log(`HTTP: ${httpTest.trim()}`);

    console.log('\n✓ ZAI config deployed and service restarted!');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
