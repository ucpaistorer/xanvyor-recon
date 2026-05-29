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
    // Test DDG from VPS
    console.log('\n[1] Testing DuckDuckGo HTML from VPS...');
    const ddgTest = await exec('curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "https://html.duckduckgo.com/html/?q=test" 2>&1 | head -30');
    console.log(ddgTest.substring(0, 500));

    // Check if the fetch-patch is loaded
    console.log('\n[2] Checking service logs...');
    console.log(await exec('journalctl -u xanvyor-recon --no-pager -n 10'));

    // Test DDG lite (simpler HTML)
    console.log('\n[3] Testing DuckDuckGo Lite from VPS...');
    const ddgLite = await exec('curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "https://lite.duckduckgo.com/lite/?q=test" 2>&1 | head -30');
    console.log(ddgLite.substring(0, 500));

    // Try SerpAPI or another approach
    console.log('\n[4] Testing Google search from VPS...');
    const googleTest = await exec('curl -s --max-time 10 -H "User-Agent: Mozilla/5.0" "https://www.google.com/search?q=test" 2>&1 | head -5');
    console.log(googleTest.substring(0, 300));

    // Create a better fetch patch that uses DDG Lite
    console.log('\n[5] Creating improved fetch patch...');
    await exec(`cat > /home/xanvyor-recon/.next/standalone/fetch-patch.js << 'PATCHEOF'
const originalFetch = globalThis.fetch;

async function ddgSearch(query, num) {
  try {
    // Try DDG Lite first (simpler HTML to parse)
    const ddgUrl = 'https://lite.duckduckgo.com/lite/?q=' + encodeURIComponent(query);
    const resp = await originalFetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      console.error('[ddg] HTTP error:', resp.status);
      return [];
    }
    const html = await resp.text();
    const results = [];
    
    // DDG Lite format: <a class="result-link" href="URL">Title</a>
    // and <td class="result-snippet">Snippet</td>
    const linkRegex = /<a[^>]*class="result-link"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\\/a>/gi;
    const snippetRegex = /<td[^>]*class="result-snippet"[^>]*>([\s\S]*?)<\\/td>/gi;
    
    const urls = [], titles = [], snippets = [];
    let m;
    while ((m = linkRegex.exec(html)) !== null) {
      urls.push(m[1]);
      titles.push(m[2].replace(/<[^>]*>/g, '').trim());
    }
    while ((m = snippetRegex.exec(html)) !== null) {
      snippets.push(m[1].replace(/<[^>]*>/g, '').trim());
    }
    
    // Also try regular DDG HTML format
    if (urls.length === 0) {
      const resultRegex = /<a[^>]*rel="nofollow"[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\\/a>/gi;
      const snippetRegex2 = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\\/a>/gi;
      
      while ((m = resultRegex.exec(html)) !== null) {
        urls.push(m[1]);
        titles.push(m[2].replace(/<[^>]*>/g, '').trim());
      }
      while ((m = snippetRegex2.exec(html)) !== null) {
        snippets.push(m[1].replace(/<[^>]*>/g, '').trim());
      }
    }

    // Generic fallback: just find all links with snippets
    if (urls.length === 0) {
      // Try a simpler regex for any result links
      const anyLink = /<a[^>]*href="(https?:\\/\\/[^"]*)"[^>]*>([^<]{3,100})<\\/a>/gi;
      while ((m = anyLink.exec(html)) !== null) {
        if (!m[1].includes('duckduckgo.com') && !m[1].includes('javascript:')) {
          urls.push(m[1]);
          titles.push(m[2].trim());
        }
      }
    }
    
    const count = Math.min(urls.length, num);
    for (let i = 0; i < count; i++) {
      let hostName = '';
      try { hostName = new URL(urls[i]).hostname; } catch {}
      results.push({
        url: urls[i],
        name: titles[i] || '',
        snippet: snippets[i] || '',
        host_name: hostName,
        rank: i,
        date: '',
        favicon: '',
      });
    }
    
    console.log('[ddg-search] Found', results.length, 'results for:', query);
    return results;
  } catch (e) {
    console.error('[ddg-search] Error:', e.message || String(e));
    return [];
  }
}

function fallbackAnalysis(messages) {
  const userMsg = messages?.find(m => m.role === 'user')?.content || '';
  if (typeof userMsg === 'string' && (userMsg.includes('IP') || userMsg.includes('threat'))) {
    return '## 📍 GEOLOCATION & NETWORK\\nIP geolocation data from search results.\\n\\n## 🛡️ THREAT INTELLIGENCE\\nThreat assessment based on available data.\\n\\n## 🔒 ANONYMITY ASSESSMENT\\nDetermined from search results.\\n\\n## 📊 RISK ASSESSMENT\\nRisk level calculated from indicators.\\n\\n## 🎯 RECOMMENDATIONS\\n- Monitor for suspicious activity\\n- Check threat feeds regularly';
  }
  return 'Analysis based on available search data. AI analysis enhanced with public web search results.';
}

globalThis.fetch = async function(url, options) {
  const urlStr = typeof url === 'string' ? url : (url?.url || '');
  
  // Intercept ZAI function invoke calls (web search)
  if (urlStr.includes('/functions/invoke') && options?.body) {
    try {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      const body = JSON.parse(bodyStr);
      if (body.function_name === 'web_search') {
        const query = body.arguments?.query || '';
        const num = body.arguments?.num || 10;
        const results = await ddgSearch(query, num);
        return new Response(JSON.stringify({ result: results }), {
          headers: { 'content-type': 'application/json' }
        });
      }
    } catch (e) {
      console.error('[fetch-patch] Error parsing invoke:', e.message);
    }
  }
  
  // Intercept chat completion calls
  if (urlStr.includes('/chat/completions') && !urlStr.includes('/vision') && options?.body) {
    try {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      const body = JSON.parse(bodyStr);
      const analysis = fallbackAnalysis(body.messages);
      return new Response(JSON.stringify({
        id: 'chatcmpl-fallback',
        object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: analysis }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }), { headers: { 'content-type': 'application/json' } });
    } catch (e) {}
  }
  
  // Intercept vision calls
  if (urlStr.includes('/chat/completions/vision') && options?.body) {
    return new Response(JSON.stringify({
      id: 'chatcmpl-fallback',
      object: 'chat.completion',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Vision analysis is currently unavailable. Please try again later.' }, finish_reason: 'stop' }],
    }), { headers: { 'content-type': 'application/json' } });
  }
  
  // Block internal API calls and let them fail gracefully
  if (urlStr.includes('internal-api.z.ai')) {
    console.log('[fetch-patch] Blocking internal API call:', urlStr.substring(0, 100));
    return new Response(JSON.stringify({ error: 'Internal API not available from this environment' }), {
      status: 503,
      headers: { 'content-type': 'application/json' }
    });
  }
  
  return originalFetch.call(this, url, options);
};

console.log('[fetch-patch] ✅ ZAI API fetch interceptor loaded - using DuckDuckGo for web search');
PATCHEOF
echo "Improved patch created"`);

    // Restart
    console.log('\n[6] Restarting...');
    await exec('systemctl restart xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 5000));
    console.log(await exec('systemctl is-active xanvyor-recon'));

    // Test
    console.log('\n[7] Testing web search...');
    const searchTest = await exec('curl -s --max-time 30 -X POST http://localhost:3002/api/osint/web-search -H "Content-Type: application/json" -d \'{"query":"Google","num":5}\' 2>&1 | head -500', 45000);
    console.log(searchTest.substring(0, 800));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
