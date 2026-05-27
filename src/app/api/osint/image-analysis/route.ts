import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeVisionAnalysis } from '@/lib/zai';

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
    if (vlmResult.success) {
      analysis = vlmResult.content || 'No analysis generated.';
    } else {
      analysis = vlmResult.error || 'Image analysis failed. The image URL may be inaccessible or the format may not be supported.';
    }

    // Also do a web search for related intel
    let relatedIntel: unknown[] = [];
    try {
      const searchResults = await safeWebSearch('OSINT image analysis reverse search tools techniques', 5);
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
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
