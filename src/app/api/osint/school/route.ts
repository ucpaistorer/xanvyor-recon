import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// School level classification keywords
const SCHOOL_LEVELS: Record<string, string[]> = {
  'SD': ['sd negeri', 'sd swasta', 'sekolah dasar', 'mi ', 'madrasah ibtidaiyah'],
  'SMP': ['smp negeri', 'smp swasta', 'sekolah menengah pertama', 'mts ', 'madrasah tsanawiyah'],
  'SMA': ['sma negeri', 'sma swasta', 'sekolah menengah atas'],
  'SMK': ['smk negeri', 'smk swasta', 'sekolah menengah kejuruan'],
  'SLB': ['slb', 'sekolah luar biasa', 'sekolah inklusi'],
  'Pondok Pesantren': ['pesantren', 'pondok pesantren'],
  'Universitas': ['universitas', 'institut', 'politeknik', 'sekolah tinggi', 'akademi'],
};

// Known data breach / leak keywords
const LEAK_KEYWORDS = [
  'breach', 'leak', 'data bocor', 'data tervalidasi', 'data siswa',
  'compromised', 'exposed', 'dumped', 'hacked', 'paste', 'pastebin',
  'credential', 'database dump', 'data murid', 'data guru',
  'nip', 'nisn', 'npsn', 'identitas siswa',
];

// Known severity escalation keywords
const CRITICAL_KEYWORDS = ['password', 'credential', 'ktp', 'nik', 'identitas', 'nisn', 'nip', 'kk'];
const HIGH_KEYWORDS = ['breach', 'leak', 'bocor', 'dump', 'million', 'ribuan'];
const MEDIUM_KEYWORDS = ['paste', 'pastebin', 'exposed', 'exposure'];

function detectSchoolLevel(query: string): string {
  const lower = query.toLowerCase();
  for (const [level, keywords] of Object.entries(SCHOOL_LEVELS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return level;
    }
  }
  return 'Unknown';
}

function detectSchoolStatus(query: string): string {
  const lower = query.toLowerCase();
  if (lower.includes('negeri')) return 'Negeri';
  if (lower.includes('swasta')) return 'Swasta';
  return 'Unknown';
}

function extractDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function assessLeakSeverity(text: string): 'critical' | 'high' | 'medium' | 'low' {
  const lower = text.toLowerCase();
  if (CRITICAL_KEYWORDS.some(k => lower.includes(k))) return 'critical';
  if (HIGH_KEYWORDS.some(k => lower.includes(k))) return 'high';
  if (MEDIUM_KEYWORDS.some(k => lower.includes(k))) return 'medium';
  return 'low';
}

function classifyLeakType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes('nisn') || lower.includes('nis')) return 'Student Identity Leak';
  if (lower.includes('nip') || lower.includes('guru')) return 'Teacher/Staff Identity Leak';
  if (lower.includes('password') || lower.includes('credential')) return 'Credential Breach';
  if (lower.includes('ktp') || lower.includes('nik') || lower.includes('identitas')) return 'Identity Document Leak';
  if (lower.includes('nilai') || lower.includes('raport') || lower.includes('academic')) return 'Academic Records Leak';
  if (lower.includes('database') || lower.includes('dump')) return 'Database Dump';
  if (lower.includes('pastebin') || lower.includes('paste')) return 'Paste Site Exposure';
  return 'Data Exposure';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const query = body.query as string | undefined;
    const searchType = body.type === 'student' ? 'student' : 'school';

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'Query is required. Provide a school name or student name.' },
        { status: 400 }
      );
    }

    const trimmedQuery = query.trim();
    const isSchool = searchType === 'school';

    // ────────────────────────────────────────────────────────
    // Phase 1: Sequential web searches for comprehensive OSINT
    // ────────────────────────────────────────────────────────

    const searchCalls = isSchool
      ? [
          { query: `"${trimmedQuery}" sekolah profil alamat NPSN akreditasi`, num: 5 },
          { query: `"${trimmedQuery}" dapodik data pokok pendidikan guru NIP`, num: 5 },
          { query: `"${trimmedQuery}" data siswa leak bocor breach site:facebook.com OR site:instagram.com`, num: 5 },
          { query: `"${trimmedQuery}" prestasi juara kompetisi olimpiade`, num: 5 },
        ]
      : [
          { query: `"${trimmedQuery}" siswa murid pelajar school student NISN`, num: 5 },
          { query: `"${trimmedQuery}" dapodik data pokok pendidikan siswa sekolah enrollment`, num: 5 },
          { query: `"${trimmedQuery}" data siswa leak bocor breach exposed nilai raport`, num: 5 },
          { query: `"${trimmedQuery}" site:facebook.com OR site:instagram.com OR site:tiktok.com juara kompetisi olimpiade`, num: 5 },
        ];

    const searchResults = await sequentialWebSearch(searchCalls, 800);

    // Unpack sequential search results (4 searches → 4 result sets)
    const [result0, result1, result2, result3] = searchResults.map(r => r as Array<Record<string, string>>);
    const generalResults = result0;
    const npsnResults = result0;
    const dapodikResults = result1;
    const accreditationResults = result0;
    const leakResults = result2;
    const teacherResults = result1;
    const socialResults = result2;
    const achievementResults = result3;
    // ────────────────────────────────────────────────────────

    // School info extraction from general + NPSN + accreditation results
    let schoolInfo: {
      name: string;
      npsn: string;
      address: string;
      province: string;
      city: string;
      level: string;
      status: string;
      accreditation: string;
    } | undefined;

    if (isSchool) {
      const allSchoolText = [
        ...generalResults,
        ...npsnResults,
        ...(accreditationResults as Array<Record<string, string>>),
      ]
        .map(r => `${r.name ?? ''} ${r.snippet ?? ''}`)
        .join(' ');

      // Extract NPSN number (8-digit pattern)
      const npsnMatch = allSchoolText.match(/\b(\d{8})\b/);
      const npsnNumber = npsnMatch ? npsnMatch[1] : '';

      // Extract accreditation grade
      const accredMatch = allSchoolText.match(/[Aa]kreditasi[:\s]*([A-Da-d])/i);
      const accredGrade = accredMatch ? accredMatch[1].toUpperCase() : '';

      schoolInfo = {
        name: trimmedQuery,
        npsn: npsnNumber,
        address: extractAddress(allSchoolText),
        province: extractProvince(allSchoolText),
        city: extractCity(allSchoolText),
        level: detectSchoolLevel(trimmedQuery),
        status: detectSchoolStatus(trimmedQuery),
        accreditation: accredGrade,
      };
    }

    // Student info extraction (for student type)
    let studentInfo: {
      name: string;
      school: string;
      level: string;
      year: string;
    } | undefined;

    if (!isSchool) {
      const allStudentText = [
        ...generalResults,
        ...dapodikResults,
      ]
        .map(r => `${r.name ?? ''} ${r.snippet ?? ''}`)
        .join(' ');

      // Extract year pattern
      const yearMatch = allStudentText.match(/\b(20\d{2})\b/);
      const yearFound = yearMatch ? yearMatch[1] : '';

      studentInfo = {
        name: trimmedQuery,
        school: extractSchoolName(allStudentText),
        level: detectSchoolLevel(allStudentText),
        year: yearFound,
      };
    }

    // ────────────────────────────────────────────────────────
    // Phase 3: Detect data leaks and exposures
    // ────────────────────────────────────────────────────────

    const dataLeaks = leakResults
      .filter(r => {
        const text = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
        return LEAK_KEYWORDS.some(k => text.includes(k));
      })
      .map(r => {
        const text = `${r.name ?? ''} ${r.snippet ?? ''}`;
        return {
          type: classifyLeakType(text),
          severity: assessLeakSeverity(text),
          source: r.host_name || extractDomainFromUrl(r.url || ''),
          description: (r.snippet || '').substring(0, 250),
          url: r.url || '',
        };
      });

    // ────────────────────────────────────────────────────────
    // Phase 4: Structure all result arrays
    // ────────────────────────────────────────────────────────

    const formattedSchoolRecords = (isSchool ? generalResults : [])
      .map(r => ({
        title: r.name || '',
        snippet: r.snippet || '',
        url: r.url || '',
        source: r.host_name || extractDomainFromUrl(r.url || ''),
      }));

    const formattedStudentRecords = (!isSchool ? generalResults : teacherResults)
      .map(r => ({
        title: r.name || '',
        snippet: r.snippet || '',
        url: r.url || '',
        source: r.host_name || extractDomainFromUrl(r.url || ''),
      }));

    const formattedNpsnResults = npsnResults.map(r => ({
      title: r.name || '',
      snippet: r.snippet || '',
      url: r.url || '',
      source: r.host_name || extractDomainFromUrl(r.url || ''),
    }));

    const formattedDapodikResults = dapodikResults.map(r => ({
      title: r.name || '',
      snippet: r.snippet || '',
      url: r.url || '',
      source: r.host_name || extractDomainFromUrl(r.url || ''),
    }));

    const formattedSocialResults = socialResults.map(r => ({
      title: r.name || '',
      snippet: r.snippet || '',
      url: r.url || '',
      domain: r.host_name || extractDomainFromUrl(r.url || ''),
    }));

    const formattedAchievementResults = achievementResults.map(r => ({
      title: r.name || '',
      snippet: r.snippet || '',
      url: r.url || '',
      source: r.host_name || extractDomainFromUrl(r.url || ''),
    }));

    // ────────────────────────────────────────────────────────
    // Phase 5: AI comprehensive analysis
    // ────────────────────────────────────────────────────────

    const schoolRecCtx = formattedSchoolRecords.slice(0, 4)
      .map(r => `[SCHOOL-RECORD] ${r.title}: ${r.snippet}`)
      .join('\n');

    const studentRecCtx = formattedStudentRecords.slice(0, 4)
      .map(r => `[STUDENT-RECORD] ${r.title}: ${r.snippet}`)
      .join('\n');

    const npsnCtx = formattedNpsnResults.slice(0, 4)
      .map(r => `[NPSN] ${r.title}: ${r.snippet}`)
      .join('\n');

    const dapodikCtx = formattedDapodikResults.slice(0, 4)
      .map(r => `[DAPODIK] ${r.title}: ${r.snippet}`)
      .join('\n');

    const leakCtx = dataLeaks.slice(0, 5)
      .map(l => `[LEAK-${l.severity.toUpperCase()}] ${l.type}: ${l.description}`)
      .join('\n');

    const socialCtx = formattedSocialResults.slice(0, 4)
      .map(r => `[SOCIAL] ${r.title}: ${r.snippet}`)
      .join('\n');

    const achievementCtx = formattedAchievementResults.slice(0, 4)
      .map(r => `[ACHIEVEMENT] ${r.title}: ${r.snippet}`)
      .join('\n');

    const allContext = [
      schoolRecCtx,
      studentRecCtx,
      npsnCtx,
      dapodikCtx,
      leakCtx,
      socialCtx,
      achievementCtx,
    ].filter(Boolean).join('\n\n');

    const aiAnalysis = allContext.length > 20
      ? await safeAIAnalysis(
          `OSINT analyst for Indonesian educational intelligence. Report with: ## 🏫 SCHOOL/STUDENT IDENTIFICATION ## 📋 EDUCATIONAL RECORDS ## 🚨 DATA EXPOSURE ASSESSMENT ## 📱 SOCIAL MEDIA FOOTPRINT ## 🎓 ACADEMIC INTELLIGENCE ## 🛡️ RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `Target: "${trimmedQuery}" | Type: ${isSchool ? 'School' : 'Student'}${isSchool ? ` | NPSN: ${schoolInfo?.npsn || 'N/A'} | Level: ${schoolInfo?.level || 'N/A'} | Status: ${schoolInfo?.status || 'N/A'}` : ` | School: ${studentInfo?.school || 'N/A'} | Level: ${studentInfo?.level || 'N/A'}`}

${allContext.substring(0, 1500)}`
        )
      : 'Insufficient data gathered for comprehensive analysis. The query may be too specific or the target may have minimal online presence. Try varying the search terms.';

    // ────────────────────────────────────────────────────────
    // Phase 6: Return structured response
    // ────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      query: trimmedQuery,
      searchType,
      schoolInfo: isSchool ? schoolInfo : undefined,
      studentInfo: !isSchool ? studentInfo : undefined,
      schoolRecords: formattedSchoolRecords,
      studentRecords: formattedStudentRecords,
      npsnResults: formattedNpsnResults,
      dapodikResults: formattedDapodikResults,
      socialResults: formattedSocialResults,
      dataLeaks,
      leakCount: dataLeaks.length,
      achievementResults: formattedAchievementResults,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error occurred during school OSINT analysis';
    console.error('[School OSINT API Error]', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

// ────────────────────────────────────────────────────────
// Helper: Extract address from text
// ────────────────────────────────────────────────────────
function extractAddress(text: string): string {
  // Look for common Indonesian address patterns
  const addressMatch = text.match(
    /(?:alamat|address|Jl\.|Jalan|Jl\s)[\s:]*([^\n.,]{10,100})/i
  );
  return addressMatch ? addressMatch[1].trim() : '';
}

// ────────────────────────────────────────────────────────
// Helper: Extract province from text
// ────────────────────────────────────────────────────────
function extractProvince(text: string): string {
  const provinces = [
    'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi',
    'Sumatera Selatan', 'Bengkulu', 'Lampung', 'Kepulauan Bangka Belitung',
    'Kepulauan Riau', 'DKI Jakarta', 'Jawa Barat', 'Jawa Tengah',
    'DI Yogyakarta', 'Jawa Timur', 'Banten', 'Bali', 'Nusa Tenggara Barat',
    'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah',
    'Kalimantan Selatan', 'Kalimantan Timur', 'Kalimantan Utara',
    'Sulawesi Utara', 'Sulawesi Tengah', 'Sulawesi Selatan',
    'Sulawesi Tenggara', 'Gorontalo', 'Sulawesi Barat', 'Maluku',
    'Maluku Utara', 'Papua', 'Papua Barat', 'Papua Selatan',
    'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
  ];

  const lower = text.toLowerCase();
  for (const province of provinces) {
    if (lower.includes(province.toLowerCase())) {
      return province;
    }
  }
  return '';
}

// ────────────────────────────────────────────────────────
// Helper: Extract city from text
// ────────────────────────────────────────────────────────
function extractCity(text: string): string {
  const cityMatch = text.match(
    /(?:kota|kab\.|kabupaten|city|kabupaten\s)[\s:]*(\w[\w\s]{2,30})/i
  );
  return cityMatch ? cityMatch[1].trim() : '';
}

// ────────────────────────────────────────────────────────
// Helper: Extract school name from student search text
// ────────────────────────────────────────────────────────
function extractSchoolName(text: string): string {
  const schoolPatterns = [
    /(?:sekolah|school|sma|smp|smk|sd|universitas|institut|politeknik)\s+(?:negeri|swasta)?\s*\d*\s*\w[\w\s]{2,40}/i,
    /(?:di|at|from|sekolah di)\s+(S[\w]+\s+(?:Negeri|Swasta)\s*\d*)/i,
  ];

  for (const pattern of schoolPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim().substring(0, 80);
    }
  }
  return '';
}
