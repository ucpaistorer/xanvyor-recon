import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Analyze phone number structure
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    const phoneAnalysis = {
      original: phone,
      cleaned,
      length: cleaned.length,
      likelyCountry: guessCountry(cleaned),
      format: detectFormat(phone),
    };

    // Sequential searches to avoid rate limiting
    const phoneSearch = await safeWebSearch(`"${phone}" phone number caller ID`, 10);
    const spamSearch = await safeWebSearch(`${phone} spam scam robocall fraud report`, 10);
    const carrierSearch = await safeWebSearch(`${phone} carrier provider location area code`, 5);

    // AI analysis
    const allContext = [
      ...(phoneSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[INFO] ${r.name}: ${r.snippet}`),
      ...(spamSearch as Array<Record<string, string>>).slice(0, 4).map((r: Record<string, string>) => `[SPAM] ${r.name}: ${r.snippet}`),
      ...(carrierSearch as Array<Record<string, string>>).slice(0, 3).map((r: Record<string, string>) => `[CARRIER] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          'You are an OSINT analyst specializing in phone number intelligence. Analyze phone number data and provide: 1) Number identification 2) Geographic location 3) Carrier information 4) Spam/fraud assessment 5) Associated accounts/services 6) Risk level 7) Recommendations. Format as structured intelligence report.',
          `Analyze phone number: ${phone}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive phone number intelligence report.`
        )
      : 'No phone intelligence data available for this number.';

    return NextResponse.json({
      success: true,
      analysis: phoneAnalysis,
      phoneResults: (phoneSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date || '',
      })),
      spamResults: (spamSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      carrierResults: (carrierSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
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

function guessCountry(cleaned: string): string {
  if (cleaned.startsWith('1')) return 'United States/Canada';
  if (cleaned.startsWith('44')) return 'United Kingdom';
  if (cleaned.startsWith('86')) return 'China';
  if (cleaned.startsWith('91')) return 'India';
  if (cleaned.startsWith('81')) return 'Japan';
  if (cleaned.startsWith('49')) return 'Germany';
  if (cleaned.startsWith('33')) return 'France';
  if (cleaned.startsWith('61')) return 'Australia';
  if (cleaned.startsWith('55')) return 'Brazil';
  if (cleaned.startsWith('7')) return 'Russia';
  if (cleaned.startsWith('82')) return 'South Korea';
  if (cleaned.startsWith('62')) return 'Indonesia';
  if (cleaned.startsWith('60')) return 'Malaysia';
  if (cleaned.startsWith('66')) return 'Thailand';
  if (cleaned.startsWith('84')) return 'Vietnam';
  return 'Unknown';
}

function detectFormat(phone: string): string {
  if (phone.startsWith('+')) return 'International (E.164)';
  if (phone.startsWith('00')) return 'International (Prefix)';
  if (/^\(\d{3}\)/.test(phone)) return 'US Format';
  return 'Local Format';
}
