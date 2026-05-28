'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CreditCard,
  Scan,
  Loader2,
  CheckCircle2,
  XCircle,
  MapPin,
  Database,
  FileSearch,
  AlertTriangle,
  Check,
  X,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface NikResult {
  success: boolean; nik: string;
  decoded: { nik: string; birthDate: string; gender: string; areaCode: string; province: string; city: string; subdistrict: string; kkNumber: string; nikValid: boolean; validationNotes: string };
  areaInfo: Array<{ url: string; title: string; snippet: string; domain: string }>;
  publicData: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  kkData: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function NikModule() {
  const [nik, setNik] = useState('');
  const { loading, result, error, search } = useOSINTSearch<NikResult>();

  const doSearch = useCallback(() => {
    if (!nik.trim()) return;
    search('/api/osint/nik', { nik: nik.trim() });
  }, [nik, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<CreditCard className="w-5 h-5" />} color="from-amber-500 to-yellow-500" title="NIK Decoder" subtitle="Decode Indonesian NIK number" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter 16-digit NIK number..." value={nik} onChange={e => setNik(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Decoding' : 'Decode'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Decoding NIK ${nik}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.decoded && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-mono font-bold">{result.nik}</div>
                  {result.decoded.nikValid ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Valid</Badge> : <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Invalid</Badge>}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><div className="text-xs text-muted-foreground">Birth Date</div><div className="text-sm font-medium">{result.decoded.birthDate}</div></div>
                  <div><div className="text-xs text-muted-foreground">Gender</div><div className="text-sm font-medium">{result.decoded.gender}</div></div>
                  <div><div className="text-xs text-muted-foreground">Province</div><div className="text-sm font-medium">{result.decoded.province}</div></div>
                  <div><div className="text-xs text-muted-foreground">City</div><div className="text-sm font-medium">{result.decoded.city}</div></div>
                  <div><div className="text-xs text-muted-foreground">Subdistrict</div><div className="text-sm font-medium">{result.decoded.subdistrict}</div></div>
                  <div><div className="text-xs text-muted-foreground">Area Code</div><div className="text-sm font-mono">{result.decoded.areaCode}</div></div>
                </div>
                {result.decoded.validationNotes && <div className="text-xs text-muted-foreground mt-2">{result.decoded.validationNotes}</div>}
              </CardContent>
            </Card>
          )}
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div>
              </CardContent>
            </Card>
          )}
          <Tabs defaultValue="area">
            <TabsList className="bg-card/50">
              <TabsTrigger value="area" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><MapPin className="w-3 h-3 mr-1" />Area ({result.areaInfo?.length || 0})</TabsTrigger>
              <TabsTrigger value="public" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Database className="w-3 h-3 mr-1" />Public ({result.publicData?.length || 0})</TabsTrigger>
              <TabsTrigger value="kk" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"><FileSearch className="w-3 h-3 mr-1" />KK ({result.kkData?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="area" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.areaInfo?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="public" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.publicData?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="kk" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.kkData?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
