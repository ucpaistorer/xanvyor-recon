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
    // Test Google search parsing properly
    console.log('[1] Google search HTML...');
    const googleHtml = await exec(`curl -s --max-time 10 'https://www.google.com/search?q=google+company&num=5' -H 'User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0' 2>&1 | grep -c '<h3' || echo "0"`);
    console.log('H3 count:', googleHtml.trim());

    // Get actual Google search links
    console.log('\n[2] Google search links...');
    const googleLinks = await exec(`curl -s --max-time 10 'https://www.google.com/search?q=google+company' -H 'User-Agent: Mozilla/5.0' | grep -oP '<a href="/url\\?q=([^&"]+)' | head -10`);
    console.log('Links:', googleLinks);

    // Try a different Google parsing
    console.log('\n[3] Google search div.g...');
    const googleDiv = await exec(`curl -s --max-time 10 'https://www.google.com/search?q=google' -H 'User-Agent: Mozilla/5.0' | grep -c 'class="g"' || echo "0"`);
    console.log('Result divs:', googleDiv.trim());

    // Get Google results with h3 tags
    console.log('\n[4] Google h3 results...');
    const h3Results = await exec(`curl -s --max-time 10 'https://www.google.com/search?q=google' -H 'User-Agent: Mozilla/5.0' | grep -oP '<h3[^>]*>([^<]*)</h3>' | head -10`);
    console.log('H3 titles:', h3Results);

    // Write a proper Node.js test script on the VPS
    console.log('\n[5] Creating Node.js search test...');
    await exec(`cat > /tmp/test-search.js << 'JSEOF'
const https = require('https');
const http = require('http');

function fetchUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

async function test() {
  console.log('Testing Google search...');
  try {
    const res = await fetchUrl('https://www.google.com/search?q=google+company&num=5', {
      'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    });
    
    // Find h3 tags (result titles)
    const h3Regex = /<h3[^>]*>(.*?)<\\/h3>/gi;
    const titles = [];
    let m;
    while ((m = h3Regex.exec(res.body)) !== null) {
      titles.push(m[1].replace(/<[^>]*>/g, '').trim());
    }
    console.log('Titles found:', titles.length);
    titles.forEach((t, i) => console.log(i + ':', t));
    
    // Find links in /url?q= format
    const linkRegex = /href="\\/url\\?q=(https?:\\/\\/[^&"]+)/gi;
    const links = [];
    while ((m = linkRegex.exec(res.body)) !== null) {
      links.push(m[1]);
    }
    console.log('Links found:', links.length);
    links.slice(0, 5).forEach((l, i) => console.log(i + ':', l));
    
    // Find description snippets
    const descRegex = /<span[^>]*>([^<]{50,200})<\\/span>/gi;
    const descs = [];
    while ((m = descRegex.exec(res.body)) !== null) {
      if (!m[1].includes('function') && !m[1].includes('{')) {
        descs.push(m[1].trim());
      }
    }
    console.log('Snippets found:', descs.length);
    descs.slice(0, 5).forEach((d, i) => console.log(i + ':', d.substring(0, 100)));
    
  } catch (e) {
    console.error('Error:', e.message);
  }
  
  // Test ip-api
  console.log('\\nTesting ip-api...');
  try {
    const res = await fetchUrl('http://ip-api.com/json/8.8.8.8');
    const data = JSON.parse(res.body);
    console.log('IP:', data.query, 'Country:', data.country, 'City:', data.city, 'ISP:', data.isp);
  } catch (e) {
    console.error('ip-api error:', e.message);
  }
}

test();
JSEOF
node /tmp/test-search.js 2>&1`, 30000);
    console.log(execResult || 'done');

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

var execResult: string;
main().then(r => { execResult = r; });
