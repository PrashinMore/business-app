/**
 * Cache Service
 * 
 * Generic caching utilities for the Stale-While-Revalidate pattern.
 * - Show cached data immediately while loading
 * - Fetch fresh data from API in background
 * - On success: update cache and UI
 * - On failure: keep showing cached data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache key prefixes
const CACHE_PREFIX = '@yuki_cache_';
const TIMESTAMP_SUFFIX = '_timestamp';

// Default cache duration (24 hours) - used for stale checking, not invalidation
const DEFAULT_CACHE_DURATION = 24 * 60 * 60 * 1000;

export interface CacheOptions {
  /** Cache duration in milliseconds */
  maxAge?: number;
  /** Force skip cache and fetch fresh */
  forceRefresh?: boolean;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
}

/**
 * Get cached data
 */
export async function getCache<T>(key: string, maxAge: number = DEFAULT_CACHE_DURATION): Promise<CacheEntry<T> | null> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const [dataStr, timestampStr] = await Promise.all([
      AsyncStorage.getItem(cacheKey),
      AsyncStorage.getItem(`${cacheKey}${TIMESTAMP_SUFFIX}`),
    ]);

    if (!dataStr) return null;

    const timestamp = timestampStr ? parseInt(timestampStr, 10) : 0;
    const isStale = Date.now() - timestamp > maxAge;
    const data = JSON.parse(dataStr) as T;

    return { data, timestamp, isStale };
  } catch (error) {
    console.error(`Cache read error for ${key}:`, error);
    return null;
  }
}

/**
 * Set cached data
 */
export async function setCache<T>(key: string, data: T): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const timestamp = Date.now().toString();
    
    await Promise.all([
      AsyncStorage.setItem(cacheKey, JSON.stringify(data)),
      AsyncStorage.setItem(`${cacheKey}${TIMESTAMP_SUFFIX}`, timestamp),
    ]);
  } catch (error) {
    console.error(`Cache write error for ${key}:`, error);
  }
}

/**
 * Remove cached data
 */
export async function removeCache(key: string): Promise<void> {
  try {
    const cacheKey = `${CACHE_PREFIX}${key}`;
    await Promise.all([
      AsyncStorage.removeItem(cacheKey),
      AsyncStorage.removeItem(`${cacheKey}${TIMESTAMP_SUFFIX}`),
    ]);
  } catch (error) {
    console.error(`Cache remove error for ${key}:`, error);
  }
}

/**
 * Clear all cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const cacheKeys = allKeys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch (error) {
    console.error('Clear all cache error:', error);
  }
}

/**
 * Invalidate cache for specific keys (pattern matching)
 */
export async function invalidateCache(patterns: string[]): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const keysToRemove: string[] = [];
    
    for (const key of allKeys) {
      if (!key.startsWith(CACHE_PREFIX)) continue;
      
      const cacheKeyWithoutPrefix = key.replace(CACHE_PREFIX, '').replace(TIMESTAMP_SUFFIX, '');
      
      for (const pattern of patterns) {
        if (cacheKeyWithoutPrefix.startsWith(pattern) || cacheKeyWithoutPrefix.includes(pattern)) {
          keysToRemove.push(key);
          break;
        }
      }
    }
    
    if (keysToRemove.length > 0) {
      await AsyncStorage.multiRemove(keysToRemove);
    }
  } catch (error) {
    console.error('Invalidate cache error:', error);
  }
}

// Cache keys constants for consistency
export const CACHE_KEYS = {
  // Dashboard
  DASHBOARD_SUMMARY: 'dashboard_summary',
  DASHBOARD_SALES_TREND: 'dashboard_sales_trend',
  DASHBOARD_TOP_PRODUCTS: 'dashboard_top_products',
  DASHBOARD_LOW_STOCK: 'dashboard_low_stock',
  DASHBOARD_EXPENSES_SUMMARY: 'dashboard_expenses_summary',
  
  // Menu & Products
  MENU_ITEMS: 'menu_items',
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  
  // Sales
  SALES_LIST: 'sales_list',
  PAYMENT_TOTALS: 'payment_totals',
  
  // Expenses
  EXPENSES_LIST: 'expenses_list',
  
  // Organizations
  ORGANIZATIONS: 'organizations',
};

// Groups for bulk invalidation
export const CACHE_GROUPS = {
  // Invalidate when a sale is made
  SALES: [
    CACHE_KEYS.DASHBOARD_SUMMARY,
    CACHE_KEYS.DASHBOARD_SALES_TREND,
    CACHE_KEYS.DASHBOARD_TOP_PRODUCTS,
    CACHE_KEYS.SALES_LIST,
    CACHE_KEYS.PAYMENT_TOTALS,
    CACHE_KEYS.MENU_ITEMS, // Stock changes
    CACHE_KEYS.PRODUCTS,
    CACHE_KEYS.DASHBOARD_LOW_STOCK,
  ],
  
  // Invalidate when stock is updated
  STOCK: [
    CACHE_KEYS.MENU_ITEMS,
    CACHE_KEYS.PRODUCTS,
    CACHE_KEYS.DASHBOARD_LOW_STOCK,
  ],
  
  // Invalidate when products are modified
  PRODUCTS: [
    CACHE_KEYS.MENU_ITEMS,
    CACHE_KEYS.PRODUCTS,
    CACHE_KEYS.CATEGORIES,
    CACHE_KEYS.DASHBOARD_TOP_PRODUCTS,
  ],
  
  // Invalidate when expenses are modified
  EXPENSES: [
    CACHE_KEYS.EXPENSES_LIST,
    CACHE_KEYS.DASHBOARD_SUMMARY,
    CACHE_KEYS.DASHBOARD_EXPENSES_SUMMARY,
  ],
  
  // Invalidate when categories are modified
  CATEGORIES: [
    CACHE_KEYS.CATEGORIES,
    CACHE_KEYS.MENU_ITEMS,
    CACHE_KEYS.PRODUCTS,
  ],
  
  // Invalidate all dashboard data
  DASHBOARD: [
    CACHE_KEYS.DASHBOARD_SUMMARY,
    CACHE_KEYS.DASHBOARD_SALES_TREND,
    CACHE_KEYS.DASHBOARD_TOP_PRODUCTS,
    CACHE_KEYS.DASHBOARD_LOW_STOCK,
    CACHE_KEYS.DASHBOARD_EXPENSES_SUMMARY,
  ],
};

