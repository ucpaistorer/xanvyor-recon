import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

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

    const [username, domain] = email.split('@');

    // Sequential searches to avoid rate limiting
    const emailSearch = await safeWebSearch(`"${email}" OR "${username}" ${domain}`, 10);
    const domainSearch = await safeWebSearch(`${domain} domain whois information`, 5);
    const breachSearch = await safeWebSearch(`"${email}" data breach leak paste`, 10);

    // Analyze email structure
    const emailAnalysis = {
      email,
      username,
      domain,
      isCommonDomain: ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'protonmail.com'].includes(domain.toLowerCase()),
      usernamePatterns: analyzeUsername(username),
    };

    // AI deep analysis
    const emailContext = (emailSearch as Array<Record<string, string>>).slice(0, 5).map((r: Record<string, string>) => 
      `• ${r.name}\n  ${r.snippet}\n  ${r.url}`
    ).join('\n\n');

    const breachContext = (breachSearch as Array<Record<string, string>>).slice(0, 5).map((r: Record<string, string>) => 
      `• ${r.name}: ${r.snippet}`
    ).join('\n\n');

    const aiAnalysis = (emailSearch.length > 0 || breachSearch.length > 0)
      ? await safeAIAnalysis(
          'You are an OSINT analyst specializing in email intelligence. Analyze email search results and provide: 1) Digital footprint summary 2) Associated accounts/platforms 3) Potential security risks 4) Breach exposure assessment 5) Recommendations for further investigation. Be thorough but concise.',
          `Analyze email: ${email}\n\nEmail exposure results:\n${emailContext}\n\nBreach/data leak results:\n${breachContext}\n\nProvide a comprehensive email intelligence report.`
        )
      : 'No data available for analysis. Try a different email address.';

    return NextResponse.json({
      success: true,
      analysis: emailAnalysis,
      emailExposure: (emailSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
        date: r.date || '',
      })),
      domainInfo: (domainSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
      })),
      breachInfo: (breachSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        date: r.date || '',
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
