'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Phone,
  Search,
  Loader2,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  UserSearch,
  Users,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface PhoneResult {
  phone: string; safetyStatus: string; analysis: { carrier: string; numberType: string; country: string; countryCode: string };
  contactNames: Array<{ name: string; source: string; confidence: string }>;
  registeredServices: Array<{ platform: string; icon: string; detected: boolean; category: string }>;
  associatedPeople: Array<{ name: string; source: string; snippet: string; url: string; confidence: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  socialAccounts: Array<{ url: string; title: string; snippet: string; domain: string }>;
  spamReports: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function PhoneModule() {
  const [phone, setPhone] = useState('');
  const { loading, result, error, search } = useOSINTSearch<PhoneResult>();

  const doSearch = useCallback(() => {
    if (!phone.trim()) return;
    search('/api/osint/phone', { phone: phone.trim() });
  }, [phone, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Phone className="w-5 h-5" />} color="from-pink-500 to-rose-500" title="Phone Trace" subtitle="Phone number intelligence & safety check" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Tracing' : 'Trace'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Tracing phone number ${phone}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-pink-500/30 bg-pink-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Phone Number</div>
                  <div className="text-lg font-mono font-medium">{result.phone}</div>
                  {result.analysis && <div className="text-xs text-muted-foreground mt-1">{result.analysis.carrier} &bull; {result.analysis.country}</div>}
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${result.safetyStatus === 'safe' ? 'bg-emerald-500/15 border-emerald-500/40' : result.safetyStatus === 'suspicious' ? 'bg-amber-500/15 border-amber-500/40' : 'bg-red-500/15 border-red-500/40'}`}>
                  {result.safetyStatus === 'safe' ? <><ShieldCheck className="w-5 h-5 text-emerald-400" /><span className="font-bold text-emerald-400">SAFE</span></> :
                   result.safetyStatus === 'suspicious' ? <><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="font-bold text-amber-400">SUSPICIOUS</span></> :
                   <><ShieldX className="w-5 h-5 text-red-400" /><span className="font-bold text-red-400">DANGEROUS</span></>}
                </div>
              </div>
            </CardContent>
          </Card>
          {result.contactNames?.length > 0 && (
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-cyan-400"><UserSearch className="w-4 h-4" /> Contact Names (GetContact Style)</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.contactNames.map((n, i) => (
                <div key={i} className="flex items-center gap-2 text-sm"><Badge variant="outline" className="text-[9px]">{n.source}</Badge><span className="font-medium">{n.name}</span><span className="text-[9px] text-muted-foreground">({n.confidence})</span></div>
              ))}</div></CardContent>
            </Card>
          )}
          {result.registeredServices?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Registered Services ({result.registeredServices.filter(s => s.detected).length}/{result.registeredServices.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {result.registeredServices.map(s => (
                  <div key={s.platform} className={`p-2 rounded-lg border text-center ${s.detected ? 'border-pink-500/40 bg-pink-500/10' : 'border-border/30 bg-card/20'}`}>
                    <span className="text-lg">{s.icon}</span>
                    <div className="text-xs font-medium mt-1">{s.platform}</div>
                    {s.detected && <Badge className="bg-pink-500/20 text-pink-400 text-[9px] mt-1">Detected</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.dataLeaks?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Data Leaks ({result.dataLeaks.length})</CardTitle></CardHeader>
              <CardContent><div className="space-y-2">{result.dataLeaks.map((l, i) => (
                <div key={i} className="p-2 rounded-lg border border-red-500/20 bg-red-500/5"><div className="flex items-center gap-2"><SeverityBadge severity={l.severity} /><span className="text-sm font-medium">{l.type}</span></div><p className="text-xs text-muted-foreground mt-1">{l.description}</p></div>
              ))}</div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="social">
            <TabsList className="bg-card/50">
              <TabsTrigger value="social" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400"><Users className="w-3 h-3 mr-1" />Social ({result.socialAccounts?.length || 0})</TabsTrigger>
              <TabsTrigger value="spam" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Spam ({result.spamReports?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialAccounts?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="spam" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.spamReports?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
