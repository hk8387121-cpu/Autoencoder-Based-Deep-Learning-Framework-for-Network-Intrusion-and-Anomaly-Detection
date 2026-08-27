import React, { useState } from 'react';
import { Copy, Check, ExternalLink } from 'lucide-react';

const endpoints = [
  { method: 'GET', path: '/health', description: 'Check backend health.' },
  { method: 'GET', path: '/api/v1/model/status', description: 'Get model readiness, threshold, feature count and training state.' },
  { method: 'POST', path: '/api/v1/predict', description: 'Run inference for one feature record.' },
  { method: 'POST', path: '/api/v1/predict/csv', description: 'Run inference for an uploaded CSV file.' },
  { method: 'POST', path: '/api/v1/train', description: 'Train or retrain the autoencoder.' },
];

export default function ApiDocs() {
  const [copied, setCopied] = useState('');
  const base = (import.meta.env.VITE_API_BASE_URL || 'https://ids-autoencoder-backend.onrender.com').replace(/\/$/, '');
  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); setCopied(value); setTimeout(() => setCopied(''), 1500); } catch { /* clipboard unavailable */ }
  };
  return <div className="space-y-6 max-w-5xl">
    <div><h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">API Documentation</h1><p className="text-slate-400 text-sm">Live SENTRY-AI inference and model-management API.</p></div>
    <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-6 flex items-center justify-between gap-4"><div><p className="text-[10px] uppercase tracking-widest text-slate-500">Backend Base URL</p><code className="text-sm text-blue-400 break-all">{base}</code></div><a href={`${base}/docs`} target="_blank" rel="noreferrer" className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-slate-300 hover:text-white">Swagger UI <ExternalLink className="w-4 h-4" /></a></div>
    <div className="space-y-3">{endpoints.map(endpoint => { const value = `${endpoint.method} ${base}${endpoint.path}`; return <div key={endpoint.path} className="bg-[#0f111a] border border-white/5 rounded-xl p-5"><div className="flex items-center gap-3 mb-2"><span className="px-2 py-1 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-mono font-bold">{endpoint.method}</span><code className="text-slate-200 text-sm break-all">{endpoint.path}</code><button onClick={() => copy(value)} className="ml-auto p-2 text-slate-500 hover:text-white" aria-label="Copy endpoint">{copied === value ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}</button></div><p className="text-sm text-slate-500">{endpoint.description}</p></div>; })}</div>
  </div>;
}
