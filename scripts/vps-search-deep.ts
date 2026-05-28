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
    // Deep check what DDG returns
    console.log('[1] DDG HTML with POST (proper form submission)...');
    const ddgPost = await exec(`curl -s --max-time 10 -L -X POST "https://html.duckduckgo.com/html/" \
      -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0" \
      -d "q=test+search&b=&kl=" 2>&1 | head -50`);
    console.log(ddgPost.substring(0, 800));

    // Try Bing search
    console.log('\n[2] Bing search results...');
    const bingSearch = await exec('curl -s --max-time 10 "https://www.bing.com/search?q=test" -H "User-Agent: Mozilla/5.0" 2>&1 | grep -o \'<h2><a href="[^"]*"[^>]*>[^<]*</a></h2>\' | head -5');
    console.log('Bing results:', bingSearch);

    // Try with different DDG approach  
    console.log('\n[3] DDG with specific headers...');
    const ddgCustom = await exec(`curl -s --max-time 10 -L -c /tmp/ddg-cookies.txt -b /tmp/ddg-cookies.txt \
      "https://duckduckgo.com/?q=test+search&ia=web" \
      -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
      -H "Accept: text/html,application/xhtml+xml" \
      -H "Accept-Language: en-US,en;q=0.9" 2>&1 | grep -c "result" || echo "0"`);
    console.log('DDG with cookies:', ddgCustom);

    // Try SearXNG public instance
    console.log('\n[4] SearXNG search...');
    const searxng = await exec('curl -s --max-time 10 "https://search.sapti.me/search?q=test&format=json" 2>&1 | head -100');
    console.log(searxng.substring(0, 500));

    // Try another SearXNG instance
    console.log('\n[5] Another SearXNG...');
    const searx2 = await exec('curl -s --max-time 10 "https://searx.tiekoetter.com/search?q=test&format=json" 2>&1 | head -100');
    console.log(searx2.substring(0, 500));

    // Try Brave Search
    console.log('\n[6] Brave Search...');
    const brave = await exec('curl -s --max-time 10 "https://search.brave.com/search?q=test" -H "User-Agent: Mozilla/5.0" 2>&1 | grep -c "snippet" || echo "0"');
    console.log('Brave results:', brave);

    // Check if we can access ip-api.com for IP geolocation
    console.log('\n[7] ip-api.com test...');
    const ipApi = await exec('curl -s --max-time 10 "http://ip-api.com/json/8.8.8.8" 2>&1');
    console.log(ipApi.substring(0, 300));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
