import ZAI from 'z-ai-web-dev-sdk';

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

export async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

// Rate-limited web search with retry logic
export async function safeWebSearch(query: string, num: number = 10, retries: number = 3): Promise<unknown[]> {
  const zai = await getZAI();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const results = await zai.functions.invoke('web_search', { query, num: Math.min(num, 20) });
      return results as unknown[];
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('too many requests') || errMsg.toLowerCase().includes('rate limit')) {
        const waitTime = attempt * 3000; // 3s, 6s, 9s
        console.log(`[zai] Rate limited on "${query}". Waiting ${waitTime}ms (attempt ${attempt}/${retries})`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      // Non-rate-limit error, still retry once
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }
      console.error(`[zai] Web search failed after ${retries} attempts:`, errMsg);
      return []; // Return empty on final failure
    }
  }
  return [];
}

// Sequential web search with delay between calls to avoid rate limits
export async function sequentialWebSearch(calls: Array<{ query: string; num?: number }>, delayMs: number = 2000): Promise<unknown[][]> {
  const results: unknown[][] = [];
  
  for (let i = 0; i < calls.length; i++) {
    const call = calls[i];
    const result = await safeWebSearch(call.query, call.num || 10);
    results.push(result);
    
    // Add delay between calls (except for the last one)
    if (i < calls.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  return results;
}

// Safe AI chat completion with retry
export async function safeAIAnalysis(systemPrompt: string, userPrompt: string, retries: number = 2): Promise<string> {
  const zai = await getZAI();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const completion = await zai.chat.completions.create({
        messages: [
          { role: 'assistant', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        thinking: { type: 'disabled' }
      });
      return completion.choices[0]?.message?.content || '';
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[zai] AI analysis attempt ${attempt}/${retries} failed:`, errMsg.substring(0, 200));
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      return 'AI analysis temporarily unavailable due to rate limiting. Please try again in a moment.';
    }
  }
  return '';
}

// Safe VLM (Vision Language Model) call with retry
export async function safeVisionAnalysis(
  imageUrl: string,
  prompt: string,
  retries: number = 2
): Promise<{ success: boolean; content: string; error?: string }> {
  const zai = await getZAI();
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageUrl } },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      });
      const content = response.choices[0]?.message?.content || '';
      return { success: true, content };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      console.error(`[zai] VLM attempt ${attempt}/${retries} failed:`, errMsg.substring(0, 200));
      
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('too many requests') || errMsg.toLowerCase().includes('rate limit')) {
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          continue;
        }
        return { success: false, content: '', error: 'VLM analysis is currently rate limited. Please try again in a moment.' };
      }
      
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, 3000));
        continue;
      }
      return { success: false, content: '', error: `VLM analysis failed: ${errMsg}` };
    }
  }
  return { success: false, content: '', error: 'VLM analysis failed after retries.' };
}
