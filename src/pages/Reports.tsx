import React, { useEffect, useState } from 'react';
import { FileText, Download, Calendar, Clock, X, Check, Loader2, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { getAlerts, getReportSummary } from '../api';

type Report = { id: string; title: string; date: string; size: string; type: string };
type Summary = { generated_at: string; alert_count: number; total_predictions: number; anomalies_detected: number; normal_predictions: number; average_reconstruction_error: number; max_reconstruction_error: number; threshold: number | null; severities: Record<string, number>; protocols: Record<string, number>; model_version: string };

const pdfEscape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const createPdf = (lines: string[]) => {
  const content = ['BT', '/F1 11 Tf', '50 780 Td', ...lines.map((line, i) => `${i ? '0 -18 Td ' : ''}(${pdfEscape(line)}) Tj`), 'ET'].join('\n');
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',`<< /Length ${content.length} >>\nstream\n${content}\nendstream`,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];
  let pdf = '%PDF-1.4\n'; const offsets: number[] = [0];
  objects.forEach((obj, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`; for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`; pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

const downloadReport = (report: Report, summary: Summary | null, alerts: any[]) => {
  const lines = ['SENTRY-AI SECURITY REPORT','==========================',`Report: ${report.title}`,`Report ID: ${report.id}`,`Generated: ${summary?.generated_at || report.date}`,'','LIVE BACKEND DETECTION SUMMARY',`Total inference events: ${summary?.total_predictions ?? 0}`,`Anomalies detected: ${summary?.anomalies_detected ?? 0}`,`Normal inference events: ${summary?.normal_predictions ?? 0}`,`Model threshold: ${summary?.threshold?.toFixed(6) ?? 'N/A'}`,`Average anomaly MSE: ${summary?.average_reconstruction_error?.toFixed(6) ?? '0'}`,`Maximum anomaly MSE: ${summary?.max_reconstruction_error?.toFixed(6) ?? '0'}`,`Model version: ${summary?.model_version || 'N/A'}`,'','SEVERITY BREAKDOWN',...Object.entries(summary?.severities || {}).map(([key,value]) => `${key}: ${value}`),'','PROTOCOL BREAKDOWN',...Object.entries(summary?.protocols || {}).map(([key,value]) => `${key}: ${value}`),'','RECENT DETECTED EVENTS',...alerts.slice(0,10).map(a => `${a.timestamp} | ${a.sourceIP} -> ${a.destinationIP} | ${a.protocol} | ${a.severity} | MSE ${Number(a.reconstructionError).toFixed(4)}`)];
  const blob = createPdf(lines); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${report.id}-security-report.pdf`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

export default function Reports() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [schedule, setSchedule] = useState('weekly');
  const [scheduleTime, setScheduleTime] = useState('09:00');
  const [scheduleSaved, setScheduleSaved] = useState(false);

  const reports: Report[] = Array.from({ length: 6 }).map((_, i) => ({ id: `REP-LIVE-${i + 1}`, title: `Threat Detection Report - ${i === 0 ? 'Current' : `Period ${i}`}`, date: summary?.generated_at || format(new Date(), 'MMM dd, yyyy HH:mm:ss'), size: `${Math.max(1, 0.8 + (summary?.alert_count || 0) * 0.01).toFixed(1)} MB`, type: 'PDF' }));

  const loadReportData = async () => {
    try { const [nextSummary, nextAlerts] = await Promise.all([getReportSummary(), getAlerts({ limit: 50 })]); setSummary(nextSummary); setAlerts(nextAlerts.alerts || []); }
    catch (err) { console.error('Report data load failed:', err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadReportData(); const interval = setInterval(loadReportData, 10000);
    try { const saved = JSON.parse(localStorage.getItem('sentry-report-schedule') || 'null'); if (saved) { setSchedule(saved.schedule || 'weekly'); setScheduleTime(saved.scheduleTime || '09:00'); } } catch { /* ignore invalid local settings */ }
    return () => clearInterval(interval);
  }, []);

  const saveSchedule = (e: React.FormEvent) => { e.preventDefault(); localStorage.setItem('sentry-report-schedule', JSON.stringify({ schedule, scheduleTime, savedAt: new Date().toISOString() })); setScheduleSaved(true); setTimeout(() => { setScheduleSaved(false); setShowSchedule(false); }, 1000); };

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"><div><h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Automated Reports</h1><p className="text-slate-400 text-sm">Reports generated from live backend anomaly detections.</p></div><div className="flex gap-2"><button onClick={loadReportData} className="p-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-lg" aria-label="Refresh reports"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button><button onClick={() => setShowSchedule(true)} className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors"><Calendar className="w-4 h-4" /> Schedule New</button></div></div>
    {showSchedule && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setShowSchedule(false); }}><form onSubmit={saveSchedule} className="w-full max-w-md bg-[#0f111a] border border-white/10 rounded-2xl p-6 shadow-2xl"><div className="flex justify-between items-center mb-6"><h2 className="text-lg font-semibold text-slate-200">Schedule Report</h2><button type="button" onClick={() => setShowSchedule(false)} className="p-2 text-slate-500 hover:text-white" aria-label="Close schedule"><X className="w-5 h-5" /></button></div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-2">Frequency<select value={schedule} onChange={e => setSchedule(e.target.value)} className="mt-2 w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-6">Time<input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="mt-2 w-full bg-[#0a0c14] border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200" /></label><button type="submit" className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg text-sm">{scheduleSaved ? <><Check className="w-4 h-4" /> Saved</> : 'Save Schedule'}</button><p className="text-[10px] text-slate-500 mt-3 text-center">Schedule is saved for this browser. Downloads always use the latest backend data.</p></form></div>}
    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-4 text-xs font-mono text-slate-400">{loading ? 'Loading live report data...' : `${summary?.alert_count || 0} anomalies from ${summary?.total_predictions || 0} backend inference events • Model ${summary?.model_version || 'N/A'}`}</div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{reports.map(report => <div key={report.id} className="bg-[#0f111a] rounded-xl p-6 border border-white/5 shadow-lg group hover:border-white/10 transition-colors"><div className="flex items-start justify-between mb-4"><div className="p-3 bg-blue-600/10 rounded-lg text-blue-500 border border-blue-500/20"><FileText className="w-5 h-5" /></div><span className="px-2 py-1 bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono uppercase tracking-widest rounded">{report.type}</span></div><h3 className="font-semibold text-slate-200 mb-2">{report.title}</h3><div className="space-y-2 mb-6"><div className="flex items-center gap-2 text-xs font-mono text-slate-500"><Clock className="w-4 h-4 text-slate-600" /><span>{report.date}</span></div><div className="flex items-center gap-2 text-xs font-mono text-slate-500"><FileText className="w-4 h-4 text-slate-600" /><span>{report.size}</span></div></div><button onClick={() => downloadReport(report, summary, alerts)} disabled={loading} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 rounded-lg text-[11px] font-mono uppercase tracking-widest transition-colors disabled:opacity-40"><Download className="w-4 h-4" /> Download</button></div>)}</div>
  </div>;
}
