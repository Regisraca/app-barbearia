import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { storage } from '@/src/utils/storage';

const API_URL = `${process.env.EXPO_PUBLIC_BACKEND_URL}/api`;

interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    loadStoredAuth();
  }, []);

  useEffect(() => {
    if (loading) return;

    const firstSegment = segments[0];
    // "In auth flow" means: welcome/root screen, login screen, or register screen.
    // These are the ONLY places a logged-in user should be redirected AWAY from.
    const inAuthFlow =
      !firstSegment || firstSegment === 'login' || firstSegment === 'register';

    if (!user && !inAuthFlow) {
      // Not logged in and trying to access a protected route -> go to login
      router.replace('/login');
    } else if (user && inAuthFlow) {
      // Logged in but sitting on welcome/login/register -> route to role home once
      if (user.role === 'admin') {
        router.replace('/(admin)/dashboard');
      } else if (user.role === 'barber') {
        router.replace('/(barber)/schedule');
      } else {
        router.replace('/(client)/home');
      }
    }
    // Otherwise: logged-in user is inside their role area (or /booking) — let them navigate freely.
  }, [user, loading, segments]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await storage.secureGet('auth_token', null);
      const storedUser = await storage.getItem('user', null);

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Falha ao fazer login');
      }

      const data = await response.json();
      await storage.secureSet('auth_token', data.access_token);
      await storage.setItem('user', data.user);
      setToken(data.access_token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, phone?: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name, phone, role: 'client' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Falha ao criar conta');
      }

      const data = await response.json();
      await storage.secureSet('auth_token', data.access_token);
      await storage.setItem('user', data.user);
      setToken(data.access_token);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    await storage.secureRemove('auth_token');
    await storage.removeItem('user');
    setToken(null);
    setUser(null);
    router.replace('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
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
