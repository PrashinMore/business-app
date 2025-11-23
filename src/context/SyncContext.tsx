/**
 * Sync Context
 * 
 * Monitors network state and automatically syncs queued sales when back online
 */

import React, { createContext, useState, useEffect, ReactNode } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { syncQueuedSales, getQueuedSalesCount, getQueuedSales } from '../services/offlineSales';

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  queuedSalesCount: number;
  lastSyncTime: Date | null;
  manualSync: () => Promise<void>;
}

export const SyncContext = createContext<SyncContextType | undefined>(undefined);

interface SyncProviderProps {
  children: ReactNode;
}

export const SyncProvider: React.FC<SyncProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [queuedSalesCount, setQueuedSalesCount] = useState<number>(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Check network state and queue count on mount
  useEffect(() => {
    checkNetworkState();
    updateQueuedCount();

    // Set up network state listener
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected ?? false;
      
      setIsOnline(nowOnline);

      // If we just came back online, sync queued sales
      if (wasOffline && nowOnline && queuedSalesCount > 0) {
        console.log('Device back online, syncing queued sales...');
        performSync();
      }
    });

    // Check queue count periodically (every 30 seconds)
    const queueCheckInterval = setInterval(() => {
      updateQueuedCount();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(queueCheckInterval);
    };
  }, [isOnline, queuedSalesCount]);

  const checkNetworkState = async () => {
    try {
      const netInfo = await NetInfo.fetch();
      setIsOnline(netInfo.isConnected ?? false);
    } catch (error) {
      console.error('Failed to check network state:', error);
      setIsOnline(false);
    }
  };

  const updateQueuedCount = async () => {
    try {
      const count = await getQueuedSalesCount();
      setQueuedSalesCount(count);
    } catch (error) {
      console.error('Failed to update queued count:', error);
    }
  };

  const performSync = async () => {
    if (isSyncing) {
      console.log('Sync already in progress, skipping...');
      return;
    }

    if (!isOnline) {
      console.log('Device is offline, cannot sync');
      return;
    }

    try {
      setIsSyncing(true);
      const result = await syncQueuedSales();
      setLastSyncTime(new Date());
      
      // Update queued count after sync
      await updateQueuedCount();
      
      if (result.synced > 0) {
        console.log(`Successfully synced ${result.synced} sales`);
      }
      
      if (result.failed > 0) {
        console.warn(`${result.failed} sales failed to sync`);
      }
    } catch (error) {
      console.error('Error during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const manualSync = async () => {
    await performSync();
  };

  const value: SyncContextType = {
    isOnline,
    isSyncing,
    queuedSalesCount,
    lastSyncTime,
    manualSync,
  };

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
};

export const useSync = () => {
  const context = React.useContext(SyncContext);
  if (context === undefined) {
    throw new Error('useSync must be used within a SyncProvider');
  }
  return context;
};

