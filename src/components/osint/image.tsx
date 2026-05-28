'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Eye,
  Loader2,
  Car,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink } from './shared';

interface ImageResult { imageUrl: string; analysis: string; relatedIntel: Array<{ url: string; title: string; snippet: string }>; }


export function ImageModule() {
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
