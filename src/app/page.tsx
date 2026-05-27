'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, User, Mail, Globe, Phone, Shield, Eye, Brain,
  Wifi, Server, ExternalLink, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle, Loader2, Send, Image as ImageIcon,
  MapPin, Key, Activity, Database, Radar, Fingerprint, Network,
  ArrowRight, Layers, Zap, Target, Scan, FileSearch,
  Cpu, Lock, Upload, Copy, Check,
  Home, ChevronLeft, ChevronRight, Menu, X, Sparkles,
  ShieldAlert, ShieldCheck, ShieldX, ShieldQuestion,
  Users, Bug, Code, MessageCircle, LogOut, Crown, Clock,
  ChevronDown, Circle, Rocket, Plus,
  CreditCard, Wallet, QrCode, UserSearch, Radio,
  Car, GraduationCap, Smartphone, Building2, Bitcoin as BitcoinIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import ReactMarkdown from 'react-markdown';

// ============================================================
// Types
// ============================================================
type AppView = 'landing' | 'dashboard' | 'admin';
type ModuleType = 'dashboard' | 'username' | 'email' | 'ip' | 'domain' | 'phone' | 'websearch' | 'image' | 'aichat' | 'dns' | 'websec' | 'breach' | 'dorking' | 'subdomain' | 'wifiscan' | 'wifi' | 'mac' | 'people' | 'vehicle' | 'ktp' | 'nik' | 'school' | 'ewallet' | 'qris' | 'bank' | 'bitcoin' | 'phonedev' | 'phoneloc' | 'webvuln' | 'social';

interface AuthState {
  isLoggedIn: boolean;
  isAdmin: boolean;
  user: { id: string; name: string | null; phone: string | null } | null;
  apiKey: { id: string; plan: string; isActive: boolean; expiresAt: string | null; label: string | null } | null;
  apiKeyString: string;
}

interface Module {
  id: ModuleType;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

// Fetch with timeout
function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 90000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// ============================================================
// Module Definitions
// ============================================================
const MODULES: Module[] = [
  { id: 'dashboard', name: 'Command Center', icon: <Home className="w-4 h-4" />, description: 'Overview & Stats', color: 'from-emerald-500 to-teal-500' },
  { id: 'username', name: 'Username Hunter', icon: <User className="w-4 h-4" />, description: 'Cross-platform search', color: 'from-cyan-500 to-blue-500' },
  { id: 'email', name: 'Email Intel', icon: <Mail className="w-4 h-4" />, description: 'Email breach & exposure', color: 'from-amber-500 to-orange-500' },
  { id: 'ip', name: 'IP Recon', icon: <Globe className="w-4 h-4" />, description: 'IP geolocation & threat', color: 'from-rose-500 to-red-500' },
  { id: 'domain', name: 'Domain Intel', icon: <Server className="w-4 h-4" />, description: 'WHOIS & domain analysis', color: 'from-violet-500 to-purple-500' },
  { id: 'phone', name: 'Phone Trace', icon: <Phone className="w-4 h-4" />, description: 'Phone number intelligence', color: 'from-pink-500 to-rose-500' },
  { id: 'websearch', name: 'Web Intel', icon: <Search className="w-4 h-4" />, description: 'AI-powered web search', color: 'from-emerald-500 to-green-500' },
  { id: 'image', name: 'Image Forensics', icon: <ImageIcon className="w-4 h-4" />, description: 'VLM image analysis', color: 'from-sky-500 to-indigo-500' },
  { id: 'breach', name: 'Breach Checker', icon: <ShieldAlert className="w-4 h-4" />, description: 'Data breach & leak check', color: 'from-red-500 to-orange-500' },
  { id: 'dorking', name: 'Google Dorking', icon: <Code className="w-4 h-4" />, description: 'Advanced search operators', color: 'from-lime-500 to-green-500' },
  { id: 'subdomain', name: 'Subdomain Finder', icon: <Network className="w-4 h-4" />, description: 'Subdomain enumeration', color: 'from-teal-500 to-cyan-500' },
  { id: 'dns', name: 'DNS Recon', icon: <Wifi className="w-4 h-4" />, description: 'DNS enumeration', color: 'from-yellow-500 to-amber-500' },
  { id: 'websec', name: 'Web Security', icon: <ShieldCheck className="w-4 h-4" />, description: 'Website security audit', color: 'from-emerald-500 to-green-600' },
  { id: 'aichat', name: 'XANVYOR-AI', icon: <Brain className="w-4 h-4" />, description: 'OSINT AI assistant', color: 'from-fuchsia-500 to-pink-500' },
  { id: 'wifiscan', name: 'WiFi Scanner', icon: <Wifi className="w-4 h-4" />, description: 'WiFi network scanning', color: 'from-purple-500 to-violet-500' },
  { id: 'wifi', name: 'WiFi AP Lookup', icon: <Radio className="w-4 h-4" />, description: 'Access point intelligence', color: 'from-indigo-500 to-purple-500' },
  { id: 'mac', name: 'MAC Lookup', icon: <Fingerprint className="w-4 h-4" />, description: 'MAC address lookup', color: 'from-orange-500 to-red-500' },
  { id: 'people', name: 'People Search', icon: <UserSearch className="w-4 h-4" />, description: 'People finder & profiles', color: 'from-teal-500 to-emerald-500' },
  { id: 'vehicle', name: 'Vehicle Plate', icon: <Car className="w-4 h-4" />, description: 'Indonesian plate check', color: 'from-slate-500 to-gray-500' },
  { id: 'ktp', name: 'KTP OCR', icon: <CreditCard className="w-4 h-4" />, description: 'Indonesian ID card scan', color: 'from-red-500 to-rose-500' },
  { id: 'nik', name: 'NIK Decoder', icon: <CreditCard className="w-4 h-4" />, description: 'Indonesian NIK decode', color: 'from-amber-500 to-yellow-500' },
  { id: 'school', name: 'School Intel', icon: <GraduationCap className="w-4 h-4" />, description: 'School/student OSINT', color: 'from-blue-500 to-indigo-500' },
  { id: 'ewallet', name: 'E-Wallet', icon: <Wallet className="w-4 h-4" />, description: 'E-wallet detection', color: 'from-green-500 to-emerald-500' },
  { id: 'qris', name: 'QRIS Lookup', icon: <QrCode className="w-4 h-4" />, description: 'QRIS merchant check', color: 'from-cyan-500 to-blue-500' },
  { id: 'bank', name: 'Bank Check', icon: <Building2 className="w-4 h-4" />, description: 'Bank account verify', color: 'from-yellow-500 to-amber-500' },
  { id: 'bitcoin', name: 'Bitcoin Trace', icon: <BitcoinIcon className="w-4 h-4" />, description: 'Bitcoin address analysis', color: 'from-orange-500 to-amber-500' },
  { id: 'phonedev', name: 'Phone Device', icon: <Smartphone className="w-4 h-4" />, description: 'Device intelligence', color: 'from-emerald-500 to-teal-500' },
  { id: 'phoneloc', name: 'Phone GPS', icon: <MapPin className="w-4 h-4" />, description: 'Phone GPS location', color: 'from-rose-500 to-pink-500' },
  { id: 'webvuln', name: 'Web Vuln Scan', icon: <Bug className="w-4 h-4" />, description: 'Vulnerability scanner', color: 'from-red-500 to-orange-500' },
  { id: 'social', name: 'Social Scanner', icon: <Users className="w-4 h-4" />, description: 'Social media deep scan', color: 'from-pink-500 to-fuchsia-500' },
];

// ============================================================
// Shared UI Components
// ============================================================
function StatusBadge({ status }: { status: string }) {
  if (status === 'likely_found') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Found</Badge>;
  if (status === 'not_found') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"><XCircle className="w-3 h-3 mr-1" />Not Found</Badge>;
  return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"><HelpCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() || 'low';
  if (s === 'critical') return <Badge className="bg-red-600/20 text-red-400 border-red-600/30 animate-pulse">CRITICAL</Badge>;
  if (s === 'high') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">HIGH</Badge>;
  if (s === 'medium') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">MEDIUM</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">LOW</Badge>;
}

function ThreatBadge({ level }: { level: string }) {
  const l = level?.toLowerCase() || 'low';
  if (l === 'critical') return <Badge className="bg-red-600/20 text-red-400 border-red-600/40 text-sm px-3 py-1"><ShieldAlert className="w-4 h-4 mr-1" />CRITICAL</Badge>;
  if (l === 'high') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-sm px-3 py-1"><AlertTriangle className="w-4 h-4 mr-1" />HIGH</Badge>;
  if (l === 'medium') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-sm px-3 py-1"><AlertTriangle className="w-3 h-3 mr-1" />MEDIUM</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-sm px-3 py-1"><CheckCircle2 className="w-3 h-3 mr-1" />LOW</Badge>;
}

function AIAnalysisCard({ analysis }: { analysis: string }) {
  if (!analysis) return null;
  return (
    <Card className="border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-400"><Brain className="w-4 h-4" /> AI Intelligence Analysis</CardTitle>
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
        <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span className="text-sm">{error}</span></div>
        <p className="text-xs text-muted-foreground mt-2">Wait a moment and try again. AI analysis may take 15-60 seconds.</p>
      </CardContent>
    </Card>
  );
}

function LoadingIndicator({ message }: { message: string }) {
  const [dots, setDots] = useState(0);
  useEffect(() => { const i = setInterval(() => setDots(d => (d + 1) % 4), 500); return () => clearInterval(i); }, []);
  return (
    <div className="flex items-center justify-center py-12">
      <div className="text-center">
        <div className="relative w-16 h-16 mx-auto mb-4">
          <Loader2 className="w-16 h-16 animate-spin text-emerald-400" />
          <div className="absolute inset-0 flex items-center justify-center"><Radar className="w-6 h-6 text-emerald-300 animate-pulse" /></div>
        </div>
        <p className="text-sm text-foreground font-medium">{message}{Array(dots + 1).fill('.').join('')}</p>
        <p className="text-xs text-muted-foreground mt-2">AI analysis in progress (15-60s)</p>
      </div>
    </div>
  );
}

function ResultLink({ title, snippet, url, domain, date }: { title: string; snippet: string; url: string; domain?: string; date?: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="p-3 rounded-lg border border-border/50 bg-card/30 hover:bg-card/60 transition-all group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-foreground hover:text-emerald-400 transition-colors flex items-center gap-1">
            <span className="truncate">{title}</span>
            <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-0 group-hover:opacity-100" />
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

function ModuleHeader({ icon, color, title, subtitle }: { icon: React.ReactNode; color: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg bg-gradient-to-r ${color} text-white`}>{icon}</div>
      <div><h2 className="text-xl font-bold">{title}</h2><p className="text-sm text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

// Generic hook for API calls
function useOSINTSearch<T>() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async (url: string, body: Record<string, string>) => {
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetchWithTimeout(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (data.error) { setError(data.error); } else { setResult(data as T); }
    } catch (err: unknown) {
      setError(err instanceof DOMException && err.name === 'AbortError' ? 'Request timed out. Please try again.' : 'Network error. Please try again.');
    } finally { setLoading(false); }
  }, []);

  return { loading, result, error, search, setError, setResult };
}

// ============================================================
// Dashboard Module
// ============================================================
function DashboardModule() {
  const stats = [
    { label: 'OSINT Tools', value: '30', icon: <Layers className="w-5 h-5" />, color: 'text-emerald-400' },
    { label: 'AI Engines', value: '4', icon: <Cpu className="w-5 h-5" />, color: 'text-cyan-400' },
    { label: 'Data Sources', value: '100+', icon: <Database className="w-5 h-5" />, color: 'text-amber-400' },
    { label: 'Real-time', value: 'Yes', icon: <Activity className="w-5 h-5" />, color: 'text-rose-400' },
  ];

  const capabilities = MODULES.filter(m => m.id !== 'dashboard').map(m => ({
    icon: m.icon, title: m.name, desc: m.description,
  }));

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-cyan-500/10 p-4 sm:p-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <img src="/logo.png" alt="XANVYOR" className="w-10 h-10 rounded-lg" />
            <div>
              <h2 className="text-2xl font-bold tracking-tight">XANVYOR RECON Platform</h2>
              <p className="text-sm text-muted-foreground">Advanced Open Source Intelligence Gathering & Analysis</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mt-2">
            Powered by AI-driven analysis: Web Search Intelligence, Vision Language Models, and Large Language Models. All tools provide real-time OSINT with automated intelligence reporting.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-4">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><Activity className="w-3 h-3 mr-1" />Operational</Badge>
            <Badge className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30"><Zap className="w-3 h-3 mr-1" />AI-Powered</Badge>
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Lock className="w-3 h-3 mr-1" />Secure</Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur">
            <div className={`${s.color} mb-2`}>{s.icon}</div>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-muted-foreground">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><Radar className="w-5 h-5 text-emerald-400" /> Intelligence Capabilities</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {capabilities.map((c, i) => (
            <motion.div key={c.title} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
              className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-card/30 hover:bg-card/60 hover:border-emerald-500/30 transition-all group">
              <div className="text-emerald-400 mt-0.5 group-hover:scale-110 transition-transform">{c.icon}</div>
              <div>
                <h4 className="text-sm font-medium group-hover:text-emerald-400 transition-colors">{c.title}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
              </div>
            </motion.div>
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
interface UsernameResult { platforms: UsernamePlatform[]; likelyFound: number; totalChecked: number; foundByCategory: Record<string, number>; searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>; breachResults: Array<{ url: string; title: string; snippet: string; domain: string }>; aiAnalysis: string; }

function UsernameModule() {
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

// ============================================================
// Email Intel Module
// ============================================================
interface EmailResult {
  analysis: { email: string; username: string; domain: string; providerType: string; providerCountry: string; providerRisk: string; isCommonDomain: boolean; isDisposable: boolean; usernamePatterns: string[] };
  linkedAccounts: Array<{ platform: string; icon: string; category: string; detected: boolean; confidence: string }>;
  detectedBreaches: Array<{ type: string; severity: string; source: string; description: string; url: string; fromKnownSource: boolean }>;
  ktpLeaks: Array<{ type: string; severity: string; description: string; source: string; url: string }>;
  emailExposure: Array<{ url: string; title: string; snippet: string; domain: string; date: string }>;
  socialAccounts: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function EmailModule() {
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

// ============================================================
// IP Recon Module
// ============================================================
interface IPResult {
  ip: string; type: string; isPrivate: boolean; anonymityType: string; vpnDetected: boolean; torDetected: boolean; proxyDetected: boolean;
  threatLevel: string; detectedThreats: string[]; blacklists: Array<{ source: string; description: string; url: string }>;
  detectedPorts: Array<{ port: number; service: string; status: string }>;
  geoResults: Array<{ title: string; snippet: string; url: string }>;
  threatResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function IPModule() {
  const [ip, setIp] = useState('');
  const { loading, result, error, search } = useOSINTSearch<IPResult>();

  const doSearch = useCallback(() => {
    if (!ip.trim()) return;
    search('/api/osint/ip', { ip: ip.trim() });
  }, [ip, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Globe className="w-5 h-5" />} color="from-rose-500 to-red-500" title="IP Recon" subtitle="IP geolocation, VPN detection & threat analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter IP address..." value={ip} onChange={e => setIp(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing IP ${ip}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">IP Address</div><div className="text-sm font-mono font-medium">{result.ip}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.type} {result.isPrivate && '(Private)'}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Anonymity</div><div className="text-sm font-medium">{result.anonymityType}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Threat</div><ThreatBadge level={result.threatLevel} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {result.vpnDetected && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Shield className="w-3 h-3 mr-1" />VPN Detected</Badge>}
            {result.torDetected && <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><ShieldAlert className="w-3 h-3 mr-1" />Tor Detected</Badge>}
            {result.proxyDetected && <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30"><Shield className="w-3 h-3 mr-1" />Proxy Detected</Badge>}
            {result.detectedThreats?.map(t => <Badge key={t} className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">{t}</Badge>)}
          </div>
          {result.detectedPorts?.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="w-4 h-4 text-amber-400" />Detected Ports</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.detectedPorts.map(p => <Badge key={p.port} variant="outline" className="text-xs">{p.port}/{p.service}</Badge>)}
                </div>
              </CardContent>
            </Card>
          )}
          {result.blacklists?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Blacklists ({result.blacklists.length})</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.blacklists.map((b, i) => <div key={i} className="text-xs text-muted-foreground">{b.source}: {b.description.substring(0, 100)}</div>)}</div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="geo">
            <TabsList className="bg-card/50">
              <TabsTrigger value="geo" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><MapPin className="w-3 h-3 mr-1" />Geo</TabsTrigger>
              <TabsTrigger value="threat" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Threat</TabsTrigger>
            </TabsList>
            <TabsContent value="geo" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.geoResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="threat" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.threatResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Domain Intel Module
// ============================================================
interface DomainResult {
  domain: string; whoisResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  subdomainResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  techResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  reputationResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function DomainModule() {
  const [domain, setDomain] = useState('');
  const { loading, result, error, search } = useOSINTSearch<DomainResult>();

  const doSearch = useCallback(() => {
    if (!domain.trim()) return;
    search('/api/osint/domain', { domain: domain.trim() });
  }, [domain, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Server className="w-5 h-5" />} color="from-violet-500 to-purple-500" title="Domain Intel" subtitle="WHOIS lookup, subdomains & reputation" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain name..." value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-violet-600 hover:bg-violet-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing domain ${domain}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Tabs defaultValue="whois">
            <TabsList className="bg-card/50">
              <TabsTrigger value="whois" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Key className="w-3 h-3 mr-1" />WHOIS ({result.whoisResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="subdomains" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Network className="w-3 h-3 mr-1" />Subdomains ({result.subdomainResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="tech" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Cpu className="w-3 h-3 mr-1" />Tech ({result.techResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="reputation" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Shield className="w-3 h-3 mr-1" />Reputation ({result.reputationResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="whois" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.whoisResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="subdomains" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.subdomainResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="tech" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.techResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="reputation" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.reputationResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Phone Trace Module
// ============================================================
interface PhoneResult {
  phone: string; safetyStatus: string; analysis: { carrier: string; numberType: string; country: string; countryCode: string };
  contactNames: Array<{ name: string; source: string; confidence: string }>;
  registeredServices: Array<{ platform: string; icon: string; detected: boolean; category: string }>;
  associatedPeople: Array<{ name: string; source: string; snippet: string; url: string; confidence: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  socialAccounts: Array<{ url: string; title: string; snippet: string; domain: string }>;
  spamReports: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function PhoneModule() {
  const [phone, setPhone] = useState('');
  const { loading, result, error, search } = useOSINTSearch<PhoneResult>();

  const doSearch = useCallback(() => {
    if (!phone.trim()) return;
    search('/api/osint/phone', { phone: phone.trim() });
  }, [phone, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Phone className="w-5 h-5" />} color="from-pink-500 to-rose-500" title="Phone Trace" subtitle="Phone number intelligence & safety check" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-pink-600 hover:bg-pink-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Tracing' : 'Trace'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Tracing phone number ${phone}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-pink-500/30 bg-pink-500/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Phone Number</div>
                  <div className="text-lg font-mono font-medium">{result.phone}</div>
                  {result.analysis && <div className="text-xs text-muted-foreground mt-1">{result.analysis.carrier} &bull; {result.analysis.country}</div>}
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 ${result.safetyStatus === 'safe' ? 'bg-emerald-500/15 border-emerald-500/40' : result.safetyStatus === 'suspicious' ? 'bg-amber-500/15 border-amber-500/40' : 'bg-red-500/15 border-red-500/40'}`}>
                  {result.safetyStatus === 'safe' ? <><ShieldCheck className="w-5 h-5 text-emerald-400" /><span className="font-bold text-emerald-400">SAFE</span></> :
                   result.safetyStatus === 'suspicious' ? <><AlertTriangle className="w-5 h-5 text-amber-400" /><span className="font-bold text-amber-400">SUSPICIOUS</span></> :
                   <><ShieldX className="w-5 h-5 text-red-400" /><span className="font-bold text-red-400">DANGEROUS</span></>}
                </div>
              </div>
            </CardContent>
          </Card>
          {result.contactNames?.length > 0 && (
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-cyan-400"><UserSearch className="w-4 h-4" /> Contact Names (GetContact Style)</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.contactNames.map((n, i) => (
                <div key={i} className="flex items-center gap-2 text-sm"><Badge variant="outline" className="text-[9px]">{n.source}</Badge><span className="font-medium">{n.name}</span><span className="text-[9px] text-muted-foreground">({n.confidence})</span></div>
              ))}</div></CardContent>
            </Card>
          )}
          {result.registeredServices?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Registered Services ({result.registeredServices.filter(s => s.detected).length}/{result.registeredServices.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {result.registeredServices.map(s => (
                  <div key={s.platform} className={`p-2 rounded-lg border text-center ${s.detected ? 'border-pink-500/40 bg-pink-500/10' : 'border-border/30 bg-card/20'}`}>
                    <span className="text-lg">{s.icon}</span>
                    <div className="text-xs font-medium mt-1">{s.platform}</div>
                    {s.detected && <Badge className="bg-pink-500/20 text-pink-400 text-[9px] mt-1">Detected</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.dataLeaks?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Data Leaks ({result.dataLeaks.length})</CardTitle></CardHeader>
              <CardContent><div className="space-y-2">{result.dataLeaks.map((l, i) => (
                <div key={i} className="p-2 rounded-lg border border-red-500/20 bg-red-500/5"><div className="flex items-center gap-2"><SeverityBadge severity={l.severity} /><span className="text-sm font-medium">{l.type}</span></div><p className="text-xs text-muted-foreground mt-1">{l.description}</p></div>
              ))}</div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="social">
            <TabsList className="bg-card/50">
              <TabsTrigger value="social" className="data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400"><Users className="w-3 h-3 mr-1" />Social ({result.socialAccounts?.length || 0})</TabsTrigger>
              <TabsTrigger value="spam" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Spam ({result.spamReports?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialAccounts?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="spam" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.spamReports?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Web Search Module
// ============================================================
interface WebSearchResult { results: Array<{ url: string; title: string; snippet: string; domain: string; date?: string }>; aiAnalysis: string; }

function WebSearchModule() {
  const [query, setQuery] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WebSearchResult>();

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    search('/api/osint/web-search', { query: query.trim() });
  }, [query, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Search className="w-5 h-5" />} color="from-emerald-500 to-green-500" title="Web Intelligence" subtitle="AI-powered deep web search & analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter search query..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Searching' : 'Search'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Searching the web with AI analysis" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="text-sm text-muted-foreground">Found {result.results?.length || 0} results</div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {result.results?.map((r, i) => <ResultLink key={i} {...r} />)}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Image Forensics Module
// ============================================================
interface ImageResult { imageUrl: string; analysis: string; relatedIntel: Array<{ url: string; title: string; snippet: string }>; }

function ImageModule() {
  const [imageUrl, setImageUrl] = useState('');
  const { loading, result, error, search } = useOSINTSearch<ImageResult>();

  const doSearch = useCallback(() => {
    if (!imageUrl.trim()) return;
    search('/api/osint/image-analysis', { imageUrl: imageUrl.trim() });
  }, [imageUrl, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<ImageIcon className="w-5 h-5" />} color="from-sky-500 to-indigo-500" title="Image Forensics" subtitle="VLM-powered image analysis & intelligence" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter image URL to analyze..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-sky-600 hover:bg-sky-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}{loading ? 'Analyzing' : 'Analyze'}
        </Button>
      </div>
      {imageUrl && !loading && !result && (
        <div className="mt-4"><img src={imageUrl} alt="Preview" className="max-w-sm rounded-lg border border-border/30" onError={e => (e.currentTarget.style.display = 'none')} /></div>
      )}
      {loading && <LoadingIndicator message="VLM analyzing image content" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {imageUrl && <img src={imageUrl} alt="Analyzed" className="max-w-sm rounded-lg border border-border/30" />}
          {result.analysis && (
            <Card className="border-sky-500/30 bg-sky-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-sky-400"><Eye className="w-4 h-4" /> VLM Image Analysis</CardTitle></CardHeader>
              <CardContent className="prose prose-invert prose-sm max-w-none text-muted-foreground">
                <ReactMarkdown>{result.analysis}</ReactMarkdown>
              </CardContent>
            </Card>
          )}
          {result.relatedIntel?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Related Intelligence</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {result.relatedIntel.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Breach Checker Module
// ============================================================
interface BreachResult {
  target: string; severity: string; detectedBreaches: string[]; dataTypes: string[];
  criticalIndicators: string[]; highIndicators: string[]; mediumIndicators: string[];
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function BreachModule() {
  const [query, setQuery] = useState('');
  const { loading, result, error, search } = useOSINTSearch<BreachResult>();

  const doSearch = useCallback(() => {
    if (!query.trim()) return;
    search('/api/osint/breach-checker', { query: query.trim() });
  }, [query, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<ShieldAlert className="w-5 h-5" />} color="from-red-500 to-orange-500" title="Breach Checker" subtitle="Check if your data has been exposed in breaches" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter email or username to check..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4 mr-2" />}{loading ? 'Checking' : 'Check'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Scanning breach databases & dark web" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className={`border-2 ${result.severity === 'critical' ? 'border-red-600/50 bg-red-600/10' : result.severity === 'high' ? 'border-orange-500/50 bg-orange-500/10' : result.severity === 'medium' ? 'border-amber-500/50 bg-amber-500/10' : 'border-emerald-500/50 bg-emerald-500/10'}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">Target</div>
                  <div className="text-lg font-mono font-medium">{result.target}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-muted-foreground">Severity</div>
                  <SeverityBadge severity={result.severity} />
                </div>
              </div>
            </CardContent>
          </Card>
          {result.detectedBreaches?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Affected Services ({result.detectedBreaches.length})</CardTitle></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.detectedBreaches.map(b => <Badge key={b} className="bg-red-500/20 text-red-400 border-red-500/30">{b}</Badge>)}</div></CardContent>
            </Card>
          )}
          {result.dataTypes?.length > 0 && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-400"><Database className="w-4 h-4" />Exposed Data Types</CardTitle></CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{result.dataTypes.map(d => <Badge key={d} variant="outline" className="text-xs">{d}</Badge>)}</div></CardContent>
            </Card>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.searchResults?.map((r, i) => <ResultLink key={i} {...r} />)}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Google Dorking Module
// ============================================================
interface DorkResult {
  target: string; totalFindings: number; highRiskFindings: number;
  dorkResults: Array<{ dorkName: string; dorkQuery: string; results: Array<{ url: string; title: string; snippet: string; domain: string }> }>;
  allDorkTemplates: Array<{ name: string; query: string }>;
  aiAnalysis: string;
}

function DorkingModule() {
  const [target, setTarget] = useState('');
  const { loading, result, error, search } = useOSINTSearch<DorkResult>();

  const doSearch = useCallback(() => {
    if (!target.trim()) return;
    search('/api/osint/google-dorking', { target: target.trim() });
  }, [target, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Code className="w-5 h-5" />} color="from-lime-500 to-green-500" title="Google Dorking" subtitle="Advanced search operators for OSINT" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter target domain..." value={target} onChange={e => setTarget(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-lime-600 hover:bg-lime-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Dorking' : 'Dork'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Running Google dork queries" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className="text-xl font-bold text-lime-400">{result.totalFindings}</div><div className="text-xs text-muted-foreground">Total Findings</div></div>
            <div className="p-3 rounded-lg border border-red-500/30 bg-red-500/10 text-center"><div className="text-xl font-bold text-red-400">{result.highRiskFindings}</div><div className="text-xs text-muted-foreground">High Risk</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className="text-xl font-bold text-cyan-400">{result.dorkResults?.filter(d => d.results.length > 0).length || 0}</div><div className="text-xs text-muted-foreground">Categories Hit</div></div>
          </div>
          <Accordion type="multiple" className="w-full">
            {result.dorkResults?.map((d, i) => (
              <AccordionItem key={i} value={`dork-${i}`}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={d.results.length > 0 ? 'text-amber-400 border-amber-500/30' : 'text-muted-foreground'}>{d.results.length}</Badge>
                    <span>{d.dorkName}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="mb-2"><code className="text-[10px] bg-card/50 px-2 py-1 rounded text-muted-foreground">{d.dorkQuery}</code></div>
                  <div className="space-y-2">{d.results.map((r, j) => <ResultLink key={j} {...r} />)}</div>
                  {d.results.length === 0 && <p className="text-xs text-muted-foreground py-2">No results found for this dork.</p>}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {result.allDorkTemplates?.length > 0 && (
            <Card className="border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Code className="w-4 h-4 text-lime-400" />All Dork Templates</CardTitle></CardHeader>
              <CardContent><div className="space-y-1 max-h-48 overflow-y-auto">{result.allDorkTemplates.map((t, i) => (
                <div key={i} className="flex items-start gap-2 text-xs"><Badge variant="outline" className="text-[9px] shrink-0">{t.name}</Badge><code className="text-muted-foreground break-all">{t.query}</code></div>
              ))}</div></CardContent>
            </Card>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Subdomain Finder Module
// ============================================================
interface SubdomainResult {
  domain: string; totalSubdomains: number; subdomains: string[];
  categories: Record<string, string[]>;
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function SubdomainModule() {
  const [domain, setDomain] = useState('');
  const { loading, result, error, search } = useOSINTSearch<SubdomainResult>();

  const doSearch = useCallback(() => {
    if (!domain.trim()) return;
    search('/api/osint/subdomain-finder', { domain: domain.trim() });
  }, [domain, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Network className="w-5 h-5" />} color="from-teal-500 to-cyan-500" title="Subdomain Finder" subtitle="Enumerate subdomains via web intelligence" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Network className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain (e.g., example.com)..." value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-teal-600 hover:bg-teal-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Finding' : 'Find'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Discovering subdomains for ${domain}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold text-teal-400">{result.totalSubdomains}</div>
            <div className="text-sm text-muted-foreground">subdomains found for <span className="font-mono text-foreground">{result.domain}</span></div>
          </div>
          {result.categories && Object.entries(result.categories).filter(([, subs]) => subs.length > 0).map(([cat, subs]) => (
            <Card key={cat} className="border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  {cat === 'Admin & Internal' ? <ShieldAlert className="w-4 h-4 text-red-400" /> :
                   cat === 'Staging & Testing' ? <Bug className="w-4 h-4 text-amber-400" /> :
                   cat === 'API & Services' ? <Zap className="w-4 h-4 text-cyan-400" /> :
                   <Network className="w-4 h-4 text-teal-400" />}
                  {cat} ({subs.length})
                </CardTitle>
              </CardHeader>
              <CardContent><div className="flex flex-wrap gap-2">{subs.map(s => (
                <a key={s} href={`https://${s}`} target="_blank" rel="noopener noreferrer" className="text-xs font-mono bg-card/50 px-2 py-1 rounded border border-border/30 hover:border-teal-500/30 hover:text-teal-400 transition-colors">{s} <ExternalLink className="w-2 h-2 inline" /></a>
              ))}</div></CardContent>
            </Card>
          ))}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// DNS Recon Module
// ============================================================
interface DNSResult {
  domain: string;
  dnssec: { detected: boolean; details: string };
  emailSecurity: { spf: boolean; dkim: boolean; dmarc: boolean; level: string; score: number };
  dnsProvider: string;
  dnsResults: Array<{ url: string; title: string; snippet: string }>;
  mxResults: Array<{ url: string; title: string; snippet: string }>;
  nsResults: Array<{ url: string; title: string; snippet: string }>;
  txtResults: Array<{ url: string; title: string; snippet: string }>;
  cnameResults: Array<{ url: string; title: string; snippet: string }>;
  aiAnalysis: string;
}

function DNSModule() {
  const [domain, setDomain] = useState('');
  const { loading, result, error, search } = useOSINTSearch<DNSResult>();

  const doSearch = useCallback(() => {
    if (!domain.trim()) return;
    search('/api/osint/dns', { domain: domain.trim() });
  }, [domain, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Wifi className="w-5 h-5" />} color="from-yellow-500 to-amber-500" title="DNS Recon" subtitle="DNS enumeration & email security analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter domain for DNS analysis..." value={domain} onChange={e => setDomain(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-amber-600 hover:bg-amber-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing DNS records for ${domain}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">DNS Provider</div><div className="text-sm font-medium">{result.dnsProvider}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">DNSSEC</div><div className="text-sm font-medium">{result.dnssec?.detected ? '✅ Enabled' : '❌ Not Found'}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Email Security</div><div className="text-sm font-medium capitalize">{result.emailSecurity?.level || 'unknown'}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">SPF/DKIM/DMARC</div><div className="flex gap-1 mt-1">
              <Badge variant="outline" className={`text-[9px] ${result.emailSecurity?.spf ? 'text-emerald-400' : 'text-muted-foreground'}`}>SPF</Badge>
              <Badge variant="outline" className={`text-[9px] ${result.emailSecurity?.dkim ? 'text-emerald-400' : 'text-muted-foreground'}`}>DKIM</Badge>
              <Badge variant="outline" className={`text-[9px] ${result.emailSecurity?.dmarc ? 'text-emerald-400' : 'text-muted-foreground'}`}>DMARC</Badge>
            </div></div>
          </div>
          <Tabs defaultValue="dns">
            <TabsList className="bg-card/50">
              <TabsTrigger value="dns" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Network className="w-3 h-3 mr-1" />DNS ({result.dnsResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="txt" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Mail className="w-3 h-3 mr-1" />TXT/SPF ({result.txtResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="mx" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Server className="w-3 h-3 mr-1" />MX ({result.mxResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="cname" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-400"><Network className="w-3 h-3 mr-1" />CNAME ({result.cnameResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="dns" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.dnsResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="txt" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.txtResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="mx" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.mxResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
            <TabsContent value="cname" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.cnameResults?.map((r, i) => <ResultLink key={i} title={r.title} snippet={r.snippet} url={r.url} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Web Security Module
// ============================================================
interface WebSecResult {
  hostname: string; url: string; overallStatus: string; securityScore: number;
  securityChecks: Array<{ category: string; status: string; items: Array<{ name: string; status: string; detail: string }> }>;
  sslResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  headerResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  malwareResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  breachResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function WebSecModule() {
  const [url, setUrl] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WebSecResult>();

  const doSearch = useCallback(() => {
    if (!url.trim()) return;
    search('/api/osint/web-security', { url: url.trim() });
  }, [url, search]);

  const statusIcon = (s: string) => {
    if (s === 'pass') return <CheckCircle2 className="w-3 h-3 text-emerald-400" />;
    if (s === 'fail') return <XCircle className="w-3 h-3 text-red-400" />;
    if (s === 'warning') return <AlertTriangle className="w-3 h-3 text-amber-400" />;
    return <HelpCircle className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<ShieldCheck className="w-5 h-5" />} color="from-emerald-500 to-green-600" title="Web Security" subtitle="SSL/TLS, headers & malware check" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter URL to audit..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4 mr-2" />}{loading ? 'Auditing' : 'Audit'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Running security audit on ${url}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className="text-2xl font-bold">{result.hostname}</div><div className="text-xs text-muted-foreground">Hostname</div></div>
            <div className={`p-3 rounded-lg border-2 text-center ${result.overallStatus === 'safe' ? 'border-emerald-500/50 bg-emerald-500/10' : result.overallStatus === 'suspicious' ? 'border-amber-500/50 bg-amber-500/10' : 'border-red-500/50 bg-red-500/10'}`}><div className={`text-2xl font-bold ${result.overallStatus === 'safe' ? 'text-emerald-400' : result.overallStatus === 'suspicious' ? 'text-amber-400' : 'text-red-400'}`}>{result.securityScore}/100</div><div className="text-xs text-muted-foreground">Security Score</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30 text-center"><div className={`text-lg font-bold capitalize ${result.overallStatus === 'safe' ? 'text-emerald-400' : result.overallStatus === 'suspicious' ? 'text-amber-400' : 'text-red-400'}`}>{result.overallStatus}</div><div className="text-xs text-muted-foreground">Status</div></div>
          </div>
          {result.securityChecks?.map((cat, i) => (
            <Card key={i} className="border-border/30">
              <CardHeader className="pb-2"><CardTitle className="text-sm">{cat.category}</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{cat.items?.map((item, j) => (
                <div key={j} className="flex items-center gap-2 text-xs">{statusIcon(item.status)}<span className="font-medium">{item.name}</span><span className="text-muted-foreground">- {item.detail}</span></div>
              ))}</div></CardContent>
            </Card>
          ))}
          <Tabs defaultValue="ssl">
            <TabsList className="bg-card/50">
              <TabsTrigger value="ssl" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Lock className="w-3 h-3 mr-1" />SSL ({result.sslResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="headers" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Code className="w-3 h-3 mr-1" />Headers ({result.headerResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="malware" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Bug className="w-3 h-3 mr-1" />Malware ({result.malwareResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="breach" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><AlertTriangle className="w-3 h-3 mr-1" />Breach ({result.breachResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="ssl" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.sslResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="headers" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.headerResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="malware" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.malwareResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="breach" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.breachResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// AI Chat Module
// ============================================================
interface ChatMessage { role: 'user' | 'assistant'; content: string; }

function AIChatModule() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetchWithTimeout('/api/osint/ai-chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg, history: messages.slice(-10) }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response || 'No response.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error. Please try again.' }]);
    } finally { setLoading(false); }
  }, [input, loading, messages]);

  return (
    <div className="space-y-4 h-full flex flex-col">
      <ModuleHeader icon={<Brain className="w-5 h-5" />} color="from-fuchsia-500 to-pink-500" title="XANVYOR-AI" subtitle="OSINT AI Assistant" />
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[500px] rounded-lg border border-border/30 bg-card/20 p-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <div className="text-center">
              <Brain className="w-12 h-12 mx-auto mb-3 text-fuchsia-400 opacity-50" />
              <p>Ask me anything about OSINT, cybersecurity, or digital forensics.</p>
              <p className="text-xs mt-1">I can help with investigation strategies, tool recommendations, and analysis.</p>
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${m.role === 'user' ? 'bg-fuchsia-500/20 text-fuchsia-100 border border-fuchsia-500/30' : 'bg-card/50 border border-border/30'}`}>
              <div className="prose prose-invert prose-sm max-w-none">
                {m.role === 'assistant' ? <ReactMarkdown>{m.content}</ReactMarkdown> : m.content}
              </div>
            </div>
          </motion.div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-card/50 border border-border/30 rounded-xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        <Input placeholder="Ask XANVYOR-AI anything..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} className="bg-card/50 border-border/50" />
        <Button onClick={sendMessage} disabled={loading} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// WiFi Scanner Module
// ============================================================
interface WifiScanResult {
  success: boolean; networks: Array<{ ssid: string; bssid: string; signalStrength: number; encryption: string; channel: number; frequency: string; isConnected: boolean; password: string; vulnerability: string }>;
  totalFound: number; networksWithPassword: number; safeNetworks: number; vulnerableNetworks: number;
  mapLocation: { lat: number; lng: number; area: string; road: string; neighborhood: string; city: string; state: string; fullAddress: string };
  gpsDetected: boolean; locationMethod: string; ipLocation: string; connectedSSID: string; aiAnalysis: string;
}

function WifiScanModule() {
  const [location, setLocation] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WifiScanResult>();

  const doSearch = useCallback(() => {
    search('/api/osint/wifi-scan', { location: location.trim() });
  }, [location, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Wifi className="w-5 h-5" />} color="from-purple-500 to-violet-500" title="WiFi Scanner" subtitle="Scan & analyze WiFi networks" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter location (optional)..." value={location} onChange={e => setLocation(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-purple-600 hover:bg-purple-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Scanning WiFi networks" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Networks Found</div><div className="text-2xl font-bold text-purple-400">{result.totalFound}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">With Password</div><div className="text-2xl font-bold text-amber-400">{result.networksWithPassword}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Safe</div><div className="text-2xl font-bold text-emerald-400">{result.safeNetworks}</div></div>
            <div className="p-3 rounded-lg border border-border/30 bg-card/30"><div className="text-xs text-muted-foreground">Vulnerable</div><div className="text-2xl font-bold text-red-400">{result.vulnerableNetworks}</div></div>
          </div>
          {result.mapLocation && (
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardContent className="p-4">
                <div className="text-sm font-medium mb-1">{result.mapLocation.fullAddress || 'Location detected'}</div>
                <div className="text-xs text-muted-foreground">Method: {result.locationMethod} | GPS: {result.gpsDetected ? 'Yes' : 'No'}</div>
                {result.connectedSSID && <div className="text-xs text-purple-400 mt-1">Connected: {result.connectedSSID}</div>}
              </CardContent>
            </Card>
          )}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.networks?.map((n, i) => (
              <div key={i} className={`p-3 rounded-lg border ${n.vulnerability ? 'border-red-500/30 bg-red-500/5' : n.password ? 'border-amber-500/30 bg-amber-500/5' : 'border-emerald-500/30 bg-emerald-500/5'}`}>
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium">{n.ssid || 'Hidden'}</div><div className="text-xs text-muted-foreground font-mono">{n.bssid}</div></div>
                  <div className="flex items-center gap-2">
                    {n.isConnected && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">Connected</Badge>}
                    <Badge variant="outline" className="text-xs">{n.encryption}</Badge>
                    {n.vulnerability && <SeverityBadge severity={n.vulnerability} />}
                  </div>
                </div>
                <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                  <span>Signal: {n.signalStrength}%</span><span>Ch: {n.channel}</span><span>{n.frequency}</span>
                  {n.password && <span className="text-amber-400">Password exposed</span>}
                </div>
              </div>
            ))}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// WiFi AP Lookup Module
// ============================================================
interface WifiAPResult {
  success: boolean; ssid: string; bssid: string;
  ouiInfo: { oui: string; manufacturer: string };
  networkInfo: { encryption: string; channel: number; signalStrength: number; frequency: string };
  locationResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  securityResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  vulnerabilityResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  deviceResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; aiAnalysis: string;
}

function WifiAPModule() {
  const [ssid, setSsid] = useState('');
  const [bssid, setBssid] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WifiAPResult>();

  const doSearch = useCallback(() => {
    if (!ssid.trim() && !bssid.trim()) return;
    search('/api/osint/wifi', { ssid: ssid.trim(), bssid: bssid.trim() });
  }, [ssid, bssid, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Radio className="w-5 h-5" />} color="from-indigo-500 to-purple-500" title="WiFi AP Lookup" subtitle="Access point intelligence & lookup" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="SSID (network name)..." value={ssid} onChange={e => setSsid(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <div className="relative flex-1">
          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="BSSID (MAC address)..." value={bssid} onChange={e => setBssid(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Radio className="w-4 h-4 mr-2" />}{loading ? 'Looking' : 'Lookup'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Looking up WiFi access point" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-indigo-500/30 bg-indigo-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-xs text-muted-foreground">SSID</div><div className="text-sm font-medium">{result.ssid || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">BSSID</div><div className="text-sm font-mono">{result.bssid || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Manufacturer</div><div className="text-sm font-medium">{result.ouiInfo?.manufacturer || 'Unknown'}</div></div>
                <div><div className="text-xs text-muted-foreground">OUI</div><div className="text-sm font-mono">{result.ouiInfo?.oui || 'N/A'}</div></div>
              </div>
              {result.networkInfo && (
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs">{result.networkInfo.encryption}</Badge>
                  <Badge variant="outline" className="text-xs">Ch {result.networkInfo.channel}</Badge>
                  <Badge variant="outline" className="text-xs">Signal {result.networkInfo.signalStrength}%</Badge>
                  <Badge variant="outline" className="text-xs">{result.networkInfo.frequency}</Badge>
                </div>
              )}
            </CardContent>
          </Card>
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div>
              </CardContent>
            </Card>
          )}
          <Tabs defaultValue="location">
            <TabsList className="bg-card/50">
              <TabsTrigger value="location" className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"><MapPin className="w-3 h-3 mr-1" />Location ({result.locationResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Shield className="w-3 h-3 mr-1" />Security ({result.securityResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="vuln" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><Bug className="w-3 h-3 mr-1" />Vulns ({result.vulnerabilityResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="device" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Cpu className="w-3 h-3 mr-1" />Devices ({result.deviceResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="location" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.locationResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="security" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.securityResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="vuln" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.vulnerabilityResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="device" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.deviceResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// MAC Address Lookup Module
// ============================================================
interface MacResult {
  success: boolean; mac: string; oui: string; manufacturer: string; deviceType: string;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>; aiAnalysis: string;
}

function MacModule() {
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

// ============================================================
// People Search Module
// ============================================================
interface PeopleResult {
  success: boolean; name: string;
  profiles: Array<{ platform: string; url: string; snippet: string; confidence: string }>;
  associatedNames: string[]; locations: string[];
  socialAccounts: Array<{ url: string; title: string; snippet: string; domain: string }>;
  newsResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function PeopleModule() {
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
                      <StatusBadge status={p.confidence === 'high' ? 'likely_found' : p.confidence === 'low' ? 'not_found' : 'unknown'} />
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
            <TabsContent value="social" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.socialAccounts?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="news" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.newsResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Vehicle Plate Module
// ============================================================
interface VehicleResult {
  success: boolean; plate: string; regionCode: string; region: string; province: string; regionDescription: string; vehicleType: string;
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  publicRecords: Array<{ url: string; title: string; snippet: string; domain: string }>;
  crimeReports: Array<{ url: string; title: string; snippet: string; domain: string }>;
  crimeCount: number;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  stnkResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function VehicleModule() {
  const [plate, setPlate] = useState('');
  const { loading, result, error, search } = useOSINTSearch<VehicleResult>();

  const doSearch = useCallback(() => {
    if (!plate.trim()) return;
    search('/api/osint/vehicle', { plate: plate.trim() });
  }, [plate, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Car className="w-5 h-5" />} color="from-slate-500 to-gray-500" title="Vehicle Plate Check" subtitle="Indonesian vehicle plate lookup" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Car className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter plate number (e.g. B 1234 XY)..." value={plate} onChange={e => setPlate(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-slate-600 hover:bg-slate-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Car className="w-4 h-4 mr-2" />}{loading ? 'Checking' : 'Check'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Checking plate ${plate}`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-slate-500/30 bg-slate-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div><div className="text-xs text-muted-foreground">Plate</div><div className="text-sm font-mono font-bold">{result.plate}</div></div>
                <div><div className="text-xs text-muted-foreground">Region</div><div className="text-sm font-medium">{result.region}</div></div>
                <div><div className="text-xs text-muted-foreground">Province</div><div className="text-sm font-medium">{result.province}</div></div>
                <div><div className="text-xs text-muted-foreground">Code</div><div className="text-sm font-mono">{result.regionCode}</div></div>
                <div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.vehicleType || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Crime Reports</div><div className="text-sm font-bold text-red-400">{result.crimeCount}</div></div>
              </div>
              {result.regionDescription && <div className="text-xs text-muted-foreground mt-2">{result.regionDescription}</div>}
            </CardContent>
          </Card>
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div>
              </CardContent>
            </Card>
          )}
          <Tabs defaultValue="search">
            <TabsList className="bg-card/50">
              <TabsTrigger value="search" className="data-[state=active]:bg-slate-500/20 data-[state=active]:text-slate-400"><Search className="w-3 h-3 mr-1" />Search ({result.searchResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="records" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Database className="w-3 h-3 mr-1" />Records ({result.publicRecords?.length || 0})</TabsTrigger>
              <TabsTrigger value="crime" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><AlertTriangle className="w-3 h-3 mr-1" />Crime ({result.crimeReports?.length || 0})</TabsTrigger>
              <TabsTrigger value="stnk" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><FileSearch className="w-3 h-3 mr-1" />STNK ({result.stnkResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="records" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.publicRecords?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="crime" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.crimeReports?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="stnk" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.stnkResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// KTP OCR Module
// ============================================================
interface KtpResult {
  success: boolean;
  ktpData: { nik: string; nama: string; tempatTglLahir: string; jenisKelamin: string; alamat: string; rtRw: string; kelDesa: string; kecamatan: string; agama: string; statusPerkawinan: string; pekerjaan: string; kewarganegaraan: string; provinsi: string; kabupatenKota: string; berlakuHingga: string };
  location: { fullAddress: string; latitude: number; longitude: number; mapUrl: string; embedUrl: string; openStreetMapUrl: string };
  publicRecords: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  aiAnalysis: string;
}

function KtpModule() {
  const [imageUrl, setImageUrl] = useState('');
  const { loading, result, error, search } = useOSINTSearch<KtpResult>();

  const doSearch = useCallback(() => {
    if (!imageUrl.trim()) return;
    search('/api/osint/ktp-track', { imageUrl: imageUrl.trim() });
  }, [imageUrl, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<CreditCard className="w-5 h-5" />} color="from-red-500 to-rose-500" title="KTP OCR" subtitle="Indonesian ID card OCR & analysis" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Upload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter KTP image URL..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Scan className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="VLM analyzing KTP image" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.ktpData && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><CreditCard className="w-4 h-4" /> KTP Data Extracted</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><div className="text-xs text-muted-foreground">NIK</div><div className="text-sm font-mono font-medium">{result.ktpData.nik}</div></div>
                  <div><div className="text-xs text-muted-foreground">Nama</div><div className="text-sm font-medium">{result.ktpData.nama}</div></div>
                  <div><div className="text-xs text-muted-foreground">TTL</div><div className="text-sm font-medium">{result.ktpData.tempatTglLahir}</div></div>
                  <div><div className="text-xs text-muted-foreground">Jenis Kelamin</div><div className="text-sm font-medium">{result.ktpData.jenisKelamin}</div></div>
                  <div><div className="text-xs text-muted-foreground">Alamat</div><div className="text-sm font-medium">{result.ktpData.alamat}</div></div>
                  <div><div className="text-xs text-muted-foreground">RT/RW</div><div className="text-sm font-mono">{result.ktpData.rtRw}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kel/Desa</div><div className="text-sm font-medium">{result.ktpData.kelDesa}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kecamatan</div><div className="text-sm font-medium">{result.ktpData.kecamatan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Agama</div><div className="text-sm font-medium">{result.ktpData.agama}</div></div>
                  <div><div className="text-xs text-muted-foreground">Status</div><div className="text-sm font-medium">{result.ktpData.statusPerkawinan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Pekerjaan</div><div className="text-sm font-medium">{result.ktpData.pekerjaan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kewarganegaraan</div><div className="text-sm font-medium">{result.ktpData.kewarganegaraan}</div></div>
                  <div><div className="text-xs text-muted-foreground">Provinsi</div><div className="text-sm font-medium">{result.ktpData.provinsi}</div></div>
                  <div><div className="text-xs text-muted-foreground">Kab/Kota</div><div className="text-sm font-medium">{result.ktpData.kabupatenKota}</div></div>
                  <div><div className="text-xs text-muted-foreground">Berlaku</div><div className="text-sm font-medium">{result.ktpData.berlakuHingga}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.location && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-rose-400" /><span className="text-sm font-medium">Address Location</span></div>
                <div className="text-sm text-muted-foreground">{result.location.fullAddress}</div>
                <div className="flex gap-2 mt-2">
                  {result.location.mapUrl && <a href={result.location.mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:underline">Google Maps</a>}
                  {result.location.openStreetMapUrl && <a href={result.location.openStreetMapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:underline">OpenStreetMap</a>}
                </div>
              </CardContent>
            </Card>
          )}
          {result.dataLeaks?.length > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" />Data Leaks ({result.dataLeaks.length})</CardTitle></CardHeader>
              <CardContent><div className="space-y-1">{result.dataLeaks.map((d, i) => <div key={i} className="text-xs text-muted-foreground"><SeverityBadge severity={d.severity} /> {d.description}</div>)}</div></CardContent>
            </Card>
          )}
          {result.publicRecords?.length > 0 && (
            <div><h3 className="text-sm font-semibold mb-2">Public Records</h3><div className="space-y-2 max-h-48 overflow-y-auto">{result.publicRecords.map((r, i) => <ResultLink key={i} {...r} />)}</div></div>
          )}
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// NIK Decoder Module
// ============================================================
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

function NikModule() {
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

// ============================================================
// School Intel Module
// ============================================================
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

function SchoolModule() {
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

// ============================================================
// E-Wallet Detection Module
// ============================================================
interface EwalletResult {
  success: boolean; phone: string;
  analysis: { carrier: string; country: string };
  wallets: Array<{ platform: string; icon: string; detected: boolean; accountName: string; balance: string; status: string; category: string }>;
  detectedCount: number; riskLevel: string;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; aiAnalysis: string;
}

function EwalletModule() {
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

// ============================================================
// QRIS Merchant Lookup Module
// ============================================================
interface QrisResult {
  success: boolean; query: string;
  merchants: Array<{ name: string; merchantId: string; location: string; address: string; category: string; status: string; lat: number; lng: number }>;
  totalFound: number;
  locationData: { lat: number; lng: number; area: string };
  mapHtml: string; aiAnalysis: string;
}

function QrisModule() {
  const [merchantId, setMerchantId] = useState('');
  const [loc, setLoc] = useState('');
  const { loading, result, error, search } = useOSINTSearch<QrisResult>();

  const doSearch = useCallback(() => {
    search('/api/osint/qris', { merchantId: merchantId.trim(), location: loc.trim() });
  }, [merchantId, loc, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<QrCode className="w-5 h-5" />} color="from-cyan-500 to-blue-500" title="QRIS Merchant Lookup" subtitle="Find QRIS merchant details" />
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Merchant ID..." value={merchantId} onChange={e => setMerchantId(e.target.value)} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Location (optional)..." value={loc} onChange={e => setLoc(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-cyan-600 hover:bg-cyan-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4 mr-2" />}{loading ? 'Searching' : 'Search'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Looking up QRIS merchants" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">Found <span className="font-bold text-cyan-400">{result.totalFound}</span> merchants</div>
            {result.locationData && <Badge variant="outline" className="text-xs"><MapPin className="w-3 h-3 mr-1" />{result.locationData.area}</Badge>}
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {result.merchants?.map((m, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/30 bg-card/30">
                <div className="flex items-center justify-between">
                  <div><div className="text-sm font-medium">{m.name}</div><div className="text-xs text-muted-foreground font-mono">{m.merchantId}</div></div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{m.category}</Badge>
                    <Badge className={m.status === 'active' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs' : 'bg-red-500/20 text-red-400 border-red-500/30 text-xs'}>{m.status}</Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">{m.address || m.location}</div>
              </div>
            ))}
          </div>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Bank Account Check Module
// ============================================================
interface BankResult {
  success: boolean; accountNumber: string; bankCode: string;
  analysis: { bank: string; type: string; riskLevel: string; fraudReports: number };
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  fraudAlerts: Array<{ type: string; severity: string; description: string }>;
  alertCount: number; aiAnalysis: string;
}

function BankModule() {
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

// ============================================================
// Bitcoin Address Analysis Module
// ============================================================
interface BitcoinResult {
  success: boolean; address: string; addressType: string;
  searchResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  transactionResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  riskResults: { riskLevel: string; riskIndicators: string[]; detectedExchanges: string[]; riskDetails: Array<{ url: string; title: string; snippet: string; domain: string }>; darknetDetails: Array<{ url: string; title: string; snippet: string; domain: string }> };
  walletResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  exchangeResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function BitcoinModule() {
  const [address, setAddress] = useState('');
  const { loading, result, error, search } = useOSINTSearch<BitcoinResult>();

  const doSearch = useCallback(() => {
    if (!address.trim()) return;
    search('/api/osint/bitcoin', { address: address.trim() });
  }, [address, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<BitcoinIcon className="w-5 h-5" />} color="from-orange-500 to-amber-500" title="Bitcoin Trace" subtitle="Bitcoin address analysis & risk" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <BitcoinIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter Bitcoin address..." value={address} onChange={e => setAddress(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-orange-600 hover:bg-orange-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BitcoinIcon className="w-4 h-4 mr-2" />}{loading ? 'Tracing' : 'Trace'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Analyzing Bitcoin address`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><div className="text-xs text-muted-foreground">Address</div><div className="text-sm font-mono font-medium truncate">{result.address}</div></div>
                <div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.addressType || 'Unknown'}</div></div>
                <div><div className="text-xs text-muted-foreground">Risk</div><SeverityBadge severity={result.riskResults?.riskLevel || 'low'} /></div>
              </div>
              {result.riskResults?.riskIndicators?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-3">{result.riskResults.riskIndicators.map((r, i) => <Badge key={i} className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{r}</Badge>)}</div>
              )}
              {result.riskResults?.detectedExchanges?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">{result.riskResults.detectedExchanges.map((e, i) => <Badge key={i} variant="outline" className="text-xs">{e}</Badge>)}</div>
              )}
            </CardContent>
          </Card>
          <Tabs defaultValue="search">
            <TabsList className="bg-card/50">
              <TabsTrigger value="search" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><Search className="w-3 h-3 mr-1" />Search ({result.searchResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="tx" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Activity className="w-3 h-3 mr-1" />Txns ({result.transactionResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="wallet" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Wallet className="w-3 h-3 mr-1" />Wallet ({result.walletResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="exchange" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Building2 className="w-3 h-3 mr-1" />Exchange ({result.exchangeResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="search" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.searchResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="tx" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.transactionResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="wallet" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.walletResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="exchange" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.exchangeResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Phone Device Intelligence Module
// ============================================================
interface PhoneDevResult {
  success: boolean; phone: string;
  analysis: { original: string; cleaned: string; countryCode: string; country: string; carrier: string; numberType: string };
  deviceInfo: { likelyDeviceType: string; likelyOS: string; confidence: string; detectedModels: string[] };
  registeredApps: Array<{ platform: string; icon: string; detected: boolean; category: string }>;
  detectedAppCount: number;
  connectedDevices: Array<{ name: string; type: string; lastSeen: string }>;
  imeiInfo: Array<{ imei: string; brand: string; model: string; status: string }>;
  accountSecurity: { twoFactorEnabled: boolean; lastPasswordChange: string; compromisedAccounts: string[]; securityScore: number };
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number;
  deviceResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  appResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  securityResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function PhoneDevModule() {
  const [phone, setPhone] = useState('');
  const { loading, result, error, search } = useOSINTSearch<PhoneDevResult>();

  const doSearch = useCallback(() => {
    if (!phone.trim()) return;
    search('/api/osint/phone-device', { phone: phone.trim() });
  }, [phone, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Smartphone className="w-5 h-5" />} color="from-emerald-500 to-teal-500" title="Phone Device Intelligence" subtitle="Device & app intelligence" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Analyzing phone device intelligence" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div><div className="text-xs text-muted-foreground">Phone</div><div className="text-sm font-mono">{result.analysis?.cleaned}</div></div>
                <div><div className="text-xs text-muted-foreground">Carrier</div><div className="text-sm font-medium">{result.analysis?.carrier || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Type</div><div className="text-sm font-medium">{result.analysis?.numberType || 'N/A'}</div></div>
                <div><div className="text-xs text-muted-foreground">Country</div><div className="text-sm font-medium">{result.analysis?.country || 'N/A'}</div></div>
              </div>
            </CardContent>
          </Card>
          {result.deviceInfo && (
            <Card className="border-teal-500/30 bg-teal-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-teal-400"><Smartphone className="w-4 h-4" />Device Info</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div><div className="text-xs text-muted-foreground">Likely Device</div><div className="text-sm font-medium">{result.deviceInfo.likelyDeviceType || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Likely OS</div><div className="text-sm font-medium">{result.deviceInfo.likelyOS || 'Unknown'}</div></div>
                  <div><div className="text-xs text-muted-foreground">Confidence</div><div className="text-sm font-medium">{result.deviceInfo.confidence || 'N/A'}</div></div>
                </div>
                {result.deviceInfo.detectedModels?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{result.deviceInfo.detectedModels.map((m, i) => <Badge key={i} variant="outline" className="text-xs">{m}</Badge>)}</div>}
              </CardContent>
            </Card>
          )}
          {result.accountSecurity && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-400"><Shield className="w-4 h-4" />Account Security</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div><span className="text-xs text-muted-foreground">Score:</span> <span className="font-bold">{result.accountSecurity.securityScore}/100</span></div>
                  <div><span className="text-xs text-muted-foreground">2FA:</span> <span className="font-medium">{result.accountSecurity.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span></div>
                </div>
                {result.accountSecurity.compromisedAccounts?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{result.accountSecurity.compromisedAccounts.map((a, i) => <Badge key={i} className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">{a}</Badge>)}</div>}
              </CardContent>
            </Card>
          )}
          {result.registeredApps?.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2">Detected Apps ({result.detectedAppCount})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {result.registeredApps.map(a => (
                  <div key={a.platform} className={`p-2 rounded-lg border text-center ${a.detected ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-border/30 bg-card/20'}`}>
                    <span className="text-lg block">{a.icon}</span>
                    <div className="text-[10px] font-medium mt-0.5">{a.platform}</div>
                    {a.detected && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[8px] mt-0.5">✓</Badge>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="device">
            <TabsList className="bg-card/50">
              <TabsTrigger value="device" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Smartphone className="w-3 h-3 mr-1" />Device ({result.deviceResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="apps" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Layers className="w-3 h-3 mr-1" />Apps ({result.appResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Shield className="w-3 h-3 mr-1" />Security ({result.securityResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="device" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.deviceResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="apps" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.appResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="security" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.securityResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Phone GPS Location Module
// ============================================================
interface PhoneLocResult {
  success: boolean; phone: string; cleaned: string; countryCode: string; country: string;
  location: { region: string; city: string; province: string; fullAddress: string; latitude: number; longitude: number; accuracy: string; locationConfidence: string; locationDescription: string; nearbyLandmarks: string[]; mapUrl: string; openStreetMapUrl: string };
  areaInfo: Array<{ url: string; title: string; snippet: string; domain: string }>;
  carrierInfo: { carrier: string; type: string; network: string; mcc: string; mnc: string; region: string; timezone: string; country: string; countryCode: string };
  ipInfo: { estimatedIP: string; ispProvider: string; networkType: string; cellTowerInfo: string; estimatedIPRange: string };
  locationResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  ipResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  operatorResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  dataLeaks: Array<{ type: string; severity: string; source: string; description: string; url: string }>;
  leakCount: number; aiAnalysis: string;
}

function PhoneLocModule() {
  const [phone, setPhone] = useState('');
  const { loading, result, error, search } = useOSINTSearch<PhoneLocResult>();

  const doSearch = useCallback(() => {
    if (!phone.trim()) return;
    search('/api/osint/phone-location', { phone: phone.trim() });
  }, [phone, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<MapPin className="w-5 h-5" />} color="from-rose-500 to-pink-500" title="Phone GPS Location" subtitle="Trace phone GPS location" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter phone number..." value={phone} onChange={e => setPhone(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-rose-600 hover:bg-rose-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <MapPin className="w-4 h-4 mr-2" />}{loading ? 'Tracing' : 'Trace'}
        </Button>
      </div>
      {loading && <LoadingIndicator message="Tracing phone GPS location" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {result.location && (
            <Card className="border-rose-500/30 bg-rose-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><MapPin className="w-5 h-5 text-rose-400" /><div className="text-lg font-bold">{result.location.fullAddress || 'Location Found'}</div></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">City</div><div className="text-sm font-medium">{result.location.city}</div></div>
                  <div><div className="text-xs text-muted-foreground">Province</div><div className="text-sm font-medium">{result.location.province}</div></div>
                  <div><div className="text-xs text-muted-foreground">Confidence</div><div className="text-sm font-medium">{result.location.locationConfidence}</div></div>
                  <div><div className="text-xs text-muted-foreground">Accuracy</div><div className="text-sm font-medium">{result.location.accuracy}</div></div>
                </div>
                {result.location.nearbyLandmarks?.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{result.location.nearbyLandmarks.map((l, i) => <Badge key={i} variant="outline" className="text-xs">{l}</Badge>)}</div>}
                <div className="flex gap-2 mt-2">
                  {result.location.mapUrl && <a href={result.location.mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:underline">Google Maps</a>}
                  {result.location.openStreetMapUrl && <a href={result.location.openStreetMapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:underline">OpenStreetMap</a>}
                </div>
              </CardContent>
            </Card>
          )}
          {result.carrierInfo && (
            <Card className="border-pink-500/30 bg-pink-500/5">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><div className="text-xs text-muted-foreground">Carrier</div><div className="text-sm font-medium">{result.carrierInfo.carrier}</div></div>
                  <div><div className="text-xs text-muted-foreground">Network</div><div className="text-sm font-medium">{result.carrierInfo.network}</div></div>
                  <div><div className="text-xs text-muted-foreground">MCC/MNC</div><div className="text-sm font-mono">{result.carrierInfo.mcc}/{result.carrierInfo.mnc}</div></div>
                  <div><div className="text-xs text-muted-foreground">Timezone</div><div className="text-sm font-medium">{result.carrierInfo.timezone}</div></div>
                </div>
              </CardContent>
            </Card>
          )}
          {result.leakCount > 0 && (
            <Card className="border-red-500/30 bg-red-500/5">
              <CardContent className="p-4"><div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4" /><span className="text-sm font-medium">{result.leakCount} data leaks found</span></div></CardContent>
            </Card>
          )}
          <Tabs defaultValue="location">
            <TabsList className="bg-card/50">
              <TabsTrigger value="location" className="data-[state=active]:bg-rose-500/20 data-[state=active]:text-rose-400"><MapPin className="w-3 h-3 mr-1" />Location ({result.locationResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="ip" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Globe className="w-3 h-3 mr-1" />IP ({result.ipResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="operator" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Phone className="w-3 h-3 mr-1" />Operator ({result.operatorResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="location" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.locationResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="ip" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.ipResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="operator" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.operatorResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Web Vulnerability Scanner Module
// ============================================================
interface WebVulnResult {
  hostname: string; url: string; threatLevel: string; vulnScore: number;
  vulnerabilities: Array<{ id: string; name: string; severity: string; status: string; description: string; detail: string; results: string[]; owasp: string; cvss: number }>;
  vulnCount: number; criticalCount: number; highCount: number; mediumCount: number;
  sqliResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  xssResults: Array<{ url: string; title: string; snippet: string; domain: string }>;
  aiAnalysis: string;
}

function WebVulnModule() {
  const [url, setUrl] = useState('');
  const { loading, result, error, search } = useOSINTSearch<WebVulnResult>();

  const doSearch = useCallback(() => {
    if (!url.trim()) return;
    search('/api/osint/web-vuln', { url: url.trim() });
  }, [url, search]);

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Bug className="w-5 h-5" />} color="from-red-500 to-orange-500" title="Web Vulnerability Scanner" subtitle="Scan for web vulnerabilities" />
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Bug className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Enter URL to scan (e.g. https://example.com)..." value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} className="pl-10 bg-card/50 border-border/50" />
        </div>
        <Button onClick={doSearch} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white min-w-[100px]">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bug className="w-4 h-4 mr-2" />}{loading ? 'Scanning' : 'Scan'}
        </Button>
      </div>
      {loading && <LoadingIndicator message={`Scanning ${url} for vulnerabilities`} />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <Card className={`border-2 ${result.threatLevel === 'critical' ? 'border-red-600/50 bg-red-600/10' : result.threatLevel === 'high' ? 'border-orange-500/50 bg-orange-500/10' : result.threatLevel === 'medium' ? 'border-amber-500/50 bg-amber-500/10' : 'border-emerald-500/50 bg-emerald-500/10'}`}>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div><div className="text-xs text-muted-foreground">Host</div><div className="text-sm font-mono font-medium">{result.hostname}</div></div>
                <div><div className="text-xs text-muted-foreground">Threat Level</div><ThreatBadge level={result.threatLevel} /></div>
                <div><div className="text-xs text-muted-foreground">Vuln Score</div><div className="text-2xl font-bold">{result.vulnScore}</div></div>
                <div><div className="text-xs text-muted-foreground">Vulnerabilities</div><div className="text-2xl font-bold text-red-400">{result.vulnCount}</div></div>
                <div><div className="text-xs text-muted-foreground">Critical/High</div><div className="text-sm font-bold"><span className="text-red-400">{result.criticalCount}</span> / <span className="text-orange-400">{result.highCount}</span></div></div>
              </div>
            </CardContent>
          </Card>
          {result.vulnerabilities?.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {result.vulnerabilities.map((v, i) => (
                <div key={i} className={`p-3 rounded-lg border ${v.severity === 'critical' ? 'border-red-600/40 bg-red-600/5' : v.severity === 'high' ? 'border-orange-500/40 bg-orange-500/5' : 'border-amber-500/40 bg-amber-500/5'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><SeverityBadge severity={v.severity} /><span className="text-sm font-medium">{v.name}</span></div>
                    <div className="flex items-center gap-2">
                      {v.owasp && <Badge variant="outline" className="text-[10px]">{v.owasp}</Badge>}
                      {v.cvss > 0 && <Badge variant="outline" className="text-[10px]">CVSS: {v.cvss}</Badge>}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{v.description}</p>
                  <Badge className={v.status === 'vulnerable' ? 'bg-red-500/20 text-red-400 border-red-500/30 text-xs mt-1' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs mt-1'}>{v.status}</Badge>
                </div>
              ))}
            </div>
          )}
          <Tabs defaultValue="sqli">
            <TabsList className="bg-card/50">
              <TabsTrigger value="sqli" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400"><Database className="w-3 h-3 mr-1" />SQLi ({result.sqliResults?.length || 0})</TabsTrigger>
              <TabsTrigger value="xss" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400"><Code className="w-3 h-3 mr-1" />XSS ({result.xssResults?.length || 0})</TabsTrigger>
            </TabsList>
            <TabsContent value="sqli" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.sqliResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
            <TabsContent value="xss" className="mt-3"><div className="space-y-2 max-h-96 overflow-y-auto">{result.xssResults?.map((r, i) => <ResultLink key={i} {...r} />)}</div></TabsContent>
          </Tabs>
          <AIAnalysisCard analysis={result.aiAnalysis || ''} />
        </motion.div>
      )}
    </div>
  );
}

// ============================================================
// Social Media Scanner Module
// ============================================================
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

function SocialModule() {
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

// ============================================================
// Landing Page
// ============================================================
function LandingPage({ onLogin }: { onLogin: (auth: AuthState) => void }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!apiKey.trim()) return;
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/validate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        const auth: AuthState = {
          isLoggedIn: true, isAdmin: data.isAdmin || false,
          user: data.user, apiKey: data.apiKey, apiKeyString: apiKey.trim(),
        };
        localStorage.setItem('recon-auth', JSON.stringify(auth));
        onLogin(auth);
      } else {
        setError('Invalid API key. Contact admin via WhatsApp.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally { setLoading(false); }
  };

  const faqs = [
    { q: 'What is XANVYOR RECON?', a: 'An advanced AI-powered OSINT platform for intelligence gathering, digital footprint analysis, and cybersecurity research.' },
    { q: 'How do I get an API key?', a: 'Contact us via WhatsApp to purchase access. We offer Free, Pro, and Enterprise plans.' },
    { q: 'Is this legal?', a: 'All tools use publicly available data (open source intelligence). Always follow ethical guidelines and applicable laws.' },
    { q: 'What AI engines power this?', a: 'Web Search Intelligence, Vision Language Model (VLM), Large Language Model (LLM), and real-time web data.' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a14] flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg">
          <div className="text-center mb-8">
            <img src="/logo.png" alt="XANVYOR" className="w-20 h-20 rounded-2xl mx-auto mb-4 shadow-lg shadow-emerald-500/20" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">XANVYOR RECON</h1>
            <p className="text-muted-foreground mt-2">Advanced AI-Powered OSINT Intelligence Platform</p>
          </div>

          <Card className="border-emerald-500/20 bg-card/50 backdrop-blur">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-center">Enter API Key to Access</h2>
              <div className="space-y-3">
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input placeholder="Enter your API key..." value={apiKey} onChange={e => setApiKey(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="pl-10 bg-card/50" type="password" />
                </div>
                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                <Button onClick={handleLogin} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ArrowRight className="w-4 h-4 mr-2" />}Access Platform
                </Button>
              </div>
              <div className="mt-4 text-center">
                <a href="https://wa.me/6287892614294" target="_blank" rel="noopener noreferrer" className="text-sm text-emerald-400 hover:underline">
                  Get API Key via WhatsApp
                </a>
              </div>
            </CardContent>
          </Card>

          <div className="mt-8">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger className="text-sm text-left">{faq.q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">{faq.a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </motion.div>
      </div>
      <footer className="p-4 text-center border-t border-border/20">
        <p className="text-xs text-muted-foreground">XANVYOR RECON &bull; AI-Powered Intelligence &bull; For Authorized Use Only</p>
      </footer>
    </div>
  );
}

// ============================================================
// Admin Module
// ============================================================
function AdminModule({ auth, onLogout }: { auth: AuthState; onLogout: () => void }) {
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; phone: string | null; apiKeys: Array<{ key: string; plan: string; isActive: boolean; expiresAt: string | null }> }>>([]);
  const [loading, setLoading] = useState(true);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newKeyPlan, setNewKeyPlan] = useState('free');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: { 'x-api-key': auth.apiKeyString } });
      const data = await res.json();
      setUsers(data.users || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const createUser = async () => {
    if (!newUserName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': auth.apiKeyString },
        body: JSON.stringify({ name: newUserName.trim(), phone: newUserPhone.trim() || null, plan: newKeyPlan }),
      });
      const data = await res.json();
      if (data.apiKey) {
        await loadUsers();
        setNewUserName(''); setNewUserPhone('');
      }
    } catch { /* ignore */ }
    finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<Crown className="w-5 h-5" />} color="from-amber-500 to-orange-500" title="Admin Panel" subtitle="Manage users & API keys" />

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold mb-3">Create New User</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input placeholder="Name" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="bg-card/50" />
            <Input placeholder="Phone (optional)" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} className="bg-card/50" />
            <select value={newKeyPlan} onChange={e => setNewKeyPlan(e.target.value)} className="bg-card/50 border border-border/50 rounded-md px-3 py-2 text-sm">
              <option value="free">Free</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
            <Button onClick={createUser} disabled={creating} className="bg-amber-600 hover:bg-amber-700 text-white">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}Create
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
      ) : (
        <div className="space-y-3">
          {users.map(user => (
            <Card key={user.id} className="border-border/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{user.name || 'Unnamed'}</div>
                    <div className="text-xs text-muted-foreground">{user.phone || 'No phone'}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {user.apiKeys?.map(key => (
                    <div key={key.key} className="flex items-center gap-2 text-xs font-mono bg-card/50 p-2 rounded">
                      <Badge className={`${key.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} text-[9px]`}>{key.isActive ? 'Active' : 'Inactive'}</Badge>
                      <Badge variant="outline" className="text-[9px]">{key.plan}</Badge>
                      <span className="text-muted-foreground truncate flex-1">{key.key}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sidebar Component
// ============================================================
function SidebarContent({ activeModule, sidebarOpen, onNavigate, isAdmin, onAdminClick, auth }: {
  activeModule: ModuleType; sidebarOpen: boolean; onNavigate: (m: ModuleType) => void;
  isAdmin: boolean; onAdminClick: () => void; auth: AuthState;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {MODULES.map(mod => (
          <button key={mod.id} onClick={() => onNavigate(mod.id)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all mb-1 ${activeModule === mod.id ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-muted-foreground hover:bg-card/50 hover:text-foreground'}`}>
            <div className={`p-1 rounded ${activeModule === mod.id ? 'bg-gradient-to-r ' + mod.color + ' text-white' : ''}`}>{mod.icon}</div>
            {sidebarOpen && <span className="flex-1 text-left truncate">{mod.name}</span>}
          </button>
        ))}
      </div>
      {isAdmin && (
        <div className="px-2 mt-2">
          <button onClick={onAdminClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90">
            <Crown className="w-4 h-4" />{sidebarOpen && <span className="font-medium">Admin Panel</span>}
          </button>
        </div>
      )}
      {sidebarOpen && (
        <div className="px-3 mt-4 pb-4">
          <div className="p-3 rounded-lg border border-border/30 bg-card/30">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold">{(auth.user?.name || 'U').charAt(0).toUpperCase()}</div>
              <div className="min-w-0"><div className="text-xs font-medium truncate">{auth.user?.name || 'User'}</div><div className="text-[9px] text-muted-foreground">{auth.apiKey?.plan || 'Free'}</div></div>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-muted-foreground"><Activity className="w-2.5 h-2.5 text-emerald-400" /><span>Systems Online</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main App Component
// ============================================================
export default function OSINTApp() {
  const [view, setView] = useState<AppView>('landing');
  const [auth, setAuth] = useState<AuthState>({ isLoggedIn: false, isAdmin: false, user: null, apiKey: null, apiKeyString: '' });
  const [activeModule, setActiveModule] = useState<ModuleType>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [validating, setValidating] = useState(true);

  // Check stored auth
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stored = localStorage.getItem('recon-auth');
        if (stored) {
          const parsed = JSON.parse(stored) as AuthState;
          const res = await fetch('/api/auth/validate', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: parsed.apiKeyString }),
          });
          const data = await res.json();
          if (data.valid) {
            setAuth({ isLoggedIn: true, isAdmin: data.isAdmin || false, user: data.user, apiKey: data.apiKey, apiKeyString: parsed.apiKeyString });
            setView('dashboard');
          } else {
            localStorage.removeItem('recon-auth');
          }
        }
      } catch { localStorage.removeItem('recon-auth'); }
      finally { setValidating(false); }
    };
    checkAuth();
  }, []);

  const handleLogin = (newAuth: AuthState) => {
    setAuth(newAuth);
    setView(newAuth.isAdmin ? 'dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    setAuth({ isLoggedIn: false, isAdmin: false, user: null, apiKey: null, apiKeyString: '' });
    localStorage.removeItem('recon-auth');
    setView('landing');
  };

  const handleNavigate = (mod: ModuleType) => {
    setActiveModule(mod);
    setMobileSidebarOpen(false);
  };

  const handleAdminClick = () => {
    setActiveModule('dashboard');
    setView('admin');
    setMobileSidebarOpen(false);
  };

  // Loading screen
  if (validating) {
    return (
      <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
        <div className="text-center">
          <img src="/logo.png" alt="XANVYOR" className="w-16 h-16 rounded-xl mx-auto mb-4 animate-pulse" />
          <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
        </div>
      </div>
    );
  }

  // Landing page
  if (view === 'landing') {
    return <LandingPage onLogin={handleLogin} />;
  }

  const activeMod = MODULES.find(m => m.id === activeModule);

  const renderModule = () => {
    if (view === 'admin') return <AdminModule auth={auth} onLogout={handleLogout} />;
    switch (activeModule) {
      case 'dashboard': return <DashboardModule />;
      case 'username': return <UsernameModule />;
      case 'email': return <EmailModule />;
      case 'ip': return <IPModule />;
      case 'domain': return <DomainModule />;
      case 'phone': return <PhoneModule />;
      case 'websearch': return <WebSearchModule />;
      case 'image': return <ImageModule />;
      case 'breach': return <BreachModule />;
      case 'dorking': return <DorkingModule />;
      case 'subdomain': return <SubdomainModule />;
      case 'dns': return <DNSModule />;
      case 'websec': return <WebSecModule />;
      case 'aichat': return <AIChatModule />;
      case 'wifiscan': return <WifiScanModule />;
      case 'wifi': return <WifiAPModule />;
      case 'mac': return <MacModule />;
      case 'people': return <PeopleModule />;
      case 'vehicle': return <VehicleModule />;
      case 'ktp': return <KtpModule />;
      case 'nik': return <NikModule />;
      case 'school': return <SchoolModule />;
      case 'ewallet': return <EwalletModule />;
      case 'qris': return <QrisModule />;
      case 'bank': return <BankModule />;
      case 'bitcoin': return <BitcoinModule />;
      case 'phonedev': return <PhoneDevModule />;
      case 'phoneloc': return <PhoneLocModule />;
      case 'webvuln': return <WebVulnModule />;
      case 'social': return <SocialModule />;
      default: return <DashboardModule />;
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col border-r border-border/30 bg-[#0d0d18] transition-all duration-300 ${sidebarOpen ? 'w-56' : 'w-16'}`}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30">
          <img src="/logo.png" alt="XANVYOR" className="w-8 h-8 rounded-lg flex-shrink-0" />
          {sidebarOpen && <span className="text-sm font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">XANVYOR</span>}
        </div>
        <SidebarContent activeModule={view === 'admin' ? 'dashboard' : activeModule} sidebarOpen={sidebarOpen} onNavigate={handleNavigate} isAdmin={auth.isAdmin} onAdminClick={handleAdminClick} auth={auth} />
        <div className="p-3 border-t border-border/30">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-card/50 text-muted-foreground">
            {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black z-40 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="fixed left-0 top-0 bottom-0 w-72 bg-[#0d0d18] border-r border-border/30 z-50 md:hidden overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-sm font-bold">Navigation</span>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-1 hover:bg-card/50 rounded"><X className="w-4 h-4" /></button>
              </div>
              <SidebarContent activeModule={view === 'admin' ? 'dashboard' : activeModule} sidebarOpen={true} onNavigate={handleNavigate} isAdmin={auth.isAdmin} onAdminClick={handleAdminClick} auth={auth} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-border/30 bg-[#0d0d18]/80 backdrop-blur-sm">
          <button onClick={() => setMobileSidebarOpen(true)} className="md:hidden p-1.5 rounded-lg hover:bg-card/50 text-muted-foreground"><Menu className="w-5 h-5" /></button>
          <div className="flex items-center gap-2 min-w-0">
            {activeMod && (
              <>
                <div className={`p-1 rounded bg-gradient-to-r ${activeMod.color} text-white flex-shrink-0`}>{activeMod.icon}</div>
                <div className="min-w-0"><h2 className="text-xs sm:text-sm font-semibold truncate">{view === 'admin' ? 'Admin Panel' : activeMod.name}</h2><p className="text-[9px] sm:text-[10px] text-muted-foreground truncate">{view === 'admin' ? 'User & key management' : activeMod.description}</p></div>
              </>
            )}
          </div>
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            <Badge variant="outline" className="text-[9px] text-emerald-400 border-emerald-500/30"><Activity className="w-2.5 h-2.5 mr-0.5" />Live</Badge>
            <Badge variant="outline" className="text-[9px] text-cyan-400 border-cyan-500/30"><Zap className="w-2.5 h-2.5 mr-0.5" />AI</Badge>
            {auth.isAdmin && <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30"><Crown className="w-3 h-3 mr-1" />Admin</Badge>}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2">
              <LogOut className="w-3 h-3" />
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={view === 'admin' ? 'admin' : activeModule} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }}>
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="px-4 py-2 border-t border-border/30 bg-[#0d0d18]/80 text-center">
          <p className="text-[10px] text-muted-foreground">XANVYOR RECON Platform &bull; AI-Powered Intelligence &bull; For Authorized Use Only</p>
        </footer>
      </main>
    </div>
  );
}
