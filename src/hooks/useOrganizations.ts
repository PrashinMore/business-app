import { useState, useEffect } from 'react';
import {
  Organization,
  CreateOrganizationData,
  UpdateOrganizationData
} from '../types/organizations';
import * as organizationsApi from '../services/organizations';

interface UseOrganizationsOptions {
  autoLoad?: boolean;
}

interface UseOrganizationsReturn {
  // Data
  organizations: Organization[];
  organizationDetails: Organization | null;

  // Loading states
  loading: boolean;
  detailsLoading: boolean;

  // Error states
  error: string | null;
  detailsError: string | null;

  // Actions
  createOrganization: (data: CreateOrganizationData) => Promise<Organization>;
  updateOrganization: (id: string, data: UpdateOrganizationData) => Promise<Organization>;
  deleteOrganization: (id: string) => Promise<void>;
  loadOrganizationDetails: (id: string) => Promise<void>;
  assignUser: (organizationId: string, userId: string) => Promise<Organization>;
  removeUser: (organizationId: string, userId: string) => Promise<Organization>;

  // Utility functions
  refreshOrganizations: () => Promise<void>;
  clearError: () => void;
}

export function useOrganizations(options: UseOrganizationsOptions = {}): UseOrganizationsReturn {
  const { autoLoad = true } = options;

  // Data state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationDetails, setOrganizationDetails] = useState<Organization | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Error states
  const [error, setError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Load organizations
  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await organizationsApi.getOrganizations();
      setOrganizations(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organizations';
      setError(errorMessage);
      console.error('Load organizations error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load organization details
  const loadOrganizationDetails = async (id: string) => {
    try {
      setDetailsLoading(true);
      setDetailsError(null);
      const data = await organizationsApi.getOrganizationById(id);
      setOrganizationDetails(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organization details';
      setDetailsError(errorMessage);
      console.error('Load organization details error:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Create organization
  const createOrganization = async (data: CreateOrganizationData): Promise<Organization> => {
    try {
      const newOrganization = await organizationsApi.createOrganization(data);
      setOrganizations(prev => [newOrganization, ...prev]);
      return newOrganization;
    } catch (err) {
      throw err;
    }
  };

  // Update organization
  const updateOrganization = async (id: string, updates: UpdateOrganizationData): Promise<Organization> => {
    try {
      const updatedOrganization = await organizationsApi.updateOrganization(id, updates);
      setOrganizations(prev => prev.map(org => org.id === id ? updatedOrganization : org));
      // Also update details if this organization is currently loaded
      if (organizationDetails?.id === id) {
        setOrganizationDetails(updatedOrganization);
      }
      return updatedOrganization;
    } catch (err) {
      throw err;
    }
  };

  // Delete organization
  const deleteOrganization = async (id: string): Promise<void> => {
    try {
      await organizationsApi.deleteOrganization(id);
      setOrganizations(prev => prev.filter(org => org.id !== id));
      // Clear details if this organization was loaded
      if (organizationDetails?.id === id) {
        setOrganizationDetails(null);
      }
    } catch (err) {
      throw err;
    }
  };

  // Assign user to organization
  const assignUser = async (organizationId: string, userId: string): Promise<Organization> => {
    try {
      const updatedOrganization = await organizationsApi.assignUserToOrganization(organizationId, userId);
      setOrganizations(prev => prev.map(org =>
        org.id === organizationId ? updatedOrganization : org
      ));
      // Update details if this organization is currently loaded
      if (organizationDetails?.id === organizationId) {
        setOrganizationDetails(updatedOrganization);
      }
      return updatedOrganization;
    } catch (err) {
      throw err;
    }
  };

  // Remove user from organization
  const removeUser = async (organizationId: string, userId: string): Promise<Organization> => {
    try {
      const updatedOrganization = await organizationsApi.removeUserFromOrganization(organizationId, userId);
      setOrganizations(prev => prev.map(org =>
        org.id === organizationId ? updatedOrganization : org
      ));
      // Update details if this organization is currently loaded
      if (organizationDetails?.id === organizationId) {
        setOrganizationDetails(updatedOrganization);
      }
      return updatedOrganization;
    } catch (err) {
      throw err;
    }
  };

  // Refresh functions
  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  // Clear error
  const clearError = () => {
    setError(null);
    setDetailsError(null);
  };

  // Effect to load organizations on mount
  useEffect(() => {
    if (autoLoad) {
      loadOrganizations();
    }
  }, [autoLoad]);

  return {
    // Data
    organizations,
    organizationDetails,

    // Loading states
    loading,
    detailsLoading,

    // Error states
    error,
    detailsError,

    // Actions
    createOrganization,
    updateOrganization,
    deleteOrganization,
    loadOrganizationDetails,
    assignUser,
    removeUser,

    // Utility functions
    refreshOrganizations,
    clearError,
  };
}
