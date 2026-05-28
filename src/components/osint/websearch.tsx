'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface WebSearchResult { results: Array<{ url: string; title: string; snippet: string; domain: string; date?: string }>; aiAnalysis: string; }


export function WebSearchModule() {
  const [query, setQuery] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WebSearchResult>();

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    search('/api/osint/web-search', { query: query.trim() });
  }, [query, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Search className="w-5 h-5" />} color="from-emerald-500 to-green-500" title="Web Intelligence" subtitle="AI-powered deep web search & analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter search query..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Searching' : 'Search'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Searching the web with AI analysis" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-sm text-muted-foreground">Found {result.results?.length || 0} results</div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {result.results?.map((r, i) => <ResultLink key={i} {...r} />)}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
