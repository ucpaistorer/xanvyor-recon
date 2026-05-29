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
    // Run the Node.js search test
    console.log('[1] Running Node.js search test...');
    console.log(await exec('node /tmp/test-search.js 2>&1'));

    // If Google is blocking, try Bing
    console.log('\n[2] Bing search via Node.js...');
    await exec(`cat > /tmp/test-bing.js << 'JSEOF'
const https = require('https');

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function test() {
  // Try Bing
  console.log('Testing Bing...');
  try {
    const res = await fetchUrl('https://www.bing.com/search?q=google+company&count=5', {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
    });
    
    // Bing result titles
    const titleRegex = /<h2><a href="([^"]*)"[^>]*>(.*?)<\\/a><\\/h2>/gi;
    const titles = [];
    let m;
    while ((m = titleRegex.exec(res.body)) !== null) {
      titles.push({ url: m[1], title: m[2].replace(/<[^>]*>/g, '').trim() });
    }
    console.log('Bing titles:', titles.length);
    titles.forEach((t, i) => console.log(i + ':', t.title, '-', t.url));
    
    // If no standard results, try other patterns
    if (titles.length === 0) {
      // Check if Bing is returning a captcha or redirect
      console.log('Bing HTML length:', res.body.length);
      console.log('Bing title:', res.body.match(/<title>(.*?)<\\/title>/)?.[1] || 'unknown');
      
      // Try finding ANY links
      const anyLink = /<a[^>]*href="(https?:\\/\\/[^"]*)"[^>]*>([^<]{5,100})<\\/a>/gi;
      const links = [];
      while ((m = anyLink.exec(res.body)) !== null) {
        if (!m[1].includes('bing.com') && !m[1].includes('microsoft.com') && m[2].length > 5) {
          links.push({ url: m[1], title: m[2] });
        }
      }
      console.log('Any external links:', links.length);
      links.slice(0, 5).forEach((l, i) => console.log(i + ':', l.title, '-', l.url));
    }
  } catch (e) {
    console.error('Bing error:', e.message);
  }
  
  // Try Yandex
  console.log('\\nTesting Yandex XML...');
  try {
    const res = await fetchUrl('https://yandex.com/search/xml/?query=google&l10n=en', {
      'User-Agent': 'Mozilla/5.0',
    });
    console.log('Yandex status:', res.status, 'length:', res.body.length);
  } catch (e) {
    console.error('Yandex error:', e.message);
  }
  
  // Try Wikipedia API (works for entity-based searches)
  console.log('\\nTesting Wikipedia API...');
  try {
    const res = await fetchUrl('https://en.wikipedia.org/w/api.php?action=opensearch&search=google&limit=5&format=json');
    const data = JSON.parse(res.body);
    console.log('Wiki results:', data[1]?.length || 0);
    data[1]?.forEach((t, i) => console.log(i + ':', t, '-', data[3]?.[i]));
  } catch (e) {
    console.error('Wiki error:', e.message);
  }
}

test();
JSEOF
node /tmp/test-bing.js 2>&1`);

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
