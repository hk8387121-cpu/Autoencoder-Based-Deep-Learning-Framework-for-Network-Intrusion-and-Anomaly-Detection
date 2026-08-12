import React from 'react';
import { NavLink } from 'react-router-dom';
import { ShieldAlert, Activity, FileText, Settings, BookOpen, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export default function Sidebar() {
  const { logout, user } = useAuth();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Alerts Log', path: '/alerts', icon: ShieldAlert },
    { name: 'Reports', path: '/reports', icon: FileText },
    { name: 'Settings', path: '/settings', icon: Settings },
    ...(user?.role === 'Admin' ? [{ name: 'API Docs', path: '/api-docs', icon: BookOpen }] : []),
  ];

  return (
    <div className="flex flex-col w-64 bg-[#0a0c14] border-r border-white/5 shadow-2xl text-slate-300 min-h-screen">
      <div className="flex items-center justify-center h-14 border-b border-white/10">
        <div className="flex items-center gap-2 px-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.5)]">
            <ShieldAlert className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
            SENTRY-AI
          </h1>
        </div>
      </div>

      <nav className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                  : 'text-slate-500 hover:text-white hover:bg-white/5'
              )
            }
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/5 mt-auto">
        <div className="flex items-center gap-3 px-3 py-2 mb-2 rounded-lg bg-white/5 border border-white/5">
          <div className="w-8 h-8 rounded-full bg-[#0f111a] border border-white/10 flex items-center justify-center text-xs font-bold text-slate-300">
            {user?.name.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-200">{user?.name}</span>
            <span className="text-[10px] text-slate-400 uppercase">{user?.role}</span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-[11px] font-mono uppercase tracking-wider font-bold text-red-500 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}
