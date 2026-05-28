'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Bitcoin as BitcoinIcon,
  Search,
  Loader2,
  Activity,
  Wallet,
  Building2,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface BitcoinResult {
  success: boolean; address: string; addressType: string;
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  transactionResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  riskResults: { riskLevel: string; riskIndicators: string[]; detectedExchanges: string[]; riskDetails: Array<{ url: string; title: string; snippet: string; domain: string }>; darknetDetails: Array<{ url: string; title: string; snippet: string; domain: string }> };
  walletResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  exchangeResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function BitcoinModule() {
  const [address, setAddress] = useState('');
  const { loading, result, error, search } = useOSINTSearch<BitcoinResult>();

  const doSearch = useCallback(() => {
    if (!address.trim()) return;
    search('/api/osint/bitcoin', { address: address.trim() });
  }, [address, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<BitcoinIcon className="w-5 h-5" />} color="from-orange-500 to-amber-500" title="Bitcoin Trace" subtitle="Bitcoin address analysis & risk" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <BitcoinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter Bitcoin address..." value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BitcoinIcon className="w-4 h-4 mr-2" />}{loading ? 'Tracing' : 'Trace'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing Bitcoin address`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><div className="text-xs text-muted-foreground">Address</div><div className="text-sm font-mono font-medium truncate">{result.address}</div></div>
                <div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.addressType || 'Unknown'}</div></div>
                <div><div className="text-xs text-muted-foreground">Risk</div><SeverityBadge severity={result.riskResults?.riskLevel || 'low'} /></div>
              </div>
              {result.riskResults?.riskIndicators?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">{result.riskResults.riskIndicators.map((r, i) => <Badge key={i} className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{r}</Badge>)}</div>
              )}
              {result.riskResults?.detectedExchanges?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">{result.riskResults.detectedExchanges.map((e, i) => <Badge key={i} variant="outline" className="text-xs">{e}</Badge>)}</div>
              )}
            </CardContent>
          </Card>
          <Tabs defaultValue="search">
            <TabsList className="bg-card/50">
              <TabsTrigger value="search" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><Search className="w-3 h-3 mr-1" />Search ({result.searchResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="tx" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Activity className="w-3 h-3 mr-1" />Txns ({result.transactionResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="wallet" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Wallet className="w-3 h-3 mr-1" />Wallet ({result.walletResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="exchange" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Building2 className="w-3 h-3 mr-1" />Exchange ({result.exchangeResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="tx" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.transactionResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="wallet" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.walletResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="exchange" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.exchangeResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
