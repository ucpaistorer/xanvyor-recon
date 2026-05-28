'use client';

import React from 'react';
import { Crown, Activity } from 'lucide-react';
import type { ModuleType, AuthState } from './shared';
import { MODULES } from './modules';

export function SidebarContent({ activeModule, sidebarOpen, onNavigate, isAdmin, onAdminClick, auth }: {
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
