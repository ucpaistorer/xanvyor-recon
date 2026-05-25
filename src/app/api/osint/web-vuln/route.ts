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

    // Run parallel web searches for vulnerability intelligence
    const [sqliResults, xssResults, csrfResults, redirectResults, dirTraversalResults, infoDisclosureResults, outdatedResults, exposedPanelResults, cveResults, misconfigResults] = await sequentialWebSearch([
      { query: `"${hostname}" SQL injection vulnerability CVE exploit`, num: 8 },
      { query: `"${hostname}" XSS cross-site scripting vulnerability reflected stored DOM`, num: 8 },
      { query: `"${hostname}" CSRF cross-site request forgery vulnerability token`, num: 6 },
      { query: `"${hostname}" open redirect vulnerability URL redirection exploit`, num: 6 },
      { query: `"${hostname}" directory traversal path traversal LFI RFI vulnerability`, num: 6 },
      { query: `"${hostname}" information disclosure sensitive data exposure error message debug`, num: 8 },
      { query: `"${hostname}" outdated software version vulnerability CVE exploit known`, num: 8 },
      { query: `"${hostname}" exposed admin panel dashboard login phpmyadmin wp-admin debug endpoint API`, num: 8 },
      { query: `"${hostname}" CVE vulnerability advisory security patch 2024 2025`, num: 8 },
      { query: `"${hostname}" misconfiguration security vulnerability CORS headers server`, num: 6 },
    ], 1500);

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

    const sqliData = parseResults(sqliResults);
    const xssData = parseResults(xssResults);
    const csrfData = parseResults(csrfResults);
    const redirectData = parseResults(redirectResults);
    const dirTraversalData = parseResults(dirTraversalResults);
    const infoData = parseResults(infoDisclosureResults);
    const outdatedData = parseResults(outdatedResults);
    const exposedData = parseResults(exposedPanelResults);
    const cveData = parseResults(cveResults);
    const misconfigData = parseResults(misconfigResults);

    // Helper to check if vulnerabilities found
    const hasVulnMention = (data: Array<{ title: string; snippet: string }>, keywords: string[]) => {
      return data.some(r => {
        const text = (r.title + ' ' + r.snippet).toLowerCase();
        return keywords.some(k => text.includes(k.toLowerCase()));
      });
    };

    // Build vulnerability categories
    const vulnerabilities = [
      {
        id: 'sqli',
        name: 'SQL Injection',
        severity: 'critical',
        status: hasVulnMention(sqliData, ['sql injection', 'sqli', 'sql inject']) ? 'vulnerable' : 'secure',
        description: 'SQL injection allows attackers to execute arbitrary SQL commands on the database',
        detail: sqliData.length > 0 ? sqliData[0].snippet : 'No SQL injection vulnerabilities detected in public records',
        results: sqliData,
        owasp: 'A03:2021 - Injection',
        cvss: hasVulnMention(sqliData, ['sql injection', 'sqli']) ? '9.8' : '0.0',
      },
      {
        id: 'xss',
        name: 'Cross-Site Scripting (XSS)',
        severity: 'high',
        status: hasVulnMention(xssData, ['xss', 'cross-site scripting', 'script injection']) ? 'vulnerable' : 'secure',
        description: 'XSS allows attackers to inject malicious scripts into web pages viewed by other users',
        detail: xssData.length > 0 ? xssData[0].snippet : 'No XSS vulnerabilities detected in public records',
        results: xssData,
        owasp: 'A03:2021 - Injection',
        cvss: hasVulnMention(xssData, ['xss', 'cross-site scripting']) ? '7.5' : '0.0',
      },
      {
        id: 'csrf',
        name: 'Cross-Site Request Forgery (CSRF)',
        severity: 'medium',
        status: hasVulnMention(csrfData, ['csrf', 'cross-site request forgery']) ? 'vulnerable' : 'secure',
        description: 'CSRF forces authenticated users to execute unwanted actions',
        detail: csrfData.length > 0 ? csrfData[0].snippet : 'No CSRF vulnerabilities detected in public records',
        results: csrfData,
        owasp: 'A01:2021 - Broken Access Control',
        cvss: hasVulnMention(csrfData, ['csrf', 'cross-site request forgery']) ? '6.5' : '0.0',
      },
      {
        id: 'open-redirect',
        name: 'Open Redirect',
        severity: 'medium',
        status: hasVulnMention(redirectData, ['open redirect', 'url redirection', 'redirect vulnerability']) ? 'vulnerable' : 'secure',
        description: 'Open redirects allow attackers to redirect users to malicious websites',
        detail: redirectData.length > 0 ? redirectData[0].snippet : 'No open redirect vulnerabilities detected',
        results: redirectData,
        owasp: 'A01:2021 - Broken Access Control',
        cvss: hasVulnMention(redirectData, ['open redirect', 'redirect vulnerability']) ? '5.4' : '0.0',
      },
      {
        id: 'dir-traversal',
        name: 'Directory Traversal / LFI / RFI',
        severity: 'critical',
        status: hasVulnMention(dirTraversalData, ['directory traversal', 'path traversal', 'lfi', 'rfi', 'local file inclusion']) ? 'vulnerable' : 'secure',
        description: 'Directory traversal allows access to files and directories outside the web root',
        detail: dirTraversalData.length > 0 ? dirTraversalData[0].snippet : 'No directory traversal vulnerabilities detected',
        results: dirTraversalData,
        owasp: 'A01:2021 - Broken Access Control',
        cvss: hasVulnMention(dirTraversalData, ['directory traversal', 'path traversal', 'lfi', 'rfi']) ? '9.1' : '0.0',
      },
      {
        id: 'info-disclosure',
        name: 'Information Disclosure',
        severity: 'medium',
        status: hasVulnMention(infoData, ['information disclosure', 'sensitive data', 'error message', 'debug', 'data exposure']) ? 'vulnerable' : 'secure',
        description: 'Information disclosure exposes sensitive data through error messages or misconfiguration',
        detail: infoData.length > 0 ? infoData[0].snippet : 'No information disclosure issues detected',
        results: infoData,
        owasp: 'A05:2021 - Security Misconfiguration',
        cvss: hasVulnMention(infoData, ['information disclosure', 'sensitive data', 'data exposure']) ? '5.3' : '0.0',
      },
      {
        id: 'outdated',
        name: 'Outdated Software / Components',
        severity: 'high',
        status: hasVulnMention(outdatedData, ['outdated', 'old version', 'deprecated', 'vulnerable version', 'unpatched']) ? 'vulnerable' : 'secure',
        description: 'Outdated software components may contain known vulnerabilities',
        detail: outdatedData.length > 0 ? outdatedData[0].snippet : 'No outdated software detected in public records',
        results: outdatedData,
        owasp: 'A06:2021 - Vulnerable and Outdated Components',
        cvss: hasVulnMention(outdatedData, ['outdated', 'vulnerable version', 'unpatched']) ? '8.1' : '0.0',
      },
      {
        id: 'exposed-panel',
        name: 'Exposed Admin Panels & Endpoints',
        severity: 'high',
        status: hasVulnMention(exposedData, ['admin panel', 'exposed admin', 'wp-admin', 'phpmyadmin', 'dashboard exposed', 'api endpoint']) ? 'vulnerable' : 'secure',
        description: 'Exposed administrative interfaces provide attack surface for unauthorized access',
        detail: exposedData.length > 0 ? exposedData[0].snippet : 'No exposed admin panels detected',
        results: exposedData,
        owasp: 'A05:2021 - Security Misconfiguration',
        cvss: hasVulnMention(exposedData, ['admin panel', 'exposed', 'phpmyadmin']) ? '7.5' : '0.0',
      },
      {
        id: 'cve',
        name: 'Known CVEs & Advisories',
        severity: 'critical',
        status: cveData.some(r => (r.title + r.snippet).toLowerCase().includes('cve-')) ? 'vulnerable' : 'secure',
        description: 'Published Common Vulnerabilities and Exposures affecting the target',
        detail: cveData.length > 0 ? cveData[0].snippet : 'No known CVEs found in public databases',
        results: cveData,
        owasp: 'A06:2021 - Vulnerable Components',
        cvss: cveData.some(r => (r.title + r.snippet).toLowerCase().includes('cve-')) ? '9.0' : '0.0',
      },
      {
        id: 'misconfig',
        name: 'Security Misconfiguration',
        severity: 'medium',
        status: hasVulnMention(misconfigData, ['misconfiguration', 'cors', 'default config', 'server header', 'verbose error']) ? 'vulnerable' : 'secure',
        description: 'Security misconfigurations include default credentials, unnecessary services, verbose errors',
        detail: misconfigData.length > 0 ? misconfigData[0].snippet : 'No misconfiguration issues detected',
        results: misconfigData,
        owasp: 'A05:2021 - Security Misconfiguration',
        cvss: hasVulnMention(misconfigData, ['misconfiguration', 'cors', 'default config']) ? '5.3' : '0.0',
      },
    ];

    // Calculate vulnerability counts
    const vulnCount = vulnerabilities.filter(v => v.status === 'vulnerable').length;
    const criticalCount = vulnerabilities.filter(v => v.status === 'vulnerable' && v.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.status === 'vulnerable' && v.severity === 'high').length;
    const mediumCount = vulnerabilities.filter(v => v.status === 'vulnerable' && v.severity === 'medium').length;

    // Determine overall threat level
    let threatLevel = 'low';
    if (criticalCount > 0) threatLevel = 'critical';
    else if (highCount > 0) threatLevel = 'high';
    else if (mediumCount > 0) threatLevel = 'medium';

    // Calculate vulnerability score (0-100, higher = more vulnerable)
    let vulnScore = 0;
    vulnerabilities.forEach(v => {
      if (v.status === 'vulnerable') {
        if (v.severity === 'critical') vulnScore += 25;
        else if (v.severity === 'high') vulnScore += 15;
        else if (v.severity === 'medium') vulnScore += 8;
        else vulnScore += 3;
      }
    });
    vulnScore = Math.min(vulnScore, 100);

    // AI Analysis
    const aiAnalysis = await safeAIAnalysis(
      `You are a penetration testing and web vulnerability expert. Analyze the following vulnerability intelligence data for "${hostname}" and provide a detailed vulnerability assessment. Be specific about found vulnerabilities, their impact, and remediation steps. Respond in markdown format.`,
      `Web Vulnerability Assessment for: ${hostname}

SQL Injection: ${sqliData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
XSS: ${xssData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
CSRF: ${csrfData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
Open Redirect: ${redirectData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
Directory Traversal: ${dirTraversalData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
Information Disclosure: ${infoData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
Outdated Software: ${outdatedData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
Exposed Admin Panels: ${exposedData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
Known CVEs: ${cveData.map(r => `${r.title}: ${r.snippet}`).join('; ')}
Misconfiguration: ${misconfigData.map(r => `${r.title}: ${r.snippet}`).join('; ')}

Vulnerability Summary: ${vulnCount} vulnerabilities found (${criticalCount} critical, ${highCount} high, ${mediumCount} medium)
Overall Vulnerability Score: ${vulnScore}/100
Threat Level: ${threatLevel}

Please provide:
1. **Executive Summary** - High-level risk overview
2. **Critical Vulnerabilities** - Details and immediate action items
3. **High Risk Findings** - Significant security concerns
4. **Medium Risk Findings** - Areas needing attention
5. **Attack Surface Analysis** - Entry points and risks
6. **Remediation Priority** - Ranked list of fixes
7. **Compliance Impact** - OWASP Top 10 mapping`
    );

    return NextResponse.json({
      hostname,
      url: targetUrl,
      threatLevel,
      vulnScore,
      vulnerabilities,
      vulnCount,
      criticalCount,
      highCount,
      mediumCount,
      sqliResults: sqliData,
      xssResults: xssData,
      csrfResults: csrfData,
      redirectResults: redirectData,
      dirTraversalResults: dirTraversalData,
      infoDisclosureResults: infoData,
      outdatedResults: outdatedData,
      exposedPanelResults: exposedData,
      cveResults: cveData,
      misconfigResults: misconfigData,
      aiAnalysis,
    });

  } catch (error) {
    console.error('Web Vulnerability API error:', error);
    return NextResponse.json({ error: 'Failed to scan for vulnerabilities. Please try again.' }, { status: 500 });
  }
}
