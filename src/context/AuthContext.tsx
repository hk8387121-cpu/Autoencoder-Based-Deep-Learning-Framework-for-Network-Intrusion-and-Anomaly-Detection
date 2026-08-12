import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut } from 'firebase/auth';

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
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'User',
          email: firebaseUser.email || '',
          role: firebaseUser.email?.includes('admin') ? 'Admin' : 'Security Analyst',
          mfaEnabled: false,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, mfaCode?: string) => {
    // Mock login logic
    if (email.includes('admin')) {
      setUser({
        id: '1',
        name: 'Admin User',
        email,
        role: 'Admin',
        mfaEnabled: true,
      });
    } else {
      setUser({
        id: '2',
        name: 'Security Analyst',
        email,
        role: 'Security Analyst',
        mfaEnabled: false,
      });
    }
  };

  const googleLogin = async () => {
    try {
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        alert('Sign-in popup was blocked or closed. Please open the app in a new tab to sign in with Google.');
        return;
      }
      console.error('Error signing in with Google', error);
      throw error;
    }
  };

  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#05060a] flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-blue-500 border-t-transparent animate-spin"></div>
    </div>;
  }

  return (
    <AuthContext.Provider value={{ user, login, googleLogin, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
