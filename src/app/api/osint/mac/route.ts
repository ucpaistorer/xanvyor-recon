import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// MAC address validation: accepts AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF (case-insensitive)
const MAC_REGEX = /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/;

function validateMAC(mac: string): { valid: boolean; normalized: string; oui: string } {
  const trimmed = mac.trim();

  if (!MAC_REGEX.test(trimmed)) {
    return { valid: false, normalized: '', oui: '' };
  }

  // Normalize to uppercase with colon separators
  const normalized = trimmed.toUpperCase().replace(/-/g, ':');

  // Extract OUI (first 3 octets)
  const octets = normalized.split(':');
  const oui = `${octets[0]}:${octets[1]}:${octets[2]}`;

  return { valid: true, normalized, oui };
}

export async function POST(request: NextRequest) {
  try {
    const { mac } = await request.json();

    if (!mac) {
      return NextResponse.json(
        { success: false, error: 'MAC address is required' },
        { status: 400 }
      );
    }

    const validation = validateMAC(mac);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid MAC address format. Expected format: AA:BB:CC:DD:EE:FF or AA-BB-CC-DD-EE-FF',
        },
        { status: 400 }
      );
    }

    const { normalized, oui } = validation;

    // Sequential web searches to avoid rate limiting
    const [
      manufacturerResults,
      ouiRegistryResults,
      dataLeakResults,
      networkResults,
    ] = await sequentialWebSearch([
      { query: `OUI "${oui}" MAC address manufacturer vendor device type model hardware`, num: 5 },
      { query: `"${oui}" IEEE OUI registration database company assignment`, num: 5 },
      { query: `"${normalized}" OR "${oui}" data leak breach exposed IoT vulnerability router switch`, num: 5 },
      { query: `"${normalized}" OR "${oui}" network device access point`, num: 5 },
    ], 800);

    // Parse search results into uniform format
    const parseResults = (results: unknown[]) => {
      return (results as Array<Record<string, string>>).map((r) => ({
        url: r.url || '',
        title: r.name || '',
        snippet: r.snippet || '',
        source: r.host_name || '',
      })).filter((r) => r.title || r.snippet);
    };

    const manufacturerData = parseResults(manufacturerResults);
    const ouiData = parseResults(ouiRegistryResults);
    const leakData = parseResults(dataLeakResults);
    const networkData = parseResults(networkResults);
    const deviceData = manufacturerData;

    // Extract manufacturer from OUI search results
    const manufacturerText = [...manufacturerData, ...ouiData]
      .map((r) => `${r.title} ${r.snippet}`)
      .join(' ')
      .toLowerCase();

    // Common OUI manufacturer patterns
    const manufacturerPatterns: Array<{ pattern: string; name: string; deviceType: string }> = [
      { pattern: 'apple', name: 'Apple Inc.', deviceType: 'Consumer Electronics / Mobile' },
      { pattern: 'samsung', name: 'Samsung Electronics', deviceType: 'Consumer Electronics / Mobile' },
      { pattern: 'cisco', name: 'Cisco Systems', deviceType: 'Network Equipment' },
      { pattern: 'intel', name: 'Intel Corporation', deviceType: 'Network Adapter / Chipset' },
      { pattern: 'huawei', name: 'Huawei Technologies', deviceType: 'Network Equipment / Mobile' },
      { pattern: 'tp-link', name: 'TP-Link Technologies', deviceType: 'Router / Access Point' },
      { pattern: 'd-link', name: 'D-Link Corporation', deviceType: 'Router / Network Device' },
      { pattern: 'netgear', name: 'Netgear Inc.', deviceType: 'Router / Network Device' },
      { pattern: 'microsoft', name: 'Microsoft Corporation', deviceType: 'Computing Device' },
      { pattern: 'google', name: 'Google Inc.', deviceType: 'Smart Device / Chromecast' },
      { pattern: 'amazon', name: 'Amazon Technologies', deviceType: 'Smart Device / Echo' },
      { pattern: 'lg electronics', name: 'LG Electronics', deviceType: 'Consumer Electronics / Smart TV' },
      { pattern: 'sony', name: 'Sony Corporation', deviceType: 'Consumer Electronics / Gaming' },
      { pattern: 'qualcomm', name: 'Qualcomm Technologies', deviceType: 'Mobile Chipset' },
      { pattern: 'broadcom', name: 'Broadcom Inc.', deviceType: 'Network Chipset' },
      { pattern: 'realtek', name: 'Realtek Semiconductor', deviceType: 'Network Adapter' },
      { pattern: 'mediatek', name: 'MediaTek Inc.', deviceType: 'Mobile Chipset' },
      { pattern: 'espressif', name: 'Espressif Systems', deviceType: 'IoT Device / ESP32' },
      { pattern: 'shenzhen', name: 'Shenzhen Manufacturer', deviceType: 'IoT / Consumer Device' },
      { pattern: 'xiaomi', name: 'Xiaomi Inc.', deviceType: 'Consumer Electronics / Mobile' },
      { pattern: 'oppo', name: 'OPPO Electronics', deviceType: 'Mobile Device' },
      { pattern: 'oneplus', name: 'OnePlus Technology', deviceType: 'Mobile Device' },
      { pattern: 'ruijie', name: 'Ruijie Networks', deviceType: 'Network Equipment' },
      { pattern: 'hewlett', name: 'Hewlett Packard Enterprise', deviceType: 'Server / Workstation' },
      { pattern: 'dell', name: 'Dell Technologies', deviceType: 'Computing Device' },
      { pattern: 'lenovo', name: 'Lenovo Group', deviceType: 'Computing Device' },
      { pattern: 'asus', name: 'ASUSTeK Computer', deviceType: 'Router / Computing Device' },
      { pattern: 'ubiquiti', name: 'Ubiquiti Networks', deviceType: 'Access Point / Network' },
      { pattern: 'juniper', name: 'Juniper Networks', deviceType: 'Network Equipment' },
      { pattern: 'aruba', name: 'Aruba Networks', deviceType: 'Access Point / Network' },
    ];

    let manufacturer = 'Unknown';
    let deviceType = 'Unknown';

    for (const mp of manufacturerPatterns) {
      if (manufacturerText.includes(mp.pattern)) {
        manufacturer = mp.name;
        deviceType = mp.deviceType;
        break;
      }
    }

    // If manufacturer not found from patterns, try to extract from search results
    if (manufacturer === 'Unknown' && ouiData.length > 0) {
      for (const r of ouiData) {
        const match = r.snippet.match(/(?:assigned\s+to|vendor|company|manufacturer)[:\s]+([A-Z][A-Za-z0-9\s&.,]+?)(?:\s*[.\-,]|\s*$)/i);
        if (match && match[1].trim().length > 2 && match[1].trim().length < 60) {
          manufacturer = match[1].trim();
          break;
        }
      }
    }

    // Detect device type from network search results
    if (deviceType === 'Unknown' && networkData.length > 0) {
      const networkText = networkData.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
      if (networkText.includes('router')) deviceType = 'Router';
      else if (networkText.includes('switch')) deviceType = 'Network Switch';
      else if (networkText.includes('access point') || networkText.includes('ap ')) deviceType = 'Access Point';
      else if (networkText.includes('iot') || networkText.includes('smart')) deviceType = 'IoT Device';
      else if (networkText.includes('camera') || networkText.includes('cctv')) deviceType = 'IP Camera / CCTV';
      else if (networkText.includes('printer')) deviceType = 'Network Printer';
      else if (networkText.includes('phone') || networkText.includes('mobile')) deviceType = 'Mobile Device';
      else if (networkText.includes('laptop') || networkText.includes('notebook')) deviceType = 'Laptop';
      else if (networkText.includes('server')) deviceType = 'Server';
    }

    // Data leak detection with severity classification
    const leakKeywords = ['leak', 'breach', 'exposed', 'vulnerability', 'exploit', 'hacked', 'compromised', 'cve', 'malware', 'botnet', 'mirai', 'default password', 'backdoor'];
    const dataLeaks = leakData
      .filter((r) => leakKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';

        if (text.includes('malware') || text.includes('botnet') || text.includes('mirai')) {
          severity = 'critical';
          type = 'Malware/Botnet Infection';
        } else if (text.includes('exploit') || text.includes('cve') || text.includes('backdoor')) {
          severity = 'critical';
          type = 'Known Exploit/Vulnerability';
        } else if (text.includes('default password') || text.includes('default credential')) {
          severity = 'high';
          type = 'Default Credential Exposure';
        } else if (text.includes('breach')) {
          severity = 'high';
          type = 'Data Breach';
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

    // Combine all search results for return
    const searchResults = [
      ...manufacturerData.slice(0, 5).map((r) => ({ ...r, category: 'Manufacturer' })),
      ...deviceData.slice(0, 3).map((r) => ({ ...r, category: 'Device Info' })),
      ...ouiData.slice(0, 3).map((r) => ({ ...r, category: 'OUI Registry' })),
      ...networkData.slice(0, 3).map((r) => ({ ...r, category: 'Network' })),
    ];

    // Comprehensive AI analysis
    const allContext = [
      ...manufacturerData.slice(0, 4).map((r) => `[MANUFACTURER] ${r.title}: ${r.snippet}`),
      ...deviceData.slice(0, 3).map((r) => `[DEVICE] ${r.title}: ${r.snippet}`),
      ...ouiData.slice(0, 3).map((r) => `[OUI-REGISTRY] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map((r) => `[LEAK] ${r.title}: ${r.snippet}`),
      ...networkData.slice(0, 3).map((r) => `[NETWORK] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for MAC address & network device intelligence. Report with: ## 📋 MAC ADDRESS ANALYSIS ## 🏭 MANUFACTURER INTELLIGENCE ## 🖥️ DEVICE IDENTIFICATION ## 🚨 DATA LEAK & VULNERABILITY ## 🌐 NETWORK INTELLIGENCE ## 🔐 SECURITY ASSESSMENT ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `MAC: ${normalized} | OUI: ${oui} | Manufacturer: ${manufacturer} | Device: ${deviceType}

${allContext.substring(0, 1500)}`
        )
      : 'No intelligence data available for this MAC address.';

    return NextResponse.json({
      success: true,
      mac: normalized,
      oui,
      manufacturer,
      deviceType,
      dataLeaks,
      leakCount: dataLeaks.length,
      searchResults,
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
