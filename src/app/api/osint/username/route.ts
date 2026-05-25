import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

const PLATFORMS = [
  // Development & Tech
  { name: 'GitHub', url: 'https://github.com/{username}', icon: '🐙', category: 'Development', detectHint: 'github' },
  { name: 'GitLab', url: 'https://gitlab.com/{username}', icon: '🦊', category: 'Development', detectHint: 'gitlab' },
  { name: 'Dev.to', url: 'https://dev.to/{username}', icon: '👨‍💻', category: 'Development', detectHint: 'dev.to' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/users/{username}', icon: '📚', category: 'Development', detectHint: 'stackoverflow' },
  { name: 'CodePen', url: 'https://codepen.io/{username}', icon: '✏️', category: 'Development', detectHint: 'codepen' },
  { name: 'npm', url: 'https://npmjs.com/~{username}', icon: '📦', category: 'Development', detectHint: 'npm' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id={username}', icon: '📰', category: 'Development', detectHint: 'ycombinator' },
  // Social Media
  { name: 'Twitter/X', url: 'https://x.com/{username}', icon: '🐦', category: 'Social Media', detectHint: 'twitter' },
  { name: 'Instagram', url: 'https://instagram.com/{username}', icon: '📸', category: 'Social Media', detectHint: 'instagram' },
  { name: 'Facebook', url: 'https://facebook.com/{username}', icon: '👤', category: 'Social Media', detectHint: 'facebook' },
  { name: 'TikTok', url: 'https://tiktok.com/@{username}', icon: '🎵', category: 'Social Media', detectHint: 'tiktok' },
  { name: 'Pinterest', url: 'https://pinterest.com/{username}', icon: '📌', category: 'Social Media', detectHint: 'pinterest' },
  { name: 'Snapchat', url: 'https://snapchat.com/add/{username}', icon: '👻', category: 'Social Media', detectHint: 'snapchat' },
  { name: 'Threads', url: 'https://threads.net/@{username}', icon: '🧵', category: 'Social Media', detectHint: 'threads' },
  { name: 'Mastodon', url: 'https://mastodon.social/@{username}', icon: '🐘', category: 'Social Media', detectHint: 'mastodon' },
  // Professional & Business
  { name: 'LinkedIn', url: 'https://linkedin.com/in/{username}', icon: '💼', category: 'Professional', detectHint: 'linkedin' },
  { name: 'AngelList', url: 'https://wellfound.com/{username}', icon: '😇', category: 'Professional', detectHint: 'wellfound' },
  { name: 'Gravatar', url: 'https://gravatar.com/{username}', icon: '🌐', category: 'Professional', detectHint: 'gravatar' },
  // Content & Media
  { name: 'YouTube', url: 'https://youtube.com/@{username}', icon: '📺', category: 'Video', detectHint: 'youtube' },
  { name: 'Twitch', url: 'https://twitch.tv/{username}', icon: '🎮', category: 'Streaming', detectHint: 'twitch' },
  { name: 'Medium', url: 'https://medium.com/@{username}', icon: '✍️', category: 'Blog', detectHint: 'medium' },
  { name: 'Substack', url: 'https://{username}.substack.com', icon: '📬', category: 'Blog', detectHint: 'substack' },
  { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', icon: '🎧', category: 'Music', detectHint: 'spotify' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', icon: '🔊', category: 'Music', detectHint: 'soundcloud' },
  { name: 'Flickr', url: 'https://flickr.com/people/{username}', icon: '📷', category: 'Photo', detectHint: 'flickr' },
  // Forums & Communities
  { name: 'Reddit', url: 'https://reddit.com/user/{username}', icon: '🔴', category: 'Forum', detectHint: 'reddit' },
  { name: 'Discord', url: 'https://discord.com/users/{username}', icon: '💬', category: 'Forum', detectHint: 'discord' },
  // Gaming
  { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', icon: '🎮', category: 'Gaming', detectHint: 'steam' },
  { name: 'Xbox', url: 'https://xboxgamertag.com/search/{username}', icon: '🟢', category: 'Gaming', detectHint: 'xbox' },
  { name: 'PlayStation', url: 'https://psnprofiles.com/{username}', icon: '🔵', category: 'Gaming', detectHint: 'psn' },
  // Security & Identity
  { name: 'Keybase', url: 'https://keybase.io/{username}', icon: '🔑', category: 'Security', detectHint: 'keybase' },
  { name: 'HaveIBeenPwned', url: 'https://haveibeenpwned.com/Account/{username}', icon: '🛡️', category: 'Security', detectHint: 'pwned' },
  // Creator & Funding
  { name: 'Patreon', url: 'https://patreon.com/{username}', icon: '🎨', category: 'Creator', detectHint: 'patreon' },
  { name: 'Ko-fi', url: 'https://ko-fi.com/{username}', icon: '☕', category: 'Creator', detectHint: 'ko-fi' },
  { name: 'BuyMeACoffee', url: 'https://buymeacoffee.com/{username}', icon: '☕', category: 'Creator', detectHint: 'buymeacoffee' },
  // Profile Aggregators
  { name: 'About.me', url: 'https://about.me/{username}', icon: '👤', category: 'Profile', detectHint: 'about.me' },
  { name: 'Linktree', url: 'https://linktr.ee/{username}', icon: '🌳', category: 'Profile', detectHint: 'linktr.ee' },
  { name: 'Bento', url: 'https://bento.me/{username}', icon: '🍱', category: 'Profile', detectHint: 'bento' },
  // Indonesian & SEA Platforms
  { name: 'Kaskus', url: 'https://kaskus.co.id/@{username}', icon: '🇮🇩', category: 'Forum (ID)', detectHint: 'kaskus' },
  { name: 'Tokopedia', url: 'https://tokopedia.com/{username}', icon: '🛍️', category: 'E-Commerce (ID)', detectHint: 'tokopedia' },
  { name: 'Shopee', url: 'https://shopee.co.id/{username}', icon: '🛒', category: 'E-Commerce (ID)', detectHint: 'shopee' },
  { name: 'Bukalapak', url: 'https://bukalapak.com/u/{username}', icon: '🏪', category: 'E-Commerce (ID)', detectHint: 'bukalapak' },
  { name: 'Detik', url: 'https://forum.detik.com/{username}', icon: '📰', category: 'Forum (ID)', detectHint: 'detik' },
];

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Sequential searches for comprehensive username OSINT
    const generalSearch = await safeWebSearch(`"${username}" username profile account`, 10);
    const socialSearch = await safeWebSearch(`"${username}" site:twitter.com OR site:instagram.com OR site:facebook.com OR site:linkedin.com`, 8);
    const devSearch = await safeWebSearch(`"${username}" site:github.com OR site:gitlab.com OR site:stackoverflow.com`, 8);
    const leakSearch = await safeWebSearch(`"${username}" data breach leak paste compromised`, 8);

    // Combine all search results for platform detection
    const allResults = [...generalSearch, ...socialSearch, ...devSearch, ...leakSearch] as Array<Record<string, string>>;
    const allSearchText = allResults.map((r: Record<string, string>) => `${r.name ?? ''} ${r.snippet ?? ''} ${r.url ?? ''}`.toLowerCase()).join(' ');

    // Check which platforms are likely to have this username
    const platformResults = PLATFORMS.map(platform => {
      const hints = [platform.detectHint, platform.name.toLowerCase()];
      const urlPattern = platform.url.replace('{username}', username).toLowerCase();

      const detected = hints.some(hint => allSearchText.includes(hint)) ||
        allSearchText.includes(urlPattern) ||
        allResults.some((r: Record<string, string>) => {
          const rUrl = (r.url ?? '').toLowerCase();
          const rText = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
          return rUrl.includes(platform.detectHint) ||
            rText.includes(platform.detectHint);
        });

      return {
        ...platform,
        profileUrl: platform.url.replace('{username}', username),
        status: detected ? 'likely_found' as const : 'unknown' as const,
        category: platform.category,
      };
    });

    // Associated identities - extract from search results
    const associatedIdentities = allResults
      .filter((r: Record<string, string>) => {
        const text = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
        return text.includes(username.toLowerCase()) &&
          (text.includes('also known as') || text.includes('aka') ||
            text.includes('alias') || text.includes('linked') ||
            text.includes('same person') || text.includes('profile'));
      })
      .slice(0, 5)
      .map((r: Record<string, string>) => ({
        title: r.name,
        snippet: r.snippet,
        url: r.url,
        source: r.host_name,
      }));

    // Categorize results
    const foundByCategory: Record<string, number> = {};
    platformResults.forEach(p => {
      if (p.status === 'likely_found') {
        foundByCategory[p.category] = (foundByCategory[p.category] || 0) + 1;
      }
    });

    // AI analysis of username
    const searchContext = allResults.slice(0, 10)
      .map((r: Record<string, string>, i: number) => `${i + 1}. ${r.name}\n   ${r.snippet}\n   ${r.url}`)
      .join('\n\n');

    const leakContext = (leakSearch as Array<Record<string, string>>)
      .slice(0, 5)
      .map((r: Record<string, string>) => `[BREACH] ${r.name}: ${r.snippet}`)
      .join('\n');

    const aiAnalysis = searchContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in digital identity investigation and username intelligence.
Analyze the username search results and provide a COMPREHENSIVE intelligence report with these sections:

## 🔍 USERNAME ANALYSIS
- Username pattern analysis (meaning, structure, likely origin)
- Estimated account creation period
- Username variations and aliases

## 📊 PLATFORM PRESENCE
- Which platforms this username was found on
- Activity level assessment per platform
- Account age indicators

## 👤 IDENTITY ASSESSMENT
- Likely real person or pseudonym
- Associated identities and cross-links
- Digital persona analysis

## 🚨 BREACH & EXPOSURE
- Data breaches involving this username
- Credential exposure assessment
- Associated email addresses if found

## 🔗 DIGITAL FOOTPRINT MAP
- Online presence overview
- Interconnections between platforms
- Activity patterns

## 🎯 INVESTIGATION RECOMMENDATIONS
- Priority platforms for further investigation
- Cross-referencing suggestions
- Verification steps

Be thorough and specific. Use emojis for section headers.`,
          `Analyze search results for username "${username}":\n\nGeneral search:\n${searchContext}\n\nBreach/Leak data:\n${leakContext}\n\nProvide a structured OSINT analysis of this username's digital footprint.`
        )
      : 'No search results found for this username.';

    return NextResponse.json({
      success: true,
      username,
      platforms: platformResults,
      likelyFound: platformResults.filter(p => p.status === 'likely_found').length,
      totalChecked: platformResults.length,
      foundByCategory,
      associatedIdentities,
      searchResults: allResults.slice(0, 20).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      breachResults: (leakSearch as Array<Record<string, string>>).map((r: Record<string, string>) => ({
        url: r.url,
        title: r.name,
        snippet: r.snippet,
        domain: r.host_name,
      })),
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
