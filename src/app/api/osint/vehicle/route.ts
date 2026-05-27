import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Indonesian vehicle plate format: One or two letters + space + 1-4 digits + space + 1-3 letters
// Examples: B 1234 AB, D 5678 XY, BK 123 CD, RI 1 ABC
const PLATE_REGEX = /^([A-Z]{1,3})\s*(\d{1,4})\s*([A-Z]{1,3})$/i;

// Indonesian region code mapping (first letter(s) of plate indicate region)
const REGION_MAP: Record<string, { region: string; province: string; description: string }> = {
  'A': { region: 'Banten', province: 'Banten', description: 'Tangerang, South Tangerang, Serang, Cilegon, Pandeglang' },
  'B': { region: 'DKI Jakarta', province: 'DKI Jakarta', description: 'Jakarta Pusat, Jakarta Utara, Jakarta Barat, Jakarta Selatan, Jakarta Timur' },
  'D': { region: 'Jawa Barat', province: 'Jawa Barat', description: 'Bandung, Cirebon, Bogor, Sukabumi, Garut, Tasikmalaya' },
  'E': { region: 'Jawa Barat', province: 'Jawa Barat', description: 'Cianjur, Purwakarta, Subang, Sumedang, Karawang, Majalengka, Kuningan, Indramayu' },
  'F': { region: 'Jawa Barat', province: 'Jawa Barat', description: 'Bekasi, Depok, Karawang (some areas)' },
  'G': { region: 'Jawa Barat', province: 'Jawa Barat', description: 'Ciamis, Pangandaran, Banjar' },
  'H': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Semarang, Salatiga, Kendal, Demak, Grobogan' },
  'K': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Pati, Kudus, Jepara, Rembang, Blora' },
  'L': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Surakarta/Solo, Boyolali, Klaten, Sukoharjo, Wonogiri, Karanganyar, Sragen' },
  'M': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Magelang, Temanggung, Wonosobo, Purworejo' },
  'N': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Kudus, Jepara, Pati (some overlapping)' },
  'P': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Pekalongan, Batang, Pemalang, Tegal, Brebes' },
  'R': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Banyumas, Cilacap, Purbalingga, Banjarnegara' },
  'S': { region: 'Jawa Tengah', province: 'Jawa Tengah', description: 'Surakarta area alternate' },
  'T': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Surabaya, Sidoarjo, Gresik' },
  'W': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Gresik, Lamongan, Tuban' },
  'AE': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Madiun, Ngawi, Magetan, Ponorogo, Pacitan' },
  'AG': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Kediri, Blitar, Trenggalek, Tulungagung, Nganjuk' },
  'BA': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Probolinggo, Pasuruan, Lumajang, Bondowoso, Situbondo, Jember, Banyuwangi' },
  'BB': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Pamekasan, Sumenep, Sampang, Bangkalan (Madura)' },
  'BD': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Malang, Batu, Kediri (some areas)' },
  'BE': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Jember alternate' },
  'BG': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Tulungagung, Blitar' },
  'BH': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Ponorogo, Magetan' },
  'BK': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Bojonegoro, Tuban' },
  'BL': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Kediri area alternate' },
  'BM': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Mojokerto, Jombang' },
  'BN': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Kediri alternate' },
  'BP': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Pasuruan alternate' },
  'CA': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Jember, Banyuwangi' },
  'CB': { region: 'Jawa Timur', province: 'Jawa Timur', description: 'Madura alternate' },
  'DA': { region: 'Kalimantan Selatan', province: 'Kalimantan Selatan', description: 'Banjarmasin, Banjarbaru, Hulu Sungai' },
  'DB': { region: 'Kalimantan Selatan', province: 'Kalimantan Selatan', description: 'Kotabaru, Tanah Bumbu' },
  'DC': { region: 'Kalimantan Selatan', province: 'Kalimantan Selatan', description: 'Tabalong, Balangan, Hulu Sungai Utara' },
  'KH': { region: 'Kalimantan Tengah', province: 'Kalimantan Tengah', description: 'Palangka Raya, Kapuas, Katingan' },
  'KI': { region: 'Kalimantan Timur', province: 'Kalimantan Timur', description: 'Samarinda, Balikpapan, Kutai' },
  'KT': { region: 'Kalimantan Timur', province: 'Kalimantan Timur', description: 'Bontang, Kutai Kartanegara' },
  'KB': { region: 'Kalimantan Barat', province: 'Kalimantan Barat', description: 'Pontianak, Sambas, Singkawang' },
  'KU': { region: 'Kalimantan Utara', province: 'Kalimantan Utara', description: 'Tarakan, Nunukan, Malinau' },
  'PA': { region: 'Sulawesi Utara', province: 'Sulawesi Utara', description: 'Manado, Minahasa, Bitung' },
  'PB': { region: 'Sulawesi Utara', province: 'Sulawesi Utara', description: 'Bolaang Mongondow' },
  'PC': { region: 'Sulawesi Utara', province: 'Sulawesi Utara', description: 'Kepulauan Sangihe, Talaud' },
  'PD': { region: 'Sulawesi Utara', province: 'Sulawesi Utara', description: 'Kepulauan Talaud' },
  'PE': { region: 'Gorontalo', province: 'Gorontalo', description: 'Gorontalo, Boalemo' },
  'PF': { region: 'Sulawesi Tengah', province: 'Sulawesi Tengah', description: 'Palu, Donggala, Parigi Moutong' },
  'PG': { region: 'Sulawesi Tengah', province: 'Sulawesi Tengah', description: 'Poso, Tojo Una-Una, Toli-Toli' },
  'PH': { region: 'Sulawesi Tengah', province: 'Sulawesi Tengah', description: 'Banggai, Morowali' },
  'PI': { region: 'Sulawesi Selatan', province: 'Sulawesi Selatan', description: 'Makassar, Gowa, Takalar, Jeneponto' },
  'PJ': { region: 'Sulawesi Selatan', province: 'Sulawesi Selatan', description: 'Pare-Pare, Pinrang, Sidenreng Rappang' },
  'PK': { region: 'Sulawesi Selatan', province: 'Sulawesi Selatan', description: 'Barru, Pangkep, Maros' },
  'PL': { region: 'Sulawesi Selatan', province: 'Sulawesi Selatan', description: 'Bone, Soppeng, Wajo' },
  'PM': { region: 'Sulawesi Selatan', province: 'Sulawesi Selatan', description: 'Luwu, North Luwu, East Luwu' },
  'PN': { region: 'Sulawesi Selatan', province: 'Sulawesi Selatan', description: 'Enrekang, Tana Toraja, North Toraja' },
  'PO': { region: 'Sulawesi Tenggara', province: 'Sulawesi Tenggara', description: 'Kendari, Konawe, Kolaka' },
  'PP': { region: 'Sulawesi Tenggara', province: 'Sulawesi Tenggara', description: 'Bau-Bau, Muna, Wakatobi' },
  'PQ': { region: 'Sulawesi Barat', province: 'Sulawesi Barat', description: 'Mamuju, Majene, Polewali Mandar' },
  'DD': { region: 'Bali', province: 'Bali', description: 'Denpasar, Badung, Gianyar, Tabanan' },
  'DE': { region: 'Bali', province: 'Bali', description: 'Karangasem, Klungkung, Bangli' },
  'DK': { region: 'Bali', province: 'Bali', description: 'Buleleng, Jembrana, Negara' },
  'EA': { region: 'NTB', province: 'Nusa Tenggara Barat', description: 'Mataram, Lombok Barat, Lombok Tengah' },
  'EB': { region: 'NTB', province: 'Nusa Tenggara Barat', description: 'Sumbawa, Bima, Dompu' },
  'ED': { region: 'NTT', province: 'Nusa Tenggara Timur', description: 'Kupang, Timor Tengah Selatan, Rote Ndao' },
  'EE': { region: 'NTT', province: 'Nusa Tenggara Timur', description: 'Ende, Sikka, Manggarai' },
  'EF': { region: 'NTT', province: 'Nusa Tenggara Timur', description: 'Flores Timur, Lembata, Alor' },
  'DH': { region: 'Maluku', province: 'Maluku', description: 'Ambon, Lease Islands' },
  'DG': { region: 'Maluku Tenggara', province: 'Maluku Tenggara', description: 'Tual, Kei Islands' },
  'DR': { region: 'Maluku Utara', province: 'Maluku Utara', description: 'Ternate, Tidore, Halmahera' },
  'PA2': { region: 'Papua', province: 'Papua', description: 'Jayapura, Sentani' },
  'PB2': { region: 'Papua', province: 'Papua', description: 'Biak, Numfor' },
  'RI': { region: 'Pemerintahan RI', province: 'Pemerintahan', description: 'Government official vehicle (Indonesia)' },
  'CD': { region: 'Korps Diplomatik', province: 'Diplomatic', description: 'Diplomatic corps vehicle' },
  'CC': { region: 'Konsulat', province: 'Consular', description: 'Consular vehicle' },
  'AB': { region: 'TNI AD', province: 'Military', description: 'Indonesian Army (TNI AD) vehicle' },
  'AD': { region: 'TNI AD', province: 'Military', description: 'Indonesian Army (TNI AD) vehicle' },
  'AL': { region: 'TNI AL', province: 'Military', description: 'Indonesian Navy (TNI AL) vehicle' },
  'AU': { region: 'TNI AU', province: 'Military', description: 'Indonesian Air Force (TNI AU) vehicle' },
  'Z': { region: 'Polri', province: 'Police', description: 'Indonesian National Police (Polri) vehicle' },
};

function validatePlate(plate: string): { valid: boolean; regionCode: string; region: string; province: string; description: string; normalized: string } {
  const trimmed = plate.trim().toUpperCase();

  // Normalize: ensure spaces between parts
  const normalizedPlate = trimmed.replace(/\s+/g, ' ');

  const match = normalizedPlate.match(PLATE_REGEX);

  if (!match) {
    return { valid: false, regionCode: '', region: '', province: '', description: '', normalized: normalizedPlate };
  }

  const regionCode = match[1].toUpperCase();

  // Look up region - try 2-letter first, then 1-letter
  const regionInfo = REGION_MAP[regionCode] || null;

  return {
    valid: true,
    regionCode,
    region: regionInfo?.region || 'Unknown Region',
    province: regionInfo?.province || 'Unknown Province',
    description: regionInfo?.description || '',
    normalized: normalizedPlate,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { plate } = await request.json();

    if (!plate) {
      return NextResponse.json(
        { success: false, error: 'Vehicle plate number is required' },
        { status: 400 }
      );
    }

    const validation = validatePlate(plate);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid Indonesian vehicle plate format. Expected format: B 1234 AB or D 5678 XY',
        },
        { status: 400 }
      );
    }

    const { regionCode, region, province, description, normalized } = validation;

    // Sequential web searches to avoid rate limiting
    const [
      registrationResults,
      crimeResults,
      dataLeakResults,
      vehicleInfoResults,
    ] = await sequentialWebSearch([
      { query: `"${normalized}" nomor polisi kendaraan registrasi STNK BPKB plat nomor Indonesia`, num: 5 },
      { query: `"${normalized}" plat nomor kejahatan crime accident stolen curi tilang public record pemilik`, num: 5 },
      { query: `"${normalized}" data leak breach exposed bocor personal data KTP identitas`, num: 5 },
      { query: `"${normalized}" OR "${regionCode}" plat nomor jenis kendaraan type merk model`, num: 5 },
    ], 800);

    // Parse search results into uniform format
    const parseResults = (results: unknown[]) => {
      return (results as Array<Record<string, string>>).map((r) => ({
        url: r.url || '',
        title: r.name || '',
        snippet: r.snippet || '',
        source: r.host_name || '',
      })).filter((r) => r.title || r.snippet);
    };

    const registrationData = parseResults(registrationResults);
    const crimeData = parseResults(crimeResults);
    const leakData = parseResults(dataLeakResults);
    const vehicleData = parseResults(vehicleInfoResults);
    const stnkData = registrationData;
    const publicRecordData = registrationData;

    // ====== PUBLIC RECORDS ======
    const publicRecords = publicRecordData.slice(0, 10).map((r) => ({
      title: r.title,
      snippet: r.snippet,
      url: r.url,
      source: r.source,
      relevance: 'high' as const,
    }));

    // ====== CRIME / ACCIDENT REPORTS ======
    const crimeKeywords = ['kejahatan', 'crime', 'accident', 'stolen', 'curi', 'tilang', 'pelanggaran', 'violations', 'wanted', 'pencurian', 'rampok', 'penipuan', 'fraud', 'hit and run', 'tabrak lari'];
    const crimeReports = crimeData
      .filter((r) => crimeKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Incident Report';

        if (text.includes('stolen') || text.includes('curi') || text.includes('pencurian')) {
          severity = 'critical';
          type = 'Vehicle Theft';
        } else if (text.includes('kejahatan') || text.includes('crime') || text.includes('rampok')) {
          severity = 'critical';
          type = 'Criminal Activity';
        } else if (text.includes('penipuan') || text.includes('fraud')) {
          severity = 'high';
          type = 'Fraud Report';
        } else if (text.includes('tilang') || text.includes('pelanggaran')) {
          severity = 'medium';
          type = 'Traffic Violation';
        } else if (text.includes('accident') || text.includes('tabrak')) {
          severity = 'medium';
          type = 'Traffic Accident';
        }

        return {
          type,
          severity,
          source: r.source,
          description: r.snippet.substring(0, 250),
          url: r.url,
        };
      });

    // ====== DATA LEAK DETECTION ======
    const leakKeywords = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'nik', 'password', 'data bocor', 'hacked', 'compromised', 'personal data'];
    const dataLeaks = leakData
      .filter((r) => leakKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';

        if (text.includes('ktp') || text.includes('nik') || text.includes('identitas') || text.includes('identity')) {
          severity = 'critical';
          type = 'Identity Document Leak';
        } else if (text.includes('password') || text.includes('credential')) {
          severity = 'critical';
          type = 'Credential Leak';
        } else if (text.includes('breach') || text.includes('bocor')) {
          severity = 'high';
          type = 'Data Breach';
        } else if (text.includes('personal data') || text.includes('data pribadi')) {
          severity = 'high';
          type = 'Personal Data Exposure';
        } else if (text.includes('exposed') || text.includes('exposure')) {
          severity = 'medium';
          type = 'Data Exposure';
        }

        return {
          type,
          severity,
          source: r.source,
          description: r.snippet.substring(0, 250),
          url: r.url,
        };
      });

    // ====== VEHICLE TYPE DETECTION ======
    const vehicleText = vehicleData.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    let vehicleType = 'Unknown';
    if (vehicleText.includes('motor') || vehicleText.includes('sepeda motor')) vehicleType = 'Motorcycle';
    else if (vehicleText.includes('sedan') || vehicleText.includes('mobil')) vehicleType = 'Car/Sedan';
    else if (vehicleText.includes('suv')) vehicleType = 'SUV';
    else if (vehicleText.includes('pick up') || vehicleText.includes('pickup')) vehicleType = 'Pickup Truck';
    else if (vehicleText.includes('bus')) vehicleType = 'Bus';
    else if (vehicleText.includes('truk') || vehicleText.includes('truck')) vehicleType = 'Truck';
    else if (vehicleText.includes('minibus')) vehicleType = 'Minibus';

    // Combine all search results
    const searchResults = [
      ...registrationData.slice(0, 4).map((r) => ({ ...r, category: 'Registration' })),
      ...stnkData.slice(0, 3).map((r) => ({ ...r, category: 'STNK Data' })),
      ...crimeData.slice(0, 3).map((r) => ({ ...r, category: 'Crime/Accident' })),
      ...vehicleData.slice(0, 3).map((r) => ({ ...r, category: 'Vehicle Info' })),
    ];

    // Comprehensive AI analysis
    const allContext = [
      ...registrationData.slice(0, 4).map((r) => `[REGISTRATION] ${r.title}: ${r.snippet}`),
      ...stnkData.slice(0, 3).map((r) => `[STNK] ${r.title}: ${r.snippet}`),
      ...publicRecordData.slice(0, 3).map((r) => `[PUBLIC-RECORD] ${r.title}: ${r.snippet}`),
      ...crimeData.slice(0, 3).map((r) => `[CRIME] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 3).map((r) => `[LEAK] ${r.title}: ${r.snippet}`),
      ...vehicleData.slice(0, 3).map((r) => `[VEHICLE] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for Indonesian vehicle plate intelligence. Report with: ## 📋 PLATE NUMBER ANALYSIS ## 🗺️ REGIONAL INTELLIGENCE ## 🚗 VEHICLE IDENTIFICATION ## 🔍 PUBLIC RECORDS ## 🚨 CRIME & SAFETY ## ⚠️ DATA LEAK & BREACH ## 🔐 SECURITY ASSESSMENT ## 🎯 RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `Plate: ${normalized} | Region: ${regionCode} (${region}) | Province: ${province} | Type: ${vehicleType} | Crimes: ${crimeReports.length} | Leaks: ${dataLeaks.length}

${allContext.substring(0, 1500)}`
        )
      : 'No intelligence data available for this vehicle plate.';

    return NextResponse.json({
      success: true,
      plate: normalized,
      regionCode,
      region,
      province,
      regionDescription: description,
      vehicleType,
      searchResults,
      publicRecords,
      crimeReports,
      crimeCount: crimeReports.length,
      dataLeaks,
      leakCount: dataLeaks.length,
      stnkResults: stnkData.slice(0, 5),
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
