'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Loader2, Menu, X, ChevronLeft, ChevronRight, Activity, Zap, Crown, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import type { AppView, ModuleType, AuthState } from '@/components/osint/shared';
import { MODULES } from '@/components/osint/modules';
import { LandingPage } from '@/components/osint/landing';
import { AdminModule } from '@/components/osint/admin';
import { SidebarContent } from '@/components/osint/sidebar';

// Lazy-load all OSINT modules to reduce initial bundle size
const DashboardModule = dynamic(() => import('@/components/osint/dashboard').then(m => ({ default: m.DashboardModule })), { ssr: false, loading: () => <ModuleLoader /> });
const UsernameModule = dynamic(() => import('@/components/osint/username').then(m => ({ default: m.UsernameModule })), { ssr: false, loading: () => <ModuleLoader /> });
const EmailModule = dynamic(() => import('@/components/osint/email').then(m => ({ default: m.EmailModule })), { ssr: false, loading: () => <ModuleLoader /> });
const IPModule = dynamic(() => import('@/components/osint/ip').then(m => ({ default: m.IPModule })), { ssr: false, loading: () => <ModuleLoader /> });
const DomainModule = dynamic(() => import('@/components/osint/domain').then(m => ({ default: m.DomainModule })), { ssr: false, loading: () => <ModuleLoader /> });
const PhoneModule = dynamic(() => import('@/components/osint/phone').then(m => ({ default: m.PhoneModule })), { ssr: false, loading: () => <ModuleLoader /> });
const WebSearchModule = dynamic(() => import('@/components/osint/websearch').then(m => ({ default: m.WebSearchModule })), { ssr: false, loading: () => <ModuleLoader /> });
const ImageModule = dynamic(() => import('@/components/osint/image').then(m => ({ default: m.ImageModule })), { ssr: false, loading: () => <ModuleLoader /> });
const BreachModule = dynamic(() => import('@/components/osint/breach').then(m => ({ default: m.BreachModule })), { ssr: false, loading: () => <ModuleLoader /> });
const DorkingModule = dynamic(() => import('@/components/osint/dorking').then(m => ({ default: m.DorkingModule })), { ssr: false, loading: () => <ModuleLoader /> });
const SubdomainModule = dynamic(() => import('@/components/osint/subdomain').then(m => ({ default: m.SubdomainModule })), { ssr: false, loading: () => <ModuleLoader /> });
const DNSModule = dynamic(() => import('@/components/osint/dns').then(m => ({ default: m.DNSModule })), { ssr: false, loading: () => <ModuleLoader /> });
const WebSecModule = dynamic(() => import('@/components/osint/websec').then(m => ({ default: m.WebSecModule })), { ssr: false, loading: () => <ModuleLoader /> });
const AIChatModule = dynamic(() => import('@/components/osint/aichat').then(m => ({ default: m.AIChatModule })), { ssr: false, loading: () => <ModuleLoader /> });
const WifiScanModule = dynamic(() => import('@/components/osint/wifiscan').then(m => ({ default: m.WifiScanModule })), { ssr: false, loading: () => <ModuleLoader /> });
const WifiAPModule = dynamic(() => import('@/components/osint/wifi').then(m => ({ default: m.WifiAPModule })), { ssr: false, loading: () => <ModuleLoader /> });
const MacModule = dynamic(() => import('@/components/osint/mac').then(m => ({ default: m.MacModule })), { ssr: false, loading: () => <ModuleLoader /> });
const PeopleModule = dynamic(() => import('@/components/osint/people').then(m => ({ default: m.PeopleModule })), { ssr: false, loading: () => <ModuleLoader /> });
const VehicleModule = dynamic(() => import('@/components/osint/vehicle').then(m => ({ default: m.VehicleModule })), { ssr: false, loading: () => <ModuleLoader /> });
const ImeiModule = dynamic(() => import('@/components/osint/imei').then(m => ({ default: m.ImeiModule })), { ssr: false, loading: () => <ModuleLoader /> });
const KtpModule = dynamic(() => import('@/components/osint/ktp').then(m => ({ default: m.KtpModule })), { ssr: false, loading: () => <ModuleLoader /> });
const NikModule = dynamic(() => import('@/components/osint/nik').then(m => ({ default: m.NikModule })), { ssr: false, loading: () => <ModuleLoader /> });
const SchoolModule = dynamic(() => import('@/components/osint/school').then(m => ({ default: m.SchoolModule })), { ssr: false, loading: () => <ModuleLoader /> });
const EwalletModule = dynamic(() => import('@/components/osint/ewallet').then(m => ({ default: m.EwalletModule })), { ssr: false, loading: () => <ModuleLoader /> });
const QrisModule = dynamic(() => import('@/components/osint/qris').then(m => ({ default: m.QrisModule })), { ssr: false, loading: () => <ModuleLoader /> });
const BankModule = dynamic(() => import('@/components/osint/bank').then(m => ({ default: m.BankModule })), { ssr: false, loading: () => <ModuleLoader /> });
const BitcoinModule = dynamic(() => import('@/components/osint/bitcoin').then(m => ({ default: m.BitcoinModule })), { ssr: false, loading: () => <ModuleLoader /> });
const PhoneDevModule = dynamic(() => import('@/components/osint/phonedev').then(m => ({ default: m.PhoneDevModule })), { ssr: false, loading: () => <ModuleLoader /> });
const PhoneLocModule = dynamic(() => import('@/components/osint/phoneloc').then(m => ({ default: m.PhoneLocModule })), { ssr: false, loading: () => <ModuleLoader /> });
const WebVulnModule = dynamic(() => import('@/components/osint/webvuln').then(m => ({ default: m.WebVulnModule })), { ssr: false, loading: () => <ModuleLoader /> });
const SocialModule = dynamic(() => import('@/components/osint/social').then(m => ({ default: m.SocialModule })), { ssr: false, loading: () => <ModuleLoader /> });

function ModuleLoader() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
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
    setView('dashboard');
  };

  const handleLogout = () => {
    setAuth({ isLoggedIn: false, isAdmin: false, user: null, apiKey: null, apiKeyString: '' });
    localStorage.removeItem('recon-auth');
    setView('landing');
  };

  const handleNavigate = (mod: ModuleType) => {
    setActiveModule(mod);
    if (view === 'admin') setView('dashboard');
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
    if (view === 'admin') return <AdminModule auth={auth} onLogout={handleLogout} onBackToDashboard={() => setView('dashboard')} />;
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
      case 'imei': return <ImeiModule />;
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
