import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Domain structure analysis
    const domainAnalysis = analyzeDomain(domain);

    // Sequential searches for comprehensive domain OSINT
    const whoisSearch = await safeWebSearch(`${domain} WHOIS registration domain info owner subdomains`, 5);
    const techSearch = await safeWebSearch(`${domain} technology stack SSL certificate security TLS HTTPS`, 5);
    const reputationSearch = await safeWebSearch(`${domain} reputation malware phishing scam blacklist`, 5);

    // Combine all results for analysis
    const allResults = [
      ...(whoisSearch as Array<Record<string, string>>),
      ...(techSearch as Array<Record<string, string>>),
      ...(reputationSearch as Array<Record<string, string>>),
    ];
    const allText = allResults.map((r: Record<string, string>) => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase()).join(' ');

    // Subdomain extraction from search results
    const subdomainPatterns = allResults
      .filter((r: Record<string, string>) => {
        const url = r.url ?? '';
        const snippet = r.snippet ?? '';
        return url.includes(domain) || snippet.includes(domain);
      })
      .map((r: Record<string, string>) => {
        const url = r.url ?? '';
        const match = url.match(new RegExp(`([a-zA-Z0-9][-a-zA-Z0-9]*\\.)+${domain.replace(/\./g, '\\.')}`, 'i'));
        return match ? match[0] : null;
      })
      .filter((sub): sub is string => sub !== null && sub !== domain);

    const uniqueSubdomains = [...new Set(subdomainPatterns)];

    // Technology detection hints
    const techKeywords: Record<string, string[]> = {
      'WordPress': ['wordpress', 'wp-content', 'wp-includes', 'wp-admin'],
      'React': ['react', 'reactjs', 'next.js', 'nextjs'],
      'Vue.js': ['vue', 'vuejs', 'nuxt'],
      'Angular': ['angular', 'angularjs'],
      'Cloudflare': ['cloudflare', 'cf-ray'],
      'Nginx': ['nginx'],
      'Apache': ['apache', 'httpd'],
      'Node.js': ['node.js', 'nodejs', 'express'],
      'Python/Django': ['django', 'python'],
      'PHP': ['php'],
      'Shopify': ['shopify'],
      'Wix': ['wix'],
      'Squarespace': ['squarespace'],
      'AWS': ['amazonaws', 'aws', 'cloudfront'],
      'Google Cloud': ['google cloud', 'gcp', 'googleapis'],
      'Azure': ['azure', 'microsoft azure'],
    };

    const detectedTech = Object.entries(techKeywords)
      .filter(([, keywords]) => keywords.some(k => allText.includes(k)))
      .map(([tech]) => tech);

    // Reputation assessment
    const badKeywords = ['malware', 'phishing', 'scam', 'fraudulent', 'blacklist', 'spam', 'malicious', 'suspicious'];
    const goodKeywords = ['safe', 'legitimate', 'trusted', 'verified', 'secure'];
    const hasBadRep = badKeywords.some(k => allText.includes(k));
    const hasGoodRep = goodKeywords.some(k => allText.includes(k));
    const reputation: 'safe' | 'suspicious' | 'dangerous' | 'unknown' = hasBadRep ? 'dangerous' : hasGoodRep ? 'safe' : 'unknown';

    // SSL/TLS assessment
    const sslKeywords = ['ssl', 'tls', 'certificate', 'https', 'let\'s encrypt', 'comodo', 'digicert', 'globalsign'];
    const sslDetected = sslKeywords.some(k => allText.includes(k));
    const letsEncrypt = allText.includes("let's encrypt") || allText.includes('letsencrypt');
    const selfSigned = allText.includes('self-signed');

    // AI analysis
    const allContext = [
      ...(whoisSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[WHOIS] ${r.name}: ${r.snippet}`),
      ...(techSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[TECH/SSL] ${r.name}: ${r.snippet}`),
      ...(reputationSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[REPUTATION] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for domain intelligence. Report with: ## 🌐 DOMAIN OVERVIEW ## 🏗️ INFRASTRUCTURE ANALYSIS ## 🔒 SECURITY POSTURE ## 🔍 SUBDOMAIN ENUMERATION ## 🛡️ REPUTATION ASSESSMENT ## 💻 TECHNOLOGY FINGERPRINT ## 📊 RISK ASSESSMENT ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `Domain: ${domain} | TLD: ${domainAnalysis.tld} | Type: ${domainAnalysis.type} | Rep: ${reputation} | Tech: ${detectedTech.join(', ') || 'none'} | Subdomains: ${uniqueSubdomains.length} | SSL: ${sslDetected ? 'yes' : 'unknown'}

${allContext.substring(0, 1500)}`
        )
      : 'No domain intelligence data available.';

    return NextResponse.json({
      success: true,
      domain,
      analysis: domainAnalysis,
      reputation,
      sslInfo: {
        detected: sslDetected,
        letsEncrypt,
        selfSigned,
      },
      detectedTech,
      discoveredSubdomains: uniqueSubdomains,
      whoisResults: (whoisSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        date: r.date || '',
      })),
      subdomainResults: (whoisSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      sslResults: (techSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      techResults: (techSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      reputationResults: (reputationSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function analyzeDomain(domain: string): { domain: string; tld: string; type: string; hasWww: boolean } {
  const parts = domain.split('.');
  const tld = parts.length > 1 ? parts[parts.length - 1] : '';
  const hasWww = domain.startsWith('www.');

  let type = 'Generic';
  const ccTLDs: Record<string, string> = {
    'id': 'Indonesia', 'my': 'Malaysia', 'sg': 'Singapore', 'th': 'Thailand',
    'ph': 'Philippines', 'vn': 'Vietnam', 'jp': 'Japan', 'kr': 'South Korea',
    'cn': 'China', 'in': 'India', 'au': 'Australia', 'uk': 'United Kingdom',
    'de': 'Germany', 'fr': 'France', 'br': 'Brazil', 'ru': 'Russia',
  };
  const sTLDs: Record<string, string> = {
    'edu': 'Educational', 'gov': 'Government', 'mil': 'Military',
    'org': 'Organization', 'int': 'International', 'museum': 'Museum',
  };

  if (ccTLDs[tld]) type = `Country Code (${ccTLDs[tld]})`;
  else if (sTLDs[tld]) type = sTLDs[tld];

  return { domain, tld, type, hasWww };
}
