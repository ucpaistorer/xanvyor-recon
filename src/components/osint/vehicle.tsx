'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Car,
  Search,
  Loader2,
  ShieldAlert,
  AlertTriangle,
  FileSearch,
  Key,
  Wallet,
  Database,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge, MapEmbed } from './shared';

interface VehicleResult {
  success: boolean; plate: string; regionCode: string; region: string; province: string; regionDescription: string; vehicleType: string; vehicleCategory: string;
  registrationStatus: string; taxStatus: string;
  specialPlate?: { detected: boolean; type: string; description: string };
  vehicleInfo?: { brand: string; model: string; year: string; color: string; fuelType: string; cc: string; ownerType: string };
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  publicRecords: Array<{ url: string; title: string; snippet: string; domain: string }>;
  stnkData: Array<{ url: string; title: string; snippet: string; domain: string }>;
  bpkbData: Array<{ url: string; title: string; snippet: string; domain: string }>;
  taxData: Array<{ url: string; title: string; snippet: string; domain: string }>;
  crimeReports: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  stolenReports: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  accidentReports: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  crimeCount: number;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  rentalIndicated?: boolean;
  aiAnalysis: string;
}


export function VehicleModule() {
  const [plate, setPlate] = useState('');
  const { loading, result, error, search } = useOSINTSearch<VehicleResult>();

  const doSearch = useCallback(() => {
    if (!plate.trim()) return;
    search('/api/osint/vehicle', { plate: plate.trim() });
  }, [plate, search]);

  const categoryLabel = result?.vehicleCategory === 'mobil' ? '🚗 Mobil' : result?.vehicleCategory === 'motor' ? '🏍️ Motor' : '🚙 Unknown';

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Car className="w-5 h-5" />} color="from-slate-500 to-gray-500" title="Lacak Plat Kendaraan" subtitle="Cek plat mobil & motor Indonesia" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Masukkan nomor plat (contoh: B 1234 XY)..." value={plate} onChange={e => setPlate(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-slate-600 hover:bg-slate-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4 mr-2" />}{loading ? 'Cek' : 'Lacak'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Mengecek plat ${plate}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-slate-500/30 bg-slate-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="text-2xl font-mono font-bold">{result.plate}</div>
                <Badge className={result.vehicleCategory === 'mobil' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' : result.vehicleCategory === 'motor' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-gray-500/20 text-gray-400 border-gray-500/30'}>{categoryLabel}</Badge>
                {result.specialPlate?.detected && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">{result.specialPlate.type}</Badge>}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><div className="text-xs text-muted-foreground">Wilayah</div><div className="text-sm font-medium">{result.region}</div></div>
                <div><div className="text-xs text-muted-foreground">Provinsi</div><div className="text-sm font-medium">{result.province}</div></div>
                <div><div className="text-xs text-muted-foreground">Kode</div><div className="text-sm font-mono">{result.regionCode}</div></div>
                <div><div className="text-xs text-muted-foreground">Jenis</div><div className="text-sm font-medium">{result.vehicleType || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Registrasi</div><Badge className={result.registrationStatus === 'Active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : result.registrationStatus === 'Blocked' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>{result.registrationStatus || 'Unknown'}</Badge></div>
                <div><div className="text-xs text-muted-foreground">Pajak</div><Badge className={result.taxStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : result.taxStatus === 'Unpaid' || result.taxStatus === 'Expired' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>{result.taxStatus || 'Unknown'}</Badge></div>
                <div><div className="text-xs text-muted-foreground">Kriminal</div><div className="text-sm font-bold text-red-400">{result.crimeCount}</div></div>
                <div><div className="text-xs text-muted-foreground">Data Bocor</div><div className="text-sm font-bold text-red-400">{result.leakCount}</div></div>
              </div>
              {result.regionDescription && <div className="text-xs text-muted-foreground mt-2">📍 {result.regionDescription}</div>}
            </CardContent>
          </Card>
          {/* Region Map for Vehicle */}
          <MapEmbed lat={result.regionCode === 'B' ? -6.2088 : result.regionCode === 'D' ? -6.9175 : result.regionCode === 'T' ? -7.2575 : result.regionCode === 'H' ? -6.9666 : result.regionCode === 'L' ? -7.5755 : result.regionCode === 'F' ? -6.2349 : result.regionCode === 'DD' ? -8.6705 : result.regionCode === 'AE' ? -7.6303 : result.regionCode === 'BA' ? -7.7517 : result.regionCode === 'DA' ? -3.4433 : result.regionCode === 'KI' ? -1.2654 : result.regionCode === 'PA' ? 1.4748 : result.regionCode === 'PI' ? -5.1477 : result.regionCode === 'EA' ? -8.5830 : result.regionCode === 'ED' ? -10.1772 : result.regionCode === 'AB' ? -6.1753 : result.regionCode === 'Z' ? -6.1753 : -6.2088} lng={result.regionCode === 'B' ? 106.8456 : result.regionCode === 'D' ? 107.6191 : result.regionCode === 'T' ? 112.7521 : result.regionCode === 'H' ? 110.4196 : result.regionCode === 'L' ? 110.8243 : result.regionCode === 'F' ? 106.9905 : result.regionCode === 'DD' ? 115.2126 : result.regionCode === 'AE' ? 111.5181 : result.regionCode === 'BA' ? 113.7213 : result.regionCode === 'DA' ? 114.8353 : result.regionCode === 'KI' ? 116.8311 : result.regionCode === 'PA' ? 124.8421 : result.regionCode === 'PI' ? 119.4327 : result.regionCode === 'EA' ? 116.1183 : result.regionCode === 'ED' ? 123.6030 : result.regionCode === 'AB' ? 106.8456 : result.regionCode === 'Z' ? 106.8456 : 106.8456} label={`Wilayah Plat ${result.regionCode}: ${result.region}, ${result.province}`} />
          {result.vehicleInfo && (result.vehicleInfo.brand || result.vehicleInfo.model) && (
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-cyan-400"><Car className="w-4 h-4" /> Info Kendaraan</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">Merek</div><div className="text-sm font-medium">{result.vehicleInfo.brand || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Model</div><div className="text-sm font-medium">{result.vehicleInfo.model || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Tahun</div><div className="text-sm font-medium">{result.vehicleInfo.year || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Warna</div><div className="text-sm font-medium">{result.vehicleInfo.color || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">BBM</div><div className="text-sm font-medium">{result.vehicleInfo.fuelType || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">CC</div><div className="text-sm font-medium">{result.vehicleInfo.cc || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kepemilikan</div><div className="text-sm font-medium">{result.vehicleInfo.ownerType || 'N/A'}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.specialPlate?.detected && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-amber-400"><ShieldAlert className="w-4 h-4" /><span className="text-sm font-medium">Plat Khusus: {result.specialPlate.type}</span></div>
                <div className="text-xs text-muted-foreground mt-1">{result.specialPlate.description}</div>
              </CardContent>
            </Card>
          )}
          {result.rentalIndicated && (
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-purple-400"><Car className="w-4 h-4" /><span className="text-sm font-medium">Kemungkinan kendaraan rental</span></div></CardContent>
            </Card>
          )}
          {result.stolenReports && result.stolenReports.length > 0 && (
            <Card className="border-red-600/30 bg-red-600/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /> Kendaraan Hilang ({result.stolenReports.length})</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.stolenReports.map((s, i) => <div key={i} className="text-xs"><SeverityBadge severity={s.severity} /> {s.description}</div>)}</div></CardContent>
            </Card>
          )}
          {(result.leakCount > 0 || (result.crimeCount > 0)) && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3">
                  {result.crimeCount > 0 && <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.crimeCount} laporan kriminal</span></div>}
                  {result.leakCount > 0 && <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data bocor</span></div>}
                </div>
              </CardContent>
            </Card>
          )}
          <Tabs defaultValue="search">
            <TabsList className="bg-card/50 flex-wrap h-auto gap-1">
              <TabsTrigger value="search" className="data-[state=active]:bg-slate-500/20 data-[state=active]:text-slate-400"><Search className="w-3 h-3 mr-1" />Search ({result.searchResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="stnk" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><FileSearch className="w-3 h-3 mr-1" />STNK ({result.stnkData?.length || 0})</TabsTrigger>
              <TabsTrigger value="bpkb" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"><Key className="w-3 h-3 mr-1" />BPKB ({result.bpkbData?.length || 0})</TabsTrigger>
              <TabsTrigger value="tax" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Wallet className="w-3 h-3 mr-1" />Pajak ({result.taxData?.length || 0})</TabsTrigger>
              <TabsTrigger value="crime" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Kriminal ({result.crimeReports?.length || 0})</TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Database className="w-3 h-3 mr-1" />Records ({result.publicRecords?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="stnk" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.stnkData?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="bpkb" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.bpkbData?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="tax" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.taxData?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="crime" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.crimeReports?.map((r, i) => <div key={i} className="p-3 rounded-lg border border-red-500/30 bg-red-500/5"><div className="flex items-center gap-2"><SeverityBadge severity={r.severity} /><span className="text-sm font-medium">{r.type}</span></div><p className="text-xs text-muted-foreground mt-1">{r.description}</p></div>)}</div></TabsContent>
            <TabsContent value="records" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.publicRecords?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
