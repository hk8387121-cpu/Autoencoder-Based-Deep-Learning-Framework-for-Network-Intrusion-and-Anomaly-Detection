import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithRedirect, onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  login: (email: string, mfaCode?: string) => Promise<void>;
  googleLogin: () => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// The dashboard is a client-side monitoring/demo application. Keep it usable
// even when Firebase is unavailable or not configured for the GitHub Pages
// origin. Firebase/Google sign-in remains available when configured.
const DEMO_USER: User = {
  id: 'demo-user',
  name: 'Security Analyst',
  email: 'analyst@local.demo',
  role: 'Security Analyst',
  mfaEnabled: false,
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEMO_USER);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'User',
            email: firebaseUser.email || '',
            role: firebaseUser.email?.toLowerCase().includes('admin') ? 'Admin' : 'Security Analyst',
            mfaEnabled: false,
          });
        } else {
          // Do not block the public GitHub Pages dashboard when Firebase has
          // no authenticated session. Keep the local demo session active.
          setUser(current => current || DEMO_USER);
        }
        setLoading(false);
      });
    } catch (error) {
      console.warn('Firebase Auth unavailable. Continuing in local demo mode.', error);
      setUser(DEMO_USER);
      setLoading(false);
    }
    return unsubscribe;
  }, []);

  const login = async (email: string, mfaCode?: string) => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail) throw new Error('Email address is required.');

    if (normalizedEmail.toLowerCase().includes('admin')) {
      setUser({ id: '1', name: 'Admin User', email: normalizedEmail, role: 'Admin', mfaEnabled: true });
    } else {
      setUser({ id: '2', name: 'Security Analyst', email: normalizedEmail, role: 'Security Analyst', mfaEnabled: false });
    }
  };

  const googleLogin = async () => {
    if (!auth || !googleProvider || typeof googleProvider.setCustomParameters !== 'function') {
      throw new Error('Google authentication is not configured. The dashboard can still be used in demo mode.');
    }

    googleProvider.setCustomParameters({ prompt: 'select_account' });

    // Redirect avoids popup blocking on GitHub Pages. If Firebase is not
    // authorized for this origin, the application remains usable in demo mode.
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      setUser(DEMO_USER);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.warn('Firebase sign-out unavailable; continuing locally.', error);
    } finally {
      // Keep the public dashboard accessible after logout.
      setUser(DEMO_USER);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(current => current ? { ...current, ...updates } : { ...DEMO_USER, ...updates });
  };

  return (
    <AuthContext.Provider value={{ user, login, googleLogin, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
