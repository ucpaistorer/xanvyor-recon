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
    // Fix 1: Regenerate Prisma Client for the VPS runtime
    console.log('[1] Fixing Prisma Client...');
    const prismaFix = await exec(`
cd /home/xanvyor-recon/.next/standalone
export DATABASE_URL="file:/home/xanvyor-recon/.next/standalone/db/custom.db"
npx prisma generate 2>&1 | tail -10
    `, 60000);
    console.log(prismaFix);

    // Fix 2: Ensure server.js has the fetch-patch at the very top
    console.log('\n[2] Checking server.js...');
    const serverContent = await exec('head -5 /home/xanvyor-recon/.next/standalone/server.js');
    console.log(serverContent);
    
    if (!serverContent.includes('fetch-patch')) {
      console.log('Adding fetch-patch to server.js...');
      await exec("sed -i '1i require(\"./fetch-patch.js\");' /home/xanvyor-recon/.next/standalone/server.js");
    }

    // Fix 3: The fetch patch needs to intercept at the ZAI SDK level
    // The issue is that the ZAI SDK already captured the original fetch
    // before our patch runs. We need to also patch the SDK's internal fetch.
    console.log('\n[3] Checking if fetch patch is intercepting...');
    
    // Let me check the actual web search route handler
    console.log(await exec('cat /home/xanvyor-recon/.next/standalone/.next/server/app/api/osint/web-search/route.js 2>/dev/null | head -30'));

    // Fix 4: Create a test script to verify the fetch interception
    console.log('\n[4] Testing fetch interception directly...');
    await exec(`cat > /tmp/test-fetch-patch.js << 'JSEOF'
require('/home/xanvyor-recon/.next/standalone/fetch-patch.js');

async function test() {
  console.log('Testing fetch interception...');
  
  // Test if fetch is patched
  const resp = await fetch('https://internal-api.z.ai/v1/functions/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ function_name: 'web_search', arguments: { query: 'Google', num: 3 } }),
  });
  
  const data = await resp.json();
  console.log('Response:', JSON.stringify(data).substring(0, 500));
  
  // Test Wikipedia
  console.log('\\nTesting Wikipedia...');
  const wikiResp = await fetch('https://en.wikipedia.org/w/api.php?action=opensearch&search=Google&limit=3&format=json');
  const wikiData = await wikiResp.json();
  console.log('Wiki results:', wikiData[1]?.length || 0);
  wikiData[1]?.forEach((t, i) => console.log(i + ':', t));
}

test().catch(e => console.error('Error:', e.message));
JSEOF
node /tmp/test-fetch-patch.js 2>&1`, 30000);

    // Restart service
    console.log('\n[5] Restarting service...');
    await exec('systemctl restart xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Status:', (await exec('systemctl is-active xanvyor-recon')).trim());

    // Test login again
    console.log('\n[6] Testing login after Prisma fix...');
    const loginResult = await exec(`curl -s -X POST http://localhost:3002/api/auth/login -H 'Content-Type: application/json' -d '{"apiKey":"recon-admin-8vv2EzXBG7xG8qt0trde4hnQefDvoTNXomjVgB32b4d76b0a"}' 2>&1 | head -200`);
    console.log(loginResult.substring(0, 300));

    // Test web search
    console.log('\n[7] Testing web search...');
    const searchResult = await exec(`curl -s --max-time 30 -X POST http://localhost:3002/api/osint/web-search -H 'Content-Type: application/json' -d '{"query":"Google","num":5}' 2>&1 | head -500`, 45000);
    console.log(searchResult.substring(0, 800));

    // Test external access
    console.log('\n[8] External access...');
    const extHttp = await exec('curl -s -o /dev/null -w "%{http_code}" http://76.13.198.125/');
    console.log('External HTTP:', extHttp.trim());

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
