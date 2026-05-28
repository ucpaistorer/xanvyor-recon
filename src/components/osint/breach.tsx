'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Search,
  Loader2,
  AlertTriangle,
  Database,
  Shield,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface BreachResult {
  target: string; severity: string; detectedBreaches: string[]; dataTypes: string[];
  criticalIndicators: string[]; highIndicators: string[]; mediumIndicators: string[];
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function BreachModule() {
  const [query, setQuery] = useState('');
  const { loading, result, error, search } = useOSINTSearch<BreachResult>();

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    search('/api/osint/breach-checker', { query: query.trim() });
  }, [query, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<ShieldAlert className="w-5 h-5" />} color="from-red-500 to-orange-500" title="Breach Checker" subtitle="Check if your data has been exposed in breaches" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter email or username to check..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}{loading ? 'Checking' : 'Check'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Scanning breach databases & dark web" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className={`border-2 ${result.severity === 'critical' ? 'border-red-600/50 bg-red-600/10' : result.severity === 'high' ? 'border-orange-500/50 bg-orange-500/10' : result.severity === 'medium' ? 'border-amber-500/50 bg-amber-500/10' : 'border-emerald-500/50 bg-emerald-500/10'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="text-lg font-mono font-medium">{result.target}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Severity</div>
                  <SeverityBadge severity={result.severity} />
                </div>
              </div>
            </CardContent>
          </Card>
          {result.detectedBreaches?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Affected Services ({result.detectedBreaches.length})</CardTitle></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.detectedBreaches.map(b => <Badge key={b} className="bg-red-500/20 text-red-400 border-red-500/30">{b}</Badge>)}</div></CardContent>
            </Card>
          )}
          {result.dataTypes?.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-400"><Database className="w-4 h-4" />Exposed Data Types</CardTitle></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.dataTypes.map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}</div></CardContent>
            </Card>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.searchResults?.map((r, i) => <ResultLink key={i} {...r} />)}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
