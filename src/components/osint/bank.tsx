'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Building2,
  Loader2,
  AlertTriangle,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface BankResult {
  success: boolean; accountNumber: string; bankCode: string;
  analysis: { bank: string; type: string; riskLevel: string; fraudReports: number };
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  fraudAlerts: Array<{ type: string; severity: string; description: string }>;
  alertCount: number; aiAnalysis: string;
}


export function BankModule() {
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');
  const { loading, result, error, search } = useOSINTSearch<BankResult>();

  const doSearch = useCallback(() => {
    if (!accountNumber.trim()) return;
    search('/api/osint/bank', { accountNumber: accountNumber.trim(), bankCode: bankCode.trim() });
  }, [accountNumber, bankCode, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Building2 className="w-5 h-5" />} color="from-yellow-500 to-amber-500" title="Bank Account Check" subtitle="Verify bank account & fraud check" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter account number..." value={accountNumber} onChange={e => setAccountNumber(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Input placeholder="Bank code (optional)" value={bankCode} onChange={e => setBankCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="bg-card/50 border-border/50" />
        <Button onClick={doSearch} disabled={loading} className="bg-yellow-600 hover:bg-yellow-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Building2 className="w-4 h-4 mr-2" />}{loading ? 'Checking' : 'Check'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Checking bank account" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-xs text-muted-foreground">Account</div><div className="text-sm font-mono font-medium">{result.accountNumber}</div></div>
                <div><div className="text-xs text-muted-foreground">Bank</div><div className="text-sm font-medium">{result.analysis?.bank || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.analysis?.type || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Risk</div><SeverityBadge severity={result.analysis?.riskLevel || 'low'} /></div>
              </div>
            </CardContent>
          </Card>
          {result.alertCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Fraud Alerts ({result.alertCount})</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.fraudAlerts?.map((a, i) => <div key={i} className="text-xs text-muted-foreground"><SeverityBadge severity={a.severity} /> {a.description}</div>)}</div></CardContent>
            </Card>
          )}
          {result.searchResults?.length > 0 && (
            <div><h3 className="text-sm font-semibold mb-2">Search Results</h3><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults.map((r, i) => <ResultLink key={i} {...r} />)}</div></div>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
