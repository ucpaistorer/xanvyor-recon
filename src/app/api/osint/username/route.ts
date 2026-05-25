import { NextRequest, NextResponse } from 'next/server';
import { getZAI } from '@/lib/zai';

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

    const zai = await getZAI();

    // Search for the username across platforms
    const searchResults = await zai.functions.invoke('web_search', {
      query: `"${username}" username profile`,
      num: 15,
    });

    // Check which platforms are likely to have this username based on search results
    const foundDomains = new Set(searchResults.map((r: { host_name: string }) => r.host_name.toLowerCase()));
    
    const platformResults = PLATFORMS.map(platform => {
      const platformDomain = platform.url.split('/')[2]?.replace('www.', '') || '';
      const isLikelyFound = foundDomains.has(platformDomain) || 
        searchResults.some((r: { snippet: string; name: string }) => 
          r.snippet.toLowerCase().includes(username.toLowerCase()) && 
          (r.snippet.toLowerCase().includes(platform.name.toLowerCase()) ||
           r.name.toLowerCase().includes(platform.name.toLowerCase()))
        );
      
      return {
        ...platform,
        profileUrl: platform.url.replace('{username}', username),
        status: isLikelyFound ? 'likely_found' : 'unknown',
        category: platform.category,
      };
    });

    // AI analysis of username
    let aiAnalysis = '';
    try {
      const searchContext = searchResults
        .slice(0, 8)
        .map((r: { name: string; snippet: string; url: string }, i: number) => `${i + 1}. ${r.name}\n   ${r.snippet}\n   ${r.url}`)
        .join('\n\n');

      const completion = await zai.chat.completions.create({
        messages: [
          {
            role: 'assistant',
            content: 'You are an OSINT analyst specializing in digital identity analysis. Analyze search results about a username and provide insights about: potential accounts found, digital footprint, linked identities, and recommendations for further investigation.'
          },
          {
            role: 'user',
            content: `Analyze search results for username "${username}":\n\n${searchContext}\n\nProvide a structured OSINT analysis of this username's digital footprint.`
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
      username,
      platforms: platformResults,
      likelyFound: platformResults.filter(p => p.status === 'likely_found').length,
      totalChecked: platformResults.length,
      searchResults: searchResults.map((r: { url: string; name: string; snippet: string; host_name: string }) => ({
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
