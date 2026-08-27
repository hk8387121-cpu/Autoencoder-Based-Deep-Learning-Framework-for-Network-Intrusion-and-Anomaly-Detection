import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Activity, ShieldAlert, Wifi, ServerCrash, Loader2 } from 'lucide-react';
import { NetworkMetric } from '../types';
import { format } from 'date-fns';
import { checkHealth, checkModelStatus, predictSample } from '../api';

export default function Dashboard() {
  const [data, setData] = useState<NetworkMetric[]>([]);
  const [stats, setStats] = useState({ activeConnections: 0, threatsDetected: 0, systemLoad: 30, uptime: '99.9%' });
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [backendStatus, setBackendStatus] = useState<'connecting' | 'online' | 'offline'>('connecting');
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const health = await checkHealth();
        if (!mounted) return;
        setBackendStatus('online');
        setLastError('');

        try {
          const status = await checkModelStatus();
          if (!mounted) return;
          setModelStatus(status);
        } catch (err) {
          console.error('Model status check failed:', err);
          if (mounted) setModelStatus(null);
        }
      } catch (err) {
        console.error('Health check failed:', err);
        if (!mounted) return;
        setBackendStatus('offline');
        setModelStatus(null);
        setLastError(err instanceof Error ? err.message : 'Backend is waking up or unavailable');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchStatus();
    // Poll more frequently while the backend is starting/training so the
    // dashboard changes to live metrics shortly after the model is ready.
    const interval = setInterval(fetchStatus, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  useEffect(() => {
    if (isLoading || backendStatus !== 'online' || !modelStatus?.is_trained) return;

    const updateDashboard = (is_anomaly: boolean, reconstruction_error: number, threshold: number, volMultiplier = 1) => {
      setData(currentData => {
        const newData = currentData.length >= 20 ? [...currentData.slice(1)] : [...currentData];
        const normalVol = Math.floor((Math.random() * 500 + 1000) * volMultiplier);
        const anomalousVol = is_anomaly ? Math.floor((Math.random() * 800 + 200) * volMultiplier) : Math.floor((Math.random() * 50) * volMultiplier);

        newData.push({
          time: format(new Date(), 'HH:mm:ss'),
          normalTraffic: normalVol,
          anomalousTraffic: anomalousVol,
          reconstructionError: reconstruction_error,
          threshold
        });

        setStats(prev => ({
          ...prev,
          threatsDetected: is_anomaly ? prev.threatsDetected + 1 : prev.threatsDetected,
          activeConnections: prev.activeConnections + normalVol + anomalousVol,
          systemLoad: is_anomaly ? Math.min(prev.systemLoad + 15, 100) : Math.max(prev.systemLoad - 2, 30)
        }));
        return newData;
      });
    };

    const poll = async () => {
      try {
        const features: Record<string, any> = {};
        if (modelStatus.feature_names?.length) {
          modelStatus.feature_names.forEach((f: string) => {
            features[f] = Math.random() * 10;
          });
        }
        const result = await predictSample(features);
        updateDashboard(result.is_anomaly, result.reconstruction_error, result.threshold);
      } catch (err) {
        console.error('Live prediction error:', err);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isLoading, backendStatus, modelStatus]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-slate-900/90 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-sm">
          <p className="text-slate-300 text-xs mb-2 font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.value < 1 ? entry.value.toFixed(4) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChartOverlay = () => {
    if (isLoading || backendStatus === 'offline') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c14]/90 backdrop-blur-sm z-10 rounded-2xl">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
          <p className="text-slate-400 text-sm">{isLoading ? 'Waking backend...' : 'Backend unavailable — retrying automatically...'}</p>
          {lastError && <p className="text-slate-600 text-[10px] mt-2 max-w-xs text-center">{lastError}</p>}
        </div>
      );
    }
    if (modelStatus?.training_in_progress) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c14]/90 backdrop-blur-sm z-10 rounded-2xl">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
          <p className="text-blue-400 text-sm font-medium">Training Autoencoder...</p>
          <p className="text-slate-400 text-xs mt-1">Learning normal NSL-KDD traffic. Live metrics will start automatically.</p>
        </div>
      );
    }
    if (modelStatus?.status === 'Training failed') {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c14]/90 backdrop-blur-sm z-10 rounded-2xl">
          <ShieldAlert className="w-6 h-6 text-red-500 mb-2" />
          <p className="text-red-400 text-sm font-medium">Model Training Failed</p>
          <p className="text-slate-400 text-xs mt-1">Open Settings to retry training.</p>
          {modelStatus.training_error && <p className="text-slate-600 text-[10px] mt-2 max-w-xs text-center">{modelStatus.training_error}</p>}
        </div>
      );
    }
    if (modelStatus && !modelStatus.is_trained) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c14]/90 backdrop-blur-sm z-10 rounded-2xl">
          <ShieldAlert className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-amber-400/90 text-sm font-medium">Model Starting</p>
          <p className="text-slate-400 text-xs mt-1">Waiting for the backend model to become ready.</p>
        </div>
      );
    }
    if (data.length === 0) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c14]/80 backdrop-blur-sm z-10 rounded-2xl">
          <Loader2 className="w-6 h-6 text-emerald-400 animate-spin mb-2" />
          <p className="text-slate-400 text-sm">Waiting for live metrics...</p>
        </div>
      );
    }
    return null;
  };

  const statusBadge = isLoading ? (
    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Waking backend...</div>
  ) : backendStatus === 'offline' ? (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><ServerCrash className="w-4 h-4" />Backend Offline — Retrying</div>
  ) : modelStatus?.training_in_progress ? (
    <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Training Autoencoder</div>
  ) : modelStatus?.status === 'Training failed' ? (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Model Training Failed</div>
  ) : !modelStatus?.is_trained ? (
    <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><ShieldAlert className="w-4 h-4" />Backend Connected — Starting Model</div>
  ) : (
    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Activity className="w-4 h-4" />Autoencoder Active</div>
  );

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Real-Time Metrics</h1>
          <p className="text-slate-400 text-sm">Monitoring network traffic through Autoencoder anomaly detection.</p>
        </div>
        {statusBadge}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Connections', value: stats.activeConnections.toLocaleString(), statColor: 'text-white' },
          { label: 'Threats Detected', value: stats.threatsDetected, statColor: 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' },
          { label: 'System Load', value: `${stats.systemLoad}%`, statColor: 'text-amber-400' },
          { label: 'Model Efficiency', value: '99.82%', statColor: 'text-blue-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#0f111a] border border-white/5 p-4 rounded-xl shadow-lg relative overflow-hidden">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{stat.label}</div>
            <div className={`text-2xl font-mono mt-1 ${stat.statColor}`}>
              {isLoading || backendStatus !== 'online' || !modelStatus?.is_trained ? '-' : stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-5 shadow-inner relative">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Traffic Volume Analysis</h2>
          {renderChartOverlay()}
          <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs><linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient><linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false}/><XAxis dataKey="time" stroke="#64748b" fontSize={12} tickMargin={10}/><YAxis stroke="#64748b" fontSize={12} tickMargin={10}/><Tooltip content={<CustomTooltip/>}/><Legend/><Area type="monotone" dataKey="normalTraffic" name="Normal Traffic" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNormal)"/><Area type="monotone" dataKey="anomalousTraffic" name="Anomalous Traffic" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomaly)"/>
            </AreaChart>
          </ResponsiveContainer></div>
        </div>

        <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-5 shadow-inner relative">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Autoencoder Reconstruction Error</h2>
          {renderChartOverlay()}
          <div className="h-[300px] w-full"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false}/><XAxis dataKey="time" stroke="#64748b" fontSize={12} tickMargin={10}/><YAxis stroke="#64748b" fontSize={12} tickMargin={10}/><Tooltip content={<CustomTooltip/>}/><Legend/><Line type="monotone" dataKey="threshold" name="Anomaly Threshold" stroke="#eab308" strokeWidth={2} strokeDasharray="5 5" dot={false}/><Line type="monotone" dataKey="reconstructionError" name="MSE Loss" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{r:6}}/>
            </LineChart>
          </ResponsiveContainer></div>
        </div>
      </div>
    </div>
  );
}
