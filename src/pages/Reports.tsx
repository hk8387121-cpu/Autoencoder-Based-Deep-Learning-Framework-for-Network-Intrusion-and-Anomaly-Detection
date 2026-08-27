import React, { useEffect, useState } from 'react';
import { FileText, Download, RefreshCw, Database, ShieldAlert, Activity } from 'lucide-react';
import { getAlerts, getReportSummary } from '../api';

type Summary = {
  generated_at: string;
  alert_count: number;
  total_predictions: number;
  anomalies_detected: number;
  normal_predictions: number;
  average_reconstruction_error: number;
  max_reconstruction_error: number;
  threshold: number | null;
  severities: Record<string, number>;
  protocols: Record<string, number>;
  model_version: string;
};

const pdfEscape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const createPdf = (lines: string[]) => {
  const content = ['BT', '/F1 10 Tf', '50 780 Td', ...lines.map((line, i) => `${i ? '0 -16 Td ' : ''}(${pdfEscape(line)}) Tj`), 'ET'].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];
  objects.forEach((obj, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
};

export default function Reports() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReportData = async () => {
    try {
      const [nextSummary, nextAlerts] = await Promise.all([getReportSummary(), getAlerts({ limit: 50 })]);
      setSummary(nextSummary);
      setAlerts(nextAlerts.alerts || []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load backend report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
    const interval = setInterval(loadReportData, 10000);
    return () => clearInterval(interval);
  }, []);

  const downloadReport = () => {
    const s = summary;
    const lines = [
      'SENTRY-AI SECURITY REPORT',
      '==========================',
      `Generated: ${s?.generated_at || 'N/A'}`,
      `Model version: ${s?.model_version || 'N/A'}`,
      '',
      'BACKEND INFERENCE SUMMARY',
      `Total inference events: ${s?.total_predictions ?? 0}`,
      `Anomalies detected: ${s?.anomalies_detected ?? 0}`,
      `Normal inference events: ${s?.normal_predictions ?? 0}`,
      `Anomaly rate: ${s && s.total_predictions ? ((s.anomalies_detected / s.total_predictions) * 100).toFixed(2) : '0.00'}%`,
      `Threshold: ${s?.threshold?.toFixed(6) ?? 'N/A'}`,
      `Average anomaly MSE: ${s?.average_reconstruction_error?.toFixed(6) ?? '0'}`,
      `Maximum anomaly MSE: ${s?.max_reconstruction_error?.toFixed(6) ?? '0'}`,
      '',
      'SEVERITY BREAKDOWN',
      ...Object.entries(s?.severities || {}).map(([key, value]) => `${key}: ${value}`),
      '',
      'PROTOCOL BREAKDOWN',
      ...Object.entries(s?.protocols || {}).map(([key, value]) => `${key}: ${value}`),
      '',
      'RECENT DETECTED EVENTS',
      ...alerts.slice(0, 10).map(a => `${a.timestamp} | ${a.sourceIP} -> ${a.destinationIP} | ${a.protocol} | ${a.severity} | MSE ${Number(a.reconstructionError).toFixed(4)}`),
    ];
    const blob = createPdf(lines);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sentry-ai-security-report-${new Date().toISOString().slice(0, 10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Security Report</h1>
        <p className="text-slate-400 text-sm">A report generated from the current backend inference state.</p>
      </div>
      <div className="flex gap-2">
        <button onClick={loadReportData} className="p-2 bg-white/5 border border-white/10 text-slate-300 hover:text-white rounded-lg" aria-label="Refresh report"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
        <button onClick={downloadReport} disabled={loading || !summary} className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/50 text-blue-400 hover:bg-blue-600 hover:text-white px-4 py-2 rounded-lg text-xs font-mono uppercase tracking-widest disabled:opacity-40"><Download className="w-4 h-4" /> Download PDF</button>
      </div>
    </div>

    {error && <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-300">{error}</div>}

    <div className="bg-[#0f111a] border border-white/5 rounded-xl p-4 text-xs font-mono text-slate-400 flex items-center gap-3">
      <Database className="w-4 h-4 text-blue-400" />
      {loading ? 'Loading current backend data...' : `${summary?.total_predictions || 0} inference events • ${summary?.anomalies_detected || 0} anomalies • model ${summary?.model_version || 'N/A'} • generated ${summary?.generated_at || 'N/A'}`}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { label: 'Inference Events', value: summary?.total_predictions ?? 0, icon: Activity },
        { label: 'Anomalies Detected', value: summary?.anomalies_detected ?? 0, icon: ShieldAlert },
        { label: 'Anomaly Rate', value: summary && summary.total_predictions ? `${((summary.anomalies_detected / summary.total_predictions) * 100).toFixed(2)}%` : '0.00%', icon: Activity },
      ].map(card => <div key={card.label} className="bg-[#0f111a] border border-white/5 rounded-xl p-5"><card.icon className="w-5 h-5 text-blue-400 mb-3" /><p className="text-[10px] uppercase tracking-widest text-slate-500">{card.label}</p><p className="text-2xl font-mono text-slate-100 mt-1">{loading ? '-' : card.value}</p></div>)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Model & Error Statistics</h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-500">Threshold</span><span className="font-mono text-slate-200">{summary?.threshold?.toFixed(6) ?? 'N/A'}</span></div>
          <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-500">Average anomaly MSE</span><span className="font-mono text-slate-200">{summary?.average_reconstruction_error?.toFixed(6) ?? '0.000000'}</span></div>
          <div className="flex justify-between border-b border-white/5 pb-2"><span className="text-slate-500">Maximum anomaly MSE</span><span className="font-mono text-slate-200">{summary?.max_reconstruction_error?.toFixed(6) ?? '0.000000'}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Model version</span><span className="font-mono text-slate-200">{summary?.model_version ?? 'N/A'}</span></div>
        </div>
      </div>
      <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-6">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Detection Breakdown</h2>
        <div className="grid grid-cols-2 gap-3">{Object.entries(summary?.severities || {}).map(([key, value]) => <div key={key} className="bg-white/5 rounded-lg p-3"><p className="text-[10px] uppercase text-slate-500">{key}</p><p className="text-xl font-mono text-slate-200">{value}</p></div>)}</div>
      </div>
    </div>

    <div className="bg-[#0a0c14] border border-white/5 rounded-2xl overflow-hidden">
      <div className="p-5 border-b border-white/5"><h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Recent Backend Alerts</h2></div>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="bg-white/5 text-slate-500 uppercase tracking-widest"><tr><th className="px-5 py-3">Time</th><th className="px-5 py-3">Source</th><th className="px-5 py-3">Destination</th><th className="px-5 py-3">Protocol</th><th className="px-5 py-3">MSE</th><th className="px-5 py-3">Severity</th></tr></thead><tbody className="divide-y divide-white/5">{alerts.slice(0, 10).map(a => <tr key={a.id}><td className="px-5 py-3 text-slate-500">{a.timestamp}</td><td className="px-5 py-3 text-blue-400 font-mono">{a.sourceIP}</td><td className="px-5 py-3 text-blue-400 font-mono">{a.destinationIP}</td><td className="px-5 py-3 text-slate-400">{a.protocol}</td><td className="px-5 py-3 text-slate-300 font-mono">{Number(a.reconstructionError).toFixed(4)}</td><td className="px-5 py-3 text-slate-300">{a.severity}</td></tr>)}{!loading && !alerts.length && <tr><td colSpan={6} className="px-5 py-10 text-center text-slate-600">No anomaly events have been recorded by the backend yet.</td></tr>}</tbody></table></div>
    </div>
  </div>;
}
