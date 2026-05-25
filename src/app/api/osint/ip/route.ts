import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { ip } = await request.json();
    if (!ip) {
      return NextResponse.json({ error: 'IP address is required' }, { status: 400 });
    }

    // Basic IP validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
    if (!ipv4Regex.test(ip) && !ipv6Regex.test(ip)) {
      return NextResponse.json({ error: 'Invalid IP address format' }, { status: 400 });
    }

    const zai = await getZAI();

    // Search for IP intelligence
    const [geoSearch, threatSearch, reverseSearch] = await Promise.all([
      zai.functions.invoke('web_search', {
        query: `${ip} IP address geolocation ISP`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${ip} IP threat reputation blacklist malware`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${ip} reverse DNS hostname whois`,
        num: 5,
      }),
    ]);

    // AI analysis
    let aiAnalysis = '';
    try {
      const allContext = [
        ...geoSearch.slice(0, 4).map((r: { name: string; snippet: string }) => `[GEO] ${r.name}: ${r.snippet}`),
        ...threatSearch.slice(0, 4).map((r: { name: string; snippet: string }) => `[THREAT] ${r.name}: ${r.snippet}`),
        ...reverseSearch.slice(0, 3).map((r: { name: string; snippet: string }) => `[DNS] ${r.name}: ${r.snippet}`),
      ].join('\n\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an OSINT analyst specializing in IP intelligence and cyber threat analysis. Analyze IP address intelligence data and provide: 1) Geolocation assessment 2) ISP/Network info 3) Threat reputation 4) Associated malicious activity 5) Risk score assessment (Low/Medium/High/Critical) 6) Recommendations. Format as structured intelligence report.'
          },
          {
            role: 'user',
            content: `Analyze IP address: ${ip}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive IP intelligence report.`
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
      ip,
      type: ipv6Regex.test(ip) ? 'IPv6' : 'IPv4',
      isPrivate: isPrivateIP(ip),
      geoResults: geoSearch.map((r: { url: string; name: string; snippet: string; host_name: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      threatResults: threatSearch.map((r: { url: string; name: string; snippet: string; host_name: string; date: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date,
      })),
      reverseDnsResults: reverseSearch.map((r: { url: string; name: string; snippet: string }) => ({
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

function isPrivateIP(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 127) return true;
  return false;
}
