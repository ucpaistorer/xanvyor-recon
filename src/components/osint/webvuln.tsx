'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bug,
  Search,
  Loader2,
  Database,
  Code,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge, ThreatBadge } from './shared';

interface WebVulnResult {
  hostname: string; url: string; threatLevel: string; vulnScore: number;
  vulnerabilities: Array<{ id: string; name: string; severity: string; status: string; description: string; detail: string; results: string[]; owasp: string; cvss: number }>;
  vulnCount: number; criticalCount: number; highCount: number; mediumCount: number;
  sqliResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  xssResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function WebVulnModule() {
  const [url, setUrl] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WebVulnResult>();

  const doSearch = useCallback(() => {
    if (!url.trim()) return;
    search('/api/osint/web-vuln', { url: url.trim() });
  }, [url, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Bug className="w-5 h-5" />} color="from-red-500 to-orange-500" title="Web Vulnerability Scanner" subtitle="Scan for web vulnerabilities" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Bug className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter URL to scan (e.g. https://example.com)..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Scanning ${url} for vulnerabilities`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className={`border-2 ${result.threatLevel === 'critical' ? 'border-red-600/50 bg-red-600/10' : result.threatLevel === 'high' ? 'border-orange-500/50 bg-orange-500/10' : result.threatLevel === 'medium' ? 'border-amber-500/50 bg-amber-500/10' : 'border-emerald-500/50 bg-emerald-500/10'}`}>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><div className="text-xs text-muted-foreground">Host</div><div className="text-sm font-mono font-medium">{result.hostname}</div></div>
                <div><div className="text-xs text-muted-foreground">Threat Level</div><ThreatBadge level={result.threatLevel} /></div>
                <div><div className="text-xs text-muted-foreground">Vuln Score</div><div className="text-2xl font-bold">{result.vulnScore}</div></div>
                <div><div className="text-xs text-muted-foreground">Vulnerabilities</div><div className="text-2xl font-bold text-red-400">{result.vulnCount}</div></div>
                <div><div className="text-xs text-muted-foreground">Critical/High</div><div className="text-sm font-bold"><span className="text-red-400">{result.criticalCount}</span> / <span className="text-orange-400">{result.highCount}</span></div></div>
              </div>
            </CardContent>
          </Card>
          {result.vulnerabilities?.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {result.vulnerabilities.map((v, i) => (
                <div key={i} className={`p-3 rounded-lg border ${v.severity === 'critical' ? 'border-red-600/40 bg-red-600/5' : v.severity === 'high' ? 'border-orange-500/40 bg-orange-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><SeverityBadge severity={v.severity} /><span className="text-sm font-medium">{v.name}</span></div>
                    <div className="flex items-center gap-2">
                      {v.owasp && <Badge variant="outline" className="text-[10px]">{v.owasp}</Badge>}
                      {v.cvss > 0 && <Badge variant="outline" className="text-[10px]">CVSS: {v.cvss}</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                  <Badge className={v.status === 'vulnerable' ? 'bg-red-500/20 text-red-400 border-red-500/30 text-xs mt-1' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs mt-1'}>{v.status}</Badge>
                </div>
              ))}
            </div>
          )}
          <Tabs defaultValue="sqli">
            <TabsList className="bg-card/50">
              <TabsTrigger value="sqli" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Database className="w-3 h-3 mr-1" />SQLi ({result.sqliResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="xss" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><Code className="w-3 h-3 mr-1" />XSS ({result.xssResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="sqli" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.sqliResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="xss" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.xssResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
