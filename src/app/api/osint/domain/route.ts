import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const zai = await getZAI();

    const [whoisSearch, subdomainSearch, sslSearch, techSearch] = await Promise.all([
      zai.functions.invoke('web_search', {
        query: `${domain} WHOIS registration domain info owner`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${domain} subdomains enum site:${domain}`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${domain} SSL certificate security TLS`,
        num: 5,
      }),
      zai.functions.invoke('web_search', {
        query: `${domain} technology stack built with powered by`,
        num: 5,
      }),
    ]);

    // AI analysis
    let aiAnalysis = '';
    try {
      const allContext = [
        ...whoisSearch.slice(0, 4).map((r: { name: string; snippet: string }) => `[WHOIS] ${r.name}: ${r.snippet}`),
        ...subdomainSearch.slice(0, 3).map((r: { name: string; snippet: string }) => `[SUBDOMAIN] ${r.name}: ${r.snippet}`),
        ...sslSearch.slice(0, 2).map((r: { name: string; snippet: string }) => `[SSL] ${r.name}: ${r.snippet}`),
        ...techSearch.slice(0, 2).map((r: { name: string; snippet: string }) => `[TECH] ${r.name}: ${r.snippet}`),
      ].join('\n\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an OSINT analyst specializing in domain intelligence and cybersecurity. Analyze domain intelligence data and provide: 1) Registration details 2) Infrastructure assessment 3) Technology fingerprint 4) Security posture 5) Subdomain enumeration findings 6) Risk assessment 7) Recommendations. Format as structured intelligence report.'
          },
          {
            role: 'user',
            content: `Analyze domain: ${domain}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive domain intelligence report.`
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
      whoisResults: whoisSearch.map((r: { url: string; name: string; snippet: string; date: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        date: r.date,
      })),
      subdomainResults: subdomainSearch.map((r: { url: string; name: string; snippet: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      sslResults: sslSearch.map((r: { url: string; name: string; snippet: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      techResults: techSearch.map((r: { url: string; name: string; snippet: string }) => ({
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
