import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthSession } from '../types';

interface AuthContextType {
  session: AuthSession | null;
  isLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
}

const AUTH_KEY = '@reimburse_session';

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = await AsyncStorage.getItem(AUTH_KEY);
        if (raw) {
          setSession(JSON.parse(raw));
        }
      } catch (e) {
        console.error('[Auth] Failed to restore session', e);
      } finally {
        setIsLoading(false);
      }
    };
    restoreSession();
  }, []);

  const signIn = async (newSession: AuthSession) => {
    await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(newSession));
    setSession(newSession);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_KEY);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
