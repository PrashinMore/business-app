// Re-export Sale types from menu.ts
export type { SaleItem, Sale, CreateSaleRequest } from './menu';

export interface SalesFilters {
  from?: string; // ISO 8601 date
  to?: string; // ISO 8601 date
  productId?: string; // Product UUID
  staff?: string; // Staff name or ID (partial match)
  paymentType?: 'cash' | 'UPI';
  page?: number; // Page number (1-based, minimum 1)
  size?: number; // Page size (minimum 1)
}

export interface DailyTotal {
  day: string; // ISO 8601 date
  total: string; // Total amount as string
}

export interface PaymentTypeTotals {
  cash: number;
  UPI: number;
  total: number;
}

