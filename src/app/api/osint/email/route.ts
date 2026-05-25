import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const zai = await getZAI();
    const [username, domain] = email.split('@');

    // Search for email across the web
    const [emailSearch, domainSearch, breachSearch] = await Promise.all([
      zai.functions.invoke('web_search', {
        query: `"${email}" OR "${username}" ${domain}`,
        num: 10,
      }),
      zai.functions.invoke('web_search', {
        query: `${domain} domain whois information`,
        num: 5,
      }),
      zai.functions.invoke('web_search', {
        query: `"${email}" data breach leak paste`,
        num: 10,
      }),
    ]);

    // Analyze email structure
    const emailAnalysis = {
      email,
      username,
      domain,
      isCommonDomain: ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'].includes(domain.toLowerCase()),
      usernamePatterns: analyzeUsername(username),
    };

    // AI deep analysis
    let aiAnalysis = '';
    try {
      const emailContext = emailSearch.slice(0, 5).map((r: { name: string; snippet: string; url: string }) => 
        `• ${r.name}\n  ${r.snippet}\n  ${r.url}`
      ).join('\n\n');

      const breachContext = breachSearch.slice(0, 5).map((r: { name: string; snippet: string }) => 
        `• ${r.name}: ${r.snippet}`
      ).join('\n\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an OSINT analyst specializing in email intelligence. Analyze email search results and provide: 1) Digital footprint summary 2) Associated accounts/platforms 3) Potential security risks 4) Breach exposure assessment 5) Recommendations for further investigation. Be thorough but concise.'
          },
          {
            role: 'user',
            content: `Analyze email: ${email}\n\nEmail exposure results:\n${emailContext}\n\nBreach/data leak results:\n${breachContext}\n\nProvide a comprehensive email intelligence report.`
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
      analysis: emailAnalysis,
      emailExposure: emailSearch.map((r: { url: string; name: string; snippet: string; host_name: string; date: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date,
      })),
      domainInfo: domainSearch.map((r: { url: string; name: string; snippet: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      breachInfo: breachSearch.map((r: { url: string; name: string; snippet: string; date: string }) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        date: r.date,
      })),
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function analyzeUsername(username: string) {
  const patterns: string[] = [];
  if (/^\d+$/.test(username)) patterns.push('Numeric-only');
  if (/[._-]/.test(username)) patterns.push('Contains separators');
  if (username === username.toLowerCase()) patterns.push('All lowercase');
  if (/\d{4,}/.test(username)) patterns.push('Contains year pattern');
  if (username.length <= 3) patterns.push('Very short username');
  if (username.includes('admin')) patterns.push('Admin-like pattern');
  if (/^(the|mr|mrs|dr|real)/.test(username.toLowerCase())) patterns.push('Title prefix');
  return patterns;
}
