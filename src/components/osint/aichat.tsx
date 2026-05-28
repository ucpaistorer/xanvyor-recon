'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Brain,
  Loader2,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ReactMarkdown from 'react-markdown';
import { ModuleHeader, fetchWithTimeout } from './shared';

interface ChatMessage { role: 'user' | 'assistant'; content: string; }


export function AIChatModule() {
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
