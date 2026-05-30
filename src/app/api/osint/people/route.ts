import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Parse search results into uniform format
function parseResults(results: unknown[]) {
  return (results as Array<Record<string, string>>)
    .map((r) => ({
      url: r.url || '',
      title: r.name || '',
      snippet: r.snippet || '',
      domain: r.host_name || '',
    }))
    .filter((r) => r.title || r.snippet);
}

// Social media platform detection patterns
const SOCIAL_PLATFORMS: Array<{
  platform: string;
  urlPatterns: string[];
  urlPrefix: string;
}> = [
  { platform: 'Facebook', urlPatterns: ['facebook.com', 'fb.com', 'fb.me'], urlPrefix: 'https://facebook.com/' },
  { platform: 'Instagram', urlPatterns: ['instagram.com', 'instagr.am'], urlPrefix: 'https://instagram.com/' },
  { platform: 'Twitter/X', urlPatterns: ['twitter.com', 'x.com', 't.co'], urlPrefix: 'https://x.com/' },
  { platform: 'LinkedIn', urlPatterns: ['linkedin.com', 'lnkd.in'], urlPrefix: 'https://linkedin.com/in/' },
  { platform: 'TikTok', urlPatterns: ['tiktok.com', 'vm.tiktok.com'], urlPrefix: 'https://tiktok.com/@' },
  { platform: 'YouTube', urlPatterns: ['youtube.com', 'youtu.be'], urlPrefix: 'https://youtube.com/@' },
  { platform: 'GitHub', urlPatterns: ['github.com'], urlPrefix: 'https://github.com/' },
  { platform: 'Reddit', urlPatterns: ['reddit.com'], urlPrefix: 'https://reddit.com/user/' },
  { platform: 'Pinterest', urlPatterns: ['pinterest.com', 'pin.it'], urlPrefix: 'https://pinterest.com/' },
  { platform: 'Snapchat', urlPatterns: ['snapchat.com'], urlPrefix: 'https://snapchat.com/add/' },
  { platform: 'Telegram', urlPatterns: ['t.me', 'telegram.me'], urlPrefix: 'https://t.me/' },
  { platform: 'WhatsApp', urlPatterns: ['wa.me', 'whatsapp.com'], urlPrefix: 'https://wa.me/' },
  { platform: 'Medium', urlPatterns: ['medium.com'], urlPrefix: 'https://medium.com/@' },
  { platform: 'Threads', urlPatterns: ['threads.net'], urlPrefix: 'https://threads.net/@' },
];

// Confidence scoring for profile matches
function calculateConfidence(name: string, result: { title: string; snippet: string; url: string }): number {
  let confidence = 0.3; // Base confidence
  const text = `${result.title} ${result.snippet}`.toLowerCase();
  const nameParts = name.toLowerCase().split(/\s+/);

  // Higher confidence if name parts appear in title
  for (const part of nameParts) {
    if (result.title.toLowerCase().includes(part)) confidence += 0.15;
    if (result.snippet.toLowerCase().includes(part)) confidence += 0.05;
  }

  // Higher confidence for social media URLs
  if (SOCIAL_PLATFORMS.some((p) => p.urlPatterns.some((up) => result.url.includes(up)))) {
    confidence += 0.1;
  }

  // Cap at 0.95
  return Math.min(confidence, 0.95);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, location } = body as { name?: string; location?: string };

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    const personName = name.trim();
    const locationFilter = location?.trim() || '';

    // Build search queries for comprehensive people intelligence
    const searchCalls: Array<{ query: string; num?: number }> = [
      { query: `"${personName}" profile biography`, num: 10 },
      { query: `"${personName}" social media`, num: 10 },
      { query: `"${personName}" news`, num: 10 },
    ];

    if (locationFilter) {
      searchCalls.push(
        { query: `"${personName}" ${locationFilter}`, num: 8 },
        { query: `"${personName}" ${locationFilter} social media profile`, num: 8 },
      );
    }

    // Execute sequential web searches
    const searchResults = await sequentialWebSearch(searchCalls, 800);

    // Parse results by category
    const profileData = parseResults(searchResults[0] || []);
    const socialData = parseResults(searchResults[1] || []);
    const newsData = parseResults(searchResults[2] || []);
    let locationData: ReturnType<typeof parseResults> = [];
    let locationSocialData: ReturnType<typeof parseResults> = [];

    if (locationFilter && searchResults.length > 3) {
      locationData = parseResults(searchResults[3] || []);
      locationSocialData = parseResults(searchResults[4] || []);
    }

    const allResults = [...profileData, ...socialData, ...newsData, ...locationData, ...locationSocialData];

    // Extract social profiles
    const profiles: Array<{
      platform: string;
      url: string;
      snippet: string;
      confidence: number;
    }> = [];

    const seenUrls = new Set<string>();

    for (const result of allResults) {
      for (const platform of SOCIAL_PLATFORMS) {
        if (platform.urlPatterns.some((p) => result.url.toLowerCase().includes(p))) {
          if (!seenUrls.has(result.url)) {
            seenUrls.add(result.url);
            profiles.push({
              platform: platform.platform,
              url: result.url,
              snippet: result.snippet.substring(0, 200),
              confidence: calculateConfidence(personName, result),
            });
          }
        }
      }
    }

    // Deduplicate by platform (keep highest confidence)
    const uniqueProfiles = new Map<string, typeof profiles[0]>();
    for (const profile of profiles) {
      const existing = uniqueProfiles.get(profile.platform);
      if (!existing || profile.confidence > existing.confidence) {
        uniqueProfiles.set(profile.platform, profile);
      }
    }

    // Also check for platforms that weren't found in URLs but might be mentioned in snippets
    const allText = allResults.map((r) => `${r.title} ${r.snippet} ${r.url}`).join(' ').toLowerCase();

    for (const platform of SOCIAL_PLATFORMS) {
      if (!uniqueProfiles.has(platform.platform)) {
        const mentioned = platform.urlPatterns.some((p) => allText.includes(p)) ||
          allText.includes(platform.platform.toLowerCase());
        if (mentioned) {
          // Try to extract username from text
          const usernamePatterns = [
            new RegExp(`${platform.urlPatterns[0]}/([A-Za-z0-9_.-]+)`, 'gi'),
            new RegExp(`@([A-Za-z0-9_.]+)\\s*(?:on|di|\\|)\\s*${platform.platform}`, 'gi'),
          ];

          let extractedUrl = '';
          for (const pattern of usernamePatterns) {
            const match = pattern.exec(allText);
            if (match) {
              extractedUrl = `${platform.urlPrefix}${match[1]}`;
              break;
            }
          }

          if (extractedUrl && !seenUrls.has(extractedUrl)) {
            uniqueProfiles.set(platform.platform, {
              platform: platform.platform,
              url: extractedUrl,
              snippet: 'Mentioned in search results',
              confidence: 0.4,
            });
          }
        }
      }
    }

    const finalProfiles = Array.from(uniqueProfiles.values()).sort((a, b) => b.confidence - a.confidence);

    // Extract associated names (people mentioned alongside the target)
    const associatedNames: string[] = [];
    const nameRegex = /\b([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/g;
    const nameCount: Record<string, number> = {};

    for (const result of allResults) {
      const text = `${result.title} ${result.snippet}`;
      let match;
      while ((match = nameRegex.exec(text)) !== null) {
        const foundName = match[1];
        // Skip if it's the target name itself or too common words
        if (!foundName.toLowerCase().includes(personName.toLowerCase().split(' ')[0]) &&
            !['The This', 'In The', 'Of The', 'New York', 'San Francisco', 'Los Angeles', 'United States', 'Social Media'].includes(foundName)) {
          nameCount[foundName] = (nameCount[foundName] || 0) + 1;
        }
      }
    }

    // Sort by frequency and take top results
    const sortedNames = Object.entries(nameCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([n]) => n);

    associatedNames.push(...sortedNames);

    // Extract locations mentioned
    const locations: string[] = [];
    const locationKeywords = ['jakarta', 'surabaya', 'bandung', 'medan', 'semarang', 'makassar', 'denpasar', 'yogyakarta',
      'palembang', 'malang', 'tangerang', 'bekasi', 'depok', 'bogor', 'indonesia',
      'singapore', 'malaysia', 'kuala lumpur', 'bangkok', 'tokyo', 'seoul',
      'new york', 'london', 'sydney', 'dubai', 'amsterdam', 'berlin', 'paris',
      'california', 'texas', 'florida', 'jawa', 'sumatra', 'sulawesi', 'kalimantan', 'bali', 'papua'];

    const locationSet = new Set<string>();
    for (const result of allResults) {
      const text = `${result.title} ${result.snippet}`.toLowerCase();
      for (const loc of locationKeywords) {
        if (text.includes(loc) && !locationSet.has(loc)) {
          locationSet.add(loc);
          locations.push(loc.charAt(0).toUpperCase() + loc.slice(1));
        }
      }
    }

    // Also add the provided location if not already included
    if (locationFilter && !locations.some((l) => l.toLowerCase() === locationFilter.toLowerCase())) {
      locations.unshift(locationFilter);
    }

    // Social accounts summary
    const socialAccounts = finalProfiles.map((p) => ({
      platform: p.platform,
      url: p.url,
      confidence: `${(p.confidence * 100).toFixed(0)}%`,
    }));

    // News results
    const newsResults = newsData.slice(0, 8).map((r) => ({
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      domain: r.domain,
      date: new Date().toISOString().split('T')[0], // Approximate
    }));

    // Comprehensive AI analysis
    const allContext = [
      ...profileData.slice(0, 4).map((r) => `[PROFILE] ${r.title}: ${r.snippet}`),
      ...socialData.slice(0, 4).map((r) => `[SOCIAL] ${r.title}: ${r.snippet}`),
      ...newsData.slice(0, 4).map((r) => `[NEWS] ${r.title}: ${r.snippet}`),
      ...locationData.slice(0, 3).map((r) => `[LOCATION] ${r.title}: ${r.snippet}`),
      ...locationSocialData.slice(0, 3).map((r) => `[LOCATION-SOCIAL] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const profileSummary = finalProfiles
      .slice(0, 10)
      .map((p) => `- ${p.platform} | ${p.url} | Confidence: ${(p.confidence * 100).toFixed(0)}%`)
      .join('\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for people search and identity intelligence. Report with: ## 👤 IDENTITY OVERVIEW ## 🌐 DIGITAL FOOTPRINT ## 📍 LOCATION INTELLIGENCE ## 🔗 ASSOCIATED ENTITIES ## 📰 NEWS & MENTIONS ## 🛡️ PRIVACY ASSESSMENT. Be concise, 2-3 lines per section. Respect privacy - do not fabricate personal details not found in data.`,
          `Name: ${personName} | Location: ${locationFilter || 'N/A'}
Profiles found: ${finalProfiles.length} | Associated names: ${associatedNames.length} | Locations: ${locations.length}

Discovered Profiles:
${profileSummary}

Locations: ${locations.join(', ')}
Associated: ${associatedNames.slice(0, 5).join(', ')}

Search Intelligence:
${allContext.substring(0, 1500)}`
        )
      : 'No people intelligence data available for this search.';

    return NextResponse.json({
      success: true,
      name: personName,
      profiles: finalProfiles,
      associatedNames,
      locations,
      socialAccounts,
      newsResults,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
