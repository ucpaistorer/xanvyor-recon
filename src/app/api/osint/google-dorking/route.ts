import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

const DORK_TEMPLATES = [
  { name: 'Exposed Documents', dork: 'site:{target} filetype:pdf OR filetype:doc OR filetype:xls OR filetype:ppt OR filetype:txt' },
  { name: 'Open Directories', dork: 'site:{target} intitle:"index of" OR intitle:"directory listing"' },
  { name: 'Login Pages', dork: 'site:{target} inurl:login OR inurl:admin OR inurl:signin OR inurl:dashboard' },
  { name: 'Config Files', dork: 'site:{target} filetype:env OR filetype:yml OR filetype:xml OR filetype:conf OR filetype:ini' },
  { name: 'Database Files', dork: 'site:{target} filetype:sql OR filetype:db OR filetype:mdb OR filetype:sqlite' },
  { name: 'Error Pages', dork: 'site:{target} "error" OR "warning" OR "sql syntax" OR "stack trace" OR "fatal error"' },
  { name: 'Sensitive Paths', dork: 'site:{target} inurl:wp-admin OR inurl:phpmyadmin OR inurl:adminer OR inurl:cpanel' },
  { name: 'Exposed APIs', dork: 'site:{target} inurl:api OR inurl:swagger OR inurl:graphql OR intitle:"api documentation"' },
  { name: 'Backup Files', dork: 'site:{target} filetype:bak OR filetype:backup OR filetype:old OR filetype:zip OR filetype:tar.gz' },
  { name: 'Email Exposure', dork: 'site:{target} "@{target}" OR intext:"email" OR inurl:contact' },
];

export async function POST(request: NextRequest) {
  try {
    const { target } = await request.json();
    if (!target || !target.trim()) {
      return NextResponse.json({ error: 'Target domain is required' }, { status: 400 });
    }

    const domain = target.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Run top 3 dork queries (limited for speed)
    const dorkQueries = DORK_TEMPLATES.slice(0, 3).map(t => ({
      query: t.dork.replace(/{target}/g, domain),
      name: t.name,
    }));

    const allResults: Array<{
      dorkName: string;
      dorkQuery: string;
      results: Array<{ url: string; title: string; snippet: string; domain: string }>;
    }> = [];

    // Run searches in parallel for speed
    const searchPromises = dorkQueries.map(async (dq) => {
      try {
        const results = await safeWebSearch(dq.query, 5);
        return {
          dorkName: dq.name,
          dorkQuery: dq.query,
          results: (results as Array<Record<string, string>>).map(r => ({
            url: r.url || '',
            title: r.name || '',
            snippet: r.snippet || '',
            domain: r.host_name || '',
          })),
        };
      } catch {
        return { dorkName: dq.name, dorkQuery: dq.query, results: [] };
      }
    });

    const parallelResults = await Promise.all(searchPromises);
    allResults.push(...parallelResults);

    // Calculate findings
    const totalFindings = allResults.reduce((sum, d) => sum + d.results.length, 0);
    const highRiskDorks = allResults.filter(d =>
      d.dorkName.includes('Config') || d.dorkName.includes('Database') || d.dorkName.includes('Backup') || d.dorkName.includes('Sensitive')
    );
    const highRiskFindings = highRiskDorks.reduce((sum, d) => sum + d.results.length, 0);

    // All available dork templates for reference
    const allDorkTemplates = DORK_TEMPLATES.map(t => ({
      name: t.name,
      query: t.dork.replace(/{target}/g, domain),
    }));

    // AI analysis
    const findingsContext = allResults
      .filter(d => d.results.length > 0)
      .map(d => `### ${d.dorkName} (${d.results.length} results)\nDork: ${d.dorkQuery}\n${d.results.slice(0, 3).map(r => `- ${r.title}: ${r.snippet}`).join('\n')}`)
      .join('\n\n');

    const aiAnalysis = findingsContext.length > 0
      ? await safeAIAnalysis(
          `You are a security researcher analyzing Google dork results. Report with:
## 🔍 DORKING OVERVIEW
## 🎯 KEY FINDINGS
## ⚠️ RISK ASSESSMENT
## 🔐 SECURITY RECOMMENDATIONS
## 📋 ADDITIONAL DORKS TO TRY
Be concise, each section 2-3 lines.`,
          `Domain: ${domain}
Total findings: ${totalFindings} across ${allResults.filter(d => d.results.length > 0).length} dork categories
High-risk findings: ${highRiskFindings}

${findingsContext.substring(0, 2000)}`
        )
      : 'No sensitive information found through Google dorking for this domain.';

    return NextResponse.json({
      success: true,
      target: domain,
      totalFindings,
      highRiskFindings,
      dorkResults: allResults,
      allDorkTemplates,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
