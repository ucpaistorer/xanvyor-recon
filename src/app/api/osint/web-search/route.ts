import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { query, num = 10 } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const zai = await getZAI();
    const results = await zai.functions.invoke('web_search', {
      query,
      num: Math.min(num, 20),
    });

    // AI-powered analysis of search results
    const searchContext = results
      .slice(0, 8)
      .map((r: { name: string; snippet: string; url: string; host_name: string; date: string }, i: number) => `${i + 1}. [${r.host_name}] ${r.name}\n   ${r.snippet}\n   URL: ${r.url}\n   Date: ${r.date}`)
      .join('\n\n');

    let aiAnalysis = '';
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an OSINT analyst. Analyze web search results and provide intelligence insights. Focus on: key findings, connections, threat indicators, and actionable intelligence. Be concise but thorough.'
          },
          {
            role: 'user',
            content: `Analyze these web search results for OSINT intelligence regarding: "${query}"\n\n${searchContext}\n\nProvide a structured intelligence analysis.`
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
      query,
      totalResults: results.length,
      results: results.map((r: { url: string; name: string; snippet: string; host_name: string; rank: number; date: string; favicon: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        rank: r.rank,
        date: r.date,
        favicon: r.favicon,
      })),
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
