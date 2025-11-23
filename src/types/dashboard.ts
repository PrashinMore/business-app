export interface DashboardSummary {
  totalSales: number;
  totalExpenses: number;
  costOfGoodsSold: number;
  grossProfit: number;
  netProfit: number;
  totalOrders: number;
}

export interface SalesTrendData {
  date: string; // YYYY-MM-DD format
  totalSales: number;
}

export interface TopProduct {
  productId: string;
  productName: string;
  totalQuantity: number;
  totalRevenue: number;
}

export interface LowStockItem {
  id: string;
  name: string;
  category: string;
  stock: number;
  lowStockThreshold: number;
  unit: string;
  imageUrl: string | null;
}

export interface ExpenseSummary {
  category: string;
  amount: number;
  percentage: number;
}

export type SalesTrendRange = '7days' | '30days';

