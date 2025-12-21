/**
 * Sales Service
 * 
 * Handles all sales/orders API calls including listing, details, and filters
 */

import { apiRequest } from './auth';
import { Sale, SalesFilters, DailyTotal, PaymentTypeTotals } from '../types/sales';

/**
 * List sales with optional filters and pagination
 * @param filters - Optional filters for date range, product, staff, payment type, and pagination
 * @returns Promise with paginated sales response or array of sales (backward compatibility)
 */
export async function listSales(filters: SalesFilters = {}): Promise<{ sales: Sale[]; total: number } | Sale[]> {
  try {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.staff) params.set('staff', filters.staff);
    if (filters.paymentType) params.set('paymentType', filters.paymentType);
    if (filters.page !== undefined) params.set('page', filters.page.toString());
    if (filters.size !== undefined) params.set('size', filters.size.toString());

    const queryString = params.toString();
    const url = queryString ? `/sales?${queryString}` : '/sales';

    const response = await apiRequest(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load sales');
    }

    const data = await response.json();
    
    // Check if response is paginated (has sales and total) or legacy format (array)
    if (data && typeof data === 'object' && 'sales' in data && 'total' in data) {
      return { sales: data.sales, total: data.total };
    }
    
    // Backward compatibility: return as array if legacy format
    return data as Sale[];
  } catch (error) {
    console.error('List sales error:', error);
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
      throw new Error(error.message || 'Failed to load sale details');
    }

    const sale: Sale = await response.json();
    return sale;
  } catch (error) {
    console.error('Get sale details error:', error);
    throw error;
  }
}

/**
 * Get daily totals
 * @param from - Optional start date (ISO 8601)
 * @param to - Optional end date (ISO 8601)
 * @returns Promise with array of daily totals
 */
export async function getDailyTotals(from?: string, to?: string): Promise<DailyTotal[]> {
  try {
    const params = new URLSearchParams();
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const queryString = params.toString();
    const url = queryString ? `/sales/totals/daily?${queryString}` : '/sales/totals/daily';

    const response = await apiRequest(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load daily totals');
    }

    const totals: DailyTotal[] = await response.json();
    return totals;
  } catch (error) {
    console.error('Get daily totals error:', error);
    throw error;
  }
}

/**
 * Get payment type totals
 * @param filters - Optional filters (paymentType is excluded from this endpoint)
 * @returns Promise with payment type totals
 */
export async function getPaymentTypeTotals(
  filters: Omit<SalesFilters, 'paymentType'> = {}
): Promise<PaymentTypeTotals> {
  try {
    const params = new URLSearchParams();
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.productId) params.set('productId', filters.productId);
    if (filters.staff) params.set('staff', filters.staff);
    // Note: paymentType is intentionally excluded

    const queryString = params.toString();
    const url = queryString
      ? `/sales/totals/payment-type?${queryString}`
      : '/sales/totals/payment-type';

    const response = await apiRequest(url, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load payment type totals');
    }

    const totals: PaymentTypeTotals = await response.json();
    return totals;
  } catch (error) {
    console.error('Get payment type totals error:', error);
    throw error;
  }
}

/**
 * Update sale payment status and/or payment type
 * @param saleId - Sale UUID
 * @param updates - Payment updates (paymentType and/or isPaid)
 * @returns Promise with updated sale
 */
export async function updateSalePayment(
  saleId: string,
  updates: { paymentType?: 'cash' | 'UPI'; isPaid?: boolean }
): Promise<Sale> {
  try {
    // Validate that at least one field is provided
    if (updates.paymentType === undefined && updates.isPaid === undefined) {
      throw new Error('At least one field (paymentType or isPaid) must be provided');
    }

    const response = await apiRequest(`/sales/${saleId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update sale payment');
    }

    const sale: Sale = await response.json();
    return sale;
  } catch (error) {
    console.error('Update sale payment error:', error);
    throw error;
  }
}

