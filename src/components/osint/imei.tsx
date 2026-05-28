'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Loader2,
  CheckCircle2,
  XCircle,
  Fingerprint,
  MapPin,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  Shield,
  Check,
  X,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, MapEmbed } from './shared';

interface ImeiResult {
  success: boolean; imei: string;
  validation: { valid: boolean; luhnCheck: boolean; checkDigit: string; calculatedCheckDigit: string };
  decomposition: { tac: string; fac: string; tacFull: string; serialNumber: string; checkDigit: string };
  tacInfo: { typeAllocationCode: string; tacCore: string; finalAssemblyCode: string; reportingBody: string; brandFromTAC: string; countryFromTAC: string; tacConfidence: string };
  deviceInfo: { brand: string; model: string; deviceType: string; os: string; detectedModels: string[] };
  locationIntelligence: { carrier: string; region: string; network: string; reportingBody: string; tacOrigin: string; details: Array<{ source: string; info: string }> };
  stolenLostStatus: { isStolenOrLost: boolean; safetyStatus: string; reports: Array<{ status: string; source: string; description: string; url: string }>; reportCount: number };
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string; category?: string }>;
  aiAnalysis: string;
}


export function ImeiModule() {
  const [imei, setImei] = useState('');
  const { loading, result, error, search } = useOSINTSearch<ImeiResult>();

  const doSearch = useCallback(() => {
    if (!imei.trim()) return;
    search('/api/osint/imei', { imei: imei.trim() });
  }, [imei, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Smartphone className="w-5 h-5" />} color="from-cyan-500 to-blue-500" title="IMEI Tracker" subtitle="Lacak HP via IMEI - Cek device, lokasi & status hilang" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Masukkan 15 digit IMEI..." value={imei} onChange={e => setImei(e.target.value.replace(/\D/g, '').slice(0, 15))} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50 font-mono" />
        </div>
        <Button onClick={doSearch} disabled={loading || imei.length !== 15} className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}{loading ? 'Melacak' : 'Lacak'}
        </Button>
      </div>
      {imei.length > 0 && imei.length !== 15 && <p className="text-xs text-amber-400">IMEI harus 15 digit ({imei.length}/15)</p>}
      {loading && <LoadingIndicator message={`Melacak IMEI ${imei}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* IMEI Validation */}
          <Card className={`border-2 ${result.validation?.valid ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="text-2xl font-mono font-bold">{result.imei}</div>
                {result.validation?.valid ? (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Valid IMEI</Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Invalid IMEI</Badge>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div><div className="text-xs text-muted-foreground">TAC</div><div className="text-sm font-mono">{result.decomposition?.tac || '-'}</div></div>
                <div><div className="text-xs text-muted-foreground">FAC</div><div className="text-sm font-mono">{result.decomposition?.fac || '-'}</div></div>
                <div><div className="text-xs text-muted-foreground">Serial</div><div className="text-sm font-mono">{result.decomposition?.serialNumber || '-'}</div></div>
                <div><div className="text-xs text-muted-foreground">Luhn Check</div><div className="text-sm font-medium">{result.validation?.luhnCheck ? '✅ Pass' : '❌ Fail'}</div></div>
                <div><div className="text-xs text-muted-foreground">Check Digit</div><div className="text-sm font-mono">{result.validation?.checkDigit || '-'}</div></div>
              </div>
            </CardContent>
          </Card>

          {/* TAC Info */}
          {result.tacInfo && (
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-cyan-400"><Fingerprint className="w-4 h-4" /> TAC Intelligence</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">Brand (TAC)</div><div className="text-sm font-medium">{result.tacInfo.brandFromTAC || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Country</div><div className="text-sm font-medium">{result.tacInfo.countryFromTAC || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Reporting Body</div><div className="text-sm font-medium">{result.tacInfo.reportingBody || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Confidence</div><Badge className={result.tacInfo.tacConfidence === 'high' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'}>{result.tacInfo.tacConfidence || 'low'}</Badge></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Device Info */}
          {result.deviceInfo && (result.deviceInfo.brand || result.deviceInfo.model) && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-blue-400"><Smartphone className="w-4 h-4" /> Device Info</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">Brand</div><div className="text-sm font-bold">{result.deviceInfo.brand || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Model</div><div className="text-sm font-medium">{result.deviceInfo.model || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.deviceInfo.deviceType || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">OS</div><div className="text-sm font-medium">{result.deviceInfo.os || 'N/A'}</div></div>
                </div>
                {result.deviceInfo.detectedModels?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{result.deviceInfo.detectedModels.map((m, i) => <Badge key={i} variant="outline" className="text-xs">{m}</Badge>)}</div>}
              </CardContent>
            </Card>
          )}

          {/* Location Intelligence */}
          {result.locationIntelligence && (
            <Card className="border-emerald-500/30 bg-emerald-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-emerald-400"><MapPin className="w-4 h-4" /> Location Intelligence</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">Carrier</div><div className="text-sm font-medium">{result.locationIntelligence.carrier || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Region</div><div className="text-sm font-medium">{result.locationIntelligence.region || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Network</div><div className="text-sm font-medium">{result.locationIntelligence.network || 'N/A'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Origin</div><div className="text-sm font-medium">{result.locationIntelligence.tacOrigin || 'N/A'}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {/* TAC Origin Map */}
          {result.tacInfo && result.tacInfo.countryFromTAC && (
            <MapEmbed
              lat={result.tacInfo.countryFromTAC === 'USA' ? 37.0902 : result.tacInfo.countryFromTAC === 'South Korea' ? 35.9078 : result.tacInfo.countryFromTAC === 'China' ? 35.8617 : result.tacInfo.countryFromTAC === 'Finland' ? 61.9241 : result.tacInfo.countryFromTAC === 'Japan' ? 36.2048 : result.tacInfo.countryFromTAC === 'Canada' ? 56.1304 : result.tacInfo.countryFromTAC === 'USA/China' ? 35.8617 : 0}
              lng={result.tacInfo.countryFromTAC === 'USA' ? -95.7129 : result.tacInfo.countryFromTAC === 'South Korea' ? 127.7669 : result.tacInfo.countryFromTAC === 'China' ? 104.1954 : result.tacInfo.countryFromTAC === 'Finland' ? 25.7482 : result.tacInfo.countryFromTAC === 'Japan' ? 138.2529 : result.tacInfo.countryFromTAC === 'Canada' ? -106.3468 : result.tacInfo.countryFromTAC === 'USA/China' ? 104.1954 : 0}
              label={`TAC Origin: ${result.tacInfo.countryFromTAC} | Brand: ${result.tacInfo.brandFromTAC || 'Unknown'}`}
            />
          )}

          {/* Stolen/Lost Status */}
          {result.stolenLostStatus && (
            <Card className={`border-2 ${result.stolenLostStatus.isStolenOrLost ? 'border-red-600/50 bg-red-600/10' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  {result.stolenLostStatus.isStolenOrLost ? (
                    <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-base px-4 py-1 animate-pulse"><ShieldAlert className="w-5 h-5 mr-2" />HILANG / DICURI</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-base px-4 py-1"><ShieldCheck className="w-5 h-5 mr-2" />Aman - Tidak terdaftar hilang</Badge>
                  )}
                  {result.stolenLostStatus.reportCount > 0 && <span className="text-sm text-muted-foreground">({result.stolenLostStatus.reportCount} laporan)</span>}
                </div>
                {result.stolenLostStatus.reports?.length > 0 && (
                  <div className="space-y-1 mt-2">{result.stolenLostStatus.reports.map((r, i) => <div key={i} className="text-xs"><Badge variant="outline" className="text-[9px]">{r.status}</Badge> {r.description}</div>)}</div>
                )}
              </CardContent>
            </Card>
          )}

          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data bocor ditemukan</span></div></CardContent>
            </Card>
          )}

          {result.searchResults?.length > 0 && (
            <div><h3 className="text-sm font-semibold mb-2">Hasil Pencarian ({result.searchResults.length})</h3><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults.map((r, i) => <ResultLink key={i} {...r} />)}</div></div>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
