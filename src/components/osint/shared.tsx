'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle2, XCircle, HelpCircle, Loader2, Radar,
  AlertTriangle, ShieldAlert, Brain, ExternalLink, MapPin,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';

// ============================================================
// Types
// ============================================================
export type AppView = 'landing' | 'dashboard' | 'admin';
export type ModuleType = 'dashboard' | 'username' | 'email' | 'ip' | 'domain' | 'phone' | 'websearch' | 'image' | 'aichat' | 'dns' | 'websec' | 'breach' | 'dorking' | 'subdomain' | 'wifiscan' | 'wifi' | 'mac' | 'people' | 'vehicle' | 'imei' | 'ktp' | 'nik' | 'school' | 'ewallet' | 'qris' | 'bank' | 'bitcoin' | 'phonedev' | 'phoneloc' | 'webvuln' | 'social';

export interface AuthState {
  isLoggedIn: boolean;
  isAdmin: boolean;
  user: { id: string; name: string | null; phone: string | null } | null;
  apiKey: { id: string; plan: string; isActive: boolean; expiresAt: string | null; label: string | null } | null;
  apiKeyString: string;
}

export interface Module {
  id: ModuleType;
  name: string;
  icon: React.ReactNode;
  description: string;
  color: string;
}

// Fetch with timeout
export function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number = 90000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(id));
}

// ============================================================
// Shared UI Components
// ============================================================
export function StatusBadge({ status }: { status: string }) {
  if (status === 'likely_found') return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Found</Badge>;
  if (status === 'not_found') return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30"><XCircle className="w-3 h-3 mr-1" />Not Found</Badge>;
  return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30"><HelpCircle className="w-3 h-3 mr-1" />Unknown</Badge>;
}

export function SeverityBadge({ severity }: { severity: string }) {
  const s = severity?.toLowerCase() || 'low';
  if (s === 'critical') return <Badge className="bg-red-600/20 text-red-400 border-red-600/30 animate-pulse">CRITICAL</Badge>;
  if (s === 'high') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">HIGH</Badge>;
  if (s === 'medium') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">MEDIUM</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">LOW</Badge>;
}

export function ThreatBadge({ level }: { level: string }) {
  const l = level?.toLowerCase() || 'low';
  if (l === 'critical') return <Badge className="bg-red-600/20 text-red-400 border-red-600/40 text-sm px-3 py-1"><ShieldAlert className="w-4 h-4 mr-1" />CRITICAL</Badge>;
  if (l === 'high') return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/40 text-sm px-3 py-1"><AlertTriangle className="w-4 h-4 mr-1" />HIGH</Badge>;
  if (l === 'medium') return <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-sm px-3 py-1"><AlertTriangle className="w-3 h-3 mr-1" />MEDIUM</Badge>;
  return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-sm px-3 py-1"><CheckCircle2 className="w-3 h-3 mr-1" />LOW</Badge>;
}

export function AIAnalysisCard({ analysis }: { analysis: string }) {
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

export function ErrorCard({ error }: { error: string }) {
  return (
    <Card className="border-red-500/30 bg-red-500/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-red-400"><AlertTriangle className="w-4 h-4 flex-shrink-0" /><span className="text-sm">{error}</span></div>
        <p className="text-xs text-muted-foreground mt-2">Wait a moment and try again. AI analysis may take 15-60 seconds.</p>
      </CardContent>
    </Card>
  );
}

export function LoadingIndicator({ message }: { message: string }) {
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

export function ResultLink({ title, snippet, url, domain, date }: { title: string; snippet: string; url: string; domain?: string; date?: string }) {
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

export function ModuleHeader({ icon, color, title, subtitle }: { icon: React.ReactNode; color: string; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-2">
      <div className={`p-2 rounded-lg bg-gradient-to-r ${color} text-white`}>{icon}</div>
      <div><h2 className="text-xl font-bold">{title}</h2><p className="text-sm text-muted-foreground">{subtitle}</p></div>
    </div>
  );
}

// ============================================================
// Map Embed Component - OpenStreetMap iframe
// ============================================================
export function MapEmbed({ lat, lng, label, className }: { lat: number; lng: number; label?: string; className?: string }) {
  if (!lat || !lng || (lat === 0 && lng === 0)) return null;
  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.015}%2C${lat-0.01}%2C${lng+0.015}%2C${lat+0.01}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <Card className={`border-emerald-500/30 bg-emerald-500/5 overflow-hidden ${className || ''}`}>
      <CardContent className="p-0">
        {label && <div className="px-4 pt-3 pb-1 text-sm font-medium text-emerald-400 flex items-center gap-2"><MapPin className="w-4 h-4" />{label}</div>}
        <iframe
          src={mapUrl}
          className="w-full border-0"
          style={{ height: '280px' }}
          loading="lazy"
          title="Location Map"
          allowFullScreen
        />
        <div className="px-4 py-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span>📍 {lat.toFixed(6)}, {lng.toFixed(6)}</span>
          <a href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">Google Maps</a>
          <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">OSM</a>
        </div>
      </CardContent>
    </Card>
  );
}

// Generic hook for API calls
export function useOSINTSearch<T>() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState('');

  const search = useCallback(async (url: string, body: Record<string, unknown>) => {
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
