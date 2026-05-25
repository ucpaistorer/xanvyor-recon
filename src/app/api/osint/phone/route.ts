import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

// Indonesian and international carrier mapping
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
];

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });

    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

    // Detect country and carrier
    const countryInfo = detectCountry(cleaned);
    const carrierInfo = detectCarrier(cleaned, countryInfo.countryCode);

    // Sequential searches to avoid rate limiting - comprehensive OSINT
    const spamResults = await safeWebSearch(`"${phone}" spam scam fraud report robocall`, 8);
    const socialResults = await safeWebSearch(`"${phone}" social media account profile facebook whatsapp telegram`, 8);
    const leakResults = await safeWebSearch(`"${phone}" data breach leak KTP identitas personal data exposed`, 8);
    const callerIdResults = await safeWebSearch(`"${phone}" caller ID owner name who is`, 8);
    const serviceResults = await safeWebSearch(`"${phone}" registered account service app`, 8);

    // Detect which services the number is registered on based on search results
    const allSearchText = [
      ...spamResults, ...socialResults, ...leakResults, ...callerIdResults, ...serviceResults,
    ].map((r: Record<string, string>) => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase()).join(' ');

    const registeredServices = MESSAGING_PLATFORMS.map(platform => {
      const hints = [platform.detectHint, platform.name.toLowerCase()];
      const detected = hints.some(hint => allSearchText.includes(hint)) ||
        serviceResults.some((r: Record<string, string>) =>
          r.snippet?.toLowerCase().includes(platform.detectHint) ||
          r.name?.toLowerCase().includes(platform.detectHint)
        );
      return {
        ...platform,
        detected,
        confidence: detected ? 'high' as const : 'unknown' as const,
      };
    });

    // Determine safety status
    const spamKeywords = ['spam', 'scam', 'fraud', 'robocall', 'fraudulent', 'dangerous', 'phishing', 'malicious'];
    const hasSpamReports = spamResults.some((r: Record<string, string>) =>
      spamKeywords.some(k => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase().includes(k))
    );
    const safetyStatus = hasSpamReports ? 'dangerous' : 'unknown';

    // Extract associated people from search results
    const associatedPeople = (callerIdResults as Array<Record<string, string>>)
      .filter((r: Record<string, string>) => r.snippet && r.snippet.length > 10)
      .slice(0, 5)
      .map((r: Record<string, string>) => ({
        name: r.name || 'Unknown',
        source: r.host_name || 'Web',
        snippet: r.snippet?.substring(0, 150) || '',
        url: r.url || '',
        confidence: 'medium' as const,
      }));

    // Data leak detection
    const leakKeywords = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'password', 'data bocor', 'hacked', 'compromised', 'dumped', 'paste'];
    const dataLeaks = (leakResults as Array<Record<string, string>>)
      .filter((r: Record<string, string>) =>
        leakKeywords.some(k => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase().includes(k))
      )
      .map((r: Record<string, string>) => {
        const text = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';
        if (text.includes('ktp') || text.includes('identitas') || text.includes('identity')) { severity = 'critical'; type = 'Identity Document Leak'; }
        else if (text.includes('password') || text.includes('credential')) { severity = 'critical'; type = 'Credential Leak'; }
        else if (text.includes('breach')) { severity = 'high'; type = 'Data Breach'; }
        else if (text.includes('phone') || text.includes('mobile')) { severity = 'medium'; type = 'Phone Number Exposure'; }
        return { type, severity, source: r.host_name || '', description: r.snippet?.substring(0, 200) || '', url: r.url || '' };
      });

    // Social accounts from search
    const socialAccounts = (socialResults as Array<Record<string, string>>).map((r: Record<string, string>) => ({
      title: r.name,
      snippet: r.snippet,
      url: r.url,
      domain: r.host_name,
    }));

    // Spam reports
    const spamReports = (spamResults as Array<Record<string, string>>).map((r: Record<string, string>) => ({
      title: r.name,
      snippet: r.snippet,
      url: r.url,
      domain: r.host_name,
    }));

    // Comprehensive AI analysis
    const allContext = [
      ...(spamResults as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[SPAM] ${r.name}: ${r.snippet}`),
      ...(socialResults as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[SOCIAL] ${r.name}: ${r.snippet}`),
      ...(leakResults as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[LEAK] ${r.name}: ${r.snippet}`),
      ...(callerIdResults as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[CALLER-ID] ${r.name}: ${r.snippet}`),
      ...(serviceResults as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[SERVICES] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in phone number intelligence and digital identity investigation.
Analyze the phone number data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 🔒 SAFETY ASSESSMENT
- Overall safety rating (SAFE / SUSPICIOUS / DANGEROUS)
- Spam/scam reports found
- Risk level explanation

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
- Leak severity assessment
- Compromised accounts

## 📍 CARRIER & LOCATION
- Mobile carrier/provider
- Geographic location
- Number type (mobile/landline/VoIP)
- Country and region

## 🔗 DIGITAL FOOTPRINT
- Online presence linked to this number
- Social media connections
- Public profiles found

## 🎯 RECOMMENDATIONS
- Further investigation steps
- Verification recommendations
- Risk mitigation advice

Be thorough and specific. Include all findings from the data. Use emojis for section headers.`,
          `Analyze phone number: ${phone}\nNumber info: Country=${countryInfo.country}, Carrier=${carrierInfo.carrier}, Format=${countryInfo.format}\n\nIntelligence data:\n${allContext}\n\nProvide a complete phone number OSINT intelligence report.`
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
      registeredServices,
      detectedServiceCount: registeredServices.filter(s => s.detected).length,
      associatedPeople,
      dataLeaks,
      leakCount: dataLeaks.length,
      socialAccounts,
      spamReports,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    // Indonesian carrier detection from number prefix
    // After country code 62, next digits start with 8
    const afterCountryCode = cleaned.substring(2); // remove 62
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
