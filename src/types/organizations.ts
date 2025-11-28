/**
 * Organization Management Types
 *
 * Based on the Organizations API documentation
 */

export interface Organization {
  id: string;                    // UUID
  name: string;                  // Max 255 characters
  description?: string | null;   // Optional text
  createdAt: string;             // ISO 8601 timestamp
  updatedAt: string;             // ISO 8601 timestamp
  users?: User[];                // Array of users (when relations loaded)
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'staff';
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationData {
  name: string;        // Required, max 255 characters
  description?: string | null; // Optional
}

export interface UpdateOrganizationData {
  name?: string;              // Optional
  description?: string | null; // Optional
}
