import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/auth';
import { 
  login as authLogin, 
  signup as authSignup, 
  logout as authLogout, 
  getCurrentUser,
  getStoredUser,
  isAuthenticated as checkAuth
} from '../services/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Check if user is already authenticated on mount
  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const authenticated = await checkAuth();
      if (authenticated) {
        const storedUser = await getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          // Optionally refresh user data from server
          try {
            const freshUser = await getCurrentUser();
            setUser(freshUser);
          } catch (error: any) {
            // Silently handle session expiration during initial load
            // This is expected if token is expired or invalid
            if (error?.message?.includes('Session expired') || error?.message?.includes('No token found')) {
              // Clear invalid token and user data
              await authLogout();
              setUser(null);
            } else {
              // Only log unexpected errors
              console.error('Failed to refresh user data:', error);
            }
          }
        }
      }
    } catch (error) {
      // Silently handle authentication check failures during initial load
      // This is expected if user is not logged in
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authLogin(email, password);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    try {
      const data = await authSignup(name, email, password);
      setUser(data.user);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authLogout();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user even if logout fails
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const freshUser = await getCurrentUser();
      setUser(freshUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

