'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Mail,
  Search,
  Loader2,
  Eye,
  Users,
  AlertTriangle,
  User,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface EmailResult {
  analysis: { email: string; username: string; domain: string; providerType: string; providerCountry: string; providerRisk: string; isCommonDomain: boolean; isDisposable: boolean; usernamePatterns: string[] };
  linkedAccounts: Array<{ platform: string; icon: string; category: string; detected: boolean; confidence: string }>;
  detectedBreaches: Array<{ type: string; severity: string; source: string; description: string; url: string; fromKnownSource: boolean }>;
  ktpLeaks: Array<{ type: string; severity: string; description: string; source: string; url: string }>;
  emailExposure: Array<{ url: string; title: string; snippet: string; domain: string; date: string }>;
  socialAccounts: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function EmailModule() {
  const [email, setEmail] = useState('');
  const { loading, result, error, search } = useOSINTSearch<EmailResult>();

  const doSearch = useCallback(() => {
    if (!email.trim()) return;
    search('/api/osint/email', { email: email.trim() });
  }, [email, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Mail className="w-5 h-5" />} color="from-amber-500 to-orange-500" title="Email Intelligence" subtitle="Analyze email exposure, breaches & linked accounts" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter email address..." value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Analyzing' : 'Analyze'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Analyzing email exposure and breach data" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.analysis && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div><div className="text-xs text-muted-foreground">Email</div><div className="text-sm font-medium font-mono truncate">{result.analysis.email}</div></div>
                  <div><div className="text-xs text-muted-foreground">Username</div><div className="text-sm font-medium font-mono">{result.analysis.username}</div></div>
                  <div><div className="text-xs text-muted-foreground">Domain</div><div className="text-sm font-medium font-mono">{result.analysis.domain}</div></div>
                  <div><div className="text-xs text-muted-foreground">Provider</div><div className="text-sm font-medium">{result.analysis.providerType}</div></div>
                  <div><div className="text-xs text-muted-foreground">Country</div><div className="text-sm font-medium">{result.analysis.providerCountry}</div></div>
                  <div><div className="text-xs text-muted-foreground">Risk</div><SeverityBadge severity={result.analysis.providerRisk} /></div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {result.analysis.isCommonDomain && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Common Provider</Badge>}
                  {result.analysis.isDisposable && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Disposable Email</Badge>}
                  {result.analysis.usernamePatterns?.map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
          {result.linkedAccounts?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-amber-400" /> Linked Accounts ({result.linkedAccounts.filter(a => a.detected).length}/{result.linkedAccounts.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {result.linkedAccounts.map(acc => (
                  <div key={acc.platform} className={`p-2.5 rounded-lg border text-center transition-all ${acc.detected ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/30 bg-card/20'}`}>
                    <span className="text-xl block">{acc.icon}</span>
                    <div className="text-xs font-medium mt-1">{acc.platform}</div>
                    {acc.detected ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] mt-1">Detected</Badge> : <Badge variant="outline" className="text-[9px] mt-1 text-muted-foreground">Not Found</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <Tabs defaultValue="exposure">
            <TabsList className="bg-card/50">
              <TabsTrigger value="exposure" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Eye className="w-3 h-3 mr-1" />Exposure ({result.emailExposure?.length || 0})</TabsTrigger>
              <TabsTrigger value="breaches" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Breaches ({result.detectedBreaches?.length || 0})</TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Users className="w-3 h-3 mr-1" />Social ({result.socialAccounts?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="exposure" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.emailExposure?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="breaches" className="mt-3">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.detectedBreaches?.map((b, i) => (
                  <div key={i} className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                    <div className="flex items-center gap-2"><SeverityBadge severity={b.severity} /><span className="text-sm font-medium">{b.type}</span></div>
                    <p className="text-xs text-muted-foreground mt-1">{b.description}</p>
                  </div>
                ))}
                {(!result.detectedBreaches || result.detectedBreaches.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No known breaches detected from search results.</p>}
              </div>
            </TabsContent>
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialAccounts?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
