'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  UserSearch,
  MapPin,
  Loader2,
  Users,
  FileSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, StatusBadge } from './shared';

interface PeopleResult {
  success: boolean; name: string;
  profiles: Array<{ platform: string; url: string; snippet: string; confidence: number }>;
  associatedNames: string[]; locations: string[];
  socialAccounts: Array<{ platform: string; url: string; confidence: string }>;
  newsResults: Array<{ title: string; snippet: string; url: string; domain: string; date: string }>;
  aiAnalysis: string;
}


export function PeopleModule() {
  const [name, setName] = useState('');
  const [loc, setLoc] = useState('');
  const { loading, result, error, search } = useOSINTSearch<PeopleResult>();

  const doSearch = useCallback(() => {
    if (!name.trim()) return;
    search('/api/osint/people', { name: name.trim(), location: loc.trim() });
  }, [name, loc, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<UserSearch className="w-5 h-5" />} color="from-teal-500 to-emerald-500" title="People Search" subtitle="Find people across the web" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <UserSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter full name..." value={name} onChange={e => setName(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Location (optional)..." value={loc} onChange={e => setLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserSearch className="w-4 h-4 mr-2" />}{loading ? 'Searching' : 'Search'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Searching for "${name}"`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-teal-500/30 bg-teal-500/5">
            <CardContent className="p-4">
              <div className="text-lg font-bold mb-2">{result.name}</div>
              {result.associatedNames?.length > 0 && <div className="flex flex-wrap gap-1 mb-2">{result.associatedNames.map((n, i) => <Badge key={i} variant="outline" className="text-xs">{n}</Badge>)}</div>}
              {result.locations?.length > 0 && <div className="flex flex-wrap gap-1">{result.locations.map((l, i) => <Badge key={i} className="bg-teal-500/20 text-teal-400 border-teal-500/30 text-xs"><MapPin className="w-3 h-3 mr-1" />{l}</Badge>)}</div>}
            </CardContent>
          </Card>
          {result.profiles?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Profiles ({result.profiles.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {result.profiles.map((p, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/30 bg-card/30">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{p.platform}</span>
                      <StatusBadge status={p.confidence > 0.7 ? 'likely_found' : p.confidence < 0.5 ? 'not_found' : 'unknown'} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.snippet}</p>
                    <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:underline mt-1 inline-block truncate max-w-full">{p.url}</a>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Tabs defaultValue="social">
            <TabsList className="bg-card/50">
              <TabsTrigger value="social" className="data-[state=active]:bg-teal-500/20 data-[state=active]:text-teal-400"><Users className="w-3 h-3 mr-1" />Social ({result.socialAccounts?.length || 0})</TabsTrigger>
              <TabsTrigger value="news" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><FileSearch className="w-3 h-3 mr-1" />News ({result.newsResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialAccounts?.map((r, i) => (
                  <div key={i} className="p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all group">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{r.platform}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">{r.confidence}</Badge>
                    </div>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs text-teal-400 hover:underline mt-1 inline-block truncate max-w-full">{r.url}</a>
                  </div>
                ))}</div></TabsContent>
            <TabsContent value="news" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.newsResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
