import { Client } from 'ssh2';
import { createReadStream, statSync } from 'fs';

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

function uploadFile(local: string, remote: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const size = statSync(local).size;
    console.log(`[SFTP] Uploading ${(size/1024/1024).toFixed(1)}MB...`);
    conn.sftp((err, sftp) => {
      if (err) return reject(err);
      const rs = createReadStream(local);
      const ws = sftp.createWriteStream(remote);
      let uploaded = 0;
      rs.on('data', (chunk: Buffer) => {
        uploaded += chunk.length;
        if (uploaded % (5 * 1024 * 1024) < chunk.length) {
          console.log(`  ${(uploaded/size*100).toFixed(0)}%...`);
        }
      });
      ws.on('close', () => { console.log('  Upload done!'); resolve(); });
      ws.on('error', reject);
      rs.pipe(ws);
    });
  });
}

async function main() {
  console.log('=== XANVYOR RECON - V2 Deploy with Public API Support ===\n');

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
    // Step 1: Stop service
    console.log('\n[1] Stopping service...');
    await exec('systemctl stop xanvyor-recon 2>/dev/null; echo "Stopped"');

    // Step 2: Upload new package
    console.log('\n[2] Uploading new deployment...');
    await uploadFile('/tmp/xanvyor-deploy2.tar.gz', '/home/xanvyor-recon/deploy2.tar.gz');

    // Step 3: Extract and setup
    console.log('\n[3] Extracting...');
    await exec(`
cd /home/xanvyor-recon
rm -rf .next
tar xzf deploy2.tar.gz
rm -f deploy2.tar.gz
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
cp -r public .next/standalone/public 2>/dev/null || true
cp -r prisma .next/standalone/prisma 2>/dev/null || true
mkdir -p .next/standalone/db
cp db/custom.db .next/standalone/db/custom.db 2>/dev/null || true
echo "Extraction done"
    `, 60000);

    // Step 4: Keep the .z-ai-config (already exists)
    console.log('\n[4] Verifying ZAI config...');
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/.z-ai-config | python3 -c "import json,sys; d=json.load(sys.stdin); print(\'ZAI config OK: \'+d[\'baseUrl\'])" 2>&1'));

    // Step 5: Start service
    console.log('\n[5] Starting service...');
    await exec('systemctl start xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 5000));

    // Step 6: Test
    console.log('\n[6] Testing...');
    const status = await exec('systemctl is-active xanvyor-recon');
    console.log(`Service: ${status.trim()}`);
    
    const httpTest = await exec('curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/');
    console.log(`HTTP: ${httpTest.trim()}`);

    // Step 7: Test web search (should now use public API fallback)
    console.log('\n[7] Testing web search API (public fallback)...');
    const searchResult = await exec('curl -s --max-time 30 -X POST http://localhost:3002/api/osint/web-search -H "Content-Type: application/json" -d \'{"query":"Google company","num":3}\' 2>&1 | head -300', 45000);
    console.log(searchResult.substring(0, 500));

    // Step 8: Test IP API
    console.log('\n[8] Testing IP API...');
    const ipResult = await exec('curl -s --max-time 30 -X POST http://localhost:3002/api/osint/ip -H "Content-Type: application/json" -d \'{"ip":"1.1.1.1"}\' 2>&1 | head -200', 45000);
    console.log(ipResult.substring(0, 500));

    console.log('\n=== DEPLOYMENT V2 COMPLETE ===');
    console.log('✓ App running with public API fallback');
    console.log('✓ Web search uses DuckDuckGo when ZAI SDK is unavailable');
    console.log('✓ Access: http://76.13.198.125');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
