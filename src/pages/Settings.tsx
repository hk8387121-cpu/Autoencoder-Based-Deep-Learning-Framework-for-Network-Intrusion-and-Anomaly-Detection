import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Shield, Mail, Key, Moon, Users, Check } from 'lucide-react';
import { cn } from '../utils/cn';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [criticalAlertsOnly, setCriticalAlertsOnly] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">Settings</h1>
        <p className="text-slate-400 text-sm">Manage account preferences and system configurations.</p>
      </div>

      <div className="grid gap-6">
        {/* Model Management */}
        <div className="bg-[#0a0c14] border border-white/5 shadow-inner rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-500" />
              Model Management
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Train Autoencoder</p>
                <p className="text-sm text-slate-500">Trigger model training on the NSL-KDD dataset</p>
              </div>
              <button 
                onClick={async () => {
                  try {
                    const { trainModel } = await import('../api');
                    setSaveSuccess(false);
                    // Use a toast or similar in a real app, here we just trigger training and show success later
                    const btn = document.getElementById('train-btn');
                    if (btn) btn.innerText = 'Training...';
                    await trainModel();
                    if (btn) btn.innerText = 'Train Model';
                    handleSave();
                  } catch (err) {
                    console.error(err);
                    const btn = document.getElementById('train-btn');
                    if (btn) btn.innerText = 'Error!';
                  }
                }}
                id="train-btn"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Train Model
              </button>
            </div>
          </div>
        </div>

        {/* Profile & Security */}
        <div className="bg-[#0a0c14] border border-white/5 shadow-inner rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Security & Access
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Role-Based Access</p>
                <p className="text-sm text-slate-500">Your current assigned system role</p>
              </div>
              <span className="px-3 py-1 bg-blue-600/20 border border-blue-500/30 text-blue-400 text-[10px] uppercase font-mono tracking-widest rounded">
                {user?.role}
              </span>
            </div>
            
            <hr className="border-white/5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">Multi-Factor Authentication (MFA)</p>
                <p className="text-sm text-slate-500">Require an extra security code when logging in</p>
              </div>
              <button 
                onClick={() => updateUser({ mfaEnabled: !user?.mfaEnabled })}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors border",
                  user?.mfaEnabled ? 'bg-blue-600 border-blue-500' : 'bg-[#0f111a] border-white/10'
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  user?.mfaEnabled ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-[#0a0c14] border border-white/5 shadow-inner rounded-xl overflow-hidden">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Mail className="w-5 h-5 text-green-500" />
              Email Notifications
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">System Alerts</p>
                <p className="text-sm text-slate-500">Receive email notifications for detected anomalies</p>
              </div>
              <button 
                onClick={() => setEmailAlerts(!emailAlerts)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors border",
                  emailAlerts ? 'bg-blue-600 border-blue-500' : 'bg-[#0f111a] border-white/10'
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  emailAlerts ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between opacity-80">
              <div className="pl-6 border-l-2 border-white/10">
                <p className="font-medium text-slate-200">Critical Only</p>
                <p className="text-sm text-slate-500">Only notify me for High and Critical severity events</p>
              </div>
              <button 
                disabled={!emailAlerts}
                onClick={() => setCriticalAlertsOnly(!criticalAlertsOnly)}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors border",
                  criticalAlertsOnly ? 'bg-green-500 border-green-400' : 'bg-[#0f111a] border-white/10',
                  !emailAlerts && 'opacity-50 cursor-not-allowed'
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  criticalAlertsOnly ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance */}
        <div className="bg-[#0a0c14] border border-white/5 shadow-inner rounded-xl overflow-hidden hidden">
          <div className="p-4 border-b border-white/5 bg-white/5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-300 flex items-center gap-2">
              <Moon className="w-5 h-5 text-indigo-500" />
              Appearance
            </h3>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">Toggle dark mode interface</p>
              </div>
              <button 
                onClick={toggleTheme}
                className={cn(
                  "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                  theme === 'dark' ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                )}
              >
                <span className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                )} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          className="flex items-center gap-2 bg-blue-600/20 border border-blue-500/50 hover:bg-blue-600 hover:text-white text-blue-400 px-6 py-2 rounded-lg text-xs font-mono uppercase tracking-widest transition-colors"
        >
          {saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              Saved
            </>
          ) : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
