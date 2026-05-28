'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wifi,
  Search,
  Loader2,
  Network,
  Mail,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface DNSResult {
  domain: string;
  dnssec: { detected: boolean; details: string };
  emailSecurity: { spf: boolean; dkim: boolean; dmarc: boolean; level: string; score: number };
  dnsProvider: string;
  dnsResults: Array<{ url: string; title: string; snippet: string }>;
  mxResults: Array<{ url: string; title: string; snippet: string }>;
  nsResults: Array<{ url: string; title: string; snippet: string }>;
  txtResults: Array<{ url: string; title: string; snippet: string }>;
  cnameResults: Array<{ url: string; title: string; snippet: string }>;
  aiAnalysis: string;
}


export function DNSModule() {
  const [domain, setDomain] = useState('');
  const { loading, result, error, search } = useOSINTSearch<DNSResult>();

  const doSearch = useCallback(() => {
    if (!domain.trim()) return;
    search('/api/osint/dns', { domain: domain.trim() });
  }, [domain, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Wifi className="w-5 h-5" />} color="from-yellow-500 to-amber-500" title="DNS Recon" subtitle="DNS enumeration & email security analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain for DNS analysis..." value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing DNS records for ${domain}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">DNS Provider</div><div className="text-sm font-medium">{result.dnsProvider}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">DNSSEC</div><div className="text-sm font-medium">{result.dnssec?.detected ? '✅ Enabled' : '❌ Not Found'}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Email Security</div><div className="text-sm font-medium capitalize">{result.emailSecurity?.level || 'unknown'}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">SPF/DKIM/DMARC</div><div className="flex gap-1 mt-1">
              <Badge variant="outline" className={`text-[9px] ${result.emailSecurity?.spf ? 'text-emerald-400' : 'text-muted-foreground'}`}>SPF</Badge>
              <Badge variant="outline" className={`text-[9px] ${result.emailSecurity?.dkim ? 'text-emerald-400' : 'text-muted-foreground'}`}>DKIM</Badge>
              <Badge variant="outline" className={`text-[9px] ${result.emailSecurity?.dmarc ? 'text-emerald-400' : 'text-muted-foreground'}`}>DMARC</Badge>
            </div></div>
          </div>
          <Tabs defaultValue="dns">
            <TabsList className="bg-card/50">
              <TabsTrigger value="dns" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Network className="w-3 h-3 mr-1" />DNS ({result.dnsResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="txt" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Mail className="w-3 h-3 mr-1" />TXT/SPF ({result.txtResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="mx" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Server className="w-3 h-3 mr-1" />MX ({result.mxResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="cname" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Network className="w-3 h-3 mr-1" />CNAME ({result.cnameResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="dns" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.dnsResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="txt" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.txtResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="mx" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.mxResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="cname" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.cnameResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
