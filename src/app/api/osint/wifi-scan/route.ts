import { NextRequest, NextResponse } from 'next/server';
import { safeWebSearch, safeAIAnalysis } from '@/lib/zai';

// ============================================================
// WiFi Scanner v5 - FAST & RELIABLE
// Optimized: parallel searches, reduced API calls, fast fallback
// ============================================================

// Get IP-based geolocation
function getClientIp(request: NextRequest): string | null {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    const clientIp = ips[0];
    if (clientIp && !clientIp.startsWith('10.') && !clientIp.startsWith('172.') && !clientIp.startsWith('192.168.') && clientIp !== '127.0.0.1') {
      return clientIp;
    }
  }
  const xRealIp = request.headers.get('x-real-ip');
  if (xRealIp && xRealIp !== '127.0.0.1') return xRealIp;
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp;
  return null;
}

async function getIpGeolocation(clientIp?: string | null): Promise<{ lat: number; lng: number; city: string; region: string; country: string; isp: string } | null> {
  const ips = clientIp ? [clientIp] : [];
  for (const ip of ips.length > 0 ? ips : ['']) {
    try {
      const url = ip ? `http://ip-api.com/json/${ip}?fields=status,country,regionName,city,lat,lon,isp` : 'http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon,isp';
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && data.lat && data.lon) {
          return { lat: data.lat, lng: data.lon, city: data.city || '', region: data.regionName || '', country: data.country || '', isp: data.isp || '' };
        }
      }
    } catch { /* try next */ }
  }
  // Fallback to ipapi.co
  try {
    const url2 = clientIp ? `https://ipapi.co/${clientIp}/json/` : 'https://ipapi.co/json/';
    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 6000);
    const res2 = await fetch(url2, { signal: controller2.signal });
    clearTimeout(timeout2);
    if (res2.ok) {
      const data2 = await res2.json();
      if (data2.latitude && data2.longitude) {
        return { lat: data2.latitude, lng: data2.longitude, city: data2.city || '', region: data2.region || '', country: data2.country_name || '', isp: data2.org || '' };
      }
    }
  } catch { /* failed */ }
  return null;
}

// Reverse geocode GPS to get area name
async function getAreaName(lat: number, lng: number): Promise<{
  road: string; neighborhood: string; city: string; state: string; fullAddress: string;
}> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id&addressdetails=1&zoom=18`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'XANVYOR-RECON-OSINT/1.0' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    const addr = data.address || {};
    const parts: string[] = [];
    if (addr.road) parts.push(addr.road);
    if (addr.neighbourhood) parts.push(addr.neighbourhood);
    if (addr.suburb) parts.push(addr.suburb);
    if (addr.city_district) parts.push(addr.city_district);
    if (addr.village) parts.push(addr.village);
    if (addr.city) parts.push(addr.city);
    if (addr.state) parts.push(addr.state);
    return {
      road: addr.road || '',
      neighborhood: addr.neighbourhood || addr.suburb || addr.village || addr.city_district || '',
      city: addr.city || addr.county || addr.town || '',
      state: addr.state || '',
      fullAddress: parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    };
  } catch {
    return { road: '', neighborhood: '', city: '', state: '', fullAddress: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
  }
}

// ============================================================
// WiFi Network Types
// ============================================================
interface RealWifiNetwork {
  ssid: string;
  password: string;
  encryption: string;
  security: string;
  source: string;
  distance: string;
  venueName: string;
  venueType: string;
  signalStrength: string;
  isReal: boolean;
  realSource: string;
}

// ============================================================
// Search for REAL WiFi data - optimized with parallel searches
// ============================================================
async function searchRealWifiNetworks(
  areaInfo: { road: string; neighborhood: string; city: string; state: string; fullAddress: string },
  connectedSSID?: string
): Promise<RealWifiNetwork[]> {
  const networks: RealWifiNetwork[] = [];
  const seenSSIDs = new Set<string>();

  const addNetwork = (n: RealWifiNetwork) => {
    const key = n.ssid.toLowerCase().trim();
    if (key.length < 2 || seenSSIDs.has(key)) return;
    seenSSIDs.add(key);
    networks.push(n);
  };

  const area = areaInfo.neighborhood || areaInfo.city || areaInfo.state || '';
  const city = areaInfo.city || '';
  const state = areaInfo.state || '';

  // Build 2-3 key search queries - run in PARALLEL for speed
  const searchQueries = [
    `sandi wifi password ${area} ${city} indonesia sekitar`,
    `wifi password ${area} leaked shared rumah indihome`,
  ];

  // If user provided connected SSID, add specific search
  if (connectedSSID && connectedSSID.trim().length > 0) {
    searchQueries.unshift(`"${connectedSSID}" wifi password sandi key`);
  }

  // Execute searches IN PARALLEL (much faster)
  const searchPromises = searchQueries.slice(0, 3).map(q =>
    safeWebSearch(q, 8).catch(() => [] as unknown[])
  );

  const searchResultsArray = await Promise.all(searchPromises);

  // Collect all results
  const allSearchResults: Array<{ url: string; title: string; snippet: string }> = [];
  for (const results of searchResultsArray) {
    for (const r of results as Array<Record<string, string>>) {
      allSearchResults.push({
        url: r.url || '',
        title: r.name || r.title || '',
        snippet: r.snippet || '',
      });
    }
  }

  // Manual regex extraction FIRST (fast, no AI needed)
  for (const r of allSearchResults) {
    const text = `${r.title} ${r.snippet}`;
    const wifiPatterns = [
      /(?:ssid|wifi|WiFi|WIFI)[:\s]+["']?([A-Za-z0-9_\-@.]+)["']?[:\s]+(?:password|sandi|pass|key)[:\s]+["']?([A-Za-z0-9_\-@.!]{4,20})["']?/gi,
      /(?:password|sandi)[:\s]+["']?([A-Za-z0-9_\-@.!]{4,20})["']?[:\s]+(?:untuk|for|wifi|ssid)[:\s]+["']?([A-Za-z0-9_\-@.]+)["']?/gi,
    ];
    for (const pattern of wifiPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        const ssid = match[1]?.trim();
        const password = match[2]?.trim();
        if (ssid && password && ssid.length > 1 && password.length > 2) {
          addNetwork({
            ssid,
            password,
            encryption: 'WPA2',
            security: 'Moderate',
            source: 'Terdeteksi',
            distance: '—',
            venueName: 'Sumber: web search',
            venueType: 'Terdeteksi',
            signalStrength: '—',
            isReal: true,
            realSource: r.url || 'web search',
          });
        }
      }
    }
  }

  // Use AI to extract WiFi SSID + Password from search results (only if we have results)
  if (allSearchResults.length > 0) {
    const searchContext = allSearchResults.slice(0, 20).map((r, i) =>
      `[${i + 1}] ${r.title}\n${r.snippet}\nURL: ${r.url}`
    ).join('\n\n');

    const aiPrompt = `Kamu analis data WiFi OSINT. Tugas kamu: Ekstrak SEMUA SSID WiFi dan password yang kamu temukan dari data pencarian berikut.

PENTING:
- Hanya ekstrak WiFi yang password-nya BENAR-BENAR tercantum di data (BUKAN tebakan)
- Jika password tidak disebutkan, tulis "Tidak diketahui"
- Format WAJIB JSON array, tidak ada teks lain
- Setiap entry: {"ssid":"nama wifi","password":"passwordnya","type":"Rumah/Kos/Masjid/Cafe/Toko/ISP/Public/Open","source":"situs sumber"}
- Jangan buat data palsu, HANYA dari data yang diberikan

Data pencarian:
${searchContext.substring(0, 5000)}`;

    try {
      const aiResponse = await safeAIAnalysis(
        'Kamu hanya boleh merespon dengan JSON array. Tidak ada penjelasan, tidak ada markdown code block. HANYA JSON array murni.',
        aiPrompt,
        1 // reduced retries for speed
      );

      let jsonStr = aiResponse.trim();
      if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      }
      const arrMatch = jsonStr.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          const parsed = JSON.parse(arrMatch[0]);
          if (Array.isArray(parsed)) {
            for (const item of parsed) {
              if (item.ssid && typeof item.ssid === 'string' && item.ssid.trim().length > 0) {
                const isPasswordKnown = item.password && item.password !== 'Tidak diketahui' && item.password.trim().length > 0;
                addNetwork({
                  ssid: item.ssid.trim(),
                  password: isPasswordKnown ? item.password.trim() : '',
                  encryption: isPasswordKnown ? 'WPA2' : 'Unknown',
                  security: isPasswordKnown ? 'Moderate' : 'Unknown',
                  source: item.type || 'Terdeteksi',
                  distance: '—',
                  venueName: `Sumber: ${item.source || 'web search'}`,
                  venueType: item.type || 'Terdeteksi',
                  signalStrength: '—',
                  isReal: true,
                  realSource: item.source || 'web search',
                });
              }
            }
          }
        } catch { /* JSON parse failed */ }
      }
    } catch { /* AI analysis failed */ }
  }

  // Handle connected SSID
  if (connectedSSID && connectedSSID.trim().length > 0 && !seenSSIDs.has(connectedSSID.toLowerCase().trim())) {
    addNetwork({
      ssid: connectedSSID.trim(),
      password: '',
      encryption: 'WPA2',
      security: 'Unknown',
      source: 'Connected WiFi',
      distance: '0m',
      venueName: 'WiFi kamu - password tidak ditemukan di database publik',
      venueType: 'Connected',
      signalStrength: 'Excellent (-30 dBm)',
      isReal: true,
      realSource: 'user-input',
    });
  }

  // If no networks found at all, generate area-based estimated networks
  if (networks.length === 0 && (area || city)) {
    // Use AI to generate plausible WiFi names for the area (but mark as estimated)
    try {
      const estimatedAI = await safeAIAnalysis(
        'Respond ONLY with JSON array. No markdown. No explanation.',
        `Berikan 8-12 SSID WiFi yang UMUM ditemukan di daerah "${area} ${city} ${state} Indonesia". 
Format: [{"ssid":"nama wifi khas daerah ini","type":"Rumah/Kos/Masjid/Cafe/Toko/ISP/Public","encryption":"WPA2/WPA/Open"}]
- 60% Rumah/Tetangga (nama seperti: nama orang, IndiHome_xxx, FibreHome_xxx)
- 15% Kos/Apartment 
- 10% Usaha kecil (warung, toko)
- 10% ISP/Public (wifi.id, @wifi.id)
- 5% Open/Tanpa password
- Gunakan nama-nama Indonesia khas daerah tersebut
- JANGAN sertakan password (karena ini estimasi saja)
- type: Rumah=WiFi rumah tetangga, Kos=kost-kosan, Masjid=mushola/masjid, Cafe=kafe/resto, Toko=toko/warung, ISP=wifi.id/indihome, Public=public wifi, Open=wifi tanpa password`,
        1
      );

      let estJson = estimatedAI.trim();
      if (estJson.startsWith('```')) estJson = estJson.replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '');
      const estMatch = estJson.match(/\[[\s\S]*\]/);
      if (estMatch) {
        try {
          const estParsed = JSON.parse(estMatch[0]);
          if (Array.isArray(estParsed)) {
            for (const item of estParsed) {
              if (item.ssid && typeof item.ssid === 'string' && item.ssid.trim().length > 0) {
                const isCon = connectedSSID && item.ssid.toLowerCase().trim() === connectedSSID.toLowerCase().trim();
                addNetwork({
                  ssid: item.ssid.trim(),
                  password: '',
                  encryption: item.encryption || 'WPA2',
                  security: 'Unknown',
                  source: item.type || 'Estimasi',
                  distance: '—',
                  venueName: isCon ? 'WiFi kamu - cek password di perangkat' : `Estimasi WiFi ${item.type || 'sekitar'}`,
                  venueType: isCon ? 'Connected' : (item.type || 'Estimasi'),
                  signalStrength: isCon ? 'Excellent (-30 dBm)' : '—',
                  isReal: false,
                  realSource: 'estimasi-ai',
                });
              }
            }
          }
        } catch { /* parse failed */ }
      }
    } catch { /* AI estimation failed */ }
  }

  return networks;
}

// ============================================================
// Main Handler
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { location, lat, lng, useIpLocation, connectedSSID } = body as {
      location?: string;
      lat?: number;
      lng?: number;
      useIpLocation?: boolean;
      connectedSSID?: string;
    };

    let mapLat = 0;
    let mapLng = 0;
    let areaInfo: Awaited<ReturnType<typeof getAreaName>> = {
      road: '', neighborhood: '', city: '', state: '', fullAddress: ''
    };
    let locationMethod = 'unknown';
    let ipInfo: Awaited<ReturnType<typeof getIpGeolocation>> = null;

    // === PRIORITY 1: GPS coordinates ===
    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      mapLat = lat;
      mapLng = lng;
      locationMethod = 'gps';
      areaInfo = await getAreaName(lat, lng);
    }
    // === PRIORITY 2: IP geolocation ===
    else if (useIpLocation) {
      const clientIp = getClientIp(request);
      ipInfo = await getIpGeolocation(clientIp);
      if (ipInfo) {
        mapLat = ipInfo.lat;
        mapLng = ipInfo.lng;
        locationMethod = 'ip';
        areaInfo = await getAreaName(ipInfo.lat, ipInfo.lng);
        if (!areaInfo.city && ipInfo.city) areaInfo.city = ipInfo.city;
        if (!areaInfo.state && ipInfo.region) areaInfo.state = ipInfo.region;
      }
    }
    // === PRIORITY 3: Location string ===
    else if (location && location.trim().length > 0) {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location.trim())}&format=json&limit=1&accept-language=id`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'XANVYOR-RECON-OSINT/1.0' },
          signal: AbortSignal.timeout(8000),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.length > 0) {
            mapLat = parseFloat(data[0].lat);
            mapLng = parseFloat(data[0].lon);
            areaInfo = await getAreaName(mapLat, mapLng);
            locationMethod = 'manual';
          }
        }
      } catch { /* fallback to IP */ }

      if (mapLat === 0 && mapLng === 0) {
        const clientIp = getClientIp(request);
        ipInfo = await getIpGeolocation(clientIp);
        if (ipInfo) {
          mapLat = ipInfo.lat;
          mapLng = ipInfo.lng;
          areaInfo = await getAreaName(ipInfo.lat, ipInfo.lng);
          if (!areaInfo.city && ipInfo.city) areaInfo.city = ipInfo.city;
          locationMethod = 'ip-fallback';
        } else {
          mapLat = -6.2088;
          mapLng = 106.8456;
          areaInfo = { road: '', neighborhood: '', city: location.trim(), state: '', fullAddress: location.trim() };
          locationMethod = 'default';
        }
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Lokasi diperlukan. Klik tombol deteksi GPS, deteksi IP, atau masukkan nama area.' },
        { status: 400 }
      );
    }

    // === Search for WiFi data ===
    const realNetworks = await searchRealWifiNetworks(areaInfo, connectedSSID);

    // Classify networks
    const allNetworks = realNetworks;
    const safeNetworks = allNetworks.filter(n => n.security === 'Strong' || n.security === 'Moderate');
    const vulnerableNetworks = allNetworks.filter(n => n.security === 'Weak' || n.security === 'Vulnerable' || n.security?.includes('Critical') || n.security === 'Unknown');
    const networksWithPassword = allNetworks.filter(n => n.password && n.password.length > 0);

    // AI analysis - only if we have networks
    let aiAnalysis = '';
    const networkSummary = allNetworks.slice(0, 15).map(n =>
      `- ${n.ssid} | ${n.password ? '✅ Ada password' : '❌ Tidak ada'} | ${n.encryption} | ${n.venueType} | ${n.isReal ? 'REAL' : 'ESTIMASI'}`
    ).join('\n');

    try {
      aiAnalysis = await safeAIAnalysis(
        `Kamu analis WiFi OSINT. Buat laporan Bahasa Indonesia yang SINGKAT:
## 📡 RINGKASAN SCAN (2 baris)
## 🔑 WIFI DENGAN PASSWORD (list saja)
## 🔐 KEAMANAN (2 baris)
## 💡 INFO PENTING (jelaskan bahwa browser tidak bisa baca WiFi langsung, password WiFi rumah biasanya tidak ada di internet)`,
        `Lokasi: ${areaInfo.fullAddress}
Total WiFi: ${allNetworks.length} | Password ditemukan: ${networksWithPassword.length} | Aman: ${safeNetworks.length} | Rentan: ${vulnerableNetworks.length}
WiFi terhubung: ${connectedSSID || 'Tidak disebutkan'}
WiFi:
${networkSummary}`,
        1
      );
    } catch {
      aiAnalysis = `## 📡 RINGKASAN\nDitemukan **${allNetworks.length} WiFi** di sekitar ${areaInfo.fullAddress}. **${networksWithPassword.length}** WiFi memiliki password.\n\n## 💡 INFO PENTING\n- Browser tidak bisa membaca WiFi langsung dari perangkat\n- Password WiFi rumah/pribadi biasanya TIDAK tersebar di internet\n- WiFi public/cafe: password sering dibagikan secara terbuka\n- Untuk WiFi yang belum ditemukan password-nya, coba tanya langsung ke pemilik`;
    }

    return NextResponse.json({
      success: true,
      networks: allNetworks,
      totalFound: allNetworks.length,
      networksWithPassword: networksWithPassword.length,
      safeNetworks: safeNetworks.length,
      vulnerableNetworks: vulnerableNetworks.length,
      mapLocation: {
        lat: parseFloat(mapLat.toFixed(6)),
        lng: parseFloat(mapLng.toFixed(6)),
        area: areaInfo.fullAddress,
        road: areaInfo.road,
        neighborhood: areaInfo.neighborhood,
        city: areaInfo.city,
        state: areaInfo.state,
        fullAddress: areaInfo.fullAddress,
      },
      gpsDetected: locationMethod === 'gps',
      locationMethod,
      ipLocation: ipInfo ? { city: ipInfo.city, region: ipInfo.region, isp: ipInfo.isp } : null,
      connectedSSID: connectedSSID || null,
      aiAnalysis,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: `Gagal scan WiFi: ${message}. Coba lagi atau gunakan deteksi IP.`,
      networks: [],
      totalFound: 0,
      networksWithPassword: 0,
      safeNetworks: 0,
      vulnerableNetworks: 0,
      mapLocation: { lat: 0, lng: 0, area: '', road: '', neighborhood: '', city: '', state: '', fullAddress: '' },
      gpsDetected: false,
      locationMethod: 'error',
      ipLocation: null,
      connectedSSID: null,
      aiAnalysis: '',
    }, { status: 200 });
  }
}
