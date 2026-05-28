'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  Search,
  Loader2,
  Database,
  FileSearch,
  Users,
  Sparkles,
  User,
  AlertTriangle,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink, AIAnalysisCard } from './shared';

interface SchoolResult {
  success: boolean; query: string; searchType: string;
  schoolInfo?: { name: string; npsn: string; address: string; level: string; status: string };
  studentInfo?: { name: string; school: string; class: string; nisn: string };
  schoolRecords: Array<{ url: string; title: string; snippet: string; domain: string }>;
  studentRecords: Array<{ url: string; title: string; snippet: string; domain: string }>;
  npsnResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dapodikResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  socialResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  achievementResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}


export function SchoolModule() {
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'school' | 'student'>('school');
  const { loading, result, error, search } = useOSINTSearch<SchoolResult>();

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    search('/api/osint/school', { query: query.trim(), type: searchType });
  }, [query, searchType, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<GraduationCap className="w-5 h-5" />} color="from-blue-500 to-indigo-500" title="School Intel" subtitle="Indonesian school/student OSINT" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter school or student name..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <select value={searchType} onChange={e => setSearchType(e.target.value as 'school' | 'student')} className="bg-card/50 border border-border/50 rounded-md px-3 py-2 text-sm">
          <option value="school">School</option>
          <option value="student">Student</option>
        </select>
        <Button onClick={doSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4 mr-2" />}{loading ? 'Searching' : 'Search'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Searching ${searchType} data for "${query}"`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.schoolInfo && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><div className="text-xs text-muted-foreground">Name</div><div className="text-sm font-medium">{result.schoolInfo.name}</div></div>
                  <div><div className="text-xs text-muted-foreground">NPSN</div><div className="text-sm font-mono">{result.schoolInfo.npsn}</div></div>
                  <div><div className="text-xs text-muted-foreground">Level</div><div className="text-sm font-medium">{result.schoolInfo.level}</div></div>
                  <div><div className="text-xs text-muted-foreground">Address</div><div className="text-sm font-medium">{result.schoolInfo.address}</div></div>
                  <div><div className="text-xs text-muted-foreground">Status</div><div className="text-sm font-medium">{result.schoolInfo.status}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.studentInfo && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">Name</div><div className="text-sm font-medium">{result.studentInfo.name}</div></div>
                  <div><div className="text-xs text-muted-foreground">School</div><div className="text-sm font-medium">{result.studentInfo.school}</div></div>
                  <div><div className="text-xs text-muted-foreground">Class</div><div className="text-sm font-medium">{result.studentInfo.class}</div></div>
                  <div><div className="text-xs text-muted-foreground">NISN</div><div className="text-sm font-mono">{result.studentInfo.nisn}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="records">
            <TabsList className="bg-card/50">
              <TabsTrigger value="records" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400"><Database className="w-3 h-3 mr-1" />Records ({(result.schoolRecords?.length || 0) + (result.studentRecords?.length || 0)})</TabsTrigger>
              <TabsTrigger value="npsn" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"><Search className="w-3 h-3 mr-1" />NPSN ({result.npsnResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="dapodik" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><FileSearch className="w-3 h-3 mr-1" />Dapodik ({result.dapodikResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Users className="w-3 h-3 mr-1" />Social ({result.socialResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="achieve" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Sparkles className="w-3 h-3 mr-1" />Awards ({result.achievementResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="records" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{[...(result.schoolRecords || []), ...(result.studentRecords || [])].map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="npsn" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.npsnResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="dapodik" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.dapodikResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="achieve" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.achievementResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}
