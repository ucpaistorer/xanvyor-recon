import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

// Known VPN/proxy/tor indicators
const VPN_PROVIDERS = [
  'nordvpn', 'expressvpn', 'surfshark', 'cyberghost', 'private internet access',
  'mullvad', 'protonvpn', 'windscribe', 'hide.me', 'ipvanish',
  'purevpn', 'tunnelbear', 'astrill', 'strongvpn',
];

const TOR_INDICATORS = ['tor ', 'tor exit', 'tor relay', 'tor node', 'onion', 'tails'];
const PROXY_INDICATORS = ['proxy', 'socks', 'open proxy', 'anonymous proxy', 'web proxy', 'transparent proxy'];

// Reserved/private IP ranges
const RESERVED_RANGES = [
  { start: '0.0.0.0', end: '0.255.255.255', name: 'Current Network' },
  { start: '10.0.0.0', end: '10.255.255.255', name: 'Private (Class A)' },
  { start: '100.64.0.0', end: '100.127.255.255', name: 'CGNAT' },
  { start: '127.0.0.0', end: '127.255.255.255', name: 'Loopback' },
  { start: '169.254.0.0', end: '169.254.255.255', name: 'Link-Local' },
  { start: '172.16.0.0', end: '172.31.255.255', name: 'Private (Class B)' },
  { start: '192.0.0.0', end: '192.0.0.255', name: 'IETF Protocol' },
  { start: '192.168.0.0', end: '192.168.255.255', name: 'Private (Class C)' },
  { start: '198.18.0.0', end: '198.19.255.255', name: 'Benchmarking' },
  { start: '224.0.0.0', end: '239.255.255.255', name: 'Multicast' },
  { start: '240.0.0.0', end: '255.255.255.255', name: 'Reserved' },
];

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

    const isV6 = ipv6Regex.test(ip);
    const isPrivate = isPrivateIP(ip);
    const reservedInfo = getReservedInfo(ip);

    // Sequential searches for comprehensive IP OSINT
    const geoSearch = await safeWebSearch(`${ip} IP address geolocation ISP ASN threat reputation blacklist`, 5);
    const vpnSearch = await safeWebSearch(`${ip} VPN proxy tor exit node detection reverse DNS hostname`, 5);
    const portSearch = await safeWebSearch(`${ip} open ports scan services malware botnet`, 5);

    // Combine all search results
    const allResults = [
      ...(geoSearch as Array<Record<string, string>>),
      ...(vpnSearch as Array<Record<string, string>>),
      ...(portSearch as Array<Record<string, string>>),
    ];
    const allText = allResults.map((r: Record<string, string>) => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase()).join(' ');

    // VPN/Proxy/Tor detection from search results
    const vpnDetected = VPN_PROVIDERS.some(vpn => allText.includes(vpn));
    const torDetected = TOR_INDICATORS.some(ind => allText.includes(ind));
    const proxyDetected = PROXY_INDICATORS.some(ind => allText.includes(ind));

    let anonymityType = 'None detected';
    if (torDetected) anonymityType = 'Tor';
    else if (vpnDetected) anonymityType = 'VPN';
    else if (proxyDetected) anonymityType = 'Proxy';

    const threatKeywords = ['malware', 'botnet', 'c2', 'command and control', 'spam', 'phishing', 'brute force', 'ddos', 'scanner', 'exploit'];
    const detectedThreats = threatKeywords.filter(k => allText.includes(k));

    let threatLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (detectedThreats.length >= 3) threatLevel = 'critical';
    else if (detectedThreats.length >= 2) threatLevel = 'high';
    else if (detectedThreats.length >= 1) threatLevel = 'medium';

    // Blacklist detection
    const blacklistKeywords = ['blacklist', 'blocklist', 'blocked', 'listed', 'reported'];
    const blacklists = (geoSearch as Array<Record<string, string>>)
      .filter((r: Record<string, string>) =>
        blacklistKeywords.some(k => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase().includes(k))
      )
      .map((r: Record<string, string>) => ({
        source: r.host_name || r.name || '',
        description: r.snippet?.substring(0, 150) || '',
        url: r.url || '',
      }));

    // Port scan hints from search
    const commonPorts = [
      { port: 21, service: 'FTP', hint: 'ftp' },
      { port: 22, service: 'SSH', hint: 'ssh' },
      { port: 23, service: 'Telnet', hint: 'telnet' },
      { port: 25, service: 'SMTP', hint: 'smtp' },
      { port: 53, service: 'DNS', hint: 'dns' },
      { port: 80, service: 'HTTP', hint: 'http' },
      { port: 110, service: 'POP3', hint: 'pop3' },
      { port: 143, service: 'IMAP', hint: 'imap' },
      { port: 443, service: 'HTTPS', hint: 'https' },
      { port: 3306, service: 'MySQL', hint: 'mysql' },
      { port: 3389, service: 'RDP', hint: 'rdp' },
      { port: 5432, service: 'PostgreSQL', hint: 'postgresql' },
      { port: 5900, service: 'VNC', hint: 'vnc' },
      { port: 6379, service: 'Redis', hint: 'redis' },
      { port: 8080, service: 'HTTP-Alt', hint: '8080' },
      { port: 8443, service: 'HTTPS-Alt', hint: '8443' },
      { port: 27017, service: 'MongoDB', hint: 'mongodb' },
    ];

    const detectedPorts = commonPorts
      .filter(p => allText.includes(p.hint))
      .map(p => ({ ...p, status: 'likely_open' as const }));

    // Geolocation extraction hints
    const geoKeywords = ['country', 'city', 'region', 'latitude', 'longitude', 'isp', 'asn', 'organization'];
    const geoData = (geoSearch as Array<Record<string, string>>)
      .slice(0, 3)
      .map((r: Record<string, string>) => ({
        title: r.name,
        snippet: r.snippet,
        url: r.url,
      }));

    // AI analysis
    const allContext = [
      ...(geoSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[GEO] ${r.name}: ${r.snippet}`),
      ...(vpnSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[VPN/PROXY] ${r.name}: ${r.snippet}`),
      ...(portSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[PORTS] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for IP intelligence. Report with: ## 📍 GEOLOCATION & NETWORK ## 🛡️ THREAT INTELLIGENCE ## 🔒 ANONYMITY ASSESSMENT ## 🔌 PORT & SERVICE ANALYSIS ## 🔄 REVERSE DNS & HOSTNAME ## 📊 RISK ASSESSMENT ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `IP: ${ip} | Type: ${isV6 ? 'IPv6' : 'IPv4'} | Private: ${isPrivate} | Anonymity: ${anonymityType} | Threat: ${threatLevel}

${allContext.substring(0, 1500)}`
        )
      : 'No intelligence data available for this IP address.';

    return NextResponse.json({
      success: true,
      ip,
      type: isV6 ? 'IPv6' : 'IPv4',
      isPrivate,
      reservedInfo,
      anonymityType,
      vpnDetected,
      torDetected,
      proxyDetected,
      threatLevel,
      detectedThreats,
      blacklists,
      blacklistCount: blacklists.length,
      detectedPorts,
      geoResults: geoData,
      threatResults: (geoSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date || '',
      })),
      vpnResults: (vpnSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      reverseDnsResults: (vpnSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
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

function getReservedInfo(ip: string): string | null {
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) return null;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return null;
  const num = (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
  for (const range of RESERVED_RANGES) {
    const startParts = range.start.split('.').map(Number);
    const endParts = range.end.split('.').map(Number);
    const startNum = (startParts[0] << 24) + (startParts[1] << 16) + (startParts[2] << 8) + startParts[3];
    const endNum = (endParts[0] << 24) + (endParts[1] << 16) + (endParts[2] << 8) + endParts[3];
    if (num >= startNum && num <= endNum) return range.name;
  }
  return null;
}
