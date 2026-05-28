'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  QrCode,
  MapPin,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, AIAnalysisCard } from './shared';

interface QrisResult {
  success: boolean; query: string;
  merchants: Array<{ name: string; merchantId: string; location: string; address: string; category: string; status: string; lat: number; lng: number }>;
  totalFound: number;
  locationData: { lat: number; lng: number; area: string };
  mapHtml: string; aiAnalysis: string;
}


export function QrisModule() {
  const [merchantId, setMerchantId] = useState('');
  const [loc, setLoc] = useState('');
  const { loading, result, error, search } = useOSINTSearch<QrisResult>();

  const doSearch = useCallback(() => {
    search('/api/osint/qris', { merchantId: merchantId.trim(), location: loc.trim() });
  }, [merchantId, loc, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<QrCode className="w-5 h-5" />} color="from-cyan-500 to-blue-500" title="QRIS Merchant Lookup" subtitle="Find QRIS merchant details" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Merchant ID..." value={merchantId} onChange={e => setMerchantId(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Location (optional)..." value={loc} onChange={e => setLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}{loading ? 'Searching' : 'Search'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Looking up QRIS merchants" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Found <span className="font-bold text-cyan-400">{result.totalFound}</span> merchants</div>
            {result.locationData && <Badge variant="outline" className="text-xs"><MapPin className="w-3 h-3 mr-1" />{result.locationData.area}</Badge>}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.merchants?.map((m, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 bg-card/30">
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-muted-foreground font-mono">{m.merchantId}</div></div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{m.category}</Badge>
                    <Badge className={m.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs' : 'bg-red-500/20 text-red-400 border-red-500/30 text-xs'}>{m.status}</Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{m.address || m.location}</div>
              </div>
            ))}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
