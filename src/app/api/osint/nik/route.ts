import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

// NIK (Nomor Induk Kependudukan) structure:
// Digits 1-6: Birth date code (DDMMYY, females: DD+40)
// Digits 7-12: Area code (Province + City/District + Subdistrict)
// Digits 13-16: Sequential registration number (last digit odd=male, even=female)
// KK Number: First 12 digits of NIK + "0000"

interface NIKDecoded {
  nik: string;
  birthDate: string;
  birthDay: number;
  birthMonth: number;
  birthYear: number;
  gender: 'Male' | 'Female';
  areaCode: string;
  province: string;
  city: string;
  subdistrict: string;
  kkNumber: string;
  nikValid: boolean;
  validationNotes: string[];
}

function validateAndDecodeNIK(nik: string): NIKDecoded {
  const validationNotes: string[] = [];
  let nikValid = true;

  // Must be exactly 16 digits
  if (!/^\d{16}$/.test(nik)) {
    return {
      nik,
      birthDate: '',
      birthDay: 0,
      birthMonth: 0,
      birthYear: 0,
      gender: 'Male',
      areaCode: '',
      province: '',
      city: '',
      subdistrict: '',
      kkNumber: '',
      nikValid: false,
      validationNotes: ['NIK must be exactly 16 digits'],
    };
  }

  // Extract birth date code (digits 1-6)
  const birthCode = nik.substring(0, 6);
  let birthDay = parseInt(birthCode.substring(0, 2), 10);
  const birthMonth = parseInt(birthCode.substring(2, 4), 10);
  const birthYearRaw = parseInt(birthCode.substring(4, 6), 10);

  // Determine gender: if day > 40, it's a female (actual day = day - 40)
  let gender: 'Male' | 'Female' = 'Male';
  if (birthDay > 40) {
    gender = 'Female';
    birthDay -= 40;
  }

  // Validate month
  if (birthMonth < 1 || birthMonth > 12) {
    nikValid = false;
    validationNotes.push(`Invalid birth month: ${birthMonth}`);
  }

  // Validate day
  const daysInMonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (birthMonth >= 1 && birthMonth <= 12 && (birthDay < 1 || birthDay > daysInMonth[birthMonth])) {
    nikValid = false;
    validationNotes.push(`Invalid birth day: ${birthDay} for month ${birthMonth}`);
  }

  // Determine century for 2-digit year
  const currentYear = new Date().getFullYear();
  const currentCentury = Math.floor(currentYear / 100) * 100;
  let birthYear = currentCentury + birthYearRaw;
  if (birthYear > currentYear) {
    birthYear -= 100;
  }

  // Validate gender digit (digit 16, last digit of sequential number)
  const sequentialStr = nik.substring(12, 16);
  const lastDigit = parseInt(sequentialStr.substring(3, 4), 10);
  const genderFromLastDigit: 'Male' | 'Female' = lastDigit % 2 === 1 ? 'Male' : 'Female';

  if (genderFromLastDigit !== gender) {
    validationNotes.push(
      `Gender mismatch: birth code indicates ${gender} (day ${birthCode.substring(0, 2)}), ` +
      `but last sequential digit (${lastDigit}) indicates ${genderFromLastDigit}. ` +
      `Using birth code as primary indicator.`
    );
  }

  // Area code (digits 7-12)
  const areaCode = nik.substring(6, 12);

  // KK Number: first 12 digits + "0000"
  const kkNumber = nik.substring(0, 12) + '0000';

  // Format birth date
  const birthDateStr = `${String(birthDay).padStart(2, '0')}-${String(birthMonth).padStart(2, '0')}-${birthYear}`;

  if (nikValid && validationNotes.length === 0) {
    validationNotes.push('NIK structure appears valid');
  }

  return {
    nik,
    birthDate: birthDateStr,
    birthDay,
    birthMonth,
    birthYear,
    gender,
    areaCode,
    province: '',
    city: '',
    subdistrict: '',
    kkNumber,
    nikValid,
    validationNotes,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { nik } = await request.json();

    if (!nik) {
      return NextResponse.json(
        { success: false, error: 'NIK (Nomor Induk Kependudukan) is required' },
        { status: 400 }
      );
    }

    // Clean the NIK - remove spaces and dashes
    const cleanedNIK = String(nik).replace(/[\s\-]/g, '');

    // Validate and decode NIK structure
    const decoded = validateAndDecodeNIK(cleanedNIK);

    if (!decoded.nikValid && !/^\d{16}$/.test(cleanedNIK)) {
      return NextResponse.json(
        { success: false, error: 'NIK must be exactly 16 digits', decoded },
        { status: 400 }
      );
    }

    // Sequential web searches to avoid rate limiting
    const areaResults = await safeWebSearch(
      `"kode wilayah ${decoded.areaCode}" provinsi kota kecamatan Indonesia NIK`,
      5
    );

    // 2. Search for the NIK number to find any public data
    const publicResults = await safeWebSearch(
      `"${cleanedNIK}" data public record Indonesia breach leak KTP identitas`,
      5
    );

    // 3. Search for KK number related data
    const kkResults = await safeWebSearch(
      `"${decoded.kkNumber}" kartu keluarga data`,
      5
    );

    const leakResults = publicResults;
    const areaInfo = (areaResults as Array<Record<string, string>>).map((r) => ({
      title: r.name || '',
      snippet: r.snippet || '',
      url: r.url || '',
      domain: r.host_name || '',
    }));

    // Try to extract province/city/subdistrict from area search results
    const areaText = (areaResults as Array<Record<string, string>>)
      .map((r) => `${r.name ?? ''} ${r.snippet ?? ''}`)
      .join(' ')
      .toLowerCase();

    // Province detection patterns from search results
    const provincePattern = /provinsi\s+([a-z\s]+?)(?:[\.,;]|\s+kota|\s+kabupaten|$)/i;
    const cityPattern = /kota\s+([a-z\s]+?)(?:[\.,;]|\s+provinsi|\s+kecamatan|$)/i;
    const kabupatenPattern = /kabupaten\s+([a-z\s]+?)(?:[\.,;]|\s+provinsi|\s+kecamatan|$)/i;
    const kecamatanPattern = /kecamatan\s+([a-z\s]+?)(?:[\.,;]|\s+kota|\s+kabupaten|\s+provinsi|$)/i;

    const provinceMatch = areaText.match(provincePattern);
    const cityMatch = areaText.match(cityPattern);
    const kabupatenMatch = areaText.match(kabupatenPattern);
    const kecamatanMatch = areaText.match(kecamatanPattern);

    if (provinceMatch) decoded.province = provinceMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    if (cityMatch) decoded.city = cityMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    else if (kabupatenMatch) decoded.city = 'Kab. ' + kabupatenMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    if (kecamatanMatch) decoded.subdistrict = kecamatanMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());

    // Public data from NIK search
    const publicData = (publicResults as Array<Record<string, string>>).map((r) => ({
      title: r.name || '',
      snippet: r.snippet || '',
      url: r.url || '',
      domain: r.host_name || '',
    }));

    // Data leak detection with severity classification
    const leakKeywords = ['leak', 'breach', 'exposed', 'ktp', 'identitas', 'password', 'data bocor', 'hacked', 'compromised', 'dumped', 'paste', 'credential', 'dumper'];
    const dataLeaks = (leakResults as Array<Record<string, string>>)
      .filter((r) =>
        leakKeywords.some((k) =>
          `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase().includes(k)
        )
      )
      .map((r) => {
        const text = `${r.name ?? ''} ${r.snippet ?? ''}`.toLowerCase();
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        let type = 'Data Exposure';

        if (text.includes('ktp') || text.includes('identitas') || text.includes('nik') || text.includes('identity')) {
          severity = 'critical';
          type = 'Identity Document Leak';
        } else if (text.includes('password') || text.includes('credential')) {
          severity = 'critical';
          type = 'Credential Leak';
        } else if (text.includes('breach')) {
          severity = 'high';
          type = 'Data Breach';
        } else if (text.includes('kk') || text.includes('kartu keluarga')) {
          severity = 'high';
          type = 'Family Card Data Leak';
        } else if (text.includes('phone') || text.includes('email')) {
          severity = 'medium';
          type = 'Personal Contact Exposure';
        }

        return {
          type,
          severity,
          domain: r.host_name || '',
          description: r.snippet?.substring(0, 250) || '',
          url: r.url || '',
        };
      });

    // KK-related data
    const kkData = (kkResults as Array<Record<string, string>>).map((r) => ({
      title: r.name || '',
      snippet: r.snippet || '',
      url: r.url || '',
      domain: r.host_name || '',
    }));

    // Comprehensive AI analysis
    const allContext = [
      ...(areaResults as Array<Record<string, string>>).slice(0, 4).map((r) => `[AREA] ${r.name}: ${r.snippet}`),
      ...(publicResults as Array<Record<string, string>>).slice(0, 3).map((r) => `[PUBLIC] ${r.name}: ${r.snippet}`),
      ...(leakResults as Array<Record<string, string>>).slice(0, 3).map((r) => `[LEAK] ${r.name}: ${r.snippet}`),
      ...(kkResults as Array<Record<string, string>>).slice(0, 3).map((r) => `[KK] ${r.name}: ${r.snippet}`),
    ].join('\n\n');

    const aiAnalysis = allContext.length > 0
      ? await safeAIAnalysis(
          `OSINT analyst for Indonesian NIK intelligence. Report with: ## 📋 NIK DECODING ANALYSIS ## 🗺️ GEOGRAPHIC INTELLIGENCE ## 🔍 PUBLIC DATA EXPOSURE ## 🚨 DATA LEAK & BREACH ## 👤 IDENTITY PROFILE ## 🔐 SECURITY ASSESSMENT ## 🎯 INVESTIGATION RECOMMENDATIONS
Be concise. Keep each section to 2-3 lines.`,
          `NIK: ${cleanedNIK} | DOB: ${decoded.birthDate} | Gender: ${decoded.gender} | Area: ${decoded.areaCode} | Province: ${decoded.province || 'Unknown'} | City: ${decoded.city || 'Unknown'} | KK: ${decoded.kkNumber}

${allContext.substring(0, 1500)}`
        )
      : 'No intelligence data available for this NIK number.';

    return NextResponse.json({
      success: true,
      nik: cleanedNIK,
      decoded: {
        nik: decoded.nik,
        birthDate: decoded.birthDate,
        gender: decoded.gender,
        areaCode: decoded.areaCode,
        province: decoded.province || 'Not identified from search results',
        city: decoded.city || 'Not identified from search results',
        subdistrict: decoded.subdistrict || 'Not identified from search results',
        kkNumber: decoded.kkNumber,
        nikValid: decoded.nikValid,
        validationNotes: decoded.validationNotes,
      },
      areaInfo,
      publicData,
      dataLeaks,
      leakCount: dataLeaks.length,
      kkData,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
