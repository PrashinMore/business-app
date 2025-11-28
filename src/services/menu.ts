/**
 * Menu and Checkout Service
 * 
 * Handles menu items fetching and checkout operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config/api';
import { apiRequest } from './auth';
import { Product, CreateSaleRequest, Sale } from '../types/menu';

const CACHE_KEYS = {
  PRODUCTS: 'cached_products',
  PRODUCTS_TIMESTAMP: 'cached_products_timestamp',
  MENU_ITEMS: 'cached_menu_items',
  MENU_ITEMS_TIMESTAMP: 'cached_menu_items_timestamp',
};

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Check if cache is still valid
 */
async function isCacheValid(timestampKey: string): Promise<boolean> {
  try {
    const timestampStr = await AsyncStorage.getItem(timestampKey);
    if (!timestampStr) return false;

    const timestamp = parseInt(timestampStr, 10);
    const now = Date.now();
    return (now - timestamp) < CACHE_DURATION;
  } catch {
    return false;
  }
}

/**
 * Get cached products
 */
async function getCachedProducts(): Promise<Product[] | null> {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEYS.PRODUCTS);
    if (!cachedData) return null;

    const isValid = await isCacheValid(CACHE_KEYS.PRODUCTS_TIMESTAMP);
    if (!isValid) return null;

    return JSON.parse(cachedData);
  } catch {
    return null;
  }
}

/**
 * Cache products
 */
async function cacheProducts(products: Product[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.PRODUCTS, JSON.stringify(products));
    await AsyncStorage.setItem(CACHE_KEYS.PRODUCTS_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error('Failed to cache products:', error);
  }
}

/**
 * Get all products from the API
 * Falls back to cache if offline or request fails
 * @returns Promise with array of products
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const response = await apiRequest('/products', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load products');
    }

    const products: Product[] = await response.json();
    // Cache the products on successful fetch
    await cacheProducts(products);
    return products;
  } catch (error) {
    // Try to return cached products if available
    const cachedProducts = await getCachedProducts();
    if (cachedProducts) {
      console.log('Using cached products due to network error');
      return cachedProducts;
    }
    console.error('Get products error:', error);
    throw error;
  }
}

/**
 * Get cached menu items
 */
async function getCachedMenuItems(): Promise<Product[] | null> {
  try {
    const cachedData = await AsyncStorage.getItem(CACHE_KEYS.MENU_ITEMS);
    if (!cachedData) return null;

    const isValid = await isCacheValid(CACHE_KEYS.MENU_ITEMS_TIMESTAMP);
    if (!isValid) return null;

    return JSON.parse(cachedData);
  } catch {
    return null;
  }
}

/**
 * Cache menu items
 */
async function cacheMenuItems(menuItems: Product[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEYS.MENU_ITEMS, JSON.stringify(menuItems));
    await AsyncStorage.setItem(CACHE_KEYS.MENU_ITEMS_TIMESTAMP, Date.now().toString());
  } catch (error) {
    console.error('Failed to cache menu items:', error);
  }
}

/**
 * Get menu items (products that are NOT in raw material categories)
 * Falls back to cache if offline or request fails
 * @param filters - Optional filters for search and category
 * @returns Promise with array of menu items
 */
export async function getMenuItems(filters?: { search?: string; category?: string }): Promise<Product[]> {
  try {
    // Import getProducts from products service to use filters
    const productsModule = await import('./products');
    const { getProducts } = productsModule;
    
    // Build filters for API call
    const apiFilters: productsModule.ProductFilters = {};
    if (filters?.search) {
      apiFilters.search = filters.search;
    }
    if (filters?.category) {
      apiFilters.category = filters.category;
    }
    
    const products = await getProducts(apiFilters);
    
    // Get raw material categories to exclude them from menu
    let rawMaterialCategoryNames: string[] = [];
    try {
      const { getCategories } = await import('./categories');
      const categories = await getCategories();
      rawMaterialCategoryNames = categories
        .filter(cat => cat.isRawMaterial)
        .map(cat => cat.name.toLowerCase());
    } catch (error) {
      console.warn('Failed to load categories for menu filtering, showing all products:', error);
    }
    
    // Filter out products in raw material categories
    // If categories API fails, show all products (backward compatibility)
    const menuItems = products.filter(product => {
      if (rawMaterialCategoryNames.length === 0) {
        // If we couldn't load categories, show all products
        return true;
      }
      // Exclude products whose category is a raw material category
      return !rawMaterialCategoryNames.includes(product.category.toLowerCase());
    });
    
    // Cache menu items separately for faster access (only if no filters applied)
    if (!filters?.search && !filters?.category) {
      await cacheMenuItems(menuItems);
    }
    return menuItems;
  } catch (error) {
    // Try to return cached menu items if available (only if no filters)
    if (!filters?.search && !filters?.category) {
      const cachedMenuItems = await getCachedMenuItems();
      if (cachedMenuItems) {
        console.log('Using cached menu items due to network error');
        return cachedMenuItems;
      }
      
      // Fallback: try to get cached products and filter
      const cachedProducts = await getCachedProducts();
      if (cachedProducts) {
        // Try to get raw material categories for filtering
        let rawMaterialCategoryNames: string[] = [];
        try {
          const { getCategories } = await import('./categories');
          const categories = await getCategories();
          rawMaterialCategoryNames = categories
            .filter(cat => cat.isRawMaterial)
            .map(cat => cat.name.toLowerCase());
        } catch (catError) {
          console.warn('Failed to load categories for cache filtering:', catError);
        }
        
        const menuItems = cachedProducts.filter(product => {
          if (rawMaterialCategoryNames.length === 0) {
            // If we couldn't load categories, show all products
            return true;
          }
          // Exclude products whose category is a raw material category
          return !rawMaterialCategoryNames.includes(product.category.toLowerCase());
        });
        
        if (menuItems.length > 0) {
          console.log('Using cached products to get menu items');
          return menuItems;
        }
      }
    }
    
    console.error('Get menu items error:', error);
    throw error;
  }
}

/**
 * Create a sale/checkout
 * If offline, queues the sale for later sync
 * @param saleData - Sale data including items, totalAmount, etc.
 * @returns Promise with created sale (or local ID if offline)
 */
export async function checkout(saleData: CreateSaleRequest): Promise<Sale | { id: string; offline: true }> {
  // Dynamic import to avoid circular dependency
  const { isOnline, queueSale } = await import('./offlineSales');
  
  try {
    // Check if online before attempting checkout
    const online = await isOnline();
    
    if (!online) {
      // Queue the sale for later sync
      const localId = await queueSale(saleData);
      console.log('Device is offline, sale queued with ID:', localId);
      return { id: localId, offline: true };
    }

    // Attempt to create sale online
    const response = await apiRequest('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Checkout failed');
    }

    const sale: Sale = await response.json();
    return sale;
  } catch (error: any) {
    // Check if it's a network error (fetch fails or network issues)
    const isNetworkError = 
      error.message?.includes('network') || 
      error.message?.includes('fetch') || 
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Network request failed') ||
      !(error instanceof Error && 'message' in error);
    
    if (isNetworkError) {
      try {
        // Double check if we're offline
        const online = await isOnline();
        if (!online) {
          const localId = await queueSale(saleData);
          console.log('Network error detected, sale queued with ID:', localId);
          return { id: localId, offline: true };
        }
        // If online but network error occurred, still queue it
        const localId = await queueSale(saleData);
        console.log('Network error during checkout, sale queued with ID:', localId);
        return { id: localId, offline: true };
      } catch (queueError) {
        console.error('Failed to queue sale:', queueError);
        throw error; // Throw original error if queueing fails
      }
    }
    
    // If it's not a network error, throw the original error
    console.error('Checkout error:', error);
    throw error;
  }
}

/**
 * Get sale details by ID
 * @param saleId - Sale UUID
 * @returns Promise with sale details
 */
export async function getSaleDetails(saleId: string): Promise<Sale> {
  try {
    const response = await apiRequest(`/sales/${saleId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get sale details');
    }

    const sale: Sale = await response.json();
    return sale;
  } catch (error) {
    console.error('Get sale details error:', error);
    throw error;
  }
}

