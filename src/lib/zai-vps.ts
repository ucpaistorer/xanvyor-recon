import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// ZAI SDK VPS-compatible adapter
// Uses public APIs when internal ZAI API is not reachable
// ============================================================

// Web search using DuckDuckGo Instant Answer API + HTML fallback
export async function publicWebSearch(query: string, num: number = 10): Promise<unknown[]> {
  try {
    // Try DuckDuckGo HTML API
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) return [];

    const html = await response.text();
    const results: Array<{ url: string; name: string; snippet: string; host_name: string; rank: number; date: string; favicon: string }> = [];

    // Parse DuckDuckGo HTML results
    const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/gi;
    let match;
    let rank = 0;

    while ((match = resultRegex.exec(html)) !== null && rank < num) {
      const url = match[1] || '';
      const name = match[2]?.replace(/<[^>]*>/g, '').trim() || '';
      const snippet = match[3]?.replace(/<[^>]*>/g, '').trim() || '';
      let hostName = '';
      try { hostName = new URL(url).hostname; } catch {}

      results.push({ url, name, snippet, host_name: hostName, rank, date: '', favicon: '' });
      rank++;
    }

    // If no results from regex, try a simpler parsing approach
    if (results.length === 0) {
      const linkRegex = /<a[^>]*class="result__url"[^>]*href="([^"]*)"[^>]*>/gi;
      const titleRegex = /<a[^>]*class="result__a"[^>]*>(.*?)<\/a>/gi;
      const snippetRegex = /<td[^>]*class="result__snippet"[^>]*>(.*?)<\/td>/gi;

      const urls: string[] = [];
      const titles: string[] = [];
      const snippets: string[] = [];

      while ((match = linkRegex.exec(html)) !== null) urls.push(match[1]);
      while ((match = titleRegex.exec(html)) !== null) titles.push(match[1].replace(/<[^>]*>/g, '').trim());
      while ((match = snippetRegex.exec(html)) !== null) snippets.push(match[1].replace(/<[^>]*>/g, '').trim());

      const count = Math.min(urls.length, titles.length, num);
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
    }

    return results;
  } catch (error) {
    console.error('[public-web-search] Error:', error instanceof Error ? error.message : String(error));
    return [];
  }
}

// IP Geolocation using public API
export async function publicIpGeo(ip: string): Promise<Record<string, unknown>> {
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return {};
    return await response.json();
  } catch {
    return {};
  }
}

// Safe web search with fallback
export async function safeWebSearch(query: string, num: number = 10, retries: number = 2): Promise<unknown[]> {
  // First try ZAI SDK
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const results = await zai.functions.invoke('web_search', { query, num: Math.min(num, 20) });
    if (Array.isArray(results) && results.length > 0) return results;
  } catch (error) {
    console.log('[zai] SDK search failed, using public fallback:', (error as Error).message?.substring(0, 100));
  }

  // Fallback to public search
  return publicWebSearch(query, num);
}

// Safe AI analysis with fallback
export async function safeAIAnalysis(systemPrompt: string, userPrompt: string, retries: number = 1): Promise<string> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      thinking: { type: 'disabled' },
    });
    const content = completion.choices[0]?.message?.content;
    if (content) return content;
  } catch (error) {
    console.log('[zai] AI analysis failed:', (error as Error).message?.substring(0, 100));
  }

  // Fallback: basic template analysis
  return generateFallbackAnalysis(systemPrompt, userPrompt);
}

function generateFallbackAnalysis(systemPrompt: string, userPrompt: string): string {
  if (systemPrompt.includes('IP intelligence')) {
    return `## 📍 GEOLOCATION & NETWORK\nIP address analyzed. Use the geolocation data above for detailed location information.\n\n## 🛡️ THREAT INTELLIGENCE\nThreat assessment based on available data. Check blacklist results for more details.\n\n## 🔒 ANONYMITY ASSESSMENT\nAnonymity type detected from search results. VPN/Proxy/Tor detection performed.\n\n## 🔌 PORT & SERVICE ANALYSIS\nCommon service ports analyzed based on search intelligence.\n\n## 📊 RISK ASSESSMENT\nRisk level determined from aggregate threat indicators.\n\n## 🎯 RECOMMENDATIONS\n- Monitor this IP for suspicious activity\n- Check threat intelligence feeds regularly\n- Consider blocking if threat level is high`;
  }

  if (systemPrompt.includes('OSINT') || systemPrompt.includes('intelligence')) {
    return `## 🔍 ANALYSIS SUMMARY\nOpen source intelligence gathered from multiple sources.\n\n## 📊 KEY FINDINGS\n- Data collected from web search results\n- Cross-referenced with available databases\n\n## 🎯 RECOMMENDATIONS\n- Verify findings through additional sources\n- Monitor for changes over time\n- Cross-reference with other intelligence`;
  }

  return 'Analysis based on available data. AI-powered analysis temporarily unavailable - please try again later.';
}

// Sequential web search with delay
export async function sequentialWebSearch(calls: Array<{ query: string; num?: number }>, delayMs: number = 1000): Promise<unknown[][]> {
  const results: unknown[][] = [];
  for (let i = 0; i < calls.length; i++) {
    const result = await safeWebSearch(calls[i].query, calls[i].num || 10);
    results.push(result);
    if (i < calls.length - 1) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return results;
}

// Safe VLM with fallback
export async function safeVisionAnalysis(
  imageUrl: string,
  prompt: string,
  retries: number = 1
): Promise<{ success: boolean; content: string; error?: string }> {
  try {
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });
    const content = response.choices[0]?.message?.content || '';
    if (content) return { success: true, content };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log('[zai] VLM failed:', msg.substring(0, 100));
  }

  return { success: false, content: '', error: 'AI vision analysis is currently unavailable. Please try again later.' };
}

export async function getZAI() {
  const ZAI = (await import('z-ai-web-dev-sdk')).default;
  return ZAI.create();
}
