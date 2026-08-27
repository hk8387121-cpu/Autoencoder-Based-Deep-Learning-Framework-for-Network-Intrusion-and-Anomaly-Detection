import React, { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Search, AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { AnomalyAlert } from '../types';
import { format } from 'date-fns';
import { useSearchParams } from 'react-router-dom';

const realIPs = [
  '142.250.190.46', '1.1.1.1', '8.8.8.8', '157.240.22.35', '54.239.28.85',
  '20.112.52.29', '140.82.112.3', '104.244.42.193', '17.253.144.10', '54.237.226.164', '103.102.166.224'
];

const generateIP = () => realIPs[Math.floor(Math.random() * realIPs.length)];

const generateAlert = (): AnomalyAlert => ({
  id: `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
  timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
  sourceIP: generateIP(),
  destinationIP: generateIP(),
  protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
  reconstructionError: Math.random() * 0.15 + 0.05,
  severity: Math.random() > 0.8 ? 'Critical' : Math.random() > 0.5 ? 'High' : 'Medium',
  status: Math.random() > 0.7 ? 'Investigating' : Math.random() > 0.9 ? 'Resolved' : 'New'
});

const generateInitialAlerts = (): AnomalyAlert[] => Array.from({ length: 15 }).map((_, i) => ({
  id: `ALT-INIT-${1000 + i}`,
  timestamp: format(new Date(Date.now() - i * 3600000), 'yyyy-MM-dd HH:mm:ss'),
  sourceIP: generateIP(),
  destinationIP: generateIP(),
  protocol: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
  reconstructionError: Math.random() * 0.15 + 0.05,
  severity: Math.random() > 0.8 ? 'Critical' : Math.random() > 0.5 ? 'High' : 'Medium',
  status: i < 3 ? 'New' : i < 8 ? 'Investigating' : 'Resolved'
}));

export default function Alerts() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '');
  const [severity, setSeverity] = useState(searchParams.get('severity') || 'All');
  const [status, setStatus] = useState(searchParams.get('status') || 'All');
  const [protocol, setProtocol] = useState(searchParams.get('protocol') || 'All');
  const [showFilters, setShowFilters] = useState(false);
  const [alerts, setAlerts] = useState<AnomalyAlert[]>(generateInitialAlerts());

  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(current => [generateAlert(), ...current].slice(0, 50));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const next = new URLSearchParams();
    if (searchTerm.trim()) next.set('q', searchTerm.trim());
    if (severity !== 'All') next.set('severity', severity);
    if (status !== 'All') next.set('status', status);
    if (protocol !== 'All') next.set('protocol', protocol);
    setSearchParams(next, { replace: true });
  }, [searchTerm, severity, status, protocol, setSearchParams]);

  const filteredAlerts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return alerts.filter(a => {
      const searchable = [a.id, a.timestamp, a.sourceIP, a.destinationIP, a.protocol, a.severity, a.status].join(' ').toLowerCase();
      return (!q || searchable.includes(q)) &&
        (severity === 'All' || a.severity === severity) &&
        (status === 'All' || a.status === status) &&
        (protocol === 'All' || a.protocol === protocol);
    });
  }, [alerts, searchTerm, severity, status, protocol]);

  const exportCSV = () => {
    const header = 'ID,Timestamp,Source IP,Destination IP,Protocol,Error,Severity,Status\n';
    const csvData = filteredAlerts.map(a =>
      [a.id, a.timestamp, a.sourceIP, a.destinationIP, a.protocol, a.reconstructionError.toFixed(4), a.severity, a.status]
        .map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([header + csvData], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intrusion-logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSeverity('All');
    setStatus('All');
    setProtocol('All');
  };

  const getSeverityColor = (value: string) => {
    switch (value) {
      case 'Critical': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'High': return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'Medium': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const getStatusIcon = (value: string) => {
    switch (value) {
      case 'Resolved': return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
      case 'New': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <div className="w-2 h-2 rounded-full bg-blue-500 mx-1" />;
    }
  };

  const hasFilters = Boolean(searchTerm || severity !== 'All' || status !== 'All' || protocol !== 'All');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Alert Log</h1>
          <p className="text-slate-400 text-sm">Detailed history of detected network anomalies.</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-2 bg-white/5 border border-white/10 text-slate-200 hover:text-white px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest hover:bg-white/10 transition-colors">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      <div className="bg-[#0a0c14] rounded-xl border border-white/5 overflow-hidden shadow-inner">
        <div className="p-4 border-b border-white/5 flex flex-wrap items-center gap-3 bg-white/5">
          <div className="relative flex-1 min-w-[220px] max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input type="text" placeholder="Search IPs, IDs, protocol, severity..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-[#0f111a] border border-white/10 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none text-slate-200 transition-colors" />
          </div>
          <button onClick={() => setShowFilters(value => !value)} aria-label="Toggle alert filters" aria-expanded={showFilters} className={`p-2 border rounded-lg transition-colors ${showFilters || hasFilters ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' : 'border-white/10 bg-[#0f111a] text-slate-400 hover:text-white hover:bg-white/5'}`}>
            <Filter className="w-4 h-4" />
          </button>
          {hasFilters && <button onClick={clearFilters} className="flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-400 hover:text-white"><X className="w-3 h-3" /> Clear</button>}
        </div>

        {showFilters && (
          <div className="p-4 border-b border-white/5 grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#0f111a]">
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Severity
              <select value={severity} onChange={e => setSeverity(e.target.value)} className="mt-2 w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                <option>All</option><option>Critical</option><option>High</option><option>Medium</option>
              </select>
            </label>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Status
              <select value={status} onChange={e => setStatus(e.target.value)} className="mt-2 w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                <option>All</option><option>New</option><option>Investigating</option><option>Resolved</option>
              </select>
            </label>
            <label className="text-[10px] uppercase tracking-widest text-slate-500">Protocol
              <select value={protocol} onChange={e => setProtocol(e.target.value)} className="mt-2 w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 outline-none">
                <option>All</option><option>TCP</option><option>UDP</option><option>ICMP</option>
              </select>
            </label>
          </div>
        )}

        <div className="px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-slate-600">Showing {filteredAlerts.length} of {alerts.length} alerts</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-[#0f111a]/50 text-slate-400 border-b border-white/5 text-[10px] uppercase tracking-widest font-bold">
              <tr><th className="px-6 py-4">Alert ID</th><th className="px-6 py-4">Timestamp</th><th className="px-6 py-4">Source IP</th><th className="px-6 py-4">Dest IP</th><th className="px-6 py-4">MSE Error</th><th className="px-6 py-4">Severity</th><th className="px-6 py-4">Status</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {filteredAlerts.map(alert => (
                <tr key={alert.id} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4 text-slate-300">{alert.id}</td><td className="px-6 py-4 text-slate-500">{alert.timestamp}</td><td className="px-6 py-4 text-blue-400">{alert.sourceIP}</td><td className="px-6 py-4 text-blue-400">{alert.destinationIP}</td><td className="px-6 py-4 text-slate-300">{alert.reconstructionError.toFixed(4)}</td>
                  <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-[9px] uppercase tracking-wider border ${getSeverityColor(alert.severity)}`}>{alert.severity}</span></td>
                  <td className="px-6 py-4"><div className="flex items-center gap-2">{getStatusIcon(alert.status)}<span>{alert.status}</span></div></td>
                </tr>
              ))}
              {filteredAlerts.length === 0 && <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No alerts match the current search and filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
