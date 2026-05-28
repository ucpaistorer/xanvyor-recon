'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  Shield,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Lock,
  Code,
  Bug,
  Check,
  X,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface WebSecResult {
  hostname: string; url: string; overallStatus: string; securityScore: number;
  securityChecks: Array<{ category: string; status: string; items: Array<{ name: string; status: string; detail: string }> }>;
  sslResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  headerResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  malwareResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  breachResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function WebSecModule() {
  const [url, setUrl] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WebSecResult>();

  const doSearch = useCallback(() => {
    if (!url.trim()) return;
    search('/api/osint/web-security', { url: url.trim() });
  }, [url, search]);

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (s === 'fail') return <XCircle className="w-3 h-3 text-red-400" />;
    if (s === 'warning') return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    return <HelpCircle className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<ShieldCheck className="w-5 h-5" />} color="from-emerald-500 to-green-600" title="Web Security" subtitle="SSL/TLS, headers & malware check" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter URL to audit..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}{loading ? 'Auditing' : 'Audit'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Running security audit on ${url}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className="text-2xl font-bold">{result.hostname}</div><div className="text-xs text-muted-foreground">Hostname</div></div>
            <div className={`p-3 rounded-lg border-2 text-center ${result.overallStatus === 'safe' ? 'border-emerald-500/50 bg-emerald-500/10' : result.overallStatus === 'suspicious' ? 'border-amber-500/50 bg-amber-500/10' : 'border-red-500/50 bg-red-500/10'}`}><div className={`text-2xl font-bold ${result.overallStatus === 'safe' ? 'text-emerald-400' : result.overallStatus === 'suspicious' ? 'text-amber-400' : 'text-red-400'}`}>{result.securityScore}/100</div><div className="text-xs text-muted-foreground">Security Score</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className={`text-lg font-bold capitalize ${result.overallStatus === 'safe' ? 'text-emerald-400' : result.overallStatus === 'suspicious' ? 'text-amber-400' : 'text-red-400'}`}>{result.overallStatus}</div><div className="text-xs text-muted-foreground">Status</div></div>
          </div>
          {result.securityChecks?.map((cat, i) => (
            <Card key={i} className="border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{cat.category}</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{cat.items?.map((item, j) => (
                <div key={j} className="flex items-center gap-2 text-xs">{statusIcon(item.status)}<span className="font-medium">{item.name}</span><span className="text-muted-foreground">- {item.detail}</span></div>
              ))}</div></CardContent>
            </Card>
          ))}
          <Tabs defaultValue="ssl">
            <TabsList className="bg-card/50">
              <TabsTrigger value="ssl" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Lock className="w-3 h-3 mr-1" />SSL ({result.sslResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="headers" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Code className="w-3 h-3 mr-1" />Headers ({result.headerResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="malware" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Bug className="w-3 h-3 mr-1" />Malware ({result.malwareResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="breach" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><AlertTriangle className="w-3 h-3 mr-1" />Breach ({result.breachResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="ssl" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.sslResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="headers" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.headerResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="malware" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.malwareResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="breach" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.breachResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
