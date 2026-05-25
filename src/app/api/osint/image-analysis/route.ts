import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, prompt } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 });
    }

    const zai = await getZAI();

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

    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: analysisPrompt },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
      thinking: { type: 'disabled' },
    });

    const analysis = response.choices[0]?.message?.content || '';

    // Also do a web search for the image or similar
    let relatedIntel: unknown[] = [];
    try {
      const searchResults = await zai.functions.invoke('web_search', {
        query: `image analysis reverse search ${imageUrl.includes('http') ? 'source of image' : ''}`,
        num: 5,
      });
      relatedIntel = searchResults.map((r: { url: string; name: string; snippet: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      }));
    } catch {
      // ignore
    }

    return NextResponse.json({
      success: true,
      imageUrl,
      analysis,
      relatedIntel,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
