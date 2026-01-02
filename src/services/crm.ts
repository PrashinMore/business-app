/**
 * CRM Service
 * 
 * Handles all Customer Relationship Management API calls
 */

import { apiRequest } from './auth';
import {
  Customer,
  CustomerVisit,
  CustomerNote,
  CustomerFeedback,
  CRMDashboardStats,
  CustomerListResponse,
  CustomerFilters,
  CreateCustomerData,
  UpdateCustomerData,
  CreateCustomerNoteData,
  CreateCustomerFeedbackData,
  UpdateFeedbackData,
} from '../types/crm';

/**
 * Get CRM dashboard statistics
 * @returns Promise with CRM dashboard stats
 */
export async function getCRMDashboardStats(): Promise<CRMDashboardStats> {
  try {
    const response = await apiRequest('/crm/dashboard', {
      method: 'GET',
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load CRM dashboard');
    }

    const stats: CRMDashboardStats = await response.json();
    return stats;
  } catch (error) {
    console.error('Get CRM dashboard stats error:', error);
    throw error;
  }
}

/**
 * List customers with optional filters
 * @param filters - Optional filters for search, segment, tag, pagination
 * @returns Promise with paginated customer list
 */
export async function getCustomers(filters?: CustomerFilters): Promise<CustomerListResponse> {
  try {
    const params = new URLSearchParams();
    if (filters?.search) params.set('search', filters.search);
    if (filters?.segment) params.set('segment', filters.segment);
    if (filters?.tag) params.set('tag', filters.tag);
    if (filters?.page !== undefined) params.set('page', filters.page.toString());
    if (filters?.size !== undefined) params.set('size', filters.size.toString());

    const queryString = params.toString();
    const endpoint = `/crm/customers${queryString ? `?${queryString}` : ''}`;

    const response = await apiRequest(endpoint, {
      method: 'GET',
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load customers');
    }

    const data: CustomerListResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Get customers error:', error);
    throw error;
  }
}

/**
 * Get customer details by ID
 * @param customerId - Customer UUID
 * @returns Promise with customer details
 */
export async function getCustomerDetails(customerId: string): Promise<Customer> {
  try {
    const response = await apiRequest(`/crm/customers/${customerId}`, {
      method: 'GET',
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load customer details');
    }

    const customer: Customer = await response.json();
    return customer;
  } catch (error) {
    console.error('Get customer details error:', error);
    throw error;
  }
}

/**
 * Create a new customer
 * @param data - Customer creation data
 * @returns Promise with created customer
 */
export async function createCustomer(data: CreateCustomerData): Promise<Customer> {
  try {
    const response = await apiRequest('/crm/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer');
    }

    const customer: Customer = await response.json();
    return customer;
  } catch (error) {
    console.error('Create customer error:', error);
    throw error;
  }
}

/**
 * Update customer information
 * @param customerId - Customer UUID
 * @param data - Customer update data
 * @returns Promise with updated customer
 */
export async function updateCustomer(
  customerId: string,
  data: UpdateCustomerData
): Promise<Customer> {
  try {
    const response = await apiRequest(`/crm/customers/${customerId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update customer');
    }

    const customer: Customer = await response.json();
    return customer;
  } catch (error) {
    console.error('Update customer error:', error);
    throw error;
  }
}

/**
 * Get customer visit history
 * @param customerId - Customer UUID
 * @returns Promise with array of customer visits
 */
export async function getCustomerVisits(customerId: string): Promise<CustomerVisit[]> {
  try {
    const response = await apiRequest(`/crm/customers/${customerId}/visits`, {
      method: 'GET',
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load customer visits');
    }

    const visits: CustomerVisit[] = await response.json();
    return visits;
  } catch (error) {
    console.error('Get customer visits error:', error);
    throw error;
  }
}

/**
 * Create a customer note
 * @param customerId - Customer UUID
 * @param data - Note data
 * @returns Promise with created note
 */
export async function createCustomerNote(
  customerId: string,
  data: CreateCustomerNoteData
): Promise<CustomerNote> {
  try {
    const response = await apiRequest(`/crm/customers/${customerId}/notes`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer note');
    }

    const note: CustomerNote = await response.json();
    return note;
  } catch (error) {
    console.error('Create customer note error:', error);
    throw error;
  }
}

/**
 * Get all customer notes
 * @param customerId - Customer UUID
 * @returns Promise with array of customer notes
 */
export async function getCustomerNotes(customerId: string): Promise<CustomerNote[]> {
  try {
    const response = await apiRequest(`/crm/customers/${customerId}/notes`, {
      method: 'GET',
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load customer notes');
    }

    const notes: CustomerNote[] = await response.json();
    return notes;
  } catch (error) {
    console.error('Get customer notes error:', error);
    throw error;
  }
}

/**
 * Create customer feedback
 * @param customerId - Customer UUID
 * @param data - Feedback data
 * @returns Promise with created feedback
 */
export async function createCustomerFeedback(
  customerId: string,
  data: CreateCustomerFeedbackData
): Promise<CustomerFeedback> {
  try {
    const response = await apiRequest(`/crm/customers/${customerId}/feedback`, {
      method: 'POST',
      body: JSON.stringify(data),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create customer feedback');
    }

    const feedback: CustomerFeedback = await response.json();
    return feedback;
  } catch (error) {
    console.error('Create customer feedback error:', error);
    throw error;
  }
}

/**
 * Get all customer feedback
 * @param customerId - Customer UUID
 * @returns Promise with array of customer feedback
 */
export async function getCustomerFeedback(customerId: string): Promise<CustomerFeedback[]> {
  try {
    const response = await apiRequest(`/crm/customers/${customerId}/feedback`, {
      method: 'GET',
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load customer feedback');
    }

    const feedback: CustomerFeedback[] = await response.json();
    return feedback;
  } catch (error) {
    console.error('Get customer feedback error:', error);
    throw error;
  }
}

/**
 * Update feedback status
 * @param feedbackId - Feedback UUID
 * @param data - Update data
 * @returns Promise with updated feedback
 */
export async function updateFeedback(
  feedbackId: string,
  data: UpdateFeedbackData
): Promise<CustomerFeedback> {
  try {
    const response = await apiRequest(`/crm/feedback/${feedbackId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update feedback');
    }

    const feedback: CustomerFeedback = await response.json();
    return feedback;
  } catch (error) {
    console.error('Update feedback error:', error);
    throw error;
  }
}

/**
 * Search customers by phone number
 * @param phone - Phone number (will be normalized)
 * @returns Promise with customer if found, null otherwise
 */
export async function findCustomerByPhone(phone: string): Promise<Customer | null> {
  try {
    // Normalize phone number (digits only)
    const normalizedPhone = phone.replace(/\D/g, '');
    
    if (normalizedPhone.length < 10) {
      return null;
    }

    const response = await getCustomers({ search: normalizedPhone, size: 1 });
    
    // Check if customer with matching phone exists
    const customer = response.customers.find(c => c.phone === normalizedPhone);
    return customer || null;
  } catch (error) {
    console.error('Find customer by phone error:', error);
    return null;
  }
}

/**
 * Normalize phone number (remove non-digits)
 * @param phone - Phone number string
 * @returns Normalized phone number
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '');
}

/**
 * Get redemption preview for a customer
 * @param customerId - Customer UUID
 * @param billAmount - Bill amount
 * @returns Promise with redemption preview
 */
export async function getRedemptionPreview(
  customerId: string,
  billAmount: number
): Promise<{
  availablePoints: number;
  maxRedeemablePoints: number;
  maxDiscountAmount: number;
  redemptionRate: number;
  minRedemptionPoints: number;
}> {
  try {
    const response = await apiRequest(
      `/crm/loyalty/redeem-preview?customerId=${customerId}&billAmount=${billAmount}`,
      {
        method: 'GET',
      },
      true // requiresOutlet: true
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to get redemption preview');
    }

    const preview = await response.json();
    return preview;
  } catch (error) {
    console.error('Get redemption preview error:', error);
    throw error;
  }
}

/**
 * Redeem loyalty points
 * @param customerId - Customer UUID
 * @param pointsToRedeem - Points to redeem
 * @param billAmount - Bill amount
 * @returns Promise with redemption result
 */
export async function redeemPoints(
  customerId: string,
  pointsToRedeem: number,
  billAmount: number
): Promise<{
  discountAmount: number;
  pointsUsed: number;
  remainingPoints: number;
  loyaltyAccount: {
    id: string;
    points: number;
    tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  };
}> {
  try {
    const response = await apiRequest('/crm/loyalty/redeem', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        pointsToRedeem,
        billAmount,
      }),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to redeem points');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Redeem points error:', error);
    throw error;
  }
}

/**
 * Get loyalty transaction history
 * @param customerId - Customer UUID
 * @param limit - Number of transactions to fetch
 * @param offset - Offset for pagination
 * @returns Promise with transaction history
 */
export async function getLoyaltyTransactionHistory(
  customerId: string,
  limit: number = 50,
  offset: number = 0
): Promise<{
  transactions: Array<{
    id: string;
    type: 'EARNED' | 'REDEEMED' | 'ADJUSTED';
    points: number;
    billAmount?: number;
    discountAmount?: number;
    pointsBefore: number;
    pointsAfter: number;
    createdAt: string;
  }>;
  total: number;
}> {
  try {
    const params = new URLSearchParams();
    if (limit) params.set('limit', limit.toString());
    if (offset) params.set('offset', offset.toString());
    const query = params.toString();

    const response = await apiRequest(
      `/crm/loyalty/transactions/${customerId}${query ? `?${query}` : ''}`,
      {
        method: 'GET',
      },
      true // requiresOutlet: true
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load transaction history');
    }

    const history = await response.json();
    return history;
  } catch (error) {
    console.error('Get loyalty transaction history error:', error);
    throw error;
  }
}

/**
 * Adjust customer loyalty points manually
 * @param customerId - Customer UUID
 * @param points - Points to add (positive) or deduct (negative)
 * @param description - Optional description
 * @returns Promise with adjustment result
 */
export async function adjustLoyaltyPoints(
  customerId: string,
  points: number,
  description?: string
): Promise<{
  loyaltyAccount: {
    id: string;
    points: number;
    tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  };
  pointsBefore: number;
  pointsAfter: number;
}> {
  try {
    const response = await apiRequest('/crm/loyalty/adjust-points', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        points,
        description,
      }),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to adjust points');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Adjust loyalty points error:', error);
    throw error;
  }
}

/**
 * Get all rewards
 * @param activeOnly - Only return active rewards
 * @returns Promise with array of rewards
 */
export async function getRewards(activeOnly?: boolean): Promise<Array<{
  id: string;
  name: string;
  description?: string;
  type: 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_ITEM' | 'CASHBACK';
  pointsRequired: number;
  discountPercentage?: number;
  discountAmount?: number;
  freeItemName?: string;
  cashbackAmount?: number;
  isActive: boolean;
  maxRedemptions?: number;
  totalRedemptions: number;
}>> {
  try {
    const params = new URLSearchParams();
    if (activeOnly) params.set('activeOnly', 'true');
    const query = params.toString();

    const response = await apiRequest(
      `/crm/rewards${query ? `?${query}` : ''}`,
      {
        method: 'GET',
      },
      true // requiresOutlet: true
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load rewards');
    }

    const rewards = await response.json();
    return rewards;
  } catch (error) {
    console.error('Get rewards error:', error);
    throw error;
  }
}

/**
 * Get eligible rewards for a customer based on bill amount
 * @param customerId - Customer UUID
 * @param billAmount - Bill amount
 * @returns Promise with array of eligible rewards
 */
export async function getEligibleRewards(
  customerId: string,
  billAmount: number
): Promise<Array<{
  id: string;
  name: string;
  description?: string;
  type: 'DISCOUNT_PERCENTAGE' | 'DISCOUNT_FIXED' | 'FREE_ITEM' | 'CASHBACK';
  pointsRequired: number;
  discountPercentage?: number;
  discountAmount?: number;
  freeItemName?: string;
  cashbackAmount?: number;
  minOrderValue?: number;
  maxDiscountAmount?: number;
}>> {
  try {
    const response = await apiRequest(
      `/crm/rewards/eligible?customerId=${customerId}&billAmount=${billAmount}`,
      {
        method: 'GET',
      },
      true // requiresOutlet: true
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch eligible rewards');
    }

    const rewards = await response.json();
    return rewards;
  } catch (error) {
    console.error('Get eligible rewards error:', error);
    throw error;
  }
}

/**
 * Redeem a reward for a customer
 * @param customerId - Customer UUID
 * @param rewardId - Reward UUID
 * @param billAmount - Bill amount
 * @param description - Optional description
 * @returns Promise with redemption result
 */
export async function redeemReward(
  customerId: string,
  rewardId: string,
  billAmount: number,
  description?: string
): Promise<{
  reward: any;
  loyaltyAccount: {
    id: string;
    points: number;
    tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  };
  pointsUsed: number;
  discountAmount: number;
  pointsAfter: number;
}> {
  try {
    const response = await apiRequest('/crm/rewards/redeem', {
      method: 'POST',
      body: JSON.stringify({
        customerId,
        rewardId,
        billAmount,
        description,
      }),
    }, true); // requiresOutlet: true

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to redeem reward');
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Redeem reward error:', error);
    throw error;
  }
}

