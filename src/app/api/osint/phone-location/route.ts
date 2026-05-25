import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Indonesian carrier mapping
const CARRIER_MAP: Record<string, string> = {
  '811': 'Telkomsel', '812': 'Telkomsel', '813': 'Telkomsel',
  '821': 'Telkomsel', '822': 'Telkomsel', '823': 'Telkomsel',
  '851': 'Telkomsel', '852': 'Telkomsel', '853': 'Telkomsel',
  '814': 'Indosat Ooredoo', '815': 'Indosat Ooredoo', '816': 'Indosat Ooredoo',
  '855': 'Indosat Ooredoo', '856': 'Indosat Ooredoo', '857': 'Indosat Ooredoo',
  '817': 'XL Axiata', '818': 'XL Axiata', '819': 'XL Axiata', '859': 'XL Axiata',
  '854': 'Three (3)', '858': 'Three (3)',
  '838': 'Tri (3)', '831': 'Tri (3)', '832': 'Tri (3)', '833': 'Tri (3)',
  '825': 'Smartfren', '826': 'Smartfren', '827': 'Smartfren', '828': 'Smartfren',
  '877': 'Byru', '878': 'Byru',
};

// Indonesian phone prefix to region mapping
const PREFIX_REGION_MAP: Record<string, string> = {
  '811': 'Jakarta & Surrounding', '812': 'Jakarta & Surrounding', '813': 'Jakarta & Surrounding',
  '821': 'Jabodetabek', '822': 'Jabodetabek', '823': 'Jabodetabek',
  '851': 'Sumatra & Surrounding', '852': 'Sumatra & Surrounding', '853': 'Sumatra & Surrounding',
  '814': 'Central Indonesia', '815': 'Central Indonesia', '816': 'Central Indonesia',
  '855': 'East Indonesia', '856': 'East Indonesia', '857': 'East Indonesia',
  '817': 'Jakarta & West Java', '818': 'Jakarta & West Java', '819': 'Jakarta & West Java',
  '859': 'Bali & Nusa Tenggara',
  '854': 'East Java & Central Java', '858': 'East Java & Central Java',
  '838': 'Kalimantan & Sulawesi', '831': 'Kalimantan & Sulawesi', '832': 'Kalimantan & Sulawesi', '833': 'Kalimantan & Sulawesi',
  '825': 'Greater Jakarta', '826': 'Greater Jakarta', '827': 'Greater Jakarta', '828': 'Greater Jakarta',
};

// Carrier network type mapping
const CARRIER_NETWORK_MAP: Record<string, string> = {
  'Telkomsel': '4G LTE / 5G',
  'Indosat Ooredoo': '4G LTE / 5G',
  'XL Axiata': '4G LTE / 5G',
  'Three (3)': '4G LTE',
  'Tri (3)': '4G LTE',
  'Smartfren': '4G LTE / 5G',
  'Byru': 'Satellite',
};

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    // Clean the phone number
    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

    // Detect country and carrier
    const countryInfo = detectCountry(cleaned);
    const carrierInfo = detectCarrier(cleaned, countryInfo.countryCode);

    // Get phone number variants for search coverage
    const phoneVariants = getPhoneVariants(cleaned, countryInfo.countryCode);
    const phoneLocal = phoneVariants.local;
    const phoneFormatted = countryInfo.countryCode === '+62'
      ? `${phoneLocal.substring(0, 3)}-${phoneLocal.substring(3, 7)}-${phoneLocal.substring(7)}`
      : phone;

    // Detect region from prefix for Indonesian numbers
    const prefixRegion = detectPrefixRegion(cleaned, countryInfo.countryCode);

    // ====== COMPREHENSIVE LOCATION-FOCUSED OSINT SEARCHES ======
    const [
      locationResults,
      areaResults,
      gpsResults,
      cellTowerResults,
      publicRecordsResults,
      leakResults,
    ] = await sequentialWebSearch([
      { query: `"${phone}" OR "${phoneLocal}" location lokasi alamat address city kota where located`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" area code prefix region daerah wilayah kode area`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" GPS geolocation coordinates latitude longitude koordinat posisi`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" cell tower BTS base station signal location tracking pelacakan`, num: 8 },
      { query: `"${phone}" OR "${phoneLocal}" public records address domicile tempat tinggal domisili registered`, num: 8 },
      { query: `"${phone}" data breach leak location address KTP identitas personal data exposed bocor lokasi`, num: 8 },
    ], 1500);

    // Parse all search results into uniform format
    const parseResults = (results: unknown[]) => {
      return results.map((r: unknown) => {
        const result = r as Record<string, unknown>;
        return {
          url: (result.url as string) || '',
          title: (result.title as string) || (result.name as string) || '',
          snippet: (result.snippet as string) || '',
          domain: result.url ? new URL(result.url as string).hostname.replace('www.', '') : (result.host_name as string) || '',
        };
      }).filter((r) => r.title || r.snippet);
    };

    const locationData = parseResults(locationResults);
    const areaData = parseResults(areaResults);
    const gpsData = parseResults(gpsResults);
    const cellTowerData = parseResults(cellTowerResults);
    const publicRecordsData = parseResults(publicRecordsResults);
    const leakData = parseResults(leakResults);

    // ====== AREA INFO EXTRACTION ======
    const areaInfo = [...areaData, ...locationData.slice(0, 3)]
      .filter(r => r.snippet && r.snippet.length > 10)
      .slice(0, 10)
      .map(r => ({
        title: r.title || 'Area Information',
        snippet: r.snippet.substring(0, 250),
        url: r.url,
        source: r.domain,
      }));

    // ====== LOCATION RESULTS AGGREGATION ======
    const allLocationResults = [
      ...locationData,
      ...areaData.slice(0, 3),
      ...gpsData.slice(0, 3),
      ...cellTowerData.slice(0, 2),
      ...publicRecordsData.slice(0, 2),
    ];

    // ====== DATA LEAK DETECTION ======
    const leakKeywords = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'password', 'data bocor', 'hacked', 'compromised', 'dumped', 'paste', 'alamat', 'address', 'lokasi'];
    const dataLeaks = leakData
      .filter(r => leakKeywords.some(k => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map(r => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';
        if (text.includes('ktp') || text.includes('identitas') || text.includes('identity')) {
          severity = 'critical'; type = 'Identity Document Leak';
        } else if (text.includes('password') || text.includes('credential')) {
          severity = 'critical'; type = 'Credential Leak';
        } else if (text.includes('breach')) {
          severity = 'high'; type = 'Data Breach';
        } else if (text.includes('alamat') || text.includes('address') || text.includes('lokasi') || text.includes('location')) {
          severity = 'high'; type = 'Location Data Exposure';
        } else if (text.includes('phone') || text.includes('mobile')) {
          severity = 'medium'; type = 'Phone Number Exposure';
        }
        return { type, severity, source: r.domain, description: r.snippet.substring(0, 200), url: r.url };
      });

    // ====== AI-POWERED LOCATION EXTRACTION ======
    const allSearchContext = [
      ...locationData.slice(0, 5).map(r => `[LOCATION] ${r.title}: ${r.snippet}`),
      ...areaData.slice(0, 5).map(r => `[AREA] ${r.title}: ${r.snippet}`),
      ...gpsData.slice(0, 5).map(r => `[GPS] ${r.title}: ${r.snippet}`),
      ...cellTowerData.slice(0, 3).map(r => `[CELL-TOWER] ${r.title}: ${r.snippet}`),
      ...publicRecordsData.slice(0, 3).map(r => `[PUBLIC-RECORDS] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map(r => `[LEAK] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    // Use AI to extract structured location data from search results
    const locationExtractionPrompt = allSearchContext.length > 0
      ? await safeAIAnalysis(
          `You are a phone number geolocation and intelligence analyst. Extract ALL location information for the phone number from the search results.

Return ONLY a JSON object with this exact format, no other text:
{
  "region": "Region/province name or null",
  "city": "City name or null",
  "province": "Province/state name or null",
  "fullAddress": "Full address if found or null",
  "latitude": number or null,
  "longitude": number or null,
  "accuracy": "high/medium/low",
  "locationConfidence": "Percentage estimate of location accuracy (0-100)",
  "additionalLocations": [{"region": "name", "city": "name", "source": "where found"}]
}

Rules:
- Extract any geographic location data (city, region, province, address)
- If coordinates (latitude/longitude) are found, include them as numbers
- accuracy "high" = exact address found, "medium" = city/region found, "low" = only country or general area
- Look for Indonesian location names (Jakarta, Surabaya, Bandung, Medan, etc.)
- Include all location hints even if not exact matches
- If no location data found, return null values

IMPORTANT: Return ONLY the JSON object, no markdown, no explanation.`,
          `Phone number: ${phone}
Local format: ${phoneLocal}
Carrier: ${carrierInfo.carrier}
Prefix region hint: ${prefixRegion}
Country: ${countryInfo.country}

Search results (analyze each one for location data):
${allSearchContext}`
        )
      : '{}';

    // Parse AI-extracted location data
    let extractedLocation: {
      region?: string | null;
      city?: string | null;
      province?: string | null;
      fullAddress?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: string;
      locationConfidence?: string;
      additionalLocations?: Array<{ region: string; city: string; source: string }>;
    } = {};

    try {
      const cleanedJson = locationExtractionPrompt.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extractedLocation = JSON.parse(cleanedJson);
    } catch {
      // Fallback to prefix-based region detection
      extractedLocation = {
        region: prefixRegion,
        city: null,
        province: null,
        fullAddress: null,
        latitude: null,
        longitude: null,
        accuracy: prefixRegion ? 'low' : 'unknown',
      };
    }

    // Build structured location object
    const location = {
      region: extractedLocation.region || prefixRegion || null,
      city: extractedLocation.city || null,
      province: extractedLocation.province || null,
      fullAddress: extractedLocation.fullAddress || null,
      latitude: extractedLocation.latitude ?? null,
      longitude: extractedLocation.longitude ?? null,
      mapUrl: (extractedLocation.latitude && extractedLocation.longitude)
        ? `https://www.google.com/maps?q=${extractedLocation.latitude},${extractedLocation.longitude}`
        : (extractedLocation.city || extractedLocation.region)
          ? `https://www.google.com/maps?q=${encodeURIComponent(extractedLocation.city || extractedLocation.region || '')}`
          : null,
      openStreetMapUrl: (extractedLocation.latitude && extractedLocation.longitude)
        ? `https://www.openstreetmap.org/?mlat=${extractedLocation.latitude}&mlon=${extractedLocation.longitude}#map=15/${extractedLocation.latitude}/${extractedLocation.longitude}`
        : (extractedLocation.city || extractedLocation.region)
          ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(extractedLocation.city || extractedLocation.region || '')}`
          : null,
      accuracy: extractedLocation.accuracy || (prefixRegion ? 'low' : 'unknown'),
    };

    // ====== CARRIER INFO STRUCTURE ======
    const carrierInfoStructured = {
      carrier: carrierInfo.carrier,
      type: carrierInfo.type,
      network: CARRIER_NETWORK_MAP[carrierInfo.carrier] || 'Unknown',
      region: prefixRegion || 'Unknown',
    };

    // ====== COMPREHENSIVE AI ANALYSIS ======
    const aiAnalysis = allSearchContext.length > 0
      ? await safeAIAnalysis(
          `You are an elite OSINT analyst specializing in phone number geolocation, geographic intelligence, and cell network analysis.
Analyze the phone number data and provide a COMPREHENSIVE structured location intelligence report with these sections:

## 📍 Location Assessment
- Primary location identified (city, region, province)
- Location confidence level and reasoning
- Full address if discovered
- Geographic coordinates if available
- Map references

## 🗺️ Geographic Intelligence
- Region/area analysis based on phone prefix
- Population density and urbanization of the area
- Known landmarks or notable features of the area
- Administrative divisions (province, regency, district)
- Time zone information

## 📡 Carrier & Network Info
- Mobile carrier identification
- Network technology (4G/5G coverage in the area)
- Cell tower distribution patterns
- Network infrastructure quality indicators
- SIM card registration region

## 📶 Cell Tower Analysis
- Estimated cell tower density in the area
- Known BTS (Base Transceiver Station) locations
- Signal coverage patterns
- Network type availability (2G/3G/4G/5G)

## 🚨 Data Leak Intelligence
- Any data breaches involving location data for this number
- Personal address exposure
- KTP/identity document leaks with address info
- Compromised accounts with location data
- Severity assessment of each leak

## 🔍 Investigation Recommendations
- Additional search strategies for more precise location
- Public records that could provide address data
- Social media geolocation analysis tips
- Cell tower triangulation methodology
- Legal considerations for location tracking

Be thorough, precise, and provide actionable intelligence. Use Indonesian geographic context when relevant. Include coordinates if found with proper formatting.`,
          `Analyze phone number: ${phone}
Number info: Country=${countryInfo.country}, Carrier=${carrierInfo.carrier}, Type=${carrierInfo.type}
Prefix region hint: ${prefixRegion}
Extracted location: Region=${location.region}, City=${location.city}, Province=${location.province}
Coordinates: Lat=${location.latitude}, Lng=${location.longitude}
Accuracy: ${location.accuracy}

Intelligence data:
${allSearchContext}

Provide a complete phone number location intelligence report.`
        )
      : 'No location intelligence data available for this phone number.';

    return NextResponse.json({
      success: true,
      phone,
      cleaned,
      countryCode: countryInfo.countryCode,
      country: countryInfo.country,
      location,
      areaInfo,
      carrierInfo: carrierInfoStructured,
      locationResults: allLocationResults,
      dataLeaks,
      leakCount: dataLeaks.length,
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ====== HELPER FUNCTIONS ======

function getPhoneVariants(cleaned: string, countryCode: string): { local: string; international: string } {
  if (countryCode === '+62' && cleaned.startsWith('62')) {
    return {
      local: '0' + cleaned.substring(2),
      international: '+' + cleaned,
    };
  }
  return {
    local: cleaned,
    international: '+' + cleaned,
  };
}

function detectCountry(cleaned: string): { countryCode: string; country: string } {
  if (cleaned.startsWith('62')) return { countryCode: '+62', country: 'Indonesia' };
  if (cleaned.startsWith('1')) return { countryCode: '+1', country: 'United States/Canada' };
  if (cleaned.startsWith('44')) return { countryCode: '+44', country: 'United Kingdom' };
  if (cleaned.startsWith('86')) return { countryCode: '+86', country: 'China' };
  if (cleaned.startsWith('91')) return { countryCode: '+91', country: 'India' };
  if (cleaned.startsWith('81')) return { countryCode: '+81', country: 'Japan' };
  if (cleaned.startsWith('82')) return { countryCode: '+82', country: 'South Korea' };
  if (cleaned.startsWith('60')) return { countryCode: '+60', country: 'Malaysia' };
  if (cleaned.startsWith('66')) return { countryCode: '+66', country: 'Thailand' };
  if (cleaned.startsWith('84')) return { countryCode: '+84', country: 'Vietnam' };
  if (cleaned.startsWith('49')) return { countryCode: '+49', country: 'Germany' };
  if (cleaned.startsWith('33')) return { countryCode: '+33', country: 'France' };
  if (cleaned.startsWith('55')) return { countryCode: '+55', country: 'Brazil' };
  if (cleaned.startsWith('7')) return { countryCode: '+7', country: 'Russia' };
  if (cleaned.startsWith('61')) return { countryCode: '+61', country: 'Australia' };
  if (cleaned.startsWith('65')) return { countryCode: '+65', country: 'Singapore' };
  if (cleaned.startsWith('63')) return { countryCode: '+63', country: 'Philippines' };
  if (cleaned.startsWith('880')) return { countryCode: '+880', country: 'Bangladesh' };
  if (cleaned.startsWith('234')) return { countryCode: '+234', country: 'Nigeria' };
  if (cleaned.startsWith('27')) return { countryCode: '+27', country: 'South Africa' };
  return { countryCode: '+?', country: 'Unknown' };
}

function detectCarrier(cleaned: string, countryCode: string): { carrier: string; type: string } {
  if (countryCode === '+62') {
    const afterCountryCode = cleaned.substring(2);
    if (afterCountryCode.startsWith('8') && afterCountryCode.length >= 3) {
      const prefix = afterCountryCode.substring(0, 3);
      for (const [key, value] of Object.entries(CARRIER_MAP)) {
        if (prefix === key) return { carrier: value, type: 'Mobile' };
      }
    }
    return { carrier: 'Unknown (Indonesian)', type: 'Mobile' };
  }
  if (countryCode === '+1') return { carrier: 'US/Canada Carrier', type: 'Mobile' };
  if (countryCode === '+44') return { carrier: 'UK Carrier', type: 'Mobile' };
  if (countryCode === '+86') return { carrier: 'China Carrier', type: 'Mobile' };
  if (countryCode === '+91') return { carrier: 'India Carrier', type: 'Mobile' };
  return { carrier: 'Local Carrier', type: 'Mobile' };
}

function detectPrefixRegion(cleaned: string, countryCode: string): string | null {
  if (countryCode === '+62') {
    const afterCountryCode = cleaned.substring(2);
    if (afterCountryCode.startsWith('8') && afterCountryCode.length >= 3) {
      const prefix = afterCountryCode.substring(0, 3);
      return PREFIX_REGION_MAP[prefix] || null;
    }
  }
  return null;
}
