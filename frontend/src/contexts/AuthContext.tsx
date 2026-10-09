import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, apiGetMe, apiLogin, apiLogout, apiSignup } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<User>;
  signup: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const data = await apiGetMe();
      if (data && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (identifier: string, password: string, rememberMe = false) => {
    const data = await apiLogin({ identifier, password, rememberMe });
    setUser(data.user);
    return data.user;
  };

  const signup = async (formData: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
  }) => {
    const data = await apiSignup(formData);
    setUser(data.user);
    return data.user;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        login,
        signup,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
