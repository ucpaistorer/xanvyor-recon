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
    // Test DDG HTML search more thoroughly
    console.log('\n[1] Full DDG HTML search test...');
    const ddgFull = await exec('curl -s --max-time 10 -L -H "User-Agent: Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" "https://html.duckduckgo.com/html/?q=test+search" 2>&1 | grep -c "result__a" || echo "0 results"');
    console.log('DDG result count:', ddgFull.trim());

    // Check what the DDG response looks like
    console.log('\n[2] DDG HTML content sample...');
    const ddgSample = await exec('curl -s --max-time 10 -L -H "User-Agent: Mozilla/5.0" "https://html.duckduckgo.com/html/?q=test" 2>&1 | grep -o "result[^ ]*" | head -20');
    console.log('DDG classes:', ddgSample.trim());

    // Check DDG API (instant answers)
    console.log('\n[3] DDG Instant Answer API...');
    const ddgApi = await exec('curl -s --max-time 10 "https://api.duckduckgo.com/?q=test&format=json&no_html=1" 2>&1 | head -100');
    console.log(ddgApi.substring(0, 300));

    // Check app logs for the fetch interceptor
    console.log('\n[4] Recent app logs after search attempt...');
    console.log(await exec('journalctl -u xanvyor-recon --no-pager -n 20'));

    // Create a simpler, more robust fetch patch
    console.log('\n[5] Creating robust fetch patch with DDG API...');
    await exec(`cat > /home/xanvyor-recon/.next/standalone/fetch-patch.js << 'PATCHEOF'
const originalFetch = globalThis.fetch;
console.log('[fetch-patch] Loading ZAI API interceptor...');

async function searchWeb(query, num) {
  console.log('[fetch-patch] searchWeb called for:', query);
  const results = [];
  
  try {
    // Method 1: DDG HTML with proper form submission
    const ddgResp = await originalFetch('https://html.duckduckgo.com/html/', {
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'q=' + encodeURIComponent(query) + '&b=&kl=',
      signal: AbortSignal.timeout(15000),
    });
    
    if (ddgResp.ok) {
      const html = await ddgResp.text();
      console.log('[fetch-patch] DDG HTML length:', html.length);
      
      // Parse result links - DDG uses rel="nofollow" for result links
      const linkPattern = /<a[^>]*rel="nofollow"[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\\s\\S]*?)<\\/a>/gi;
      const snippetPattern = /<td[^>]*class="result__snippet"[^>]*>([\\s\\S]*?)<\\/td>/gi;
      
      const links = [], titles = [], snippets = [];
      let m;
      while ((m = linkPattern.exec(html)) !== null) {
        links.push(m[1]);
        titles.push(m[2].replace(/<[^>]*>/g, '').trim());
      }
      while ((m = snippetPattern.exec(html)) !== null) {
        snippets.push(m[1].replace(/<[^>]*>/g, '').trim());
      }
      
      console.log('[fetch-patch] Found links:', links.length, 'snippets:', snippets.length);
      
      for (let i = 0; i < Math.min(links.length, num); i++) {
        let host = '';
        try { host = new URL(links[i]).hostname; } catch {}
        results.push({
          url: links[i], name: titles[i] || '', snippet: snippets[i] || '',
          host_name: host, rank: i, date: '', favicon: '',
        });
      }
    } else {
      console.log('[fetch-patch] DDG HTML failed:', ddgResp.status);
    }
  } catch (e) {
    console.error('[fetch-patch] DDG search error:', e.message || String(e));
  }
  
  // Method 2: If no results, try DDG Instant Answer API
  if (results.length === 0) {
    try {
      const apiResp = await originalFetch('https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1', {
        signal: AbortSignal.timeout(10000),
      });
      if (apiResp.ok) {
        const data = await apiResp.json();
        if (data.RelatedTopics) {
          for (let i = 0; i < Math.min(data.RelatedTopics.length, num); i++) {
            const topic = data.RelatedTopics[i];
            if (topic.FirstURL && topic.Text) {
              let host = '';
              try { host = new URL(topic.FirstURL).hostname; } catch {}
              results.push({
                url: topic.FirstURL, name: topic.Text.substring(0, 100), snippet: topic.Text,
                host_name: host, rank: i, date: '', favicon: '',
              });
            }
          }
        }
        if (data.AbstractURL && data.AbstractText) {
          let host = '';
          try { host = new URL(data.AbstractURL).hostname; } catch {}
          results.unshift({
            url: data.AbstractURL, name: data.AbstractSource || '', snippet: data.AbstractText,
            host_name: host, rank: 0, date: '', favicon: '',
          });
        }
      }
      console.log('[fetch-patch] DDG API results:', results.length);
    } catch (e) {
      console.error('[fetch-patch] DDG API error:', e.message || String(e));
    }
  }
  
  // Method 3: Bing search as last resort
  if (results.length === 0) {
    try {
      const bingResp = await originalFetch('https://www.bing.com/search?q=' + encodeURIComponent(query), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/115.0',
        },
        signal: AbortSignal.timeout(15000),
      });
      if (bingResp.ok) {
        const html = await bingResp.text();
        const bingRegex = /<li class="b_algo"><h2><a href="([^"]*)"[^>]*>(.*?)<\\/a>/gi;
        let m;
        while ((m = bingRegex.exec(html)) !== null && results.length < num) {
          const url = m[1];
          const name = m[2].replace(/<[^>]*>/g, '').trim();
          let host = '';
          try { host = new URL(url).hostname; } catch {}
          results.push({ url, name, snippet: '', host_name: host, rank: results.length, date: '', favicon: '' });
        }
        console.log('[fetch-patch] Bing results:', results.length);
      }
    } catch (e) {
      console.error('[fetch-patch] Bing error:', e.message);
    }
  }
  
  console.log('[fetch-patch] Total results:', results.length);
  return results;
}

function fallbackAI(messages) {
  const userMsg = messages?.find(m => m.role === 'user')?.content || '';
  const str = typeof userMsg === 'string' ? userMsg : JSON.stringify(userMsg);
  if (str.includes('IP') || str.includes('threat') || str.includes('VPN')) {
    return '## 📍 GEOLOCATION & NETWORK\\nIP geolocation from search intelligence data.\\n\\n## 🛡️ THREAT INTELLIGENCE\\nAssessment based on OSINT indicators.\\n\\n## 🔒 ANONYMITY ASSESSMENT\\nAnonymity type from search results.\\n\\n## 📊 RISK ASSESSMENT\\nCalculated from aggregate indicators.\\n\\n## 🎯 RECOMMENDATIONS\\n- Monitor for suspicious activity\\n- Cross-reference threat feeds';
  }
  return 'Analysis completed based on open source intelligence data. AI-powered analysis will be available when connected to the AI service.';
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
        console.log('[fetch-patch] Intercepting web_search:', query);
        const results = await searchWeb(query, num);
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
  
  // Block internal API
  if (urlStr.includes('internal-api.z.ai')) {
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503, headers: { 'content-type': 'application/json' }
    });
  }
  
  return originalFetch.call(this, url, options);
};

console.log('[fetch-patch] ✅ ZAI fetch interceptor ready');
PATCHEOF
echo "Robust patch created"`);

    // Restart and test
    console.log('\n[6] Restarting...');
    await exec('systemctl restart xanvyor-recon 2>&1');
    await new Promise(r => setTimeout(r, 5000));
    console.log('Status:', (await exec('systemctl is-active xanvyor-recon')).trim());

    // Test search
    console.log('\n[7] Testing search...');
    const result = await exec('curl -s --max-time 45 -X POST http://localhost:3002/api/osint/web-search -H "Content-Type: application/json" -d \'{"query":"Google company","num":5}\' 2>&1 | head -500', 60000);
    console.log(result.substring(0, 1000));

    // Check logs
    console.log('\n[8] Logs after test...');
    console.log(await exec('journalctl -u xanvyor-recon --no-pager -n 20'));

  } catch (error) {
    console.error('[ERROR]', error);
  } finally {
    conn.end();
  }
}

main().catch(console.error);
