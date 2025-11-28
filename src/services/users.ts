/**
 * Users Service
 *
 * Handles user management operations (admin only)
 */

import { API_BASE_URL } from '../config/api';
import { apiRequest } from './auth';
import { User } from '../types/auth';

/**
 * Get all users (admin only)
 */
export async function getUsers(): Promise<User[]> {
  try {
    const response = await apiRequest('/users', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load users');
    }

    const users: User[] = await response.json();
    return users;
  } catch (error) {
    console.error('Get users error:', error);
    throw error;
  }
}

/**
 * Get user by ID (admin only)
 */
export async function getUserById(userId: string): Promise<User> {
  try {
    const response = await apiRequest(`/users/${userId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load user');
    }

    const user: User = await response.json();
    return user;
  } catch (error) {
    console.error('Get user error:', error);
    throw error;
  }
}

/**
 * Get multiple users by IDs (admin only)
 */
export async function getUsersByIds(userIds: string[]): Promise<User[]> {
  try {
    // For now, get all users and filter. In production, you might want a batch endpoint
    const allUsers = await getUsers();
    return allUsers.filter(user => userIds.includes(user.id));
  } catch (error) {
    console.error('Get users by IDs error:', error);
    throw error;
  }
}
