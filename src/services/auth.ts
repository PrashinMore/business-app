/**
 * Authentication Service
 * 
 * Handles all authentication-related API calls and token management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthTokenResponse, LoginRequest, SignupRequest, ResetPasswordRequest, User } from '../types/auth';
import { API_BASE_URL } from '../config/api';

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================

/**
 * Login user
 * @param email - User email
 * @param password - User password
 * @returns Promise with user data and access token
 */
export async function login(email: string, password: string): Promise<AuthTokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      } as LoginRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store tokens and user data
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    return data as AuthTokenResponse;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

/**
 * Sign up new user
 * @param name - User full name
 * @param email - User email
 * @param password - User password (min 8 characters)
 * @returns Promise with user data and access token
 */
export async function signup(name: string, email: string, password: string): Promise<AuthTokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        email,
        password,
      } as SignupRequest),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Signup failed');
    }

    // Store tokens and user data
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    return data as AuthTokenResponse;
  } catch (error) {
    console.error('Signup error:', error);
    throw error;
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Refresh token string
 * @returns Promise with new access token, refresh token, and user data
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokenResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Token refresh failed');
    }

    // Store new tokens and user data
    await AsyncStorage.setItem('accessToken', data.accessToken);
    await AsyncStorage.setItem('refreshToken', data.refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(data.user));

    return data as AuthTokenResponse;
  } catch (error) {
    console.error('Refresh token error:', error);
    throw error;
  }
}

/**
 * Get current authenticated user
 * @returns Promise with user object
 */
export async function getCurrentUser(): Promise<User> {
  try {
    const token = await AsyncStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No token found. Please login.');
    }

    const response = await fetch(`${API_BASE_URL}/users/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired - try to refresh
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        if (storedRefreshToken) {
          try {
            const refreshed = await refreshTokens(storedRefreshToken);
            // Retry the request with new token
            const retryResponse = await fetch(`${API_BASE_URL}/users/me`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${refreshed.accessToken}`,
                'Content-Type': 'application/json',
              },
            });
            const retryData = await retryResponse.json();
            if (retryResponse.ok) {
              await AsyncStorage.setItem('user', JSON.stringify(retryData));
              return retryData as User;
            }
          } catch (refreshError) {
            // Refresh failed - logout user
            await logout();
            throw new Error('Session expired. Please login again.');
          }
        }
        // No refresh token or refresh failed
        await logout();
        throw new Error('Session expired. Please login again.');
      }
      throw new Error(data.message || 'Failed to get user');
    }

    // Update stored user data
    await AsyncStorage.setItem('user', JSON.stringify(data));

    return data as User;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

/**
 * Reset password
 * @param currentPassword - Current password (required for self)
 * @param newPassword - New password (min 8 characters)
 * @param userId - Optional: User ID (admin only)
 * @returns Promise<boolean>
 */
export async function resetPassword(
  currentPassword: string | undefined,
  newPassword: string,
  userId?: string
): Promise<boolean> {
  try {
    const token = await AsyncStorage.getItem('accessToken');

    if (!token) {
      throw new Error('No token found. Please login.');
    }

    const body: ResetPasswordRequest = { newPassword };
    if (currentPassword) {
      body.currentPassword = currentPassword;
    }
    if (userId) {
      body.userId = userId;
    }

    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Password reset failed');
    }

    return true;
  } catch (error) {
    console.error('Reset password error:', error);
    throw error;
  }
}

/**
 * Logout user
 * Clears stored tokens and user data
 */
export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('accessToken');
  await AsyncStorage.removeItem('refreshToken');
  await AsyncStorage.removeItem('user');
}

/**
 * Check if user is authenticated
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await AsyncStorage.getItem('accessToken');
  return !!token;
}

/**
 * Get stored access token
 * @returns Promise<string | null>
 */
export async function getToken(): Promise<string | null> {
  return await AsyncStorage.getItem('accessToken');
}

/**
 * Get stored refresh token
 * @returns Promise<string | null>
 */
export async function getRefreshToken(): Promise<string | null> {
  return await AsyncStorage.getItem('refreshToken');
}

/**
 * Get stored user
 * @returns Promise<User | null>
 */
export async function getStoredUser(): Promise<User | null> {
  const userString = await AsyncStorage.getItem('user');
  return userString ? JSON.parse(userString) : null;
}

/**
 * Make authenticated API request
 * Automatically adds Authorization header and handles token refresh
 * 
 * @param endpoint - API endpoint (e.g., '/products')
 * @param options - Fetch options
 * @returns Promise<Response>
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
  let token = await AsyncStorage.getItem('accessToken');

  if (!token) {
    throw new Error('No token found. Please login.');
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint}`;

  let response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  // Handle token expiration - try to refresh
  if (response.status === 401) {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        // Attempt to refresh tokens
        const refreshed = await refreshTokens(refreshToken);
        token = refreshed.accessToken;

        // Retry the original request with new token
        response = await fetch(url, {
          ...options,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            ...options.headers,
          },
        });

        // If still 401 after refresh, logout
        if (response.status === 401) {
          await logout();
          throw new Error('Session expired. Please login again.');
        }
      } catch (refreshError) {
        // Refresh failed - logout user
        await logout();
        throw new Error('Session expired. Please login again.');
      }
    } else {
      // No refresh token available
      await logout();
      throw new Error('Session expired. Please login again.');
    }
  }

  return response;
}

