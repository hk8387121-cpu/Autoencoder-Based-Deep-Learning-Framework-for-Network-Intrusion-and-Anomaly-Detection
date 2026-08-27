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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
          setUser(null);
        }
        setLoading(false);
      });
    } catch (error) {
      console.warn('Firebase Auth unavailable. Falling back to offline mode.', error);
      setLoading(false);
    }
    return unsubscribe;
  }, []);

  const login = async (email: string, mfaCode?: string) => {
    if (email.toLowerCase().includes('admin')) {
      setUser({ id: '1', name: 'Admin User', email, role: 'Admin', mfaEnabled: true });
    } else {
      setUser({ id: '2', name: 'Security Analyst', email, role: 'Security Analyst', mfaEnabled: false });
    }
  };

  const googleLogin = async () => {
    if (!auth || !googleProvider || typeof googleProvider.setCustomParameters !== 'function') {
      throw new Error('Google authentication is not configured. Check Firebase configuration.');
    }

    googleProvider.setCustomParameters({ prompt: 'select_account' });

    // Use redirect instead of a popup. This avoids Chrome popup blocking on
    // GitHub Pages and lets Firebase return to the same deployed application.
    await signInWithRedirect(auth, googleProvider);
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } finally {
      setUser(null);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    setUser(current => current ? { ...current, ...updates } : current);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#05060a] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
      </div>
    );
  }

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
