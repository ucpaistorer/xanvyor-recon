import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

const PLATFORMS = [
  { name: 'GitHub', url: 'https://github.com/{username}', icon: '🐙', category: 'Development' },
  { name: 'Twitter/X', url: 'https://x.com/{username}', icon: '🐦', category: 'Social Media' },
  { name: 'Instagram', url: 'https://instagram.com/{username}', icon: '📸', category: 'Social Media' },
  { name: 'Reddit', url: 'https://reddit.com/user/{username}', icon: '🔴', category: 'Forum' },
  { name: 'TikTok', url: 'https://tiktok.com/@{username}', icon: '🎵', category: 'Social Media' },
  { name: 'YouTube', url: 'https://youtube.com/@{username}', icon: '📺', category: 'Video' },
  { name: 'LinkedIn', url: 'https://linkedin.com/in/{username}', icon: '💼', category: 'Professional' },
  { name: 'Pinterest', url: 'https://pinterest.com/{username}', icon: '📌', category: 'Social Media' },
  { name: 'Twitch', url: 'https://twitch.tv/{username}', icon: '🎮', category: 'Streaming' },
  { name: 'Medium', url: 'https://medium.com/@{username}', icon: '✍️', category: 'Blog' },
  { name: 'Dev.to', url: 'https://dev.to/{username}', icon: '👨‍💻', category: 'Development' },
  { name: 'GitLab', url: 'https://gitlab.com/{username}', icon: '🦊', category: 'Development' },
  { name: 'Steam', url: 'https://steamcommunity.com/id/{username}', icon: '🎮', category: 'Gaming' },
  { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', icon: '🎧', category: 'Music' },
  { name: 'Keybase', url: 'https://keybase.io/{username}', icon: '🔑', category: 'Security' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id={username}', icon: '📰', category: 'Forum' },
  { name: 'Flickr', url: 'https://flickr.com/people/{username}', icon: '📷', category: 'Photo' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', icon: '🔊', category: 'Music' },
  { name: 'About.me', url: 'https://about.me/{username}', icon: '👤', category: 'Profile' },
  { name: 'Patreon', url: 'https://patreon.com/{username}', icon: '🎨', category: 'Creator' },
];

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // Search for the username across platforms
    const searchResults = await safeWebSearch(`"${username}" username profile`, 15);

    // Check which platforms are likely to have this username based on search results
    const foundDomains = new Set(
      (searchResults as Array<Record<string, string>>)
        .map((r: Record<string, string>) => r.host_name?.toLowerCase())
        .filter(Boolean)
    );
    
    const platformResults = PLATFORMS.map(platform => {
      const platformDomain = platform.url.split('/')[2]?.replace('www.', '') || '';
      const isLikelyFound = foundDomains.has(platformDomain) || 
        (searchResults as Array<Record<string, string>>).some((r: Record<string, string>) => 
          r.snippet?.toLowerCase().includes(username.toLowerCase()) && 
          (r.snippet?.toLowerCase().includes(platform.name.toLowerCase()) ||
           r.name?.toLowerCase().includes(platform.name.toLowerCase()))
        );
      
      return {
        ...platform,
        profileUrl: platform.url.replace('{username}', username),
        status: isLikelyFound ? 'likely_found' : 'unknown',
        category: platform.category,
      };
    });

    // AI analysis of username
    const searchContext = (searchResults as Array<Record<string, string>>)
      .slice(0, 8)
      .map((r: Record<string, string>, i: number) => `${i + 1}. ${r.name}\n   ${r.snippet}\n   ${r.url}`)
      .join('\n\n');

    const aiAnalysis = searchResults.length > 0
      ? await safeAIAnalysis(
          'You are an OSINT analyst specializing in digital identity analysis. Analyze search results about a username and provide insights about: potential accounts found, digital footprint, linked identities, and recommendations for further investigation.',
          `Analyze search results for username "${username}":\n\n${searchContext}\n\nProvide a structured OSINT analysis of this username's digital footprint.`
        )
      : 'No search results found for this username.';

    return NextResponse.json({
      success: true,
      username,
      platforms: platformResults,
      likelyFound: platformResults.filter(p => p.status === 'likely_found').length,
      totalChecked: platformResults.length,
      searchResults: (searchResults as Array<Record<string, string>>).map((r: Record<string, string>) => ({
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
