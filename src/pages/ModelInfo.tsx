import React, { useState, useEffect } from 'react';
import { checkModelStatus, trainModel } from '../api';
import { Database, Activity, Server, Settings, Zap } from 'lucide-react';

export default function ModelInfo() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [training, setTraining] = useState(false);
  const [trainResult, setTrainResult] = useState<any>(null);
  const [error, setError] = useState('');

  const fetchStatus = async () => {
    try {
      const data = await checkModelStatus();
      setStatus(data);
      setError('');
    } catch (err: any) {
      setError('Could not connect to the ML Backend. Please make sure the Python server is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTrain = async () => {
    setTraining(true);
    setError('');
    setTrainResult(null);
    try {
      const result = await trainModel();
      setTrainResult(result);
      await fetchStatus();
    } catch (err: any) {
      setError('Failed to train model. Check backend logs.');
    } finally {
      setTraining(false);
    }
  };

  if (loading) return <div className="text-white p-6">Loading model information...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Model Configuration</h1>
        <p className="text-slate-400 text-sm">Deep Learning Autoencoder for Network Intrusion Detection.</p>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-6 shadow-inner space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
              <Database size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Current Status</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Model Type:</span>
              <span className="text-slate-200 font-mono">Autoencoder</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Status:</span>
              {status?.is_trained ? (
                <span className="text-green-400 flex items-center gap-2"><Zap size={14}/> Trained & Active</span>
              ) : (
                <span className="text-amber-400">Not Trained</span>
              )}
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Anomaly Threshold:</span>
              <span className="text-slate-200 font-mono">
                {status?.threshold ? status.threshold.toFixed(6) : 'N/A'}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Input Features:</span>
              <span className="text-slate-200 font-mono">{status?.features || 0}</span>
            </div>
          </div>

          <div className="pt-4">
            <button
              onClick={handleTrain}
              disabled={training}
              className={`w-full py-3 rounded-lg font-medium transition-all ${
                training 
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
              }`}
            >
              {training ? 'Training Model on Dataset...' : status?.is_trained ? 'Retrain Model' : 'Train Model Now'}
            </button>
          </div>
        </div>

        <div className="bg-[#0a0c14] border border-white/5 rounded-2xl p-6 shadow-inner space-y-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
              <Activity size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-200">Architecture Details</h2>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Loss Function:</span>
              <span className="text-slate-200 font-mono">Mean Squared Error (MSE)</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Optimizer:</span>
              <span className="text-slate-200 font-mono">Adam</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Layers:</span>
              <span className="text-slate-200 font-mono">Input → Dense → Bottleneck → Dense → Output</span>
            </div>
            <div className="flex justify-between border-b border-white/5 pb-2">
              <span className="text-slate-400">Dataset:</span>
              <span className="text-slate-200 font-mono">NSL-KDD (Normal traffic)</span>
            </div>
          </div>
          
          {trainResult && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-sm">
              <p className="text-green-400 font-bold mb-2">Training Successful!</p>
              <p className="text-slate-300">Samples Processed: <span className="font-mono">{trainResult.training_samples}</span></p>
              <p className="text-slate-300">Final Threshold: <span className="font-mono">{trainResult.threshold.toFixed(6)}</span></p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
