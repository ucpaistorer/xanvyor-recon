'use client';

import React from 'react';
import {
  Search, User, Mail, Globe, Phone, Shield, Eye, Brain,
  Wifi, Server, AlertTriangle,
  Home, MapPin, Key, Activity, Database, Radar, Fingerprint, Network,
  Zap, Scan, FileSearch,
  Cpu, Lock,
  ShieldAlert, ShieldCheck,
  Users, Bug, Code,
  CreditCard, Wallet, QrCode, UserSearch, Radio,
  Car, GraduationCap, Smartphone, Building2, Bitcoin as BitcoinIcon,
} from 'lucide-react';
import type { Module, ModuleType } from './shared';

const ImageIcon = Eye;

export const MODULES: Module[] = [
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
  { id: 'vehicle', name: 'Vehicle Plate', icon: <Car className="w-4 h-4" />, description: 'Lacak plat mobil & motor', color: 'from-slate-500 to-gray-500' },
  { id: 'imei', name: 'IMEI Tracker', icon: <Smartphone className="w-4 h-4" />, description: 'Lacak HP via IMEI', color: 'from-cyan-500 to-blue-500' },
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

// Re-export ModuleType for convenience
export type { ModuleType };
