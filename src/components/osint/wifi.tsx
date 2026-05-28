'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Radio,
  Wifi,
  Fingerprint,
  Loader2,
  MapPin,
  Shield,
  Bug,
  Cpu,
  AlertTriangle,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface WifiAPResult {
  success: boolean; ssid: string; bssid: string;
  ouiInfo: { oui: string; manufacturer: string };
  networkInfo: { encryption: string; channel: number; signalStrength: number; frequency: string };
  locationResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  securityResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  vulnerabilityResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  deviceResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; aiAnalysis: string;
}


export function WifiAPModule() {
  const [ssid, setSsid] = useState('');
  const [bssid, setBssid] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WifiAPResult>();

  const doSearch = useCallback(() => {
    if (!ssid.trim() && !bssid.trim()) return;
    search('/api/osint/wifi', { ssid: ssid.trim(), bssid: bssid.trim() });
  }, [ssid, bssid, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Radio className="w-5 h-5" />} color="from-indigo-500 to-purple-500" title="WiFi AP Lookup" subtitle="Access point intelligence & lookup" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="SSID (network name)..." value={ssid} onChange={e => setSsid(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <div className="relative flex-1">
          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="BSSID (MAC address)..." value={bssid} onChange={e => setBssid(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 mr-2" />}{loading ? 'Looking' : 'Lookup'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Looking up WiFi access point" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-indigo-500/30 bg-indigo-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-xs text-muted-foreground">SSID</div><div className="text-sm font-medium">{result.ssid || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">BSSID</div><div className="text-sm font-mono">{result.bssid || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Manufacturer</div><div className="text-sm font-medium">{result.ouiInfo?.manufacturer || 'Unknown'}</div></div>
                <div><div className="text-xs text-muted-foreground">OUI</div><div className="text-sm font-mono">{result.ouiInfo?.oui || 'N/A'}</div></div>
              </div>
              {result.networkInfo && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">{result.networkInfo.encryption}</Badge>
                  <Badge variant="outline" className="text-xs">Ch {result.networkInfo.channel}</Badge>
                  <Badge variant="outline" className="text-xs">Signal {result.networkInfo.signalStrength}%</Badge>
                  <Badge variant="outline" className="text-xs">{result.networkInfo.frequency}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div>
              </CardContent>
            </Card>
          )}
          <Tabs defaultValue="location">
            <TabsList className="bg-card/50">
              <TabsTrigger value="location" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"><MapPin className="w-3 h-3 mr-1" />Location ({result.locationResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Shield className="w-3 h-3 mr-1" />Security ({result.securityResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="vuln" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><Bug className="w-3 h-3 mr-1" />Vulns ({result.vulnerabilityResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="device" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Cpu className="w-3 h-3 mr-1" />Devices ({result.deviceResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="location" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.locationResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="security" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.securityResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="vuln" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.vulnerabilityResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="device" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.deviceResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
