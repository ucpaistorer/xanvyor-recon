'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  User,
  Fingerprint,
  Scan,
  Loader2,
  CheckCircle2,
  Target,
  FileSearch,
  AlertTriangle,
  ExternalLink,
  Check,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, StatusBadge } from './shared';

interface UsernamePlatform { name: string; icon: string; profileUrl: string; status: string; category: string; }

interface UsernameResult { platforms: UsernamePlatform[]; likelyFound: number; totalChecked: number; foundByCategory: Record<string, number>; searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>; breachResults: Array<{ url: string; title: string; snippet: string; domain: string }>; aiAnalysis: string; }


export function UsernameModule() {
  const [username, setUsername] = useState('');
  const { loading, result, error, search } = useOSINTSearch<UsernameResult>();

  const doSearch = useCallback(() => {
    if (!username.trim()) return;
    search('/api/osint/username', { username: username.trim() });
  }, [username, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<User className="w-5 h-5" />} color="from-cyan-500 to-blue-500" title="Username Hunter" subtitle="Search username across 44+ platforms" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter username to hunt..." value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Hunt'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Scanning "${username}" across 44+ platforms`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">{result.likelyFound} likely found</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Target className="w-4 h-4" /><span className="text-sm">{result.totalChecked} platforms checked</span></div>
          </div>
          <Progress value={(result.likelyFound / result.totalChecked) * 100} className="h-2" />
          {Object.keys(result.foundByCategory || {}).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.foundByCategory).map(([cat, count]) => (
                <Badge key={cat} className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">{cat}: {count}</Badge>
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {result.platforms?.map(p => (
              <motion.div key={p.name} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${p.status === 'likely_found' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-border/30 bg-card/30'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-lg">{p.icon}</span>
                  <div><div className="text-sm font-medium">{p.name}</div><div className="text-[10px] text-muted-foreground">{p.category}</div></div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={p.status} />
                  <a href={p.profileUrl} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3 h-3" /></a>
                </div>
              </motion.div>
            ))}
          </div>
          <Tabs defaultValue="search">
            <TabsList className="bg-card/50">
              <TabsTrigger value="search" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><FileSearch className="w-3 h-3 mr-1" />Web ({result.searchResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="breaches" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Breaches ({result.breachResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="breaches" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.breachResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
