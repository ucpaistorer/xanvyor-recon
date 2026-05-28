import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// ============================================================
// Country code detection mapping
// ============================================================
const COUNTRY_MAP: Array<{ prefix: string; code: string; country: string }> = [
  { prefix: '62', code: '+62', country: 'Indonesia' },
  { prefix: '1', code: '+1', country: 'United States/Canada' },
  { prefix: '44', code: '+44', country: 'United Kingdom' },
  { prefix: '86', code: '+86', country: 'China' },
  { prefix: '91', code: '+91', country: 'India' },
  { prefix: '81', code: '+81', country: 'Japan' },
  { prefix: '82', code: '+82', country: 'South Korea' },
  { prefix: '60', code: '+60', country: 'Malaysia' },
  { prefix: '66', code: '+66', country: 'Thailand' },
  { prefix: '84', code: '+84', country: 'Vietnam' },
  { prefix: '63', code: '+63', country: 'Philippines' },
  { prefix: '65', code: '+65', country: 'Singapore' },
  { prefix: '49', code: '+49', country: 'Germany' },
  { prefix: '33', code: '+33', country: 'France' },
  { prefix: '55', code: '+55', country: 'Brazil' },
  { prefix: '7', code: '+7', country: 'Russia' },
  { prefix: '61', code: '+61', country: 'Australia' },
  { prefix: '880', code: '+880', country: 'Bangladesh' },
  { prefix: '234', code: '+234', country: 'Nigeria' },
  { prefix: '27', code: '+27', country: 'South Africa' },
  { prefix: '39', code: '+39', country: 'Italy' },
  { prefix: '34', code: '+34', country: 'Spain' },
  { prefix: '52', code: '+52', country: 'Mexico' },
  { prefix: '20', code: '+20', country: 'Egypt' },
  { prefix: '971', code: '+971', country: 'UAE' },
  { prefix: '966', code: '+966', country: 'Saudi Arabia' },
  { prefix: '90', code: '+90', country: 'Turkey' },
  { prefix: '31', code: '+31', country: 'Netherlands' },
  { prefix: '46', code: '+46', country: 'Sweden' },
  { prefix: '47', code: '+47', country: 'Norway' },
];

// Indonesian carrier prefix mapping
const CARRIER_MAP: Record<string, string> = {
  '811': 'Telkomsel', '812': 'Telkomsel', '813': 'Telkomsel',
  '821': 'Telkomsel', '822': 'Telkomsel', '823': 'Telkomsel',
  '851': 'Telkomsel', '852': 'Telkomsel', '853': 'Telkomsel',
  '814': 'Indosat Ooredoo', '815': 'Indosat Ooredoo', '816': 'Indosat Ooredoo',
  '855': 'Indosat Ooredoo', '856': 'Indosat Ooredoo', '857': 'Indosat Ooredoo',
  '817': 'XL Axiata', '818': 'XL Axiata', '819': 'XL Axiata', '859': 'XL Axiata',
  '854': 'Three (3)', '858': 'Three (3)',
  '838': 'Tri (3)', '831': 'Tri (3)', '832': 'Tri (3)', '833': 'Tri (3)',
  '825': 'Smartfren', '826': 'Smartfren', '827': 'Smartfren', '828': 'Smartfren',
  '877': 'Byru', '878': 'Byru',
};

// Comprehensive app/service list for detection
const APP_REGISTRY = [
  { name: 'WhatsApp', icon: '💬', category: 'Messaging', detectHint: 'whatsapp' },
  { name: 'Telegram', icon: '✈️', category: 'Messaging', detectHint: 'telegram' },
  { name: 'Signal', icon: '🔒', category: 'Messaging', detectHint: 'signal' },
  { name: 'Line', icon: '💚', category: 'Messaging', detectHint: 'line' },
  { name: 'Viber', icon: '📞', category: 'Messaging', detectHint: 'viber' },
  { name: 'WeChat', icon: '🟢', category: 'Messaging', detectHint: 'wechat' },
  { name: 'Messenger', icon: '💬', category: 'Messaging', detectHint: 'messenger' },
  { name: 'Facebook', icon: '👤', category: 'Social Media', detectHint: 'facebook' },
  { name: 'Instagram', icon: '📸', category: 'Social Media', detectHint: 'instagram' },
  { name: 'Twitter/X', icon: '🐦', category: 'Social Media', detectHint: 'twitter' },
  { name: 'TikTok', icon: '🎵', category: 'Social Media', detectHint: 'tiktok' },
  { name: 'LinkedIn', icon: '💼', category: 'Professional', detectHint: 'linkedin' },
  { name: 'Snapchat', icon: '👻', category: 'Social Media', detectHint: 'snapchat' },
  { name: 'YouTube', icon: '▶️', category: 'Media', detectHint: 'youtube' },
  { name: 'Spotify', icon: '🎧', category: 'Media', detectHint: 'spotify' },
  { name: 'Grab', icon: '🚗', category: 'Services', detectHint: 'grab' },
  { name: 'Gojek', icon: '🏍️', category: 'Services', detectHint: 'gojek' },
  { name: 'Shopee', icon: '🛒', category: 'E-Commerce', detectHint: 'shopee' },
  { name: 'Tokopedia', icon: '🛍️', category: 'E-Commerce', detectHint: 'tokopedia' },
  { name: 'Lazada', icon: '🛍️', category: 'E-Commerce', detectHint: 'lazada' },
  { name: 'Dana', icon: '💰', category: 'Finance', detectHint: 'dana' },
  { name: 'OVO', icon: '💳', category: 'Finance', detectHint: 'ovo' },
  { name: 'Gopay', icon: '💵', category: 'Finance', detectHint: 'gopay' },
  { name: 'BCA Mobile', icon: '🏦', category: 'Banking', detectHint: 'bca' },
  { name: 'Mandiri', icon: '🏦', category: 'Banking', detectHint: 'mandiri' },
  { name: 'BNI Mobile', icon: '🏦', category: 'Banking', detectHint: 'bni' },
  { name: 'BRI Mobile', icon: '🏦', category: 'Banking', detectHint: 'bri' },
  { name: 'Jenius', icon: '🏦', category: 'Banking', detectHint: 'jenius' },
  { name: 'Google', icon: '🔍', category: 'Tech', detectHint: 'google' },
  { name: 'Apple ID', icon: '🍎', category: 'Tech', detectHint: 'apple' },
  { name: 'Microsoft', icon: '🪟', category: 'Tech', detectHint: 'microsoft' },
  { name: 'Truecaller', icon: '📱', category: 'Caller ID', detectHint: 'truecaller' },
  { name: 'GetContact', icon: '📒', category: 'Contact', detectHint: 'getcontact' },
  { name: 'PayPal', icon: '💳', category: 'Finance', detectHint: 'paypal' },
  { name: 'Amazon', icon: '📦', category: 'E-Commerce', detectHint: 'amazon' },
  { name: 'Netflix', icon: '🎬', category: 'Media', detectHint: 'netflix' },
  { name: 'Discord', icon: '🎮', category: 'Messaging', detectHint: 'discord' },
  { name: 'Pinterest', icon: '📌', category: 'Social Media', detectHint: 'pinterest' },
  { name: 'Reddit', icon: '🔴', category: 'Social Media', detectHint: 'reddit' },
  { name: 'Uber', icon: '🚕', category: 'Services', detectHint: 'uber' },
  { name: 'Bolt', icon: '⚡', category: 'Services', detectHint: 'bolt' },
  { name: 'Waze', icon: '🗺️', category: 'Navigation', detectHint: 'waze' },
  { name: 'Foodpanda', icon: '🐼', category: 'Food Delivery', detectHint: 'foodpanda' },
];

// ============================================================
// Helper: Detect country from cleaned phone number
// ============================================================
function detectCountry(cleaned: string): { countryCode: string; country: string } {
  // Indonesian local format (08xx) - check first
  if (cleaned.startsWith('08') && cleaned.length >= 10 && cleaned.length <= 15) {
    return { countryCode: '+62', country: 'Indonesia' };
  }
  // Sort by prefix length descending so longer prefixes match first (e.g. 880 before 8)
  const sorted = [...COUNTRY_MAP].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const entry of sorted) {
    if (cleaned.startsWith(entry.prefix)) {
      return { countryCode: entry.code, country: entry.country };
    }
  }
  return { countryCode: '+?', country: 'Unknown' };
}

// ============================================================
// Helper: Detect carrier from phone number
// ============================================================
function detectCarrier(cleaned: string, countryCode: string): { carrier: string; numberType: string } {
  if (countryCode === '+62') {
    const afterCode = cleaned.startsWith('08') ? cleaned.substring(1) : cleaned.substring(2);
    if (afterCode.startsWith('8') && afterCode.length >= 3) {
      const prefix = afterCode.substring(0, 3);
      for (const [key, value] of Object.entries(CARRIER_MAP)) {
        if (prefix === key) return { carrier: value, numberType: 'Mobile' };
      }
    }
    return { carrier: 'Unknown (Indonesian)', numberType: 'Mobile' };
  }
  if (countryCode === '+1') return { carrier: 'US/Canada Carrier', numberType: 'Mobile' };
  if (countryCode === '+44') return { carrier: 'UK Carrier', numberType: 'Mobile' };
  if (countryCode === '+86') return { carrier: 'China Carrier', numberType: 'Mobile' };
  if (countryCode === '+91') return { carrier: 'India Carrier', numberType: 'Mobile' };
  if (countryCode === '+81') return { carrier: 'Japan Carrier', numberType: 'Mobile' };
  if (countryCode === '+82') return { carrier: 'South Korea Carrier', numberType: 'Mobile' };
  return { carrier: 'Local Carrier', numberType: 'Mobile' };
}

// ============================================================
// Helper: Get phone variants for broader search coverage
// ============================================================
function getPhoneVariants(cleaned: string, countryCode: string): { local: string; international: string; formatted: string } {
  if (countryCode === '+62' && cleaned.startsWith('62')) {
    const local = '0' + cleaned.substring(2);
    return {
      local,
      international: '+' + cleaned,
      formatted: `${local.substring(0, 3)}-${local.substring(3, 7)}-${local.substring(7)}`,
    };
  }
  if (countryCode === '+62' && cleaned.startsWith('08')) {
    return {
      local: cleaned,
      international: '+62' + cleaned.substring(1),
      formatted: `${cleaned.substring(0, 3)}-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`,
    };
  }
  return {
    local: cleaned,
    international: '+' + cleaned,
    formatted: cleaned,
  };
}

// ============================================================
// Helper: Parse raw search results into uniform format
// ============================================================
function parseResults(results: unknown[]): Array<{ url: string; title: string; snippet: string; domain: string }> {
  return results.map((r: unknown) => {
    const result = r as Record<string, unknown>;
    return {
      url: (result.url as string) || '',
      title: (result.title as string) || (result.name as string) || '',
      snippet: (result.snippet as string) || '',
      domain: result.url ? new URL(result.url as string).hostname.replace('www.', '') : (result.host_name as string) || '',
    };
  }).filter((r) => r.title || r.snippet);
}

// ============================================================
// Helper: Detect device type & OS from combined search text
// ============================================================
function detectDeviceFromText(text: string): { likelyDeviceType: string; likelyOS: string; confidence: string; detectedModels: string[] } {
  const t = text.toLowerCase();
  const models: string[] = [];

  // OS detection
  let os = 'Unknown';
  let osConfidence = 0;
  if (t.includes('iphone') || t.includes('ios') || t.includes('ipad') || t.includes('apple')) { os = 'iOS'; osConfidence = 3; }
  if (t.includes('android') || t.includes('samsung') || t.includes('xiaomi') || t.includes('oppo') || t.includes('vivo') || t.includes('realme') || t.includes('huawei') || t.includes('oneplus') || t.includes('pixel')) { os = 'Android'; osConfidence = Math.max(osConfidence, 2); }
  if (t.includes('kaios') || t.includes('feature phone') || t.includes('button phone') || t.includes('nokia 1')) { os = 'KaiOS'; osConfidence = 1; }
  if (t.includes('windows phone') || t.includes('windows mobile')) { os = 'Windows Phone'; osConfidence = 1; }
  if (t.includes('harmonyos') || t.includes('harmony os')) { os = 'HarmonyOS'; osConfidence = 2; }

  // Device type detection
  let deviceType = 'Smartphone';
  let deviceConfidence = 0;
  if (t.includes('tablet') || t.includes('ipad')) { deviceType = 'Tablet'; deviceConfidence = 2; }
  if (t.includes('feature phone') || t.includes('button phone') || t.includes('dumb phone') || t.includes('flip phone')) { deviceType = 'Feature Phone'; deviceConfidence = 2; }
  if (t.includes('smartwatch') || t.includes('apple watch') || t.includes('galaxy watch') || t.includes('wearable')) { deviceType = 'Smartwatch'; deviceConfidence = 2; }
  if (t.includes('dongle') || t.includes('modem') || t.includes('hotspot') || t.includes('mifi')) { deviceType = 'Mobile Hotspot/Dongle'; deviceConfidence = 2; }
  if (t.includes('smartphone') || t.includes('mobile phone') || t.includes('handphone') || t.includes('hp android') || t.includes('hp iphone')) { deviceType = 'Smartphone'; deviceConfidence = 2; }

  // Model detection
  const modelPatterns = [
    /iphone\s*(1[0-5]|9|8|7|6|5|se|xr|xs|pro|max|plus|mini)/gi,
    /samsung\s*(galaxy\s*(?:s[0-9]+|note[0-9]+|a[0-9]+|m[0-9]+|j[0-9]+|z\s*flip|z\s*fold))/gi,
    /xiaomi\s*(redmi\s*note?\s*[0-9]+|mi\s*[0-9]+|poco\s*[a-z0-9]+)/gi,
    /oppo\s*(find\s*x|reno\s*[0-9]+|a[0-9]+|f[0-9]+|reno[0-9a-z]*)/gi,
    /vivo\s*(v[0-9]+|y[0-9]+|x[0-9]+|iqoo)/gi,
    /realme\s*(c[0-9]+|narzo|gt|x[0-9]+)/gi,
    /huawei\s*(p[0-9]+|mate\s*[0-9]+|nova|honor|y[0-9]+)/gi,
    /oneplus\s*[0-9]+/gi,
    /pixel\s*[0-9]+/gi,
    /nokia\s*[0-9.]+/gi,
    /infinix\s*(hot|note|smart|zero)/gi,
    /tecno\s*(spark|camon|pop|phantom)/gi,
    /itel\s*[a-z0-9]+/gi,
    /redmi\s*[0-9]+/gi,
    /samsung\s*galaxy\s*\w+/gi,
  ];

  for (const pattern of modelPatterns) {
    const matches = t.matchAll(pattern);
    for (const match of matches) {
      const m = match[0].trim();
      if (m && !models.includes(m)) {
        models.push(m);
      }
    }
  }

  // Confidence
  let confidence = 'low';
  if (osConfidence >= 3 || deviceConfidence >= 2) confidence = 'high';
  else if (osConfidence >= 2 || deviceConfidence >= 1) confidence = 'medium';

  return {
    likelyDeviceType: deviceType,
    likelyOS: os,
    confidence,
    detectedModels: models.slice(0, 10),
  };
}

// ============================================================
// Helper: Detect apps from combined search text
// ============================================================
function detectApps(
  allText: string,
  appResults: Array<{ snippet: string; title: string; domain: string }>,
  socialResults: Array<{ snippet: string; title: string; domain: string }>,
): Array<{ name: string; icon: string; category: string; detected: boolean; confidence: string; lastSeen?: string }> {
  return APP_REGISTRY.map(app => {
    const hints = [app.detectHint, app.name.toLowerCase()];
    const detected =
      hints.some(hint => allText.includes(hint)) ||
      appResults.some(r =>
        r.snippet.toLowerCase().includes(app.detectHint) ||
        r.title.toLowerCase().includes(app.detectHint) ||
        r.domain.toLowerCase().includes(app.detectHint)
      ) ||
      socialResults.some(r =>
        r.snippet.toLowerCase().includes(app.detectHint) ||
        r.domain.toLowerCase().includes(app.detectHint)
      );

    // Try to extract last seen info
    let lastSeen: string | undefined;
    const lastSeenPattern = new RegExp(`${app.detectHint}[^.]*?(?:last seen|terakhir dilihat|active|aktif|login|terakhir)\\s*[:\\-]?\\s*([\\w\\s,]+?)`, 'i');
    const lastSeenMatch = allText.match(lastSeenPattern);
    if (lastSeenMatch) {
      lastSeen = lastSeenMatch[1].trim().substring(0, 50);
    }

    return {
      name: app.name,
      icon: app.icon,
      category: app.category,
      detected,
      confidence: detected ? 'high' : 'unknown',
      ...(lastSeen && { lastSeen }),
    };
  });
}

// ============================================================
// Helper: Detect connected devices from search text
// ============================================================
function detectConnectedDevices(text: string): Array<{
  platform: string;
  device: string;
  os: string;
  lastActive: string;
  confidence: string;
}> {
  const devices: Array<{
    platform: string;
    device: string;
    os: string;
    lastActive: string;
    confidence: string;
  }> = [];
  const t = text.toLowerCase();

  // WhatsApp linked devices
  if (t.includes('whatsapp web') || t.includes('whatsapp desktop') || t.includes('whatsapp linked')) {
    devices.push({
      platform: 'WhatsApp',
      device: 'WhatsApp Web/Desktop',
      os: 'Cross-platform',
      lastActive: 'Unknown',
      confidence: 'medium',
    });
  }

  // Telegram sessions
  if (t.includes('telegram session') || t.includes('telegram desktop') || t.includes('telegram web')) {
    devices.push({
      platform: 'Telegram',
      device: 'Telegram Desktop/Web',
      os: 'Cross-platform',
      lastActive: 'Unknown',
      confidence: 'medium',
    });
  }

  // iPhone detection
  if (t.includes('iphone')) {
    devices.push({
      platform: 'Apple',
      device: 'iPhone',
      os: 'iOS',
      lastActive: 'Unknown',
      confidence: 'medium',
    });
  }

  // Android detection
  if (t.includes('android')) {
    const androidBrands = ['samsung', 'xiaomi', 'oppo', 'vivo', 'realme', 'huawei', 'oneplus', 'pixel', 'infinix', 'tecno'];
    let brand = 'Android Device';
    for (const b of androidBrands) {
      if (t.includes(b)) {
        brand = b.charAt(0).toUpperCase() + b.slice(1);
        break;
      }
    }
    devices.push({
      platform: 'Google/Android',
      device: brand,
      os: 'Android',
      lastActive: 'Unknown',
      confidence: 'medium',
    });
  }

  // iPad detection
  if (t.includes('ipad')) {
    devices.push({
      platform: 'Apple',
      device: 'iPad',
      os: 'iPadOS',
      lastActive: 'Unknown',
      confidence: 'medium',
    });
  }

  // Windows detection
  if (t.includes('windows') && !t.includes('windows phone')) {
    devices.push({
      platform: 'Microsoft',
      device: 'Windows PC',
      os: 'Windows',
      lastActive: 'Unknown',
      confidence: 'low',
    });
  }

  // Mac detection
  if (t.includes('macbook') || t.includes('mac os') || t.includes('macos')) {
    devices.push({
      platform: 'Apple',
      device: 'Mac',
      os: 'macOS',
      lastActive: 'Unknown',
      confidence: 'low',
    });
  }

  return devices.slice(0, 8);
}

// ============================================================
// Helper: Build data leak results
// ============================================================
function buildDataLeaks(leakResults: Array<{ title: string; snippet: string; domain: string; url: string }>): Array<{
  type: string;
  severity: string;
  source: string;
  description: string;
  url: string;
}> {
  const leakKeywords = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'password', 'data bocor', 'hacked', 'compromised', 'dumped', 'paste', 'credential', 'phishing', 'scam', 'fraud'];
  return leakResults
    .filter(r => leakKeywords.some(k => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
    .map(r => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      let severity: string = 'medium';
      let type = 'Data Exposure';
      if (text.includes('ktp') || text.includes('identitas') || text.includes('identity') || text.includes('kk ')) { severity = 'critical'; type = 'Identity Document Leak'; }
      else if (text.includes('password') || text.includes('credential')) { severity = 'critical'; type = 'Credential Leak'; }
      else if (text.includes('phishing') || text.includes('scam') || text.includes('fraud')) { severity = 'high'; type = 'Phishing/Fraud'; }
      else if (text.includes('breach')) { severity = 'high'; type = 'Data Breach'; }
      else if (text.includes('phone') || text.includes('mobile') || text.includes('nomor hp')) { severity = 'medium'; type = 'Phone Number Exposure'; }
      else if (text.includes('email') || text.includes('surat')) { severity = 'medium'; type = 'Email Exposure'; }
      return { type, severity, source: r.domain, description: r.snippet.substring(0, 200), url: r.url };
    });
}

// ============================================================
// Main POST handler
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = body;

    if (!phone || typeof phone !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Phone number is required' },
        { status: 400 }
      );
    }

    // Clean the phone number
    const cleaned = phone.replace(/[\s\-\(\)\+\.]/g, '');

    if (!/^\d{6,15}$/.test(cleaned)) {
      return NextResponse.json(
        { success: false, error: 'Invalid phone number format. Only digits (6-15) are accepted.' },
        { status: 400 }
      );
    }

    // Detect country & carrier
    const countryInfo = detectCountry(cleaned);
    const carrierInfo = detectCarrier(cleaned, countryInfo.countryCode);

    // Get phone variants for better search coverage
    const variants = getPhoneVariants(cleaned, countryInfo.countryCode);

    // ============================================================
    // Sequential web searches
    // ============================================================
    const [
      deviceResults,
      appResults,
      leakResults,
      securityResults,
    ] = await sequentialWebSearch([
      { query: `"${phone}" OR "${variants.local}" device type phone model IMEI smartphone tablet android iOS`, num: 5 },
      { query: `"${phone}" OR "${variants.local}" whatsapp telegram signal registered account device social media`, num: 5 },
      { query: `"${phone}" OR "${variants.local}" data breach leak exposed compromised device info password`, num: 5 },
      { query: `"${phone}" OR "${variants.local}" two factor authentication 2FA security account verification`, num: 5 },
    ], 800);

    // Parse all results
    const deviceData = parseResults(deviceResults);
    const appData = parseResults(appResults);
    const leakData = parseResults(leakResults);
    const securityData = parseResults(securityResults);
    const imeiData = deviceData;
    const phoneModelData = deviceData;
    const osData = deviceData;
    const accountData = appData;

    // ============================================================
    // Combine all text for detection
    // ============================================================
    const allSearchText = [
      ...deviceData, ...appData, ...leakData, ...securityData,
    ].map(r => `${r.title} ${r.snippet} ${r.domain}`.toLowerCase()).join(' ');

    // ============================================================
    // Device info detection
    // ============================================================
    const deviceInfo = detectDeviceFromText(allSearchText);

    // ============================================================
    // Registered apps detection
    // ============================================================
    const registeredApps = detectApps(allSearchText, appData, accountData);

    // ============================================================
    // Connected devices detection
    // ============================================================
    const connectedDevices = detectConnectedDevices(allSearchText);

    // ============================================================
    // IMEI info from search results
    // ============================================================
    const imeiInfo = imeiData
      .filter(r => {
        const t = `${r.title} ${r.snippet}`.toLowerCase();
        return t.includes('imei') || t.includes('serial') || t.includes('device id') || t.includes('device info') || t.includes('hardware');
      })
      .slice(0, 10)
      .map(r => ({
        title: r.title,
        snippet: r.snippet,
        url: r.url,
        source: r.domain,
      }));

    // ============================================================
    // Account security assessment
    // ============================================================
    const securityText = securityData.map(r => `${r.title} ${r.snippet}`.toLowerCase()).join(' ');
    const leakText = leakData.map(r => `${r.title} ${r.snippet}`.toLowerCase()).join(' ');

    // 2FA detection
    let twoFactorEnabled: boolean | null = null;
    if (securityText.includes('2fa enabled') || securityText.includes('two-factor enabled') || securityText.includes('2fa active') || securityText.includes('otp verified')) {
      twoFactorEnabled = true;
    } else if (securityText.includes('no 2fa') || securityText.includes('without 2fa') || securityText.includes('2fa disabled') || securityText.includes('tanpa 2fa')) {
      twoFactorEnabled = false;
    }

    // Last password change
    let lastPasswordChange = 'Unknown';
    const pwdMatch = securityText.match(/(?:password|kata sandi)[^.]*(?:changed|updated|reset|diubah|diganti)\s*[:\-]?\s*([\w\s,]+)/i);
    if (pwdMatch) {
      lastPasswordChange = pwdMatch[1].trim().substring(0, 50);
    }

    // Compromised accounts
    const compromisedAccounts: string[] = [];
    const compromiseKeywords = ['compromised', 'hacked', 'breached', 'dibobol', 'diretas'];
    for (const app of APP_REGISTRY) {
      if (compromiseKeywords.some(k => leakText.includes(`${app.detectHint} ${k}`) || leakText.includes(`${k} ${app.detectHint}`))) {
        compromisedAccounts.push(app.name);
      }
    }

    // Security score (0-100)
    let securityScore = 70; // base score
    if (twoFactorEnabled === true) securityScore += 15;
    else if (twoFactorEnabled === false) securityScore -= 20;
    if (compromisedAccounts.length > 0) securityScore -= compromisedAccounts.length * 10;
    if (leakData.length > 3) securityScore -= 15;
    else if (leakData.length > 0) securityScore -= 5;
    securityScore = Math.max(0, Math.min(100, securityScore));

    // ============================================================
    // Data leaks
    // ============================================================
    const dataLeaks = buildDataLeaks(leakData);

    // ============================================================
    // AI Analysis - Comprehensive
    // ============================================================
    const allContext = [
      ...deviceData.slice(0, 4).map(r => `[DEVICE] ${r.title}: ${r.snippet}`),
      ...appData.slice(0, 4).map(r => `[APP] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map(r => `[LEAK] ${r.title}: ${r.snippet}`),
      ...securityData.slice(0, 3).map(r => `[SECURITY] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for phone device intelligence. Report with: ## 📱 DEVICE INTELLIGENCE ## 🔗 CONNECTED APPS & SERVICES ## 🔐 ACCOUNT SECURITY ## 📡 CONNECTED DEVICES ## 🚨 DATA LEAK ASSESSMENT ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `Phone: ${phone} | Country: ${countryInfo.country} | Carrier: ${carrierInfo.carrier} | Device: ${deviceInfo.likelyDeviceType} | OS: ${deviceInfo.likelyOS} | Models: ${deviceInfo.detectedModels.join(', ') || 'None'} | Apps: ${registeredApps.filter(a => a.detected).map(a => a.name).join(', ') || 'None'} | 2FA: ${twoFactorEnabled === null ? 'Unknown' : twoFactorEnabled} | Security: ${securityScore}/100 | Leaks: ${dataLeaks.length}

${allContext.substring(0, 1500)}`
        )
      : 'No device intelligence data available for this phone number.';

    // ============================================================
    // Build and return response
    // ============================================================
    return NextResponse.json({
      success: true,
      phone,
      analysis: {
        original: phone,
        cleaned,
        countryCode: countryInfo.countryCode,
        country: countryInfo.country,
        carrier: carrierInfo.carrier,
        numberType: carrierInfo.numberType,
      },
      deviceInfo,
      registeredApps,
      detectedAppCount: registeredApps.filter(a => a.detected).length,
      connectedDevices,
      imeiInfo,
      accountSecurity: {
        twoFactorEnabled,
        lastPasswordChange,
        compromisedAccounts,
        securityScore,
      },
      dataLeaks,
      leakCount: dataLeaks.length,
      deviceResults: deviceData.slice(0, 10),
      appResults: appData.slice(0, 10),
      securityResults: securityData.slice(0, 10),
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[phone-device] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
