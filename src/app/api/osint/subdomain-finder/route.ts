import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

export async function POST(request: NextRequest) {
  try {
    const { domain } = await request.json();
    if (!domain || !domain.trim()) {
      return NextResponse.json({ error: 'Domain is required' }, { status: 400 });
    }

    const target = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    // Search for subdomains using multiple queries
    const subdomainSearch1 = await safeWebSearch(`site:*.${target} -site:www.${target}`, 10);
    const subdomainSearch2 = await safeWebSearch(`"${target}" subdomain enumeration list discover`, 5);
    const certSearch = await safeWebSearch(`site:crt.sh "${target}" OR site:censys.io "${target}" subdomain certificate`, 5);
    const dnsSearch = await safeWebSearch(`"${target}" DNS records subdomain CNAME A record enumeration`, 5);

    // Extract subdomains from search results
    const subdomainRegex = new RegExp(`(?:[a-zA-Z0-9][-a-zA-Z0-9]*\\.)+${target.replace(/\./g, '\\.')}`, 'gi');

    const allText = [
      ...subdomainSearch1 as Array<Record<string, string>>,
      ...subdomainSearch2 as Array<Record<string, string>>,
      ...certSearch as Array<Record<string, string>>,
      ...dnsSearch as Array<Record<string, string>>,
    ].map(r => `${r.url ?? ''} ${r.name ?? ''} ${r.snippet ?? ''}`).join(' ');

    // Find unique subdomains
    const subdomainSet = new Set<string>();
    let match;
    const regex = new RegExp(subdomainRegex.source, subdomainRegex.flags);
    while ((match = regex.exec(allText)) !== null) {
      const sub = match[0].toLowerCase();
      if (sub !== target && sub !== `www.${target}`) {
        subdomainSet.add(sub);
      }
    }
    // Always add www
    subdomainSet.add(`www.${target}`);

    const subdomains = Array.from(subdomainSet).sort();

    // Categorize subdomains
    const categories: Record<string, string[]> = {
      'Development': [],
      'API & Services': [],
      'Admin & Internal': [],
      'CDN & Static': [],
      'Email & Communication': [],
      'Staging & Testing': [],
      'Other': [],
    };

    for (const sub of subdomains) {
      if (sub.includes('dev') || sub.includes('staging') || sub.includes('test') || sub.includes('beta') || sub.includes('stage')) {
        categories['Staging & Testing'].push(sub);
      } else if (sub.includes('api') || sub.includes('api-') || sub.includes('service') || sub.includes('svc') || sub.includes('app')) {
        categories['API & Services'].push(sub);
      } else if (sub.includes('admin') || sub.includes('panel') || sub.includes('manage') || sub.includes('dashboard') || sub.includes('cp') || sub.includes('cpanel')) {
        categories['Admin & Internal'].push(sub);
      } else if (sub.includes('cdn') || sub.includes('static') || sub.includes('asset') || sub.includes('media') || sub.includes('img') || sub.includes('images')) {
        categories['CDN & Static'].push(sub);
      } else if (sub.includes('mail') || sub.includes('smtp') || sub.includes('pop') || sub.includes('imap') || sub.includes('email')) {
        categories['Email & Communication'].push(sub);
      } else {
        categories['Other'].push(sub);
      }
    }

    // Search results for context
    const searchResults = [
      ...subdomainSearch1 as Array<Record<string, string>>,
      ...subdomainSearch2 as Array<Record<string, string>>,
    ].slice(0, 15).map(r => ({
      url: r.url || '',
      title: r.name || '',
      snippet: r.snippet || '',
      domain: r.host_name || '',
    }));

    // AI analysis
    const subdomainList = subdomains.join('\n');
    const aiAnalysis = subdomains.length > 1
      ? await safeAIAnalysis(
          `You are a security researcher analyzing subdomains. Report with:
## 🌐 SUBDOMAIN OVERVIEW
## 🔍 INTERESTING FINDINGS (dev/staging/admin subdomains)
## ⚠️ SECURITY CONCERNS
## 🛡️ RECOMMENDATIONS
Be concise, each section 2-3 lines.`,
          `Domain: ${target}
Total subdomains found: ${subdomains.length}

${subdomainList.substring(0, 2000)}`
        )
      : 'Only the default www subdomain was found. The domain may have limited subdomain exposure or DNS records are not publicly accessible.';

    return NextResponse.json({
      success: true,
      domain: target,
      totalSubdomains: subdomains.length,
      subdomains,
      categories,
      searchResults,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
