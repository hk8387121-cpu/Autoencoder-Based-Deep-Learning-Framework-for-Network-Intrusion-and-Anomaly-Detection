import React from 'react';
import { Book, Code, Terminal } from 'lucide-react';

export default function ApiDocs() {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">API Documentation</h1>
        <p className="text-slate-400 text-sm">Integrate the intrusion detection engine with your existing security tools.</p>
      </div>

      <div className="bg-[#0a0c14] border border-white/5 shadow-inner rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-300">Authentication</h2>
          <p className="text-slate-500 mt-2 text-sm">
            All API requests must include an API key in the headers. Generate your key in Settings.
          </p>
          <div className="mt-4 bg-[#0f111a] p-4 rounded-lg border border-white/10 font-mono text-xs text-blue-400 shadow-inner">
            Authorization: Bearer YOUR_API_KEY
          </div>
        </div>

        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2 py-1 bg-green-500/10 text-green-400 font-bold font-mono tracking-wider rounded text-[10px]">GET</span>
            <h3 className="text-sm font-bold text-slate-200 font-mono">/api/v1/alerts</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Retrieve a paginated list of recent network anomaly alerts.
          </p>
          
          <h4 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Parameters</h4>
          <table className="w-full text-left text-sm text-slate-400 mb-6 border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[10px] uppercase font-bold tracking-widest">
                <th className="py-2 px-1">Name</th>
                <th className="py-2 px-1">Type</th>
                <th className="py-2 px-1">Description</th>
              </tr>
            </thead>
            <tbody className="font-mono text-[11px]">
              <tr className="border-b border-white/5">
                <td className="py-3 px-1 text-blue-400">severity</td>
                <td className="py-3 px-1">string</td>
                <td className="py-3 px-1 text-slate-500">Filter by severity (e.g., 'Critical', 'High')</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-3 px-1 text-blue-400">limit</td>
                <td className="py-3 px-1">integer</td>
                <td className="py-3 px-1 text-slate-500">Number of results to return (default 50)</td>
              </tr>
            </tbody>
          </table>

          <h4 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Response Example</h4>
          <pre className="bg-[#0f111a] p-4 rounded-lg border border-white/10 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner">
{`{
  "status": "success",
  "data": [
    {
      "id": "ALT-1023",
      "timestamp": "2024-03-20T10:30:00Z",
      "sourceIP": "192.168.1.45",
      "reconstructionError": 0.1245,
      "severity": "High"
    }
  ]
}`}
          </pre>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold font-mono tracking-wider rounded text-[10px]">POST</span>
            <h3 className="text-sm font-bold text-slate-200 font-mono">/api/v1/predict</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Send raw packet features to the Autoencoder model for real-time anomaly prediction.
          </p>

          <h4 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Request Body</h4>
          <pre className="bg-[#0f111a] p-4 rounded-lg border border-white/10 font-mono text-[11px] text-slate-300 overflow-x-auto mb-6 shadow-inner">
{`{
  "features": [0.24, 0.0, 1.0, 0.45, 0.88, ...],
  "protocol_type": "tcp",
  "service": "http"
}`}
          </pre>

          <h4 className="font-mono text-xs text-slate-500 uppercase tracking-widest mb-2">Response Example</h4>
          <pre className="bg-[#0f111a] p-4 rounded-lg border border-white/10 font-mono text-[11px] text-slate-300 overflow-x-auto shadow-inner">
{`{
  "is_anomaly": true,
  "mse_loss": 0.0892,
  "threshold": 0.0500,
  "confidence_score": 0.94
}`}
          </pre>
        </div>
      </div>
    </div>
  );
}
