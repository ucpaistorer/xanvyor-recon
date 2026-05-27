import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: 'Email or username is required' }, { status: 400 });
    }

    const target = query.trim();

    // Search for breach data across multiple sources
    const breachSearch = await safeWebSearch(`"${target}" data breach leak password compromised haveibeenpwned`, 8);
    const darkwebSearch = await safeWebSearch(`"${target}" dark web leaked database paste stolen credentials`, 5);
    const leakSearch = await safeWebSearch(`"${target}" site:pastebin.com OR site:paste.ee OR site:justpaste.it OR site:github.com leak credentials`, 5);

    const allResults = [
      ...(breachSearch as Array<Record<string, string>>),
      ...(darkwebSearch as Array<Record<string, string>>),
      ...(leakSearch as Array<Record<string, string>>),
    ];

    const allText = allResults.map(r => `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase()).join(' ');

    // Detect specific breaches
    const knownBreaches = [
      'linkedin', 'myspace', 'adobe', 'yahoo', 'dropbox', 'tumblr', 'vk',
      'dailymotion', 'myspace', 'mogstream', 'lastfm', 'zomato', 'canva',
      'marriott', 'equifax', 'capital one', 'ashley madison', 'samsung',
      'facebook', 'twitter', 'uber', 'samsung', 'decathlon', 'wattpad',
      'bidao', 'dubsmash', 'evite', 'flipboard', 'gfy', 'hackerearth',
      'hong kong', 'internations', 'kore', 'limele', 'myfitnesspal',
      'netlog', 'quora', 'raisin', 'sharechat', 'stormfront', 'stryker',
      'techincio', 'tokopedia', 'bukalapak', 'shopee', 'gojek',
    ];

    const detectedBreaches = knownBreaches.filter(b => allText.includes(b));

    // Severity assessment
    const criticalKeywords = ['ssn', 'social security', 'credit card', 'bank account', 'ktp', 'nik', 'identity theft'];
    const highKeywords = ['password', 'credentials', 'login', 'authentication', 'hash', 'bcrypt'];
    const mediumKeywords = ['email', 'username', 'phone', 'address', 'personal'];

    const criticalFound = criticalKeywords.filter(k => allText.includes(k));
    const highFound = highKeywords.filter(k => allText.includes(k));
    const mediumFound = mediumKeywords.filter(k => allText.includes(k));

    let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
    if (criticalFound.length > 0) severity = 'critical';
    else if (highFound.length > 0) severity = 'high';
    else if (mediumFound.length > 0) severity = 'medium';

    // Data types exposed
    const dataTypes: string[] = [];
    if (allText.includes('email')) dataTypes.push('Email Address');
    if (allText.includes('password')) dataTypes.push('Password Hash');
    if (allText.includes('name') || allText.includes('full name')) dataTypes.push('Full Name');
    if (allText.includes('phone') || allText.includes('telephone')) dataTypes.push('Phone Number');
    if (allText.includes('address')) dataTypes.push('Physical Address');
    if (allText.includes('ip address')) dataTypes.push('IP Address');
    if (allText.includes('date of birth') || allText.includes('dob')) dataTypes.push('Date of Birth');
    if (allText.includes('credit card') || allText.includes('card number')) dataTypes.push('Credit Card');
    if (allText.includes('social security') || allText.includes('ssn')) dataTypes.push('SSN/National ID');
    if (allText.includes('ktp') || allText.includes('nik')) dataTypes.push('KTP/NIK');
    if (allText.includes('geo') || allText.includes('location')) dataTypes.push('Geolocation Data');

    // AI analysis
    const searchContext = allResults.slice(0, 12)
      .map((r, i) => `${i + 1}. ${r.name}\n   ${r.snippet}\n   ${r.url}`)
      .join('\n\n');

    const aiAnalysis = searchContext.length > 0
      ? await safeAIAnalysis(
          `You are a cybersecurity breach analyst. Analyze the breach exposure for this target. Report with:
## 🚨 BREACH EXPOSURE SUMMARY
## 📊 SEVERITY ASSESSMENT
## 🔓 COMPROMISED DATA TYPES
## 🏢 AFFECTED SERVICES
## 🛡️ RECOMMENDATIONS
Be concise, each section 2-3 lines max.`,
          `Target: "${target}"
Severity: ${severity} | Breaches: ${detectedBreaches.join(', ') || 'None detected'}
Data types: ${dataTypes.join(', ') || 'Unknown'}
Critical: ${criticalFound.join(', ')} | High: ${highFound.join(', ')} | Medium: ${mediumFound.join(', ')}

Search Results:
${searchContext.substring(0, 2000)}`
        )
      : 'No breach data found for this target.';

    return NextResponse.json({
      success: true,
      target,
      severity,
      detectedBreaches,
      dataTypes,
      criticalIndicators: criticalFound,
      highIndicators: highFound,
      mediumIndicators: mediumFound,
      searchResults: allResults.slice(0, 15).map((r: Record<string, string>) => ({
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
