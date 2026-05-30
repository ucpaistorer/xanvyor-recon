'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wifi,
  MapPin,
  Globe,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, AIAnalysisCard, MapEmbed } from './shared';

interface WifiScanResult {
  success: boolean; networks: Array<{ ssid: string; password: string; encryption: string; security: string; source: string; distance: string; venueName: string; venueType: string; signalStrength: string; isReal: boolean; realSource: string }>;
  totalFound: number; networksWithPassword: number; safeNetworks: number; vulnerableNetworks: number;
  mapLocation: { lat: number; lng: number; area: string; road: string; neighborhood: string; city: string; state: string; fullAddress: string };
  gpsDetected: boolean; locationMethod: string; ipLocation: { city: string; region: string; isp: string } | null; connectedSSID: string | null; aiAnalysis: string;
}


export function WifiScanModule() {
  const { loading, result, error, search } = useOSINTSearch<WifiScanResult>();
  const [location, setLocation] = useState('');
  const [connectedSSID, setConnectedSSID] = useState('');
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Auto-detect GPS on mount - initialize with loading state
  const [gpsLoading, setGpsLoading] = useState(() => typeof navigator !== 'undefined' && !!navigator.geolocation);
  const gpsInitialized = useRef(false);
  useEffect(() => {
    if (!navigator.geolocation || gpsInitialized.current) return;
    gpsInitialized.current = true;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const doSearch = useCallback((method: 'gps' | 'ip' | 'manual') => {
    const body: Record<string, unknown> = {};
    if (method === 'gps' && gpsCoords) { body.lat = gpsCoords.lat; body.lng = gpsCoords.lng; body.connectedSSID = connectedSSID; }
    else if (method === 'ip') { body.useIpLocation = true; body.connectedSSID = connectedSSID; }
    else if (method === 'manual' && location.trim()) { body.location = location.trim(); body.connectedSSID = connectedSSID; }
    else { body.useIpLocation = true; body.connectedSSID = connectedSSID; }
    search('/api/osint/wifi-scan', body);
  }, [location, connectedSSID, gpsCoords, search]);

  const handleScan = useCallback(() => {
    if (gpsCoords) doSearch('gps');
    else if (location.trim()) doSearch('manual');
    else doSearch('ip');
  }, [gpsCoords, location, doSearch]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Wifi className="w-5 h-5" />} color="from-purple-500 to-violet-500" title="WiFi Scanner" subtitle="Scan & analisis jaringan WiFi sekitar" />
      {/* Auto GPS indicator */}
      {gpsLoading && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
            <span className="text-sm text-emerald-400">Mendeteksi lokasi GPS otomatis...</span>
          </CardContent>
        </Card>
      )}
      {gpsCoords && !loading && !result && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400">GPS Terdeteksi: {gpsCoords.lat.toFixed(4)}, {gpsCoords.lng.toFixed(4)}</span>
            </div>
            <Button onClick={handleScan} size="sm" className="bg-purple-600 hover:bg-purple-700 text-white">
              <Wifi className="w-3 h-3 mr-1" />Scan Sekarang
            </Button>
          </CardContent>
        </Card>
      )}
      {gpsCoords && !loading && !result && (
        <MapEmbed lat={gpsCoords.lat} lng={gpsCoords.lng} label="Lokasi GPS Anda" />
      )}
      <Card className="border-purple-500/20 bg-purple-500/5">
        <CardContent className="p-4 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Masukkan lokasi (opsional)..." value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleScan()} className="pl-10 bg-card/50 border-border/50" />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="SSID WiFi yang terhubung (opsional)..." value={connectedSSID} onChange={e => setConnectedSSID(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleScan} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[120px]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wifi className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan WiFi'}
            </Button>
            <Button onClick={() => doSearch('ip')} disabled={loading} variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
              <Globe className="w-4 h-4 mr-2" />Pakai IP Location
            </Button>
          </div>
        </CardContent>
      </Card>
      {loading && <LoadingIndicator message="Scanning WiFi networks di sekitar lokasi" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">WiFi Ditemukan</div><div className="text-2xl font-bold text-purple-400">{result.totalFound}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Ada Password</div><div className="text-2xl font-bold text-amber-400">{result.networksWithPassword}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Aman</div><div className="text-2xl font-bold text-emerald-400">{result.safeNetworks}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Rentan</div><div className="text-2xl font-bold text-red-400">{result.vulnerableNetworks}</div></div>
          </div>
          {result.mapLocation && (
            <>
              <Card className="border-purple-500/30 bg-purple-500/5">
                <CardContent className="p-4">
                  <div className="text-sm font-medium mb-1">📍 {result.mapLocation.fullAddress || 'Lokasi terdeteksi'}</div>
                  <div className="text-xs text-muted-foreground">Metode: {result.locationMethod} | GPS: {result.gpsDetected ? '✅' : '❌'}</div>
                  {result.ipLocation && <div className="text-xs text-muted-foreground mt-1">IP Location: {result.ipLocation.city}, {result.ipLocation.region} | ISP: {result.ipLocation.isp}</div>}
                  {result.connectedSSID && <div className="text-xs text-purple-400 mt-1">🔗 Terhubung: {result.connectedSSID}</div>}
                </CardContent>
              </Card>
              <MapEmbed lat={result.mapLocation.lat} lng={result.mapLocation.lng} label={result.mapLocation.fullAddress || 'Lokasi Scan WiFi'} />
            </>
          )}
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {result.networks?.map((n, i) => (
              <div key={i} className={`p-3 rounded-lg border ${n.password ? 'border-amber-500/30 bg-amber-500/5' : n.isReal ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/30 bg-card/30'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium flex items-center gap-2">
                      <Wifi className="w-3 h-3" />
                      {n.ssid || 'Hidden'}
                      {n.isReal ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">Real</Badge> : <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-[9px]">Estimasi</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.venueName || n.venueType}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{n.encryption}</Badge>
                    <Badge variant="outline" className="text-xs">{n.source}</Badge>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                  <span>📡 {n.signalStrength}</span>
                  <span>📏 {n.distance}</span>
                  {n.password && <span className="text-amber-400 font-bold">🔑 Password: {n.password}</span>}
                </div>
              </div>
            ))}
            {(!result.networks || result.networks.length === 0) && (
              <div className="text-center py-8 text-muted-foreground text-sm">Tidak ada WiFi ditemukan. Coba gunakan GPS atau masukkan lokasi yang lebih spesifik.</div>
            )}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
