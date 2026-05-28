'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Loader2,
  AlertTriangle,
  User,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard, SeverityBadge } from './shared';

interface SocialResult {
  success: boolean; username: string;
  profiles: Array<{ platform: string; icon: string; url: string; detected: boolean; category: string; confidence: string }>;
  detectedCount: number; totalChecked: number;
  profileDetails: Array<{ platform: string; bio: string; followers: number; following: number; posts: number; verified: boolean; accountAge: string }>;
  linkedAccounts: string[];
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  digitalFootprint: { score: number; riskLevel: string; exposureLevel: string };
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function SocialModule() {
  const [username, setUsername] = useState('');
  const { loading, result, error, search } = useOSINTSearch<SocialResult>();

  const doSearch = useCallback(() => {
    if (!username.trim()) return;
    search('/api/osint/social', { username: username.trim() });
  }, [username, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Users className="w-5 h-5" />} color="from-pink-500 to-fuchsia-500" title="Social Media Scanner" subtitle="Deep social media scan" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter username to scan..." value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Users className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Deep scanning "${username}" on social media`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Detected</div><div className="text-2xl font-bold text-pink-400">{result.detectedCount}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Checked</div><div className="text-2xl font-bold">{result.totalChecked}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Footprint Score</div><div className="text-2xl font-bold text-fuchsia-400">{result.digitalFootprint?.score || 0}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Exposure</div><SeverityBadge severity={result.digitalFootprint?.riskLevel || 'low'} /></div>
          </div>
          {result.profiles?.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {result.profiles.map(p => (
                <div key={p.platform} className={`p-3 rounded-lg border text-center transition-all ${p.detected ? 'border-pink-500/40 bg-pink-500/10' : 'border-border/30 bg-card/20'}`}>
                  <span className="text-xl block">{p.icon}</span>
                  <div className="text-xs font-medium mt-1">{p.platform}</div>
                  {p.detected ? (
                    <div>
                      <Badge className="bg-pink-500/20 text-pink-400 border-pink-500/30 text-[9px] mt-1">Detected</Badge>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-[9px] text-pink-400 hover:underline block mt-0.5">View</a>
                    </div>
                  ) : <Badge variant="outline" className="text-[9px] mt-1 text-muted-foreground">Not Found</Badge>}
                </div>
              ))}
            </div>
          )}
          {result.profileDetails?.length > 0 && (
            <Card className="border-fuchsia-500/30 bg-fuchsia-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-fuchsia-400"><Users className="w-4 h-4" />Profile Details</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.profileDetails.map((p, i) => (
                    <div key={i} className="flex items-center justify-between p-2 rounded border border-border/20 bg-card/30">
                      <div><div className="text-sm font-medium">{p.platform} {p.verified && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] ml-1">✓ Verified</Badge>}</div><div className="text-xs text-muted-foreground line-clamp-1">{p.bio}</div></div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {p.followers > 0 && <span>{p.followers.toLocaleString()} followers</span>}
                        {p.posts > 0 && <span>{p.posts} posts</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div></CardContent>
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
