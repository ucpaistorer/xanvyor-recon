import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Sequential searches for comprehensive DNS OSINT
    const dnsSearch = await safeWebSearch(`${domain} DNS records A AAAA MX NS lookup nameserver`, 5);
    const txtSearch = await safeWebSearch(`${domain} TXT record SPF DKIM DMARC DNS email security DNSSEC`, 5);
    const cnameSearch = await safeWebSearch(`${domain} CNAME record alias mail server hosting provider`, 5);

    // Combine all results
    const allResults = [
      ...(dnsSearch as Array<Record<string, string>>),
      ...(txtSearch as Array<Record<string, string>>),
      ...(cnameSearch as Array<Record<string, string>>),
    ];
    const allText = allResults.map((r: Record<string, string>) => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase()).join(' ');

    // DNSSEC detection
    const dnssecKeywords = ['dnssec', 'ds record', 'dns security', 'signed', 'validated', 'ksk', 'zsk', 'key-signing'];
    const dnssecDetected = dnssecKeywords.some(k => allText.includes(k));

    // SPF/DKIM/DMARC assessment from search results
    const spfDetected = allText.includes('spf') || allText.includes('sender policy framework');
    const dkimDetected = allText.includes('dkim') || allText.includes('domainkeys');
    const dmarcDetected = allText.includes('dmarc');

    const emailSecurityScore = [spfDetected, dkimDetected, dmarcDetected].filter(Boolean).length;
    let emailSecurityLevel: 'none' | 'poor' | 'partial' | 'good' = 'none';
    if (emailSecurityScore === 3) emailSecurityLevel = 'good';
    else if (emailSecurityScore === 2) emailSecurityLevel = 'partial';
    else if (emailSecurityScore === 1) emailSecurityLevel = 'poor';

    // Extract name server information
    const nsHints = (dnsSearch as Array<Record<string, string>>)
      .filter((r: Record<string, string>) => r.snippet && (r.snippet.toLowerCase().includes('ns') || r.snippet.toLowerCase().includes('nameserver')))
      .map((r: Record<string, string>) => ({
        title: r.name,
        snippet: r.snippet?.substring(0, 150),
        url: r.url,
      }));

    // Extract mail server information
    const mxHints = (dnsSearch as Array<Record<string, string>>)
      .filter((r: Record<string, string>) => r.snippet && (r.snippet.toLowerCase().includes('mx') || r.snippet.toLowerCase().includes('mail')))
      .map((r: Record<string, string>) => ({
        title: r.name,
        snippet: r.snippet?.substring(0, 150),
        url: r.url,
      }));

    // Cloudflare/CDN detection
    const usesCloudflare = allText.includes('cloudflare');
    const usesAwsDns = allText.includes('route53') || allText.includes('aws dns');
    const usesGoogleDns = allText.includes('google dns') || allText.includes('googledomains');

    let dnsProvider = 'Unknown';
    if (usesCloudflare) dnsProvider = 'Cloudflare';
    else if (usesAwsDns) dnsProvider = 'AWS Route 53';
    else if (usesGoogleDns) dnsProvider = 'Google Domains';

    // AI analysis
    const allContext = [
      ...(dnsSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[DNS] ${r.name}: ${r.snippet}`),
      ...(txtSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[TXT/SPF] ${r.name}: ${r.snippet}`),
      ...(cnameSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[CNAME] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for DNS reconnaissance. Report with: ## 🌐 DNS RECORD ANALYSIS ## 📧 EMAIL SECURITY POSTURE ## 🏗️ NAMESERVER & HOSTING ## 🔐 DNSSEC ASSESSMENT ## 🔍 INFRASTRUCTURE MAPPING ## 📊 SECURITY ASSESSMENT ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `Domain: ${domain} | DNSSEC: ${dnssecDetected ? 'yes' : 'no'} | SPF: ${spfDetected} | DKIM: ${dkimDetected} | DMARC: ${dmarcDetected} (${emailSecurityLevel}) | Provider: ${dnsProvider}

${allContext.substring(0, 1500)}`
        )
      : 'No DNS intelligence data available for this domain.';

    return NextResponse.json({
      success: true,
      domain,
      dnssec: {
        detected: dnssecDetected,
        details: dnssecDetected ? 'DNSSEC signatures found in search results' : 'No DNSSEC evidence found',
      },
      emailSecurity: {
        spf: spfDetected,
        dkim: dkimDetected,
        dmarc: dmarcDetected,
        level: emailSecurityLevel,
        score: emailSecurityScore,
      },
      dnsProvider,
      nameServerHints: nsHints,
      mailServerHints: mxHints,
      dnsResults: (dnsSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      mxResults: (dnsSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      nsResults: (dnsSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      txtResults: (txtSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      dnssecResults: (txtSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      cnameResults: (cnameSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
