import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Comprehensive platform list with detection metadata
const PLATFORMS = [
  // Social Media
  { name: 'Facebook', url: 'https://facebook.com/{username}', icon: '👤', category: 'Social Media', detectHint: 'facebook' },
  { name: 'Instagram', url: 'https://instagram.com/{username}', icon: '📸', category: 'Social Media', detectHint: 'instagram' },
  { name: 'Twitter/X', url: 'https://x.com/{username}', icon: '🐦', category: 'Social Media', detectHint: 'twitter' },
  { name: 'TikTok', url: 'https://tiktok.com/@{username}', icon: '🎵', category: 'Social Media', detectHint: 'tiktok' },
  { name: 'LinkedIn', url: 'https://linkedin.com/in/{username}', icon: '💼', category: 'Professional', detectHint: 'linkedin' },
  { name: 'YouTube', url: 'https://youtube.com/@{username}', icon: '📺', category: 'Video', detectHint: 'youtube' },
  { name: 'Reddit', url: 'https://reddit.com/user/{username}', icon: '🔴', category: 'Forum', detectHint: 'reddit' },
  { name: 'Pinterest', url: 'https://pinterest.com/{username}', icon: '📌', category: 'Social Media', detectHint: 'pinterest' },
  { name: 'Snapchat', url: 'https://snapchat.com/add/{username}', icon: '👻', category: 'Social Media', detectHint: 'snapchat' },
  // Development & Tech
  { name: 'GitHub', url: 'https://github.com/{username}', icon: '🐙', category: 'Development', detectHint: 'github' },
  { name: 'GitLab', url: 'https://gitlab.com/{username}', icon: '🦊', category: 'Development', detectHint: 'gitlab' },
  { name: 'Bitbucket', url: 'https://bitbucket.org/{username}', icon: '🪣', category: 'Development', detectHint: 'bitbucket' },
  { name: 'Medium', url: 'https://medium.com/@{username}', icon: '✍️', category: 'Blog', detectHint: 'medium' },
  { name: 'Dev.to', url: 'https://dev.to/{username}', icon: '👨‍💻', category: 'Development', detectHint: 'dev.to' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/users/{username}', icon: '📚', category: 'Development', detectHint: 'stackoverflow' },
  // Knowledge & Q&A
  { name: 'Quora', url: 'https://quora.com/profile/{username}', icon: '❓', category: 'Knowledge', detectHint: 'quora' },
  // Streaming & Entertainment
  { name: 'Twitch', url: 'https://twitch.tv/{username}', icon: '🎮', category: 'Streaming', detectHint: 'twitch' },
  { name: 'Spotify', url: 'https://open.spotify.com/user/{username}', icon: '🎧', category: 'Music', detectHint: 'spotify' },
  { name: 'SoundCloud', url: 'https://soundcloud.com/{username}', icon: '🔊', category: 'Music', detectHint: 'soundcloud' },
  // Messaging
  { name: 'Discord', url: 'https://discord.com/users/{username}', icon: '💬', category: 'Messaging', detectHint: 'discord' },
  { name: 'Telegram', url: 'https://t.me/{username}', icon: '✈️', category: 'Messaging', detectHint: 'telegram' },
  { name: 'WhatsApp', url: 'https://wa.me/{username}', icon: '📱', category: 'Messaging', detectHint: 'whatsapp' },
  { name: 'Signal', url: 'https://signal.me/#{username}', icon: '🔒', category: 'Messaging', detectHint: 'signal' },
  { name: 'Line', url: 'https://line.me/ti/p/{username}', icon: '💬', category: 'Messaging', detectHint: 'line.me' },
  { name: 'WeChat', url: 'https://weixin.qq.com/{username}', icon: '🇨🇳', category: 'Messaging', detectHint: 'wechat' },
  // Regional / Alternative Social
  { name: 'VK', url: 'https://vk.com/{username}', icon: '🇷🇺', category: 'Social Media', detectHint: 'vk.com' },
  { name: 'OK.ru', url: 'https://ok.ru/{username}', icon: '🇷🇺', category: 'Social Media', detectHint: 'ok.ru' },
  { name: 'Mastodon', url: 'https://mastodon.social/@{username}', icon: '🐘', category: 'Social Media', detectHint: 'mastodon' },
  { name: 'Bluesky', url: 'https://bsky.app/profile/{username}', icon: '🦋', category: 'Social Media', detectHint: 'bluesky' },
  { name: 'Threads', url: 'https://threads.net/@{username}', icon: '🧵', category: 'Social Media', detectHint: 'threads' },
  { name: 'Clubhouse', url: 'https://clubhouse.com/@{username}', icon: '🎤', category: 'Social Media', detectHint: 'clubhouse' },
];

// Parse search results into uniform format
function parseResults(results: unknown[]) {
  return (results as Array<Record<string, string>>)
    .map((r) => ({
      url: r.url || '',
      title: r.name || '',
      snippet: r.snippet || '',
      source: r.host_name || '',
    }))
    .filter((r) => r.title || r.snippet);
}

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json() as { username?: string };

    if (!username) {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length < 1 || trimmedUsername.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Username must be between 1 and 100 characters' },
        { status: 400 }
      );
    }

    // Sequential deep searches across multiple dimensions
    const [
      generalResults,
      socialMediaResults,
      professionalResults,
      devTechResults,
      messagingResults,
      leakResults,
      profilePicResults,
      linkedAccountResults,
    ] = await sequentialWebSearch([
      // General username search
      { query: `"${trimmedUsername}" username profile account identity`, num: 10 },
      // Major social media platforms
      { query: `"${trimmedUsername}" site:facebook.com OR site:instagram.com OR site:tiktok.com OR site:x.com OR site:twitter.com OR site:threads.net`, num: 10 },
      // Professional platforms
      { query: `"${trimmedUsername}" site:linkedin.com OR site:quora.com OR site:medium.com`, num: 8 },
      // Development & tech platforms
      { query: `"${trimmedUsername}" site:github.com OR site:gitlab.com OR site:bitbucket.org OR site:stackoverflow.com OR site:dev.to`, num: 8 },
      // Messaging & regional platforms
      { query: `"${trimmedUsername}" site:t.me OR site:discord.com OR site:vk.com OR site:ok.ru OR site:mastodon.social OR site:bsky.app`, num: 8 },
      // Data breaches and leaks
      { query: `"${trimmedUsername}" data breach leak paste compromised credential exposed`, num: 10 },
      // Profile pictures and visual identity
      { query: `"${trimmedUsername}" profile picture avatar photo image`, num: 8 },
      // Linked / connected accounts
      { query: `"${trimmedUsername}" linked accounts connected alias same person also known as`, num: 8 },
    ], 2000);

    // Parse all results
    const generalData = parseResults(generalResults);
    const socialData = parseResults(socialMediaResults);
    const professionalData = parseResults(professionalResults);
    const devTechData = parseResults(devTechResults);
    const messagingData = parseResults(messagingResults);
    const leakData = parseResults(leakResults);
    const profilePicData = parseResults(profilePicResults);
    const linkedData = parseResults(linkedAccountResults);

    // Combine all search text for platform detection
    const allResults = [
      ...generalData,
      ...socialData,
      ...professionalData,
      ...devTechData,
      ...messagingData,
      ...leakData,
      ...profilePicData,
      ...linkedData,
    ];
    const allSearchText = allResults
      .map((r) => `${r.title} ${r.snippet} ${r.url}`.toLowerCase())
      .join(' ');

    // Platform detection with confidence scoring
    const profiles = PLATFORMS.map((platform) => {
      const hints = [platform.detectHint, platform.name.toLowerCase()];
      const urlPattern = platform.url.replace('{username}', trimmedUsername).toLowerCase();

      // Check direct URL mentions
      const directUrlMatch = allSearchText.includes(urlPattern);

      // Check hint mentions in results
      const hintMatches = hints.filter((hint) => allSearchText.includes(hint));

      // Check specific result entries
      const resultMatches = allResults.filter((r) => {
        const rUrl = r.url.toLowerCase();
        const rText = `${r.title} ${r.snippet}`.toLowerCase();
        return (
          rUrl.includes(platform.detectHint) ||
          rText.includes(platform.detectHint) ||
          hints.some((hint) => rText.includes(hint))
        );
      });

      // Calculate confidence
      let confidence: 'high' | 'medium' | 'low' = 'low';
      let detected = false;

      if (directUrlMatch || resultMatches.length >= 2) {
        detected = true;
        confidence = 'high';
      } else if (hintMatches.length >= 1 && resultMatches.length >= 1) {
        detected = true;
        confidence = 'medium';
      } else if (hintMatches.length >= 1) {
        detected = true;
        confidence = 'low';
      }

      return {
        platform: platform.name,
        icon: platform.icon,
        url: platform.url.replace('{username}', trimmedUsername),
        detected,
        category: platform.category,
        confidence,
      };
    });

    const detectedCount = profiles.filter((p) => p.detected).length;

    // Extract profile details from search results
    const profileDetails = profiles
      .filter((p) => p.detected)
      .map((p) => {
        const platformResults = allResults.filter((r) => {
          const text = `${r.title} ${r.snippet} ${r.url}`.toLowerCase();
          return text.includes(p.platform.toLowerCase()) || text.includes(p.confidence === 'high' ? p.url.toLowerCase() : '');
        });

        const detailText = platformResults
          .map((r) => `${r.title} ${r.snippet}`)
          .join(' ')
          .toLowerCase();

        // Extract bio/description
        let bio = '';
        const bioMatch = detailText.match(/(?:bio|about|description|summary)[:\s]+([^.!?]+[.!?])/i);
        if (bioMatch) bio = bioMatch[1].trim();

        // Extract follower count
        let followers = '';
        const followerMatch = detailText.match(/(\d[\d,.]*\s*)\s*(?:followers?|subscribers?|fans?)/i);
        if (followerMatch) followers = followerMatch[1].trim();

        // Extract following count
        let following = '';
        const followingMatch = detailText.match(/(\d[\d,.]*\s*)\s*(?:following|subscribed)/i);
        if (followingMatch) following = followingMatch[1].trim();

        // Extract post count
        let posts = '';
        const postMatch = detailText.match(/(\d[\d,.]*\s*)\s*(?:posts?|tweets?|articles?|repos?|contributions)/i);
        if (postMatch) posts = postMatch[1].trim();

        // Detect verification
        const verified = detailText.includes('verif') || detailText.includes('✓') || detailText.includes('blue tick');

        // Estimate account age
        let accountAge = 'Unknown';
        const ageMatch = detailText.match(/(?:joined|member since|created|registered)[:\s]+(\w+\s+\d{4}|\d{4})/i);
        if (ageMatch) accountAge = ageMatch[1].trim();

        return {
          platform: p.platform,
          bio: bio || 'Not available',
          followers: followers || 'Not available',
          following: following || 'Not available',
          posts: posts || 'Not available',
          verified,
          accountAge,
        };
      });

    // Linked accounts detection
    const linkedAccounts = linkedData
      .filter((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        return (
          text.includes(trimmedUsername.toLowerCase()) &&
          (text.includes('linked') ||
            text.includes('connected') ||
            text.includes('also on') ||
            text.includes('same user') ||
            text.includes('alias') ||
            text.includes('also known as'))
        );
      })
      .slice(0, 8)
      .map((r) => ({
        title: r.title,
        snippet: r.snippet,
        url: r.url,
        source: r.source,
      }));

    // Data leak detection with severity classification
    const leakKeywords = [
      'leak', 'breach', 'exposed', 'compromised', 'credential', 'password',
      'dump', 'paste', 'hacked', 'stolen', 'sold', 'dark web', 'darkweb',
      'haveibeenpwned', 'dehashed', 'snusbase',
    ];

    const dataLeaks = leakData
      .filter((r) =>
        leakKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k))
      )
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';

        if (text.includes('dark web') || text.includes('darkweb') || text.includes('sold') || text.includes('credential dump')) {
          severity = 'critical';
          type = 'Dark Web Exposure';
        } else if (text.includes('password') || text.includes('credential') || text.includes('stolen')) {
          severity = 'critical';
          type = 'Credential Theft';
        } else if (text.includes('breach') || text.includes('compromised') || text.includes('hacked')) {
          severity = 'high';
          type = 'Account Breach';
        } else if (text.includes('leak') || text.includes('exposed') || text.includes('paste')) {
          severity = 'high';
          type = 'Data Leak';
        } else if (text.includes('haveibeenpwned') || text.includes('dehashed')) {
          severity = 'high';
          type = 'Breach Database Entry';
        } else if (text.includes('dump')) {
          severity = 'medium';
          type = 'Data Dump';
        }

        return {
          type,
          severity,
          source: r.source,
          description: r.snippet.substring(0, 250),
          url: r.url,
        };
      });

    // Calculate digital footprint score (0-100)
    let footprintScore = 0;

    // Points for detected platforms
    footprintScore += detectedCount * 8;

    // Points for high-confidence detections
    footprintScore += profiles.filter((p) => p.confidence === 'high').length * 5;

    // Points for profile details found
    footprintScore += profileDetails.filter((p) => p.bio !== 'Not available').length * 3;
    footprintScore += profileDetails.filter((p) => p.followers !== 'Not available').length * 2;
    footprintScore += profileDetails.filter((p) => p.verified).length * 5;

    // Points for linked accounts
    footprintScore += linkedAccounts.length * 4;

    // Points for data leaks
    footprintScore += dataLeaks.length * 10;

    // Points for profile pictures found
    footprintScore += profilePicData.length * 2;

    // Cap at 100
    footprintScore = Math.min(footprintScore, 100);

    // Determine risk level based on score
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (footprintScore >= 75) riskLevel = 'critical';
    else if (footprintScore >= 50) riskLevel = 'high';
    else if (footprintScore >= 25) riskLevel = 'medium';

    // Determine exposure level
    let exposureLevel: 'minimal' | 'moderate' | 'significant' | 'extensive' = 'minimal';
    if (detectedCount >= 15 || dataLeaks.length >= 3) exposureLevel = 'extensive';
    else if (detectedCount >= 10 || dataLeaks.length >= 2) exposureLevel = 'significant';
    else if (detectedCount >= 5 || dataLeaks.length >= 1) exposureLevel = 'moderate';

    // Combined search results for return
    const searchResults = [
      ...generalData.slice(0, 4).map((r) => ({ ...r, category: 'General' })),
      ...socialData.slice(0, 3).map((r) => ({ ...r, category: 'Social Media' })),
      ...professionalData.slice(0, 2).map((r) => ({ ...r, category: 'Professional' })),
      ...devTechData.slice(0, 2).map((r) => ({ ...r, category: 'Development' })),
      ...messagingData.slice(0, 2).map((r) => ({ ...r, category: 'Messaging' })),
      ...profilePicData.slice(0, 2).map((r) => ({ ...r, category: 'Profile Pictures' })),
      ...linkedData.slice(0, 2).map((r) => ({ ...r, category: 'Linked Accounts' })),
    ];

    // Comprehensive AI analysis
    const allContext = [
      ...generalData.slice(0, 3).map((r) => `[GENERAL] ${r.title}: ${r.snippet}`),
      ...socialData.slice(0, 3).map((r) => `[SOCIAL] ${r.title}: ${r.snippet}`),
      ...professionalData.slice(0, 2).map((r) => `[PROFESSIONAL] ${r.title}: ${r.snippet}`),
      ...devTechData.slice(0, 2).map((r) => `[DEV-TECH] ${r.title}: ${r.snippet}`),
      ...messagingData.slice(0, 2).map((r) => `[MESSAGING] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map((r) => `[LEAK] ${r.title}: ${r.snippet}`),
      ...profilePicData.slice(0, 2).map((r) => `[PROFILE-PIC] ${r.title}: ${r.snippet}`),
      ...linkedData.slice(0, 2).map((r) => `[LINKED] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const platformSummary = profiles
      .filter((p) => p.detected)
      .map((p) => `${p.platform} (${p.confidence} confidence)`)
      .join(', ');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in social media intelligence (SOCMINT), digital identity investigation, and online footprint analysis.
Analyze the social media deep scan data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 👤 USERNAME ANALYSIS
- Username pattern analysis (meaning, structure, likely origin)
- Username variations and common aliases
- Estimated account creation period across platforms
- Digital persona consistency assessment

## 📊 PLATFORM PRESENCE MAP
- Social media platforms where username was detected
- Activity level assessment per platform category
- Account age indicators and registration patterns
- Cross-platform identity consistency

## 🖼️ VISUAL IDENTITY
- Profile picture analysis and consistency
- Avatar usage patterns across platforms
- Image reverse search indicators
- Visual brand/persona analysis

## 👥 SOCIAL GRAPH INTELLIGENCE
- Follower/following ratio analysis
- Community and network assessment
- Influence and reach estimation
- Interaction patterns and engagement level

## 🔗 LINKED ACCOUNTS & CROSS-REFERENCES
- Connected accounts and identities
- Cross-platform linkages
- Email/phone associations
- Shared profile elements

## 🚨 DATA BREACH & EXPOSURE
- Known data breaches involving this username
- Credential exposure and password leaks
- Personal information exposure assessment
- Dark web presence indicators

## 📈 DIGITAL FOOTPRINT ASSESSMENT
- Overall digital footprint score: ${footprintScore}/100
- Risk level: ${riskLevel.toUpperCase()}
- Exposure level: ${exposureLevel.toUpperCase()}
- Privacy vulnerability assessment
- De-anonymization risk

## 🛡️ PRIVACY & SECURITY RECOMMENDATIONS
- Account hardening priorities
- Privacy setting improvements
- Credential rotation needs
- Account consolidation/cleanup suggestions
- Risk mitigation strategies

Be thorough and specific. Include all findings from the data. Use emojis for section headers. Note that this is for authorized security research only.`,
          `Analyze social media deep scan for username: "${trimmedUsername}"

Detected on platforms: ${platformSummary || 'None detected'}
Platforms checked: ${PLATFORMS.length}
Detected count: ${detectedCount}
Digital footprint score: ${footprintScore}/100
Risk level: ${riskLevel}
Exposure level: ${exposureLevel}
Data leaks found: ${dataLeaks.length}

Intelligence data:
${allContext}

Provide a comprehensive social media OSINT intelligence report.`
        )
      : 'No intelligence data available for this username.';

    return NextResponse.json({
      success: true,
      username: trimmedUsername,
      profiles,
      detectedCount,
      totalChecked: PLATFORMS.length,
      profileDetails,
      linkedAccounts,
      dataLeaks,
      leakCount: dataLeaks.length,
      digitalFootprint: {
        score: footprintScore,
        riskLevel,
        exposureLevel,
      },
      searchResults,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
