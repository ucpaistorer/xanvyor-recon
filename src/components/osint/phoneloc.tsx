'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  MapPin,
  Phone,
  Globe,
  Loader2,
  AlertTriangle,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, MapEmbed } from './shared';

interface PhoneLocResult {
  success: boolean; phone: string; cleaned: string; countryCode: string; country: string;
  location: { region: string | null; city: string | null; province: string | null; fullAddress: string | null; latitude: number | null; longitude: number | null; accuracy: string; locationConfidence: string; locationDescription: string | null; nearbyLandmarks: string[]; mapUrl: string | null; openStreetMapUrl: string | null };
  areaInfo: Array<{ title: string; snippet: string; url: string; source: string }>;
  carrierInfo: { carrier: string; type: string; network: string; mcc: string; mnc: string; region: string; timezone: string; country: string; countryCode: string };
  ipInfo: { estimatedIP: string | null; ispProvider: string; networkType: string; cellTowerInfo: string | null; estimatedIPRange: string | null };
  locationResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  ipResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  operatorResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; aiAnalysis: string;
}


export function PhoneLocModule() {
  const [phone, setPhone] = useState('');
  const { loading, result, error, search } = useOSINTSearch<PhoneLocResult>();

  const doSearch = useCallback(() => {
    if (!phone.trim()) return;
    search('/api/osint/phone-location', { phone: phone.trim() });
  }, [phone, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<MapPin className="w-5 h-5" />} color="from-rose-500 to-pink-500" title="Phone GPS Location" subtitle="Trace phone GPS location" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}{loading ? 'Tracing' : 'Trace'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Tracing phone GPS location" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.location && (
            <>
              <Card className="border-rose-500/30 bg-rose-500/5">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2"><MapPin className="w-5 h-5 text-rose-400" /><div className="text-lg font-bold">{result.location.fullAddress || result.location.city || 'Location Found'}</div></div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div><div className="text-xs text-muted-foreground">City</div><div className="text-sm font-medium">{result.location.city || 'N/A'}</div></div>
                    <div><div className="text-xs text-muted-foreground">Province</div><div className="text-sm font-medium">{result.location.province || 'N/A'}</div></div>
                    <div><div className="text-xs text-muted-foreground">Confidence</div><div className="text-sm font-medium">{result.location.locationConfidence || 'N/A'}</div></div>
                    <div><div className="text-xs text-muted-foreground">Accuracy</div><div className="text-sm font-medium">{result.location.accuracy || 'N/A'}</div></div>
                  </div>
                  {result.location.nearbyLandmarks && result.location.nearbyLandmarks.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{result.location.nearbyLandmarks.map((l, i) => <Badge key={i} variant="outline" className="text-xs">{l}</Badge>)}</div>}
                </CardContent>
              </Card>
              {result.location.latitude && result.location.longitude && (
                <MapEmbed lat={result.location.latitude} lng={result.location.longitude} label={`Lokasi HP: ${result.location.city || result.location.region || 'Terdeteksi'}`} />
              )}
            </>
          )}
          {result.carrierInfo && (
            <Card className="border-pink-500/30 bg-pink-500/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">Carrier</div><div className="text-sm font-medium">{result.carrierInfo.carrier}</div></div>
                  <div><div className="text-xs text-muted-foreground">Network</div><div className="text-sm font-medium">{result.carrierInfo.network}</div></div>
                  <div><div className="text-xs text-muted-foreground">MCC/MNC</div><div className="text-sm font-mono">{result.carrierInfo.mcc}/{result.carrierInfo.mnc}</div></div>
                  <div><div className="text-xs text-muted-foreground">Timezone</div><div className="text-sm font-medium">{result.carrierInfo.timezone}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="location">
            <TabsList className="bg-card/50">
              <TabsTrigger value="location" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400"><MapPin className="w-3 h-3 mr-1" />Location ({result.locationResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="ip" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Globe className="w-3 h-3 mr-1" />IP ({result.ipResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="operator" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Phone className="w-3 h-3 mr-1" />Operator ({result.operatorResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="location" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.locationResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="ip" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.ipResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="operator" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.operatorResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
