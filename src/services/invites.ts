/**
 * Invites Service
 * 
 * Handles all organization invite operations
 */

import { apiRequest } from './auth';
import { OrganizationInvite } from '../types/invites';

/**
 * Get all pending invites for current user
 * @returns Promise with array of pending invites
 */
export async function getMyInvites(): Promise<OrganizationInvite[]> {
  try {
    const response = await apiRequest('/invites/my', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load invites');
    }

    const invites: OrganizationInvite[] = await response.json();
    return invites;
  } catch (error) {
    console.error('Get my invites error:', error);
    throw error;
  }
}

/**
 * Get all invites for an organization (admin only)
 * @param organizationId - Organization UUID
 * @returns Promise with array of invites
 */
export async function getOrganizationInvites(organizationId: string): Promise<OrganizationInvite[]> {
  try {
    const response = await apiRequest(`/invites/organization/${organizationId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load organization invites');
    }

    const invites: OrganizationInvite[] = await response.json();
    return invites;
  } catch (error) {
    console.error('Get organization invites error:', error);
    throw error;
  }
}

/**
 * Create an invite (admin only)
 * @param organizationId - Organization UUID
 * @param email - Email address to invite
 * @returns Promise with created invite
 */
export async function createInvite(organizationId: string, email: string): Promise<OrganizationInvite> {
  try {
    const response = await apiRequest(`/invites/organization/${organizationId}`, {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create invite');
    }

    const invite: OrganizationInvite = await response.json();
    return invite;
  } catch (error) {
    console.error('Create invite error:', error);
    throw error;
  }
}

/**
 * Respond to invite by ID
 * @param inviteId - Invite UUID
 * @param action - 'accept' or 'decline'
 * @returns Promise with updated invite
 */
export async function respondToInviteById(inviteId: string, action: 'accept' | 'decline'): Promise<OrganizationInvite> {
  try {
    const response = await apiRequest(`/invites/${inviteId}/respond`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to respond to invite');
    }

    const invite: OrganizationInvite = await response.json();
    return invite;
  } catch (error) {
    console.error('Respond to invite error:', error);
    throw error;
  }
}

/**
 * Respond to invite by token (for email links)
 * @param token - Invite token
 * @param action - 'accept' or 'decline'
 * @returns Promise with updated invite
 */
export async function respondToInviteByToken(token: string, action: 'accept' | 'decline'): Promise<OrganizationInvite> {
  try {
    const response = await apiRequest('/invites/token/respond', {
      method: 'POST',
      body: JSON.stringify({ token, action }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to respond to invite');
    }

    const invite: OrganizationInvite = await response.json();
    return invite;
  } catch (error) {
    console.error('Respond to invite by token error:', error);
    throw error;
  }
}

/**
 * Cancel an invite (admin only)
 * @param inviteId - Invite UUID
 */
export async function cancelInvite(inviteId: string): Promise<void> {
  try {
    const response = await apiRequest(`/invites/${inviteId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to cancel invite');
    }
  } catch (error) {
    console.error('Cancel invite error:', error);
    throw error;
  }
}

/**
 * Resend an invite (admin only)
 * Generates new token and extends expiry by 7 days
 * @param inviteId - Invite UUID
 * @returns Promise with updated invite
 */
export async function resendInvite(inviteId: string): Promise<OrganizationInvite> {
  try {
    const response = await apiRequest(`/invites/${inviteId}/resend`, {
      method: 'POST',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to resend invite');
    }

    const invite: OrganizationInvite = await response.json();
    return invite;
  } catch (error) {
    console.error('Resend invite error:', error);
    throw error;
  }
}

