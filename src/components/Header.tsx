import React from 'react';
import { Bell, Moon, Sun, Search, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Header({ toggleSidebar }: { toggleSidebar: () => void }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-14 bg-[#0a0c14]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between px-6 z-50">
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg lg:hidden hover:bg-white/5 text-slate-400"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden md:block">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search anomalies, IPs..."
            className="pl-10 pr-4 py-2 bg-[#0f111a] border border-white/5 rounded-lg text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none w-64 transition-all text-slate-200 placeholder-slate-500"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors hidden"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
        <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-full mr-4 hidden md:flex">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-mono text-green-400 uppercase">System Optimal</span>
        </div>
        <div className="relative">
          <button className="p-2 rounded-full hover:bg-white/5 text-slate-400 transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0a0c14]"></span>
        </div>
      </div>
    </header>
  );
}
