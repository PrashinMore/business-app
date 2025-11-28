/**
 * Organizations Service
 *
 * Handles all organization management operations
 * Requires admin role for all operations
 */

import { API_BASE_URL } from '../config/api';
import { apiRequest } from './auth';
import {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData
} from '../types/organizations';

/**
 * Get all organizations (admin only)
 */
export async function getOrganizations(): Promise<Organization[]> {
  try {
    const response = await apiRequest('/organizations', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load organizations');
    }

    const organizations: Organization[] = await response.json();
    return organizations;
  } catch (error) {
    console.error('Get organizations error:', error);
    throw error;
  }
}

/**
 * Get organization by ID with users (admin only)
 */
export async function getOrganizationById(organizationId: string): Promise<Organization> {
  try {
    const response = await apiRequest(`/organizations/${organizationId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load organization');
    }

    const organization: Organization = await response.json();
    return organization;
  } catch (error) {
    console.error('Get organization error:', error);
    throw error;
  }
}

/**
 * Create a new organization (admin only)
 */
export async function createOrganization(organizationData: CreateOrganizationData): Promise<Organization> {
  try {
    const response = await apiRequest('/organizations', {
      method: 'POST',
      body: JSON.stringify(organizationData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create organization');
    }

    const organization: Organization = await response.json();
    return organization;
  } catch (error) {
    console.error('Create organization error:', error);
    throw error;
  }
}

/**
 * Update an existing organization (admin only)
 */
export async function updateOrganization(
  organizationId: string,
  organizationData: UpdateOrganizationData
): Promise<Organization> {
  try {
    const response = await apiRequest(`/organizations/${organizationId}`, {
      method: 'PATCH',
      body: JSON.stringify(organizationData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update organization');
    }

    const organization: Organization = await response.json();
    return organization;
  } catch (error) {
    console.error('Update organization error:', error);
    throw error;
  }
}

/**
 * Delete an organization (admin only)
 */
export async function deleteOrganization(organizationId: string): Promise<void> {
  try {
    const response = await apiRequest(`/organizations/${organizationId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete organization');
    }
  } catch (error) {
    console.error('Delete organization error:', error);
    throw error;
  }
}

/**
 * Assign user to organization (admin only)
 */
export async function assignUserToOrganization(
  organizationId: string,
  userId: string
): Promise<Organization> {
  try {
    const response = await apiRequest(
      `/organizations/${organizationId}/users/${userId}`,
      {
        method: 'POST',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign user to organization');
    }

    const organization: Organization = await response.json();
    return organization;
  } catch (error) {
    console.error('Assign user to organization error:', error);
    throw error;
  }
}

/**
 * Remove user from organization (admin only)
 */
export async function removeUserFromOrganization(
  organizationId: string,
  userId: string
): Promise<Organization> {
  try {
    const response = await apiRequest(
      `/organizations/${organizationId}/users/${userId}`,
      {
        method: 'DELETE',
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to remove user from organization');
    }

    const organization: Organization = await response.json();
    return organization;
  } catch (error) {
    console.error('Remove user from organization error:', error);
    throw error;
  }
}

/**
 * Get user's organizations (helper function)
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  try {
    const organizations = await getOrganizations();
    return organizations.filter(org =>
      org.users?.some(user => user.id === userId)
    );
  } catch (error) {
    console.error('Get user organizations error:', error);
    throw error;
  }
}

/**
 * Get organizations with user count (loads full details)
 */
export async function getOrganizationsWithUserCount(): Promise<Array<Organization & { userCount: number }>> {
  try {
    // First get basic organization list
    const organizations = await getOrganizations();

    // Then fetch full details for each organization to get user count
    const orgsWithUsers = await Promise.all(
      organizations.map(org => getOrganizationById(org.id))
    );

    return orgsWithUsers.map(org => ({
      ...org,
      userCount: org.users?.length || 0,
    }));
  } catch (error) {
    console.error('Get organizations with user count error:', error);
    throw error;
  }
}
