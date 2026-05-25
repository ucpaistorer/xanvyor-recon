import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Sequential searches for comprehensive DNS OSINT
    const dnsSearch = await safeWebSearch(`${domain} DNS records A AAAA MX NS lookup`, 10);
    const mxSearch = await safeWebSearch(`${domain} MX record mail server email provider`, 5);
    const nsSearch = await safeWebSearch(`${domain} nameserver NS record hosting provider DNS`, 5);
    const txtSearch = await safeWebSearch(`${domain} TXT record SPF DKIM DMARC DNS email security`, 8);
    const dnssecSearch = await safeWebSearch(`${domain} DNSSEC DS record DNS security validation`, 5);
    const cnameSearch = await safeWebSearch(`${domain} CNAME record alias www DNS`, 5);

    // Combine all results
    const allResults = [
      ...(dnsSearch as Array<Record<string, string>>),
      ...(mxSearch as Array<Record<string, string>>),
      ...(nsSearch as Array<Record<string, string>>),
      ...(txtSearch as Array<Record<string, string>>),
      ...(dnssecSearch as Array<Record<string, string>>),
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
    const nsHints = (nsSearch as Array<Record<string, string>>)
      .filter((r: Record<string, string>) => r.snippet && r.snippet.toLowerCase().includes('ns'))
      .map((r: Record<string, string>) => ({
        title: r.name,
        snippet: r.snippet?.substring(0, 150),
        url: r.url,
      }));

    // Extract mail server information
    const mxHints = (mxSearch as Array<Record<string, string>>)
      .filter((r: Record<string, string>) => r.snippet && r.snippet.toLowerCase().includes('mx'))
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
      ...(mxSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[MX] ${r.name}: ${r.snippet}`),
      ...(nsSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[NS] ${r.name}: ${r.snippet}`),
      ...(txtSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[TXT/SPF] ${r.name}: ${r.snippet}`),
      ...(dnssecSearch as Array<Record<string, string>>).slice(0, 2).map((r: Record<string, string>) => `[DNSSEC] ${r.name}: ${r.snippet}`),
      ...(cnameSearch as Array<Record<string, string>>).slice(0, 2).map((r: Record<string, string>) => `[CNAME] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in DNS reconnaissance and network infrastructure intelligence.
Analyze the DNS intelligence data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 🌐 DNS RECORD ANALYSIS
- A/AAAA record findings (IP addresses)
- CNAME records and aliases
- Overall DNS structure

## 📧 EMAIL SECURITY POSTURE
- MX record analysis (mail servers)
- SPF (Sender Policy Framework) assessment
- DKIM (DomainKeys Identified Mail) status
- DMARC policy evaluation
- Email security score and recommendations

## 🏗️ NAMESERVER & HOSTING
- Nameserver identification
- DNS provider analysis
- Hosting infrastructure mapping
- CDN/Cloud detection

## 🔐 DNSSEC ASSESSMENT
- DNSSEC enabled status
- DS record analysis
- Key signing status
- Security validation results

## 🔍 INFRASTRUCTURE MAPPING
- DNS-based infrastructure overview
- Subdomain delegation patterns
- Service identification from DNS
- Third-party service integrations

## 📊 SECURITY ASSESSMENT
- DNS security score
- Vulnerability indicators
- Email spoofing risk (SPF/DKIM/DMARC gaps)
- Zone transfer risk indicators

## 🎯 RECOMMENDATIONS
- DNS security improvements
- Email security hardening
- DNSSEC implementation advice
- Monitoring suggestions

Be thorough and specific. Use emojis for section headers.`,
          `Analyze DNS reconnaissance data for: ${domain}\nDNSSEC: ${dnssecDetected ? 'detected' : 'not detected'}\nEmail Security: SPF=${spfDetected}, DKIM=${dkimDetected}, DMARC=${dmarcDetected} (${emailSecurityLevel})\nDNS Provider: ${dnsProvider}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive DNS intelligence report.`
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
      mxResults: (mxSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      nsResults: (nsSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      txtResults: (txtSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      dnssecResults: (dnssecSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
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
