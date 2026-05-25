import { NextRequest, NextResponse } from 'next/server';
import ZAI from 'z-ai-web-dev-sdk';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

// ============================================================
// Types
// ============================================================
interface KTPData {
  nik: string;
  nama: string;
  tempatTglLahir: string;
  jenisKelamin: string;
  alamat: string;
  rtRw: string;
  kelDesa: string;
  kecamatan: string;
  agama: string;
  statusPerkawinan: string;
  pekerjaan: string;
  kewarganegaraan: string;
  provinsi: string;
  kabupatenKota: string;
  berlakuHingga: string;
}

interface LocationData {
  fullAddress: string;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string;
  embedUrl: string;
  openStreetMapUrl: string;
}

// ============================================================
// POST handler
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const { imageUrl, imageBase64 } = await request.json();
    const effectiveImageUrl = imageBase64 || imageUrl;
    if (!effectiveImageUrl) {
      return NextResponse.json({ error: 'KTP image is required (upload a file or provide URL)' }, { status: 400 });
    }

    // ----------------------------------------------------------
    // Step 1: Use VLM to extract KTP data
    // ----------------------------------------------------------
    const zai = await ZAI.create();

    const vlmPrompt = `You are an expert OCR and document analysis AI specializing in Indonesian KTP (Kartu Tanda Penduduk / Indonesian National Identity Card) extraction.

Analyze this image carefully. If it is NOT a KTP (Indonesian ID card), respond with exactly: NOT_A_KTP

If it IS a KTP, extract ALL fields and return them in the following JSON format. Be extremely precise with every character, especially the NIK number. Read each field carefully even if the text is partially obscured, rotated, or hard to read.

Return ONLY a JSON object with these exact keys:
{
  "nik": "16-digit NIK number (no spaces, no dashes)",
  "nama": "Full name as printed on the KTP",
  "tempatTglLahir": "Place and date of birth (e.g., JAKARTA, 01-01-1990)",
  "jenisKelamin": "LAKI-LAKI or PEREMPUAN",
  "alamat": "Full street address as printed",
  "rtRw": "RT/RW numbers (e.g., 001/002)",
  "kelDesa": "Kelurahan/Desa name",
  "kecamatan": "Kecamatan name",
  "agama": "Religion (ISLAM, KRISTEN, KATOLIK, HINDU, BUDDHA, KONGHUCU)",
  "statusPerkawinan": "Marital status (BELUM KAWIN, KAWIN, CERAI HIDUP, CERAI MATI)",
  "pekerjaan": "Occupation/job as printed",
  "kewarganegaraan": "WNI or WNA",
  "provinsi": "Province name",
  "kabupatenKota": "Kabupaten/Kota name",
  "berlakuHingga": "Validity period (e.g., SEUMUR HIDUP)"
}

IMPORTANT RULES:
- If a field is unreadable or not found, use empty string ""
- The NIK is exactly 16 digits - extract it digit by digit if needed
- Province and Kabupaten/Kota are usually at the top of the KTP
- Do NOT guess or fabricate data. Only extract what you can actually see.
- If the image is not a KTP at all, return exactly: NOT_A_KTP
- Return ONLY the JSON, no other text or explanation`;

    let rawVlmResponse: string;
    try {
      const response = await zai.chat.completions.createVision({
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: vlmPrompt },
              { type: 'image_url', image_url: { url: effectiveImageUrl } },
            ],
          },
        ],
        thinking: { type: 'disabled' },
      });
      rawVlmResponse = response.choices[0]?.message?.content || '';
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('429') || errMsg.toLowerCase().includes('too many requests') || errMsg.toLowerCase().includes('rate limit')) {
        return NextResponse.json(
          { error: 'VLM analysis is currently rate limited. Please try again in a moment.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `VLM analysis failed: ${errMsg}. The image URL may be inaccessible or the format may not be supported.` },
        { status: 500 }
      );
    }

    // Check if image is not a KTP
    if (rawVlmResponse.trim().toUpperCase().includes('NOT_A_KTP')) {
      return NextResponse.json(
        { error: 'The uploaded image does not appear to be a KTP (Indonesian ID Card). Please upload a valid KTP image.' },
        { status: 400 }
      );
    }

    // Parse KTP data from VLM response
    let ktpData: KTPData;
    try {
      // Try to extract JSON from the response (may contain markdown code blocks)
      const jsonMatch = rawVlmResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          { error: 'Could not extract KTP data from the image. The image may be unclear or not a KTP.' },
          { status: 400 }
        );
      }
      ktpData = JSON.parse(jsonMatch[0]) as KTPData;
    } catch {
      return NextResponse.json(
        { error: 'Failed to parse KTP data from VLM response. The image may be unclear or not a valid KTP.' },
        { status: 400 }
      );
    }

    // Validate that we got at least some meaningful data
    const hasAnyData = Object.values(ktpData).some(v => v && v.trim().length > 0);
    if (!hasAnyData) {
      return NextResponse.json(
        { error: 'No KTP data could be extracted from the image. The image may be too blurry or not a KTP.' },
        { status: 400 }
      );
    }

    // ----------------------------------------------------------
    // Step 2: Geocode the address
    // ----------------------------------------------------------
    const addressParts = [
      ktpData.alamat,
      ktpData.kelDesa ? `Kel. ${ktpData.kelDesa}` : '',
      ktpData.kecamatan ? `Kec. ${ktpData.kecamatan}` : '',
      ktpData.kabupatenKota,
      ktpData.provinsi,
      'Indonesia',
    ].filter(Boolean).join(', ');

    const fullAddress = addressParts;

    let location: LocationData = {
      fullAddress,
      latitude: null,
      longitude: null,
      mapUrl: `https://www.google.com/maps/search/${encodeURIComponent(fullAddress)}`,
      embedUrl: `https://www.google.com/maps/embed/v1/place?key=&q=${encodeURIComponent(fullAddress)}`,
      openStreetMapUrl: `https://www.openstreetmap.org/search?query=${encodeURIComponent(fullAddress)}`,
    };

    // Use web search to geocode the address
    try {
      const geoSearchResults = await safeWebSearch(
        `${fullAddress} latitude longitude coordinates location`,
        5
      );

      if (geoSearchResults.length > 0) {
        // Use LLM to extract coordinates from search results
        const geoContext = (geoSearchResults as Array<Record<string, string>>)
          .map((r: Record<string, string>) => `${r.name ?? ''}: ${r.snippet ?? ''}`)
          .join('\n');

        const coordAnalysis = await safeAIAnalysis(
          `You are a geocoding assistant. Extract latitude and longitude coordinates from the provided search results. If exact coordinates are not found, estimate approximate coordinates based on the Indonesian address provided. Return ONLY a JSON object: { "latitude": number, "longitude": number }. Do not include any other text.`,
          `Address: ${fullAddress}\n\nSearch results:\n${geoContext}`
        );

        try {
          const coordMatch = coordAnalysis.match(/\{[\s\S]*\}/);
          if (coordMatch) {
            const coords = JSON.parse(coordMatch[0]) as { latitude: number; longitude: number };
            if (typeof coords.latitude === 'number' && typeof coords.longitude === 'number' &&
                coords.latitude >= -11 && coords.latitude <= 6 &&
                coords.longitude >= 95 && coords.longitude <= 141) {
              location.latitude = coords.latitude;
              location.longitude = coords.longitude;
              location.mapUrl = `https://www.google.com/maps/@${coords.latitude},${coords.longitude},15z`;
              location.embedUrl = `https://www.google.com/maps/embed/v1/place?key=&q=${coords.latitude},${coords.longitude}`;
              location.openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${coords.latitude}&mlon=${coords.longitude}#map=15/${coords.latitude}/${coords.longitude}`;
            }
          }
        } catch {
          // Coordinate parsing failed, keep default location URLs
        }
      }
    } catch {
      // Geocoding failed, keep default URLs
    }

    // ----------------------------------------------------------
    // Step 3: OSINT - Search for public records and data leaks
    // ----------------------------------------------------------
    const publicRecords: Array<{ title: string; snippet: string; url: string; domain: string; type: string }> = [];
    const dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }> = [];

    try {
      // Search for NIK in data leaks
      if (ktpData.nik && ktpData.nik.length >= 10) {
        const nikLeakResults = await safeWebSearch(
          `"${ktpData.nik}" data leak breach KTP identitas personal`,
          5
        );

        for (const r of (nikLeakResults as Array<Record<string, string>>)) {
          const text = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
          const isLeak = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'data bocor', 'hacked', 'compromised', 'dump', 'paste'].some(k => text.includes(k));

          if (isLeak) {
            let severity: 'critical' | 'high' | 'medium' | 'low' = 'high';
            let type = 'Data Exposure';
            if (text.includes('ktp') || text.includes('identitas') || text.includes('identity')) { severity = 'critical'; type = 'Identity Document Leak'; }
            else if (text.includes('password') || text.includes('credential')) { severity = 'critical'; type = 'Credential Leak'; }
            else if (text.includes('breach')) { severity = 'high'; type = 'Data Breach'; }
            else if (text.includes('phone') || text.includes('mobile')) { severity = 'medium'; type = 'Phone Number Exposure'; }

            dataLeaks.push({
              type,
              severity,
              source: r.host_name || 'Web',
              description: r.snippet?.substring(0, 200) || '',
              url: r.url || '',
            });
          }

          publicRecords.push({
            title: r.name || 'NIK Search Result',
            snippet: r.snippet?.substring(0, 200) || '',
            url: r.url || '',
            domain: r.host_name || '',
            type: 'NIK Leak Search',
          });
        }
      }

      // Search for name + address for public records
      if (ktpData.nama && ktpData.alamat) {
        const nameAddrResults = await safeWebSearch(
          `"${ktpData.nama}" "${ktpData.kabupatenKota || ktpData.kecamatan}" public records profile`,
          5
        );

        for (const r of (nameAddrResults as Array<Record<string, string>>)) {
          publicRecords.push({
            title: r.name || 'Name + Address Search',
            snippet: r.snippet?.substring(0, 200) || '',
            url: r.url || '',
            domain: r.host_name || '',
            type: 'Name + Address Search',
          });

          // Check if this is also a leak
          const text = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
          if (['leak', 'breach', 'exposed', 'ktp', 'data bocor'].some(k => text.includes(k))) {
            dataLeaks.push({
              type: 'Personal Data Exposure',
              severity: 'high',
              source: r.host_name || 'Web',
              description: r.snippet?.substring(0, 200) || '',
              url: r.url || '',
            });
          }
        }
      }

      // Search for name only (social media / professional profiles)
      if (ktpData.nama) {
        const nameResults = await safeWebSearch(
          `"${ktpData.nama}" social media profile facebook instagram linkedin`,
          5
        );

        for (const r of (nameResults as Array<Record<string, string>>)) {
          publicRecords.push({
            title: r.name || 'Name Search Result',
            snippet: r.snippet?.substring(0, 200) || '',
            url: r.url || '',
            domain: r.host_name || '',
            type: 'Social/Profile Search',
          });
        }
      }
    } catch {
      // OSINT searches failed, continue with whatever data we have
    }

    // ----------------------------------------------------------
    // Step 4: Comprehensive AI Analysis
    // ----------------------------------------------------------
    const leakSummary = dataLeaks.length > 0
      ? dataLeaks.map(l => `[${l.severity.toUpperCase()}] ${l.type}: ${l.description} (Source: ${l.source})`).join('\n')
      : 'No data leaks detected from search results.';

    const recordSummary = publicRecords.length > 0
      ? publicRecords.slice(0, 8).map(r => `[${r.type}] ${r.title}: ${r.snippet}`).join('\n')
      : 'No public records found from search results.';

    const aiAnalysis = await safeAIAnalysis(
      `You are an elite OSINT analyst specializing in Indonesian identity document intelligence and geolocation tracking.
Analyze the extracted KTP data and provide a COMPREHENSIVE structured intelligence report with these sections:

## 🪪 KTP DATA VALIDATION
- NIK number analysis (format check: should be 16 digits, check digit patterns)
- Data consistency check (e.g., does gender match NIK encoding? NIK encodes DOB and gender)
- Field completeness assessment (which fields are present/missing)
- NIK decoding: extract DOB, gender, and region codes from NIK structure
  - Digits 1-6: Region code (province + city/kecamatan)
  - Digits 7-12: DOB (DDMMYY, females add 40 to day)
  - Digits 13-16: Sequential registration number

## 📍 GEOLOCATION INTELLIGENCE
- Full address analysis
- Province and regency/city identification
- Administrative area context
- Geographic coordinates and accuracy assessment
- Map visualization links

## 🔍 PUBLIC RECORDS & DIGITAL FOOTPRINT
- Social media profiles found
- Professional records
- Public documents or mentions
- Cross-referenced identities

## 🚨 DATA BREACH & LEAK ASSESSMENT
- NIK exposure in known data breaches
- Personal data leaks
- Identity theft risk level
- Compromised information types
- Severity classification

## ⚠️ PRIVACY & SECURITY RISK
- Overall risk level (LOW / MEDIUM / HIGH / CRITICAL)
- Identity theft potential
- Recommended protective measures
- What to monitor going forward

## 🎯 INVESTIGATION RECOMMENDATIONS
- Further verification steps
- Additional OSINT techniques to apply
- Cross-reference suggestions
- Monitoring recommendations

Be thorough, specific, and include all findings. Use emojis for section headers. Format with markdown.`,
      `KTP DATA EXTRACTED:
- NIK: ${ktpData.nik || 'N/A'}
- Nama: ${ktpData.nama || 'N/A'}
- Tempat/Tgl Lahir: ${ktpData.tempatTglLahir || 'N/A'}
- Jenis Kelamin: ${ktpData.jenisKelamin || 'N/A'}
- Alamat: ${ktpData.alamat || 'N/A'}
- RT/RW: ${ktpData.rtRw || 'N/A'}
- Kel/Desa: ${ktpData.kelDesa || 'N/A'}
- Kecamatan: ${ktpData.kecamatan || 'N/A'}
- Agama: ${ktpData.agama || 'N/A'}
- Status: ${ktpData.statusPerkawinan || 'N/A'}
- Pekerjaan: ${ktpData.pekerjaan || 'N/A'}
- Kewarganegaraan: ${ktpData.kewarganegaraan || 'N/A'}
- Provinsi: ${ktpData.provinsi || 'N/A'}
- Kabupaten/Kota: ${ktpData.kabupatenKota || 'N/A'}
- Berlaku Hingga: ${ktpData.berlakuHingga || 'N/A'}

FULL ADDRESS: ${fullAddress}

LOCATION COORDINATES: ${location.latitude !== null ? `${location.latitude}, ${location.longitude}` : 'Not determined'}

MAP URLS:
- Google Maps: ${location.mapUrl}
- OpenStreetMap: ${location.openStreetMapUrl}

DATA LEAKS:
${leakSummary}

PUBLIC RECORDS:
${recordSummary}

Provide a comprehensive KTP intelligence and location tracking report.`
    );

    // ----------------------------------------------------------
    // Return the complete result
    // ----------------------------------------------------------
    return NextResponse.json({
      success: true,
      ktpData,
      location,
      publicRecords,
      dataLeaks,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
