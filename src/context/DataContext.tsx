/**
 * DataContext
 * 
 * Centralized data management with Stale-While-Revalidate pattern.
 * - Shows cached data immediately while loading fresh data
 * - Updates UI and cache when API succeeds
 * - Keeps showing cached data if API fails
 * - Auto-refreshes related data after mutations
 */

import React, { createContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
  getCache,
  setCache,
  invalidateCache,
  CACHE_KEYS,
  CACHE_GROUPS,
} from '../services/cache';
import {
  DashboardSummary,
  SalesTrendData,
  TopProduct,
  LowStockItem,
  ExpenseSummary,
  SalesTrendRange,
} from '../types/dashboard';
import { Product } from '../types/menu';
import { Sale, SalesFilters, PaymentTypeTotals } from '../types/sales';
import * as dashboardApi from '../services/dashboard';
import * as menuApi from '../services/menu';
import * as salesApi from '../services/sales';

// Types
interface DashboardData {
  summary: DashboardSummary | null;
  salesTrend: SalesTrendData[];
  topProducts: TopProduct[];
  lowStock: LowStockItem[];
  expensesSummary: ExpenseSummary[];
}

interface SalesData {
  sales: Sale[];
  total: number; // Total count for pagination
  paymentTotals: PaymentTypeTotals | null;
}

interface DataContextType {
  // Dashboard data
  dashboard: DashboardData;
  dashboardLoading: boolean;
  dashboardRefreshing: boolean;
  loadDashboard: (trendRange?: SalesTrendRange, forceRefresh?: boolean) => Promise<void>;
  
  // Menu data
  menuItems: Product[];
  menuLoading: boolean;
  menuRefreshing: boolean;
  loadMenu: (filters?: { search?: string; category?: string }, forceRefresh?: boolean) => Promise<void>;
  
  // Categories (for menu filter)
  categories: string[];
  loadCategories: () => Promise<void>;
  
  // Sales data
  salesData: SalesData;
  salesLoading: boolean;
  salesRefreshing: boolean;
  loadSales: (filters?: SalesFilters, forceRefresh?: boolean) => Promise<void>;
  
  // Mutation handlers - call these after creating/updating data
  onSaleCreated: () => Promise<void>;
  onStockUpdated: () => Promise<void>;
  onProductUpdated: () => Promise<void>;
  onExpenseUpdated: () => Promise<void>;
  onCategoryUpdated: () => Promise<void>;
  
  // Global refresh
  refreshAll: () => Promise<void>;
}

const defaultDashboard: DashboardData = {
  summary: null,
  salesTrend: [],
  topProducts: [],
  lowStock: [],
  expensesSummary: [],
};

const defaultSalesData: SalesData = {
  sales: [],
  total: 0,
  paymentTotals: null,
};

export const DataContext = createContext<DataContextType | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  // Dashboard state
  const [dashboard, setDashboard] = useState<DashboardData>(defaultDashboard);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardRefreshing, setDashboardRefreshing] = useState(false);
  const currentTrendRange = useRef<SalesTrendRange>('7days');
  
  // Menu state
  const [menuItems, setMenuItems] = useState<Product[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuRefreshing, setMenuRefreshing] = useState(false);
  const currentMenuFilters = useRef<{ search?: string; category?: string }>({});
  
  // Categories state
  const [categories, setCategories] = useState<string[]>([]);
  
  // Sales state
  const [salesData, setSalesData] = useState<SalesData>(defaultSalesData);
  const [salesLoading, setSalesLoading] = useState(true);
  const [salesRefreshing, setSalesRefreshing] = useState(false);
  const currentSalesFilters = useRef<SalesFilters>({});

  /**
   * Load dashboard with SWR pattern
   */
  const loadDashboard = useCallback(async (trendRange: SalesTrendRange = '7days', forceRefresh = false) => {
    currentTrendRange.current = trendRange;
    
    // Try to get cached data first
    if (!forceRefresh) {
      const [
        cachedSummary,
        cachedTrend,
        cachedTopProducts,
        cachedLowStock,
        cachedExpenses,
      ] = await Promise.all([
        getCache<DashboardSummary>(CACHE_KEYS.DASHBOARD_SUMMARY),
        getCache<SalesTrendData[]>(`${CACHE_KEYS.DASHBOARD_SALES_TREND}_${trendRange}`),
        getCache<TopProduct[]>(CACHE_KEYS.DASHBOARD_TOP_PRODUCTS),
        getCache<LowStockItem[]>(CACHE_KEYS.DASHBOARD_LOW_STOCK),
        getCache<ExpenseSummary[]>(CACHE_KEYS.DASHBOARD_EXPENSES_SUMMARY),
      ]);

      // If we have cached data, show it immediately
      const hasCache = cachedSummary || cachedTrend || cachedTopProducts || cachedLowStock || cachedExpenses;
      
      if (hasCache) {
        setDashboard({
          summary: cachedSummary?.data || null,
          salesTrend: cachedTrend?.data || [],
          topProducts: cachedTopProducts?.data || [],
          lowStock: cachedLowStock?.data || [],
          expensesSummary: cachedExpenses?.data || [],
        });
        setDashboardLoading(false);
        setDashboardRefreshing(true);
      }
    } else {
      setDashboardRefreshing(true);
    }

    // Fetch fresh data from API
    try {
      const data = await dashboardApi.loadAllDashboardData(trendRange);
      
      // Update state with fresh data
      setDashboard(data);
      
      // Update cache
      await Promise.all([
        setCache(CACHE_KEYS.DASHBOARD_SUMMARY, data.summary),
        setCache(`${CACHE_KEYS.DASHBOARD_SALES_TREND}_${trendRange}`, data.salesTrend),
        setCache(CACHE_KEYS.DASHBOARD_TOP_PRODUCTS, data.topProducts),
        setCache(CACHE_KEYS.DASHBOARD_LOW_STOCK, data.lowStock),
        setCache(CACHE_KEYS.DASHBOARD_EXPENSES_SUMMARY, data.expensesSummary),
      ]);
    } catch (error) {
      // On error, keep showing cached data (already set above)
      console.error('Failed to fetch fresh dashboard data:', error);
    } finally {
      setDashboardLoading(false);
      setDashboardRefreshing(false);
    }
  }, []);

  /**
   * Load menu items with SWR pattern
   */
  const loadMenu = useCallback(async (filters?: { search?: string; category?: string }, forceRefresh = false) => {
    currentMenuFilters.current = filters || {};
    
    // Create cache key based on filters
    const cacheKey = filters?.search || filters?.category
      ? `${CACHE_KEYS.MENU_ITEMS}_${filters.search || ''}_${filters.category || ''}`
      : CACHE_KEYS.MENU_ITEMS;

    // Try to get cached data first
    if (!forceRefresh) {
      const cachedMenu = await getCache<Product[]>(cacheKey);
      
      if (cachedMenu) {
        setMenuItems(cachedMenu.data);
        setMenuLoading(false);
        setMenuRefreshing(true);
      }
    } else {
      setMenuRefreshing(true);
    }

    // Fetch fresh data from API
    try {
      const items = await menuApi.getMenuItems(filters);
      setMenuItems(items);
      
      // Cache only unfiltered results or filtered results
      await setCache(cacheKey, items);
    } catch (error) {
      console.error('Failed to fetch fresh menu data:', error);
    } finally {
      setMenuLoading(false);
      setMenuRefreshing(false);
    }
  }, []);

  /**
   * Load categories for menu filter
   */
  const loadCategories = useCallback(async () => {
    try {
      const cachedCategories = await getCache<string[]>(CACHE_KEYS.CATEGORIES);
      
      if (cachedCategories) {
        setCategories(cachedCategories.data);
      }
      
      // Fetch fresh
      const products = await menuApi.getProducts();
      const uniqueCategories = [...new Set(products.map(p => p.category))].sort();
      setCategories(uniqueCategories);
      
      await setCache(CACHE_KEYS.CATEGORIES, uniqueCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }, []);

  /**
   * Load sales with SWR pattern
   */
  const loadSales = useCallback(async (filters?: SalesFilters, forceRefresh = false) => {
    currentSalesFilters.current = filters || {};
    
    // Create cache key based on filters
    const filterKey = JSON.stringify(filters || {});
    const salesCacheKey = `${CACHE_KEYS.SALES_LIST}_${filterKey}`;
    const totalsCacheKey = `${CACHE_KEYS.PAYMENT_TOTALS}_${filterKey}`;

    // Try to get cached data first
    if (!forceRefresh) {
      const [cachedSales, cachedTotals] = await Promise.all([
        getCache<Sale[]>(salesCacheKey),
        getCache<PaymentTypeTotals>(totalsCacheKey),
      ]);

      if (cachedSales || cachedTotals) {
        setSalesData({
          sales: cachedSales?.data || [],
          total: Array.isArray(cachedSales?.data) ? cachedSales.data.length : 0,
          paymentTotals: cachedTotals?.data || null,
        });
        setSalesLoading(false);
        setSalesRefreshing(true);
      }
    } else {
      setSalesRefreshing(true);
    }

    // Fetch fresh data from API
    try {
      const [salesListResponse, totals] = await Promise.all([
        salesApi.listSales(filters || {}),
        salesApi.getPaymentTypeTotals({
          from: filters?.from,
          to: filters?.to,
          productId: filters?.productId,
          staff: filters?.staff,
        }),
      ]);

      // Handle paginated response or legacy array format
      const sales = Array.isArray(salesListResponse) 
        ? salesListResponse 
        : salesListResponse.sales;
      
      const total = Array.isArray(salesListResponse)
        ? sales.length // Legacy: use array length
        : salesListResponse.total;

      setSalesData({
        sales,
        total,
        paymentTotals: totals,
      });

      // Update cache
      await Promise.all([
        setCache(salesCacheKey, sales),
        setCache(totalsCacheKey, totals),
      ]);
    } catch (error) {
      console.error('Failed to fetch fresh sales data:', error);
    } finally {
      setSalesLoading(false);
      setSalesRefreshing(false);
    }
  }, []);

  /**
   * Mutation handlers - invalidate cache and refresh related data
   */
  const onSaleCreated = useCallback(async () => {
    console.log('Sale created - refreshing related data...');
    await invalidateCache(CACHE_GROUPS.SALES);
    
    // Refresh all related data
    await Promise.all([
      loadDashboard(currentTrendRange.current, true),
      loadMenu(currentMenuFilters.current, true),
      loadSales(currentSalesFilters.current, true),
    ]);
  }, [loadDashboard, loadMenu, loadSales]);

  const onStockUpdated = useCallback(async () => {
    console.log('Stock updated - refreshing related data...');
    await invalidateCache(CACHE_GROUPS.STOCK);
    
    await Promise.all([
      loadMenu(currentMenuFilters.current, true),
      loadDashboard(currentTrendRange.current, true),
    ]);
  }, [loadDashboard, loadMenu]);

  const onProductUpdated = useCallback(async () => {
    console.log('Product updated - refreshing related data...');
    await invalidateCache(CACHE_GROUPS.PRODUCTS);
    
    await Promise.all([
      loadMenu(currentMenuFilters.current, true),
      loadCategories(),
      loadDashboard(currentTrendRange.current, true),
    ]);
  }, [loadDashboard, loadMenu, loadCategories]);

  const onExpenseUpdated = useCallback(async () => {
    console.log('Expense updated - refreshing related data...');
    await invalidateCache(CACHE_GROUPS.EXPENSES);
    
    await loadDashboard(currentTrendRange.current, true);
  }, [loadDashboard]);

  const onCategoryUpdated = useCallback(async () => {
    console.log('Category updated - refreshing related data...');
    await invalidateCache(CACHE_GROUPS.CATEGORIES);
    
    await Promise.all([
      loadMenu(currentMenuFilters.current, true),
      loadCategories(),
    ]);
  }, [loadMenu, loadCategories]);

  const refreshAll = useCallback(async () => {
    console.log('Refreshing all data...');
    await Promise.all([
      loadDashboard(currentTrendRange.current, true),
      loadMenu(currentMenuFilters.current, true),
      loadSales(currentSalesFilters.current, true),
      loadCategories(),
    ]);
  }, [loadDashboard, loadMenu, loadSales, loadCategories]);

  const value: DataContextType = {
    // Dashboard
    dashboard,
    dashboardLoading,
    dashboardRefreshing,
    loadDashboard,
    
    // Menu
    menuItems,
    menuLoading,
    menuRefreshing,
    loadMenu,
    
    // Categories
    categories,
    loadCategories,
    
    // Sales
    salesData,
    salesLoading,
    salesRefreshing,
    loadSales,
    
    // Mutation handlers
    onSaleCreated,
    onStockUpdated,
    onProductUpdated,
    onExpenseUpdated,
    onCategoryUpdated,
    
    // Global refresh
    refreshAll,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = () => {
  const context = React.useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

