import { NextRequest, NextResponse } from 'next/server';
import { getZAI, safeWebSearch } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();
    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const zai = await getZAI();

    // Check if the user needs web search for current information
    const needsSearch = /latest|current|recent|today|now|news|update|price|weather|live|who is|what is|how to|find|search|lookup/i.test(message);

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
        role: 'assistant' as const,
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

When analyzing, consider: data sources, reliability, timeliness, and corroboration needs. Always note the confidence level of your assessments.`
      },
      ...history.map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      {
        role: 'user' as const,
        content: needsSearch && searchContext
          ? `${message}\n\n[Real-time Intelligence Data]:\n${searchContext}`
          : message,
      },
    ];

    try {
      const completion = await zai.chat.completions.create({
        messages,
        thinking: { type: 'disabled' },
      });

      const response = completion.choices[0]?.message?.content || 'No response generated.';

      return NextResponse.json({
        success: true,
        response,
        sourcesIncluded: needsSearch && searchContext.length > 0,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('too many requests')) {
        return NextResponse.json({
          success: true,
          response: 'I\'m currently experiencing high traffic. Please try again in a moment and I\'ll provide you with a comprehensive OSINT analysis.',
          sourcesIncluded: false,
        });
      }
      throw error;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
