'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Fingerprint,
  Search,
  Loader2,
  AlertTriangle,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface MacResult {
  success: boolean; mac: string; oui: string; manufacturer: string; deviceType: string;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>; aiAnalysis: string;
}


export function MacModule() {
  const [mac, setMac] = useState('');
  const { loading, result, error, search } = useOSINTSearch<MacResult>();

  const doSearch = useCallback(() => {
    if (!mac.trim()) return;
    search('/api/osint/mac', { mac: mac.trim() });
  }, [mac, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Fingerprint className="w-5 h-5" />} color="from-orange-500 to-red-500" title="MAC Address Lookup" subtitle="Identify device manufacturer & details" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter MAC address (e.g. AA:BB:CC:DD:EE:FF)..." value={mac} onChange={e => setMac(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Looking' : 'Lookup'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Looking up MAC ${mac}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-xs text-muted-foreground">MAC Address</div><div className="text-sm font-mono font-medium">{result.mac}</div></div>
                <div><div className="text-xs text-muted-foreground">OUI</div><div className="text-sm font-mono">{result.oui}</div></div>
                <div><div className="text-xs text-muted-foreground">Manufacturer</div><div className="text-sm font-medium">{result.manufacturer || 'Unknown'}</div></div>
                <div><div className="text-xs text-muted-foreground">Device Type</div><div className="text-sm font-medium">{result.deviceType || 'Unknown'}</div></div>
              </div>
            </CardContent>
          </Card>
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div>
                <div className="space-y-1 mt-2">{result.dataLeaks?.map((d, i) => <div key={i} className="text-xs text-muted-foreground"><SeverityBadge severity={d.severity} /> {d.description}</div>)}</div>
              </CardContent>
            </Card>
          )}
          {result.searchResults?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Search Results ({result.searchResults.length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults.map((r, i) => <ResultLink key={i} {...r} />)}</div>
            </div>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
