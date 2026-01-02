/**
 * Outlets Service
 * 
 * Handles all outlet management API calls
 */

import { apiRequest } from './auth';
import { Outlet, CreateOutletData, UpdateOutletData } from '../types/outlets';

/**
 * Get all outlets for the user's organization(s)
 * @returns Promise with array of outlets
 */
export async function getOutlets(): Promise<Outlet[]> {
  try {
    const response = await apiRequest('/outlets', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load outlets');
    }

    const outlets: Outlet[] = await response.json();
    return outlets;
  } catch (error) {
    console.error('Get outlets error:', error);
    throw error;
  }
}

/**
 * Get outlet details by ID
 * @param outletId - Outlet UUID
 * @returns Promise with outlet details
 */
export async function getOutletDetails(outletId: string): Promise<Outlet> {
  try {
    const response = await apiRequest(`/outlets/${outletId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load outlet details');
    }

    const outlet: Outlet = await response.json();
    return outlet;
  } catch (error) {
    console.error('Get outlet details error:', error);
    throw error;
  }
}

/**
 * Create a new outlet
 * @param data - Outlet creation data
 * @returns Promise with created outlet
 */
export async function createOutlet(data: CreateOutletData): Promise<Outlet> {
  try {
    const response = await apiRequest('/outlets', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create outlet');
    }

    const outlet: Outlet = await response.json();
    return outlet;
  } catch (error) {
    console.error('Create outlet error:', error);
    throw error;
  }
}

/**
 * Update an existing outlet
 * @param outletId - Outlet UUID
 * @param data - Outlet update data
 * @returns Promise with updated outlet
 */
export async function updateOutlet(
  outletId: string,
  data: UpdateOutletData
): Promise<Outlet> {
  try {
    const response = await apiRequest(`/outlets/${outletId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update outlet');
    }

    const outlet: Outlet = await response.json();
    return outlet;
  } catch (error) {
    console.error('Update outlet error:', error);
    throw error;
  }
}

/**
 * Delete (soft delete) an outlet
 * @param outletId - Outlet UUID
 * @returns Promise<void>
 */
export async function deleteOutlet(outletId: string): Promise<void> {
  try {
    const response = await apiRequest(`/outlets/${outletId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete outlet');
    }
  } catch (error) {
    console.error('Delete outlet error:', error);
    throw error;
  }
}

