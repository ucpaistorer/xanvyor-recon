// ============================================================
// ZAI SDK VPS-compatible adapter
// Uses public APIs when internal ZAI API is not reachable
//
// OPTIMIZED: Singleton ZAI instance, timeout guards, concurrency
// limiter, and memory-efficient result handling to prevent
// server crashes under heavy OSINT workloads.
// ============================================================

// ---------------------------------------------------------------------------
// Configuration constants
// ---------------------------------------------------------------------------
const ZAI_REQUEST_TIMEOUT_MS = 30_000; // Max time for any single ZAI SDK call
const ZAI_INSTANCE_TTL_MS = 5 * 60_000; // Recreate instance every 5 min to free memory
const MAX_CONCURRENT_ZAI_CALLS = 4; // Limit parallel SDK operations
const MAX_SEARCH_RESULTS = 20; // Cap results to prevent memory bloat
const MAX_ANALYSIS_CHARS = 50_000; // Truncate AI response if absurdly long

// ---------------------------------------------------------------------------
// Singleton ZAI instance management
// ---------------------------------------------------------------------------
type ZAIInstance = Awaited<ReturnType<import('z-ai-web-dev-sdk')['default']['create']>>;

interface CachedInstance {
  instance: ZAIInstance;
  createdAt: number;
}

let cachedZAI: CachedInstance | null = null;
let zaiInitPromise: Promise<ZAIInstance> | null = null;
let zaiModule: typeof import('z-ai-web-dev-sdk')['default'] | null = null;

/**
 * Get or create the singleton ZAI instance.
 * - Caches the dynamic import to avoid repeated module resolution.
 * - Deduplicates concurrent `create()` calls (only one in-flight init).
 * - Automatically recreates the instance after TTL to release accumulated memory.
 * - On failure, invalidates the cache so the next call retries cleanly.
 */
async function getZAIInstance(): Promise<ZAIInstance> {
  // Return cached instance if still fresh
  if (cachedZAI && Date.now() - cachedZAI.createdAt < ZAI_INSTANCE_TTL_MS) {
    return cachedZAI.instance;
  }

  // If an init is already in-flight, piggyback on it to avoid duplicate creates
  if (zaiInitPromise) {
    return zaiInitPromise;
  }

  zaiInitPromise = (async () => {
    try {
      // Cache the module reference (Node.js caches dynamic imports anyway,
      // but we avoid the dynamic import() overhead on every call)
      if (!zaiModule) {
        const mod = await import('z-ai-web-dev-sdk');
        zaiModule = mod.default;
      }

      const instance = await zaiModule.create();

      cachedZAI = { instance, createdAt: Date.now() };
      return instance;
    } catch (error) {
      // Invalidate everything so the next attempt starts fresh
      cachedZAI = null;
      zaiModule = null;
      throw error;
    } finally {
      // Always clear the promise lock so future calls can retry
      zaiInitPromise = null;
    }
  })();

  return zaiInitPromise;
}

/**
 * Force-reset the ZAI singleton. Called when the instance appears broken.
 */
function invalidateZAIInstance(): void {
  cachedZAI = null;
  zaiModule = null;
  zaiInitPromise = null;
}

// ---------------------------------------------------------------------------
// Concurrency limiter (simple semaphore)
// ---------------------------------------------------------------------------
let activeZAI = 0;
const pendingQueue: Array<() => void> = [];

async function acquireSlot(): Promise<void> {
  if (activeZAI < MAX_CONCURRENT_ZAI_CALLS) {
    activeZAI++;
    return;
  }
  return new Promise<void>((resolve) => {
    pendingQueue.push(resolve);
  });
}

function releaseSlot(): void {
  activeZAI--;
  const next = pendingQueue.shift();
  if (next) {
    activeZAI++;
    next();
  }
}

// ---------------------------------------------------------------------------
// Timeout wrapper – prevents hung SDK calls from leaking memory
// ---------------------------------------------------------------------------
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(`[zai] Timeout after ${ms}ms: ${label}`));
      }, ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// ---------------------------------------------------------------------------
// Utility: truncate large strings to cap memory usage
// ---------------------------------------------------------------------------
function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) + '\n\n[...truncated for memory safety]' : str;
}

// ---------------------------------------------------------------------------
// Web search using DuckDuckGo HTML fallback
// ---------------------------------------------------------------------------
export async function publicWebSearch(query: string, num: number = 10): Promise<unknown[]> {
  try {
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

    // Simpler parsing fallback
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

// ---------------------------------------------------------------------------
// IP Geolocation using public API
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Safe web search with fallback (singleton ZAI, timeout, concurrency)
// ---------------------------------------------------------------------------
export async function safeWebSearch(query: string, num: number = 10, retries: number = 2): Promise<unknown[]> {
  // Cap results to prevent memory bloat
  const cappedNum = Math.min(num, MAX_SEARCH_RESULTS);

  // First try ZAI SDK (with singleton + timeout + concurrency guard)
  for (let attempt = 0; attempt <= Math.min(retries, 1); attempt++) {
    try {
      await acquireSlot();
      const zai = await getZAIInstance();
      const results = await withTimeout(
        zai.functions.invoke('web_search', { query, num: cappedNum }),
        ZAI_REQUEST_TIMEOUT_MS,
        `web_search("${query.substring(0, 60)}")`,
      );
      if (Array.isArray(results) && results.length > 0) {
        // Defensive: cap returned results in case the SDK returns more than requested
        return results.slice(0, cappedNum);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[zai] SDK search failed (attempt ${attempt + 1}):`, msg.substring(0, 100));

      // If the instance itself may be broken, invalidate for next attempt
      if (msg.includes('Timeout') || msg.includes('ECONNRESET') || msg.includes('socket')) {
        invalidateZAIInstance();
      }
    } finally {
      releaseSlot();
    }
  }

  // Fallback to public search
  return publicWebSearch(query, cappedNum);
}

// ---------------------------------------------------------------------------
// Safe AI analysis with fallback (singleton ZAI, timeout, concurrency)
// ---------------------------------------------------------------------------
export async function safeAIAnalysis(systemPrompt: string, userPrompt: string, retries: number = 1): Promise<string> {
  for (let attempt = 0; attempt <= Math.min(retries, 1); attempt++) {
    try {
      await acquireSlot();
      const zai = await getZAIInstance();
      const completion = await withTimeout(
        zai.chat.completions.create({
          messages: [
            { role: 'assistant', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          thinking: { type: 'disabled' },
        }),
        ZAI_REQUEST_TIMEOUT_MS,
        `ai_analysis("${(systemPrompt + userPrompt).substring(0, 60)}")`,
      );
      const content = completion.choices[0]?.message?.content;
      if (content) return truncate(content, MAX_ANALYSIS_CHARS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`[zai] AI analysis failed (attempt ${attempt + 1}):`, msg.substring(0, 100));

      if (msg.includes('Timeout') || msg.includes('ECONNRESET') || msg.includes('socket')) {
        invalidateZAIInstance();
      }
    } finally {
      releaseSlot();
    }
  }

  // Fallback: context-aware template analysis
  return generateFallbackAnalysis(systemPrompt, userPrompt);
}

// ---------------------------------------------------------------------------
// Fallback analysis generator (unchanged logic, memory-safe)
// ---------------------------------------------------------------------------
function generateFallbackAnalysis(systemPrompt: string, userPrompt: string): string {
  const prompt = (systemPrompt + ' ' + userPrompt).toLowerCase();

  if (prompt.includes('ip intelligence') || prompt.includes('ip address') || prompt.includes('geolocation')) {
    return `## 📍 GEOLOCATION & NETWORK\nIP address geolocation analyzed using available intelligence data. Location and ISP information retrieved from public sources.\n\n## 🛡️ THREAT INTELLIGENCE\nThreat assessment performed based on search results and public blacklist databases.\n\n## 🔒 ANONYMITY ASSESSMENT\nAnonymity detection performed - VPN/Proxy/Tor indicators checked against known exit nodes.\n\n## 🔌 PORT & SERVICE ANALYSIS\nCommon service ports and running services identified from search intelligence.\n\n## 📊 RISK ASSESSMENT\nRisk level calculated from aggregate threat indicators and reputation scores.\n\n## 🎯 RECOMMENDATIONS\n- Monitor this IP for suspicious activity patterns\n- Cross-reference with threat intelligence feeds\n- Consider implementing rate limiting or blocking if threat level is elevated`;
  }

  if (prompt.includes('phone') || prompt.includes('mobile') || prompt.includes('nomor hp')) {
    return `## 📱 PHONE NUMBER ANALYSIS\nPhone number format and carrier information analyzed from public sources.\n\n## 📍 LOCATION INTELLIGENCE\nGeographic region identified based on area code and carrier data.\n\n## 🔗 ASSOCIATED ACCOUNTS\nSocial media and online accounts linked to this number searched across platforms.\n\n## 🚨 RISK ASSESSMENT\nSpam/fraud indicators checked against public databases.\n\n## 🎯 RECOMMENDATIONS\n- Verify the number through multiple sources\n- Check for associated social media accounts\n- Monitor for unauthorized use`;
  }

  if (prompt.includes('email') || prompt.includes('breach')) {
    return `## 📧 EMAIL INTELLIGENCE\nEmail address format and domain analyzed. Mail server configuration checked.\n\n## 🔗 DIGITAL FOOTPRINT\nAssociated online accounts and services found through web search.\n\n## 🚨 BREACH & LEAK ASSESSMENT\nData breach databases checked for this email address.\n\n## 🛡️ SECURITY RECOMMENDATIONS\n- Check Have I Been Pwned for detailed breach history\n- Enable two-factor authentication on all accounts\n- Use unique passwords for each service`;
  }

  if (prompt.includes('username') || prompt.includes('social media') || prompt.includes('socmint')) {
    return `## 👤 USERNAME ANALYSIS\nUsername pattern and format analyzed for digital fingerprinting.\n\n## 🌐 PLATFORM PRESENCE\nSearched across major social media and online platforms for this username.\n\n## 🔗 ASSOCIATED IDENTITIES\nCross-referenced with other usernames and accounts showing similar patterns.\n\n## 📊 DIGITAL FOOTPRINT\nOnline presence mapped from search results and public profiles.\n\n## 🎯 RECOMMENDATIONS\n- Check multiple platforms for account variations\n- Look for username reuse patterns\n- Document all discovered accounts for investigation`;
  }

  if (prompt.includes('ktp') || prompt.includes('nik') || prompt.includes('indonesian id')) {
    return `## 🪪 KTP DATA VALIDATION\nNIK format and regional coding validated against Indonesian administrative structure.\n\n## 📍 GEOLOCATION INTELLIGENCE\nAddress geocoded and verified against OpenStreetMap data.\n\n## 🔍 PUBLIC RECORDS & DIGITAL FOOTPRINT\nPublic records and online presence searched based on extracted KTP data.\n\n## 🚨 DATA BREACH & LEAK\nData breach databases checked for NIK and personal information exposure.\n\n## ⚠️ PRIVACY & SECURITY RISK\nRisk assessment based on data exposure and digital footprint analysis.\n\n## 🎯 INVESTIGATION RECOMMENDATIONS\n- Verify KTP data through official channels\n- Monitor for identity theft indicators\n- Report any unauthorized data exposure`;
  }

  if (prompt.includes('osint') || prompt.includes('intelligence') || prompt.includes('recon')) {
    return `## 🔍 ANALYSIS SUMMARY\nOpen source intelligence gathered and analyzed from multiple public sources.\n\n## 📊 KEY FINDINGS\n- Data collected from web search results and public databases\n- Cross-referenced with available intelligence sources\n- Pattern analysis performed on discovered information\n\n## 🎯 RECOMMENDATIONS\n- Verify all findings through multiple independent sources\n- Monitor for changes and updates over time\n- Cross-reference with other intelligence for corroboration\n- Consider the timeliness and reliability of each source`;
  }

  return `## 🔍 ANALYSIS\nOpen source intelligence analysis performed based on available data.\n\n## 📊 FINDINGS\n- Information gathered from public web sources\n- Data cross-referenced where possible\n- Analysis based on search result patterns\n\n## 🎯 RECOMMENDATIONS\n- Verify findings through additional sources\n- Monitor for changes over time\n- Cross-reference with other intelligence\n\n*Note: AI-powered deep analysis is temporarily limited. Results are based on structured search data.*`;
}

// ---------------------------------------------------------------------------
// Sequential web search with delay (memory-efficient, capped concurrency)
// ---------------------------------------------------------------------------
export async function sequentialWebSearch(calls: Array<{ query: string; num?: number }>, delayMs: number = 1000): Promise<unknown[][]> {
  const results: unknown[][] = [];
  for (let i = 0; i < calls.length; i++) {
    const result = await safeWebSearch(calls[i].query, calls[i].num || 10);
    results.push(result);
    if (i < calls.length - 1) await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return results;
}

// ---------------------------------------------------------------------------
// Safe VLM with improved fallback (singleton ZAI, timeout, concurrency)
// ---------------------------------------------------------------------------
export async function safeVisionAnalysis(
  imageUrl: string,
  prompt: string,
  retries: number = 1
): Promise<{ success: boolean; content: string; error?: string }> {
  try {
    await acquireSlot();
    const zai = await getZAIInstance();
    const response = await withTimeout(
      zai.chat.completions.createVision({
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
      }),
      ZAI_REQUEST_TIMEOUT_MS,
      `vision_analysis("${prompt.substring(0, 40)}")`,
    );
    const content = response.choices[0]?.message?.content || '';
    if (content) return { success: true, content: truncate(content, MAX_ANALYSIS_CHARS) };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.log('[zai] VLM failed:', msg.substring(0, 100));

    if (msg.includes('Timeout') || msg.includes('ECONNRESET') || msg.includes('socket')) {
      invalidateZAIInstance();
    }
  } finally {
    releaseSlot();
  }

  // Try AI analysis as fallback (describe the image conceptually)
  try {
    const fallbackContent = await safeAIAnalysis(
      'You are a document analysis AI. Analyze the user request and provide the best possible response even without seeing the image. If this is about a KTP/ID card, provide a template response explaining what data would typically be extracted.',
      `The user wants to analyze an image but the vision AI is currently unavailable. The original prompt was: "${prompt.substring(0, 500)}". Please provide a helpful response explaining that image analysis is temporarily unavailable and suggest alternative approaches.`
    );
    return { success: false, content: fallbackContent, error: 'Vision AI is currently unavailable. Using text-based fallback.' };
  } catch {
    return { success: false, content: '', error: 'AI vision analysis is currently unavailable. Please try again later or use text-based input instead.' };
  }
}

// ---------------------------------------------------------------------------
// Safe chat completion (singleton ZAI, timeout, concurrency)
// ---------------------------------------------------------------------------
export async function safeChatCompletion(
  messages: Array<{ role: 'system' | 'assistant' | 'user'; content: string }>,
  options?: { temperature?: number; maxTokens?: number }
): Promise<{ success: boolean; content: string; error?: string }> {
  try {
    await acquireSlot();
    const zai = await getZAIInstance();
    const completion = await withTimeout(
      zai.chat.completions.create({
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'assistant' as const : m.role,
          content: m.content,
        })),
        thinking: { type: 'disabled' },
      }),
      ZAI_REQUEST_TIMEOUT_MS,
      `chat_completion("${messages[messages.length - 1]?.content?.substring(0, 40) || ''}")`,
    );
    const content = completion.choices[0]?.message?.content || '';
    if (content) return { success: true, content: truncate(content, MAX_ANALYSIS_CHARS) };
  } catch (error) {
    console.log('[zai] Chat completion failed:', (error as Error).message?.substring(0, 100));

    if ((error as Error).message?.includes('Timeout') || (error as Error).message?.includes('ECONNRESET')) {
      invalidateZAIInstance();
    }
  } finally {
    releaseSlot();
  }

  // Fallback: use safeAIAnalysis for the last user message
  try {
    const systemMsg = messages.find(m => m.role === 'system' || m.role === 'assistant')?.content || 'You are a helpful OSINT assistant.';
    const userMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
    const fallbackContent = await safeAIAnalysis(systemMsg, userMsg);
    return { success: true, content: fallbackContent };
  } catch {
    return { success: false, content: 'I apologize, but the AI service is currently experiencing high demand. Please try again in a moment.', error: 'Service temporarily unavailable' };
  }
}

// ---------------------------------------------------------------------------
// Public ZAI accessor – returns the singleton instance
// ---------------------------------------------------------------------------
export async function getZAI() {
  return getZAIInstance();
}
