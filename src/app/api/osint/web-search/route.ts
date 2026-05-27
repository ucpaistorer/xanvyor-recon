import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { query, num = 5 } = await request.json();
    if (!query) {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    const results = await safeWebSearch(query, Math.min(num, 10));

    // AI-powered analysis of search results
    const searchContext = results
      .slice(0, 8)
      .map((r: Record<string, string>, i: number) => `${i + 1}. [${r.host_name}] ${r.name}\n   ${r.snippet}\n   URL: ${r.url}\n   Date: ${r.date}`)
      .join('\n\n');

    const aiAnalysis = results.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst. Report with: ## 🔍 KEY FINDINGS ## 🔗 CONNECTIONS ## ⚠️ THREAT INDICATORS ## 🎯 ACTIONABLE INTELLIGENCE
Be concise. Keep each section to 2-3 lines.`,
          `Query: "${query}"

${searchContext.substring(0, 1500)}`
        )
      : 'No search results available for analysis.';

    return NextResponse.json({
      success: true,
      query,
      totalResults: results.length,
      results: results.map((r: Record<string, unknown>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        rank: r.rank,
        date: r.date || '',
        favicon: r.favicon || '',
      })),
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
