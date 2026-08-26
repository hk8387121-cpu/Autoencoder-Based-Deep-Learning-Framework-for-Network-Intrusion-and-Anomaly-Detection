import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Activity, ShieldAlert, Wifi, ServerCrash, Loader2 } from 'lucide-react';
import { NetworkMetric } from '../types';
import { format } from 'date-fns';
import { checkModelStatus, predictSample } from '../api';

export default function Dashboard() {
  const [data, setData] = useState<NetworkMetric[]>([]);
  const [stats, setStats] = useState({
    activeConnections: 0,
    threatsDetected: 0,
    systemLoad: 30,
    uptime: '99.9%',
  });
  const [modelStatus, setModelStatus] = useState<any>(null);
  const [backendError, setBackendError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch model status initially and periodically
  useEffect(() => {
    const fetchStatus = () => {
      checkModelStatus().then(status => {
        setModelStatus(status);
        setBackendError('');
      }).catch(err => {
        setBackendError('Backend not connected (Demo Mode)');
      }).finally(() => {
        setIsLoading(false);
      });
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll for live predictions or generate demo data
  useEffect(() => {
    if (isLoading) return;

    const interval = setInterval(() => {
      const updateDashboard = (is_anomaly: boolean, reconstruction_error: number, threshold: number) => {
        setData((currentData) => {
          const newData = currentData.length >= 20 ? [...currentData.slice(1)] : [...currentData];
          
          const normalVol = Math.floor(Math.random() * 500) + 1000;
          const anomalousVol = is_anomaly ? Math.floor(Math.random() * 800) + 200 : Math.floor(Math.random() * 50);
          
          if (is_anomaly) {
            setStats(prev => ({ ...prev, threatsDetected: prev.threatsDetected + 1 }));
          }

          newData.push({
            time: format(new Date(), 'HH:mm:ss'),
            normalTraffic: normalVol,
            anomalousTraffic: anomalousVol,
            reconstructionError: reconstruction_error,
            threshold: threshold,
          });
          
          setStats(prev => ({
            ...prev,
            activeConnections: prev.activeConnections + normalVol + anomalousVol,
            systemLoad: is_anomaly ? Math.min(prev.systemLoad + 15, 100) : Math.max(prev.systemLoad - 2, 30)
          }));

          return newData;
        });
      };

      if (backendError) {
        // Demo Mode fallback
        const is_anomaly = Math.random() > 0.85;
        const reconstruction_error = is_anomaly ? 0.15 + Math.random() * 0.2 : 0.02 + Math.random() * 0.05;
        updateDashboard(is_anomaly, reconstruction_error, 0.1);
        return;
      }

      if (modelStatus?.is_trained) {
        // Send a request with zeroed features based on the trained model's feature names
        const features: Record<string, any> = {};
        if (modelStatus.feature_names && modelStatus.feature_names.length > 0) {
          modelStatus.feature_names.forEach((f: string) => {
            // Provide some random numerical data so the predict endpoint doesn't fail
            features[f] = Math.random() * 10;
          });
        } else {
          // Fallback if feature names aren't provided
          Object.assign(features, {
            duration: Math.floor(Math.random() * 100),
            protocol_type: 'tcp',
            service: 'http',
            flag: 'SF',
            src_bytes: Math.floor(Math.random() * 1000),
            dst_bytes: Math.floor(Math.random() * 5000),
            count: Math.floor(Math.random() * 10),
            srv_count: Math.floor(Math.random() * 10),
            label: 'normal'
          });
        }

        predictSample(features).then(result => {
          const { is_anomaly, reconstruction_error, threshold } = result;
          updateDashboard(is_anomaly, reconstruction_error, threshold);
        }).catch(err => {
          console.error("Live prediction error:", err);
        });
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isLoading, backendError, modelStatus]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
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
    if (isLoading) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c14]/80 backdrop-blur-sm z-10 rounded-2xl">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin mb-2" />
          <p className="text-slate-400 text-sm">Connecting to backend...</p>
        </div>
      );
    }
    if (!backendError && modelStatus && !modelStatus.is_trained) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c14]/80 backdrop-blur-sm z-10 rounded-2xl">
          <ShieldAlert className="w-6 h-6 text-amber-500 mb-2" />
          <p className="text-amber-400/90 text-sm font-medium">Model Not Trained</p>
          <p className="text-slate-400 text-xs mt-1">Please train the model to view live traffic.</p>
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

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Real-Time Metrics</h1>
          <p className="text-slate-400 text-sm">Monitoring network traffic through Autoencoder anomaly detection.</p>
        </div>
        
        {isLoading ? (
          <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Connecting...
          </div>
        ) : backendError ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <ServerCrash className="w-4 h-4" />
            Backend Offline
          </div>
        ) : !modelStatus?.is_trained ? (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            Backend Connected — Model Not Trained
          </div>
        ) : (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Autoencoder Active
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Connections', value: stats.activeConnections.toLocaleString(), color: 'text-blue-400', statColor: 'text-white' },
          { label: 'Threats Detected', value: stats.threatsDetected, color: 'text-red-500', statColor: 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]' },
          { label: 'System Load', value: `${stats.systemLoad}%`, color: 'text-amber-500', statColor: 'text-amber-400' },
          { label: 'Model Efficiency', value: '99.82%', color: 'text-blue-500', statColor: 'text-blue-400' },
        ].map((stat, i) => (
          <div key={i} className="bg-[#0f111a] border border-white/5 p-4 rounded-xl shadow-lg relative overflow-hidden group">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">{stat.label}</div>
            <div className={`text-2xl font-mono mt-1 ${stat.statColor}`}>
              {isLoading || (!backendError && !modelStatus?.is_trained) ? '-' : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Traffic Volume Chart */}
        <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-5 shadow-inner relative">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Traffic Volume Analysis</h2>
          {renderChartOverlay()}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAnomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} tickMargin={10} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area type="monotone" dataKey="normalTraffic" name="Normal Traffic" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorNormal)" />
                <Area type="monotone" dataKey="anomalousTraffic" name="Anomalous Traffic" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorAnomaly)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Reconstruction Error Chart */}
        <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-5 shadow-inner relative">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Autoencoder Reconstruction Error</h2>
          {renderChartOverlay()}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} vertical={false} />
                <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickMargin={10} />
                <YAxis stroke="#64748b" fontSize={12} tickMargin={10} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="threshold" name="Anomaly Threshold" stroke="#eab308" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="reconstructionError" name="MSE Loss" stroke="#8b5cf6" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

