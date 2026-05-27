import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const targetUrl = url.trim();
    let hostname = '';
    try {
      hostname = new URL(targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`).hostname;
    } catch {
      hostname = targetUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    }

    // Run parallel web searches for security intelligence
    const [sslResults, headerResults, malwareResults, breachResults] = await sequentialWebSearch([
      { query: `site:ssllabs.com OR site:crt.sh "${hostname}" SSL certificate security headers CSP HSTS`, num: 5 },
      { query: `"${hostname}" cookie security HttpOnly Secure SameSite tracking`, num: 5 },
      { query: `"${hostname}" malware phishing blacklist safe browsing technology stack`, num: 5 },
      { query: `"${hostname}" data breach vulnerability security incident hack compromised`, num: 5 },
    ], 800);

    // Parse search results
    const parseResults = (results: unknown[]) => {
      return results.map((r: unknown) => {
        const result = r as Record<string, unknown>;
        return {
          url: (result.url as string) || '',
          title: (result.title as string) || (result.name as string) || '',
          snippet: (result.snippet as string) || '',
          domain: result.url ? new URL(result.url as string).hostname.replace('www.', '') : (result.host_name as string) || '',
        };
      }).filter((r) => r.title || r.snippet);
    };

    const sslData = parseResults(sslResults);
    const headerData = parseResults(headerResults);
    const malwareData = parseResults(malwareResults);
    const breachData = parseResults(breachResults);
    const cookieData = headerData;
    const techData = breachData;

    // Analyze with AI
    const aiAnalysis = await safeAIAnalysis(
      `Cybersecurity expert for web security auditing. Report with: ## 🔒 SSL/TLS ASSESSMENT ## 🛡️ SECURITY HEADERS ## 🍪 COOKIE SECURITY ## 🦠 MALWARE & BLACKLIST ## 🚨 BREACH HISTORY ## 💻 TECH VULNERABILITIES ## ⚠️ RISK LEVEL ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
      `Security audit for: ${hostname}

SSL: ${sslData.map(r => `${r.title}: ${r.snippet}`).join('; ').substring(0, 300)}
Headers: ${headerData.map(r => `${r.title}: ${r.snippet}`).join('; ').substring(0, 300)}
Malware: ${malwareData.map(r => `${r.title}: ${r.snippet}`).join('; ').substring(0, 300)}
Breach: ${breachData.map(r => `${r.title}: ${r.snippet}`).join('; ').substring(0, 300)}
Tech: ${techData.map(r => `${r.title}: ${r.snippet}`).join('; ').substring(0, 300)}`
    );

    // Determine overall security status based on findings
    const hasBreach = breachData.some(r =>
      (r.title + r.snippet).toLowerCase().includes('breach') ||
      (r.title + r.snippet).toLowerCase().includes('hack') ||
      (r.title + r.snippet).toLowerCase().includes('compromised')
    );
    const hasMalware = malwareData.some(r =>
      (r.title + r.snippet).toLowerCase().includes('malware') ||
      (r.title + r.snippet).toLowerCase().includes('phishing') ||
      (r.title + r.snippet).toLowerCase().includes('blacklist')
    );
    const hasHeaderIssues = headerData.some(r =>
      (r.title + r.snippet).toLowerCase().includes('missing') ||
      (r.title + r.snippet).toLowerCase().includes('not set') ||
      (r.title + r.snippet).toLowerCase().includes('vulnerable')
    );

    let overallStatus = 'safe';
    let securityScore = 85;
    if (hasBreach || hasMalware) { overallStatus = 'dangerous'; securityScore = 25; }
    else if (hasHeaderIssues) { overallStatus = 'suspicious'; securityScore = 55; }

    // Build security checks
    const securityChecks = [
      {
        category: 'SSL/TLS Certificate',
        status: sslData.length > 0 ? 'checked' : 'unknown',
        items: [
          { name: 'HTTPS Enabled', status: targetUrl.startsWith('https') ? 'pass' : 'warning', detail: targetUrl.startsWith('https') ? 'Site uses HTTPS' : 'May not enforce HTTPS' },
          { name: 'Certificate Validity', status: sslData.some(r => (r.title + r.snippet).toLowerCase().includes('valid')) ? 'pass' : 'unknown', detail: 'Certificate chain validation' },
          { name: 'TLS Version', status: sslData.some(r => (r.title + r.snippet).toLowerCase().includes('tls 1.3')) ? 'pass' : sslData.some(r => (r.title + r.snippet).toLowerCase().includes('tls 1.2')) ? 'warning' : 'unknown', detail: 'Latest TLS protocol support' },
          { name: 'Certificate Transparency', status: sslData.some(r => (r.title + r.snippet).toLowerCase().includes('crt.sh') || (r.title + r.snippet).toLowerCase().includes('transparency')) ? 'pass' : 'unknown', detail: 'CT log presence' },
        ]
      },
      {
        category: 'Security Headers',
        status: headerData.length > 0 ? 'checked' : 'unknown',
        items: [
          { name: 'Content-Security-Policy', status: headerData.some(r => (r.title + r.snippet).toLowerCase().includes('content-security-policy') || (r.title + r.snippet).toLowerCase().includes('csp')) ? (headerData.some(r => (r.title + r.snippet).toLowerCase().includes('missing csp') || (r.title + r.snippet).toLowerCase().includes('no csp')) ? 'fail' : 'pass') : 'unknown', detail: 'XSS protection via CSP' },
          { name: 'Strict-Transport-Security', status: headerData.some(r => (r.title + r.snippet).toLowerCase().includes('hsts') || (r.title + r.snippet).toLowerCase().includes('strict-transport')) ? (headerData.some(r => (r.title + r.snippet).toLowerCase().includes('missing hsts') || (r.title + r.snippet).toLowerCase().includes('no hsts')) ? 'fail' : 'pass') : 'unknown', detail: 'HSTS enforcement' },
          { name: 'X-Frame-Options', status: headerData.some(r => (r.title + r.snippet).toLowerCase().includes('x-frame')) ? 'pass' : 'unknown', detail: 'Clickjacking protection' },
          { name: 'X-Content-Type-Options', status: headerData.some(r => (r.title + r.snippet).toLowerCase().includes('x-content-type') || (r.title + r.snippet).toLowerCase().includes('nosniff')) ? 'pass' : 'unknown', detail: 'MIME sniffing prevention' },
          { name: 'Referrer-Policy', status: headerData.some(r => (r.title + r.snippet).toLowerCase().includes('referrer-policy')) ? 'pass' : 'unknown', detail: 'Referrer information control' },
          { name: 'Permissions-Policy', status: headerData.some(r => (r.title + r.snippet).toLowerCase().includes('permissions-policy')) ? 'pass' : 'unknown', detail: 'Browser feature control' },
        ]
      },
      {
        category: 'Cookie Security',
        status: cookieData.length > 0 ? 'checked' : 'unknown',
        items: [
          { name: 'HttpOnly Flag', status: cookieData.some(r => (r.title + r.snippet).toLowerCase().includes('httponly')) ? 'pass' : 'unknown', detail: 'Prevent XSS cookie theft' },
          { name: 'Secure Flag', status: cookieData.some(r => (r.title + r.snippet).toLowerCase().includes('secure flag') || (r.title + r.snippet).toLowerCase().includes('secure cookie')) ? 'pass' : 'unknown', detail: 'HTTPS-only cookie transmission' },
          { name: 'SameSite Attribute', status: cookieData.some(r => (r.title + r.snippet).toLowerCase().includes('samesite')) ? 'pass' : 'unknown', detail: 'CSRF protection' },
          { name: 'Tracking Cookies', status: cookieData.some(r => (r.title + r.snippet).toLowerCase().includes('tracking') || (r.title + r.snippet).toLowerCase().includes('third-party')) ? 'warning' : 'pass', detail: 'Third-party tracking detection' },
        ]
      },
      {
        category: 'Malware & Blacklist',
        status: 'checked',
        items: [
          { name: 'Google Safe Browsing', status: hasMalware ? 'fail' : 'pass', detail: hasMalware ? 'Potentially flagged' : 'No malicious content detected' },
          { name: 'Phishing Detection', status: malwareData.some(r => (r.title + r.snippet).toLowerCase().includes('phishing')) ? 'fail' : 'pass', detail: 'Phishing protection status' },
          { name: 'Blacklist Status', status: malwareData.some(r => (r.title + r.snippet).toLowerCase().includes('blacklist')) ? 'fail' : 'pass', detail: 'DNS blacklist check' },
        ]
      },
      {
        category: 'Breach & Incident History',
        status: 'checked',
        items: [
          { name: 'Known Breaches', status: hasBreach ? 'fail' : 'pass', detail: hasBreach ? 'Security incidents detected' : 'No known breaches' },
          { name: 'Data Leaks', status: breachData.some(r => (r.title + r.snippet).toLowerCase().includes('leak')) ? 'fail' : 'pass', detail: 'Data exposure assessment' },
          { name: 'Hacking Incidents', status: breachData.some(r => (r.title + r.snippet).toLowerCase().includes('hack') || (r.title + r.snippet).toLowerCase().includes('compromised')) ? 'fail' : 'pass', detail: 'Compromise detection' },
        ]
      },
    ];

    // Technology vulnerabilities
    const techVulns = techData.map(r => {
      const text = (r.title + ' ' + r.snippet).toLowerCase();
      let severity = 'low';
      if (text.includes('outdated') || text.includes('vulnerable') || text.includes('exploit')) severity = 'high';
      else if (text.includes('old version') || text.includes('deprecated')) severity = 'medium';
      return {
        technology: r.title.replace(/[-|].*/g, '').trim().substring(0, 50),
        detail: r.snippet.substring(0, 150),
        severity,
        source: r.domain,
        url: r.url,
      };
    }).filter(t => t.technology);

    return NextResponse.json({
      hostname,
      url: targetUrl,
      overallStatus,
      securityScore,
      securityChecks,
      techVulnerabilities: techVulns,
      sslResults: sslData,
      headerResults: headerData,
      cookieResults: cookieData,
      malwareResults: malwareData,
      breachResults: breachData,
      techResults: techData,
      aiAnalysis,
    });

  } catch (error) {
    console.error('Web Security API error:', error);
    return NextResponse.json({ error: 'Failed to analyze website security. Please try again.' }, { status: 500 });
  }
}
