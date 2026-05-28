'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Image as ImageIcon,
  Eye,
  Loader2,
  Upload,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import ReactMarkdown from 'react-markdown';
import { useOSINTSearch, LoadingIndicator, ErrorCard, ModuleHeader, ResultLink } from './shared';

interface ImageResult { imageUrl: string; analysis: string; relatedIntel: Array<{ url: string; title: string; snippet: string }>; }

export function ImageModule() {
  const [imageUrl, setImageUrl] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadBase64, setUploadBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { loading, result, error, search } = useOSINTSearch<ImageResult>();

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadPreview(dataUrl);
      setUploadBase64(dataUrl);
      setImageUrl(''); // Clear URL when file is uploaded
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const clearUpload = useCallback(() => {
    setUploadPreview(null);
    setUploadBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const doSearch = useCallback(() => {
    if (uploadBase64) {
      search('/api/osint/image-analysis', { imageBase64: uploadBase64 });
    } else if (imageUrl.trim()) {
      search('/api/osint/image-analysis', { imageUrl: imageUrl.trim() });
    }
  }, [imageUrl, uploadBase64, search]);

  const canSearch = !!(uploadBase64 || imageUrl.trim());
  const displayImage = uploadPreview || imageUrl;

  return (
    <div className="space-y-6">
      <ModuleHeader icon={<ImageIcon className="w-5 h-5" />} color="from-sky-500 to-indigo-500" title="Image Forensics" subtitle="VLM-powered image analysis & intelligence — upload langsung atau URL" />
      
      {/* Upload Area */}
      <Card className="border-sky-500/20 bg-sky-500/5">
        <CardContent className="p-4 space-y-3">
          {/* Drag & Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging 
                ? 'border-sky-400 bg-sky-500/10' 
                : uploadPreview 
                  ? 'border-emerald-500/30 bg-emerald-500/5'
                  : 'border-border/50 hover:border-sky-500/30 hover:bg-sky-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileInputChange}
              className="hidden"
            />
            {uploadPreview ? (
              <div className="relative inline-block">
                <img src={uploadPreview} alt="Uploaded" className="max-h-48 rounded-lg border border-border/30" />
                <button
                  onClick={(e) => { e.stopPropagation(); clearUpload(); }}
                  className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="mt-2 text-xs text-emerald-400 flex items-center gap-1 justify-center">
                  <Upload className="w-3 h-3" />
                  Foto berhasil diupload — klik Analyze
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground" />
                <div className="text-sm font-medium">Upload foto langsung</div>
                <div className="text-xs text-muted-foreground">Drag & drop atau klik untuk pilih file gambar</div>
                <div className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF — atau masukkan URL di bawah</div>
              </div>
            )}
          </div>

          {/* URL Input (fallback) */}
          {!uploadPreview && (
            <div className="flex gap-3">
              <div className="relative flex-1">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Atau masukkan URL gambar..." 
                  value={imageUrl} 
                  onChange={e => setImageUrl(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && doSearch()} 
                  className="pl-10 bg-card/50 border-border/50" 
                />
              </div>
            </div>
          )}

          {/* Analyze Button */}
          <div className="flex gap-3">
            <Button 
              onClick={doSearch} 
              disabled={loading || !canSearch} 
              className="bg-sky-600 hover:bg-sky-700 text-white min-w-[140px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
              {loading ? 'Analyzing...' : 'Analyze Image'}
            </Button>
            {uploadPreview && (
              <Button variant="outline" onClick={clearUpload} className="border-border/50 text-muted-foreground">
                <X className="w-4 h-4 mr-2" />Hapus Foto
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview (for URL mode) */}
      {imageUrl && !uploadPreview && !loading && !result && (
        <div className="mt-4">
          <img src={imageUrl} alt="Preview" className="max-w-sm rounded-lg border border-border/30" onError={e => (e.currentTarget.style.display = 'none')} />
        </div>
      )}

      {loading && <LoadingIndicator message="VLM analyzing image content" />}
      {error && <ErrorCard error={error} />}
      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {/* Show the analyzed image */}
          {displayImage && (
            <Card className="border-sky-500/20 bg-sky-500/5 overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="w-4 h-4 text-sky-400" />
                  <span className="text-sm font-medium text-sky-400">Gambar yang Dianalisis</span>
                  {uploadBase64 && <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">Uploaded</Badge>}
                </div>
                <img 
                  src={typeof displayImage === 'string' && displayImage.startsWith('data:') ? displayImage : (result.imageUrl || displayImage)} 
                  alt="Analyzed" 
                  className="max-w-sm rounded-lg border border-border/30" 
                />
              </CardContent>
            </Card>
          )}
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
