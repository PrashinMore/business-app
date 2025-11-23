/**
 * Dashboard Service
 * 
 * Handles all dashboard analytics and summary API calls
 */

import { apiRequest } from './auth';
import {
  DashboardSummary,
  SalesTrendData,
  TopProduct,
  LowStockItem,
  ExpenseSummary,
  SalesTrendRange,
} from '../types/dashboard';

/**
 * Get dashboard summary (today's stats)
 * @returns Promise with dashboard summary
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  try {
    const response = await apiRequest('/dashboard/summary', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load dashboard summary');
    }

    const data: DashboardSummary = await response.json();
    return data;
  } catch (error) {
    console.error('Get dashboard summary error:', error);
    throw error;
  }
}

/**
 * Get sales trend data
 * @param range - '7days' or '30days' (default: '7days')
 * @returns Promise with array of sales trend data
 */
export async function getSalesTrend(range: SalesTrendRange = '7days'): Promise<SalesTrendData[]> {
  try {
    const response = await apiRequest(`/dashboard/sales-trend?range=${range}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load sales trend');
    }

    const data: SalesTrendData[] = await response.json();
    return data;
  } catch (error) {
    console.error('Get sales trend error:', error);
    throw error;
  }
}

/**
 * Get top products
 * @param limit - Number of products to return (default: 5)
 * @returns Promise with array of top products
 */
export async function getTopProducts(limit: number = 5): Promise<TopProduct[]> {
  try {
    const response = await apiRequest(`/dashboard/top-products?limit=${limit}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load top products');
    }

    const data: TopProduct[] = await response.json();
    return data;
  } catch (error) {
    console.error('Get top products error:', error);
    throw error;
  }
}

/**
 * Get low stock alerts
 * @returns Promise with array of low stock items
 */
export async function getLowStockAlerts(): Promise<LowStockItem[]> {
  try {
    const response = await apiRequest('/dashboard/low-stock', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load low stock alerts');
    }

    const data: LowStockItem[] = await response.json();
    return data;
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    throw error;
  }
}

/**
 * Get expenses summary
 * @returns Promise with array of expense summaries
 */
export async function getExpensesSummary(): Promise<ExpenseSummary[]> {
  try {
    const response = await apiRequest('/dashboard/expenses-summary', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load expenses summary');
    }

    const data: ExpenseSummary[] = await response.json();
    return data;
  } catch (error) {
    console.error('Get expenses summary error:', error);
    throw error;
  }
}

/**
 * Load all dashboard data in parallel
 * @param trendRange - Sales trend range (default: '7days')
 * @returns Promise with all dashboard data
 */
export async function loadAllDashboardData(trendRange: SalesTrendRange = '7days') {
  try {
    const [summary, salesTrend, topProducts, lowStock, expensesSummary] = await Promise.all([
      getDashboardSummary(),
      getSalesTrend(trendRange),
      getTopProducts(5),
      getLowStockAlerts(),
      getExpensesSummary(),
    ]);

    return {
      summary,
      salesTrend,
      topProducts,
      lowStock,
      expensesSummary,
    };
  } catch (error) {
    console.error('Load dashboard data error:', error);
    throw error;
  }
}

