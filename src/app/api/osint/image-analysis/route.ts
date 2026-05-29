import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeVisionAnalysis, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, imageBase64, prompt } = await request.json();
    const effectiveImageUrl = imageBase64 || imageUrl;
    if (!effectiveImageUrl) {
      return NextResponse.json({ error: 'Image is required (upload a file or provide URL)' }, { status: 400 });
    }

    const analysisPrompt = prompt || `Analyze this image for OSINT intelligence. Identify and report:
1. Location indicators (landmarks, signs, language on signs, architecture style)
2. Timestamp indicators (lighting, shadows, weather, season)
3. Technology/devices visible
4. Text/identifying information visible
5. People description (without identifying by name)
6. Vehicle information if visible
7. Geolocation clues
8. Any other intelligence-relevant details
9. Reverse image search recommendations
Provide a structured OSINT analysis report.`;

    const vlmResult = await safeVisionAnalysis(effectiveImageUrl, analysisPrompt);
    
    let analysis: string;
    let vlmAvailable = vlmResult.success;
    
    if (vlmResult.success) {
      analysis = vlmResult.content || 'No analysis generated.';
    } else {
      // VLM failed - use AI text analysis as fallback
      const fallbackAnalysis = await safeAIAnalysis(
        'You are an OSINT image analysis expert. The user uploaded an image but the vision AI is unavailable. Provide a helpful analysis framework and suggest what they should look for in their image.',
        `The user wants OSINT analysis of an image but vision AI is temporarily unavailable. The original analysis request was: "${analysisPrompt.substring(0, 300)}". Provide a structured OSINT analysis checklist and suggest tools they can use for manual analysis (like Google Reverse Image Search, TinEye, Yandex Images, etc.).`
      );
      analysis = `⚠️ **Vision AI Temporarily Unavailable** - Using text-based analysis framework\n\n${fallbackAnalysis}`;
    }

    // Also do a web search for related intel and reverse search tools
    let relatedIntel: unknown[] = [];
    try {
      const searchResults = await safeWebSearch('OSINT image analysis reverse search tools techniques Google TinEye Yandex', 8);
      relatedIntel = (searchResults as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      }));
    } catch (e) {
      console.error('[image-analysis] Related intel search failed:', e instanceof Error ? e.message : String(e));
    }

    return NextResponse.json({
      success: true,
      imageUrl: effectiveImageUrl,
      analysis,
      relatedIntel,
      vlmAvailable,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
