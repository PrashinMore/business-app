import { useState, useEffect } from 'react';
import {
  Category,
  CreateCategoryData,
  UpdateCategoryData
} from '../types/categories';
import * as categoriesApi from '../services/categories';

interface UseCategoriesOptions {
  autoLoad?: boolean;
}

interface UseCategoriesReturn {
  // Data
  categories: Category[];
  categoryDetails: Category | null;

  // Loading states
  loading: boolean;
  detailsLoading: boolean;

  // Error states
  error: string | null;
  detailsError: string | null;

  // Actions
  createCategory: (data: CreateCategoryData) => Promise<Category>;
  updateCategory: (id: string, data: UpdateCategoryData) => Promise<Category>;
  deleteCategory: (id: string) => Promise<void>;
  loadCategoryDetails: (id: string) => Promise<void>;

  // Utility functions
  refreshCategories: () => Promise<void>;
  clearError: () => void;
}

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesReturn {
  const { autoLoad = true } = options;

  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryDetails, setCategoryDetails] = useState<Category | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoriesApi.getCategories();
      setCategories(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load categories';
      setError(errorMessage);
      console.error('Load categories error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load category details
  const loadCategoryDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      setDetailsError(null);
      const data = await categoriesApi.getCategoryById(id);
      setCategoryDetails(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load category details';
      setDetailsError(errorMessage);
      console.error('Load category details error:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Create category
  const createCategory = async (data: CreateCategoryData): Promise<Category> => {
    try {
      const newCategory = await categoriesApi.createCategory(data);
      setCategories(prev => [...prev, newCategory].sort((a, b) => 
        a.name.localeCompare(b.name)
      ));
      return newCategory;
    } catch (err) {
      throw err;
    }
  };

  // Update category
  const updateCategory = async (id: string, updates: UpdateCategoryData): Promise<Category> => {
    try {
      const updatedCategory = await categoriesApi.updateCategory(id, updates);
      setCategories(prev => prev.map(cat => cat.id === id ? updatedCategory : cat).sort((a, b) => 
        a.name.localeCompare(b.name)
      ));
      // Also update details if this category is currently loaded
      if (categoryDetails?.id === id) {
        setCategoryDetails(updatedCategory);
      }
      return updatedCategory;
    } catch (err) {
      throw err;
    }
  };

  // Delete category
  const deleteCategory = async (id: string): Promise<void> => {
    try {
      await categoriesApi.deleteCategory(id);
      setCategories(prev => prev.filter(cat => cat.id !== id));
      // Clear details if this category was loaded
      if (categoryDetails?.id === id) {
        setCategoryDetails(null);
      }
    } catch (err) {
      throw err;
    }
  };

  // Refresh functions
  const refreshCategories = async () => {
    await loadCategories();
  };

  // Clear error
  const clearError = () => {
    setError(null);
    setDetailsError(null);
  };

  // Effect to load categories on mount
  useEffect(() => {
    if (autoLoad) {
      loadCategories();
    }
  }, [autoLoad]);

  return {
    // Data
    categories,
    categoryDetails,

    // Loading states
    loading,
    detailsLoading,

    // Error states
    error,
    detailsError,

    // Actions
    createCategory,
    updateCategory,
    deleteCategory,
    loadCategoryDetails,

    // Utility functions
    refreshCategories,
    clearError,
  };
}

