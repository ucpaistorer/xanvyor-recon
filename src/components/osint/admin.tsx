'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users, Key, Activity, CheckCircle2, XCircle, Loader2,
  ShieldAlert, Crown, Plus, Copy, Check, ShieldX, ShieldCheck, X,
  ChevronLeft, LogOut,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import type { AuthState } from './shared';

interface AdminUser {
  id: string; name: string | null; phone: string | null; createdAt: string;
  apiKeys: Array<{ id: string; key: string; plan: string; isActive: boolean; expiresAt: string | null; label: string | null; lastUsedAt: string | null; createdAt: string }>;
}


export function AdminModule({ auth, onLogout, onBackToDashboard }: { auth: AuthState; onLogout: () => void; onBackToDashboard: () => void }) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newKeyPlan, setNewKeyPlan] = useState('7days');
  const [newKeyAdmin, setNewKeyAdmin] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [copiedKey, setCopiedKey] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const adminHeaders = { 'x-admin-key': auth.apiKeyString };

  useEffect(() => { loadUsers(); }, []);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const loadUsers = async () => {
    try {
      const res = await fetch('/api/admin/users', { headers: adminHeaders });
      const data = await res.json();
      if (data.users) { setUsers(data.users); }
      else if (data.error) { showToast(data.error); }
    } catch { showToast('Gagal memuat data user'); }
    finally { setLoading(false); }
  };

  const createUser = async () => {
    if (!newUserName.trim()) { showToast('Nama wajib diisi'); return; }
    setCreating(true);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ name: newUserName.trim(), phone: newUserPhone.trim() || null, plan: newKeyPlan, isAdmin: newKeyAdmin }),
      });
      const data = await res.json();
      if (data.apiKey) {
        showToast(`User "${newUserName}" dibuat! Key: ${data.apiKey.key.substring(0, 20)}...`);
        await loadUsers();
        setNewUserName(''); setNewUserPhone(''); setNewKeyAdmin(false);
      } else {
        showToast(data.error || 'Gagal membuat user');
      }
    } catch { showToast('Gagal membuat user'); }
    finally { setCreating(false); }
  };

  const toggleKey = async (keyId: string, isActive: boolean) => {
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ keyId, isActive: !isActive }),
      });
      const data = await res.json();
      if (data.success) { await loadUsers(); showToast(`Key ${!isActive ? 'diaktifkan' : 'dinonaktifkan'}`); }
      else { showToast(data.error || 'Gagal toggle key'); }
    } catch { showToast('Gagal toggle key'); }
  };

  const deleteKey = async (keyId: string) => {
    if (!confirm('Hapus API key ini?')) return;
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ keyId }),
      });
      const data = await res.json();
      if (data.success) { await loadUsers(); showToast('Key dihapus'); }
      else { showToast(data.error || 'Gagal hapus key'); }
    } catch { showToast('Gagal hapus key'); }
  };

  const addKeyToUser = async (userId: string, plan: string, isAdmin: boolean) => {
    try {
      const res = await fetch('/api/admin/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...adminHeaders },
        body: JSON.stringify({ userId, plan, isAdmin }),
      });
      const data = await res.json();
      if (data.success) { await loadUsers(); showToast('Key baru ditambahkan'); }
      else { showToast(data.error || 'Gagal tambah key'); }
    } catch { showToast('Gagal tambah key'); }
  };

  const deleteUser = async (userId: string, userName: string) => {
    if (!confirm(`Hapus user "${userName}" dan semua key-nya?`)) return;
    try {
      // Delete all keys first
      const user = users.find(u => u.id === userId);
      if (user) {
        for (const key of user.apiKeys) {
          await fetch('/api/admin/keys', { method: 'DELETE', headers: { 'Content-Type': 'application/json', ...adminHeaders }, body: JSON.stringify({ keyId: key.id }) });
        }
      }
      setUsers(prev => prev.filter(u => u.id !== userId));
      showToast(`User "${userName}" dihapus`);
    } catch { showToast('Gagal hapus user'); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const totalUsers = users.length;
  const totalKeys = users.reduce((acc, u) => acc + u.apiKeys.length, 0);
  const activeKeys = users.reduce((acc, u) => acc + u.apiKeys.filter(k => k.isActive).length, 0);
  const expiredKeys = users.reduce((acc, u) => acc + u.apiKeys.filter(k => k.expiresAt && new Date(k.expiresAt) < new Date()).length, 0);
  const adminKeys = users.reduce((acc, u) => acc + u.apiKeys.filter(k => k.key.startsWith('recon-admin-')).length, 0);

  const filteredUsers = users.filter(u =>
    !searchQuery || (u.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (u.phone || '').includes(searchQuery)
  );

  return (
    <div className="space-y-6">
      {/* Admin Header */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-card to-orange-500/10 p-4 sm:p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white"><Crown className="w-6 h-6" /></div>
            <div>
              <h2 className="text-2xl font-bold">Admin Control Panel</h2>
              <p className="text-sm text-muted-foreground">Kelola user, API key & akses platform</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30"><Crown className="w-3 h-3 mr-1" />Admin</Badge>
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><Activity className="w-3 h-3 mr-1" />System Online</Badge>
            <span className="text-xs text-muted-foreground ml-2">Logged in as: {auth.user?.name || 'Admin'}</span>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="fixed top-4 right-4 z-50 px-4 py-2 rounded-lg bg-amber-500/90 text-white text-sm font-medium shadow-lg">
          {toast}
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
          <Users className="w-5 h-5 text-amber-400 mb-1" />
          <div className="text-2xl font-bold">{totalUsers}</div>
          <div className="text-xs text-muted-foreground">Total Users</div>
        </div>
        <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5">
          <Key className="w-5 h-5 text-cyan-400 mb-1" />
          <div className="text-2xl font-bold">{totalKeys}</div>
          <div className="text-xs text-muted-foreground">Total Keys</div>
        </div>
        <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mb-1" />
          <div className="text-2xl font-bold">{activeKeys}</div>
          <div className="text-xs text-muted-foreground">Active Keys</div>
        </div>
        <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
          <XCircle className="w-5 h-5 text-red-400 mb-1" />
          <div className="text-2xl font-bold">{expiredKeys}</div>
          <div className="text-xs text-muted-foreground">Expired</div>
        </div>
        <div className="p-4 rounded-xl border border-purple-500/30 bg-purple-500/5">
          <ShieldAlert className="w-5 h-5 text-purple-400 mb-1" />
          <div className="text-2xl font-bold">{adminKeys}</div>
          <div className="text-xs text-muted-foreground">Admin Keys</div>
        </div>
      </div>

      {/* System Status */}
      <Card className="border-emerald-500/20 bg-emerald-500/5">
        <CardContent className="p-4">
          <div className="text-sm font-semibold text-emerald-400 mb-2 flex items-center gap-2"><Activity className="w-4 h-4" /> System Status</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>API Server: Online</span></div>
            <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>AI Engine: Active</span></div>
            <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>Web Search: Online</span></div>
            <div className="flex items-center gap-2 text-xs"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>Database: Connected</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card/50">
          <TabsTrigger value="overview" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400"><Activity className="w-3 h-3 mr-1" />Overview</TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-400"><Users className="w-3 h-3 mr-1" />Users ({totalUsers})</TabsTrigger>
          <TabsTrigger value="create" className="data-[state=active]:bg-emerald-500/20 data-[state=active]:text-emerald-400"><Plus className="w-3 h-3 mr-1" />Create</TabsTrigger>
          <TabsTrigger value="keys" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400"><Key className="w-3 h-3 mr-1" />Keys ({totalKeys})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-amber-400"><Users className="w-4 h-4" /> Recent Users</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {users.slice(0, 8).map(user => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/20 bg-card/30">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">{(user.name || 'U').charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0"><div className="text-sm font-medium truncate">{user.name || 'Unnamed'}</div><div className="text-[10px] text-muted-foreground">{user.apiKeys.length} key(s) | {user.phone || 'No phone'}</div></div>
                      <Badge variant="outline" className="text-[9px]">{user.apiKeys.filter(k => k.isActive).length} active</Badge>
                    </div>
                  ))}
                  {users.length === 0 && <div className="text-center py-4 text-muted-foreground text-sm">No users yet</div>}
                </div>
              </CardContent>
            </Card>
            <Card className="border-cyan-500/30 bg-cyan-500/5">
              <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2 text-cyan-400"><Key className="w-4 h-4" /> Key Distribution</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm">Active Keys</span><span className="text-sm font-bold text-emerald-400">{activeKeys}</span></div>
                  <Progress value={totalKeys > 0 ? (activeKeys / totalKeys) * 100 : 0} className="h-2" />
                  <div className="flex items-center justify-between"><span className="text-sm">Expired Keys</span><span className="text-sm font-bold text-red-400">{expiredKeys}</span></div>
                  <Progress value={totalKeys > 0 ? (expiredKeys / totalKeys) * 100 : 0} className="h-2" />
                  <div className="flex items-center justify-between"><span className="text-sm">Admin Keys</span><span className="text-sm font-bold text-purple-400">{adminKeys}</span></div>
                  <Progress value={totalKeys > 0 ? (adminKeys / totalKeys) * 100 : 0} className="h-2" />
                  <Separator className="my-2" />
                  <div className="text-xs text-muted-foreground">Platform: XANVYOR RECON | Tools: 32 | AI Engines: 4</div>
                  <div className="text-xs text-muted-foreground">WhatsApp: <a href="https://wa.me/6287892614294" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">+62 878-9261-4294</a></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2 text-emerald-400"><Plus className="w-4 h-4" /> Buat User Baru</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label className="text-xs text-muted-foreground mb-1 block">Nama*</label><Input placeholder="Nama user" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="bg-card/50" /></div>
                <div><label className="text-xs text-muted-foreground mb-1 block">Phone (opsional)</label><Input placeholder="08xxxxxxxxxx" value={newUserPhone} onChange={e => setNewUserPhone(e.target.value)} className="bg-card/50" /></div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Plan*</label>
                  <select value={newKeyPlan} onChange={e => setNewKeyPlan(e.target.value)} className="w-full bg-card/50 border border-border/50 rounded-md px-3 py-2 text-sm">
                    <option value="7days">7 Hari</option>
                    <option value="30days">30 Hari</option>
                    <option value="90days">90 Hari</option>
                    <option value="lifetime">Lifetime</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={newKeyAdmin} onChange={e => setNewKeyAdmin(e.target.checked)} className="w-4 h-4 rounded" />
                    <span className="text-sm font-medium text-amber-400">Admin Key</span>
                  </label>
                </div>
                <div className="flex items-end">
                  <Button onClick={createUser} disabled={creating || !newUserName.trim()} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}Buat User
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <div className="mb-3">
            <Input placeholder="Cari user (nama/phone)..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="bg-card/50 max-w-sm" />
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Tidak ada user ditemukan</div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredUsers.map(user => (
                <Card key={user.id} className="border-border/30 hover:border-amber-500/20 transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
                          {(user.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium">{user.name || 'Unnamed'}</div>
                          <div className="text-xs text-muted-foreground">{user.phone || 'No phone'}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">{user.apiKeys.length} key(s)</Badge>
                        <Button variant="ghost" size="sm" onClick={() => addKeyToUser(user.id, '30days', false)} className="text-cyan-400 hover:text-cyan-300 h-7 px-2 text-xs">
                          <Plus className="w-3 h-3 mr-1" />Tambah Key
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteUser(user.id, user.name || 'Unnamed')} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7 px-2">
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      {user.apiKeys.map(key => {
                        const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                        const isAdminKey = key.key.startsWith('recon-admin-');
                        return (
                          <div key={key.id} className={`flex items-center gap-2 text-xs p-2.5 rounded-lg border ${key.isActive && !isExpired ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                            <Badge className={`${key.isActive && !isExpired ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} text-[9px]`}>
                              {key.isActive && !isExpired ? 'Active' : isExpired ? 'Expired' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="text-[9px]">{key.plan}</Badge>
                            {isAdminKey && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">Admin</Badge>}
                            <span className="font-mono text-muted-foreground truncate flex-1">{key.key}</span>
                            <button onClick={() => copyToClipboard(key.key)} className="text-muted-foreground hover:text-foreground p-1">
                              {copiedKey === key.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            </button>
                            <button onClick={() => toggleKey(key.id, key.isActive)} className={`p-1 ${key.isActive ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'}`}>
                              {key.isActive ? <ShieldX className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                            </button>
                            <button onClick={() => deleteKey(key.id)} className="text-red-400 hover:text-red-300 p-1"><X className="w-3 h-3" /></button>
                            {key.expiresAt && <span className="text-[9px] text-muted-foreground whitespace-nowrap">s/d {new Date(key.expiresAt).toLocaleDateString('id-ID')}</span>}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="keys" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-amber-400" /></div>
          ) : (
            <Card className="border-border/30">
              <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Key className="w-4 h-4 text-cyan-400" /> Semua API Keys</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                  {users.flatMap(u => u.apiKeys.map(k => ({ ...k, userName: u.name, userPhone: u.phone }))).map(key => {
                    const isExpired = key.expiresAt && new Date(key.expiresAt) < new Date();
                    const isAdminKey = key.key.startsWith('recon-admin-');
                    return (
                      <div key={key.id} className={`flex items-center gap-2 text-xs p-2 rounded-lg border ${key.isActive && !isExpired ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-red-500/20 bg-red-500/5'}`}>
                        <Badge className={`${key.isActive && !isExpired ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'} text-[9px]`}>
                          {key.isActive && !isExpired ? 'Active' : isExpired ? 'Expired' : 'Off'}
                        </Badge>
                        <Badge variant="outline" className="text-[9px]">{key.plan}</Badge>
                        {isAdminKey && <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-[9px]">👑</Badge>}
                        <span className="text-muted-foreground w-20 truncate">{key.userName || 'N/A'}</span>
                        <span className="font-mono text-muted-foreground truncate flex-1">{key.key}</span>
                        <button onClick={() => copyToClipboard(key.key)} className="text-muted-foreground hover:text-foreground p-1">
                          {copiedKey === key.key ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button onClick={() => toggleKey(key.id, key.isActive)} className={`p-1 ${key.isActive ? 'text-red-400' : 'text-emerald-400'}`}>
                          {key.isActive ? <ShieldX className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                        </button>
                        <button onClick={() => deleteKey(key.id)} className="text-red-400 p-1"><X className="w-3 h-3" /></button>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Back to Dashboard & Logout */}
      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={onBackToDashboard} className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
          <ChevronLeft className="w-4 h-4 mr-2" />Back to Dashboard
        </Button>
        <Button variant="outline" onClick={onLogout} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
          <LogOut className="w-4 h-4 mr-2" />Logout
        </Button>
      </div>
    </div>
  );
}
