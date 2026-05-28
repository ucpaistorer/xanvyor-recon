'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Code,
  Scan,
  Loader2,
  Car,
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface DorkResult {
  target: string; totalFindings: number; highRiskFindings: number;
  dorkResults: Array<{ dorkName: string; dorkQuery: string; results: Array<{ url: string; title: string; snippet: string; domain: string }> }>;
  allDorkTemplates: Array<{ name: string; query: string }>;
  aiAnalysis: string;
}


export function DorkingModule() {
  const [target, setTarget] = useState('');
  const { loading, result, error, search } = useOSINTSearch<DorkResult>();

  const doSearch = useCallback(() => {
    if (!target.trim()) return;
    search('/api/osint/google-dorking', { target: target.trim() });
  }, [target, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Code className="w-5 h-5" />} color="from-lime-500 to-green-500" title="Google Dorking" subtitle="Advanced search operators for OSINT" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter target domain..." value={target} onChange={e => setTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-lime-600 hover:bg-lime-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Dorking' : 'Dork'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Running Google dork queries" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className="text-xl font-bold text-lime-400">{result.totalFindings}</div><div className="text-xs text-muted-foreground">Total Findings</div></div>
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-center"><div className="text-xl font-bold text-red-400">{result.highRiskFindings}</div><div className="text-xs text-muted-foreground">High Risk</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className="text-xl font-bold text-cyan-400">{result.dorkResults?.filter(d => d.results.length > 0).length || 0}</div><div className="text-xs text-muted-foreground">Categories Hit</div></div>
          </div>
          <Accordion type="multiple" className="w-full">
            {result.dorkResults?.map((d, i) => (
              <AccordionItem key={i} value={`dork-${i}`}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={d.results.length > 0 ? 'text-amber-400 border-amber-500/30' : 'text-muted-foreground'}>{d.results.length}</Badge>
                    <span>{d.dorkName}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mb-2"><code className="text-[10px] bg-card/50 px-2 py-1 rounded text-muted-foreground">{d.dorkQuery}</code></div>
                  <div className="space-y-2">{d.results.map((r, j) => <ResultLink key={j} {...r} />)}</div>
                  {d.results.length === 0 && <p className="text-xs text-muted-foreground py-2">No results found for this dork.</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {result.allDorkTemplates?.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Code className="w-4 h-4 text-lime-400" />All Dork Templates</CardTitle></CardHeader>
              <CardContent><div className="space-y-1 max-h-48 overflow-y-auto">{result.allDorkTemplates.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs"><Badge variant="outline" className="text-[9px] shrink-0">{t.name}</Badge><code className="text-muted-foreground break-all">{t.query}</code></div>
              ))}</div></CardContent>
            </Card>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
