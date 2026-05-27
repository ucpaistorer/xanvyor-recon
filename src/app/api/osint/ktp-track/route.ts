import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, safeVisionAnalysis } from '@/lib/zai';

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

    const vlmResult = await safeVisionAnalysis(effectiveImageUrl, vlmPrompt);
    if (!vlmResult.success) {
      return NextResponse.json(
        { error: vlmResult.error || 'VLM analysis failed. The image URL may be inaccessible.' },
        { status: 500 }
      );
    }
    const rawVlmResponse = vlmResult.content;

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

    // Try to geocode the address using Nominatim
    try {
      const geoUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&accept-language=id`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'User-Agent': 'XANVYOR-RECON-OSINT/1.0' },
        signal: AbortSignal.timeout(8000),
      });
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.length > 0) {
          location.latitude = parseFloat(geoData[0].lat);
          location.longitude = parseFloat(geoData[0].lon);
          location.openStreetMapUrl = `https://www.openstreetmap.org/?mlat=${location.latitude}&mlon=${location.longitude}#map=15/${location.latitude}/${location.longitude}`;
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

      // Search for name + address (combines public records + social media)
      if (ktpData.nama) {
        const nameAddrResults = await safeWebSearch(
          `"${ktpData.nama}" "${ktpData.kabupatenKota || ktpData.kecamatan || ''}" public records profile social media facebook instagram`,
          5
        );

        for (const r of (nameAddrResults as Array<Record<string, string>>)) {
          publicRecords.push({
            title: r.name || 'Name Search Result',
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
      `OSINT analyst for Indonesian KTP intelligence & geolocation. Report with: ## 🪪 KTP DATA VALIDATION ## 📍 GEOLOCATION INTELLIGENCE ## 🔍 PUBLIC RECORDS & DIGITAL FOOTPRINT ## 🚨 DATA BREACH & LEAK ## ⚠️ PRIVACY & SECURITY RISK ## 🎯 INVESTIGATION RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
      `KTP: NIK=${ktpData.nik || 'N/A'} | Nama=${ktpData.nama || 'N/A'} | DOB=${ktpData.tempatTglLahir || 'N/A'} | Gender=${ktpData.jenisKelamin || 'N/A'} | Alamat=${ktpData.alamat || 'N/A'} | Kec=${ktpData.kecamatan || 'N/A'} | Prov=${ktpData.provinsi || 'N/A'} | Kota=${ktpData.kabupatenKota || 'N/A'}
Address: ${fullAddress}

Leaks: ${leakSummary.substring(0, 500)}
Records: ${recordSummary.substring(0, 500)}`
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
