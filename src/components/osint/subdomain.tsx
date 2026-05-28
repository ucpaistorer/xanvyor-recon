'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Network,
  Scan,
  Loader2,
  ExternalLink,
  ShieldAlert,
  Bug,
  Zap,
  Shield,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, AIAnalysisCard } from './shared';

interface SubdomainResult {
  domain: string; totalSubdomains: number; subdomains: string[];
  categories: Record<string, string[]>;
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function SubdomainModule() {
  const [domain, setDomain] = useState('');
  const { loading, result, error, search } = useOSINTSearch<SubdomainResult>();

  const doSearch = useCallback(() => {
    if (!domain.trim()) return;
    search('/api/osint/subdomain-finder', { domain: domain.trim() });
  }, [domain, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Network className="w-5 h-5" />} color="from-teal-500 to-cyan-500" title="Subdomain Finder" subtitle="Enumerate subdomains via web intelligence" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Network className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain (e.g., example.com)..." value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Finding' : 'Find'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Discovering subdomains for ${domain}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-teal-400">{result.totalSubdomains}</div>
            <div className="text-sm text-muted-foreground">subdomains found for <span className="font-mono text-foreground">{result.domain}</span></div>
          </div>
          {result.categories && Object.entries(result.categories).filter(([, subs]) => subs.length > 0).map(([cat, subs]) => (
            <Card key={cat} className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {cat === 'Admin & Internal' ? <ShieldAlert className="w-4 h-4 text-red-400" /> :
                   cat === 'Staging & Testing' ? <Bug className="w-4 h-4 text-amber-400" /> :
                   cat === 'API & Services' ? <Zap className="w-4 h-4 text-cyan-400" /> :
                   <Network className="w-4 h-4 text-teal-400" />}
                  {cat} ({subs.length})
                </CardTitle>
              </CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{subs.map(s => (
                <a key={s} href={`https://${s}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono bg-card/50 px-2 py-1 rounded border border-border/30 hover:border-teal-500/30 hover:text-teal-400 transition-colors">{s} <ExternalLink className="w-2 h-2 inline" /></a>
              ))}</div></CardContent>
            </Card>
          ))}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
