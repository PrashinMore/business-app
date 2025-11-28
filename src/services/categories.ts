/**
 * Categories Service
 *
 * Handles all category management operations
 * Requires admin role for all operations
 */

import { API_BASE_URL } from '../config/api';
import { apiRequest } from './auth';
import {
  Category,
  CreateCategoryData,
  UpdateCategoryData
} from '../types/categories';

/**
 * Get all categories (admin only)
 */
export async function getCategories(): Promise<Category[]> {
  try {
    const response = await apiRequest('/categories', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load categories');
    }

    const categories: Category[] = await response.json();
    return categories;
  } catch (error) {
    console.error('Get categories error:', error);
    throw error;
  }
}

/**
 * Get category by ID with products (admin only)
 */
export async function getCategoryById(categoryId: string): Promise<Category> {
  try {
    const response = await apiRequest(`/categories/${categoryId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load category');
    }

    const category: Category = await response.json();
    return category;
  } catch (error) {
    console.error('Get category error:', error);
    throw error;
  }
}

/**
 * Create a new category (admin only)
 */
export async function createCategory(categoryData: CreateCategoryData): Promise<Category> {
  try {
    const response = await apiRequest('/categories', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create category');
    }

    const category: Category = await response.json();
    return category;
  } catch (error) {
    console.error('Create category error:', error);
    throw error;
  }
}

/**
 * Update an existing category (admin only)
 */
export async function updateCategory(
  categoryId: string,
  categoryData: UpdateCategoryData
): Promise<Category> {
  try {
    const response = await apiRequest(`/categories/${categoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update category');
    }

    const category: Category = await response.json();
    return category;
  } catch (error) {
    console.error('Update category error:', error);
    throw error;
  }
}

/**
 * Delete a category (admin only)
 */
export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    const response = await apiRequest(`/categories/${categoryId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete category');
    }
  } catch (error) {
    console.error('Delete category error:', error);
    throw error;
  }
}

