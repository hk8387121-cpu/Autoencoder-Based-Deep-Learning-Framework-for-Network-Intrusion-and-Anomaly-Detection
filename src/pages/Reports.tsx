import React, { useState, useEffect } from 'react';
import { FileText, Download, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';

const generateInitialReports = () => Array.from({ length: 6 }).map((_, i) => ({
  id: `REP-2024-${10 - i}`,
  title: `Weekly Threat Summary - Week ${10 - i}`,
  date: format(new Date(Date.now() - i * 7 * 24 * 3600000), 'MMM dd, yyyy HH:mm:ss'),
  size: `${(Math.random() * 2 + 1).toFixed(1)} MB`,
  type: 'PDF'
}));

export default function Reports() {
  const [reports, setReports] = useState(generateInitialReports());

  useEffect(() => {
    const interval = setInterval(() => {
      setReports(current => {
        const nextWeek = current.length + 10;
        return [
          {
            id: `REP-2024-${nextWeek}-${Date.now()}`,
            title: `Live Threat Summary - Event ${nextWeek}`,
            date: format(new Date(), 'MMM dd, yyyy HH:mm:ss'),
            size: `${(Math.random() * 2 + 1).toFixed(1)} MB`,
            type: 'PDF'
          },
          ...current
        ].slice(0, 12);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Automated Reports</h1>
          <p className="text-slate-400 text-sm">Scheduled analytics and compliance reports.</p>
        </div>
        <button className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors">
          <Calendar className="w-4 h-4" />
          Schedule New
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <div key={report.id} className="bg-[#0f111a] rounded-xl p-6 border border-white/5 shadow-lg group hover:border-white/10 transition-colors">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-blue-600/10 rounded-lg text-blue-500 border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <span className="px-2 py-1 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono uppercase tracking-widest rounded">
                {report.type}
              </span>
            </div>
            
            <h3 className="font-semibold text-slate-200 mb-2">{report.title}</h3>
            
            <div className="space-y-2 mb-6">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <Clock className="w-4 h-4 text-slate-600" />
                <span>{report.date}</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <FileText className="w-4 h-4 text-slate-600" />
                <span>{report.size}</span>
              </div>
            </div>

            <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 rounded-lg text-[11px] font-mono uppercase tracking-widest transition-colors">
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
