import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, TOKEN_STORAGE_KEY } from '../services/api';
import { useLanguage } from './LanguageContext';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  role: 'patient' | 'doctor' | 'admin';
  preferred_language: 'en' | 'te' | 'hi';
  is_active: number;
  profile?: {
    age?: number;
    gender?: string;
    village_town?: string;
    district?: string;
    blood_group?: string;
    medical_notes?: string;
    emergency_contact?: string;
  } | null;
  doctor?: {
    doctor_id: number;
    qualification: string;
    specialization: string;
    experience_years: number;
    consultation_fee: number;
    operating_cost: number;
    languages_spoken: string;
    bio?: string;
    avatar_url?: string;
    clinic_location?: string;
    is_sample: number;
    verification_status: 'pending' | 'verified' | 'rejected';
  } | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<AuthUser>;
  register: (payload: Record<string, any>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [loading, setLoading] = useState<boolean>(true);
  const { setLanguage } = useLanguage();

  const refreshUser = async () => {
    const activeToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!activeToken) {
      setUser(null);
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setToken(activeToken);
      const storedLang = localStorage.getItem('rhc_language');
      if (!storedLang && res.data.user?.preferred_language) {
        await setLanguage(res.data.user.preferred_language, false);
      }
    } catch {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, password: string): Promise<AuthUser> => {
    const res = await api.post('/auth/login', { identifier: identifier.trim(), password });
    const { token: nextToken, user: nextUser } = res.data;
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    const storedLang = localStorage.getItem('rhc_language');
    if (!storedLang && nextUser?.preferred_language) {
      await setLanguage(nextUser.preferred_language, false);
    }
    return nextUser;
  };

  const register = async (payload: Record<string, any>): Promise<AuthUser> => {
    const res = await api.post('/auth/register', payload);
    const { token: nextToken, user: nextUser } = res.data;
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    setToken(nextToken);
    setUser(nextUser);
    if (nextUser?.preferred_language) {
      await setLanguage(nextUser.preferred_language, false);
    }
    return nextUser;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore network errors on logout
    }
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function getDashboardPathForRole(role?: string): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'doctor') return '/doctor/dashboard';
  return '/patient/dashboard';
}
