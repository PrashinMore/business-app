import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types/auth';
import { 
  login as authLogin, 
  signup as authSignup, 
  logout as authLogout, 
  getCurrentUser,
  getStoredUser,
  isAuthenticated as checkAuth,
  refreshTokens,
  getRefreshToken
} from '../services/auth';
import { getMyInvites } from '../services/invites';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  pendingInvitesCount: number;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshInvitesCount: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);

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
          // Try to refresh user data from server
          try {
            const freshUser = await getCurrentUser();
            setUser(freshUser);
          } catch (error: any) {
            // If access token expired, try to refresh using refresh token
            if (error?.message?.includes('Session expired') || error?.message?.includes('No token found')) {
              const refreshToken = await getRefreshToken();
              if (refreshToken) {
                try {
                  // Attempt to refresh tokens
                  const refreshed = await refreshTokens(refreshToken);
                  setUser(refreshed.user);
                  // Try to get fresh user data with new token
                  try {
                    const freshUser = await getCurrentUser();
                    setUser(freshUser);
                  } catch (getUserError) {
                    // Even if getCurrentUser fails, we have the user from refresh response
                    console.warn('Failed to get fresh user data after refresh:', getUserError);
                  }
                } catch (refreshError) {
                  // Refresh token expired or invalid - logout user
                  await authLogout();
                  setUser(null);
                }
              } else {
                // No refresh token available - logout
                await authLogout();
                setUser(null);
              }
            } else {
              // Only log unexpected errors
              console.error('Failed to refresh user data:', error);
            }
          }
          
          // Check for pending invites
          await refreshInvitesCount();
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

  const refreshInvitesCount = async () => {
    try {
      const invites = await getMyInvites();
      setPendingInvitesCount(invites.length);
    } catch (error) {
      // Silently fail - invites are optional
      setPendingInvitesCount(0);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const data = await authLogin(email, password);
      setUser(data.user);
      // Check for pending invites after login
      await refreshInvitesCount();
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
      setPendingInvitesCount(0);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear user even if logout fails
      setUser(null);
      setPendingInvitesCount(0);
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
    pendingInvitesCount,
    login,
    signup,
    logout,
    refreshUser,
    refreshInvitesCount,
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

