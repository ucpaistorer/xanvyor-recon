/**
 * ZAI API Proxy Service
 * Runs on port 3001 - proxies API requests to the ZAI internal API
 * This allows the VPS deployment to access ZAI API features
 */
import ZAI from 'z-ai-web-dev-sdk';

const PORT = 3001;

let zaiInstance: Awaited<ReturnType<typeof ZAI.create>> | null = null;

async function getZAI() {
  if (!zaiInstance) {
    zaiInstance = await ZAI.create();
  }
  return zaiInstance;
}

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    // Handle CORS
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Z-AI-From',
        },
      });
    }

    const url = new URL(req.url);
    
    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', service: 'zai-proxy', port: PORT });
    }

    // Web Search proxy
    if (url.pathname === '/web-search' && req.method === 'POST') {
      try {
        const { query, num } = await req.json();
        const zai = await getZAI();
        const results = await zai.functions.invoke('web_search', { query, num: Math.min(num || 10, 20) });
        return Response.json({ success: true, results }, { headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Response.json({ success: false, error: msg }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // AI Chat proxy
    if (url.pathname === '/chat' && req.method === 'POST') {
      try {
        const { messages, thinking } = await req.json();
        const zai = await getZAI();
        const completion = await zai.chat.completions.create({
          messages,
          thinking: thinking || { type: 'disabled' },
        });
        return Response.json(completion, { headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Response.json({ error: msg }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // Vision proxy
    if (url.pathname === '/vision' && req.method === 'POST') {
      try {
        const { messages, thinking } = await req.json();
        const zai = await getZAI();
        const response = await zai.chat.completions.createVision({
          messages,
          thinking: thinking || { type: 'disabled' },
        });
        return Response.json(response, { headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Response.json({ error: msg }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    // Generic function invoke proxy
    if (url.pathname === '/invoke' && req.method === 'POST') {
      try {
        const { function_name, arguments: args } = await req.json();
        const zai = await getZAI();
        const result = await zai.functions.invoke(function_name, args);
        return Response.json({ success: true, result }, { headers: { 'Access-Control-Allow-Origin': '*' } });
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return Response.json({ success: false, error: msg }, { status: 500, headers: { 'Access-Control-Allow-Origin': '*' } });
      }
    }

    return Response.json({ error: 'Not found' }, { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } });
  },
});

console.log(`🚀 ZAI Proxy Service running on port ${PORT}`);
