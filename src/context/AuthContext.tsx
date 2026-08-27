import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signInWithRedirect, onAuthStateChanged, signOut } from 'firebase/auth';

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
    try {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
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
      return () => unsubscribe();
    } catch (error) {
      console.warn('Firebase Auth unavailable. Falling back to offline mode.', error);
      setLoading(false);
      return () => {};
    }
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

    try {
      // Popup is convenient when the browser permits it.
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      const code = error?.code || '';
      // GitHub Pages/browser privacy settings can block Firebase's popup.
      // Redirect uses the same Google provider without opening a popup.
      if (
        code === 'auth/popup-blocked' ||
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request'
      ) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          console.error('Google redirect sign-in failed:', redirectError);
          throw new Error(redirectError?.message || 'Google sign-in could not be started.');
        }
      }

      console.error('Google sign-in failed:', error);
      throw new Error(error?.message || 'Google sign-in could not be completed.');
    }
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
