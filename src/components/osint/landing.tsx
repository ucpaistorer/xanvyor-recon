'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Key, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import type { AuthState } from './shared';

export function LandingPage({ onLogin }: { onLogin: (auth: AuthState) => void }) {
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
