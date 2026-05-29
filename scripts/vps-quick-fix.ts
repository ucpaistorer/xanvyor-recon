import { Client } from 'ssh2';

const VPS_HOST = '76.13.198.125';
const VPS_USER = 'root';
const VPS_PASS = '753951Ucup##';

const conn = new Client();

function exec(cmd: string, timeout: number = 120000): Promise<string> {
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
    // Quick fixes only
    console.log('[1] Regenerating Prisma Client...');
    console.log(await exec('cd /home/xanvyor-recon/.next/standalone && DATABASE_URL="file:/home/xanvyor-recon/.next/standalone/db/custom.db" npx prisma generate 2>&1 | tail -5'));
    
    console.log('\n[2] Restarting...');
    await exec('systemctl restart xanvyor-recon');
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('\n[3] Testing login...');
    console.log(await exec('curl -s -X POST http://localhost:3002/api/auth/login -H "Content-Type: application/json" -d \'{"apiKey":"recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}\' | head -200'));
    
    console.log('\n[4] Testing external...');
    console.log(await exec('curl -s -o /dev/null -w "%{http_code}" http://76.13.198.125/'));
    
  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
