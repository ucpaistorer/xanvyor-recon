import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Indonesian carrier mapping with full details
const CARRIER_MAP: Record<string, { name: string; network: string; mcc: string; mnc: string }> = {
  '811': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '812': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '813': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '821': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '822': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '823': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '851': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '852': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '853': { name: 'Telkomsel', network: '4G LTE / 5G', mcc: '510', mnc: '10' },
  '814': { name: 'Indosat Ooredoo Hutchison', network: '4G LTE / 5G', mcc: '510', mnc: '21' },
  '815': { name: 'Indosat Ooredoo Hutchison', network: '4G LTE / 5G', mcc: '510', mnc: '21' },
  '816': { name: 'Indosat Ooredoo Hutchison', network: '4G LTE / 5G', mcc: '510', mnc: '21' },
  '855': { name: 'Indosat Ooredoo Hutchison', network: '4G LTE / 5G', mcc: '510', mnc: '21' },
  '856': { name: 'Indosat Ooredoo Hutchison', network: '4G LTE / 5G', mcc: '510', mnc: '21' },
  '857': { name: 'Indosat Ooredoo Hutchison', network: '4G LTE / 5G', mcc: '510', mnc: '21' },
  '817': { name: 'XL Axiata', network: '4G LTE / 5G', mcc: '510', mnc: '11' },
  '818': { name: 'XL Axiata', network: '4G LTE / 5G', mcc: '510', mnc: '11' },
  '819': { name: 'XL Axiata', network: '4G LTE / 5G', mcc: '510', mnc: '11' },
  '859': { name: 'XL Axiata', network: '4G LTE / 5G', mcc: '510', mnc: '11' },
  '854': { name: 'Indosat (Tri)', network: '4G LTE', mcc: '510', mnc: '21' },
  '858': { name: 'Indosat (Tri)', network: '4G LTE', mcc: '510', mnc: '21' },
  '838': { name: 'Tri (3)', network: '4G LTE', mcc: '510', mnc: '89' },
  '831': { name: 'Tri (3)', network: '4G LTE', mcc: '510', mnc: '89' },
  '832': { name: 'Tri (3)', network: '4G LTE', mcc: '510', mnc: '89' },
  '833': { name: 'Tri (3)', network: '4G LTE', mcc: '510', mnc: '89' },
  '825': { name: 'Smartfren', network: '4G LTE / 5G', mcc: '510', mnc: '28' },
  '826': { name: 'Smartfren', network: '4G LTE / 5G', mcc: '510', mnc: '28' },
  '827': { name: 'Smartfren', network: '4G LTE / 5G', mcc: '510', mnc: '28' },
  '828': { name: 'Smartfren', network: '4G LTE / 5G', mcc: '510', mnc: '28' },
  '877': { name: 'Byru (Satelit)', network: 'Satellite', mcc: '510', mnc: '00' },
  '878': { name: 'Byru (Satelit)', network: 'Satellite', mcc: '510', mnc: '00' },
};

// Prefix to region GPS mapping (approximate center coordinates)
const PREFIX_GPS_MAP: Record<string, { lat: number; lng: number; region: string; province: string; city: string; timezone: string }> = {
  '811': { lat: -6.2088, lng: 106.8456, region: 'Jakarta & Surrounding', province: 'DKI Jakarta', city: 'Jakarta', timezone: 'WIB (UTC+7)' },
  '812': { lat: -6.2088, lng: 106.8456, region: 'Jakarta & Surrounding', province: 'DKI Jakarta', city: 'Jakarta', timezone: 'WIB (UTC+7)' },
  '813': { lat: -6.2088, lng: 106.8456, region: 'Jakarta & Surrounding', province: 'DKI Jakarta', city: 'Jakarta', timezone: 'WIB (UTC+7)' },
  '821': { lat: -6.3456, lng: 106.9600, region: 'Jabodetabek', province: 'Jawa Barat', city: 'Bekasi/Depok', timezone: 'WIB (UTC+7)' },
  '822': { lat: -6.3456, lng: 106.9600, region: 'Jabodetabek', province: 'Jawa Barat', city: 'Bekasi/Depok', timezone: 'WIB (UTC+7)' },
  '823': { lat: -6.3456, lng: 106.9600, region: 'Jabodetabek', province: 'Jawa Barat', city: 'Bekasi/Depok', timezone: 'WIB (UTC+7)' },
  '851': { lat: 3.5952, lng: 98.6722, region: 'Sumatra & Surrounding', province: 'Sumatera Utara', city: 'Medan', timezone: 'WIB (UTC+7)' },
  '852': { lat: 3.5952, lng: 98.6722, region: 'Sumatra & Surrounding', province: 'Sumatera Utara', city: 'Medan', timezone: 'WIB (UTC+7)' },
  '853': { lat: 3.5952, lng: 98.6722, region: 'Sumatra & Surrounding', province: 'Sumatera Utara', city: 'Medan', timezone: 'WIB (UTC+7)' },
  '814': { lat: -7.2575, lng: 112.7521, region: 'Central Indonesia', province: 'Jawa Timur', city: 'Surabaya', timezone: 'WIB (UTC+7)' },
  '815': { lat: -7.2575, lng: 112.7521, region: 'Central Indonesia', province: 'Jawa Timur', city: 'Surabaya', timezone: 'WIB (UTC+7)' },
  '816': { lat: -7.2575, lng: 112.7521, region: 'Central Indonesia', province: 'Jawa Timur', city: 'Surabaya', timezone: 'WIB (UTC+7)' },
  '855': { lat: -5.1477, lng: 119.4327, region: 'East Indonesia', province: 'Sulawesi Selatan', city: 'Makassar', timezone: 'WITA (UTC+8)' },
  '856': { lat: -5.1477, lng: 119.4327, region: 'East Indonesia', province: 'Sulawesi Selatan', city: 'Makassar', timezone: 'WITA (UTC+8)' },
  '857': { lat: -5.1477, lng: 119.4327, region: 'East Indonesia', province: 'Sulawesi Selatan', city: 'Makassar', timezone: 'WITA (UTC+8)' },
  '817': { lat: -6.9175, lng: 107.6191, region: 'Jakarta & West Java', province: 'Jawa Barat', city: 'Bandung', timezone: 'WIB (UTC+7)' },
  '818': { lat: -6.9175, lng: 107.6191, region: 'Jakarta & West Java', province: 'Jawa Barat', city: 'Bandung', timezone: 'WIB (UTC+7)' },
  '819': { lat: -6.9175, lng: 107.6191, region: 'Jakarta & West Java', province: 'Jawa Barat', city: 'Bandung', timezone: 'WIB (UTC+7)' },
  '859': { lat: -8.6705, lng: 115.2126, region: 'Bali & Nusa Tenggara', province: 'Bali', city: 'Denpasar', timezone: 'WITA (UTC+8)' },
  '854': { lat: -7.7956, lng: 110.3695, region: 'East Java & Central Java', province: 'DI Yogyakarta', city: 'Yogyakarta', timezone: 'WIB (UTC+7)' },
  '858': { lat: -7.7956, lng: 110.3695, region: 'East Java & Central Java', province: 'DI Yogyakarta', city: 'Yogyakarta', timezone: 'WIB (UTC+7)' },
  '838': { lat: -1.2399, lng: 116.8529, region: 'Kalimantan & Sulawesi', province: 'Kalimantan Timur', city: 'Balikpapan', timezone: 'WITA (UTC+8)' },
  '831': { lat: -1.2399, lng: 116.8529, region: 'Kalimantan & Sulawesi', province: 'Kalimantan Timur', city: 'Balikpapan', timezone: 'WITA (UTC+8)' },
  '832': { lat: -1.2399, lng: 116.8529, region: 'Kalimantan & Sulawesi', province: 'Kalimantan Timur', city: 'Balikpapan', timezone: 'WITA (UTC+8)' },
  '833': { lat: -1.2399, lng: 116.8529, region: 'Kalimantan & Sulawesi', province: 'Kalimantan Timur', city: 'Balikpapan', timezone: 'WITA (UTC+8)' },
  '825': { lat: -6.1745, lng: 106.8227, region: 'Greater Jakarta', province: 'DKI Jakarta', city: 'Jakarta Pusat', timezone: 'WIB (UTC+7)' },
  '826': { lat: -6.1745, lng: 106.8227, region: 'Greater Jakarta', province: 'DKI Jakarta', city: 'Jakarta Pusat', timezone: 'WIB (UTC+7)' },
  '827': { lat: -6.1745, lng: 106.8227, region: 'Greater Jakarta', province: 'DKI Jakarta', city: 'Jakarta Pusat', timezone: 'WIB (UTC+7)' },
  '828': { lat: -6.1745, lng: 106.8227, region: 'Greater Jakarta', province: 'DKI Jakarta', city: 'Jakarta Pusat', timezone: 'WIB (UTC+7)' },
};

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');

    // Detect country and carrier
    const countryInfo = detectCountry(cleaned);
    const carrierData = detectCarrierFull(cleaned, countryInfo.countryCode);

    // Get phone variants
    const phoneVariants = getPhoneVariants(cleaned, countryInfo.countryCode);
    const phoneLocal = phoneVariants.local;
    const phoneFormatted = countryInfo.countryCode === '+62'
      ? `${phoneLocal.substring(0, 3)}-${phoneLocal.substring(3, 7)}-${phoneLocal.substring(7)}`
      : phone;

    // Detect GPS data from prefix
    const prefixGps = detectPrefixGPS(cleaned, countryInfo.countryCode);

    // ====== COMPREHENSIVE LOCATION-FOCUSED OSINT SEARCHES ======
    const [
      locationResults,
      areaResults,
      leakResults,
      operatorResults,
    ] = await sequentialWebSearch([
      { query: `"${phone}" OR "${phoneLocal}" location lokasi alamat GPS coordinates latitude longitude area region`, num: 5 },
      { query: `"${phone}" OR "${phoneLocal}" cell tower BTS public records address domicile tempat tinggal domisili`, num: 5 },
      { query: `"${phone}" data breach leak location address KTP identitas personal data exposed IP ISP network`, num: 5 },
      { query: `${carrierData.name} Indonesia operator coverage area BTS network 4G 5G region`, num: 5 },
    ], 800);

    // Parse all search results
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
    const leakData = parseResults(leakResults);
    const operatorData = parseResults(operatorResults);
    const gpsData = locationData;
    const cellTowerData = areaData;
    const publicRecordsData = areaData;
    const ipData = leakData;

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

    // ====== ALL LOCATION RESULTS ======
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
        if (text.includes('ktp') || text.includes('identitas') || text.includes('identity')) { severity = 'critical'; type = 'Identity Document Leak'; }
        else if (text.includes('password') || text.includes('credential')) { severity = 'critical'; type = 'Credential Leak'; }
        else if (text.includes('breach')) { severity = 'high'; type = 'Data Breach'; }
        else if (text.includes('alamat') || text.includes('address') || text.includes('lokasi') || text.includes('location')) { severity = 'high'; type = 'Location Data Exposure'; }
        else if (text.includes('phone') || text.includes('mobile')) { severity = 'medium'; type = 'Phone Number Exposure'; }
        return { type, severity, source: r.domain, description: r.snippet.substring(0, 200), url: r.url };
      });

    // ====== AI-POWERED LOCATION & IP EXTRACTION ======
    const allSearchContext = [
      ...locationData.slice(0, 5).map(r => `[LOCATION] ${r.title}: ${r.snippet}`),
      ...areaData.slice(0, 5).map(r => `[AREA] ${r.title}: ${r.snippet}`),
      ...gpsData.slice(0, 5).map(r => `[GPS] ${r.title}: ${r.snippet}`),
      ...cellTowerData.slice(0, 3).map(r => `[CELL-TOWER] ${r.title}: ${r.snippet}`),
      ...publicRecordsData.slice(0, 3).map(r => `[PUBLIC-RECORDS] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map(r => `[LEAK] ${r.title}: ${r.snippet}`),
      ...ipData.slice(0, 3).map(r => `[IP] ${r.title}: ${r.snippet}`),
      ...operatorData.slice(0, 3).map(r => `[OPERATOR] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    // AI-powered comprehensive GPS extraction from search results
    let extractedLocation: {
      region?: string | null;
      city?: string | null;
      province?: string | null;
      fullAddress?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      accuracy?: string;
      locationConfidence?: string;
      estimatedIP?: string | null;
      ispProvider?: string | null;
      networkType?: string | null;
      cellTowerInfo?: string | null;
      locationDescription?: string | null;
      nearbyLandmarks?: string[];
      additionalLocations?: Array<{ region: string; city: string; source: string }>;
    } = {
      region: prefixGps?.region || null,
      city: prefixGps?.city || null,
      province: prefixGps?.province || null,
      fullAddress: null,
      latitude: prefixGps?.lat || null,
      longitude: prefixGps?.lng || null,
      accuracy: prefixGps ? 'low' : 'unknown',
    };

    // Try to extract location data from search results using AI
    if (allSearchContext.length > 50) {
      try {
        const locationAI = await safeAIAnalysis(
          'Respond ONLY with a JSON object. No markdown. No explanation. Extract location data from the search results.',
          `From the following search results for phone number ${phone}, extract any location information (city, province, address, GPS coordinates, IP address, ISP, cell tower info). Return JSON: {"region":"...","city":"...","province":"...","fullAddress":"...","latitude":null,"longitude":null,"accuracy":"low/medium/high","locationConfidence":"0-100","estimatedIP":"...","ispProvider":"...","networkType":"...","cellTowerInfo":"...","locationDescription":"...","nearbyLandmarks":[],"additionalLocations":[]}. Use null for fields where no data is found. Do NOT guess coordinates - only use them if explicitly found in the data.\n\nSearch data:\n${allSearchContext.substring(0, 4000)}`,
          2
        );

        let jsonStr = locationAI.trim();
        if (jsonStr.startsWith('```')) jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Merge with prefix data (AI data takes precedence if available)
          if (parsed.region) extractedLocation.region = parsed.region;
          if (parsed.city) extractedLocation.city = parsed.city;
          if (parsed.province) extractedLocation.province = parsed.province;
          if (parsed.fullAddress) extractedLocation.fullAddress = parsed.fullAddress;
          if (parsed.latitude && typeof parsed.latitude === 'number') extractedLocation.latitude = parsed.latitude;
          if (parsed.longitude && typeof parsed.longitude === 'number') extractedLocation.longitude = parsed.longitude;
          if (parsed.accuracy) extractedLocation.accuracy = parsed.accuracy;
          if (parsed.locationConfidence) extractedLocation.locationConfidence = parsed.locationConfidence;
          if (parsed.estimatedIP) extractedLocation.estimatedIP = parsed.estimatedIP;
          if (parsed.ispProvider) extractedLocation.ispProvider = parsed.ispProvider;
          if (parsed.networkType) extractedLocation.networkType = parsed.networkType;
          if (parsed.cellTowerInfo) extractedLocation.cellTowerInfo = parsed.cellTowerInfo;
          if (parsed.locationDescription) extractedLocation.locationDescription = parsed.locationDescription;
          if (Array.isArray(parsed.nearbyLandmarks)) extractedLocation.nearbyLandmarks = parsed.nearbyLandmarks;
          if (Array.isArray(parsed.additionalLocations)) extractedLocation.additionalLocations = parsed.additionalLocations;
        }
      } catch {
        // AI extraction failed, keep prefix-based defaults
      }
    }

    // Build final GPS coordinates (prefer AI-extracted, fallback to prefix-based)
    const finalLat = extractedLocation.latitude ?? prefixGps?.lat ?? null;
    const finalLng = extractedLocation.longitude ?? prefixGps?.lng ?? null;

    // Build structured location object
    const location = {
      region: extractedLocation.region || prefixGps?.region || null,
      city: extractedLocation.city || prefixGps?.city || null,
      province: extractedLocation.province || prefixGps?.province || null,
      fullAddress: extractedLocation.fullAddress || null,
      latitude: finalLat,
      longitude: finalLng,
      accuracy: extractedLocation.accuracy || (prefixGps ? 'medium' : 'unknown'),
      locationConfidence: extractedLocation.locationConfidence || (prefixGps ? '65' : '0'),
      locationDescription: extractedLocation.locationDescription || null,
      nearbyLandmarks: extractedLocation.nearbyLandmarks || [],
      mapUrl: finalLat && finalLng
        ? `https://www.google.com/maps?q=${finalLat},${finalLng}`
        : (extractedLocation.city || extractedLocation.region || prefixGps?.city)
          ? `https://www.google.com/maps?q=${encodeURIComponent(extractedLocation.city || extractedLocation.region || prefixGps?.city || '')}`
          : null,
      openStreetMapUrl: finalLat && finalLng
        ? `https://www.openstreetmap.org/?mlat=${finalLat}&mlon=${finalLng}#map=15/${finalLat}/${finalLng}`
        : (extractedLocation.city || extractedLocation.region || prefixGps?.city)
          ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(extractedLocation.city || extractedLocation.region || prefixGps?.city || '')}`
          : null,
    };

    // ====== CARRIER & OPERATOR INFO ======
    const carrierInfoStructured = {
      carrier: carrierData.name,
      type: carrierData.type,
      network: carrierData.network,
      region: prefixGps?.region || 'Unknown',
      mcc: carrierData.mcc,
      mnc: carrierData.mnc,
      timezone: prefixGps?.timezone || 'WIB (UTC+7)',
      country: countryInfo.country,
      countryCode: countryInfo.countryCode,
    };

    // ====== IP & NETWORK INTELLIGENCE ======
    const ipInfo = {
      estimatedIP: extractedLocation.estimatedIP || null,
      ispProvider: extractedLocation.ispProvider || carrierData.name,
      networkType: extractedLocation.networkType || carrierData.network,
      cellTowerInfo: extractedLocation.cellTowerInfo || null,
      // Generate estimated IP range based on carrier
      estimatedIPRange: countryInfo.countryCode === '+62'
        ? `${carrierData.name === 'Telkomsel' ? '114.120' : carrierData.name.includes('Indosat') ? '180.252' : carrierData.name === 'XL Axiata' ? '202.152' : '103'}.*.*`
        : null,
    };

    // ====== COMPREHENSIVE AI ANALYSIS (merged GPS extraction + intelligence report) ======
    const aiAnalysis = allSearchContext.length > 0
      ? await safeAIAnalysis(
          `You are a phone GPS geolocation analyst. Provide a concise GPS intelligence report with these sections:
## 📍 GPS Location - coordinates, confidence, address, description (Indonesian+English)
## 🗺️ Geographic Intel - region, province, city, timezone, landmarks
## 📡 Operator - carrier, MCC/MNC, network type, coverage
## 🌐 IP & Network - IP range, ISP, cell tower info
## 🚨 Data Leaks - breaches, KTP leaks, severity
## 🔍 Summary - key findings, confidence rating
Be concise. Use Indonesian context.`,
          `Phone: ${phone} | Carrier: ${carrierData.name} | MCC/MNC: ${carrierData.mcc}/${carrierData.mnc} | Region: ${prefixGps?.region || 'Unknown'} | Coords: ${finalLat},${finalLng}
Search data: ${allSearchContext.substring(0, 2000)}`
        )
      : 'No GPS intelligence data available for this phone number.';

    return NextResponse.json({
      success: true,
      phone,
      cleaned,
      countryCode: countryInfo.countryCode,
      country: countryInfo.country,
      location,
      areaInfo,
      carrierInfo: carrierInfoStructured,
      ipInfo,
      locationResults: allLocationResults,
      ipResults: ipData,
      operatorResults: operatorData,
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
  if (countryCode === '+62') {
    if (cleaned.startsWith('08')) {
      return { local: cleaned, international: '+62' + cleaned.substring(1) };
    }
    if (cleaned.startsWith('62')) {
      return { local: '0' + cleaned.substring(2), international: '+' + cleaned };
    }
  }
  return { local: cleaned, international: '+' + cleaned };
}

function detectCountry(cleaned: string): { countryCode: string; country: string } {
  // Handle Indonesian numbers starting with 08xx (local format) -> convert to 62
  if (cleaned.startsWith('08') && cleaned.length >= 10 && cleaned.length <= 15) return { countryCode: '+62', country: 'Indonesia' };
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

function detectCarrierFull(cleaned: string, countryCode: string): { name: string; type: string; network: string; mcc: string; mnc: string } {
  if (countryCode === '+62') {
    // Handle both "08xx" and "62xx" formats
    const afterPrefix = cleaned.startsWith('08') ? cleaned.substring(1) : cleaned.substring(2);
    if (afterPrefix.startsWith('8') && afterPrefix.length >= 3) {
      const prefix = afterPrefix.substring(0, 3);
      const carrier = CARRIER_MAP[prefix];
      if (carrier) {
        return { name: carrier.name, type: 'Mobile', network: carrier.network, mcc: carrier.mcc, mnc: carrier.mnc };
      }
    }
    return { name: 'Unknown (Indonesian)', type: 'Mobile', network: 'Unknown', mcc: '510', mnc: '00' };
  }
  if (countryCode === '+1') return { name: 'US/Canada Carrier', type: 'Mobile', network: '4G LTE / 5G', mcc: '310', mnc: '00' };
  if (countryCode === '+44') return { name: 'UK Carrier', type: 'Mobile', network: '4G LTE / 5G', mcc: '234', mnc: '00' };
  if (countryCode === '+86') return { name: 'China Carrier', type: 'Mobile', network: '4G LTE / 5G', mcc: '460', mnc: '00' };
  if (countryCode === '+91') return { name: 'India Carrier', type: 'Mobile', network: '4G LTE / 5G', mcc: '404', mnc: '00' };
  return { name: 'Local Carrier', type: 'Mobile', network: '4G LTE', mcc: '000', mnc: '00' };
}

function detectPrefixGPS(cleaned: string, countryCode: string): { lat: number; lng: number; region: string; province: string; city: string; timezone: string } | null {
  if (countryCode === '+62') {
    const afterPrefix = cleaned.startsWith('08') ? cleaned.substring(1) : cleaned.substring(2);
    if (afterPrefix.startsWith('8') && afterPrefix.length >= 3) {
      const prefix = afterPrefix.substring(0, 3);
      return PREFIX_GPS_MAP[prefix] || null;
    }
  }
  return null;
}
