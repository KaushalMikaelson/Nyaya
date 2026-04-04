"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api, { setAccessToken } from '../lib/api';

// ─────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────

export type UserRole = 'CITIZEN' | 'LAWYER' | 'JUDGE' | 'ADMIN';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isPro: boolean;
  isEmailVerified: boolean;
  verificationStatus?: VerificationStatus;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  logoutAll: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isRole: (...roles: UserRole[]) => boolean;
  isVerified: () => boolean;
}

// ─────────────────────────────────────────
// PUBLIC ROUTES (no redirect)
// ─────────────────────────────────────────

const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/auth/admin/register',
  '/auth/judge/register',
  '/auth/lawyer/register',
];

// ─────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─────────────────────────────────────────
// DECODE JWT PAYLOAD
// ─────────────────────────────────────────

function decodeJwt(token: string): AuthUser | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return {
      id: payload.userId,
      email: payload.email || '',
      role: payload.role || 'CITIZEN',
      isPro: payload.isPro || false,
      isEmailVerified: payload.isEmailVerified || false,
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────
// PROVIDER
// ─────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const isPublicRoute = PUBLIC_ROUTES.some(r => pathname?.startsWith(r));

  // ── Auto-login via refresh token cookie ──
  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        const decoded = decodeJwt(data.accessToken);
        if (decoded) setUser(decoded);
      } catch {
        setUser(null);
        if (!isPublicRoute) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh full user profile from /me ──
  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      const u = data.user;
      // Merge profile data with current user state
      setUser(prev => prev ? {
        ...prev,
        verificationStatus: u.lawyerProfile?.verificationStatus
          || u.judgeProfile?.verificationStatus
          || u.citizenProfile?.verificationStatus,
      } : prev);
    } catch {
      // Silent
    }
  }, []);

  const login = useCallback((token: string, userData: AuthUser) => {
    setAccessToken(token);
    setUser(userData);
    // Role-based redirect
    if (userData.role === 'ADMIN') {
      router.push('/admin');
    } else if (userData.role === 'JUDGE') {
      router.push('/');
    } else {
      router.push('/');
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // ignore
    } finally {
      setAccessToken('');
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const logoutAll = useCallback(async () => {
    try {
      await api.post('/auth/logout-all');
    } catch {
      // ignore
    } finally {
      setAccessToken('');
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const isRole = useCallback((...roles: UserRole[]) => {
    return user ? roles.includes(user.role) : false;
  }, [user]);

  const isVerified = useCallback(() => {
    if (!user) return false;
    if (user.role === 'CITIZEN') return user.isEmailVerified;
    return user.verificationStatus === 'VERIFIED';
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, logoutAll, refreshUser, isRole, isVerified }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─────────────────────────────────────────
// HOOK
// ─────────────────────────────────────────

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
