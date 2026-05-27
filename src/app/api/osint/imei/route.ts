import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// ============================================================
// IMEI Validation using Luhn Algorithm
// ============================================================
function validateIMEI(imei: string): {
  valid: boolean;
  luhnCheck: boolean;
  checkDigit: string;
  calculatedCheckDigit: string;
} {
  // IMEI must be exactly 15 digits
  if (!/^\d{15}$/.test(imei)) {
    return { valid: false, luhnCheck: false, checkDigit: imei.slice(-1) || '', calculatedCheckDigit: '' };
  }

  const digits = imei.split('').map(Number);
  const checkDigit = digits[14];
  const calculatedCheckDigit = calculateLuhnCheckDigit(imei.substring(0, 14));
  const luhnCheck = checkDigit === calculatedCheckDigit;

  return {
    valid: luhnCheck,
    luhnCheck,
    checkDigit: String(checkDigit),
    calculatedCheckDigit: String(calculatedCheckDigit),
  };
}

// Calculate Luhn check digit from first 14 digits
function calculateLuhnCheckDigit(first14: string): number {
  const digits = first14.split('').map(Number);
  let sum = 0;

  for (let i = 0; i < 14; i++) {
    let digit = digits[i];
    // Double every second digit (positions 1, 3, 5, ... in 0-indexed = odd positions)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }

  return (10 - (sum % 10)) % 10;
}

// ============================================================
// IMEI Decomposition
// ============================================================
function decomposeIMEI(imei: string): {
  tac: string;
  fac: string;
  serialNumber: string;
  checkDigit: string;
  tacFull: string;
} {
  return {
    tac: imei.substring(0, 6),          // Type Allocation Code core (6 digits)
    fac: imei.substring(6, 8),           // Final Assembly Code (2 digits)
    tacFull: imei.substring(0, 8),       // Full TAC including FAC (8 digits)
    serialNumber: imei.substring(8, 14), // Serial number (6 digits)
    checkDigit: imei.substring(14, 15),  // Check digit (1 digit)
  };
}

// ============================================================
// Known TAC prefix mapping (brand identification)
// ============================================================
const TAC_BRAND_MAP: Array<{ prefix: string; brand: string; country: string }> = [
  // Apple
  { prefix: '012253', brand: 'Apple', country: 'USA' },
  { prefix: '012337', brand: 'Apple', country: 'USA' },
  { prefix: '013062', brand: 'Apple', country: 'USA' },
  { prefix: '013896', brand: 'Apple', country: 'USA' },
  { prefix: '014955', brand: 'Apple', country: 'USA' },
  { prefix: '352050', brand: 'Apple', country: 'USA' },
  { prefix: '353258', brand: 'Apple', country: 'USA' },
  { prefix: '353281', brand: 'Apple', country: 'USA' },
  { prefix: '353285', brand: 'Apple', country: 'USA' },
  { prefix: '353289', brand: 'Apple', country: 'USA' },
  { prefix: '353911', brand: 'Apple', country: 'USA' },
  { prefix: '358407', brand: 'Apple', country: 'USA' },
  { prefix: '359151', brand: 'Apple', country: 'USA' },
  // Samsung
  { prefix: '350901', brand: 'Samsung', country: 'South Korea' },
  { prefix: '351556', brand: 'Samsung', country: 'South Korea' },
  { prefix: '352099', brand: 'Samsung', country: 'South Korea' },
  { prefix: '352677', brand: 'Samsung', country: 'South Korea' },
  { prefix: '353179', brand: 'Samsung', country: 'South Korea' },
  { prefix: '353748', brand: 'Samsung', country: 'South Korea' },
  { prefix: '354836', brand: 'Samsung', country: 'South Korea' },
  { prefix: '355446', brand: 'Samsung', country: 'South Korea' },
  { prefix: '356120', brand: 'Samsung', country: 'South Korea' },
  { prefix: '356992', brand: 'Samsung', country: 'South Korea' },
  { prefix: '357125', brand: 'Samsung', country: 'South Korea' },
  { prefix: '357549', brand: 'Samsung', country: 'South Korea' },
  { prefix: '358187', brand: 'Samsung', country: 'South Korea' },
  // Xiaomi
  { prefix: '860120', brand: 'Xiaomi', country: 'China' },
  { prefix: '860282', brand: 'Xiaomi', country: 'China' },
  { prefix: '860946', brand: 'Xiaomi', country: 'China' },
  { prefix: '861029', brand: 'Xiaomi', country: 'China' },
  { prefix: '861162', brand: 'Xiaomi', country: 'China' },
  { prefix: '861342', brand: 'Xiaomi', country: 'China' },
  { prefix: '861382', brand: 'Xiaomi', country: 'China' },
  { prefix: '861700', brand: 'Xiaomi', country: 'China' },
  { prefix: '862399', brand: 'Xiaomi', country: 'China' },
  { prefix: '863298', brand: 'Xiaomi', country: 'China' },
  { prefix: '863736', brand: 'Xiaomi', country: 'China' },
  { prefix: '864317', brand: 'Xiaomi', country: 'China' },
  { prefix: '864918', brand: 'Xiaomi', country: 'China' },
  { prefix: '865414', brand: 'Xiaomi', country: 'China' },
  { prefix: '865717', brand: 'Xiaomi', country: 'China' },
  { prefix: '865980', brand: 'Xiaomi', country: 'China' },
  { prefix: '866268', brand: 'Xiaomi', country: 'China' },
  { prefix: '866856', brand: 'Xiaomi', country: 'China' },
  { prefix: '867112', brand: 'Xiaomi', country: 'China' },
  { prefix: '867316', brand: 'Xiaomi', country: 'China' },
  { prefix: '867596', brand: 'Xiaomi', country: 'China' },
  { prefix: '868005', brand: 'Xiaomi', country: 'China' },
  { prefix: '868320', brand: 'Xiaomi', country: 'China' },
  { prefix: '869029', brand: 'Xiaomi', country: 'China' },
  // OPPO
  { prefix: '860590', brand: 'OPPO', country: 'China' },
  { prefix: '861205', brand: 'OPPO', country: 'China' },
  { prefix: '862568', brand: 'OPPO', country: 'China' },
  { prefix: '863289', brand: 'OPPO', country: 'China' },
  { prefix: '864005', brand: 'OPPO', country: 'China' },
  { prefix: '864408', brand: 'OPPO', country: 'China' },
  { prefix: '866002', brand: 'OPPO', country: 'China' },
  { prefix: '866717', brand: 'OPPO', country: 'China' },
  { prefix: '867960', brand: 'OPPO', country: 'China' },
  // vivo
  { prefix: '860326', brand: 'vivo', country: 'China' },
  { prefix: '861454', brand: 'vivo', country: 'China' },
  { prefix: '862049', brand: 'vivo', country: 'China' },
  { prefix: '863123', brand: 'vivo', country: 'China' },
  { prefix: '864061', brand: 'vivo', country: 'China' },
  { prefix: '864752', brand: 'vivo', country: 'China' },
  { prefix: '865890', brand: 'vivo', country: 'China' },
  { prefix: '866319', brand: 'vivo', country: 'China' },
  { prefix: '867559', brand: 'vivo', country: 'China' },
  { prefix: '868510', brand: 'vivo', country: 'China' },
  // Huawei
  { prefix: '012238', brand: 'Huawei', country: 'China' },
  { prefix: '352811', brand: 'Huawei', country: 'China' },
  { prefix: '353411', brand: 'Huawei', country: 'China' },
  { prefix: '354902', brand: 'Huawei', country: 'China' },
  { prefix: '355697', brand: 'Huawei', country: 'China' },
  { prefix: '356498', brand: 'Huawei', country: 'China' },
  { prefix: '357078', brand: 'Huawei', country: 'China' },
  { prefix: '358021', brand: 'Huawei', country: 'China' },
  { prefix: '860038', brand: 'Huawei', country: 'China' },
  { prefix: '860749', brand: 'Huawei', country: 'China' },
  { prefix: '861182', brand: 'Huawei', country: 'China' },
  { prefix: '861980', brand: 'Huawei', country: 'China' },
  { prefix: '862448', brand: 'Huawei', country: 'China' },
  { prefix: '863545', brand: 'Huawei', country: 'China' },
  // Realme
  { prefix: '860534', brand: 'Realme', country: 'China' },
  { prefix: '861905', brand: 'Realme', country: 'China' },
  { prefix: '862538', brand: 'Realme', country: 'China' },
  { prefix: '863485', brand: 'Realme', country: 'China' },
  { prefix: '864077', brand: 'Realme', country: 'China' },
  { prefix: '864820', brand: 'Realme', country: 'China' },
  { prefix: '865739', brand: 'Realme', country: 'China' },
  { prefix: '866180', brand: 'Realme', country: 'China' },
  { prefix: '868238', brand: 'Realme', country: 'China' },
  // OnePlus
  { prefix: '860632', brand: 'OnePlus', country: 'China' },
  { prefix: '861262', brand: 'OnePlus', country: 'China' },
  { prefix: '862604', brand: 'OnePlus', country: 'China' },
  { prefix: '864326', brand: 'OnePlus', country: 'China' },
  { prefix: '865241', brand: 'OnePlus', country: 'China' },
  { prefix: '866279', brand: 'OnePlus', country: 'China' },
  // Nokia / HMD
  { prefix: '351579', brand: 'Nokia (HMD)', country: 'Finland' },
  { prefix: '352056', brand: 'Nokia (HMD)', country: 'Finland' },
  { prefix: '353236', brand: 'Nokia (HMD)', country: 'Finland' },
  { prefix: '355856', brand: 'Nokia (HMD)', country: 'Finland' },
  // Google Pixel
  { prefix: '353309', brand: 'Google', country: 'USA' },
  { prefix: '353410', brand: 'Google', country: 'USA' },
  { prefix: '354610', brand: 'Google', country: 'USA' },
  { prefix: '355009', brand: 'Google', country: 'USA' },
  { prefix: '355691', brand: 'Google', country: 'USA' },
  { prefix: '355771', brand: 'Google', country: 'USA' },
  { prefix: '358027', brand: 'Google', country: 'USA' },
  { prefix: '358489', brand: 'Google', country: 'USA' },
  // Sony
  { prefix: '352009', brand: 'Sony', country: 'Japan' },
  { prefix: '352887', brand: 'Sony', country: 'Japan' },
  { prefix: '353045', brand: 'Sony', country: 'Japan' },
  { prefix: '354232', brand: 'Sony', country: 'Japan' },
  { prefix: '354878', brand: 'Sony', country: 'Japan' },
  // LG
  { prefix: '352067', brand: 'LG', country: 'South Korea' },
  { prefix: '352782', brand: 'LG', country: 'South Korea' },
  { prefix: '353124', brand: 'LG', country: 'South Korea' },
  { prefix: '353471', brand: 'LG', country: 'South Korea' },
  // Motorola/Lenovo
  { prefix: '351498', brand: 'Motorola/Lenovo', country: 'USA/China' },
  { prefix: '352090', brand: 'Motorola/Lenovo', country: 'USA/China' },
  { prefix: '352841', brand: 'Motorola/Lenovo', country: 'USA/China' },
  { prefix: '353866', brand: 'Motorola/Lenovo', country: 'USA/China' },
  { prefix: '354813', brand: 'Motorola/Lenovo', country: 'USA/China' },
  { prefix: '355149', brand: 'Motorola/Lenovo', country: 'USA/China' },
  // Infinix
  { prefix: '350860', brand: 'Infinix', country: 'China' },
  { prefix: '351537', brand: 'Infinix', country: 'China' },
  { prefix: '353485', brand: 'Infinix', country: 'China' },
  { prefix: '354696', brand: 'Infinix', country: 'China' },
  { prefix: '355374', brand: 'Infinix', country: 'China' },
  { prefix: '356551', brand: 'Infinix', country: 'China' },
  // Tecno
  { prefix: '350868', brand: 'Tecno', country: 'China' },
  { prefix: '352484', brand: 'Tecno', country: 'China' },
  { prefix: '353397', brand: 'Tecno', country: 'China' },
  { prefix: '354648', brand: 'Tecno', country: 'China' },
  { prefix: '355598', brand: 'Tecno', country: 'China' },
  // ZTE
  { prefix: '860264', brand: 'ZTE', country: 'China' },
  { prefix: '861215', brand: 'ZTE', country: 'China' },
  { prefix: '862289', brand: 'ZTE', country: 'China' },
  { prefix: '863882', brand: 'ZTE', country: 'China' },
  // BlackBerry
  { prefix: '352397', brand: 'BlackBerry', country: 'Canada' },
  { prefix: '353180', brand: 'BlackBerry', country: 'Canada' },
  { prefix: '354233', brand: 'BlackBerry', country: 'Canada' },
  { prefix: '354803', brand: 'BlackBerry', country: 'Canada' },
];

// ============================================================
// TAC Reporting Body Identifier (digits 7-8 of TAC)
// ============================================================
const REPORTING_BODY_MAP: Record<string, string> = {
  '00': 'CTIA (USA)',
  '01': 'PT CRB (Indonesia)',
  '02': 'CETECOM (Germany)',
  '03': 'Dancro (China)',
  '04': 'EMC Technologies (Australia)',
  '05': 'ERT (UK)',
  '06': 'Eurofins (Germany)',
  '07': 'GCF (UK)',
  '08': 'IMQ (Italy)',
  '09': 'Intertek (UK)',
  '10': 'ITI (India)',
  '11': 'KTL (South Korea)',
  '12': 'MIRA (UK)',
  '13': 'Nemko (Norway)',
  '14': 'PHOT (France)',
  '15': 'TUV (Germany)',
  '16': 'UL (USA)',
  '17': '7Layers (Germany)',
  '18': 'BOSCH (Germany)',
  '19': 'Bureau Veritas (France)',
  '20': 'CAC (China)',
  '21': 'CITC (Saudi Arabia)',
  '22': 'DGT (Taiwan)',
  '23': 'FCC (USA)',
  '24': 'IC (Canada)',
  '25': 'MIC (Japan)',
  '26': 'MSIP (South Korea)',
  '27': 'NCC (Nigeria)',
  '28': 'NTRA (Egypt)',
  '29': 'RCM (Australia)',
  '30': 'SEC (Saudi Arabia)',
  '31': 'SiRT (Canada)',
  '32': 'SRRC (China)',
  '33': 'TAF (Taiwan)',
  '34': 'TIA (USA)',
  '35': 'TUV SUD (Germany)',
  '36': 'WPC (India)',
  '37': 'ZIK (Croatia)',
  '38': 'BIS (India)',
  '39': 'CONITEC (Peru)',
  '40': 'SUBTEL (Chile)',
  '41': 'ANATEL (Brazil)',
  '42': 'IFETEL (Mexico)',
  '43': 'SIT (Russia)',
  '44': 'NBTC (Thailand)',
  '45': 'SIRIM (Malaysia)',
  '46': 'IMDA (Singapore)',
  '47': 'NTC (Philippines)',
  '48': 'KOMCA (South Korea)',
  '49': 'IDA (Singapore)',
  '50': 'RSM (New Zealand)',
  '80': 'TAC (International)',
  '99': 'Trial/Test Unit',
};

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
// Helper: Identify brand from TAC prefix
// ============================================================
function identifyBrand(tacCore: string): { brand: string; country: string; confidence: string } {
  // Try exact 6-digit TAC match first
  for (const entry of TAC_BRAND_MAP) {
    if (tacCore === entry.prefix) {
      return { brand: entry.brand, country: entry.country, confidence: 'high' };
    }
  }

  // Try first 4-digit prefix match
  const prefix4 = tacCore.substring(0, 4);
  for (const entry of TAC_BRAND_MAP) {
    if (entry.prefix.startsWith(prefix4)) {
      return { brand: entry.brand, country: entry.country, confidence: 'medium' };
    }
  }

  // Try first 2-digit prefix match
  const prefix2 = tacCore.substring(0, 2);
  if (prefix2 === '01') return { brand: 'Likely Apple/GSM Device', country: 'USA/Global', confidence: 'low' };
  if (prefix2 === '35') return { brand: 'GSM Device', country: 'Global', confidence: 'low' };
  if (prefix2 === '86') return { brand: 'CDMA/GSM Device (Chinese)', country: 'China', confidence: 'low' };
  if (prefix2 === '91') return { brand: 'CDMA Device', country: 'Various', confidence: 'low' };

  return { brand: 'Unknown', country: 'Unknown', confidence: 'none' };
}

// ============================================================
// Helper: Identify Reporting Body from FAC digits
// ============================================================
function identifyReportingBody(fac: string): string {
  return REPORTING_BODY_MAP[fac] || 'Unknown Reporting Body';
}

// ============================================================
// Helper: Detect device type & OS from search text
// ============================================================
function detectDeviceInfo(text: string): {
  brand: string;
  model: string;
  deviceType: string;
  os: string;
  detectedModels: string[];
} {
  const t = text.toLowerCase();
  const models: string[] = [];

  // Brand detection from text
  let brand = 'Unknown';
  const brandPatterns: Array<{ pattern: string; name: string }> = [
    { pattern: 'apple', name: 'Apple' },
    { pattern: 'iphone', name: 'Apple' },
    { pattern: 'samsung', name: 'Samsung' },
    { pattern: 'xiaomi', name: 'Xiaomi' },
    { pattern: 'redmi', name: 'Xiaomi' },
    { pattern: 'poco', name: 'Xiaomi' },
    { pattern: 'oppo', name: 'OPPO' },
    { pattern: 'vivo', name: 'vivo' },
    { pattern: 'realme', name: 'Realme' },
    { pattern: 'huawei', name: 'Huawei' },
    { pattern: 'honor', name: 'Honor' },
    { pattern: 'oneplus', name: 'OnePlus' },
    { pattern: 'google pixel', name: 'Google' },
    { pattern: 'pixel', name: 'Google' },
    { pattern: 'nokia', name: 'Nokia' },
    { pattern: 'sony', name: 'Sony' },
    { pattern: 'lg ', name: 'LG' },
    { pattern: 'motorola', name: 'Motorola' },
    { pattern: 'infinix', name: 'Infinix' },
    { pattern: 'tecno', name: 'Tecno' },
    { pattern: 'itel', name: 'Itel' },
    { pattern: 'zte', name: 'ZTE' },
    { pattern: 'blackberry', name: 'BlackBerry' },
    { pattern: 'asus', name: 'ASUS' },
    { pattern: 'lenovo', name: 'Lenovo' },
  ];

  for (const bp of brandPatterns) {
    if (t.includes(bp.pattern)) {
      brand = bp.name;
      break;
    }
  }

  // OS detection
  let os = 'Unknown';
  if (t.includes('iphone') || t.includes('ios') || t.includes('ipad')) os = 'iOS';
  else if (t.includes('android')) os = 'Android';
  else if (t.includes('harmonyos') || t.includes('harmony os')) os = 'HarmonyOS';
  else if (t.includes('kaios') || t.includes('feature phone')) os = 'KaiOS';
  else if (t.includes('windows phone')) os = 'Windows Phone';
  else if (brand === 'Apple') os = 'iOS';
  else if (brand !== 'Unknown' && brand !== 'BlackBerry') os = 'Android';

  // Device type detection
  let deviceType = 'Smartphone';
  if (t.includes('tablet') || t.includes('ipad')) deviceType = 'Tablet';
  else if (t.includes('smartwatch') || t.includes('watch') || t.includes('wearable')) deviceType = 'Smartwatch';
  else if (t.includes('feature phone') || t.includes('dumb phone') || t.includes('flip phone')) deviceType = 'Feature Phone';
  else if (t.includes('dongle') || t.includes('modem') || t.includes('hotspot') || t.includes('mifi')) deviceType = 'Mobile Hotspot/Dongle';
  else if (t.includes('laptop') || t.includes('notebook')) deviceType = 'Laptop';

  // Model detection
  const modelPatterns = [
    /iphone\s*(1[0-9]|9|8|7|6|5|se|xr|xs|pro|max|plus|mini)/gi,
    /samsung\s*galaxy\s*(s[0-9]+|note[0-9]+|a[0-9]+|m[0-9]+|j[0-9]+|z\s*flip|z\s*fold)/gi,
    /galaxy\s*(s[0-9]+|note[0-9]+|a[0-9]+|m[0-9]+|z\s*flip|z\s*fold)/gi,
    /xiaomi\s*(redmi\s*note?\s*[0-9]+|mi\s*[0-9]+|poco\s*[a-z0-9]+)/gi,
    /redmi\s*note?\s*[0-9]+/gi,
    /poco\s*[a-z0-9]+/gi,
    /oppo\s*(find\s*x|reno\s*[0-9]+|a[0-9]+|f[0-9]+)/gi,
    /vivo\s*(v[0-9]+|y[0-9]+|x[0-9]+|iqoo)/gi,
    /realme\s*(c[0-9]+|narzo|gt|x[0-9]+)/gi,
    /huawei\s*(p[0-9]+|mate\s*[0-9]+|nova|honor|y[0-9]+)/gi,
    /oneplus\s*[0-9]+/gi,
    /pixel\s*[0-9]+/gi,
    /nokia\s*[0-9.]+/gi,
    /infinix\s*(hot|note|smart|zero)/gi,
    /tecno\s*(spark|camon|pop|phantom)/gi,
  ];

  for (const pattern of modelPatterns) {
    const matches = t.matchAll(pattern);
    for (const match of matches) {
      const m = match[0].trim();
      if (m && !models.includes(m)) models.push(m);
    }
  }

  return {
    brand,
    model: models[0] || 'Unknown',
    deviceType,
    os,
    detectedModels: models.slice(0, 10),
  };
}

// ============================================================
// Helper: Build data leak results
// ============================================================
function buildDataLeaks(leakResults: Array<{ title: string; snippet: string; domain: string; url: string }>): Array<{
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: string;
  description: string;
  url: string;
}> {
  const leakKeywords = ['leak', 'breach', 'exposed', 'stolen', 'hacked', 'compromised', 'dumped', 'credential', 'phishing', 'scam', 'fraud', 'bocor', 'diretas', 'dibobol'];
  return leakResults
    .filter(r => leakKeywords.some(k => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
    .map(r => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
      let type = 'Data Exposure';

      if (text.includes('stolen') || text.includes('dicuri') || text.includes('curi')) { severity = 'critical'; type = 'Stolen Device Report'; }
      else if (text.includes('credential') || text.includes('password')) { severity = 'critical'; type = 'Credential Leak'; }
      else if (text.includes('identity') || text.includes('identitas') || text.includes('ktp')) { severity = 'critical'; type = 'Identity Leak'; }
      else if (text.includes('phishing') || text.includes('scam') || text.includes('fraud')) { severity = 'high'; type = 'Phishing/Fraud'; }
      else if (text.includes('breach')) { severity = 'high'; type = 'Data Breach'; }
      else if (text.includes('imei') || text.includes('device')) { severity = 'medium'; type = 'Device Data Exposure'; }

      return { type, severity, source: r.domain, description: r.snippet.substring(0, 200), url: r.url };
    });
}

// ============================================================
// Main POST handler
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { imei } = body;

    if (!imei || typeof imei !== 'string') {
      return NextResponse.json(
        { success: false, error: 'IMEI number is required' },
        { status: 400 }
      );
    }

    // Clean the IMEI - remove spaces, dashes, dots
    const cleaned = imei.replace(/[\s\-\.\(\)]/g, '');

    // Validate IMEI format (must be exactly 15 digits)
    if (!/^\d{15}$/.test(cleaned)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid IMEI format. IMEI must be exactly 15 digits.',
          imei: cleaned,
          validation: {
            valid: false,
            luhnCheck: false,
            reason: cleaned.length !== 15
              ? `IMEI must be 15 digits, got ${cleaned.length}`
              : 'IMEI contains non-digit characters',
          },
        },
        { status: 400 }
      );
    }

    // ============================================================
    // IMEI Validation & Decomposition
    // ============================================================
    const validation = validateIMEI(cleaned);
    const decomposition = decomposeIMEI(cleaned);

    // Identify brand from TAC
    const tacBrandInfo = identifyBrand(decomposition.tac);

    // Identify reporting body from FAC
    const reportingBody = identifyReportingBody(decomposition.fac);

    // ============================================================
    // Sequential web searches for OSINT intelligence
    // ============================================================
    const [
      deviceResults,
      tacResults,
      stolenResults,
      leakResults,
      carrierResults,
    ] = await sequentialWebSearch([
      {
        query: `IMEI "${cleaned}" OR TAC "${decomposition.tacFull}" device model brand phone type specification`,
        num: 5,
      },
      {
        query: `TAC "${decomposition.tacFull}" OR "${decomposition.tac}" type allocation code device model GSMA`,
        num: 5,
      },
      {
        query: `IMEI "${cleaned}" stolen lost phone database blacklist check block report dicuri hilang`,
        num: 5,
      },
      {
        query: `IMEI "${cleaned}" data breach leak exposed owner personal information compromised`,
        num: 5,
      },
      {
        query: `IMEI "${cleaned}" OR TAC "${decomposition.tacFull}" carrier network operator region country location`,
        num: 5,
      },
    ], 800);

    // Parse all results
    const deviceData = parseResults(deviceResults);
    const tacData = parseResults(tacResults);
    const stolenData = parseResults(stolenResults);
    const leakData = parseResults(leakResults);
    const carrierData = parseResults(carrierResults);

    // ============================================================
    // Device info detection from search results
    // ============================================================
    const allSearchText = [
      ...deviceData, ...tacData, ...stolenData, ...leakData, ...carrierData,
    ].map(r => `${r.title} ${r.snippet} ${r.domain}`.toLowerCase()).join(' ');

    const deviceInfo = detectDeviceInfo(allSearchText);

    // Use TAC brand info if deviceInfo didn't detect a brand
    if (deviceInfo.brand === 'Unknown' && tacBrandInfo.brand !== 'Unknown') {
      deviceInfo.brand = tacBrandInfo.brand;
      // Set OS based on brand
      if (tacBrandInfo.brand === 'Apple') deviceInfo.os = 'iOS';
      else if (['Xiaomi', 'Samsung', 'OPPO', 'vivo', 'Realme', 'Huawei', 'OnePlus', 'Infinix', 'Tecno', 'Motorola/Lenovo', 'Google'].includes(tacBrandInfo.brand)) {
        deviceInfo.os = 'Android';
      }
    }

    // ============================================================
    // Stolen/Lost phone detection
    // ============================================================
    const stolenKeywords = ['stolen', 'lost', 'blacklist', 'blocked', 'dicuri', 'hilang', 'dilaporkan', 'reported', 'blocked imei', 'blacklisted', 'ce-listed'];
    const isStolenOrLost = stolenData.some(r =>
      stolenKeywords.some(k => `${r.title} ${r.snippet}`.toLowerCase().includes(k))
    );

    const stolenReports = stolenData
      .filter(r => stolenKeywords.some(k => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map(r => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let status: 'stolen' | 'lost' | 'blacklisted' | 'blocked' | 'flagged' = 'flagged';
        if (text.includes('stolen') || text.includes('dicuri')) status = 'stolen';
        else if (text.includes('lost') || text.includes('hilang')) status = 'lost';
        else if (text.includes('blacklist') || text.includes('ce-listed')) status = 'blacklisted';
        else if (text.includes('blocked')) status = 'blocked';

        return {
          status,
          source: r.domain,
          description: r.snippet.substring(0, 250),
          url: r.url,
        };
      });

    // ============================================================
    // Location / Carrier intelligence
    // ============================================================
    const carrierKeywords = ['carrier', 'network', 'operator', 'provider', 'telecom', 'mobile', 'cellular', 'gsm', 'lte', '5g', '4g', 'region', 'country'];
    const locationIntelligence = {
      carrier: 'Unknown',
      region: 'Unknown',
      network: 'Unknown',
      reportingBody,
      tacOrigin: tacBrandInfo.country,
      details: [] as Array<{ source: string; info: string }>,
    };

    // Try to extract carrier info from search results
    for (const r of carrierData.slice(0, 5)) {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      if (carrierKeywords.some(k => text.includes(k))) {
        locationIntelligence.details.push({
          source: r.domain,
          info: r.snippet.substring(0, 200),
        });

        // Try to extract carrier name
        const carrierMatch = text.match(/(?:carrier|network|operator|provider)[:\s]+([a-z0-9\s]+?)(?:\.|,|$)/i);
        if (carrierMatch && locationIntelligence.carrier === 'Unknown') {
          locationIntelligence.carrier = carrierMatch[1].trim().substring(0, 50);
        }

        // Try to extract region/country
        const regionMatch = text.match(/(?:region|country|located in|registered in)[:\s]+([a-z0-9\s]+?)(?:\.|,|$)/i);
        if (regionMatch && locationIntelligence.region === 'Unknown') {
          locationIntelligence.region = regionMatch[1].trim().substring(0, 50);
        }

        // Try to extract network type
        if (text.includes('5g')) locationIntelligence.network = '5G';
        else if (text.includes('4g') || text.includes('lte')) locationIntelligence.network = '4G/LTE';
        else if (text.includes('3g')) locationIntelligence.network = '3G';
        else if (text.includes('2g') || text.includes('gsm')) locationIntelligence.network = '2G/GSM';
      }
    }

    // ============================================================
    // Data leak detection
    // ============================================================
    const dataLeaks = buildDataLeaks(leakData);

    // ============================================================
    // Safety status
    // ============================================================
    let safetyStatus: 'safe' | 'stolen' | 'suspicious' | 'dangerous' = 'safe';
    if (isStolenOrLost) safetyStatus = 'stolen';
    else if (dataLeaks.some(d => d.severity === 'critical')) safetyStatus = 'dangerous';
    else if (dataLeaks.length > 0) safetyStatus = 'suspicious';

    // ============================================================
    // Combined search results for response
    // ============================================================
    const searchResults = [
      ...deviceData.slice(0, 5).map(r => ({ ...r, category: 'Device Info' })),
      ...tacData.slice(0, 3).map(r => ({ ...r, category: 'TAC/GSMA' })),
      ...stolenData.slice(0, 3).map(r => ({ ...r, category: 'Stolen/Lost' })),
      ...leakData.slice(0, 3).map(r => ({ ...r, category: 'Data Leak' })),
      ...carrierData.slice(0, 3).map(r => ({ ...r, category: 'Carrier/Network' })),
    ];

    // ============================================================
    // AI Analysis - Comprehensive
    // ============================================================
    const allContext = [
      ...deviceData.slice(0, 4).map(r => `[DEVICE] ${r.title}: ${r.snippet}`),
      ...tacData.slice(0, 3).map(r => `[TAC/GSMA] ${r.title}: ${r.snippet}`),
      ...stolenData.slice(0, 3).map(r => `[STOLEN/LOST] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map(r => `[LEAK] ${r.title}: ${r.snippet}`),
      ...carrierData.slice(0, 3).map(r => `[CARRIER] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for IMEI-based phone tracking intelligence. Report with: ## 📱 IMEI VALIDATION & ANALYSIS ## 🏭 DEVICE IDENTIFICATION (brand, model, type, OS) ## 📋 TAC INTELLIGENCE (Type Allocation Code, reporting body, origin) ## 📍 LOCATION INTELLIGENCE (carrier, region, network) ## 🚨 STOLEN/LOST STATUS ## 🔐 DATA LEAK & BREACH ASSESSMENT ## 🔒 SAFETY ASSESSMENT ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `IMEI: ${cleaned} | Valid: ${validation.luhnCheck ? 'Yes' : 'No'} | TAC: ${decomposition.tacFull} | FAC: ${decomposition.fac} | Serial: ${decomposition.serialNumber} | Brand: ${deviceInfo.brand} | Model: ${deviceInfo.model} | Type: ${deviceInfo.deviceType} | OS: ${deviceInfo.os} | Stolen: ${isStolenOrLost ? 'Yes' : 'No'} | Carrier: ${locationIntelligence.carrier} | Region: ${locationIntelligence.region} | Reporting Body: ${reportingBody} | Leaks: ${dataLeaks.length} | Safety: ${safetyStatus}

${allContext.substring(0, 1500)}`
        )
      : 'No intelligence data available for this IMEI number.';

    // ============================================================
    // Build and return response
    // ============================================================
    return NextResponse.json({
      success: true,
      imei: cleaned,

      // IMEI Validation
      validation: {
        valid: validation.valid,
        luhnCheck: validation.luhnCheck,
        checkDigit: validation.checkDigit,
        calculatedCheckDigit: validation.calculatedCheckDigit,
      },

      // IMEI Decomposition
      decomposition: {
        tac: decomposition.tac,
        fac: decomposition.fac,
        tacFull: decomposition.tacFull,
        serialNumber: decomposition.serialNumber,
        checkDigit: decomposition.checkDigit,
      },

      // TAC Information
      tacInfo: {
        typeAllocationCode: decomposition.tacFull,
        tacCore: decomposition.tac,
        finalAssemblyCode: decomposition.fac,
        reportingBody,
        brandFromTAC: tacBrandInfo.brand,
        countryFromTAC: tacBrandInfo.country,
        tacConfidence: tacBrandInfo.confidence,
      },

      // Device Information
      deviceInfo: {
        brand: deviceInfo.brand,
        model: deviceInfo.model,
        deviceType: deviceInfo.deviceType,
        os: deviceInfo.os,
        detectedModels: deviceInfo.detectedModels,
      },

      // Location Intelligence
      locationIntelligence,

      // Stolen/Lost Status
      stolenLostStatus: {
        isStolenOrLost,
        safetyStatus,
        reports: stolenReports,
        reportCount: stolenReports.length,
      },

      // Data Leak Detection
      dataLeaks,
      leakCount: dataLeaks.length,

      // Web Search Results
      searchResults,

      // AI Analysis
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[imei] Error:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
