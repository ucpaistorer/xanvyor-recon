'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Upload,
  Scan,
  Loader2,
  MapPin,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface KtpResult {
  success: boolean;
  ktpData: { nik: string; nama: string; tempatTglLahir: string; jenisKelamin: string; alamat: string; rtRw: string; kelDesa: string; kecamatan: string; agama: string; statusPerkawinan: string; pekerjaan: string; kewarganegaraan: string; provinsi: string; kabupatenKota: string; berlakuHingga: string };
  location: { fullAddress: string; latitude: number; longitude: number; mapUrl: string; embedUrl: string; openStreetMapUrl: string };
  publicRecords: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  aiAnalysis: string;
}


export function KtpModule() {
  const [imageUrl, setImageUrl] = useState('');
  const { loading, result, error, search } = useOSINTSearch<KtpResult>();

  const doSearch = useCallback(() => {
    if (!imageUrl.trim()) return;
    search('/api/osint/ktp-track', { imageUrl: imageUrl.trim() });
  }, [imageUrl, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<CreditCard className="w-5 h-5" />} color="from-red-500 to-rose-500" title="KTP OCR" subtitle="Indonesian ID card OCR & analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter KTP image URL..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="VLM analyzing KTP image" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.ktpData && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><CreditCard className="w-4 h-4" /> KTP Data Extracted</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><div className="text-xs text-muted-foreground">NIK</div><div className="text-sm font-mono font-medium">{result.ktpData.nik}</div></div>
                  <div><div className="text-xs text-muted-foreground">Nama</div><div className="text-sm font-medium">{result.ktpData.nama}</div></div>
                  <div><div className="text-xs text-muted-foreground">TTL</div><div className="text-sm font-medium">{result.ktpData.tempatTglLahir}</div></div>
                  <div><div className="text-xs text-muted-foreground">Jenis Kelamin</div><div className="text-sm font-medium">{result.ktpData.jenisKelamin}</div></div>
                  <div><div className="text-xs text-muted-foreground">Alamat</div><div className="text-sm font-medium">{result.ktpData.alamat}</div></div>
                  <div><div className="text-xs text-muted-foreground">RT/RW</div><div className="text-sm font-mono">{result.ktpData.rtRw}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kel/Desa</div><div className="text-sm font-medium">{result.ktpData.kelDesa}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kecamatan</div><div className="text-sm font-medium">{result.ktpData.kecamatan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Agama</div><div className="text-sm font-medium">{result.ktpData.agama}</div></div>
                  <div><div className="text-xs text-muted-foreground">Status</div><div className="text-sm font-medium">{result.ktpData.statusPerkawinan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Pekerjaan</div><div className="text-sm font-medium">{result.ktpData.pekerjaan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kewarganegaraan</div><div className="text-sm font-medium">{result.ktpData.kewarganegaraan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Provinsi</div><div className="text-sm font-medium">{result.ktpData.provinsi}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kab/Kota</div><div className="text-sm font-medium">{result.ktpData.kabupatenKota}</div></div>
                  <div><div className="text-xs text-muted-foreground">Berlaku</div><div className="text-sm font-medium">{result.ktpData.berlakuHingga}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.location && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-rose-400" /><span className="text-sm font-medium">Address Location</span></div>
                <div className="text-sm text-muted-foreground">{result.location.fullAddress}</div>
                <div className="flex gap-2 mt-2">
                  {result.location.mapUrl && <a href={result.location.mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:underline">Google Maps</a>}
                  {result.location.openStreetMapUrl && <a href={result.location.openStreetMapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:underline">OpenStreetMap</a>}
                </div>
              </CardContent>
            </Card>
          )}
          {result.dataLeaks?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Data Leaks ({result.dataLeaks.length})</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.dataLeaks.map((d, i) => <div key={i} className="text-xs text-muted-foreground"><SeverityBadge severity={d.severity} /> {d.description}</div>)}</div></CardContent>
            </Card>
          )}
          {result.publicRecords?.length > 0 && (
            <div><h3 className="text-sm font-semibold mb-2">Public Records</h3><div className="space-y-2 max-h-48 overflow-y-auto">{result.publicRecords.map((r, i) => <ResultLink key={i} {...r} />)}</div></div>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
