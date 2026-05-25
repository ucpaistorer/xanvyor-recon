import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const zai = await getZAI();

    const [phoneSearch, spamSearch, carrierSearch] = await Promise.all([
      zai.functions.invoke('web_search', {
        query: `"${phone}" phone number caller ID`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${phone} spam scam robocall fraud report`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${phone} carrier provider location area code`,
        num: 5,
      }),
    ]);

    // Analyze phone number structure
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
    const phoneAnalysis = {
      original: phone,
      cleaned,
      length: cleaned.length,
      likelyCountry: guessCountry(cleaned),
      format: detectFormat(phone),
    };

    // AI analysis
    let aiAnalysis = '';
    try {
      const allContext = [
        ...phoneSearch.slice(0, 4).map((r: { name: string; snippet: string }) => `[INFO] ${r.name}: ${r.snippet}`),
        ...spamSearch.slice(0, 4).map((r: { name: string; snippet: string }) => `[SPAM] ${r.name}: ${r.snippet}`),
        ...carrierSearch.slice(0, 3).map((r: { name: string; snippet: string }) => `[CARRIER] ${r.name}: ${r.snippet}`),
      ].join('\n\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an OSINT analyst specializing in phone number intelligence. Analyze phone number data and provide: 1) Number identification 2) Geographic location 3) Carrier information 4) Spam/fraud assessment 5) Associated accounts/services 6) Risk level 7) Recommendations. Format as structured intelligence report.'
          },
          {
            role: 'user',
            content: `Analyze phone number: ${phone}\n\nIntelligence data:\n${allContext}\n\nProvide a comprehensive phone number intelligence report.`
          }
        ],
        thinking: { type: 'disabled' }
      });
      aiAnalysis = completion.choices[0]?.message?.content || '';
    } catch {
      aiAnalysis = 'AI analysis unavailable';
    }

    return NextResponse.json({
      success: true,
      analysis: phoneAnalysis,
      phoneResults: phoneSearch.map((r: { url: string; name: string; snippet: string; host_name: string; date: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date,
      })),
      spamResults: spamSearch.map((r: { url: string; name: string; snippet: string; host_name: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      carrierResults: carrierSearch.map((r: { url: string; name: string; snippet: string }) => ({
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
  if (cleaned.startsWith('39')) return 'Italy';
  if (cleaned.startsWith('34')) return 'Spain';
  if (cleaned.startsWith('62')) return 'Indonesia';
  if (cleaned.startsWith('60')) return 'Malaysia';
  return 'Unknown';
}

function detectFormat(phone: string): string {
  if (phone.startsWith('+')) return 'International (E.164)';
  if (phone.startsWith('00')) return 'International (Prefix)';
  if (/^\(\d{3}\)/.test(phone)) return 'US Format';
  return 'Local Format';
}
