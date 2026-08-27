import React, { useEffect, useState } from 'react';
import { Bell, Moon, Sun, Search, Menu, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useLocation, useNavigate } from 'react-router-dom';

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unread, setUnread] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || '');
  }, [location.pathname, location.search]);

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `/alerts?q=${encodeURIComponent(q)}` : '/alerts');
  };

  const clearSearch = () => {
    setQuery('');
    if (location.pathname === '/alerts') navigate('/alerts');
  };

  return (
    <header className="h-14 bg-[#0a0c14]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="p-2 rounded-lg lg:hidden hover:bg-white/5 text-slate-400" aria-label="Open menu"><Menu className="w-5 h-5" /></button>
        <form onSubmit={submitSearch} className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search anomalies, IPs..." aria-label="Search anomalies and IPs" className="pl-10 pr-10 py-2 bg-[#0f111a] border border-white/5 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-72 transition-all text-slate-200 placeholder-slate-500" />
          {query && <button type="button" onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white" aria-label="Clear search"><X className="w-4 h-4" /></button>}
        </form>
      </div>

      <div className="flex items-center gap-3">
        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors hidden" aria-label="Toggle theme">{theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}</button>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full mr-4 hidden md:flex"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-[10px] font-mono text-green-400 uppercase">System Optimal</span></div>
        <div className="relative">
          <button onClick={() => { setShowNotifications(v => !v); setUnread(false); }} className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors" aria-label="Notifications" aria-expanded={showNotifications}>
            <Bell className="w-5 h-5" />
          </button>
          {unread && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0c14]" />}
          {showNotifications && <div className="absolute right-0 top-11 w-72 bg-[#0f111a] border border-white/10 rounded-xl shadow-2xl p-4 z-[60]">
            <div className="flex items-center justify-between mb-3"><span className="text-xs font-bold uppercase tracking-widest text-slate-300">Notifications</span><button onClick={() => setShowNotifications(false)} className="text-slate-500 hover:text-white" aria-label="Close notifications"><X className="w-4 h-4" /></button></div>
            <button onClick={() => { setShowNotifications(false); navigate('/alerts'); }} className="w-full text-left p-3 rounded-lg bg-red-500/10 border border-red-500/20 hover:bg-red-500/15"><p className="text-xs font-semibold text-red-300">Open Alert Log</p><p className="text-[10px] text-slate-500 mt-1">Review the latest anomaly events.</p></button>
          </div>}
        </div>
      </div>
    </header>
  );
}
