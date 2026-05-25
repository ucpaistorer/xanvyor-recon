import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// BSSID validation: accepts AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF (case-insensitive)
const BSSID_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

// OUI manufacturer mapping for common vendors
const OUI_MANUFACTURERS: Record<string, { manufacturer: string; deviceType: string }> = {
  // Cisco
  '00:00:0C': { manufacturer: 'Cisco Systems', deviceType: 'Router / Switch / Access Point' },
  '00:1A:A1': { manufacturer: 'Cisco Systems', deviceType: 'Router / Switch' },
  '00:26:0B': { manufacturer: 'Cisco Systems', deviceType: 'Access Point' },
  '00:26:51': { manufacturer: 'Cisco Systems', deviceType: 'Wireless Controller' },
  'F8:C2:88': { manufacturer: 'Cisco Systems', deviceType: 'Access Point / Meraki' },
  // TP-Link
  '50:C7:BF': { manufacturer: 'TP-Link Technologies', deviceType: 'Router / Access Point' },
  '60:32:B1': { manufacturer: 'TP-Link Technologies', deviceType: 'Router' },
  'B0:4E:26': { manufacturer: 'TP-Link Technologies', deviceType: 'Router / Access Point' },
  'EC:08:6B': { manufacturer: 'TP-Link Technologies', deviceType: 'Router' },
  '9C:A6:15': { manufacturer: 'TP-Link Technologies', deviceType: 'Range Extender' },
  // Netgear
  '00:09:5B': { manufacturer: 'Netgear Inc.', deviceType: 'Router' },
  'A0:21:B7': { manufacturer: 'Netgear Inc.', deviceType: 'Router / Access Point' },
  'C0:3F:0E': { manufacturer: 'Netgear Inc.', deviceType: 'Router' },
  '9C:3D:CF': { manufacturer: 'Netgear Inc.', deviceType: 'Router / Access Point' },
  '60:38:E0': { manufacturer: 'Netgear Inc.', deviceType: 'Router' },
  // D-Link
  '00:05:5D': { manufacturer: 'D-Link Corporation', deviceType: 'Router / Access Point' },
  '00:0D:88': { manufacturer: 'D-Link Corporation', deviceType: 'Router' },
  '00:11:95': { manufacturer: 'D-Link Corporation', deviceType: 'Router / Access Point' },
  '1C:7E:E5': { manufacturer: 'D-Link Corporation', deviceType: 'Router' },
  '84:C9:B2': { manufacturer: 'D-Link Corporation', deviceType: 'Router / Access Point' },
  // Asus
  '00:1E:8C': { manufacturer: 'ASUSTeK Computer', deviceType: 'Router / Access Point' },
  '04:D4:C4': { manufacturer: 'ASUSTeK Computer', deviceType: 'Router' },
  '1C:B7:2C': { manufacturer: 'ASUSTeK Computer', deviceType: 'Router / Access Point' },
  '2C:4D:54': { manufacturer: 'ASUSTeK Computer', deviceType: 'Router' },
  '60:45:CB': { manufacturer: 'ASUSTeK Computer', deviceType: 'Router / Access Point' },
  // Huawei
  '00:18:82': { manufacturer: 'Huawei Technologies', deviceType: 'Router / Access Point' },
  '48:5B:39': { manufacturer: 'Huawei Technologies', deviceType: 'Router / Mobile Hotspot' },
  'A8:6B:AD': { manufacturer: 'Huawei Technologies', deviceType: 'Router / Access Point' },
  'E0:19:1D': { manufacturer: 'Huawei Technologies', deviceType: 'Access Point' },
  'B0:F1:63': { manufacturer: 'Huawei Technologies', deviceType: 'Router' },
  // Xiaomi
  '28:E3:1F': { manufacturer: 'Xiaomi Inc.', deviceType: 'Router / Access Point' },
  '78:11:DC': { manufacturer: 'Xiaomi Inc.', deviceType: 'Router' },
  'C8:02:8F': { manufacturer: 'Xiaomi Inc.', deviceType: 'Router / Access Point' },
  '0C:1D:AF': { manufacturer: 'Xiaomi Inc.', deviceType: 'Router' },
  '64:09:80': { manufacturer: 'Xiaomi Inc.', deviceType: 'Access Point' },
  // Samsung
  '00:12:FB': { manufacturer: 'Samsung Electronics', deviceType: 'Mobile Device / Smart TV' },
  '34:23:87': { manufacturer: 'Samsung Electronics', deviceType: 'Mobile Device' },
  'A0:CB:FD': { manufacturer: 'Samsung Electronics', deviceType: 'Mobile Device / Smart TV' },
  'D0:03:EB': { manufacturer: 'Samsung Electronics', deviceType: 'Mobile Device' },
  'F0:25:B7': { manufacturer: 'Samsung Electronics', deviceType: 'Smart TV / IoT' },
  // Apple
  '00:03:93': { manufacturer: 'Apple Inc.', deviceType: 'Access Point / AirPort' },
  '00:0A:95': { manufacturer: 'Apple Inc.', deviceType: 'Access Point / AirPort' },
  '00:11:24': { manufacturer: 'Apple Inc.', deviceType: 'Access Point / AirPort' },
  '3C:07:54': { manufacturer: 'Apple Inc.', deviceType: 'Mobile Device' },
  'A4:B1:97': { manufacturer: 'Apple Inc.', deviceType: 'Mobile Device' },
  // Ubiquiti
  '00:15:6D': { manufacturer: 'Ubiquiti Networks', deviceType: 'Access Point / UniFi' },
  '04:18:D6': { manufacturer: 'Ubiquiti Networks', deviceType: 'Access Point / UniFi' },
  '24:A4:3C': { manufacturer: 'Ubiquiti Networks', deviceType: 'Access Point' },
  '44:D9:E7': { manufacturer: 'Ubiquiti Networks', deviceType: 'Access Point / UniFi' },
  'FC:EC:DA': { manufacturer: 'Ubiquiti Networks', deviceType: 'Access Point / NanoStation' },
  // Aruba (HPE)
  '00:0B:86': { manufacturer: 'Aruba Networks (HPE)', deviceType: 'Access Point / Controller' },
  '00:1A:1E': { manufacturer: 'Aruba Networks (HPE)', deviceType: 'Access Point' },
  '24:DE:C6': { manufacturer: 'Aruba Networks (HPE)', deviceType: 'Access Point / Controller' },
  '3C:CE:73': { manufacturer: 'Aruba Networks (HPE)', deviceType: 'Access Point' },
  '9C:1C:12': { manufacturer: 'Aruba Networks (HPE)', deviceType: 'Access Point / Controller' },
  // Ruckus
  '00:20:A6': { manufacturer: 'Ruckus Networks', deviceType: 'Access Point / ZoneDirector' },
  '8C:1A:BF': { manufacturer: 'Ruckus Networks', deviceType: 'Access Point' },
  'C0:3F:0E': { manufacturer: 'Ruckus Networks', deviceType: 'Access Point' },
  '24:8A:6E': { manufacturer: 'Ruckus Networks', deviceType: 'Access Point / ICX' },
  // Meraki (Cisco)
  '00:18:0A': { manufacturer: 'Cisco Meraki', deviceType: 'Access Point / Cloud Managed' },
  '88:15:44': { manufacturer: 'Cisco Meraki', deviceType: 'Access Point' },
  '0C:8C:24': { manufacturer: 'Cisco Meraki', deviceType: 'Access Point / Cloud Managed' },
  'E0:55:9D': { manufacturer: 'Cisco Meraki', deviceType: 'Access Point' },
  // Juniper
  '00:05:85': { manufacturer: 'Juniper Networks', deviceType: 'Router / Switch' },
  '00:12:1E': { manufacturer: 'Juniper Networks', deviceType: 'Router / Access Point' },
  '2C:6B:F5': { manufacturer: 'Juniper Networks', deviceType: 'Switch / Router' },
  '3C:08:4A': { manufacturer: 'Juniper Networks', deviceType: 'Access Point / Mist' },
  '5C:45:27': { manufacturer: 'Juniper Networks', deviceType: 'Switch / Router' },
};

// Fallback pattern-based manufacturer detection
const MANUFACTURER_PATTERNS: Array<{ pattern: string; manufacturer: string; deviceType: string }> = [
  { pattern: 'cisco', manufacturer: 'Cisco Systems', deviceType: 'Router / Switch / Access Point' },
  { pattern: 'tp-link', manufacturer: 'TP-Link Technologies', deviceType: 'Router / Access Point' },
  { pattern: 'netgear', manufacturer: 'Netgear Inc.', deviceType: 'Router / Access Point' },
  { pattern: 'd-link', manufacturer: 'D-Link Corporation', deviceType: 'Router / Access Point' },
  { pattern: 'asus', manufacturer: 'ASUSTeK Computer', deviceType: 'Router / Access Point' },
  { pattern: 'huawei', manufacturer: 'Huawei Technologies', deviceType: 'Router / Access Point' },
  { pattern: 'xiaomi', manufacturer: 'Xiaomi Inc.', deviceType: 'Router / Access Point' },
  { pattern: 'samsung', manufacturer: 'Samsung Electronics', deviceType: 'Mobile Device / Smart TV' },
  { pattern: 'apple', manufacturer: 'Apple Inc.', deviceType: 'Access Point / AirPort' },
  { pattern: 'ubiquiti', manufacturer: 'Ubiquiti Networks', deviceType: 'Access Point / UniFi' },
  { pattern: 'aruba', manufacturer: 'Aruba Networks (HPE)', deviceType: 'Access Point / Controller' },
  { pattern: 'ruckus', manufacturer: 'Ruckus Networks', deviceType: 'Access Point' },
  { pattern: 'meraki', manufacturer: 'Cisco Meraki', deviceType: 'Access Point / Cloud Managed' },
  { pattern: 'juniper', manufacturer: 'Juniper Networks', deviceType: 'Router / Switch' },
];

function validateBSSID(bssid: string): { valid: boolean; normalized: string; oui: string } {
  const trimmed = bssid.trim();
  if (!BSSID_REGEX.test(trimmed)) {
    return { valid: false, normalized: '', oui: '' };
  }
  const normalized = trimmed.toUpperCase().replace(/-/g, ':');
  const octets = normalized.split(':');
  const oui = `${octets[0]}:${octets[1]}:${octets[2]}`;
  return { valid: true, normalized, oui };
}

// Parse search results into uniform format
function parseResults(results: unknown[]) {
  return (results as Array<Record<string, string>>)
    .map((r) => ({
      url: r.url || '',
      title: r.name || '',
      snippet: r.snippet || '',
      source: r.host_name || '',
    }))
    .filter((r) => r.title || r.snippet);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ssid, bssid } = body as { ssid?: string; bssid?: string };

    if (!ssid && !bssid) {
      return NextResponse.json(
        { success: false, error: 'At least one of SSID or BSSID is required' },
        { status: 400 }
      );
    }

    // Validate BSSID if provided
    let normalizedBSSID = '';
    let oui = '';
    let ouiManufacturer = 'Unknown';
    let ouiDeviceType = 'Unknown';

    if (bssid) {
      const validation = validateBSSID(bssid);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Invalid BSSID format. Expected format: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF',
          },
          { status: 400 }
        );
      }
      normalizedBSSID = validation.normalized;
      oui = validation.oui;

      // OUI manufacturer lookup
      const ouiEntry = OUI_MANUFACTURERS[oui];
      if (ouiEntry) {
        ouiManufacturer = ouiEntry.manufacturer;
        ouiDeviceType = ouiEntry.deviceType;
      }
    }

    // Build search queries based on available input
    const searchCalls: Array<{ query: string; num?: number }> = [];

    if (normalizedBSSID) {
      searchCalls.push(
        { query: `"${normalizedBSSID}" WiFi BSSID access point location network`, num: 10 },
        { query: `"${oui}" OUI manufacturer vendor WiFi device`, num: 8 },
        { query: `"${normalizedBSSID}" OR "${oui}" router vulnerability CVE exploit security`, num: 10 },
        { query: `"${normalizedBSSID}" OR "${oui}" data leak breach exposed device`, num: 10 },
        { query: `"${oui}" WiFi access point default password configuration security`, num: 8 }
      );
    }

    if (ssid) {
      searchCalls.push(
        { query: `"${ssid}" WiFi network SSID public access point location`, num: 10 },
        { query: `"${ssid}" WiFi network security encryption vulnerability`, num: 8 },
        { query: `"${ssid}" SSID data leak connected devices exposure`, num: 8 }
      );
    }

    // Combined search if both provided
    if (ssid && normalizedBSSID) {
      searchCalls.push(
        { query: `"${ssid}" "${normalizedBSSID}" WiFi network information`, num: 8 }
      );
    }

    // Execute sequential web searches
    const searchResults = await sequentialWebSearch(searchCalls, 2000);

    // Parse results by category
    let bssidLocationData: ReturnType<typeof parseResults> = [];
    let ouiManufacturerData: ReturnType<typeof parseResults> = [];
    let vulnerabilityData: ReturnType<typeof parseResults> = [];
    let leakData: ReturnType<typeof parseResults> = [];
    let securityData: ReturnType<typeof parseResults> = [];
    let ssidNetworkData: ReturnType<typeof parseResults> = [];
    let ssidSecurityData: ReturnType<typeof parseResults> = [];
    let ssidLeakData: ReturnType<typeof parseResults> = [];
    let combinedData: ReturnType<typeof parseResults> = [];

    let idx = 0;
    if (normalizedBSSID) {
      bssidLocationData = parseResults(searchResults[idx++] || []);
      ouiManufacturerData = parseResults(searchResults[idx++] || []);
      vulnerabilityData = parseResults(searchResults[idx++] || []);
      leakData = parseResults(searchResults[idx++] || []);
      securityData = parseResults(searchResults[idx++] || []);
    }
    if (ssid) {
      ssidNetworkData = parseResults(searchResults[idx++] || []);
      ssidSecurityData = parseResults(searchResults[idx++] || []);
      ssidLeakData = parseResults(searchResults[idx++] || []);
    }
    if (ssid && normalizedBSSID) {
      combinedData = parseResults(searchResults[idx++] || []);
    }

    // If OUI manufacturer not found from mapping, try pattern matching on search results
    if (ouiManufacturer === 'Unknown' && ouiManufacturerData.length > 0) {
      const manufacturerText = ouiManufacturerData
        .map((r) => `${r.title} ${r.snippet}`)
        .join(' ')
        .toLowerCase();

      for (const mp of MANUFACTURER_PATTERNS) {
        if (manufacturerText.includes(mp.pattern)) {
          ouiManufacturer = mp.manufacturer;
          ouiDeviceType = mp.deviceType;
          break;
        }
      }

      // Try to extract from OUI registry results
      if (ouiManufacturer === 'Unknown') {
        for (const r of ouiManufacturerData) {
          const match = r.snippet.match(
            /(?:assigned\s+to|vendor|company|manufacturer)[:\s]+([A-Z][A-Za-z0-9\s&.,]+?)(?:\s*[.\-,]|\s*$)/i
          );
          if (match && match[1].trim().length > 2 && match[1].trim().length < 60) {
            ouiManufacturer = match[1].trim();
            ouiDeviceType = 'Network Device';
            break;
          }
        }
      }
    }

    // Infer network info from search results
    const allSearchText = [
      ...bssidLocationData,
      ...ssidNetworkData,
      ...combinedData,
      ...securityData,
      ...ssidSecurityData,
    ]
      .map((r) => `${r.title} ${r.snippet}`.toLowerCase())
      .join(' ');

    let encryption = 'Unknown';
    if (allSearchText.includes('wpa3')) encryption = 'WPA3';
    else if (allSearchText.includes('wpa2')) encryption = 'WPA2';
    else if (allSearchText.includes('wpa ')) encryption = 'WPA';
    else if (allSearchText.includes('wep')) encryption = 'WEP';
    else if (allSearchText.includes('open') && (allSearchText.includes('no encryption') || allSearchText.includes('unsecured'))) encryption = 'Open / Unsecured';

    let channel = 'Unknown';
    const channelMatch = allSearchText.match(/channel\s+(\d+)/i);
    if (channelMatch) channel = channelMatch[1];

    let signalStrength = 'Unknown';
    if (allSearchText.includes('signal strength') || allSearchText.includes('rssi')) {
      const rssiMatch = allSearchText.match(/(?:rssi|signal)[:\s-]*(-?\d+)\s*dbm/i);
      if (rssiMatch) signalStrength = `${rssiMatch[1]} dBm`;
    }

    let frequency = 'Unknown';
    if (allSearchText.includes('2.4 ghz') || allSearchText.includes('2.4ghz')) frequency = '2.4 GHz';
    else if (allSearchText.includes('5 ghz') || allSearchText.includes('5ghz')) frequency = '5 GHz';
    else if (allSearchText.includes('6 ghz') || allSearchText.includes('6ghz') || allSearchText.includes('wifi 6e') || allSearchText.includes('wi-fi 6e')) frequency = '6 GHz (WiFi 6E)';

    // Location results from BSSID
    const locationResults = bssidLocationData
      .slice(0, 8)
      .map((r) => ({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        source: r.source,
      }));

    // Security results
    const securityResults = [...securityData, ...ssidSecurityData]
      .slice(0, 8)
      .map((r) => ({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        source: r.source,
      }));

    // Vulnerability results
    const vulnerabilityResults = vulnerabilityData
      .slice(0, 8)
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        if (text.includes('critical') || text.includes('rce') || text.includes('remote code')) {
          severity = 'critical';
        } else if (text.includes('high') || text.includes('exploit') || text.includes('cve')) {
          severity = 'high';
        } else if (text.includes('medium') || text.includes('vulnerability')) {
          severity = 'medium';
        } else if (text.includes('low') || text.includes('informational')) {
          severity = 'low';
        }
        return {
          url: r.url,
          title: r.title,
          snippet: r.snippet,
          source: r.source,
          severity,
        };
      });

    // Device / connected device results
    const deviceResults = [...bssidLocationData.slice(3), ...combinedData]
      .filter((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        return (
          text.includes('device') ||
          text.includes('client') ||
          text.includes('connected') ||
          text.includes('station') ||
          text.includes('probe')
        );
      })
      .slice(0, 6)
      .map((r) => ({
        url: r.url,
        title: r.title,
        snippet: r.snippet,
        source: r.source,
      }));

    // Data leak detection with severity
    const allLeakData = [...leakData, ...ssidLeakData];
    const leakKeywords = [
      'leak', 'breach', 'exposed', 'vulnerability', 'exploit', 'hacked',
      'compromised', 'cve', 'malware', 'default password', 'backdoor',
      'credential', 'password', 'sniffing', 'evil twin', 'rogue ap',
    ];

    const dataLeaks = allLeakData
      .filter((r) =>
        leakKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k))
      )
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';

        if (text.includes('evil twin') || text.includes('rogue ap') || text.includes('malware')) {
          severity = 'critical';
          type = 'WiFi Attack / Malware';
        } else if (text.includes('exploit') || text.includes('cve') || text.includes('backdoor') || text.includes('rce')) {
          severity = 'critical';
          type = 'Known Exploit / Vulnerability';
        } else if (text.includes('default password') || text.includes('default credential')) {
          severity = 'high';
          type = 'Default Credential Exposure';
        } else if (text.includes('breach') || text.includes('hacked') || text.includes('compromised')) {
          severity = 'high';
          type = 'Data Breach / Compromise';
        } else if (text.includes('sniffing') || text.includes('credential') || text.includes('password')) {
          severity = 'high';
          type = 'Credential Exposure';
        } else if (text.includes('vulnerability')) {
          severity = 'high';
          type = 'Security Vulnerability';
        } else if (text.includes('exposed') || text.includes('exposure')) {
          severity = 'medium';
          type = 'Data Exposure';
        }

        return {
          type,
          severity,
          source: r.source,
          description: r.snippet.substring(0, 250),
          url: r.url,
        };
      });

    // Combined search results for return
    const searchResultsCombined = [
      ...bssidLocationData.slice(0, 3).map((r) => ({ ...r, category: 'BSSID Location' })),
      ...ouiManufacturerData.slice(0, 3).map((r) => ({ ...r, category: 'OUI Manufacturer' })),
      ...ssidNetworkData.slice(0, 3).map((r) => ({ ...r, category: 'SSID Network' })),
      ...securityData.slice(0, 2).map((r) => ({ ...r, category: 'Security' })),
      ...ssidSecurityData.slice(0, 2).map((r) => ({ ...r, category: 'SSID Security' })),
      ...combinedData.slice(0, 2).map((r) => ({ ...r, category: 'Combined' })),
    ];

    // Comprehensive AI analysis
    const allContext = [
      ...bssidLocationData.slice(0, 3).map((r) => `[BSSID-LOCATION] ${r.title}: ${r.snippet}`),
      ...ouiManufacturerData.slice(0, 3).map((r) => `[OUI-MANUFACTURER] ${r.title}: ${r.snippet}`),
      ...vulnerabilityData.slice(0, 3).map((r) => `[VULNERABILITY] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map((r) => `[DATA-LEAK] ${r.title}: ${r.snippet}`),
      ...securityData.slice(0, 3).map((r) => `[SECURITY] ${r.title}: ${r.snippet}`),
      ...ssidNetworkData.slice(0, 3).map((r) => `[SSID-NETWORK] ${r.title}: ${r.snippet}`),
      ...ssidSecurityData.slice(0, 2).map((r) => `[SSID-SECURITY] ${r.title}: ${r.snippet}`),
      ...ssidLeakData.slice(0, 2).map((r) => `[SSID-LEAK] ${r.title}: ${r.snippet}`),
      ...combinedData.slice(0, 2).map((r) => `[COMBINED] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in WiFi network intelligence, wireless security assessment, and access point investigation.
Analyze the WiFi access point data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 📡 WIFI ACCESS POINT ANALYSIS
- SSID analysis (naming conventions, hidden network detection, SSID cloaking)
- BSSID breakdown and MAC address structure
- Network type classification (infrastructure/ad-hoc/mesh)
- Estimated network purpose and deployment type

## 🏭 OUI & MANUFACTURER INTELLIGENCE
- Identified manufacturer from OUI lookup
- Device model identification based on OUI assignment
- Known product lines and firmware versions
- Manufacturer security track record

## 📍 LOCATION INTELLIGENCE
- BSSID geolocation data and accuracy
- Access point placement and coverage area
- Physical location inference
- Network density and nearby APs

## 🔐 NETWORK SECURITY ASSESSMENT
- Encryption type and security posture (WPA2/WPA3/Open)
- Authentication method analysis
- Known weak configurations for this device type
- WPS vulnerability assessment
- Rogue AP / Evil Twin risk indicators

## 🚨 VULNERABILITY & EXPLOIT INTELLIGENCE
- Known CVEs for this router/AP model
- Firmware vulnerabilities and outdated versions
- Default credential risks
- Wireless protocol exploits (KRACK, Dragonblood, etc.)
- Management interface exposure

## 📱 CONNECTED DEVICE INTELLIGENCE
- Client device enumeration hints
- Connected device type analysis
- Data leak indicators from connected devices
- Network traffic pattern analysis

## 🛡️ SECURITY RECOMMENDATIONS
- Immediate security hardening steps
- Firmware update recommendations
- Configuration best practices
- Network monitoring suggestions
- Risk level assessment (LOW/MEDIUM/HIGH/CRITICAL)

Be thorough and specific. Include all findings from the data. Use emojis for section headers. Note that this is for authorized security research only.`,
          `Analyze WiFi access point:
SSID: ${ssid || 'N/A'}
BSSID: ${normalizedBSSID || 'N/A'}
OUI: ${oui || 'N/A'}
Manufacturer: ${ouiManufacturer}
Device Type: ${ouiDeviceType}
Encryption: ${encryption}
Frequency: ${frequency}

Intelligence data:
${allContext}

Provide a complete WiFi access point OSINT intelligence report.`
        )
      : 'No intelligence data available for this WiFi access point.';

    return NextResponse.json({
      success: true,
      ssid: ssid || null,
      bssid: normalizedBSSID || null,
      ouiInfo: {
        oui: oui || null,
        manufacturer: ouiManufacturer,
      },
      networkInfo: {
        encryption,
        channel,
        signalStrength,
        frequency,
      },
      locationResults,
      securityResults,
      vulnerabilityResults,
      deviceResults,
      dataLeaks,
      leakCount: dataLeaks.length,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
