'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Wallet,
  Phone,
  Loader2,
  AlertTriangle,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, AIAnalysisCard, SeverityBadge } from './shared';

interface EwalletResult {
  success: boolean; phone: string;
  analysis: { carrier: string; country: string };
  wallets: Array<{ platform: string; icon: string; detected: boolean; accountName: string; balance: string; status: string; category: string }>;
  detectedCount: number; riskLevel: string;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; aiAnalysis: string;
}


export function EwalletModule() {
  const [phone, setPhone] = useState('');
  const { loading, result, error, search } = useOSINTSearch<EwalletResult>();

  const doSearch = useCallback(() => {
    if (!phone.trim()) return;
    search('/api/osint/ewallet', { phone: phone.trim() });
  }, [phone, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Wallet className="w-5 h-5" />} color="from-green-500 to-emerald-500" title="E-Wallet Detection" subtitle="Detect e-wallets linked to phone" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-green-600 hover:bg-green-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Detecting e-wallet accounts" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Detected Wallets</div><div className="text-2xl font-bold text-green-400">{result.detectedCount}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Risk Level</div><SeverityBadge severity={result.riskLevel} /></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Carrier</div><div className="text-sm font-medium">{result.analysis?.carrier || 'N/A'}</div></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {result.wallets?.map(w => (
              <div key={w.platform} className={`p-3 rounded-lg border text-center transition-all ${w.detected ? 'border-green-500/40 bg-green-500/10' : 'border-border/30 bg-card/20'}`}>
                <span className="text-2xl block">{w.icon}</span>
                <div className="text-xs font-medium mt-1">{w.platform}</div>
                {w.detected ? (
                  <div>
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[9px] mt-1">Detected</Badge>
                    {w.accountName && <div className="text-[10px] text-muted-foreground mt-1">{w.accountName}</div>}
                  </div>
                ) : <Badge variant="outline" className="text-[9px] mt-1 text-muted-foreground">Not Found</Badge>}
              </div>
            ))}
          </div>
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div></CardContent>
            </Card>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
