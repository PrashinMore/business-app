/**
 * Outlet Types
 * 
 * Type definitions for outlet management
 */

export interface Outlet {
  id: string;                    // UUID
  organizationId: string;        // UUID of parent organization
  name: string;                  // Outlet name (e.g., "Downtown Branch")
  address?: string | null;       // Physical address
  contactNumber?: string | null; // Contact phone number
  isActive: boolean;             // Whether outlet is active
  isPrimary: boolean;            // Whether this is the primary outlet
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
}

export interface CreateOutletData {
  name: string;
  address?: string;
  contactNumber?: string;
  isPrimary?: boolean;
}

export interface UpdateOutletData {
  name?: string;
  address?: string;
  contactNumber?: string;
  isActive?: boolean;
  isPrimary?: boolean;
}

