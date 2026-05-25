import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const zai = await getZAI();

    const [dnsSearch, mxSearch, nsSearch, txtSearch] = await Promise.all([
      zai.functions.invoke('web_search', {
        query: `${domain} DNS records A AAAA MX NS lookup`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${domain} MX record mail server email`,
        num: 5,
      }),
      zai.functions.invoke('web_search', {
        query: `${domain} nameserver NS record hosting provider`,
        num: 5,
      }),
      zai.functions.invoke('web_search', {
        query: `${domain} TXT record SPF DKIM DMARC DNS`,
        num: 5,
      }),
    ]);

    // AI analysis
    let aiAnalysis = '';
    try {
      const allContext = [
        ...dnsSearch.slice(0, 4).map((r: { name: string; snippet: string }) => `[DNS] ${r.name}: ${r.snippet}`),
        ...mxSearch.slice(0, 3).map((r: { name: string; snippet: string }) => `[MX] ${r.name}: ${r.snippet}`),
        ...nsSearch.slice(0, 3).map((r: { name: string; snippet: string }) => `[NS] ${r.name}: ${r.snippet}`),
        ...txtSearch.slice(0, 3).map((r: { name: string; snippet: string }) => `[TXT/SPF] ${r.name}: ${r.snippet}`),
      ].join('\n\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an OSINT analyst specializing in DNS reconnaissance and network intelligence. Analyze DNS intelligence data and provide: 1) DNS record findings 2) Mail server security 3) Nameserver/Hosting assessment 4) SPF/DKIM/DMARC posture 5) Infrastructure mapping 6) Security assessment 7) Recommendations. Format as structured DNS intelligence report.'
          },
          {
            role: 'user',
            content: `Analyze DNS reconnaissance data for: ${domain}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive DNS intelligence report.`
          }
        ],
        thinking: { type: 'disabled' }
      });
      aiAnalysis = completion.choices[0]?.message?.content || '';
    } catch {
      aiAnalysis = 'AI analysis unavailable';
    }

    return NextResponse.json({
      success: true,
      domain,
      dnsResults: dnsSearch.map((r: { url: string; name: string; snippet: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      mxResults: mxSearch.map((r: { url: string; name: string; snippet: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      nsResults: nsSearch.map((r: { url: string; name: string; snippet: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      txtResults: txtSearch.map((r: { url: string; name: string; snippet: string }) => ({
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
