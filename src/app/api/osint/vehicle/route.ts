import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis, sequentialWebSearch } from '@/lib/zai';

// Indonesian vehicle plate format: One or two letters + space + 1-4 digits + space + 1-3 letters
// Examples: B 1234 AB, D 5678 XY, BK 123 CD, RI 1 ABC
const PLATE_REGEX = /^([A-Z]{1,3})\s*(\d{1,4})\s*([A-Z]{1,3})$/i;

// Special plate prefixes for government, police, military, diplomatic
const SPECIAL_PREFIXES: Record<string, { category: string; description: string }> = {
  'RI': { category: 'government', description: 'Government official vehicle (Republik Indonesia)' },
  'CD': { category: 'diplomatic', description: 'Korps Diplomatik - Diplomatic corps vehicle' },
  'CC': { category: 'consular', description: 'Konsulat - Consular vehicle' },
  'AB': { category: 'military', description: 'TNI AD - Indonesian Army vehicle' },
  'AD': { category: 'military', description: 'TNI AD - Indonesian Army vehicle' },
  'AL': { category: 'military', description: 'TNI AL - Indonesian Navy vehicle' },
  'AU': { category: 'military', description: 'TNI AU - Indonesian Air Force vehicle' },
  'Z':  { category: 'police', description: 'Polri - Indonesian National Police vehicle' },
};

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

/**
 * Detect vehicle category based on plate patterns.
 * - Cars (mobil): typically 1-4 digits in the middle, 1-3 trailing letters
 * - Motorcycles (motor): commonly have 1-2 digits in the middle and specific suffix patterns
 * - Special plates (government, military, police, diplomatic) override category
 */
function detectVehicleCategory(
  regionCode: string,
  middleDigits: string,
  trailingLetters: string
): 'mobil' | 'motor' | 'unknown' {
  // Check special plates first
  const special = SPECIAL_PREFIXES[regionCode];
  if (special) {
    // Government/police/military/diplomatic plates can be either mobil or motor
    // but are predominantly mobil for official vehicles
    return 'mobil';
  }

  const digitCount = middleDigits.length;
  const suffixCount = trailingLetters.length;

  // Heuristic based on Indonesian plate conventions:
  // - 3-4 digits with 2-3 suffix letters: very likely a car
  // - 1-2 digits with 1-2 suffix letters: more likely motorcycle
  // - 4 digits: almost certainly a car (motorcycle plates rarely go to 4 digits)
  if (digitCount >= 4) return 'mobil';
  if (digitCount === 3) {
    // 3 digits with 3 suffix letters = typically car in dense areas
    if (suffixCount >= 2) return 'mobil';
    return 'mobil'; // 3 digits still more commonly car
  }
  if (digitCount === 2) {
    // 2 digits is ambiguous — could be either. In major cities more likely motor.
    // We'll default to 'motor' for 1-2 digit plates as that's the more common motorcycle pattern
    if (suffixCount <= 2) return 'motor';
    return 'mobil';
  }
  if (digitCount === 1) {
    // Single digit — usually special or motorcycle
    return 'motor';
  }

  return 'unknown';
}

/**
 * Detect if plate is a special/dinas plate
 */
function detectSpecialPlate(regionCode: string): { isSpecial: boolean; specialType: string; specialDescription: string } {
  const special = SPECIAL_PREFIXES[regionCode];
  if (special) {
    return { isSpecial: true, specialType: special.category, specialDescription: special.description };
  }
  return { isSpecial: false, specialType: '', specialDescription: '' };
}

interface ValidationResult {
  valid: boolean;
  regionCode: string;
  region: string;
  province: string;
  description: string;
  normalized: string;
  vehicleCategory: 'mobil' | 'motor' | 'unknown';
  specialPlate: { isSpecial: boolean; specialType: string; specialDescription: string };
  middleDigits: string;
  trailingLetters: string;
}

function validatePlate(plate: string): ValidationResult {
  const trimmed = plate.trim().toUpperCase();

  // Normalize: ensure spaces between parts
  const normalizedPlate = trimmed.replace(/\s+/g, ' ');

  const match = normalizedPlate.match(PLATE_REGEX);

  if (!match) {
    return {
      valid: false,
      regionCode: '',
      region: '',
      province: '',
      description: '',
      normalized: normalizedPlate,
      vehicleCategory: 'unknown',
      specialPlate: { isSpecial: false, specialType: '', specialDescription: '' },
      middleDigits: '',
      trailingLetters: '',
    };
  }

  const regionCode = match[1].toUpperCase();
  const middleDigits = match[2];
  const trailingLetters = match[3].toUpperCase();

  // Look up region - try 2-letter first, then 1-letter
  const regionInfo = REGION_MAP[regionCode] || null;

  const vehicleCategory = detectVehicleCategory(regionCode, middleDigits, trailingLetters);
  const specialPlate = detectSpecialPlate(regionCode);

  return {
    valid: true,
    regionCode,
    region: regionInfo?.region || 'Unknown Region',
    province: regionInfo?.province || 'Unknown Province',
    description: regionInfo?.description || '',
    normalized: normalizedPlate,
    vehicleCategory,
    specialPlate,
    middleDigits,
    trailingLetters,
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

    const {
      regionCode,
      region,
      province,
      description,
      normalized,
      vehicleCategory,
      specialPlate,
      middleDigits,
      trailingLetters,
    } = validation;

    // Vehicle category label for search context
    const categoryLabel = vehicleCategory === 'mobil' ? 'mobil' : vehicleCategory === 'motor' ? 'sepeda motor' : 'kendaraan';
    const categoryLabelEN = vehicleCategory === 'mobil' ? 'car' : vehicleCategory === 'motor' ? 'motorcycle' : 'vehicle';

    // ====== COMPREHENSIVE WEB SEARCHES ======
    // Sequential web searches to avoid rate limiting — 8 targeted queries
    const [
      registrationResults,
      stnkResults,
      taxResults,
      bpkbResults,
      stolenResults,
      accidentResults,
      crimeResults,
      dataLeakResults,
      vehicleInfoResults,
      rentalResults,
    ] = await sequentialWebSearch([
      // 1. Vehicle registration check
      {
        query: `"${normalized}" cek registrasi kendaraan nomor polisi Indonesia verifikasi`,
        num: 5,
      },
      // 2. STNK status check
      {
        query: `"${normalized}" STNK status cek masa berlaku surat tanda nomor kendaraan ${regionCode}`,
        num: 5,
      },
      // 3. Tax/pajak kendaraan info
      {
        query: `"${normalized}" pajak kendaraan PKB cek pajak plat ${regionCode} ${categoryLabel}`,
        num: 5,
      },
      // 4. BPKB info
      {
        query: `"${normalized}" BPKB bukti kepemilikan kendaraan ${categoryLabel} ${regionCode}`,
        num: 5,
      },
      // 5. Stolen vehicle databases
      {
        query: `"${normalized}" kendaraan hilang motor hilang mobil dicuri stolen vehicle ${regionCode} laporan kepolisian`,
        num: 5,
      },
      // 6. Accident reports
      {
        query: `"${normalized}" kecelakaan accident ${categoryLabel} lalu lintas tabrak ${regionCode}`,
        num: 5,
      },
      // 7. Crime / violations
      {
        query: `"${normalized}" kejahatan crime tilang pelanggaran penipuan fraud wanted dugaan ${categoryLabel}`,
        num: 5,
      },
      // 8. Data leaks
      {
        query: `"${normalized}" data leak breach exposed bocor personal data KTP NIK identitas pemilik`,
        num: 5,
      },
      // 9. Vehicle type & specification
      {
        query: `"${normalized}" OR "${regionCode} ${middleDigits}" plat nomor jenis kendaraan ${categoryLabel} merk model spesifikasi CC`,
        num: 5,
      },
      // 10. Rental vehicle check
      {
        query: `"${normalized}" rental sewa ${categoryLabel} rental mobil rental motor ${regionCode}`,
        num: 5,
      },
    ], 600);

    // ====== PARSE HELPERS ======
    const parseResults = (results: unknown[]) => {
      return (results as Array<Record<string, string>>)
        .map((r) => ({
          url: r.url || '',
          title: r.name || '',
          snippet: r.snippet || '',
          source: r.host_name || '',
        }))
        .filter((r) => r.title || r.snippet);
    };

    const registrationData = parseResults(registrationResults);
    const stnkData = parseResults(stnkResults);
    const taxData = parseResults(taxResults);
    const bpkbData = parseResults(bpkbResults);
    const stolenData = parseResults(stolenResults);
    const accidentData = parseResults(accidentResults);
    const crimeData = parseResults(crimeResults);
    const leakData = parseResults(dataLeakResults);
    const vehicleData = parseResults(vehicleInfoResults);
    const rentalData = parseResults(rentalResults);

    // ====== REGISTRATION STATUS ======
    const regText = registrationData.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    let registrationStatus = 'Unknown';
    if (regText.includes('aktif') || regText.includes('active') || regText.includes('terdaftar') || regText.includes('registered')) {
      registrationStatus = 'Active/Registered';
    } else if (regText.includes('tidak aktif') || regText.includes('inactive') || regText.includes('expired') || regText.includes('kadaluarsa')) {
      registrationStatus = 'Inactive/Expired';
    } else if (regText.includes('diblokir') || regText.includes('blocked')) {
      registrationStatus = 'Blocked';
    }

    // ====== TAX STATUS ======
    const taxText = taxData.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    let taxStatus = 'Unknown';
    if (taxText.includes('lunas') || taxText.includes('paid') || taxText.includes('bayar')) {
      taxStatus = 'Paid/Lunas';
    } else if (taxText.includes('belum bayar') || taxText.includes('unpaid') || taxText.includes('tunggakan') || taxText.includes('arrears')) {
      taxStatus = 'Unpaid/Tunggakan';
    } else if (taxText.includes('kadaluarsa') || taxText.includes('expired') || taxText.includes('jatuh tempo')) {
      taxStatus = 'Expired/Jatuh Tempo';
    }

    // ====== STOLEN REPORTS ======
    const stolenKeywords = ['hilang', 'stolen', 'curi', 'pencurian', 'dicuri', 'lost', 'missing', 'kehilangan', 'lapor hilang'];
    const stolenReports = stolenData
      .filter((r) => stolenKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'critical';

        if (text.includes('dicuri') || text.includes('pencurian') || text.includes('stolen')) {
          severity = 'critical';
        } else if (text.includes('hilang') || text.includes('kehilangan') || text.includes('missing')) {
          severity = 'high';
        }

        return {
          type: 'Vehicle Theft/Theft Report' as const,
          severity,
          source: r.source,
          description: r.snippet.substring(0, 300),
          url: r.url,
          date: '',
        };
      });

    // ====== ACCIDENT REPORTS ======
    const accidentKeywords = ['kecelakaan', 'accident', 'tabrak', 'tabrakan', 'crash', 'collision', 'laka lantas', 'lalu lintas', 'kejadian lalu lintas'];
    const accidentReports = accidentData
      .filter((r) => accidentKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';

        if (text.includes('meninggal') || text.includes('tewas') || text.includes('fatal') || text.includes('killed')) {
          severity = 'critical';
        } else if (text.includes('luka berat') || text.includes('serious injury') || text.includes('critical')) {
          severity = 'high';
        } else if (text.includes('luka ringan') || text.includes('minor')) {
          severity = 'low';
        }

        return {
          type: 'Traffic Accident' as const,
          severity,
          source: r.source,
          description: r.snippet.substring(0, 300),
          url: r.url,
          date: '',
        };
      });

    // ====== CRIME / VIOLATION REPORTS ======
    const crimeKeywords = ['kejahatan', 'crime', 'tilang', 'pelanggaran', 'penipuan', 'fraud', 'wanted', 'rampok', 'dugaan', 'narkoba', 'drug', 'pencurian', 'curi'];
    const crimeReports = crimeData
      .filter((r) => crimeKeywords.some((k) => `${r.title} ${r.snippet}`.toLowerCase().includes(k)))
      .map((r) => {
        const text = `${r.title} ${r.snippet}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Incident Report';

        if (text.includes('pencurian') || text.includes('curi') || text.includes('stolen')) {
          severity = 'critical';
          type = 'Vehicle Theft';
        } else if (text.includes('kejahatan') || text.includes('crime') || text.includes('rampok')) {
          severity = 'critical';
          type = 'Criminal Activity';
        } else if (text.includes('narkoba') || text.includes('drug') || text.includes('narcotics')) {
          severity = 'critical';
          type = 'Drug-Related Offense';
        } else if (text.includes('penipuan') || text.includes('fraud') || text.includes('scam')) {
          severity = 'high';
          type = 'Fraud Report';
        } else if (text.includes('tilang') || text.includes('pelanggaran')) {
          severity = 'medium';
          type = 'Traffic Violation';
        } else if (text.includes('dugaan') || text.includes('suspected')) {
          severity = 'high';
          type = 'Suspected Activity';
        }

        return {
          type,
          severity,
          source: r.source,
          description: r.snippet.substring(0, 300),
          url: r.url,
        };
      });

    // ====== DATA LEAK DETECTION ======
    const leakKeywords = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'nik', 'password', 'data bocor', 'hacked', 'compromised', 'personal data', 'data pribadi'];
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
          description: r.snippet.substring(0, 300),
          url: r.url,
        };
      });

    // ====== VEHICLE TYPE DETECTION ======
    const vehicleText = vehicleData.map((r) => `${r.title} ${r.snippet}`).join(' ').toLowerCase();
    let vehicleType = 'Unknown';
    if (vehicleText.includes('sepeda motor') || (vehicleText.includes('motor') && !vehicleText.includes('mobil'))) vehicleType = 'Motorcycle';
    else if (vehicleText.includes('sedan') || vehicleText.includes('mobil')) vehicleType = 'Car/Sedan';
    else if (vehicleText.includes('suv')) vehicleType = 'SUV';
    else if (vehicleText.includes('pick up') || vehicleText.includes('pickup')) vehicleType = 'Pickup Truck';
    else if (vehicleText.includes('bus')) vehicleType = 'Bus';
    else if (vehicleText.includes('truk') || vehicleText.includes('truck')) vehicleType = 'Truck';
    else if (vehicleText.includes('minibus')) vehicleType = 'Minibus';
    else if (vehicleText.includes('mpv')) vehicleType = 'MPV';
    else if (vehicleText.includes('hatchback')) vehicleType = 'Hatchback';

    // ====== VEHICLE INFO EXTRACTION ======
    const extractPattern = (text: string, patterns: RegExp[]): string => {
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) return match[1] || match[0];
      }
      return '';
    };

    const allVehicleText = vehicleData.map((r) => `${r.title} ${r.snippet}`).join(' ');

    const vehicleInfo = {
      brand: extractPattern(allVehicleText, [
        /(?:merk|brand|made)[:\s]+([A-Za-z]+)/i,
        /(?:Honda|Toyota|Yamaha|Suzuki|Kawasaki|Mitsubishi|Daihatsu|BMW|Mercedes|Hyundai|Mazda|Nissan|VW|Kia)/i,
      ]),
      model: extractPattern(allVehicleText, [
        /(?:tipe|model|type)[:\s]+([A-Za-z0-9\- ]+)/i,
      ]),
      year: extractPattern(allVehicleText, [
        /(?:tahun|year)[:\s]+(20\d{2}|19\d{2})/i,
      ]),
      color: extractPattern(allVehicleText, [
        /(?:warna|color)[:\s]+([A-Za-z]+)/i,
      ]),
      fuelType: (() => {
        if (allVehicleText.toLowerCase().includes('bensin') || allVehicleText.toLowerCase().includes('gasoline')) return 'Bensin/Gasoline';
        if (allVehicleText.toLowerCase().includes('diesel') || allVehicleText.toLowerCase().includes('solar')) return 'Diesel/Solar';
        if (allVehicleText.toLowerCase().includes('listrik') || allVehicleText.toLowerCase().includes('electric')) return 'Listrik/Electric';
        if (allVehicleText.toLowerCase().includes('hybrid')) return 'Hybrid';
        return '';
      })(),
      cc: extractPattern(allVehicleText, [
        /(\d{2,5})\s*cc/i,
        /(?:cc|kapasitas)[:\s]+(\d{2,5})/i,
      ]),
      ownerType: (() => {
        const lower = allVehicleText.toLowerCase();
        if (lower.includes('pribadi') || lower.includes('personal') || lower.includes('private')) return 'Pribadi/Private';
        if (lower.includes('perusahaan') || lower.includes('company') || lower.includes('corporate')) return 'Perusahaan/Company';
        if (lower.includes('dinas') || lower.includes('official')) return 'Dinas/Official';
        if (lower.includes('rental') || lower.includes('sewa')) return 'Rental/Sewa';
        return '';
      })(),
    };

    // ====== PUBLIC RECORDS ======
    const publicRecords = [
      ...registrationData.slice(0, 4).map((r) => ({ ...r, relevance: 'high' as const, category: 'Registration' })),
      ...taxData.slice(0, 3).map((r) => ({ ...r, relevance: 'high' as const, category: 'Tax/Pajak' })),
      ...stnkData.slice(0, 3).map((r) => ({ ...r, relevance: 'high' as const, category: 'STNK' })),
    ].filter((r) => r.title || r.snippet);

    // ====== COMBINED SEARCH RESULTS ======
    const searchResults = [
      ...registrationData.slice(0, 3).map((r) => ({ ...r, category: 'Registration' })),
      ...stnkData.slice(0, 3).map((r) => ({ ...r, category: 'STNK Data' })),
      ...taxData.slice(0, 2).map((r) => ({ ...r, category: 'Tax/Pajak' })),
      ...bpkbData.slice(0, 2).map((r) => ({ ...r, category: 'BPKB Data' })),
      ...stolenData.slice(0, 2).map((r) => ({ ...r, category: 'Stolen/Missing' })),
      ...accidentData.slice(0, 2).map((r) => ({ ...r, category: 'Accident' })),
      ...crimeData.slice(0, 2).map((r) => ({ ...r, category: 'Crime/Violation' })),
      ...vehicleData.slice(0, 2).map((r) => ({ ...r, category: 'Vehicle Info' })),
      ...rentalData.slice(0, 2).map((r) => ({ ...r, category: 'Rental' })),
    ];

    // ====== COMPREHENSIVE AI ANALYSIS ======
    const allContext = [
      ...registrationData.slice(0, 3).map((r) => `[REGISTRATION] ${r.title}: ${r.snippet}`),
      ...stnkData.slice(0, 2).map((r) => `[STNK] ${r.title}: ${r.snippet}`),
      ...taxData.slice(0, 2).map((r) => `[TAX/PAJAK] ${r.title}: ${r.snippet}`),
      ...bpkbData.slice(0, 2).map((r) => `[BPKB] ${r.title}: ${r.snippet}`),
      ...stolenData.slice(0, 2).map((r) => `[STOLEN/MISSING] ${r.title}: ${r.snippet}`),
      ...accidentData.slice(0, 2).map((r) => `[ACCIDENT] ${r.title}: ${r.snippet}`),
      ...crimeData.slice(0, 2).map((r) => `[CRIME] ${r.title}: ${r.snippet}`),
      ...leakData.slice(0, 2).map((r) => `[DATA-LEAK] ${r.title}: ${r.snippet}`),
      ...vehicleData.slice(0, 2).map((r) => `[VEHICLE-INFO] ${r.title}: ${r.snippet}`),
      ...rentalData.slice(0, 2).map((r) => `[RENTAL] ${r.title}: ${r.snippet}`),
    ].join('\n\n');

    const specialPlateContext = specialPlate.isSpecial
      ? `\n⚠️ SPECIAL PLATE DETECTED: ${specialPlate.specialDescription} (${specialPlate.specialType})`
      : '';

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `You are an expert OSINT analyst specializing in Indonesian vehicle plate intelligence for both cars (mobil) and motorcycles (motor). Provide a comprehensive analysis report with these sections:

## 📋 PLATE NUMBER ANALYSIS
Analyze the plate format, validity, and structure. State if it's a mobil (car) or motor (motorcycle) plate.

## 🗺️ REGIONAL INTELLIGENCE
Detail the region, province, and key cities associated with this plate code.

## 🚗 VEHICLE IDENTIFICATION
Identify the vehicle type (mobil/motor), brand, model, CC, and specifications if available.

## 📄 REGISTRATION & STNK STATUS
Registration status, STNK validity, and BPKB ownership data.

## 💰 TAX & FINANCIAL STATUS
PKB (Pajak Kendaraan Bermotor) status, payment info, and any arrears.

## 🚨 CRIME & SAFETY REPORTS
Any criminal activity, theft reports, fraud, traffic violations, or wanted status.

## 🚫 STOLEN VEHICLE CHECK
Check for stolen vehicle reports, missing vehicle databases, and police reports.

## 🔥 ACCIDENT REPORTS
Traffic accidents, crash reports, and incident history.

## 🏢 RENTAL VEHICLE CHECK
Whether the vehicle appears in rental databases or is associated with rental companies.

## ⚠️ DATA LEAK & BREACH
Personal data exposure, identity leaks, or credential compromises related to this plate.

## 🔐 SECURITY ASSESSMENT
Overall risk level (LOW/MEDIUM/HIGH/CRITICAL) with reasoning.

## 🎯 RECOMMENDATIONS
Actionable next steps for the investigator.

Be concise. Keep each section to 2-3 lines. Focus on factual findings from the data provided.`,
          `Plate: ${normalized} | Region Code: ${regionCode} (${region}) | Province: ${province} | Vehicle Category: ${vehicleCategory} (${categoryLabelEN}) | Type: ${vehicleType} | Middle Digits: ${middleDigits} | Suffix: ${trailingLetters} | Registration: ${registrationStatus} | Tax: ${taxStatus} | Crimes: ${crimeReports.length} | Stolen Reports: ${stolenReports.length} | Accidents: ${accidentReports.length} | Leaks: ${dataLeaks.length}${specialPlateContext}

Vehicle Info: ${JSON.stringify(vehicleInfo)}

${allContext.substring(0, 2500)}`
        )
      : 'No intelligence data available for this vehicle plate.';

    // ====== BUILD COMPREHENSIVE RESPONSE ======
    return NextResponse.json({
      success: true,

      // Core plate info
      plate: normalized,
      regionCode,
      region,
      province,
      regionDescription: description,

      // Vehicle type & category
      vehicleType,
      vehicleCategory,

      // Special plate detection
      specialPlate: specialPlate.isSpecial
        ? { detected: true, type: specialPlate.specialType, description: specialPlate.specialDescription }
        : { detected: false, type: null, description: null },

      // Registration & legal status
      registrationStatus,
      taxStatus,

      // Detailed search results by category
      stnkData: stnkData.slice(0, 5),
      bpkbData: bpkbData.slice(0, 5),
      taxData: taxData.slice(0, 5),

      // Crime & safety
      crimeReports,
      crimeCount: crimeReports.length,
      stolenReports,
      stolenCount: stolenReports.length,
      accidentReports,
      accidentCount: accidentReports.length,

      // Data security
      dataLeaks,
      leakCount: dataLeaks.length,

      // Public records
      publicRecords,

      // Vehicle specifications
      vehicleInfo,

      // Rental check
      rentalData: rentalData.slice(0, 5),
      rentalIndicated: rentalData.some((r) =>
        `${r.title} ${r.snippet}`.toLowerCase().includes('rental') ||
        `${r.title} ${r.snippet}`.toLowerCase().includes('sewa')
      ),

      // Combined search results
      searchResults,

      // AI comprehensive analysis
      aiAnalysis,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
