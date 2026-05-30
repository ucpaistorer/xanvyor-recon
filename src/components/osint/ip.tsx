'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  Search,
  Loader2,
  Shield,
  ShieldAlert,
  AlertTriangle,
  Zap,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, ThreatBadge } from './shared';

interface IPResult {
  ip: string; type: string; isPrivate: boolean; anonymityType: string; vpnDetected: boolean; torDetected: boolean; proxyDetected: boolean;
  threatLevel: string; detectedThreats: string[]; blacklists: Array<{ source: string; description: string; url: string }>;
  detectedPorts: Array<{ port: number; service: string; status: string }>;
  geoResults: Array<{ title: string; snippet: string; url: string }>;
  threatResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function IPModule() {
  const [ip, setIp] = useState('');
  const { loading, result, error, search } = useOSINTSearch<IPResult>();

  const doSearch = useCallback(() => {
    if (!ip.trim()) return;
    search('/api/osint/ip', { ip: ip.trim() });
  }, [ip, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Globe className="w-5 h-5" />} color="from-rose-500 to-red-500" title="IP Recon" subtitle="IP geolocation, VPN detection & threat analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter IP address..." value={ip} onChange={e => setIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing IP ${ip}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">IP Address</div><div className="text-sm font-mono font-medium">{result.ip}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.type} {result.isPrivate && '(Private)'}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Anonymity</div><div className="text-sm font-medium">{result.anonymityType}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Threat</div><ThreatBadge level={result.threatLevel} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.vpnDetected && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Shield className="w-3 h-3 mr-1" />VPN Detected</Badge>}
            {result.torDetected && <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><ShieldAlert className="w-3 h-3 mr-1" />Tor Detected</Badge>}
            {result.proxyDetected && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><Shield className="w-3 h-3 mr-1" />Proxy Detected</Badge>}
            {result.detectedThreats?.map(t => <Badge key={t} className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">{t}</Badge>)}
          </div>
          {result.detectedPorts?.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" />Detected Ports</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.detectedPorts.map(p => <Badge key={p.port} variant="outline" className="text-xs">{p.port}/{p.service}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
          {result.blacklists?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Blacklists ({result.blacklists.length})</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.blacklists.map((b, i) => <div key={i} className="text-xs text-muted-foreground">{b.source}: {b.description.substring(0, 100)}</div>)}</div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="geo">
            <TabsList className="bg-card/50">
              <TabsTrigger value="geo" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><MapPin className="w-3 h-3 mr-1" />Geo</TabsTrigger>
              <TabsTrigger value="threat" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Threat</TabsTrigger>
            </TabsList>
            <TabsContent value="geo" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.geoResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="threat" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.threatResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
