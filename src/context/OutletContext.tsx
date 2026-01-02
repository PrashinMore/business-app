import React, { createContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Outlet } from '../types/outlets';
import { getOutlets } from '../services/outlets';
import { useAuth } from './AuthContext';

interface OutletContextType {
  outlets: Outlet[];
  selectedOutlet: Outlet | null;
  loading: boolean;
  selectOutlet: (outlet: Outlet | null) => Promise<void>;
  refreshOutlets: () => Promise<void>;
  initializeOutlets: () => Promise<void>;
}

export const OutletContext = createContext<OutletContextType | undefined>(undefined);

interface OutletProviderProps {
  children: ReactNode;
}

const OUTLET_STORAGE_KEY = 'selectedOutletId';

export const OutletProvider: React.FC<OutletProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize outlets when user is authenticated
  useEffect(() => {
    if (isAuthenticated) {
      initializeOutlets();
    } else {
      // Clear outlets when user logs out
      setOutlets([]);
      setSelectedOutlet(null);
      setLoading(false);
    }
  }, [isAuthenticated]);

  /**
   * Initialize outlets - fetch and auto-select
   */
  const initializeOutlets = async () => {
    try {
      setLoading(true);
      const fetchedOutlets = await getOutlets();
      setOutlets(fetchedOutlets);

      if (fetchedOutlets.length === 0) {
        setSelectedOutlet(null);
        await AsyncStorage.removeItem(OUTLET_STORAGE_KEY);
        return;
      }

      // Auto-select logic
      let outletToSelect: Outlet | null = null;

      if (fetchedOutlets.length === 1) {
        // Only one outlet - auto-select
        outletToSelect = fetchedOutlets[0];
      } else if (fetchedOutlets.length > 1) {
        // Multiple outlets - check for saved selection
        const savedOutletId = await AsyncStorage.getItem(OUTLET_STORAGE_KEY);
        if (savedOutletId) {
          outletToSelect = fetchedOutlets.find(o => o.id === savedOutletId) || null;
        }

        // If no saved selection or saved outlet not found, use primary or first
        if (!outletToSelect) {
          outletToSelect = fetchedOutlets.find(o => o.isPrimary) || fetchedOutlets[0];
        }
      }

      // Store and set selected outlet
      if (outletToSelect) {
        await selectOutlet(outletToSelect);
      }
    } catch (error) {
      console.error('Failed to initialize outlets:', error);
      setOutlets([]);
      setSelectedOutlet(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Select an outlet and store it
   */
  const selectOutlet = async (outlet: Outlet | null) => {
    try {
      setSelectedOutlet(outlet);
      if (outlet) {
        await AsyncStorage.setItem(OUTLET_STORAGE_KEY, outlet.id);
      } else {
        await AsyncStorage.removeItem(OUTLET_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to store outlet selection:', error);
      // Still set the outlet even if storage fails
      setSelectedOutlet(outlet);
    }
  };

  /**
   * Refresh outlets list
   */
  const refreshOutlets = async () => {
    try {
      const fetchedOutlets = await getOutlets();
      setOutlets(fetchedOutlets);

      // Verify selected outlet still exists
      if (selectedOutlet) {
        const stillExists = fetchedOutlets.find(o => o.id === selectedOutlet.id);
        if (!stillExists) {
          // Selected outlet was deleted - auto-select another
          let newSelection: Outlet | null = null;
          if (fetchedOutlets.length > 0) {
            newSelection = fetchedOutlets.find(o => o.isPrimary) || fetchedOutlets[0];
          }
          await selectOutlet(newSelection);
        } else {
          // Update selected outlet with fresh data
          const updated = fetchedOutlets.find(o => o.id === selectedOutlet.id);
          if (updated) {
            setSelectedOutlet(updated);
          }
        }
      } else if (fetchedOutlets.length > 0) {
        // No outlet selected but outlets exist - auto-select
        const newSelection = fetchedOutlets.find(o => o.isPrimary) || fetchedOutlets[0];
        await selectOutlet(newSelection);
      }
    } catch (error) {
      console.error('Failed to refresh outlets:', error);
      throw error;
    }
  };

  const value: OutletContextType = {
    outlets,
    selectedOutlet,
    loading,
    selectOutlet,
    refreshOutlets,
    initializeOutlets,
  };

  return <OutletContext.Provider value={value}>{children}</OutletContext.Provider>;
};

export const useOutlet = () => {
  const context = React.useContext(OutletContext);
  if (context === undefined) {
    throw new Error('useOutlet must be used within an OutletProvider');
  }
  return context;
};

