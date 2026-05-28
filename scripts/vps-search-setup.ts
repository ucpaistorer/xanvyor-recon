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
    // Check noscript version
    console.log('[1] Brave Search noscript content...');
    const noscript = await exec('curl -s --max-time 10 "https://search.brave.com/search?q=google" -H "User-Agent: Mozilla/5.0" 2>&1 | grep -oP "<noscript>.*?</noscript>" | head -3');
    console.log('Noscript:', noscript.substring(0, 300));

    // Check data attributes in snippet divs
    console.log('\n[2] Brave snippet data...');
    const snippets = await exec('curl -s --max-time 10 "https://search.brave.com/search?q=google" -H "User-Agent: Mozilla/5.0" 2>&1 | grep -oP "data-url=\\"[^\\"]*\\"|data-title=\\"[^\\"]*\\"" | head -20');
    console.log('Data attrs:', snippets);

    // Try a completely different approach - use the Brave Search API
    console.log('\n[3] Brave Search Web Search API...');
    const braveApi = await exec('curl -s --max-time 10 "https://api.search.brave.com/res/v1/web/search?q=google&count=5" -H "Accept: application/json" -H "Accept-Encoding: gzip" 2>&1 | head -200');
    console.log(braveApi.substring(0, 500));

    // Install a lightweight search tool on VPS - try SearXNG via Docker
    console.log('\n[4] Checking Docker...');
    console.log(await exec('docker --version 2>/dev/null || echo "No Docker"'));
    
    // Alternative: use a simple Node.js scraping approach with better parsing
    // Let me try Google search results parsing with the VPS
    console.log('\n[5] Google search parsing...');
    const googleTest = await exec('curl -s --max-time 10 "https://www.google.com/search?q=google+company&num=5" -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0" -H "Accept-Language: en-US" 2>&1 | grep -oP "href=\\"/url\\?q=(https?://[^&\"]+)" | head -10');
    console.log('Google links:', googleTest);

    // Try yet another approach - install searx on the VPS
    console.log('\n[6] Setting up SearXNG on VPS...');
    const dockerCheck = await exec('which docker 2>/dev/null || echo "NO_DOCKER"');
    
    if (!dockerCheck.includes('NO_DOCKER')) {
      console.log('Docker available, setting up SearXNG...');
      await exec('docker run -d --name searxng -p 8888:8080 searxng/searxng:latest 2>&1 || echo "Container may already exist"', 60000);
      await new Promise(r => setTimeout(r, 10000));
      
      console.log(await exec('curl -s --max-time 10 "http://localhost:8888/search?q=test&format=json" 2>&1 | head -200'));
    } else {
      console.log('No Docker. Installing pip and searx...');
      // Try installing SearXNG directly
      await exec('pip3 install searx 2>&1 | tail -5 || echo "pip install failed"', 60000);
    }

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
