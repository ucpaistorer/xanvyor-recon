'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Search,
  Loader2,
  Key,
  Network,
  Cpu,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface DomainResult {
  domain: string; whoisResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  subdomainResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  techResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  reputationResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function DomainModule() {
  const [domain, setDomain] = useState('');
  const { loading, result, error, search } = useOSINTSearch<DomainResult>();

  const doSearch = useCallback(() => {
    if (!domain.trim()) return;
    search('/api/osint/domain', { domain: domain.trim() });
  }, [domain, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Server className="w-5 h-5" />} color="from-violet-500 to-purple-500" title="Domain Intel" subtitle="WHOIS lookup, subdomains & reputation" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain name..." value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing domain ${domain}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Tabs defaultValue="whois">
            <TabsList className="bg-card/50">
              <TabsTrigger value="whois" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Key className="w-3 h-3 mr-1" />WHOIS ({result.whoisResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="subdomains" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Network className="w-3 h-3 mr-1" />Subdomains ({result.subdomainResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="tech" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Cpu className="w-3 h-3 mr-1" />Tech ({result.techResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="reputation" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Shield className="w-3 h-3 mr-1" />Reputation ({result.reputationResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="whois" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.whoisResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="subdomains" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.subdomainResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="tech" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.techResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="reputation" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.reputationResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
