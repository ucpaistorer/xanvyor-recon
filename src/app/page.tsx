'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Mail, Globe, Phone, Shield, Eye, Brain,
  Wifi, Server, ExternalLink, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle, Loader2, Send, Image as ImageIcon,
  MapPin, Key, Activity, Database, Radar, Fingerprint, Network,
  ArrowRight, Layers, Zap, Target, Scan, FileSearch,
  Cpu, Lock, Unlock,
  Home, ChevronLeft, ChevronRight, Menu, X, Sparkles,
  ShieldAlert, ShieldCheck, ShieldX, ShieldQuestion,
  Users, Bug, Globe2, CloudOff, Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import ReactMarkdown from 'react-markdown';

// ============================================================
// Types
// ============================================================
type ModuleType = 'dashboard' | 'username' | 'email' | 'ip' | 'domain' | 'phone' | 'websearch' | 'image' | 'aichat' | 'dns';

interface Module {
  id: ModuleType;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

const MODULES: Module[] = [
  { id: 'dashboard', name: 'Command Center', icon: <Home className="w-4 h-4" />, description: 'Overview & Stats', color: 'from-emerald-500 to-teal-500' },
  { id: 'username', name: 'Username Hunter', icon: <User className="w-4 h-4" />, description: 'Cross-platform search', color: 'from-cyan-500 to-blue-500' },
  { id: 'email', name: 'Email Intel', icon: <Mail className="w-4 h-4" />, description: 'Email intelligence', color: 'from-amber-500 to-orange-500' },
  { id: 'ip', name: 'IP Recon', icon: <Globe className="w-4 h-4" />, description: 'IP geolocation & threat', color: 'from-rose-500 to-red-500' },
  { id: 'domain', name: 'Domain Intel', icon: <Server className="w-4 h-4" />, description: 'WHOIS & domain analysis', color: 'from-violet-500 to-purple-500' },
  { id: 'phone', name: 'Phone Trace', icon: <Phone className="w-4 h-4" />, description: 'Phone number intelligence', color: 'from-pink-500 to-rose-500' },
  { id: 'websearch', name: 'Web Intel', icon: <Search className="w-4 h-4" />, description: 'AI-powered web search', color: 'from-emerald-500 to-green-500' },
  { id: 'image', name: 'Image Forensics', icon: <ImageIcon className="w-4 h-4" />, description: 'VLM image analysis', color: 'from-sky-500 to-indigo-500' },
  { id: 'dns', name: 'DNS Recon', icon: <Network className="w-4 h-4" />, description: 'DNS enumeration', color: 'from-lime-500 to-green-500' },
  { id: 'aichat', name: 'RECON-AI', icon: <Brain className="w-4 h-4" />, description: 'OSINT AI assistant', color: 'from-fuchsia-500 to-pink-500' },
];

// ============================================================
// Shared Components
// ============================================================
function StatusBadge({ status }: { status: string }) {
  if (status === 'likely_found') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Likely Found</Badge>;
  if (status === 'not_found') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"><XCircle className="w-3 h-3 mr-1" />Not Found</Badge>;
  return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"><HelpCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
}

function SafetyStatusBadge({ status }: { status: string }) {
  const s = status?.toLowerCase() || 'unknown';
  if (s === 'safe') return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/40">
      <ShieldCheck className="w-6 h-6 text-emerald-400" />
      <span className="text-lg font-bold text-emerald-400">SAFE</span>
    </div>
  );
  if (s === 'suspicious') return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/15 border-2 border-amber-500/40">
      <AlertTriangle className="w-6 h-6 text-amber-400" />
      <span className="text-lg font-bold text-amber-400">SUSPICIOUS</span>
    </div>
  );
  if (s === 'dangerous') return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border-2 border-red-500/40 animate-pulse">
      <ShieldX className="w-6 h-6 text-red-400" />
      <span className="text-lg font-bold text-red-400">DANGEROUS</span>
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-500/15 border-2 border-gray-500/40">
      <ShieldQuestion className="w-6 h-6 text-gray-400" />
      <span className="text-lg font-bold text-gray-400">UNKNOWN</span>
    </div>
  );
}

function ThreatLevelBadge({ level }: { level: string }) {
  const l = level?.toLowerCase() || 'low';
  if (l === 'critical') return <Badge className="bg-red-600/20 text-red-400 border-red-600/40 text-sm px-3 py-1"><ShieldAlert className="w-4 h-4 mr-1" />CRITICAL</Badge>;
  if (l === 'high') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-sm px-3 py-1"><AlertTriangle className="w-4 h-4 mr-1" />HIGH</Badge>;
  if (l === 'medium') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-sm px-3 py-1"><AlertTriangle className="w-3 h-3 mr-1" />MEDIUM</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-sm px-3 py-1"><CheckCircle2 className="w-3 h-3 mr-1" />LOW</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() || 'low';
  if (s === 'critical') return <Badge className="bg-red-600/20 text-red-400 border-red-600/30 text-xs">CRITICAL</Badge>;
  if (s === 'high') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">HIGH</Badge>;
  if (s === 'medium') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">MEDIUM</Badge>;
  return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">LOW</Badge>;
}

function ReputationBadge({ reputation }: { reputation: string }) {
  const r = reputation?.toLowerCase() || 'unknown';
  if (r === 'safe') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1"><ShieldCheck className="w-3 h-3 mr-1" />Safe</Badge>;
  if (r === 'suspicious') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-sm px-3 py-1"><AlertTriangle className="w-3 h-3 mr-1" />Suspicious</Badge>;
  if (r === 'dangerous') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-sm px-3 py-1"><ShieldX className="w-3 h-3 mr-1" />Dangerous</Badge>;
  return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-sm px-3 py-1"><HelpCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
}

function AIAnalysisCard({ analysis, isLoading }: { analysis: string; isLoading: boolean }) {
  if (isLoading) return (
    <Card className="border-border/50 bg-card/50 backdrop-blur">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>AI analyzing intelligence data...</span>
        </div>
      </CardContent>
    </Card>
  );
  if (!analysis) return null;
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-400">
          <Brain className="w-4 h-4" /> AI Intelligence Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="prose prose-invert prose-sm max-w-none text-muted-foreground">
        <ReactMarkdown>{analysis}</ReactMarkdown>
      </CardContent>
    </Card>
  );
}

function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Please try again in a moment. Rate limits may apply for frequent requests.</p>
      </CardContent>
    </Card>
  );
}

function LoadingIndicator({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">{message}</p>
        <p className="text-xs text-muted-foreground mt-1">This may take a moment due to AI analysis...</p>
      </div>
    </div>
  );
}

function ResultCard({ title, snippet, url, date, domain }: { title: string; snippet: string; url: string; date?: string; domain?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-emerald-400 transition-colors flex items-center gap-1">
            <span className="truncate">{title}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </a>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{snippet}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {domain && <Badge variant="outline" className="text-[10px] px-1.5 py-0">{domain}</Badge>}
          {date && <span className="text-[10px] text-muted-foreground">{date}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================
// Dashboard Module
// ============================================================
function DashboardModule() {
  const stats = [
    { label: 'Tools Available', value: '10+', icon: <Layers className="w-5 h-5" />, color: 'text-emerald-400' },
    { label: 'AI Engines', value: '4', icon: <Cpu className="w-5 h-5" />, color: 'text-cyan-400' },
    { label: 'Data Sources', value: '100+', icon: <Database className="w-5 h-5" />, color: 'text-amber-400' },
    { label: 'Real-time', value: 'Yes', icon: <Activity className="w-5 h-5" />, color: 'text-rose-400' },
  ];

  const capabilities = [
    { icon: <Fingerprint className="w-5 h-5" />, title: 'Username Intelligence', desc: 'Search 44+ platforms for username presence and digital footprint mapping' },
    { icon: <Mail className="w-5 h-5" />, title: 'Email Reconnaissance', desc: 'Analyze email exposure, breach data, linked accounts, and KTP leak detection' },
    { icon: <Globe className="w-5 h-5" />, title: 'IP Geolocation', desc: 'VPN/proxy/Tor detection, threat assessment, port scanning, and blacklist checking' },
    { icon: <Server className="w-5 h-5" />, title: 'Domain Intelligence', desc: 'WHOIS lookup, subdomain enumeration, tech fingerprinting, and reputation assessment' },
    { icon: <Phone className="w-5 h-5" />, title: 'Phone Number OSINT', desc: 'Safety status, registered services detection, data leak alerts, and carrier mapping' },
    { icon: <Search className="w-5 h-5" />, title: 'Web Intelligence', desc: 'AI-powered deep web search with automatic intelligence analysis' },
    { icon: <ImageIcon className="w-5 h-5" />, title: 'Image Forensics', desc: 'VLM-powered image analysis for geolocation, EXIF data, and visual intelligence' },
    { icon: <Network className="w-5 h-5" />, title: 'DNS Reconnaissance', desc: 'DNSSEC check, SPF/DKIM/DMARC assessment, and email security scoring' },
    { icon: <Brain className="w-5 h-5" />, title: 'RECON-AI Assistant', desc: 'Conversational OSINT AI for analysis guidance and intelligence synthesis' },
    { icon: <Radar className="w-5 h-5" />, title: 'Threat Intelligence', desc: 'Real-time threat assessment powered by AI across all modules' },
  ];

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-cyan-500/10 p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
              <Shield className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight">OSINT Reconnaissance Platform</h2>
              <p className="text-sm text-muted-foreground">Advanced Open Source Intelligence Gathering & Analysis</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mt-2">
            Powered by AI-driven analysis engines including Web Search Intelligence, Vision Language Models,
            and Large Language Models. All tools provide real-time OSINT capabilities with automated intelligence reporting.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><Activity className="w-3 h-3 mr-1" /> All Systems Operational</Badge>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30"><Zap className="w-3 h-3 mr-1" /> AI-Powered</Badge>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Lock className="w-3 h-3 mr-1" /> Secure</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur">
            <div className={`${stat.color} mb-2`}>{stat.icon}</div>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Radar className="w-5 h-5 text-emerald-400" /> Intelligence Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {capabilities.map((cap, i) => (
            <motion.div key={cap.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-card/30 hover:bg-card/60 hover:border-emerald-500/30 transition-all group">
              <div className="text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform">{cap.icon}</div>
              <div>
                <h4 className="text-sm font-medium group-hover:text-emerald-400 transition-colors">{cap.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{cap.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Cpu className="w-5 h-5 text-cyan-400" /> AI Analysis Engines</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { name: 'Web Search', icon: <Search className="w-5 h-5 text-emerald-400" />, desc: 'Real-time web intelligence', status: 'Active' },
            { name: 'VLM Vision', icon: <Eye className="w-5 h-5 text-cyan-400" />, desc: 'Visual intelligence analysis', status: 'Active' },
            { name: 'LLM Analysis', icon: <Brain className="w-5 h-5 text-amber-400" />, desc: 'Deep reasoning & synthesis', status: 'Active' },
            { name: 'Image Gen', icon: <Sparkles className="w-5 h-5 text-rose-400" />, desc: 'Report visualization', status: 'Standby' },
          ].map((engine) => (
            <div key={engine.name} className="p-3 rounded-lg border border-border/30 bg-card/30">
              <div className="flex items-center justify-between mb-2">
                {engine.icon}
                <Badge variant="outline" className={`text-[10px] ${engine.status === 'Active' ? 'text-emerald-400 border-emerald-500/30' : 'text-amber-400 border-amber-500/30'}`}>{engine.status}</Badge>
              </div>
              <div className="text-sm font-medium">{engine.name}</div>
              <div className="text-xs text-muted-foreground">{engine.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Username Hunter Module
// ============================================================
interface UsernamePlatform { name: string; icon: string; profileUrl: string; status: string; category: string; }
interface UsernameResult { platforms: UsernamePlatform[]; likelyFound: number; totalChecked: number; foundByCategory: Record<string, number>; associatedIdentities: Array<{ title: string; snippet: string; url: string; source: string }>; searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>; breachResults: Array<{ url: string; title: string; snippet: string; domain: string }>; aiAnalysis: string; }

function UsernameModule() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UsernameResult | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (!username.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/username', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim() }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data as UsernameResult); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [username]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30"><User className="w-5 h-5 text-cyan-400" /></div>
        <div><h2 className="text-xl font-bold">Username Hunter</h2><p className="text-sm text-muted-foreground">Search username across 44+ social platforms</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter username to hunt..." value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={search} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Hunt'}
        </Button>
      </div>

      {loading && <LoadingIndicator message={`Scanning "${username}" across 44+ platforms...`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="w-4 h-4" /><span className="text-sm font-medium">{result.likelyFound} likely found</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Target className="w-4 h-4" /><span className="text-sm">{result.totalChecked} platforms checked</span></div>
          </div>
          <Progress value={(result.likelyFound / result.totalChecked) * 100} className="h-2" />

          {/* Found by Category */}
          {Object.keys(result.foundByCategory || {}).length > 0 && (
            <div className="flex flex-wrap gap-2">
              {Object.entries(result.foundByCategory).map(([cat, count]) => (
                <Badge key={cat} className="bg-cyan-500/15 text-cyan-400 border-cyan-500/30">{cat}: {count}</Badge>
              ))}
            </div>
          )}

          {/* Platform Results */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {result.platforms?.map((p) => (
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
            <TabsList className="bg-card/50 flex-wrap">
              <TabsTrigger value="search" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><FileSearch className="w-3 h-3 mr-1" /> Web Results ({result.searchResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="identities" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Users className="w-3 h-3 mr-1" /> Identities ({result.associatedIdentities?.length || 0})</TabsTrigger>
              <TabsTrigger value="breaches" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" /> Breaches ({result.breachResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="identities" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">
              {result.associatedIdentities?.map((id, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg border border-violet-500/30 bg-violet-500/5">
                  <div className="flex items-start justify-between gap-2">
                    <div><div className="text-sm font-medium">{id.title}</div><p className="text-xs text-muted-foreground mt-1">{id.snippet}</p></div>
                    {id.url && <a href={id.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3 h-3" /></a>}
                  </div>
                  {id.source && <Badge variant="outline" className="text-[10px] mt-1">{id.source}</Badge>}
                </motion.div>
              ))}
              {(!result.associatedIdentities || result.associatedIdentities.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No associated identities found.</p>}
            </div></TabsContent>
            <TabsContent value="breaches" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.breachResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
          </Tabs>

          <AIAnalysisCard analysis={result.aiAnalysis || ''} isLoading={false} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Email Intelligence Module
// ============================================================
interface EmailLinkedAccount { platform: string; icon: string; category: string; detected: boolean; confidence: string; }
interface EmailBreach { type: string; severity: string; source: string; description: string; url: string; fromKnownSource: boolean; }
interface EmailKtpLeak { type: string; severity: string; description: string; source: string; url: string; }
interface EmailResult { analysis: { email: string; username: string; domain: string; providerType: string; providerCountry: string; providerRisk: string; isCommonDomain: boolean; isDisposable: boolean; usernamePatterns: string[] }; linkedAccounts: EmailLinkedAccount[]; detectedBreaches: EmailBreach[]; breachCount: number; ktpLeaks: EmailKtpLeak[]; ktpLeakCount: number; emailExposure: Array<{ url: string; title: string; snippet: string; domain: string; date: string }>; domainInfo: Array<{ url: string; title: string; snippet: string }>; socialAccounts: Array<{ url: string; title: string; snippet: string; domain: string }>; aiAnalysis: string; }

function EmailModule() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<EmailResult | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (!email.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim() }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data as EmailResult); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [email]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30"><Mail className="w-5 h-5 text-amber-400" /></div>
        <div><h2 className="text-xl font-bold">Email Intelligence</h2><p className="text-sm text-muted-foreground">Analyze email exposure, breaches & linked accounts</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter email address..." value={email} onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={search} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Analyzing' : 'Analyze'}
        </Button>
      </div>

      {loading && <LoadingIndicator message="Analyzing email exposure and breach data..." />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Provider Analysis Card */}
          {result.analysis && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <div><div className="text-xs text-muted-foreground">Email</div><div className="text-sm font-medium font-mono truncate">{result.analysis.email}</div></div>
                  <div><div className="text-xs text-muted-foreground">Username</div><div className="text-sm font-medium font-mono">{result.analysis.username}</div></div>
                  <div><div className="text-xs text-muted-foreground">Domain</div><div className="text-sm font-medium font-mono">{result.analysis.domain}</div></div>
                  <div><div className="text-xs text-muted-foreground">Provider</div><div className="text-sm font-medium">{result.analysis.providerType}</div></div>
                  <div><div className="text-xs text-muted-foreground">Country</div><div className="text-sm font-medium">{result.analysis.providerCountry}</div></div>
                  <div><div className="text-xs text-muted-foreground">Risk</div><Badge variant="outline" className={`${result.analysis.providerRisk === 'low' ? 'text-emerald-400 border-emerald-500/30' : result.analysis.providerRisk === 'medium' ? 'text-amber-400 border-amber-500/30' : 'text-red-400 border-red-500/30'}`}>{result.analysis.providerRisk.toUpperCase()}</Badge></div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  {result.analysis.isCommonDomain && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">Common Provider</Badge>}
                  {result.analysis.isDisposable && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">Disposable Email</Badge>}
                  {result.analysis.usernamePatterns?.map((p) => <Badge key={p} variant="outline" className="text-[10px]">{p}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KTP Leak Warning */}
          {result.ktpLeakCount > 0 && (
            <Card className="border-red-600/50 bg-red-600/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-5 h-5 text-red-400" />
                  <span className="text-sm font-bold text-red-400">IDENTITY DOCUMENT LEAKS DETECTED: {result.ktpLeakCount}</span>
                </div>
                <div className="space-y-2">
                  {result.ktpLeaks.map((leak, i) => (
                    <div key={i} className="p-2 rounded-lg border border-red-500/30 bg-red-500/5">
                      <div className="flex items-center gap-2"><SeverityBadge severity={leak.severity} /><span className="text-sm font-medium">{leak.type}</span></div>
                      <p className="text-xs text-muted-foreground mt-1">{leak.description}</p>
                      {leak.url && <a href={leak.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-red-400 hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-2 h-2" />{leak.source}</a>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Linked Accounts Grid */}
          {result.linkedAccounts && result.linkedAccounts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4 text-amber-400" /> Linked Accounts ({result.linkedAccounts.filter(a => a.detected).length}/{result.linkedAccounts.length} detected)</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {result.linkedAccounts.map((acc) => (
                  <div key={acc.platform} className={`p-2.5 rounded-lg border text-center transition-all ${acc.detected ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/30 bg-card/20'}`}>
                    <span className="text-xl block">{acc.icon}</span>
                    <div className="text-xs font-medium mt-1">{acc.platform}</div>
                    <div className="text-[9px] text-muted-foreground">{acc.category}</div>
                    {acc.detected ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] mt-1">Detected</Badge> : <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-[9px] mt-1">—</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Tabs defaultValue="breaches">
            <TabsList className="bg-card/50 flex-wrap">
              <TabsTrigger value="breaches" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" /> Breaches ({result.breachCount})</TabsTrigger>
              <TabsTrigger value="exposure" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Eye className="w-3 h-3 mr-1" /> Exposure ({result.emailExposure?.length || 0})</TabsTrigger>
              <TabsTrigger value="social" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><User className="w-3 h-3 mr-1" /> Social ({result.socialAccounts?.length || 0})</TabsTrigger>
              <TabsTrigger value="domain" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Globe className="w-3 h-3 mr-1" /> Domain ({result.domainInfo?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="breaches" className="mt-3">
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {result.detectedBreaches?.map((b, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg border border-red-500/30 bg-red-500/5">
                    <div className="flex items-center gap-2 mb-1"><SeverityBadge severity={b.severity} /><span className="text-sm font-medium">{b.type}</span>{b.fromKnownSource && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-[9px]">Known Source</Badge>}</div>
                    <p className="text-xs text-muted-foreground">{b.description}</p>
                    {b.url && <a href={b.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-red-400 hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-2 h-2" />{b.source}</a>}
                  </motion.div>
                ))}
                {(!result.detectedBreaches || result.detectedBreaches.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No breaches detected.</p>}
              </div>
            </TabsContent>
            <TabsContent value="exposure" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.emailExposure?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialAccounts?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="domain" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.domainInfo?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
          </Tabs>

          <AIAnalysisCard analysis={result.aiAnalysis || ''} isLoading={false} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// IP Recon Module
// ============================================================
interface IPResult { ip: string; type: string; isPrivate: boolean; reservedInfo: string | null; anonymityType: string; vpnDetected: boolean; torDetected: boolean; proxyDetected: boolean; threatLevel: string; detectedThreats: string[]; blacklists: Array<{ source: string; description: string; url: string }>; blacklistCount: number; detectedPorts: Array<{ port: number; service: string; hint: string; status: string }>; geoResults: Array<{ url: string; title: string; snippet: string }>; threatResults: Array<{ url: string; title: string; snippet: string; domain: string; date: string }>; vpnResults: Array<{ url: string; title: string; snippet: string; domain: string }>; reverseDnsResults: Array<{ url: string; title: string; snippet: string }>; aiAnalysis: string; }

function IPModule() {
  const [ip, setIp] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<IPResult | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (!ip.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/ip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ip: ip.trim() }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data as IPResult); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [ip]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-rose-500/20 border border-rose-500/30"><Globe className="w-5 h-5 text-rose-400" /></div>
        <div><h2 className="text-xl font-bold">IP Reconnaissance</h2><p className="text-sm text-muted-foreground">VPN/Tor detection, threat assessment & port scan</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter IP address (e.g., 8.8.8.8)..." value={ip} onChange={(e) => setIp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={search} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}{loading ? 'Recon' : 'Scan'}
        </Button>
      </div>

      {loading && <LoadingIndicator message="Running IP reconnaissance and threat assessment..." />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Key Info Row */}
          <div className="flex flex-wrap items-center gap-3">
            <ThreatLevelBadge level={result.threatLevel} />
            {result.anonymityType !== 'None detected' && (
              <Badge className={`text-sm px-3 py-1 ${result.torDetected ? 'bg-purple-500/20 text-purple-400 border-purple-500/40' : result.vpnDetected ? 'bg-sky-500/20 text-sky-400 border-sky-500/40' : 'bg-orange-500/20 text-orange-400 border-orange-500/40'}`}>
                {result.torDetected ? <Lock className="w-3 h-3 mr-1" /> : result.vpnDetected ? <Shield className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                {result.anonymityType}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">{result.type}</Badge>
            {result.isPrivate && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">Private IP</Badge>}
            {result.reservedInfo && <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">{result.reservedInfo}</Badge>}
            {result.blacklistCount > 0 && <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs"><XCircle className="w-3 h-3 mr-1" />{result.blacklistCount} Blacklists</Badge>}
          </div>

          {/* Anonymity & Threat Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="border-border/50 bg-card/30"><CardContent className="p-3 text-center"><Globe2 className="w-4 h-4 text-rose-400 mx-auto mb-1" /><div className="text-xs text-muted-foreground">IP Type</div><div className="text-sm font-medium">{result.type}</div></CardContent></Card>
            <Card className="border-border/50 bg-card/30"><CardContent className="p-3 text-center"><Lock className="w-4 h-4 text-amber-400 mx-auto mb-1" /><div className="text-xs text-muted-foreground">Private</div><div className="text-sm font-medium">{result.isPrivate ? 'Yes' : 'No'}</div></CardContent></Card>
            <Card className="border-border/50 bg-card/30"><CardContent className="p-3 text-center"><MapPin className="w-4 h-4 text-emerald-400 mx-auto mb-1" /><div className="text-xs text-muted-foreground">Geo Results</div><div className="text-sm font-medium">{result.geoResults?.length || 0}</div></CardContent></Card>
            <Card className="border-border/50 bg-card/30"><CardContent className="p-3 text-center"><AlertTriangle className="w-4 h-4 text-red-400 mx-auto mb-1" /><div className="text-xs text-muted-foreground">Threats</div><div className="text-sm font-medium">{result.detectedThreats?.length || 0}</div></CardContent></Card>
          </div>

          {/* Detected Threats */}
          {result.detectedThreats && result.detectedThreats.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {result.detectedThreats.map(t => <Badge key={t} className="bg-red-500/15 text-red-400 border-red-500/30 text-xs"><Bug className="w-3 h-3 mr-1" />{t}</Badge>)}
            </div>
          )}

          {/* Detected Ports */}
          {result.detectedPorts && result.detectedPorts.length > 0 && (
            <Card className="border-border/50 bg-card/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2 text-rose-400"><Server className="w-4 h-4" /> Detected Ports ({result.detectedPorts.length})</CardTitle></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.detectedPorts.map(p => (
                <div key={p.port} className="px-2 py-1 rounded border border-border/50 bg-card/50 text-xs"><span className="font-mono text-emerald-400">{p.port}</span> <span className="text-muted-foreground">{p.service}</span></div>
              ))}</div></CardContent>
            </Card>
          )}

          <Tabs defaultValue="geo">
            <TabsList className="bg-card/50 flex-wrap">
              <TabsTrigger value="geo" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><MapPin className="w-3 h-3 mr-1" /> Geolocation</TabsTrigger>
              <TabsTrigger value="threat" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" /> Threat Intel</TabsTrigger>
              <TabsTrigger value="vpn" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"><Shield className="w-3 h-3 mr-1" /> VPN/Proxy</TabsTrigger>
              <TabsTrigger value="dns" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Network className="w-3 h-3 mr-1" /> Reverse DNS</TabsTrigger>
            </TabsList>
            <TabsContent value="geo" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.geoResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="threat" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.threatResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="vpn" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.vpnResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="dns" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.reverseDnsResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
          </Tabs>

          <AIAnalysisCard analysis={result.aiAnalysis || ''} isLoading={false} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Domain Intel Module
// ============================================================
interface DomainResult { analysis: { domain: string; tld: string; type: string; hasWww: boolean }; reputation: string; sslInfo: { detected: boolean; letsEncrypt: boolean; selfSigned: boolean }; detectedTech: string[]; discoveredSubdomains: string[]; whoisResults: Array<{ url: string; title: string; snippet: string; date: string }>; subdomainResults: Array<{ url: string; title: string; snippet: string }>; sslResults: Array<{ url: string; title: string; snippet: string }>; techResults: Array<{ url: string; title: string; snippet: string }>; reputationResults: Array<{ url: string; title: string; snippet: string; domain: string }>; aiAnalysis: string; }

function DomainModule() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DomainResult | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (!domain.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/domain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain.trim() }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data as DomainResult); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [domain]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-violet-500/20 border border-violet-500/30"><Server className="w-5 h-5 text-violet-400" /></div>
        <div><h2 className="text-xl font-bold">Domain Intelligence</h2><p className="text-sm text-muted-foreground">WHOIS, subdomains, SSL & tech fingerprint</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Globe2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain (e.g., example.com)..." value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={search} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Analyze'}
        </Button>
      </div>

      {loading && <LoadingIndicator message="Scanning domain infrastructure and WHOIS records..." />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Key Info */}
          <div className="flex flex-wrap items-center gap-3">
            <ReputationBadge reputation={result.reputation} />
            {result.analysis && <Badge variant="outline" className="text-xs">TLD: {result.analysis.tld} ({result.analysis.type})</Badge>}
            {result.sslInfo?.detected && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs"><Lock className="w-3 h-3 mr-1" />SSL Detected{result.sslInfo.letsEncrypt ? ' (Let\'s Encrypt)' : ''}{result.sslInfo.selfSigned ? ' (Self-Signed)' : ''}</Badge>}
          </div>

          {/* Detected Tech Stack */}
          {result.detectedTech && result.detectedTech.length > 0 && (
            <Card className="border-violet-500/30 bg-violet-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2 text-violet-400"><Cpu className="w-4 h-4" /> Detected Technology Stack ({result.detectedTech.length})</CardTitle></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.detectedTech.map(t => <Badge key={t} className="bg-violet-500/15 text-violet-400 border-violet-500/30">{t}</Badge>)}</div></CardContent>
            </Card>
          )}

          {/* Extracted Subdomains */}
          {result.discoveredSubdomains && result.discoveredSubdomains.length > 0 && (
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2 text-cyan-400"><Network className="w-4 h-4" /> Discovered Subdomains ({result.discoveredSubdomains.length})</CardTitle></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.discoveredSubdomains.map(s => <Badge key={s} variant="outline" className="text-xs font-mono">{s}</Badge>)}</div></CardContent>
            </Card>
          )}

          <Tabs defaultValue="whois">
            <TabsList className="bg-card/50 flex-wrap">
              <TabsTrigger value="whois" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Database className="w-3 h-3 mr-1" /> WHOIS</TabsTrigger>
              <TabsTrigger value="subdomains" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Network className="w-3 h-3 mr-1" /> Subdomains</TabsTrigger>
              <TabsTrigger value="ssl" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Lock className="w-3 h-3 mr-1" /> SSL</TabsTrigger>
              <TabsTrigger value="tech" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Cpu className="w-3 h-3 mr-1" /> Tech</TabsTrigger>
              <TabsTrigger value="reputation" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400"><Shield className="w-3 h-3 mr-1" /> Reputation</TabsTrigger>
            </TabsList>
            <TabsContent value="whois" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.whoisResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="subdomains" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.subdomainResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="ssl" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.sslResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="tech" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.techResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="reputation" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.reputationResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
          </Tabs>

          <AIAnalysisCard analysis={result.aiAnalysis || ''} isLoading={false} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Phone Trace Module (MOST IMPORTANT)
// ============================================================
interface PhoneRegisteredService { name: string; icon: string; category: string; detectHint: string; detected: boolean; confidence: string; }
interface PhoneAssociatedPerson { name: string; source: string; snippet: string; url: string; confidence: string; }
interface PhoneDataLeak { type: string; severity: string; source: string; description: string; url: string; }
interface PhoneResult { phone: string; analysis: { original: string; cleaned: string; countryCode: string; country: string; format: string; carrier: string; numberType: string; digitCount: number }; safetyStatus: string; registeredServices: PhoneRegisteredService[]; detectedServiceCount: number; associatedPeople: PhoneAssociatedPerson[]; dataLeaks: PhoneDataLeak[]; leakCount: number; socialAccounts: Array<{ title: string; snippet: string; url: string; domain: string }>; spamReports: Array<{ title: string; snippet: string; url: string; domain: string }>; aiAnalysis: string; }

function PhoneModule() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PhoneResult | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (!phone.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: phone.trim() }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data as PhoneResult); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [phone]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-500/30"><Phone className="w-5 h-5 text-pink-400" /></div>
        <div><h2 className="text-xl font-bold">Phone Trace</h2><p className="text-sm text-muted-foreground">Safety status, registered services & data leak intelligence</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number (e.g., +6281234567890)..." value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={search} disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Tracing' : 'Trace'}
        </Button>
      </div>

      {loading && <LoadingIndicator message="Tracing phone number and analyzing carrier data..." />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* 1. Safety Status Badge - BIG prominent */}
          <div className="flex items-center gap-4">
            <SafetyStatusBadge status={result.safetyStatus} />
            <span className="text-sm text-muted-foreground">Safety assessment for <span className="font-mono text-foreground">{result.phone}</span></span>
          </div>

          {/* 2. Phone Analysis Card */}
          {result.analysis && (
            <Card className="border-pink-500/30 bg-pink-500/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                  <div><div className="text-xs text-muted-foreground">Original</div><div className="text-sm font-medium font-mono">{result.analysis.original}</div></div>
                  <div><div className="text-xs text-muted-foreground">Cleaned</div><div className="text-sm font-medium font-mono">{result.analysis.cleaned}</div></div>
                  <div><div className="text-xs text-muted-foreground">Country Code</div><div className="text-sm font-medium font-mono text-emerald-400">{result.analysis.countryCode}</div></div>
                  <div><div className="text-xs text-muted-foreground">Country</div><div className="text-sm font-medium">{result.analysis.country}</div></div>
                  <div><div className="text-xs text-muted-foreground">Format</div><div className="text-sm font-medium">{result.analysis.format}</div></div>
                  <div><div className="text-xs text-muted-foreground">Carrier</div><div className="text-sm font-medium text-pink-400">{result.analysis.carrier}</div></div>
                  <div><div className="text-xs text-muted-foreground">Type / Digits</div><div className="text-sm font-medium">{result.analysis.numberType} ({result.analysis.digitCount})</div></div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 3. Registered Services Grid */}
          {result.registeredServices && result.registeredServices.length > 0 && (
            <Card className="border-border/50 bg-card/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-pink-400">
                  <Wifi className="w-4 h-4" /> Registered Services
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ml-2">{result.detectedServiceCount}/{result.registeredServices.length} detected</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {result.registeredServices.map((svc) => (
                    <div key={svc.name} className={`p-2.5 rounded-lg border text-center transition-all ${svc.detected ? 'border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/20' : 'border-border/30 bg-card/20 opacity-60'}`}>
                      <span className="text-xl block">{svc.icon}</span>
                      <div className="text-xs font-medium mt-1">{svc.name}</div>
                      <div className="text-[9px] text-muted-foreground">{svc.category}</div>
                      {svc.detected ? (
                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] mt-1"><CheckCircle2 className="w-2 h-2 mr-0.5" />Detected</Badge>
                      ) : (
                        <Badge className="bg-gray-500/10 text-gray-500 border-gray-500/20 text-[9px] mt-1">Unknown</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 5. Data Leak Section - CRITICAL */}
          {result.leakCount > 0 && (
            <Card className="border-red-600/50 bg-red-600/10">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <ShieldAlert className="w-6 h-6 text-red-400" />
                  <span className="text-base font-bold text-red-400">DATA LEAKS DETECTED: {result.leakCount}</span>
                </div>
                <div className="space-y-2">
                  {result.dataLeaks.map((leak, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                      className={`p-3 rounded-lg border ${leak.severity === 'critical' ? 'border-red-600/50 bg-red-600/10' : leak.severity === 'high' ? 'border-orange-500/40 bg-orange-500/10' : 'border-amber-500/30 bg-amber-500/5'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <SeverityBadge severity={leak.severity} />
                        <span className="text-sm font-medium">{leak.type}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{leak.description}</p>
                      {leak.url && <a href={leak.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-red-400 hover:underline flex items-center gap-1 mt-1"><ExternalLink className="w-2 h-2" />{leak.source}</a>}
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 4. Associated People Section */}
          {result.associatedPeople && result.associatedPeople.length > 0 && (
            <Card className="border-border/50 bg-card/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 text-cyan-400"><Users className="w-4 h-4" /> Associated People ({result.associatedPeople.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.associatedPeople.map((person, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
                      className="p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-medium">{person.name}</div>
                          <p className="text-xs text-muted-foreground mt-0.5">{person.snippet}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="outline" className="text-[10px]">{person.confidence}</Badge>
                          {person.url && <a href={person.url} target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground"><ExternalLink className="w-3 h-3" /></a>}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">Source: {person.source}</div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabs for Social Accounts, Spam Reports, AI Analysis */}
          <Tabs defaultValue="social">
            <TabsList className="bg-card/50 flex-wrap">
              <TabsTrigger value="social" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><User className="w-3 h-3 mr-1" /> Social ({result.socialAccounts?.length || 0})</TabsTrigger>
              <TabsTrigger value="spam" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" /> Spam ({result.spamReports?.length || 0})</TabsTrigger>
              <TabsTrigger value="ai" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Brain className="w-3 h-3 mr-1" /> AI Analysis</TabsTrigger>
            </TabsList>
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialAccounts?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="spam" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.spamReports?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="ai" className="mt-3"><AIAnalysisCard analysis={result.aiAnalysis || ''} isLoading={false} /></TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Web Intelligence Module
// ============================================================
function WebSearchModule() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/web-search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: query.trim() }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [query]);

  const results = result?.results as Array<{ url: string; title: string; snippet: string; domain: string; date: string }> | undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30"><Search className="w-5 h-5 text-emerald-400" /></div>
        <div><h2 className="text-xl font-bold">Web Intelligence</h2><p className="text-sm text-muted-foreground">AI-powered deep web search & analysis</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter search query for OSINT intelligence..." value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={search} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Searching' : 'Search'}
        </Button>
      </div>

      {loading && <LoadingIndicator message="Searching the web for OSINT intelligence..." />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>Found <strong className="text-foreground">{String(result.totalResults)}</strong> results</span>
            <span>for &quot;<strong className="text-emerald-400">{String(result.query)}</strong>&quot;</span>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">{results?.map((r, i) => <ResultCard key={i} {...r} />)}</div>
          <AIAnalysisCard analysis={result.aiAnalysis as string || ''} isLoading={false} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Image Forensics Module
// ============================================================
function ImageModule() {
  const [imageUrl, setImageUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const analyze = useCallback(async () => {
    if (!imageUrl.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/image-analysis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: imageUrl.trim(), prompt: prompt.trim() || undefined }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [imageUrl, prompt]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-sky-500/20 border border-sky-500/30"><ImageIcon className="w-5 h-5 text-sky-400" /></div>
        <div><h2 className="text-xl font-bold">Image Forensics</h2><p className="text-sm text-muted-foreground">VLM-powered visual intelligence analysis</p></div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter image URL to analyze..." value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Textarea placeholder="Custom analysis prompt (optional - leave empty for full OSINT analysis)..." value={prompt} onChange={(e) => setPrompt(e.target.value)} className="bg-card/50 border-border/50 min-h-[60px]" />
        <Button onClick={analyze} disabled={loading} className="bg-sky-600 hover:bg-sky-700 text-white w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}{loading ? 'Analyzing Image...' : 'Analyze Image'}
        </Button>
      </div>

      {loading && <LoadingIndicator message="Running VLM visual intelligence analysis..." />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {imageUrl && (
            <div className="rounded-lg overflow-hidden border border-border/50 max-h-64">
              <img src={imageUrl} alt="Analyzed" className="w-full object-contain" />
            </div>
          )}
          <Card className="border-sky-500/30 bg-sky-500/5">
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex items-center gap-2 text-sky-400"><Eye className="w-4 h-4" /> VLM OSINT Analysis</CardTitle></CardHeader>
            <CardContent className="prose prose-invert prose-sm max-w-none text-muted-foreground"><ReactMarkdown>{result.analysis as string || ''}</ReactMarkdown></CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// DNS Recon Module
// ============================================================
interface DnsResult { domain: string; dnssec: { detected: boolean; details: string }; emailSecurity: { spf: boolean; dkim: boolean; dmarc: boolean; level: string; score: number }; dnsProvider: string; dnsResults: Array<{ url: string; title: string; snippet: string }>; mxResults: Array<{ url: string; title: string; snippet: string }>; nsResults: Array<{ url: string; title: string; snippet: string }>; txtResults: Array<{ url: string; title: string; snippet: string }>; dnssecResults: Array<{ url: string; title: string; snippet: string }>; cnameResults: Array<{ url: string; title: string; snippet: string }>; aiAnalysis: string; }

function DNSModule() {
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DnsResult | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async () => {
    if (!domain.trim()) return;
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch('/api/osint/dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domain: domain.trim() }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data as DnsResult); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [domain]);

  const emailSecColor = result?.emailSecurity?.level === 'good' ? 'emerald' : result?.emailSecurity?.level === 'partial' ? 'amber' : result?.emailSecurity?.level === 'poor' ? 'orange' : 'red';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-lime-500/20 border border-lime-500/30"><Network className="w-5 h-5 text-lime-400" /></div>
        <div><h2 className="text-xl font-bold">DNS Reconnaissance</h2><p className="text-sm text-muted-foreground">DNSSEC, SPF/DKIM/DMARC & email security</p></div>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Network className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain for DNS recon..." value={domain} onChange={(e) => setDomain(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={search} disabled={loading} className="bg-lime-600 hover:bg-lime-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radar className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Recon'}
        </Button>
      </div>

      {loading && <LoadingIndicator message="Enumerating DNS records and security configurations..." />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Key Info */}
          <div className="flex flex-wrap items-center gap-3">
            {/* DNSSEC */}
            {result.dnssec?.detected ? (
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-sm px-3 py-1"><Lock className="w-3 h-3 mr-1" />DNSSEC Enabled</Badge>
            ) : (
              <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-sm px-3 py-1"><Unlock className="w-3 h-3 mr-1" />DNSSEC Not Found</Badge>
            )}
            {/* Email Security Score */}
            <Badge className={`bg-${emailSecColor}-500/20 text-${emailSecColor}-400 border-${emailSecColor}-500/30 text-sm px-3 py-1`}>
              <Mail className="w-3 h-3 mr-1" />Email Security: {result.emailSecurity?.level?.toUpperCase() || 'NONE'} ({result.emailSecurity?.score || 0}/3)
            </Badge>
            {/* DNS Provider */}
            {result.dnsProvider && result.dnsProvider !== 'Unknown' && <Badge variant="outline" className="text-xs"><Cloud className="w-3 h-3 mr-1" />{result.dnsProvider}</Badge>}
          </div>

          {/* SPF/DKIM/DMARC Cards */}
          {result.emailSecurity && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'SPF', label: 'Sender Policy Framework', detected: result.emailSecurity.spf },
                { name: 'DKIM', label: 'DomainKeys Identified Mail', detected: result.emailSecurity.dkim },
                { name: 'DMARC', label: 'Domain-based Message Auth', detected: result.emailSecurity.dmarc },
              ].map((item) => (
                <Card key={item.name} className={`border-${item.detected ? 'emerald' : 'red'}-500/30 bg-${item.detected ? 'emerald' : 'red'}-500/5`}>
                  <CardContent className="p-3 text-center">
                    {item.detected ? <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" /> : <XCircle className="w-5 h-5 text-red-400 mx-auto mb-1" />}
                    <div className="text-sm font-bold">{item.name}</div>
                    <div className="text-[10px] text-muted-foreground">{item.label}</div>
                    <Badge className={`mt-1 text-[9px] ${item.detected ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
                      {item.detected ? 'Found' : 'Not Found'}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Tabs defaultValue="dns">
            <TabsList className="bg-card/50 flex-wrap">
              <TabsTrigger value="dns" className="data-[state=active]:bg-lime-500/20 data-[state=active]:text-lime-400"><Network className="w-3 h-3 mr-1" /> DNS</TabsTrigger>
              <TabsTrigger value="mx" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Mail className="w-3 h-3 mr-1" /> MX</TabsTrigger>
              <TabsTrigger value="ns" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Server className="w-3 h-3 mr-1" /> NS</TabsTrigger>
              <TabsTrigger value="txt" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400"><Key className="w-3 h-3 mr-1" /> TXT/SPF</TabsTrigger>
              <TabsTrigger value="cname" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Network className="w-3 h-3 mr-1" /> CNAME</TabsTrigger>
              <TabsTrigger value="dnssec" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Lock className="w-3 h-3 mr-1" /> DNSSEC</TabsTrigger>
            </TabsList>
            <TabsContent value="dns" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.dnsResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="mx" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.mxResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="ns" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.nsResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="txt" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.txtResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="cname" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.cnameResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="dnssec" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.dnssecResults?.map((r, i) => <ResultCard key={i} {...r} />)}</div></TabsContent>
          </Tabs>

          <AIAnalysisCard analysis={result.aiAnalysis || ''} isLoading={false} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// AI Chat Module
// ============================================================
function AIChatModule() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) { scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }
  }, [messages]);

  const send = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true); setError('');
    try {
      const history = messages.slice(-10);
      const res = await fetch('/api/osint/ai-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMsg, history }) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else if (data.response) { setMessages(prev => [...prev, { role: 'assistant', content: data.response }]); }
    } catch { setError('Network error. Please check your connection and try again.'); }
    finally { setLoading(false); }
  }, [input, loading, messages]);

  const suggestions = [
    'How do I investigate a suspicious email address?',
    'What OSINT techniques can I use for username enumeration?',
    'How to analyze domain infrastructure for threat intel?',
    'Best practices for ethical OSINT reconnaissance?',
    'How to trace a phone number for legitimate purposes?',
    'What is the OSINT framework methodology?',
  ];

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-lg bg-fuchsia-500/20 border border-fuchsia-500/30"><Brain className="w-5 h-5 text-fuchsia-400" /></div>
        <div><h2 className="text-xl font-bold">RECON-AI</h2><p className="text-sm text-muted-foreground">OSINT AI Assistant with web intelligence</p></div>
      </div>

      {error && <ErrorCard error={error} />}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto max-h-[calc(100vh-320px)] min-h-[300px]">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-fuchsia-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">RECON-AI Intelligence Assistant</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
              Ask me about OSINT techniques, intelligence analysis, investigation methodologies,
              or let me help you analyze your findings. I have access to real-time web intelligence.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg mx-auto">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)}
                  className="text-left p-2 rounded-lg border border-border/30 bg-card/30 hover:bg-card/60 hover:border-fuchsia-500/30 transition-all text-xs text-muted-foreground hover:text-foreground">
                  <ArrowRight className="w-3 h-3 inline mr-1 text-fuchsia-400" />{s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg p-3 ${msg.role === 'user' ? 'bg-fuchsia-500/20 border border-fuchsia-500/30 text-foreground' : 'bg-card/50 border border-border/50 text-foreground'}`}>
              {msg.role === 'assistant' ? (
                <div className="prose prose-invert prose-sm max-w-none text-muted-foreground"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
              ) : (
                <p className="text-sm">{msg.content}</p>
              )}
            </div>
          </motion.div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-card/50 border border-border/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">RECON-AI analyzing...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 pt-2 border-t border-border/30">
        <Input placeholder="Ask RECON-AI about OSINT..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} disabled={loading} className="bg-card/50 border-border/50" />
        <Button onClick={send} disabled={loading || !input.trim()} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"><Send className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}

// ============================================================
// Sidebar Content
// ============================================================
function SidebarContent({ activeModule, sidebarOpen, onNavigate }: {
  activeModule: ModuleType;
  sidebarOpen: boolean;
  onNavigate: (id: ModuleType) => void;
}) {
  return (
    <div className="py-4">
      <div className="px-4 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-wider">RECON</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest">OSINT PLATFORM</p>
          </div>
        </div>
      </div>

      <Separator className="mb-4 opacity-50" />

      <div className="px-2 space-y-1">
        {MODULES.map((mod) => (
          <TooltipProvider key={mod.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => onNavigate(mod.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${activeModule === mod.id ? `bg-gradient-to-r ${mod.color} text-white shadow-lg shadow-black/20` : 'text-muted-foreground hover:text-foreground hover:bg-card/50'}`}>
                  {mod.icon}
                  {sidebarOpen && (<><span className="flex-1 text-left">{mod.name}</span>{activeModule === mod.id && <ChevronRight className="w-3 h-3" />}</>)}
                </button>
              </TooltipTrigger>
              {!sidebarOpen && <TooltipContent side="right">{mod.name}</TooltipContent>}
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>

      <div className="px-4 mt-8">
        <div className="p-3 rounded-lg border border-border/30 bg-card/30">
          <div className="flex items-center gap-2 mb-2"><Activity className="w-3 h-3 text-emerald-400" /><span className="text-xs font-medium text-emerald-400">System Status</span></div>
          <div className="space-y-1">
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">AI Engine</span><span className="text-[10px] text-emerald-400">Online</span></div>
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Web Intel</span><span className="text-[10px] text-emerald-400">Active</span></div>
            <div className="flex items-center justify-between"><span className="text-[10px] text-muted-foreground">VLM</span><span className="text-[10px] text-emerald-400">Ready</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main App Component
// ============================================================
export default function OSINTApp() {
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const handleNavigate = useCallback((id: ModuleType) => {
    setActiveModule(id);
    setMobileSidebarOpen(false);
  }, []);

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard': return <DashboardModule />;
      case 'username': return <UsernameModule />;
      case 'email': return <EmailModule />;
      case 'ip': return <IPModule />;
      case 'domain': return <DomainModule />;
      case 'phone': return <PhoneModule />;
      case 'websearch': return <WebSearchModule />;
      case 'image': return <ImageModule />;
      case 'dns': return <DNSModule />;
      case 'aichat': return <AIChatModule />;
      default: return <DashboardModule />;
    }
  };

  const activeMod = MODULES.find(m => m.id === activeModule);

  return (
    <div className="min-h-screen bg-[#0a0a12] text-foreground flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border/30 bg-[#0d0d18] transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        <SidebarContent activeModule={activeModule} sidebarOpen={sidebarOpen} onNavigate={handleNavigate} />
        <div className="mt-auto p-3 border-t border-border/30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-card/50 text-muted-foreground hover:text-foreground transition-all">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed left-0 top-0 bottom-0 w-64 bg-[#0d0d18] border-r border-border/30 z-50 md:hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-sm font-bold">Navigation</span>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1 hover:bg-card/50 rounded"><X className="w-4 h-4" /></button>
              </div>
              <SidebarContent activeModule={activeModule} sidebarOpen={true} onNavigate={handleNavigate} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-[#0d0d18]/80 backdrop-blur-sm">
          <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-card/50 text-muted-foreground"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2">
            {activeMod && (
              <>
                <div className={`p-1 rounded bg-gradient-to-r ${activeMod.color} text-white`}>{activeMod.icon}</div>
                <div><h2 className="text-sm font-semibold">{activeMod.name}</h2><p className="text-[10px] text-muted-foreground">{activeMod.description}</p></div>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] text-emerald-400 border-emerald-500/30"><Activity className="w-3 h-3 mr-1" /> Live</Badge>
            <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30"><Zap className="w-3 h-3 mr-1" /> AI</Badge>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={activeModule} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="px-4 py-2 border-t border-border/30 bg-[#0d0d18]/80 text-center">
          <p className="text-[10px] text-muted-foreground">RECON OSINT Platform &bull; AI-Powered Intelligence &bull; For Authorized Use Only &bull; Ethical OSINT Practices</p>
        </footer>
      </main>
    </div>
  );
}
