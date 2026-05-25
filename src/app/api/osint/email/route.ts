import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

// Known breach databases and leak sources
const KNOWN_BREACH_SOURCES = [
  'haveibeenpwned', 'dehashed', 'leakcheck', 'breachdirectory',
  'snusbase', 'leakedsource', 'pastebin', 'ghostbin',
  'raidforums', 'breachforums', 'exploit.in',
];

// Email provider classification
const EMAIL_PROVIDERS: Record<string, { type: string; country: string; risk: string }> = {
  'gmail.com': { type: 'Free Webmail', country: 'Global', risk: 'low' },
  'yahoo.com': { type: 'Free Webmail', country: 'Global', risk: 'low' },
  'outlook.com': { type: 'Free Webmail', country: 'Global', risk: 'low' },
  'hotmail.com': { type: 'Free Webmail (Legacy)', country: 'Global', risk: 'medium' },
  'icloud.com': { type: 'Apple Email', country: 'Global', risk: 'low' },
  'protonmail.com': { type: 'Encrypted Email', country: 'Switzerland', risk: 'low' },
  'proton.me': { type: 'Encrypted Email', country: 'Switzerland', risk: 'low' },
  'tutanota.com': { type: 'Encrypted Email', country: 'Germany', risk: 'low' },
  'mail.ru': { type: 'Free Webmail', country: 'Russia', risk: 'medium' },
  'yandex.com': { type: 'Free Webmail', country: 'Russia', risk: 'medium' },
  'qq.com': { type: 'Free Webmail', country: 'China', risk: 'medium' },
  '163.com': { type: 'Free Webmail', country: 'China', risk: 'medium' },
  'naver.com': { type: 'Free Webmail', country: 'South Korea', risk: 'low' },
  'daum.net': { type: 'Free Webmail', country: 'South Korea', risk: 'low' },
  'co.id': { type: 'Corporate (Indonesia)', country: 'Indonesia', risk: 'low' },
  'ac.id': { type: 'Academic (Indonesia)', country: 'Indonesia', risk: 'low' },
  'go.id': { type: 'Government (Indonesia)', country: 'Indonesia', risk: 'low' },
  'web.id': { type: 'Web (Indonesia)', country: 'Indonesia', risk: 'medium' },
  'telkom.net': { type: 'ISP Email (Indonesia)', country: 'Indonesia', risk: 'medium' },
  'indosat.net': { type: 'ISP Email (Indonesia)', country: 'Indonesia', risk: 'medium' },
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const [username, domain] = email.split('@');

    // Email provider analysis
    const providerInfo = analyzeProvider(domain);

    // Sequential searches for comprehensive email OSINT
    const emailSearch = await safeWebSearch(`"${email}" OR "${username}@${domain}"`, 10);
    const breachSearch = await safeWebSearch(`"${email}" data breach leak paste compromised hacked`, 10);
    const socialSearch = await safeWebSearch(`"${email}" account profile registered social media`, 8);
    const ktpSearch = await safeWebSearch(`"${email}" KTP identitas personal data leak Indonesia`, 8);
    const domainSearch = await safeWebSearch(`${domain} domain whois information MX records`, 5);

    // Detect linked accounts from search results
    const allResults = [
      ...(emailSearch as Array<Record<string, string>>),
      ...(socialSearch as Array<Record<string, string>>),
    ];
    const allText = allResults.map((r: Record<string, string>) => `${r.name ?? ''} ${r.snippet ?? ''} ${r.url ?? ''}`.toLowerCase()).join(' ');

    const linkedAccounts = detectLinkedAccounts(allText, email);

    // Breach detection with severity
    const breachKeywords = ['breach', 'leak', 'compromised', 'hacked', 'paste', 'dumped', 'exposed', 'stolen', 'credential'];
    const detectedBreaches = (breachSearch as Array<Record<string, string>>)
      .filter((r: Record<string, string>) =>
        breachKeywords.some(k => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase().includes(k))
      )
      .map((r: Record<string, string>) => {
        const text = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let breachType = 'Data Exposure';
        if (text.includes('password') || text.includes('credential')) { severity = 'critical'; breachType = 'Credential Breach'; }
        else if (text.includes('ktp') || text.includes('identity') || text.includes('identitas')) { severity = 'critical'; breachType = 'Identity Breach'; }
        else if (text.includes('financial') || text.includes('bank') || text.includes('credit card')) { severity = 'critical'; breachType = 'Financial Breach'; }
        else if (text.includes('breach') && text.includes('million')) { severity = 'high'; breachType = 'Large-Scale Breach'; }
        else if (text.includes('email') && text.includes('leak')) { severity = 'high'; breachType = 'Email Leak'; }
        else if (text.includes('paste') || text.includes('pastebin')) { severity = 'medium'; breachType = 'Paste Site Exposure'; }

        // Check if from known breach source
        const fromKnownSource = KNOWN_BREACH_SOURCES.some(s => text.includes(s));

        return {
          type: breachType,
          severity,
          source: r.host_name || '',
          description: r.snippet?.substring(0, 200) || '',
          url: r.url || '',
          fromKnownSource,
        };
      });

    // KTP/ID leak detection
    const ktpKeywords = ['ktp', 'nik', 'identitas', 'id card', 'identity card', 'passport', 'kk', 'kartu keluarga'];
    const ktpLeaks = (ktpSearch as Array<Record<string, string>>)
      .filter((r: Record<string, string>) =>
        ktpKeywords.some(k => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase().includes(k))
      )
      .map((r: Record<string, string>) => ({
        type: 'Identity Document Exposure',
        severity: 'critical' as const,
        description: r.snippet?.substring(0, 200) || '',
        source: r.host_name || '',
        url: r.url || '',
      }));

    // Email structure analysis
    const emailAnalysis = {
      email,
      username,
      domain,
      providerType: providerInfo.type,
      providerCountry: providerInfo.country,
      providerRisk: providerInfo.risk,
      isCommonDomain: ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'].includes(domain.toLowerCase()),
      isDisposable: isDisposableEmail(domain),
      usernamePatterns: analyzeUsername(username),
    };

    // AI deep analysis
    const emailContext = (emailSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) =>
      `[EXPOSURE] ${r.name}: ${r.snippet}`
    ).join('\n');

    const breachContext = (breachSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) =>
      `[BREACH] ${r.name}: ${r.snippet}`
    ).join('\n');

    const socialContext = (socialSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) =>
      `[SOCIAL] ${r.name}: ${r.snippet}`
    ).join('\n');

    const ktpContext = (ktpSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) =>
      `[ID-LEAK] ${r.name}: ${r.snippet}`
    ).join('\n');

    const allContext = [emailContext, breachContext, socialContext, ktpContext].filter(Boolean).join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in email intelligence and digital identity investigation.
Analyze the email address data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 📧 EMAIL INTELLIGENCE
- Email address analysis (provider, format, pattern)
- Provider risk assessment
- Email type classification (personal/corporate/disposable)

## 🔗 LINKED ACCOUNTS & SERVICES
- Platforms and services linked to this email
- Social media accounts found
- Professional profiles
- E-commerce and financial services

## 🚨 BREACH & EXPOSURE ASSESSMENT
- Data breaches involving this email
- Credential exposure level
- Known breach databases listing this email
- Password compromise indicators

## 🪪 IDENTITY DOCUMENT LEAKS
- KTP/ID card exposure (especially for Indonesian targets)
- Personal identity data leaks
- Document type and severity

## 🎯 DIGITAL FOOTPRINT
- Online presence linked to this email
- Public profiles and registrations
- Domain/organization association

## 📊 RISK ASSESSMENT
- Overall risk score (Low/Medium/High/Critical)
- Exposure severity
- Recommended actions

## 🔍 INVESTIGATION RECOMMENDATIONS
- Further verification steps
- Cross-reference suggestions
- Mitigation advice

Be thorough and specific. Use emojis for section headers.`,
          `Analyze email: ${email}\nProvider: ${providerInfo.type} (${providerInfo.country}), Risk: ${providerInfo.risk}\n\nIntelligence data:\n${allContext}\n\nProvide a complete email intelligence report.`
        )
      : 'No data available for analysis. Try a different email address.';

    return NextResponse.json({
      success: true,
      analysis: emailAnalysis,
      linkedAccounts,
      detectedBreaches,
      breachCount: detectedBreaches.length,
      ktpLeaks,
      ktpLeakCount: ktpLeaks.length,
      emailExposure: (emailSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date || '',
      })),
      domainInfo: (domainSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      socialAccounts: (socialSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function analyzeProvider(domain: string): { type: string; country: string; risk: string } {
  const lower = domain.toLowerCase();
  // Check exact match first
  if (EMAIL_PROVIDERS[lower]) return EMAIL_PROVIDERS[lower];
  // Check TLD-based
  if (lower.endsWith('.co.id')) return { type: 'Corporate (Indonesia)', country: 'Indonesia', risk: 'low' };
  if (lower.endsWith('.ac.id')) return { type: 'Academic (Indonesia)', country: 'Indonesia', risk: 'low' };
  if (lower.endsWith('.go.id')) return { type: 'Government (Indonesia)', country: 'Indonesia', risk: 'low' };
  if (lower.endsWith('.web.id')) return { type: 'Web (Indonesia)', country: 'Indonesia', risk: 'medium' };
  if (lower.endsWith('.org')) return { type: 'Organization', country: 'Global', risk: 'low' };
  if (lower.endsWith('.edu')) return { type: 'Academic', country: 'US', risk: 'low' };
  if (lower.endsWith('.gov')) return { type: 'Government', country: 'US', risk: 'low' };
  if (lower.endsWith('.com')) return { type: 'Commercial', country: 'Global', risk: 'low' };
  if (lower.endsWith('.io')) return { type: 'Tech Startup', country: 'Global', risk: 'low' };
  if (lower.endsWith('.dev')) return { type: 'Developer', country: 'Global', risk: 'low' };
  return { type: 'Custom Domain', country: 'Unknown', risk: 'medium' };
}

function detectLinkedAccounts(searchText: string, email: string): Array<{ platform: string; icon: string; category: string; detected: boolean; confidence: string }> {
  const platforms = [
    { platform: 'Google/Gmail', icon: '🔍', category: 'Tech', hint: 'google' },
    { platform: 'Facebook', icon: '👤', category: 'Social Media', hint: 'facebook' },
    { platform: 'Twitter/X', icon: '🐦', category: 'Social Media', hint: 'twitter' },
    { platform: 'Instagram', icon: '📸', category: 'Social Media', hint: 'instagram' },
    { platform: 'LinkedIn', icon: '💼', category: 'Professional', hint: 'linkedin' },
    { platform: 'GitHub', icon: '🐙', category: 'Development', hint: 'github' },
    { platform: 'Amazon', icon: '📦', category: 'E-Commerce', hint: 'amazon' },
    { platform: 'Spotify', icon: '🎧', category: 'Music', hint: 'spotify' },
    { platform: 'Netflix', icon: '🎬', category: 'Streaming', hint: 'netflix' },
    { platform: 'PayPal', icon: '💰', category: 'Finance', hint: 'paypal' },
    { platform: 'Steam', icon: '🎮', category: 'Gaming', hint: 'steam' },
    { platform: 'TikTok', icon: '🎵', category: 'Social Media', hint: 'tiktok' },
    { platform: 'Reddit', icon: '🔴', category: 'Forum', hint: 'reddit' },
    { platform: 'Pinterest', icon: '📌', category: 'Social Media', hint: 'pinterest' },
    { platform: 'Shopee', icon: '🛒', category: 'E-Commerce', hint: 'shopee' },
    { platform: 'Tokopedia', icon: '🛍️', category: 'E-Commerce', hint: 'tokopedia' },
    { platform: 'Grab', icon: '🚗', category: 'Services', hint: 'grab' },
    { platform: 'Gojek', icon: '🏍️', category: 'Services', hint: 'gojek' },
    { platform: 'BCA', icon: '🏦', category: 'Banking', hint: 'bca' },
    { platform: 'Dropbox', icon: '📁', category: 'Cloud', hint: 'dropbox' },
  ];

  return platforms.map(p => {
    const detected = searchText.includes(p.hint) || searchText.includes(email.toLowerCase());
    return {
      platform: p.platform,
      icon: p.icon,
      category: p.category,
      detected,
      confidence: detected ? 'high' : 'unknown',
    };
  });
}

function isDisposableEmail(domain: string): boolean {
  const disposableProviders = [
    'guerrillamail.com', 'mailinator.com', 'tempmail.com', 'throwaway.email',
    'yopmail.com', 'dispostable.com', 'trashmail.com', 'sharklasers.com',
    'guerrillamailblock.com', 'grr.la', 'dispostable.com', 'maildrop.cc',
    'mailnesia.com', 'tempail.com', 'tempr.email', 'discard.email',
  ];
  return disposableProviders.includes(domain.toLowerCase());
}

function analyzeUsername(username: string): string[] {
  const patterns: string[] = [];
  if (/^\d+$/.test(username)) patterns.push('Numeric-only');
  if (/[._-]/.test(username)) patterns.push('Contains separators');
  if (username === username.toLowerCase()) patterns.push('All lowercase');
  if (/\d{4,}/.test(username)) patterns.push('Contains year pattern');
  if (username.length <= 3) patterns.push('Very short username');
  if (username.includes('admin')) patterns.push('Admin-like pattern');
  if (/^(the|mr|mrs|dr|real)/.test(username.toLowerCase())) patterns.push('Title prefix');
  if (/^\w+\.\w+$/.test(username)) patterns.push('First.Last pattern');
  if (/^\w+_\w+$/.test(username)) patterns.push('First_Last pattern');
  if (/\.(com|net|org|io)$/i.test(username)) patterns.push('Domain-like pattern');
  return patterns;
}
