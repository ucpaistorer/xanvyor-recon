import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Indonesian carrier mapping
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

const MESSAGING_PLATFORMS = [
  { name: 'WhatsApp', icon: '💬', category: 'Messaging', detectHint: 'whatsapp' },
  { name: 'Telegram', icon: '✈️', category: 'Messaging', detectHint: 'telegram' },
  { name: 'Signal', icon: '🔒', category: 'Messaging', detectHint: 'signal' },
  { name: 'Line', icon: '💚', category: 'Messaging', detectHint: 'line' },
  { name: 'Viber', icon: '📞', category: 'Messaging', detectHint: 'viber' },
  { name: 'WeChat', icon: '🟢', category: 'Messaging', detectHint: 'wechat' },
  { name: 'Facebook', icon: '👤', category: 'Social Media', detectHint: 'facebook' },
  { name: 'Instagram', icon: '📸', category: 'Social Media', detectHint: 'instagram' },
  { name: 'Twitter/X', icon: '🐦', category: 'Social Media', detectHint: 'twitter' },
  { name: 'TikTok', icon: '🎵', category: 'Social Media', detectHint: 'tiktok' },
  { name: 'LinkedIn', icon: '💼', category: 'Professional', detectHint: 'linkedin' },
  { name: 'Grab', icon: '🚗', category: 'Services', detectHint: 'grab' },
  { name: 'Gojek', icon: '🏍️', category: 'Services', detectHint: 'gojek' },
  { name: 'Shopee', icon: '🛒', category: 'E-Commerce', detectHint: 'shopee' },
  { name: 'Tokopedia', icon: '🛍️', category: 'E-Commerce', detectHint: 'tokopedia' },
  { name: 'Dana', icon: '💰', category: 'Finance', detectHint: 'dana' },
  { name: 'OVO', icon: '💳', category: 'Finance', detectHint: 'ovo' },
  { name: 'Gopay', icon: '💵', category: 'Finance', detectHint: 'gopay' },
  { name: 'BCA Mobile', icon: '🏦', category: 'Banking', detectHint: 'bca' },
  { name: 'Google', icon: '🔍', category: 'Tech', detectHint: 'google' },
  { name: 'Truecaller', icon: '📱', category: 'Caller ID', detectHint: 'truecaller' },
  { name: 'GetContact', icon: '📒', category: 'Contact', detectHint: 'getcontact' },
];

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

    // Detect country and carrier
    const countryInfo = detectCountry(cleaned);
    const carrierInfo = detectCarrier(cleaned, countryInfo.countryCode);

    // Format phone number variants for better search coverage
    const phoneVariants = getPhoneVariants(cleaned, countryInfo.countryCode);

    // Comprehensive OSINT searches with multiple phone formats
    // Search for the phone number in various formats for better coverage
    const phoneLocal = phoneVariants.local;
    const phoneFormatted = countryInfo.countryCode === '+62'
      ? `${phoneLocal.substring(0, 3)}-${phoneLocal.substring(3, 7)}-${phoneLocal.substring(7)}`
      : phone;

    const [
      spamResults,
      callerIdResults,
      getContactResults,
      socialResults,
      leakResults,
      serviceResults,
      truecallerResults,
      nameSearchResults,
      webDirectoryResults,
    ] = await sequentialWebSearch([
      { query: `"${phone}" spam scam fraud report robocall penipuan`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" caller ID owner name who is nama pemilik siapa`, num: 8 },
      { query: `site:truecaller.com "${phone}" OR "${phoneLocal}"`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" OR "${phoneFormatted}" social media profile facebook whatsapp telegram instagram`, num: 8 },
      { query: `"${phone}" data breach leak KTP identitas personal data exposed bocor`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" registered account service app terdaftar akun`, num: 8 },
      { query: `truecaller.com "${phone}" OR "${phoneLocal}" name owner caller`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" OR "${phoneFormatted}" nama orang person name contact pemilik disimpan`, num: 10 },
      { query: `"${phone}" OR "${phoneLocal}" kontak telepon nomor hp nama orang directory`, num: 8 },
    ], 1500);

    // Parse all search results into uniform format
    const parseResults = (results: unknown[]) => {
      return results.map((r: unknown) => {
        const result = r as Record<string, unknown>;
        return {
          url: (result.url as string) || '',
          title: (result.title as string) || (result.name as string) || '',
          snippet: (result.snippet as string) || '',
          domain: result.url ? new URL(result.url as string).hostname.replace('www.', '') : (result.host_name as string) || '',
        };
      }).filter((r) => r.title || r.snippet);
    };

    const spamData = parseResults(spamResults);
    const callerIdData = parseResults(callerIdResults);
    const getContactData = parseResults(getContactResults);
    const socialData = parseResults(socialResults);
    const leakData = parseResults(leakResults);
    const serviceData = parseResults(serviceResults);
    const truecallerData = parseResults(truecallerResults);
    const nameSearchData = parseResults(nameSearchResults);
    const webDirectoryData = parseResults(webDirectoryResults);

    // ====== GETCONTACT-STYLE NAME DISCOVERY ======
    // Extract names that this phone number is saved under from search results
    const allNameResults = [...getContactData, ...truecallerData, ...callerIdData, ...nameSearchData, ...webDirectoryData];
    
    // Use AI to extract names from search results
    const nameExtractionPrompt = allNameResults.length > 0
      ? await safeAIAnalysis(
          `You are a phone number intelligence analyst specializing in Indonesian phone number lookup (like GetContact/Truecaller). Your task is to find ALL names, aliases, and contact labels associated with phone number "${phone}".

CRITICAL: Read every search result carefully. Look for:
1. Any PERSON NAME mentioned near the phone number
2. Names from Truecaller lookup results
3. Names from GetContact results  
4. Names from social media profiles linked to this number
5. Any business names or organization names associated with this number
6. Names from web directories, forums, or classified ads mentioning this number
7. Any Indonesian names (like "Asep", "Budi", "Siti", etc.) mentioned alongside this number
8. Names from WhatsApp/Telegram group member lists
9. Any "saved as" or "disimpan dengan nama" patterns

Return ONLY a JSON array of objects with this exact format, no other text:
[{"name": "Person Name", "source": "Service/App name where found", "confidence": "high/medium/low"}]

Rules:
- Extract ANY name found near or associated with the phone number
- Include name variations and aliases
- If a name appears in the title or snippet alongside the number, include it
- Indonesian names are very common - look for patterns like capitalized words near the phone number
- If no specific names are found, return empty array []
- confidence "high" = name clearly linked to this number, "medium" = likely linked, "low" = possibly linked

IMPORTANT: Return ONLY the JSON array, no markdown, no explanation.`,
          `Phone number: ${phone}
Local format: ${phoneLocal}
Formatted: ${phoneFormatted}

Search results (analyze each one carefully for names):
${allNameResults.map(r => `[${r.domain}] ${r.title}: ${r.snippet}`).join('\n')}`
        )
      : '[]';

    // Parse extracted names
    let contactNames: Array<{ name: string; source: string; confidence: string }> = [];
    try {
      const cleaned = nameExtractionPrompt.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      contactNames = JSON.parse(cleaned);
      if (!Array.isArray(contactNames)) contactNames = [];
    } catch {
      // Try to extract names manually from search results
      contactNames = extractNamesFromResults(allNameResults, phone);
    }

    // ====== SERVICE REGISTRATION DETECTION ======
    const allSearchText = [
      ...spamData, ...callerIdData, ...getContactData, ...socialData, ...leakData, ...serviceData, ...truecallerData, ...nameSearchData, ...webDirectoryData,
    ].map((r) => `${r.title} ${r.snippet} ${r.domain}`.toLowerCase()).join(' ');

    const registeredServices = MESSAGING_PLATFORMS.map(platform => {
      const hints = [platform.detectHint, platform.name.toLowerCase()];
      const detected = hints.some(hint => allSearchText.includes(hint)) ||
        serviceData.some(r =>
          r.snippet.toLowerCase().includes(platform.detectHint) ||
          r.title.toLowerCase().includes(platform.detectHint) ||
          r.domain.toLowerCase().includes(platform.detectHint)
        ) ||
        socialData.some(r =>
          r.snippet.toLowerCase().includes(platform.detectHint) ||
          r.domain.toLowerCase().includes(platform.detectHint)
        );

      return {
        ...platform,
        detected,
        confidence: detected ? 'high' : 'unknown',
      };
    });

    // ====== SAFETY STATUS ======
    const spamKeywords = ['spam', 'scam', 'fraud', 'robocall', 'fraudulent', 'dangerous', 'phishing', 'malicious', 'penipuan', 'penipu'];
    const hasSpamReports = spamData.some(r =>
      spamKeywords.some(k => `${r.title} ${r.snippet}`.toLowerCase().includes(k))
    );
    const hasLeakReports = leakData.some(r => {
      const text = `${r.title} ${r.snippet}`.toLowerCase();
      return ['leak', 'breach', 'exposed', 'bocor', 'ktp', 'identitas', 'password'].some(k => text.includes(k));
    });

    let safetyStatus = 'safe';
    if (hasSpamReports) safetyStatus = 'dangerous';
    else if (hasLeakReports) safetyStatus = 'suspicious';

    // ====== ASSOCIATED PEOPLE ======
    const associatedPeople = [...callerIdData, ...socialData.slice(0, 3)]
      .filter(r => r.snippet && r.snippet.length > 10)
      .slice(0, 8)
      .map(r => ({
        name: r.title || 'Unknown',
        source: r.domain || 'Web',
        snippet: r.snippet.substring(0, 150),
        url: r.url,
        confidence: 'medium' as const,
      }));

    // ====== DATA LEAK DETECTION ======
    const leakKeywords = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'password', 'data bocor', 'hacked', 'compromised', 'dumped', 'paste'];
    const dataLeaks = leakData
      .filter(r => leakKeywords.some(k => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map(r => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';
        if (text.includes('ktp') || text.includes('identitas') || text.includes('identity')) { severity = 'critical'; type = 'Identity Document Leak'; }
        else if (text.includes('password') || text.includes('credential')) { severity = 'critical'; type = 'Credential Leak'; }
        else if (text.includes('breach')) { severity = 'high'; type = 'Data Breach'; }
        else if (text.includes('phone') || text.includes('mobile')) { severity = 'medium'; type = 'Phone Number Exposure'; }
        return { type, severity, source: r.domain, description: r.snippet.substring(0, 200), url: r.url };
      });

    // ====== COMPREHENSIVE AI ANALYSIS ======
    const allContext = [
      ...spamData.slice(0, 3).map(r => `[SPAM] ${r.title}: ${r.snippet}`),
      ...callerIdData.slice(0, 3).map(r => `[CALLER-ID] ${r.title}: ${r.snippet}`),
      ...getContactData.slice(0, 5).map(r => `[GETCONTACT] ${r.title}: ${r.snippet}`),
      ...socialData.slice(0, 3).map(r => `[SOCIAL] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map(r => `[LEAK] ${r.title}: ${r.snippet}`),
      ...serviceData.slice(0, 3).map(r => `[SERVICES] ${r.title}: ${r.snippet}`),
      ...truecallerData.slice(0, 3).map(r => `[TRUECALLER] ${r.title}: ${r.snippet}`),
      ...nameSearchData.slice(0, 3).map(r => `[NAME-SEARCH] ${r.title}: ${r.snippet}`),
      ...webDirectoryData.slice(0, 3).map(r => `[DIRECTORY] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const contactNamesSummary = contactNames.length > 0
      ? `\n\nNames found for this number: ${contactNames.map(n => `"${n.name}" (from ${n.source})`).join(', ')}`
      : '';

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in phone number intelligence and digital identity investigation (like GetContact/Truecaller).
Analyze the phone number data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 🔒 SAFETY ASSESSMENT
- Overall safety rating (SAFE / SUSPICIOUS / DANGEROUS)
- Spam/scam reports found
- Risk level explanation

## 📒 GETCONTACT - NAMA DI KONTAK ORANG LAIN
- List ALL names that this phone number is saved under in other people's contacts
- Which apps/services show these names (GetContact, Truecaller, WhatsApp, etc.)
- Name variations and aliases found

## 📱 REGISTERED SERVICES & APPS
- Which platforms and services this phone number is likely registered on
- Evidence from search results
- Messaging apps (WhatsApp, Telegram, Signal, etc.)
- Social media accounts
- E-commerce and financial services
- Banking connections

## 👥 ASSOCIATED PEOPLE & CONTACTS
- People linked to this phone number
- Owner identification if available
- Related contacts from public sources

## 🚨 DATA LEAK & BREACH INTELLIGENCE
- Any data breaches involving this number
- Personal data exposure (KTP/ID, passwords, etc.)
- Compromised accounts

## 📍 CARRIER & LOCATION
- Mobile carrier/provider
- Geographic location hints
- Number type

## 🔗 DIGITAL FOOTPRINT
- Online presence linked to this number
- Social media connections

Be thorough. Include ALL names found. Use Indonesian context when relevant.`,
          `Analyze phone number: ${phone}
Number info: Country=${countryInfo.country}, Carrier=${carrierInfo.carrier}, Type=${carrierInfo.type}
${contactNamesSummary}

Intelligence data:
${allContext}

Provide a complete phone number OSINT intelligence report. Focus especially on what names this number is saved under in contacts (GetContact style).`
        )
      : 'No intelligence data available for this phone number.';

    return NextResponse.json({
      success: true,
      phone,
      cleaned,
      analysis: {
        original: phone,
        cleaned,
        countryCode: countryInfo.countryCode,
        country: countryInfo.country,
        format: countryInfo.format,
        carrier: carrierInfo.carrier,
        numberType: carrierInfo.type,
        digitCount: cleaned.length,
      },
      safetyStatus,
      // GetContact-style feature
      contactNames,
      contactNameCount: contactNames.length,
      // Registered services
      registeredServices,
      detectedServiceCount: registeredServices.filter(s => s.detected).length,
      // Associated people
      associatedPeople,
      // Data leaks
      dataLeaks,
      leakCount: dataLeaks.length,
      // Search results
      socialAccounts: socialData,
      spamReports: spamData,
      getContactResults: getContactData,
      truecallerResults: truecallerData,
      callerIdResults: callerIdData,
      // AI Analysis
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// Get phone number variants for better search coverage
function getPhoneVariants(cleaned: string, countryCode: string): { local: string; international: string } {
  if (countryCode === '+62' && cleaned.startsWith('62')) {
    return {
      local: '0' + cleaned.substring(2), // 62 812 3456 7890 → 0812 3456 7890
      international: '+' + cleaned,
    };
  }
  return {
    local: cleaned,
    international: '+' + cleaned,
  };
}

// Fallback: manually extract names from search results
function extractNamesFromResults(
  results: Array<{ title: string; snippet: string; domain: string }>,
  phone: string
): Array<{ name: string; source: string; confidence: string }> {
  const names: Array<{ name: string; source: string; confidence: string }> = [];
  const phoneCleaned = phone.replace(/[\s\-\+\(\)]/g, '');

  for (const r of results) {
    const text = `${r.title} ${r.snippet}`;
    // Skip if text is just the phone number itself
    if (text.replace(/[\s\-\+\(\)]/g, '').includes(phoneCleaned)) {
      // Look for name patterns near phone numbers
      const escapedPhone = phoneCleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const namePatterns = [
        new RegExp(`(?:named?|nama|called?|saved\\s+as|known\\s+as|registered\\s+as)\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){0,3})`, 'gi'),
        new RegExp(`([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){1,3})\\s*[-–—]\\s*${escapedPhone}`, 'g'),
      ];

      for (const pattern of namePatterns) {
        const matches = text.matchAll(pattern);
        for (const match of matches) {
          if (match[1] && match[1].length > 2 && match[1].length < 50) {
            const existingName = names.find(n => n.name.toLowerCase() === match[1].toLowerCase());
            if (!existingName) {
              names.push({
                name: match[1].trim(),
                source: r.domain || 'Web Search',
                confidence: 'low',
              });
            }
          }
        }
      }
    }

    // Extract from Truecaller/GetContact specific results
    if (r.domain.toLowerCase().includes('truecaller') || r.domain.toLowerCase().includes('getcontact')) {
      // Usually the title contains the name
      const titleName = r.title.replace(/[-|–].*/g, '').trim();
      if (titleName.length > 2 && titleName.length < 50 && !titleName.match(/^\+?\d/)) {
        const existingName = names.find(n => n.name.toLowerCase() === titleName.toLowerCase());
        if (!existingName) {
          names.push({
            name: titleName,
            source: r.domain,
            confidence: 'high',
          });
        }
      }
    }
  }

  return names.slice(0, 15);
}

function detectCountry(cleaned: string): { countryCode: string; country: string; format: string } {
  if (cleaned.startsWith('62')) return { countryCode: '+62', country: 'Indonesia', format: 'International (E.164)' };
  if (cleaned.startsWith('1')) return { countryCode: '+1', country: 'United States/Canada', format: 'International (E.164)' };
  if (cleaned.startsWith('44')) return { countryCode: '+44', country: 'United Kingdom', format: 'International (E.164)' };
  if (cleaned.startsWith('86')) return { countryCode: '+86', country: 'China', format: 'International (E.164)' };
  if (cleaned.startsWith('91')) return { countryCode: '+91', country: 'India', format: 'International (E.164)' };
  if (cleaned.startsWith('81')) return { countryCode: '+81', country: 'Japan', format: 'International (E.164)' };
  if (cleaned.startsWith('82')) return { countryCode: '+82', country: 'South Korea', format: 'International (E.164)' };
  if (cleaned.startsWith('60')) return { countryCode: '+60', country: 'Malaysia', format: 'International (E.164)' };
  if (cleaned.startsWith('66')) return { countryCode: '+66', country: 'Thailand', format: 'International (E.164)' };
  if (cleaned.startsWith('84')) return { countryCode: '+84', country: 'Vietnam', format: 'International (E.164)' };
  if (cleaned.startsWith('49')) return { countryCode: '+49', country: 'Germany', format: 'International (E.164)' };
  if (cleaned.startsWith('33')) return { countryCode: '+33', country: 'France', format: 'International (E.164)' };
  if (cleaned.startsWith('55')) return { countryCode: '+55', country: 'Brazil', format: 'International (E.164)' };
  if (cleaned.startsWith('7')) return { countryCode: '+7', country: 'Russia', format: 'International (E.164)' };
  if (cleaned.startsWith('61')) return { countryCode: '+61', country: 'Australia', format: 'International (E.164)' };
  if (cleaned.startsWith('65')) return { countryCode: '+65', country: 'Singapore', format: 'International (E.164)' };
  if (cleaned.startsWith('63')) return { countryCode: '+63', country: 'Philippines', format: 'International (E.164)' };
  if (cleaned.startsWith('880')) return { countryCode: '+880', country: 'Bangladesh', format: 'International (E.164)' };
  if (cleaned.startsWith('234')) return { countryCode: '+234', country: 'Nigeria', format: 'International (E.164)' };
  if (cleaned.startsWith('27')) return { countryCode: '+27', country: 'South Africa', format: 'International (E.164)' };
  return { countryCode: '+?', country: 'Unknown', format: 'International' };
}

function detectCarrier(cleaned: string, countryCode: string): { carrier: string; type: string } {
  if (countryCode === '+62') {
    const afterCountryCode = cleaned.substring(2);
    if (afterCountryCode.startsWith('8') && afterCountryCode.length >= 3) {
      const prefix = afterCountryCode.substring(0, 3);
      for (const [key, value] of Object.entries(CARRIER_MAP)) {
        if (prefix === key) return { carrier: value, type: 'Mobile' };
      }
    }
    return { carrier: 'Unknown (Indonesian)', type: 'Mobile' };
  }
  if (countryCode === '+1') return { carrier: 'US/Canada Carrier', type: 'Mobile' };
  if (countryCode === '+44') return { carrier: 'UK Carrier', type: 'Mobile' };
  if (countryCode === '+86') return { carrier: 'China Carrier', type: 'Mobile' };
  if (countryCode === '+91') return { carrier: 'India Carrier', type: 'Mobile' };
  return { carrier: 'Local Carrier', type: 'Mobile' };
}
