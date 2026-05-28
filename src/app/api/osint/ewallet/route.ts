import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

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

// Indonesian e-wallet platforms with metadata
const EWALLET_PLATFORMS: Array<{
  platform: string;
  icon: string;
  category: string;
  searchTerms: string[];
}> = [
  { platform: 'Dana', icon: '💳', category: 'E-Wallet', searchTerms: ['dana', 'dana.id'] },
  { platform: 'OVO', icon: '🟣', category: 'E-Wallet', searchTerms: ['ovo', 'ovo.id'] },
  { platform: 'GoPay', icon: '🟢', category: 'E-Wallet', searchTerms: ['gopay', 'gopay.gojek'] },
  { platform: 'ShopeePay', icon: '🟠', category: 'E-Wallet', searchTerms: ['shopeepay', 'shopee pay'] },
  { platform: 'LinkAja', icon: '🔵', category: 'E-Wallet', searchTerms: ['linkaja', 'link aja'] },
  { platform: 'Sakuku', icon: '🟡', category: 'E-Wallet', searchTerms: ['sakuku', 'sakuku bca'] },
  { platform: 'iSaku', icon: '🔴', category: 'E-Wallet', searchTerms: ['isaku', 'i.saku'] },
  { platform: 'Doku', icon: '🔵', category: 'E-Wallet', searchTerms: ['doku', 'doku.id'] },
  { platform: 'Paytren', icon: '🟤', category: 'E-Wallet', searchTerms: ['paytren', 'paytren.id'] },
];

// Indonesian carrier detection
const CARRIER_PREFIXES: Record<string, { carrier: string; type: string }> = {
  '0811': { carrier: 'Telkomsel', type: 'Kartu Halo' },
  '0812': { carrier: 'Telkomsel', type: 'Kartu Halo' },
  '0813': { carrier: 'Telkomsel', type: 'Kartu Halo' },
  '0821': { carrier: 'Telkomsel', type: 'SimPATI' },
  '0822': { carrier: 'Telkomsel', type: 'SimPATI' },
  '0823': { carrier: 'Telkomsel', type: 'SimPATI' },
  '0851': { carrier: 'Telkomsel', type: 'SimPATI' },
  '0852': { carrier: 'Telkomsel', type: 'SimPATI' },
  '0853': { carrier: 'Telkomsel', type: 'SimPATI' },
  '0814': { carrier: 'Indosat', type: 'IM3' },
  '0815': { carrier: 'Indosat', type: 'Mentari' },
  '0816': { carrier: 'Indosat', type: 'Mentari' },
  '0855': { carrier: 'Indosat', type: 'IM3' },
  '0856': { carrier: 'Indosat', type: 'IM3' },
  '0857': { carrier: 'Indosat', type: 'IM3' },
  '0858': { carrier: 'Indosat', type: 'IM3' },
  '0817': { carrier: 'XL Axiata', type: 'XL' },
  '0818': { carrier: 'XL Axiata', type: 'XL' },
  '0819': { carrier: 'XL Axiata', type: 'XL' },
  '0859': { carrier: 'XL Axiata', type: 'XL' },
  '0877': { carrier: 'XL Axiata', type: 'XL' },
  '0878': { carrier: 'XL Axiata', type: 'XL' },
  '0831': { carrier: 'Axis', type: 'Axis' },
  '0832': { carrier: 'Axis', type: 'Axis' },
  '0833': { carrier: 'Axis', type: 'Axis' },
  '0838': { carrier: 'Axis', type: 'Axis' },
  '0895': { carrier: 'Tri (3)', type: '3' },
  '0896': { carrier: 'Tri (3)', type: '3' },
  '0897': { carrier: 'Tri (3)', type: '3' },
  '0898': { carrier: 'Tri (3)', type: '3' },
  '0899': { carrier: 'Tri (3)', type: '3' },
  '0881': { carrier: 'Smartfren', type: 'Smartfren' },
  '0882': { carrier: 'Smartfren', type: 'Smartfren' },
  '0883': { carrier: 'Smartfren', type: 'Smartfren' },
  '0884': { carrier: 'Smartfren', type: 'Smartfren' },
  '0885': { carrier: 'Smartfren', type: 'Smartfren' },
  '0886': { carrier: 'Smartfren', type: 'Smartfren' },
  '0887': { carrier: 'Smartfren', type: 'Smartfren' },
  '0888': { carrier: 'Smartfren', type: 'Smartfren' },
  '0889': { carrier: 'Smartfren', type: 'Smartfren' },
};

function detectCarrier(phone: string): { carrier: string; country: string } {
  const cleaned = phone.replace(/[^0-9]/g, '');
  // Indonesian local format (08xx) - check first
  if (cleaned.startsWith('08') && cleaned.length >= 10 && cleaned.length <= 15) {
    for (const [prefix, info] of Object.entries(CARRIER_PREFIXES)) {
      if (cleaned.startsWith(prefix)) {
        return { carrier: info.carrier, country: 'Indonesia' };
      }
    }
    return { carrier: 'Unknown (Indonesia)', country: 'Indonesia' };
  }
  // Indonesian international format (+62)
  if (cleaned.startsWith('62')) {
    const local = '0' + cleaned.slice(2);
    for (const [prefix, info] of Object.entries(CARRIER_PREFIXES)) {
      if (local.startsWith(prefix)) {
        return { carrier: info.carrier, country: 'Indonesia' };
      }
    }
    return { carrier: 'Unknown (Indonesia)', country: 'Indonesia' };
  }
  return { carrier: 'Unknown', country: 'Unknown' };
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.slice(3);
  } else if (cleaned.startsWith('62') && cleaned.length > 10) {
    cleaned = '0' + cleaned.slice(2);
  }
  return cleaned;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body as { phone?: string };

    if (!phone || phone.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhone(phone.trim());
    const carrierInfo = detectCarrier(normalizedPhone);

    // Build search queries for e-wallet detection
    const searchCalls: Array<{ query: string; num?: number }> = [
      { query: `"${normalizedPhone}" dana ovo gopay shopeepay registered account`, num: 10 },
      { query: `"${normalizedPhone}" e-wallet linkaja sakuku doku payment account`, num: 8 },
      { query: `"${normalizedPhone}" data leak breach exposed wallet`, num: 8 },
      { query: `"${normalizedPhone}" scam fraud penipu penipuan`, num: 8 },
    ];

    // Execute sequential web searches
    const searchResults = await sequentialWebSearch(searchCalls, 800);

    // Parse results
    const walletData = parseResults(searchResults[0] || []);
    const altWalletData = parseResults(searchResults[1] || []);
    const leakData = parseResults(searchResults[2] || []);
    const fraudData = parseResults(searchResults[3] || []);

    const allResults = [...walletData, ...altWalletData, ...leakData, ...fraudData];
    const allText = allResults.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();

    // Detect e-wallet presence for each platform
    const wallets: Array<{
      platform: string;
      icon: string;
      detected: boolean;
      accountName: string;
      balance: string;
      status: string;
      category: string;
    }> = [];

    for (const platform of EWALLET_PLATFORMS) {
      let detected = false;
      let accountName = 'Not found';
      let status = 'Not registered';

      // Check if platform is mentioned in search results
      const platformMentions = platform.searchTerms.some(
        (term) => allText.includes(term.toLowerCase())
      );

      if (platformMentions) {
        detected = true;
        status = 'Likely registered';

        // Try to extract account name from search results
        for (const result of [...walletData, ...altWalletData]) {
          const text = `${result.title} ${result.snippet}`.toLowerCase();
          if (platform.searchTerms.some((t) => text.includes(t.toLowerCase()))) {
            // Try to extract name
            const nameMatch = result.snippet.match(/(?:nama|name|account|akun)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,3})/);
            if (nameMatch) {
              accountName = nameMatch[1].trim();
              break;
            }
          }
        }

        if (accountName === 'Not found') {
          accountName = 'Registered (name hidden)';
        }
      }

      wallets.push({
        platform: platform.platform,
        icon: platform.icon,
        detected,
        accountName,
        balance: detected ? 'Access restricted' : 'N/A',
        status,
        category: platform.category,
      });
    }

    // Check for fraud/scam reports
    const fraudKeywords = ['scam', 'fraud', 'penipu', 'penipuan', 'penipuan online', 'nakal', 'hapus'];
    const isFraudReported = fraudData.some((r) => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      return fraudKeywords.some((k) => text.includes(k));
    });

    // Data leak detection
    const leakKeywords = ['leak', 'breach', 'exposed', 'dijual', 'dijualkan', 'data bocor', 'hack'];
    const dataLeaks = [...leakData, ...fraudData]
      .filter((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        return leakKeywords.some((k) => text.includes(k));
      })
      .map((r) => ({
        type: 'Data Exposure',
        severity: r.snippet.toLowerCase().includes('hack') || r.snippet.toLowerCase().includes('breach') ? 'high' as const : 'medium' as const,
        source: r.source,
        description: r.snippet.substring(0, 250),
        url: r.url,
      }));

    // Risk assessment
    const detectedCount = wallets.filter((w) => w.detected).length;
    let riskLevel = 'Low';
    if (isFraudReported) riskLevel = 'High';
    else if (dataLeaks.length > 2) riskLevel = 'High';
    else if (dataLeaks.length > 0) riskLevel = 'Medium';
    else if (detectedCount > 4) riskLevel = 'Medium';

    // Comprehensive AI analysis
    const allContext = [
      ...walletData.slice(0, 4).map((r) => `[WALLET] ${r.title}: ${r.snippet}`),
      ...altWalletData.slice(0, 3).map((r) => `[ALT-WALLET] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map((r) => `[DATA-LEAK] ${r.title}: ${r.snippet}`),
      ...fraudData.slice(0, 3).map((r) => `[FRAUD] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const walletSummary = wallets
      .map((w) => `${w.detected ? '✅' : '❌'} ${w.platform} | ${w.status}`)
      .join('\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for e-wallet and digital payment intelligence. Report with: ## 💳 E-WALLET DETECTION OVERVIEW ## 🔍 CARRIER & IDENTITY ANALYSIS ## 🚨 DATA LEAK ASSESSMENT ## ⚠️ FRAUD & RISK ANALYSIS ## 🛡️ SECURITY RECOMMENDATIONS. Be concise, 2-3 lines per section.`,
          `Phone: ${normalizedPhone} | Carrier: ${carrierInfo.carrier} | Country: ${carrierInfo.country} | Risk: ${riskLevel}
Detected wallets: ${detectedCount}/${EWALLET_PLATFORMS.length} | Data leaks: ${dataLeaks.length} | Fraud reported: ${isFraudReported}

Wallet Detection Results:
${walletSummary}

Search Intelligence:
${allContext.substring(0, 1500)}`
        )
      : 'No e-wallet intelligence data available for this phone number.';

    return NextResponse.json({
      success: true,
      phone: normalizedPhone,
      analysis: {
        carrier: carrierInfo.carrier,
        country: carrierInfo.country,
      },
      wallets,
      detectedCount,
      riskLevel,
      dataLeaks,
      leakCount: dataLeaks.length,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
