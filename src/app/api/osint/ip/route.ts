import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

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

    // Sequential searches to avoid rate limiting
    const geoSearch = await safeWebSearch(`${ip} IP address geolocation ISP`, 10);
    const threatSearch = await safeWebSearch(`${ip} IP threat reputation blacklist malware`, 10);
    const reverseSearch = await safeWebSearch(`${ip} reverse DNS hostname whois`, 5);

    // AI analysis
    const allContext = [
      ...(geoSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[GEO] ${r.name}: ${r.snippet}`),
      ...(threatSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[THREAT] ${r.name}: ${r.snippet}`),
      ...(reverseSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[DNS] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          'You are an OSINT analyst specializing in IP intelligence and cyber threat analysis. Analyze IP address intelligence data and provide: 1) Geolocation assessment 2) ISP/Network info 3) Threat reputation 4) Associated malicious activity 5) Risk score assessment (Low/Medium/High/Critical) 6) Recommendations. Format as structured intelligence report.',
          `Analyze IP address: ${ip}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive IP intelligence report.`
        )
      : 'No intelligence data available for this IP address.';

    return NextResponse.json({
      success: true,
      ip,
      type: ipv6Regex.test(ip) ? 'IPv6' : 'IPv4',
      isPrivate: isPrivateIP(ip),
      geoResults: (geoSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      threatResults: (threatSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date || '',
      })),
      reverseDnsResults: (reverseSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
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
