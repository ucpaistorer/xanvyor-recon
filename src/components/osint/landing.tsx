'use client';

import React, { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Key, ArrowRight, Loader2, Shield, Zap, Brain, Globe,
  ChevronDown, MessageCircle, Lock, Eye, CheckCircle2, Star,
  Radar, Cpu, Users, Search, Sparkles, ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Separator } from '@/components/ui/separator';
import { MODULES } from './modules';
import type { AuthState } from './shared';

// ============================================================
// Animation variants
// ============================================================
const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

// ============================================================
// Feature categories with detailed descriptions
// ============================================================
interface FeatureCategory {
  title: string;
  icon: React.ReactNode;
  accent: string;
  glow: string;
  moduleIds: string[];
  description: string;
}

const FEATURE_CATEGORIES: FeatureCategory[] = [
  {
    title: 'Digital Intelligence',
    icon: <Search className="w-5 h-5" />,
    accent: 'from-emerald-400 to-cyan-400',
    glow: 'shadow-emerald-500/20',
    moduleIds: ['username', 'email', 'breach', 'dorking', 'image', 'websearch', 'social'],
    description: 'Uncover digital footprints across platforms. Hunt usernames, analyze emails, check data breaches, perform Google dorking, run VLM-powered image forensics, AI web search, and deep social media scanning.',
  },
  {
    title: 'Network Analysis',
    icon: <Globe className="w-5 h-5" />,
    accent: 'from-cyan-400 to-blue-400',
    glow: 'shadow-cyan-500/20',
    moduleIds: ['ip', 'domain', 'subdomain', 'dns', 'wifiscan', 'wifi', 'mac', 'websec', 'webvuln'],
    description: 'Map and analyze network infrastructure. Geolocate IPs, perform WHOIS lookups, enumerate subdomains & DNS records, scan WiFi networks, lookup MAC addresses, and audit website security & vulnerabilities.',
  },
  {
    title: 'People Search',
    icon: <Users className="w-5 h-5" />,
    accent: 'from-fuchsia-400 to-pink-400',
    glow: 'shadow-fuchsia-500/20',
    moduleIds: ['phone', 'people', 'vehicle', 'imei', 'phonedev', 'phoneloc'],
    description: 'Trace individuals through phone numbers, vehicle plates, and IMEI. Perform deep people searches, device intelligence lookups, and GPS phone location tracking with carrier and region analysis.',
  },
  {
    title: 'Financial Intel',
    icon: <Shield className="w-5 h-5" />,
    accent: 'from-amber-400 to-orange-400',
    glow: 'shadow-amber-500/20',
    moduleIds: ['ewallet', 'qris', 'bank', 'bitcoin'],
    description: 'Investigate financial identities. Detect e-wallet accounts (GoPay, OVO, Dana, ShopeePay), verify QRIS merchants, validate bank account details, and trace Bitcoin wallet transactions & balances.',
  },
  {
    title: 'AI-Powered & Regional',
    icon: <Brain className="w-5 h-5" />,
    accent: 'from-violet-400 to-purple-400',
    glow: 'shadow-violet-500/20',
    moduleIds: ['aichat', 'ktp', 'nik', 'school'],
    description: 'Leverage cutting-edge AI for OSINT. Chat with XANVYOR-AI for intelligence analysis, scan Indonesian KTP cards with OCR, decode NIK numbers to reveal demographics, and investigate schools/students.',
  },
];

// ============================================================
// Pricing plans
// ============================================================
interface PricingPlan {
  name: string;
  nameId: string;
  price: string;
  period: string;
  features: string[];
  popular?: boolean;
}

const PRICING_PLANS: PricingPlan[] = [
  {
    name: '7 Hari',
    nameId: '7-day',
    price: 'Rp 50K',
    period: '/ 7 hari',
    features: ['Full 32 tools access', 'AI-powered analysis', 'API key authentication', 'Standard priority', 'WhatsApp support'],
  },
  {
    name: '30 Hari',
    nameId: '30-day',
    price: 'Rp 150K',
    period: '/ 30 hari',
    features: ['Full 32 tools access', 'AI-powered analysis', 'API key authentication', 'High priority queue', 'WhatsApp support', 'Extended result limits'],
    popular: true,
  },
  {
    name: '90 Hari',
    nameId: '90-day',
    price: 'Rp 350K',
    period: '/ 90 hari',
    features: ['Full 32 tools access', 'AI-powered analysis', 'API key authentication', 'Highest priority', 'Priority WhatsApp support', 'Extended result limits', 'Bulk query support'],
  },
  {
    name: 'Lifetime',
    nameId: 'lifetime',
    price: 'Rp 750K',
    period: '/ selamanya',
    features: ['Full 32 tools access', 'AI-powered analysis', 'API key authentication', 'Highest priority forever', 'Dedicated support', 'Unlimited result limits', 'Bulk query support', 'Early access to new tools'],
  },
];

// ============================================================
// FAQ data
// ============================================================
const FAQS = [
  {
    q: 'What is XANVYOR RECON?',
    a: 'XANVYOR RECON is an advanced AI-powered OSINT (Open Source Intelligence) platform that provides 32+ intelligence tools for digital footprint analysis, network reconnaissance, people search, financial intelligence, and more. It combines LLM, VLM, and web search AI engines to deliver actionable intelligence.',
  },
  {
    q: 'How do I get an API key?',
    a: 'Contact us via WhatsApp at +62 878-9261-4294 to purchase an access plan. We offer 7-day, 30-day, 90-day, and Lifetime plans. After payment, you will receive a unique API key to access the platform.',
  },
  {
    q: 'Is XANVYOR RECON legal?',
    a: 'All tools use publicly available data (open source intelligence). The platform is designed for authorized security research, penetration testing, and legitimate intelligence gathering. Always follow ethical guidelines and applicable laws in your jurisdiction. Unauthorized use of personal data is strictly prohibited.',
  },
  {
    q: 'What AI engines power this platform?',
    a: 'XANVYOR RECON is powered by multiple AI engines: Web Search Intelligence for real-time web data, Vision Language Model (VLM) for image analysis and OCR, Large Language Model (LLM) for OSINT analysis and chat assistance, and specialized models for Indonesian regional data (KTP, NIK, vehicle plates).',
  },
  {
    q: 'How accurate are the results?',
    a: 'Results are sourced from publicly available databases and AI analysis. Accuracy depends on data availability and source reliability. OSINT data should always be verified through multiple sources before making critical decisions. AI analysis provides intelligent summaries and correlations.',
  },
  {
    q: 'Can I use this for Indonesian-specific data?',
    a: 'Yes! XANVYOR RECON has specialized tools for Indonesian intelligence: KTP OCR (ID card scanning), NIK Decoder (national ID number analysis), Vehicle Plate tracking (TNKB plates), E-Wallet detection (GoPay, OVO, Dana, ShopeePay, LinkAja), QRIS merchant lookup, Bank account verification, and School/Student OSINT.',
  },
  {
    q: 'What happens when my plan expires?',
    a: 'When your plan expires, your API key will be deactivated and you will lose access to the platform. You can renew by contacting us via WhatsApp. Your data and search history remain private and are automatically purged per our retention policy.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. All API communications are encrypted. Your search queries and results are not shared with third parties. API keys are stored securely with hashing. We follow industry-standard security practices for data handling and storage.',
  },
];

// ============================================================
// Section wrapper with InView animation
// ============================================================
function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.section
      ref={ref}
      id={id}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
      className={className}
    >
      {children}
    </motion.section>
  );
}

// ============================================================
// Main Landing Page Component
// ============================================================
export function LandingPage({ onLogin }: { onLogin: (auth: AuthState) => void }) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loginRef = useRef<HTMLDivElement>(null);

  const handleLogin = async () => {
    if (!apiKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });
      const data = await res.json();
      if (data.valid) {
        const auth: AuthState = {
          isLoggedIn: true,
          isAdmin: data.isAdmin || false,
          user: data.user,
          apiKey: data.apiKey,
          apiKeyString: apiKey.trim(),
        };
        localStorage.setItem('recon-auth', JSON.stringify(auth));
        onLogin(auth);
      } else {
        setError('Invalid API key. Contact admin via WhatsApp.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const scrollToLogin = () => {
    loginRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Helper to get module by id
  const getModule = (id: string) => MODULES.find(m => m.id === id);

  return (
    <div className="min-h-screen bg-[#0a0a14] text-foreground flex flex-col">
      {/* ===== NAVBAR ===== */}
      <nav className="sticky top-0 z-50 border-b border-border/20 bg-[#0a0a14]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="XANVYOR" className="w-9 h-9 rounded-lg" />
            <span className="text-lg font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              XANVYOR RECON
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-emerald-400 transition-colors">How It Works</a>
            <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
            <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
          </div>
          <Button
            onClick={scrollToLogin}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
          >
            <Key className="w-4 h-4" />
            Access Platform
          </Button>
        </div>
      </nav>

      {/* ===== HERO SECTION ===== */}
      <section className="relative overflow-hidden">
        {/* Background grid effect */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 lg:py-36">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={staggerItem} className="flex justify-center mb-6">
              <div className="relative">
                <img
                  src="/logo.png"
                  alt="XANVYOR RECON"
                  className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl shadow-2xl shadow-emerald-500/20"
                />
                <div className="absolute -inset-2 rounded-2xl bg-gradient-to-r from-emerald-400/20 to-cyan-400/20 blur-xl -z-10" />
              </div>
            </motion.div>

            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-4 py-1.5 text-sm">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI-Powered OSINT Intelligence
              </Badge>
            </motion.div>

            <motion.h1
              variants={staggerItem}
              className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight mb-6"
            >
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-fuchsia-400 bg-clip-text text-transparent">
                XANVYOR RECON
              </span>
            </motion.h1>

            <motion.p
              variants={staggerItem}
              className="text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-4"
            >
              Advanced AI-Powered OSINT Intelligence Platform
            </motion.p>

            <motion.p
              variants={staggerItem}
              className="text-sm sm:text-base text-muted-foreground/70 max-w-2xl mx-auto mb-10"
            >
              32+ specialized intelligence tools. LLM, VLM, and Web Search AI engines.
              Digital footprint analysis, network reconnaissance, people search,
              financial intelligence — all in one platform.
            </motion.p>

            <motion.div variants={staggerItem} className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button
                onClick={scrollToLogin}
                size="lg"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-8 h-12 text-base shadow-lg shadow-emerald-500/20"
              >
                <Key className="w-5 h-5" />
                Access Platform
              </Button>
              <a
                href="https://wa.me/6287892614294"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 px-8 h-12 text-base border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                >
                  <MessageCircle className="w-5 h-5" />
                  Get API Key
                </Button>
              </a>
            </motion.div>

            {/* Stats row */}
            <motion.div
              variants={staggerItem}
              className="mt-16 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 max-w-3xl mx-auto"
            >
              {[
                { value: '32+', label: 'Intel Tools' },
                { value: '5', label: 'AI Engines' },
                { value: '24/7', label: 'Availability' },
                { value: '100%', label: 'Encrypted' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <ChevronDown className="w-6 h-6 text-emerald-400/50" />
          </motion.div>
        </motion.div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section id="features" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400 bg-cyan-500/10 px-4 py-1.5">
                <Radar className="w-3.5 h-3.5 mr-1.5" />
                32+ Intelligence Tools
              </Badge>
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Complete OSINT Arsenal
              </span>
            </motion.h2>
            <motion.p variants={staggerItem} className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Five specialized intelligence categories, each packed with powerful tools
              powered by AI analysis engines for deep intelligence gathering.
            </motion.p>
          </AnimatedSection>

          {/* Category sections */}
          <div className="space-y-16">
            {FEATURE_CATEGORIES.map((cat, catIdx) => (
              <AnimatedSection key={cat.title} className="scroll-mt-20">
                {/* Category header */}
                <motion.div variants={staggerItem} className="mb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2.5 rounded-xl bg-gradient-to-r ${cat.accent} text-white shadow-lg ${cat.glow}`}>
                      {cat.icon}
                    </div>
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold">{cat.title}</h3>
                    </div>
                    <Badge variant="outline" className="ml-2 text-xs border-border/50 text-muted-foreground">
                      {cat.moduleIds.length} tools
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground/80 max-w-3xl ml-0 sm:ml-12">
                    {cat.description}
                  </p>
                </motion.div>

                {/* Module cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                  {cat.moduleIds.map((modId) => {
                    const mod = getModule(modId);
                    if (!mod) return null;
                    return (
                      <motion.div key={modId} variants={staggerItem}>
                        <Card className="group border-border/30 bg-card/30 hover:bg-card/60 backdrop-blur transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 h-full">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg bg-gradient-to-r ${mod.color} text-white flex-shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                                {mod.icon}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="font-semibold text-sm group-hover:text-emerald-400 transition-colors">
                                  {mod.name}
                                </h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {mod.description}
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Separator between categories (except last) */}
                {catIdx < FEATURE_CATEGORIES.length - 1 && (
                  <motion.div variants={staggerItem} className="mt-12">
                    <Separator className="bg-border/20" />
                  </motion.div>
                )}
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DETAILED TOOL DESCRIPTIONS ===== */}
      <section className="relative py-20 sm:py-28 bg-[#0c0c1a]/50">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-500/10 px-4 py-1.5">
                <Cpu className="w-3.5 h-3.5 mr-1.5" />
                Tool Deep-Dive
              </Badge>
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                Every Tool Explained
              </span>
            </motion.h2>
            <motion.p variants={staggerItem} className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Detailed breakdown of what each intelligence module does and how it can help your investigation.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
              {MODULES.filter(m => m.id !== 'dashboard').map((mod) => (
                <motion.div key={mod.id} variants={staggerItem}>
                  <Card className="border-border/30 bg-card/30 backdrop-blur h-full hover:border-emerald-500/20 transition-colors">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg bg-gradient-to-r ${mod.color} text-white`}>
                          {mod.icon}
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm">{mod.name}</h4>
                          <p className="text-xs text-muted-foreground">{mod.description}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground/80 leading-relaxed">
                        {getToolDetail(mod.id)}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== HOW IT WORKS ===== */}
      <section id="how-it-works" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-4 py-1.5">
                <Zap className="w-3.5 h-3.5 mr-1.5" />
                Simple Process
              </Badge>
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                How It Works
              </span>
            </motion.h2>
            <motion.p variants={staggerItem} className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Get started with XANVYOR RECON in three simple steps.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
              {[
                {
                  step: '01',
                  icon: <MessageCircle className="w-6 h-6" />,
                  title: 'Get Your API Key',
                  desc: 'Contact us on WhatsApp to purchase an access plan. Choose from 7-day, 30-day, 90-day, or Lifetime access. Receive your unique API key instantly after payment.',
                  color: 'from-emerald-500 to-teal-500',
                },
                {
                  step: '02',
                  icon: <Key className="w-6 h-6" />,
                  title: 'Login to Platform',
                  desc: 'Enter your API key on the platform login screen. Your key is validated securely and you gain immediate access to all 32+ intelligence tools and AI analysis engines.',
                  color: 'from-cyan-500 to-blue-500',
                },
                {
                  step: '03',
                  icon: <Radar className="w-6 h-6" />,
                  title: 'Start Investigating',
                  desc: 'Choose from 32+ specialized tools. Enter your target data and let our AI engines analyze, correlate, and present actionable intelligence in real-time.',
                  color: 'from-fuchsia-500 to-pink-500',
                },
              ].map((item) => (
                <motion.div key={item.step} variants={staggerItem}>
                  <Card className="border-border/30 bg-card/30 backdrop-blur h-full text-center hover:border-emerald-500/20 transition-colors">
                    <CardContent className="p-6 sm:p-8">
                      <div className="text-5xl font-black text-emerald-500/10 mb-4">{item.step}</div>
                      <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${item.color} text-white flex items-center justify-center mx-auto mb-4 shadow-lg`}>
                        {item.icon}
                      </div>
                      <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== AI ENGINES SECTION ===== */}
      <section className="relative py-20 sm:py-28 bg-[#0c0c1a]/50">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:50px_50px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-violet-500/30 text-violet-400 bg-violet-500/10 px-4 py-1.5">
                <Brain className="w-3.5 h-3.5 mr-1.5" />
                AI-Powered
              </Badge>
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
                Intelligence Engines
              </span>
            </motion.h2>
            <motion.p variants={staggerItem} className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              Multiple AI engines work together to provide deep, actionable intelligence.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {[
                {
                  icon: <Search className="w-7 h-7" />,
                  title: 'Web Search AI',
                  desc: 'Real-time web search intelligence engine that scours the internet for relevant data, news, and connections related to your query.',
                  color: 'from-emerald-400 to-teal-400',
                },
                {
                  icon: <Eye className="w-7 h-7" />,
                  title: 'Vision Language Model',
                  desc: 'VLM-powered image analysis that can extract text (OCR), identify objects, detect manipulated images, and analyze visual content for intelligence.',
                  color: 'from-cyan-400 to-blue-400',
                },
                {
                  icon: <Brain className="w-7 h-7" />,
                  title: 'Large Language Model',
                  desc: 'LLM-driven OSINT analysis that correlates data points, generates intelligence reports, and provides expert-level analysis of findings.',
                  color: 'from-fuchsia-400 to-pink-400',
                },
                {
                  icon: <Globe className="w-7 h-7" />,
                  title: 'Real-time Data',
                  desc: 'Live data feeds from public databases, WHOIS records, breach databases, social platforms, and regional government records for up-to-date intelligence.',
                  color: 'from-amber-400 to-orange-400',
                },
              ].map((engine) => (
                <motion.div key={engine.title} variants={staggerItem}>
                  <Card className="border-border/30 bg-card/30 backdrop-blur h-full hover:border-violet-500/20 transition-colors group">
                    <CardContent className="p-5 sm:p-6">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-r ${engine.color} text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                        {engine.icon}
                      </div>
                      <h3 className="font-bold mb-2">{engine.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{engine.desc}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== PRICING SECTION ===== */}
      <section id="pricing" className="relative py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-400 bg-amber-500/10 px-4 py-1.5">
                <Star className="w-3.5 h-3.5 mr-1.5" />
                Pricing Plans
              </Badge>
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                Choose Your Plan
              </span>
            </motion.h2>
            <motion.p variants={staggerItem} className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base">
              All plans include full access to 32+ intelligence tools and AI analysis engines.
            </motion.p>
          </AnimatedSection>

          <AnimatedSection>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto">
              {PRICING_PLANS.map((plan) => (
                <motion.div key={plan.nameId} variants={staggerItem}>
                  <Card className={`relative border-border/30 bg-card/30 backdrop-blur h-full transition-all duration-300 hover:shadow-lg ${
                    plan.popular
                      ? 'border-emerald-500/50 hover:border-emerald-500/70 hover:shadow-emerald-500/10'
                      : 'hover:border-emerald-500/20'
                  }`}>
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-emerald-500 text-white text-xs px-3 shadow-lg shadow-emerald-500/20">
                          <Star className="w-3 h-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardContent className="p-5 sm:p-6 flex flex-col h-full">
                      <div className="text-center mb-6">
                        <h3 className="text-lg font-bold mb-1">{plan.name}</h3>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-3xl font-extrabold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                            {plan.price}
                          </span>
                          <span className="text-xs text-muted-foreground">{plan.period}</span>
                        </div>
                      </div>

                      <div className="flex-1 space-y-2.5 mb-6">
                        {plan.features.map((feat) => (
                          <div key={feat} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                            <span className="text-xs text-muted-foreground">{feat}</span>
                          </div>
                        ))}
                      </div>

                      <a
                        href="https://wa.me/6287892614294"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <Button
                          className={`w-full gap-2 ${
                            plan.popular
                              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                              : 'bg-card/80 hover:bg-card border border-border/50 text-foreground'
                          }`}
                        >
                          <MessageCircle className="w-4 h-4" />
                          Order via WhatsApp
                        </Button>
                      </a>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== FAQ SECTION ===== */}
      <section id="faq" className="relative py-20 sm:py-28 bg-[#0c0c1a]/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <motion.div variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-cyan-500/30 text-cyan-400 bg-cyan-500/10 px-4 py-1.5">
                <Lock className="w-3.5 h-3.5 mr-1.5" />
                FAQ
              </Badge>
            </motion.div>
            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                Frequently Asked Questions
              </span>
            </motion.h2>
          </AnimatedSection>

          <AnimatedSection>
            <Card className="border-border/30 bg-card/30 backdrop-blur">
              <CardContent className="p-4 sm:p-6">
                <Accordion type="single" collapsible className="w-full">
                  {FAQS.map((faq, i) => (
                    <AccordionItem key={i} value={`faq-${i}`} className="border-border/20">
                      <AccordionTrigger className="text-sm text-left hover:text-emerald-400 transition-colors">
                        {faq.q}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                        {faq.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== LOGIN SECTION ===== */}
      <section className="relative py-20 sm:py-28">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px]" />
        <div className="relative max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <motion.div ref={loginRef} variants={staggerItem}>
              <Badge variant="outline" className="mb-4 border-emerald-500/30 text-emerald-400 bg-emerald-500/10 px-4 py-1.5">
                <Key className="w-3.5 h-3.5 mr-1.5" />
                Platform Access
              </Badge>
            </motion.div>

            <motion.h2 variants={staggerItem} className="text-3xl sm:text-4xl font-bold mb-4">
              <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                Enter Platform
              </span>
            </motion.h2>

            <motion.p variants={staggerItem} className="text-muted-foreground text-sm mb-8">
              Enter your API key to access the full intelligence platform.
            </motion.p>

            <motion.div variants={fadeInUp}>
              <Card className="border-emerald-500/20 bg-card/50 backdrop-blur">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="relative">
                      <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Enter your API key..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                        className="pl-10 bg-card/50 h-12 text-base"
                        type="password"
                      />
                    </div>
                    {error && (
                      <p className="text-sm text-red-400 text-center">{error}</p>
                    )}
                    <Button
                      onClick={handleLogin}
                      disabled={loading || !apiKey.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-12 text-base gap-2 shadow-lg shadow-emerald-500/20"
                    >
                      {loading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-5 h-5" />
                          Access Platform
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="mt-6 text-center">
                    <p className="text-xs text-muted-foreground mb-2">Don&apos;t have an API key?</p>
                    <a
                      href="https://wa.me/6287892614294"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors hover:underline"
                    >
                      <MessageCircle className="w-4 h-4" />
                      Get API Key via WhatsApp
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatedSection>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mt-auto border-t border-border/20 bg-[#080810]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="XANVYOR" className="w-8 h-8 rounded-lg" />
              <div>
                <span className="text-sm font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                  XANVYOR RECON
                </span>
                <p className="text-[10px] text-muted-foreground">
                  AI-Powered Intelligence Platform
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-emerald-400 transition-colors">Features</a>
              <a href="#pricing" className="hover:text-emerald-400 transition-colors">Pricing</a>
              <a href="#faq" className="hover:text-emerald-400 transition-colors">FAQ</a>
              <a
                href="https://wa.me/6287892614294"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-emerald-400 transition-colors"
              >
                WhatsApp
              </a>
            </div>
          </div>
          <Separator className="my-4 bg-border/10" />
          <p className="text-center text-xs text-muted-foreground/50">
            XANVYOR RECON Platform &bull; AI-Powered Intelligence &bull; For Authorized Use Only
          </p>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// Tool detail descriptions
// ============================================================
function getToolDetail(id: string): string {
  const details: Record<string, string> = {
    username:
      'Hunt usernames across 100+ social media platforms and websites simultaneously. Discover where a target has accounts, find linked profiles, and map their digital identity across the internet. Supports custom platform lists and returns found/not-found status with profile URLs.',
    email:
      'Perform deep email intelligence: check if the email appears in known data breaches and leaks, find associated accounts and services, verify email deliverability, discover related emails, and analyze the email domain for threat indicators. Powered by breach database correlation.',
    ip:
      'Conduct IP address reconnaissance: geolocate the IP with city/country/ISP data, check for VPN/proxy/Tor usage, analyze threat scores, discover associated domains, view open ports, and assess risk level. Essential for understanding the origin and nature of network connections.',
    domain:
      'Analyze domain intelligence: perform WHOIS lookups to reveal registration details, check domain age and history, discover name servers and mail records, analyze DNS configurations, detect parking/expired domains, and assess domain reputation and threat level.',
    phone:
      'Trace phone numbers with intelligence: identify carrier and line type (mobile/landline/VoIP), detect country and region, check for spam/fraud reports, find associated accounts and social profiles, and analyze number validity. Special support for Indonesian phone formats (08xx, +62).',
    websearch:
      'AI-powered web search intelligence: search the entire web with LLM-enhanced queries, get AI-summarized results with relevance scoring, discover related topics and entities, and receive intelligence-grade analysis of web content. Combines multiple search engines for comprehensive coverage.',
    image:
      'Vision Language Model-powered image forensics: upload any image for AI analysis including object detection, text extraction (OCR), face detection, EXIF metadata analysis, reverse image search, deepfake detection, and visual content intelligence. Supports JPG, PNG, WebP formats.',
    breach:
      'Check email addresses and usernames against comprehensive data breach databases. Discover if credentials have been exposed in known leaks, view breach details including data types compromised (passwords, emails, personal info), and assess overall exposure severity.',
    dorking:
      'Advanced Google dorking with pre-built operators: search for exposed documents, login pages, directory listings, sensitive files, and vulnerable endpoints. Includes customizable dork templates for common intelligence targets. Results are AI-analyzed for relevance and security implications.',
    subdomain:
      'Enumerate subdomains for any target domain using multiple discovery methods: DNS brute-force, certificate transparency logs, search engine enumeration, and passive DNS analysis. Discover hidden subdomains, development environments, and potential attack surface.',
    dns:
      'Perform comprehensive DNS reconnaissance: query all DNS record types (A, AAAA, MX, NS, TXT, CNAME, SOA, SRV), detect DNSSEC configuration, analyze zone transfers, check SPF/DKIM/DMARC records, and identify misconfigurations that could indicate security issues.',
    websec:
      'Audit website security posture: check SSL/TLS certificate validity and configuration, analyze security headers (HSTS, CSP, X-Frame-Options), detect known vulnerabilities, assess cookie security, and generate a comprehensive security score with actionable recommendations.',
    aichat:
      'XANVYOR-AI is your OSINT assistant powered by Large Language Models. Ask complex intelligence questions in natural language, get help formulating search strategies, analyze and correlate findings across tools, generate intelligence reports, and receive expert guidance on investigation methodology.',
    wifiscan:
      'Scan and discover WiFi networks in range (browser-based or manual input). Identify network names (SSID), signal strength, security protocols (WPA2/WPA3/Open), channel information, and potential vulnerabilities. Essential for physical reconnaissance and wireless security assessment.',
    wifi:
      'WiFi Access Point intelligence lookup: search by BSSID/MAC address to find the physical location of WiFi access points using global WiFi positioning databases. Map access point locations, discover nearby APs, and track wireless infrastructure for network mapping.',
    mac:
      'MAC address vendor lookup and analysis: identify the manufacturer (OUI) of any network device from its MAC address, detect device type (router, phone, IoT), find associated vendor information, and analyze MAC address patterns for network device fingerprinting.',
    people:
      'Deep people search engine: find individuals by name, phone, email, or username. Aggregate public records, social media profiles, professional information, contact details, and associated people. Build comprehensive profiles from scattered public data sources.',
    vehicle:
      'Indonesian vehicle plate tracking (TNKB): look up vehicle registration details from license plate numbers (e.g., B 1234 XYZ). Identify vehicle type, brand/model, registration region, year, and ownership category. Covers all Indonesian plate formats.',
    imei:
      'IMEI phone tracking and analysis: validate IMEI numbers using the Luhn algorithm, identify phone brand and model from TAC codes, detect device type and capabilities, check blacklist status, and trace device origin. Works with all phone IMEI formats.',
    ktp:
      'Indonesian KTP (Kartu Tanda Penduduk) OCR scanning: upload a photo of an Indonesian national ID card and extract all text fields using AI Vision. Reads NIK, name, place/date of birth, gender, address, religion, marital status, occupation, and citizenship.',
    nik:
      'Indonesian NIK (Nomor Induk Kependudukan) decoder: parse the 16-digit national ID number to reveal encoded demographic data including province, city/district, birth date, gender, and registration sequence. Validates NIK format and checks for anomalies.',
    school:
      'School and student OSINT intelligence: search Indonesian educational institutions by name, NPSN number, or location. Discover school details, accreditation status, student enrollment data, and associated educational records. Covers SD, SMP, SMA, and SMK levels.',
    ewallet:
      'E-wallet account detection and intelligence: check if a phone number is registered on Indonesian e-wallet platforms (GoPay, OVO, Dana, ShopeePay, LinkAja). Discover linked accounts, wallet names, and associated payment information. Supports all major Indonesian e-wallets.',
    qris:
      'QRIS (Quick Response Code Indonesian Standard) merchant lookup: scan or decode QRIS codes to identify merchant details including merchant name, terminal ID, merchant ID, payment methods supported, and acquiring bank. Essential for payment fraud investigation.',
    bank:
      'Bank account verification: validate Indonesian bank account numbers, identify the associated bank, verify account holder name (where available), and check account status. Supports all major Indonesian banks including BCA, BRI, Mandiri, BNI, and digital banks.',
    bitcoin:
      'Bitcoin address analysis and tracing: look up Bitcoin wallet balances, view transaction history, track fund flows between addresses, identify known exchange addresses, and analyze wallet activity patterns. Useful for cryptocurrency fraud investigation and fund tracing.',
    phonedev:
      'Phone device intelligence: analyze phone numbers to identify the associated device type, operating system, browser, and device capabilities. Detect if the number is used on smartphone, feature phone, or other device types. Useful for targeted investigation strategies.',
    phoneloc:
      'Phone GPS location tracking: approximate the geographic location of a phone number using carrier data, cell tower triangulation, and regional prefix analysis. Provides coordinate estimates with accuracy radius and map visualization. Supports Indonesian phone formats.',
    webvuln:
      'Web vulnerability scanner: scan websites for common security vulnerabilities including SQL injection, XSS, CSRF, directory traversal, information disclosure, and misconfigurations. Generates risk-rated findings with proof-of-concept and remediation guidance.',
    social:
      'Social media deep scanner: perform comprehensive analysis of social media profiles across platforms. Extract public profile data, post history, connections, engagement patterns, and potential alt accounts. Correlates information across platforms for complete social intelligence.',
  };
  return details[id] || 'Advanced OSINT intelligence tool powered by AI analysis engines.';
}
