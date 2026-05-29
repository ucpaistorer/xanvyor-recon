import { NextRequest, NextResponse } from 'next/server';
import { safeChatCompletion, safeWebSearch } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check if the user needs web search for current information
    const needsSearch = /latest|current|recent|today|now|news|update|price|weather|live|who is|what is|how to|find|search|lookup|siapa|apa|dimana|kapan|berapa|cara|cari/i.test(message);

    let searchContext = '';
    if (needsSearch) {
      try {
        const searchResults = await safeWebSearch(message, 5);
        searchContext = (searchResults as Array<Record<string, string>>)
          .map((r: Record<string, string>) => `• ${r.name}: ${r.snippet} (${r.url})`)
          .join('\n');
      } catch (e) {
        console.error('[ai-chat] Web search failed:', e instanceof Error ? e.message : String(e));
        searchContext = '';
      }
    }

    const messages = [
      {
        role: 'system' as const,
        content: `You are RECON-AI, an advanced OSINT (Open Source Intelligence) analysis assistant. You specialize in:
- Digital footprint analysis
- Social media intelligence (SOCMINT)
- Cyber threat intelligence
- Geolocation analysis
- Network reconnaissance
- Identity investigation
- Data breach assessment
- Dark web monitoring guidance
- Forensic analysis recommendations

You provide structured, professional intelligence reports. You always emphasize ethical and legal OSINT practices. You never assist with illegal activities. You format your responses with clear sections, risk assessments, and actionable recommendations.

When analyzing, consider: data sources, reliability, timeliness, and corroboration needs. Always note the confidence level of your assessments.

You can respond in both English and Indonesian (Bahasa Indonesia). Match the language of the user's query.`
      },
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: (h.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
        content: h.content,
      })),
      {
        role: 'user' as const,
        content: needsSearch && searchContext
          ? `${message}\n\n[Real-time Intelligence Data]:\n${searchContext}`
          : message,
      },
    ];

    const result = await safeChatCompletion(messages);

    if (result.success && result.content) {
      return NextResponse.json({
        success: true,
        response: result.content,
        sourcesIncluded: needsSearch && searchContext.length > 0,
      });
    }

    // If everything failed, return a helpful fallback
    return NextResponse.json({
      success: true,
      response: `I'm currently experiencing high traffic and my AI analysis service is temporarily limited. Here's what I can tell you about your query:

**Your Question:** ${message.substring(0, 200)}

${searchContext ? `**Web Search Results Found:**\n${searchContext.substring(0, 1000)}` : '**Suggestion:** Try rephrasing your query or check back in a few moments for a more detailed AI analysis.'}

I'll be back to full capacity shortly. In the meantime, you can use the other OSINT tools in the dashboard for specific lookups.`,
      sourcesIncluded: needsSearch && searchContext.length > 0,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
