import React, { useEffect, useState } from 'react';
import { Bell, Search, Menu, X, Server, ServerCrash } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { checkHealth } from '../api';

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unread, setUnread] = useState(true);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || '');
  }, [location.pathname, location.search]);

  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try { await checkHealth(); if (mounted) setBackendOnline(true); }
      catch { if (mounted) setBackendOnline(false); }
    };
    check();
    const interval = setInterval(check, 15000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/alerts?q=${encodeURIComponent(q)}` : '/alerts');
  };
  const clearSearch = () => { setQuery(''); if (location.pathname === '/alerts') navigate('/alerts'); };

  return <header className="h-14 bg-[#0a0c14]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-50">
    <div className="flex items-center gap-4"><button onClick={toggleSidebar} className="p-2 rounded-lg lg:hidden hover:bg-white/5 text-slate-400" aria-label="Open menu"><Menu className="w-5 h-5" /></button><form onSubmit={submitSearch} className="relative hidden md:block"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search anomalies, IPs..." aria-label="Search anomalies and IPs" className="pl-10 pr-10 py-2 bg-[#0f111a] border border-white/5 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-72 transition-all text-slate-200 placeholder-slate-500" />{query && <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" aria-label="Clear search"><X className="w-4 h-4" /></button>}</form></div>
    <div className="flex items-center gap-3">
      <div className={`flex items-center gap-2 px-3 py-1 border rounded-full mr-2 hidden md:flex ${backendOnline === false ? 'bg-red-500/10 border-red-500/20' : backendOnline === true ? 'bg-green-500/10 border-green-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}><span className={`w-2 h-2 rounded-full ${backendOnline === false ? 'bg-red-500' : backendOnline === true ? 'bg-green-500 animate-pulse' : 'bg-blue-500 animate-pulse'}`} />{backendOnline === false ? <ServerCrash className="w-3 h-3 text-red-400" /> : <Server className="w-3 h-3 text-slate-400" />}<span className={`text-[10px] font-mono uppercase ${backendOnline === false ? 'text-red-400' : backendOnline === true ? 'text-green-400' : 'text-blue-400'}`}>{backendOnline === false ? 'Backend Offline' : backendOnline === true ? 'Backend Online' : 'Checking Backend'}</span></div>
      <div className="relative"><button onClick={() => { setShowNotifications(v => !v); setUnread(false); }} className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors" aria-label="Notifications" aria-expanded={showNotifications}><Bell className="w-5 h-5" /></button>{unread && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0c14]" />}{showNotifications && <div className="absolute right-0 top-11 w-72 bg-[#0f111a] border border-white/10 rounded-xl shadow-2xl p-4 z-[60]"><div className="flex items-center justify-between mb-3"><span className="text-xs font-bold uppercase tracking-widest text-slate-300">Notifications</span><button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white" aria-label="Close notifications"><X className="w-4 h-4" /></button></div><button onClick={() => { setShowNotifications(false); navigate('/alerts'); }} className="w-full text-left p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15"><p className="text-xs font-semibold text-red-300">Open Alert Log</p><p className="text-[10px] text-slate-500 mt-1">Review backend anomaly events.</p></button></div>}</div>
    </div>
  </header>;
}
