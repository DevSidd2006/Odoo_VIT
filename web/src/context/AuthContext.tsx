import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { AuthSession, User } from '../types';
import { UserRepo } from '../repositories/UserRepo';

interface AuthContextType {
  session: AuthSession | null;
  user: User | null;
  isLoading: boolean;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
}

const AUTH_KEY = '@reimburse_session';

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
  login: async () => false,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const raw = window.localStorage.getItem(AUTH_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as AuthSession;
          const normalizedRole = String(parsed.role || '').toLowerCase();
          const role = (normalizedRole === 'admin' || normalizedRole === 'manager' || normalizedRole === 'employee')
            ? normalizedRole
            : null;

          if (!role) {
            window.localStorage.removeItem(AUTH_KEY);
          } else {
            setSession({
              ...parsed,
              role,
            });
          }
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
    window.localStorage.setItem(AUTH_KEY, JSON.stringify(newSession));
    setSession(newSession);
  };

  const signOut = async () => {
    window.localStorage.removeItem(AUTH_KEY);
    setSession(null);
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const userRecord = await UserRepo.findByEmail(email.trim().toLowerCase());
    if (!userRecord || userRecord.password !== password) {
      return false;
    }

    await signIn({
      user_id: userRecord.id,
      company_id: userRecord.company_id,
      role: userRecord.role,
      name: userRecord.name,
      email: userRecord.email,
    });

    return true;
  };

  const user: User | null = session
    ? {
        id: session.user_id,
        company_id: session.company_id,
        name: session.name,
        email: session.email,
        role: session.role,
      }
    : null;

  return (
    <AuthContext.Provider value={{ session, user, isLoading, signIn, signOut, login, logout: signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
