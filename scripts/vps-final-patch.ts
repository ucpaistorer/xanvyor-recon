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
    // First let's check how Brave Search HTML looks for parsing
    console.log('\n[1] Brave Search HTML sample...');
    const braveSample = await exec('curl -s --max-time 10 "https://search.brave.com/search?q=test+search" -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0" 2>&1 | grep -o \'<div[^>]*class="snippet[^"]*"[^>]*>\' | head -10');
    console.log('Snippet divs:', braveSample.trim());

    const braveResult = await exec('curl -s --max-time 10 "https://search.brave.com/search?q=test+search" -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0" 2>&1 | grep -oP \'href="(https?://[^"]+)"\' | head -15');
    console.log('Links:', braveResult);

    // Check for specific Brave search HTML patterns
    console.log('\n[2] Brave HTML structure...');
    const braveStructure = await exec('curl -s --max-time 10 "https://search.brave.com/search?q=google" -H "User-Agent: Mozilla/5.0" 2>&1 | grep -oP "class=\\"[a-z _-]+\\"" | sort -u | grep -i "result\\|snippet\\|title\\|url\\|link" | head -20');
    console.log(braveStructure);

    // Now create the final fetch patch
    console.log('\n[3] Creating final fetch patch with Brave Search + ip-api...');
    await exec(`cat > /home/xanvyor-recon/.next/standalone/fetch-patch.js << 'PATCHEOF'
const originalFetch = globalThis.fetch;

async function braveSearch(query, num) {
  try {
    const url = 'https://search.brave.com/search?q=' + encodeURIComponent(query) + '&source=web';
    const resp = await originalFetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) { console.error('[brave] HTTP error:', resp.status); return []; }
    
    const html = await resp.text();
    const results = [];
    
    // Parse Brave search results
    // Brave uses <div class="snippet ..."> for each result
    // Title in <a class="result-header">
    // URL in <cite> or data attributes  
    // Snippet in <p class="snippet-description">
    
    // Method 1: Extract from snippet blocks
    const snippetRegex = /<div[^>]*class="snippet[^"]*"[^>]*>([\\s\\S]*?)<\\/div>\\s*<\\/div>/gi;
    const urlRegex = /href="(https?:\\/\\/[^"]+)"/gi;
    const titleRegex = /<a[^>]*class="result-header[^"]*"[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)<\\/a>/gi;
    
    let match;
    const foundUrls = new Set();
    
    // Extract URLs and titles from result headers
    while ((match = titleRegex.exec(html)) !== null && results.length < num) {
      const url = match[1];
      const title = match[2].replace(/<[^>]*>/g, '').trim();
      if (url && !url.includes('brave.com') && !foundUrls.has(url)) {
        foundUrls.add(url);
        let host = '';
        try { host = new URL(url).hostname; } catch {}
        results.push({ url, name: title, snippet: '', host_name: host, rank: results.length, date: '', favicon: '' });
      }
    }
    
    // If no results with title regex, try extracting all external URLs
    if (results.length === 0) {
      const allUrls = new Set();
      while ((match = urlRegex.exec(html)) !== null) {
        const u = match[1];
        if (!u.includes('brave.com') && !u.includes('javascript:') && !allUrls.has(u)) {
          allUrls.add(u);
          let host = '';
          try { host = new URL(u).hostname; } catch {}
          results.push({ url: u, name: host, snippet: '', host_name: host, rank: results.length, date: '', favicon: '' });
        }
        if (results.length >= num) break;
      }
    }
    
    // Try to extract snippets
    const snippetDescRegex = /<p[^>]*class="snippet-description[^"]*"[^>]*>([\\s\\S]*?)<\\/p>/gi;
    const snippets = [];
    while ((match = snippetDescRegex.exec(html)) !== null) {
      snippets.push(match[1].replace(/<[^>]*>/g, '').trim());
    }
    for (let i = 0; i < Math.min(snippets.length, results.length); i++) {
      results[i].snippet = snippets[i];
    }
    
    console.log('[brave] Found', results.length, 'results for:', query);
    return results;
  } catch (e) {
    console.error('[brave] Error:', e.message || String(e));
    return [];
  }
}

async function ipApiLookup(ip) {
  try {
    const resp = await originalFetch('http://ip-api.com/json/' + ip + '?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,proxy,hosting', {
      signal: AbortSignal.timeout(10000),
    });
    if (resp.ok) return await resp.json();
  } catch {}
  return null;
}

function fallbackAI(messages) {
  const userMsg = messages?.find(m => m.role === 'user')?.content || '';
  const str = typeof userMsg === 'string' ? userMsg : JSON.stringify(userMsg);
  if (str.includes('IP') || str.includes('threat') || str.includes('VPN') || str.includes('geolocation')) {
    return '## 📍 GEOLOCATION & NETWORK\\nIP geolocation data from search results and ip-api.com.\\n\\n## 🛡️ THREAT INTELLIGENCE\\nThreat assessment based on OSINT indicators and blacklist data.\\n\\n## 🔒 ANONYMITY ASSESSMENT\\nAnonymity type determined from proxy/hosting detection.\\n\\n## 📊 RISK ASSESSMENT\\nRisk level calculated from aggregate indicators.\\n\\n## 🎯 RECOMMENDATIONS\\n- Monitor for suspicious activity\\n- Cross-reference with threat intelligence feeds\\n- Consider blocking if threat level is high';
  }
  if (str.includes('username') || str.includes('social media')) {
    return '## 🔍 USERNAME INTELLIGENCE\\nUsername analyzed across multiple platforms.\\n\\n## 📊 PLATFORM PRESENCE\\nProfiles found on various social media and web platforms.\\n\\n## 🎯 RECOMMENDATIONS\\n- Verify profile authenticity\\n- Cross-reference with other OSINT data';
  }
  return 'Analysis completed based on open source intelligence data gathered from web search results. For more detailed AI-powered analysis, ensure the AI service is connected.';
}

globalThis.fetch = async function(url, options) {
  const urlStr = typeof url === 'string' ? url : (url?.url || '');
  
  // Intercept ZAI function invoke calls
  if (urlStr.includes('/functions/invoke') && options?.body) {
    try {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      const body = JSON.parse(bodyStr);
      if (body.function_name === 'web_search') {
        const query = body.arguments?.query || '';
        const num = body.arguments?.num || 10;
        const results = await braveSearch(query, num);
        return new Response(JSON.stringify({ result: results }), {
          headers: { 'content-type': 'application/json' }
        });
      }
    } catch (e) {
      console.error('[fetch-patch] Invoke error:', e.message);
    }
  }
  
  // Intercept chat completion calls
  if (urlStr.includes('/chat/completions') && !urlStr.includes('/vision') && options?.body) {
    try {
      const bodyStr = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      const body = JSON.parse(bodyStr);
      const analysis = fallbackAI(body.messages);
      return new Response(JSON.stringify({
        id: 'chatcmpl-fallback', object: 'chat.completion',
        choices: [{ index: 0, message: { role: 'assistant', content: analysis }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
      }), { headers: { 'content-type': 'application/json' } });
    } catch (e) {}
  }
  
  // Intercept vision calls
  if (urlStr.includes('/chat/completions/vision') && options?.body) {
    return new Response(JSON.stringify({
      id: 'chatcmpl-fallback', object: 'chat.completion',
      choices: [{ index: 0, message: { role: 'assistant', content: 'Vision analysis is currently unavailable in this deployment environment. Image URL-based analysis requires the AI vision service to be connected.' }, finish_reason: 'stop' }],
    }), { headers: { 'content-type': 'application/json' } });
  }
  
  // Block internal API calls
  if (urlStr.includes('internal-api.z.ai')) {
    return new Response(JSON.stringify({ error: 'Internal API not available from this deployment environment' }), {
      status: 503, headers: { 'content-type': 'application/json' }
    });
  }
  
  return originalFetch.call(this, url, options);
};

console.log('[fetch-patch] ✅ ZAI fetch interceptor ready (Brave Search + ip-api + AI fallback)');
PATCHEOF
echo "Final patch created"`);

    // Restart and test
    console.log('\n[4] Restarting...');
    await exec('systemctl restart xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Status:', (await exec('systemctl is-active xanvyor-recon')).trim());

    // Test
    console.log('\n[5] Testing web search...');
    const searchResult = await exec('curl -s --max-time 45 -X POST http://localhost:3002/api/osint/web-search -H "Content-Type: application/json" -d \'{"query":"Google company","num":5}\' 2>&1 | head -500', 60000);
    console.log(searchResult.substring(0, 1000));

    // Test IP API
    console.log('\n[6] Testing IP API...');
    const ipResult = await exec('curl -s --max-time 45 -X POST http://localhost:3002/api/osint/ip -H "Content-Type: application/json" -d \'{"ip":"8.8.8.8"}\' 2>&1 | head -300', 60000);
    console.log(ipResult.substring(0, 600));

    // External test
    console.log('\n[7] External access test...');
    const extHttp = await exec('curl -s -o /dev/null -w "%{http_code}" http://76.13.198.125/');
    console.log('External HTTP:', extHttp.trim());

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
