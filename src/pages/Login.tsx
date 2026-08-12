import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, KeyRound, User as UserIcon, ShieldAlert } from 'lucide-react';
import { cn } from '../utils/cn';
import './Login.css';

export default function Login() {
  const { login, googleLogin } = useAuth();
  const [isActive, setIsActive] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
    } catch (error) {
      console.error('Google login failed:', error);
    }
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    if (!email || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 800);
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaCode) return;
    setIsLoading(true);
    setTimeout(async () => {
      await login(email, mfaCode);
      setIsLoading(false);
    }, 1000);
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setIsActive(false); // Switch back to login after "registering"
    }, 1000);
  };

  return (
    <div className="login-wrapper font-sans">
      <div className={cn("login-container", isActive && "active")}>
        
        {/* Register Form */}
        <div className="form-box register">
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-6 animation" style={{ '--i': 17, '--j': 0 } as React.CSSProperties}>Sign Up</h2>
          
          <form className="w-full max-w-sm flex flex-col items-center" onSubmit={handleRegisterSubmit}>
            <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6 animation" style={{ '--i': 19, '--j': 2 } as React.CSSProperties}>Request System Access</p>

            <div className="relative w-full h-12 mb-5 animation" style={{ '--i': 20, '--j': 3 } as React.CSSProperties}>
              <input type="text" required className="w-full h-full bg-[#0a0c14] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors peer placeholder-transparent" placeholder="Username" />
              <label className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none transition-all peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-blue-400 peer-valid:top-2 peer-valid:text-[10px] peer-valid:text-blue-400 uppercase tracking-widest font-bold">Username</label>
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 peer-focus:text-blue-400 transition-colors" />
            </div>

            <div className="relative w-full h-12 mb-5 animation" style={{ '--i': 21, '--j': 4 } as React.CSSProperties}>
              <input type="email" required className="w-full h-full bg-[#0a0c14] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors peer placeholder-transparent" placeholder="Email" />
              <label className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none transition-all peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-blue-400 peer-valid:top-2 peer-valid:text-[10px] peer-valid:text-blue-400 uppercase tracking-widest font-bold">Email</label>
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 peer-focus:text-blue-400 transition-colors" />
            </div>

            <div className="relative w-full h-12 mb-6 animation" style={{ '--i': 22, '--j': 5 } as React.CSSProperties}>
              <input type="password" required className="w-full h-full bg-[#0a0c14] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors peer placeholder-transparent" placeholder="Password" />
              <label className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none transition-all peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-blue-400 peer-valid:top-2 peer-valid:text-[10px] peer-valid:text-blue-400 uppercase tracking-widest font-bold">Password</label>
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 peer-focus:text-blue-400 transition-colors" />
            </div>

            <button type="submit" disabled={isLoading} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 animation" style={{ '--i': 23, '--j': 6 } as React.CSSProperties}>
              {isLoading ? 'Processing...' : 'Request Access'}
            </button>

            <div className="flex items-center gap-4 w-full mt-5 mb-1 animation" style={{ '--i': 24, '--j': 7 } as React.CSSProperties}>
              <div className="flex-1 h-px bg-white/10"></div>
              <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">or</span>
              <div className="flex-1 h-px bg-white/10"></div>
            </div>

            <button type="button" onClick={handleGoogleLogin} className="w-full h-12 mt-4 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-[11px] font-bold font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 animation" style={{ '--i': 25, '--j': 8 } as React.CSSProperties}>
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>
          </form>
        </div>

        {/* Login Form */}
        <div className="form-box login">
          <h2 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-6 animation" style={{ '--i': 0, '--j': 21 } as React.CSSProperties}>SENTRY-AI</h2>
          
          {step === 1 ? (
            <form className="w-full max-w-sm flex flex-col items-center" onSubmit={handleInitialSubmit}>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6 animation" style={{ '--i': 2, '--j': 23 } as React.CSSProperties}>System Authentication</p>

              <div className="relative w-full h-12 mb-5 animation" style={{ '--i': 3, '--j': 24 } as React.CSSProperties}>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-full bg-[#0a0c14] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors peer placeholder-transparent" placeholder="Email" />
                <label className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none transition-all peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-blue-400 peer-valid:top-2 peer-valid:text-[10px] peer-valid:text-blue-400 uppercase tracking-widest font-bold">Email Address</label>
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 peer-focus:text-blue-400 transition-colors" />
              </div>

              <div className="relative w-full h-12 mb-4 animation" style={{ '--i': 4, '--j': 25 } as React.CSSProperties}>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-full bg-[#0a0c14] border border-white/10 rounded-lg pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors peer placeholder-transparent" placeholder="Password" />
                <label className="absolute left-10 top-1/2 -translate-y-1/2 text-sm text-slate-500 pointer-events-none transition-all peer-focus:top-2 peer-focus:text-[10px] peer-focus:text-blue-400 peer-valid:top-2 peer-valid:text-[10px] peer-valid:text-blue-400 uppercase tracking-widest font-bold">Password</label>
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 peer-focus:text-blue-400 transition-colors" />
              </div>

              <div className="w-full flex justify-end mb-6 animation" style={{ '--i': 5, '--j': 26 } as React.CSSProperties}>
                <a href="#" className="text-[10px] font-mono text-blue-400 hover:text-blue-300 uppercase tracking-widest">Forgot Credentials?</a>
              </div>

              <button type="submit" disabled={isLoading} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 animation" style={{ '--i': 6, '--j': 27 } as React.CSSProperties}>
                {isLoading ? 'Verifying...' : 'Authenticate'}
              </button>

              <div className="flex items-center gap-4 w-full mt-5 mb-1 animation" style={{ '--i': 7, '--j': 28 } as React.CSSProperties}>
                <div className="flex-1 h-px bg-white/10"></div>
                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">or</span>
                <div className="flex-1 h-px bg-white/10"></div>
              </div>

              <button type="button" onClick={handleGoogleLogin} className="w-full h-12 mt-4 bg-white hover:bg-slate-100 text-slate-900 rounded-lg text-[11px] font-bold font-mono uppercase tracking-widest transition-all flex items-center justify-center gap-3 animation" style={{ '--i': 8, '--j': 29 } as React.CSSProperties}>
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </button>


            </form>
          ) : (
            <form className="w-full max-w-sm flex flex-col items-center" onSubmit={handleMfaSubmit}>
              <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(37,99,235,0.2)] animation" style={{ '--i': 2, '--j': 23 } as React.CSSProperties}>
                <KeyRound className="w-6 h-6 text-blue-400" />
              </div>
              <p className="text-xs font-mono text-slate-500 uppercase tracking-widest mb-6 text-center animation" style={{ '--i': 3, '--j': 24 } as React.CSSProperties}>
                MFA Required<br/>Enter 6-digit verification code
              </p>

              <div className="w-full mb-6 animation" style={{ '--i': 4, '--j': 25 } as React.CSSProperties}>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="block w-full text-center tracking-[0.5em] text-2xl py-4 border border-white/10 rounded-lg focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-[#0a0c14] text-white font-mono outline-none transition-colors"
                  placeholder="000000"
                />
              </div>

              <button type="submit" disabled={isLoading || mfaCode.length !== 6} className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[11px] font-bold font-mono uppercase tracking-widest shadow-[0_0_15px_rgba(37,99,235,0.3)] transition-all disabled:opacity-50 animation mb-4" style={{ '--i': 5, '--j': 26 } as React.CSSProperties}>
                {isLoading ? 'Authenticating...' : 'Verify Identity'}
              </button>

              <button type="button" onClick={() => setStep(1)} className="text-[10px] font-mono text-slate-500 hover:text-slate-300 uppercase tracking-widest transition-colors animation" style={{ '--i': 6, '--j': 27 } as React.CSSProperties}>
                Cancel
              </button>
            </form>
          )}
        </div>

        {/* Info & Toggle Panel */}
        <div className="toggle-box">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_#1d4ed8_100%)] opacity-50 pointer-events-none"></div>
          
          <div className="toggle-panel toggle-left">
            <ShieldAlert className="w-16 h-16 text-white mb-6 animation drop-shadow-lg" style={{ '--i': 0, '--j': 21 } as React.CSSProperties} />
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight animation" style={{ '--i': 1, '--j': 22 } as React.CSSProperties}>Return to Terminal</h2>
            <p className="text-sm text-blue-100 mb-8 font-mono leading-relaxed animation" style={{ '--i': 2, '--j': 23 } as React.CSSProperties}>
              Already have system clearance?<br/>Authenticate to resume monitoring.
            </p>
            <button className="px-8 py-3 border-2 border-white rounded-lg text-xs font-bold font-mono uppercase tracking-widest text-white hover:bg-white hover:text-blue-600 transition-colors animation" style={{ '--i': 3, '--j': 24 } as React.CSSProperties} onClick={() => setIsActive(false)}>
              Sign In
            </button>
          </div>

          <div className="toggle-panel toggle-right">
            <Shield className="w-16 h-16 text-white mb-6 animation drop-shadow-lg" style={{ '--i': 17, '--j': 0 } as React.CSSProperties} />
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight animation" style={{ '--i': 18, '--j': 1 } as React.CSSProperties}>New Operative?</h2>
            <p className="text-sm text-blue-100 mb-8 font-mono leading-relaxed animation" style={{ '--i': 19, '--j': 2 } as React.CSSProperties}>
              Request clearance to access the anomaly detection engine and real-time network logs.
            </p>
            <button className="px-8 py-3 border-2 border-white rounded-lg text-xs font-bold font-mono uppercase tracking-widest text-white hover:bg-white hover:text-blue-600 transition-colors animation" style={{ '--i': 20, '--j': 3 } as React.CSSProperties} onClick={() => setIsActive(true)}>
              Sign Up
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
