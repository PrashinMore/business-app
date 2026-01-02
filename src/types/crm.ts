/**
 * CRM Types
 * 
 * Type definitions for Customer Relationship Management
 */

export interface Customer {
  id: string;                    // UUID
  organizationId: string;        // UUID
  name: string;                  // Customer name
  phone: string;                 // Phone number (primary identifier)
  email?: string | null;         // Email address
  birthday?: string | null;       // ISO date (YYYY-MM-DD)
  gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
  tags: string[];                // Array of tags
  totalVisits: number;           // Total number of visits
  totalSpend: number;            // Total amount spent
  avgOrderValue: number;         // Average order value
  lastVisitAt?: string | null;   // ISO timestamp
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
  loyaltyAccount?: LoyaltyAccount;
}

export interface CustomerVisit {
  id: string;                    // UUID
  customerId: string;            // UUID
  orderId?: string | null;       // Sale/Order UUID
  outletId?: string | null;      // Outlet UUID
  billAmount: number;            // Bill amount
  visitType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  visitedAt: string;            // ISO timestamp
  createdAt: string;             // ISO timestamp
}

export interface CustomerNote {
  id: string;                    // UUID
  customerId: string;            // UUID
  createdByUserId: string;       // UUID
  note: string;                  // Note text
  createdAt: string;             // ISO timestamp
  createdBy?: {                  // User who created the note
    id: string;
    name: string;
    email: string;
  };
}

export interface CustomerFeedback {
  id: string;                    // UUID
  customerId: string;            // UUID
  orderId?: string | null;       // Related order UUID
  rating: number;               // 1-5
  comment?: string | null;       // Feedback text
  status: 'OPEN' | 'RESOLVED';  // Status
  createdAt: string;             // ISO timestamp
}

export interface LoyaltyAccount {
  id: string;                    // UUID
  customerId: string;            // UUID
  points: number;               // Loyalty points
  tier: 'SILVER' | 'GOLD' | 'PLATINUM';
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}

export interface CreateCustomerData {
  name: string;
  phone: string;
  email?: string;
  birthday?: string; // YYYY-MM-DD
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  tags?: string[];
}

export interface UpdateCustomerData {
  name?: string;
  phone?: string;
  email?: string;
  birthday?: string; // YYYY-MM-DD
  gender?: 'MALE' | 'FEMALE' | 'OTHER';
  tags?: string[];
}

export interface CustomerFilters {
  search?: string;
  segment?: 'first-time' | 'regulars' | 'high-spenders' | 'inactive-30' | 'inactive-60';
  tag?: string;
  page?: number;
  size?: number;
}

export interface CustomerListResponse {
  customers: Customer[];
  total: number;
}

export interface CRMDashboardStats {
  totalCustomers: number;
  newCustomersLast7Days: number;
  repeatRate: number;
  avgVisitsPerCustomer: number;
}

export interface CreateCustomerNoteData {
  note: string;
}

export interface CreateCustomerFeedbackData {
  rating: number; // 1-5
  comment?: string;
  orderId?: string;
}

export interface UpdateFeedbackData {
  status: 'OPEN' | 'RESOLVED';
}

