'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Layers,
  Cpu,
  Database,
  Activity,
  MapPin,
  Loader2,
  Radar,
  Lock,
  Zap,
  Car,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { MapEmbed } from './shared';
import { MODULES } from './modules';

export function DashboardModule() {
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(true);
  const [locationName, setLocationName] = useState('');
  const gpsInitialized = useRef(false);

  useEffect(() => {
    if (gpsInitialized.current) return;
    gpsInitialized.current = true;
    // Try browser GPS first
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setGpsLoading(false);
          // Reverse geocode
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json&accept-language=id,en`)
            .then(r => r.json())
            .then(data => { if (data.display_name) setLocationName(data.display_name); })
            .catch(() => {});
        },
        () => {
          // Fallback to IP geolocation
          fetch('https://ipapi.co/json/')
            .then(r => r.json())
            .then(data => {
              if (data.latitude && data.longitude) {
                setGpsCoords({ lat: data.latitude, lng: data.longitude });
                setLocationName(`${data.city || ''}, ${data.region || ''}, ${data.country_name || ''}`.replace(/^,\s*|,\s*$/g, ''));
              }
            })
            .catch(() => {})
            .finally(() => setGpsLoading(false));
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      // No geolocation API, try IP
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(data => {
          if (data.latitude && data.longitude) {
            setGpsCoords({ lat: data.latitude, lng: data.longitude });
            setLocationName(`${data.city || ''}, ${data.region || ''}, ${data.country_name || ''}`.replace(/^,\s*|,\s*$/g, ''));
          }
        })
        .catch(() => {})
        .finally(() => setGpsLoading(false));
    }
  }, []);

  const stats = [
    { label: 'OSINT Tools', value: '32', icon: <Layers className="w-5 h-5" />, color: 'text-emerald-400' },
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
            {gpsCoords && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><MapPin className="w-3 h-3 mr-1" />GPS Active</Badge>}
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

      {/* GPS Location Auto-Detect */}
      {gpsLoading && (
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400">Mendeteksi lokasi GPS...</p>
              <p className="text-xs text-muted-foreground">Mendapatkan koordinat lokasi Anda secara otomatis</p>
            </div>
          </CardContent>
        </Card>
      )}
      {gpsCoords && !gpsLoading && (
        <div className="space-y-3">
          <Card className="border-emerald-500/20 bg-emerald-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Lokasi Terdeteksi</span>
              </div>
              {locationName && <p className="text-sm text-foreground mb-1">📍 {locationName}</p>}
              <p className="text-xs text-muted-foreground">📍 {gpsCoords.lat.toFixed(6)}, {gpsCoords.lng.toFixed(6)}</p>
            </CardContent>
          </Card>
          <MapEmbed lat={gpsCoords.lat} lng={gpsCoords.lng} label={locationName || 'Lokasi Anda'} />
        </div>
      )}

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
