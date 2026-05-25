import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Sequential searches to avoid rate limiting
    const whoisSearch = await safeWebSearch(`${domain} WHOIS registration domain info owner`, 10);
    const subdomainSearch = await safeWebSearch(`${domain} subdomains enum site:${domain}`, 10);
    const sslSearch = await safeWebSearch(`${domain} SSL certificate security TLS`, 5);
    const techSearch = await safeWebSearch(`${domain} technology stack built with powered by`, 5);

    // AI analysis
    const allContext = [
      ...(whoisSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[WHOIS] ${r.name}: ${r.snippet}`),
      ...(subdomainSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[SUBDOMAIN] ${r.name}: ${r.snippet}`),
      ...(sslSearch as Array<Record<string, string>>).slice(0, 2).map((r: Record<string, string>) => `[SSL] ${r.name}: ${r.snippet}`),
      ...(techSearch as Array<Record<string, string>>).slice(0, 2).map((r: Record<string, string>) => `[TECH] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          'You are an OSINT analyst specializing in domain intelligence and cybersecurity. Analyze domain intelligence data and provide: 1) Registration details 2) Infrastructure assessment 3) Technology fingerprint 4) Security posture 5) Subdomain enumeration findings 6) Risk assessment 7) Recommendations. Format as structured intelligence report.',
          `Analyze domain: ${domain}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive domain intelligence report.`
        )
      : 'No domain intelligence data available.';

    return NextResponse.json({
      success: true,
      domain,
      whoisResults: (whoisSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        date: r.date || '',
      })),
      subdomainResults: (subdomainSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      sslResults: (sslSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      techResults: (techSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
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
