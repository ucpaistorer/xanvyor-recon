'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Smartphone,
  Loader2,
  Shield,
  Layers,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface PhoneDevResult {
  success: boolean; phone: string;
  analysis: { original: string; cleaned: string; countryCode: string; country: string; carrier: string; numberType: string };
  deviceInfo: { likelyDeviceType: string; likelyOS: string; confidence: string; detectedModels: string[] };
  registeredApps: Array<{ platform: string; icon: string; detected: boolean; category: string }>;
  detectedAppCount: number;
  connectedDevices: Array<{ name: string; type: string; lastSeen: string }>;
  imeiInfo: Array<{ imei: string; brand: string; model: string; status: string }>;
  accountSecurity: { twoFactorEnabled: boolean; lastPasswordChange: string; compromisedAccounts: string[]; securityScore: number };
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  deviceResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  appResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  securityResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function PhoneDevModule() {
  const [phone, setPhone] = useState('');
  const { loading, result, error, search } = useOSINTSearch<PhoneDevResult>();

  const doSearch = useCallback(() => {
    if (!phone.trim()) return;
    search('/api/osint/phone-device', { phone: phone.trim() });
  }, [phone, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Smartphone className="w-5 h-5" />} color="from-emerald-500 to-teal-500" title="Phone Device Intelligence" subtitle="Device & app intelligence" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Analyzing phone device intelligence" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-xs text-muted-foreground">Phone</div><div className="text-sm font-mono">{result.analysis?.cleaned}</div></div>
                <div><div className="text-xs text-muted-foreground">Carrier</div><div className="text-sm font-medium">{result.analysis?.carrier || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.analysis?.numberType || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Country</div><div className="text-sm font-medium">{result.analysis?.country || 'N/A'}</div></div>
              </div>
            </CardContent>
          </Card>
          {result.deviceInfo && (
            <Card className="border-teal-500/30 bg-teal-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-teal-400"><Smartphone className="w-4 h-4" />Device Info</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><div className="text-xs text-muted-foreground">Likely Device</div><div className="text-sm font-medium">{result.deviceInfo.likelyDeviceType || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Likely OS</div><div className="text-sm font-medium">{result.deviceInfo.likelyOS || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Confidence</div><div className="text-sm font-medium">{result.deviceInfo.confidence || 'N/A'}</div></div>
                </div>
                {result.deviceInfo.detectedModels?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{result.deviceInfo.detectedModels.map((m, i) => <Badge key={i} variant="outline" className="text-xs">{m}</Badge>)}</div>}
              </CardContent>
            </Card>
          )}
          {result.accountSecurity && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-400"><Shield className="w-4 h-4" />Account Security</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div><span className="text-xs text-muted-foreground">Score:</span> <span className="font-bold">{result.accountSecurity.securityScore}/100</span></div>
                  <div><span className="text-xs text-muted-foreground">2FA:</span> <span className="font-medium">{result.accountSecurity.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span></div>
                </div>
                {result.accountSecurity.compromisedAccounts?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{result.accountSecurity.compromisedAccounts.map((a, i) => <Badge key={i} className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{a}</Badge>)}</div>}
              </CardContent>
            </Card>
          )}
          {result.registeredApps?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Detected Apps ({result.detectedAppCount})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {result.registeredApps.map(a => (
                  <div key={a.platform} className={`p-2 rounded-lg border text-center ${a.detected ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/30 bg-card/20'}`}>
                    <span className="text-lg block">{a.icon}</span>
                    <div className="text-[10px] font-medium mt-0.5">{a.platform}</div>
                    {a.detected && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] mt-0.5">✓</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="device">
            <TabsList className="bg-card/50">
              <TabsTrigger value="device" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Smartphone className="w-3 h-3 mr-1" />Device ({result.deviceResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="apps" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Layers className="w-3 h-3 mr-1" />Apps ({result.appResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Shield className="w-3 h-3 mr-1" />Security ({result.securityResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="device" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.deviceResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="apps" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.appResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="security" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.securityResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
