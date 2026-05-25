import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    // Sequential searches to avoid rate limiting
    const dnsSearch = await safeWebSearch(`${domain} DNS records A AAAA MX NS lookup`, 10);
    const mxSearch = await safeWebSearch(`${domain} MX record mail server email`, 5);
    const nsSearch = await safeWebSearch(`${domain} nameserver NS record hosting provider`, 5);
    const txtSearch = await safeWebSearch(`${domain} TXT record SPF DKIM DMARC DNS`, 5);

    // AI analysis
    const allContext = [
      ...(dnsSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[DNS] ${r.name}: ${r.snippet}`),
      ...(mxSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[MX] ${r.name}: ${r.snippet}`),
      ...(nsSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[NS] ${r.name}: ${r.snippet}`),
      ...(txtSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[TXT/SPF] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          'You are an OSINT analyst specializing in DNS reconnaissance and network intelligence. Analyze DNS intelligence data and provide: 1) DNS record findings 2) Mail server security 3) Nameserver/Hosting assessment 4) SPF/DKIM/DMARC posture 5) Infrastructure mapping 6) Security assessment 7) Recommendations. Format as structured DNS intelligence report.',
          `Analyze DNS reconnaissance data for: ${domain}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive DNS intelligence report.`
        )
      : 'No DNS intelligence data available for this domain.';

    return NextResponse.json({
      success: true,
      domain,
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
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
