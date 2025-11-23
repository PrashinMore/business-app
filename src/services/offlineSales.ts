/**
 * Offline Sales Service
 * 
 * Handles queuing sales when offline and syncing when back online
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { CreateSaleRequest, Sale } from '../types/menu';
import { checkout } from './menu';

const OFFLINE_SALES_QUEUE_KEY = 'offline_sales_queue';
const SYNC_IN_PROGRESS_KEY = 'sync_in_progress';

export interface QueuedSale {
  id: string; // Local UUID
  saleData: CreateSaleRequest;
  createdAt: string; // When it was queued
  retryCount: number;
}

/**
 * Generate a local UUID for queued sales
 */
function generateLocalId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get all queued offline sales
 */
export async function getQueuedSales(): Promise<QueuedSale[]> {
  try {
    const queueData = await AsyncStorage.getItem(OFFLINE_SALES_QUEUE_KEY);
    if (!queueData) return [];
    return JSON.parse(queueData);
  } catch (error) {
    console.error('Failed to get queued sales:', error);
    return [];
  }
}

/**
 * Add a sale to the offline queue
 */
export async function queueSale(saleData: CreateSaleRequest): Promise<string> {
  try {
    const queuedSales = await getQueuedSales();
    const queuedSale: QueuedSale = {
      id: generateLocalId(),
      saleData,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };

    queuedSales.push(queuedSale);
    await AsyncStorage.setItem(OFFLINE_SALES_QUEUE_KEY, JSON.stringify(queuedSales));
    return queuedSale.id;
  } catch (error) {
    console.error('Failed to queue sale:', error);
    throw error;
  }
}

/**
 * Remove a sale from the queue (after successful sync)
 */
export async function removeQueuedSale(saleId: string): Promise<void> {
  try {
    const queuedSales = await getQueuedSales();
    const filtered = queuedSales.filter(sale => sale.id !== saleId);
    await AsyncStorage.setItem(OFFLINE_SALES_QUEUE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove queued sale:', error);
  }
}

/**
 * Update retry count for a queued sale
 */
export async function updateQueuedSaleRetry(saleId: string, retryCount: number): Promise<void> {
  try {
    const queuedSales = await getQueuedSales();
    const updated = queuedSales.map(sale => 
      sale.id === saleId ? { ...sale, retryCount } : sale
    );
    await AsyncStorage.setItem(OFFLINE_SALES_QUEUE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to update queued sale retry:', error);
  }
}

/**
 * Check if device is online
 */
export async function isOnline(): Promise<boolean> {
  try {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  } catch (error) {
    console.error('Failed to check network status:', error);
    return false;
  }
}

/**
 * Get network state
 */
export async function getNetworkState(): Promise<{ isConnected: boolean; type: string }> {
  try {
    const netInfo = await NetInfo.fetch();
    return {
      isConnected: netInfo.isConnected ?? false,
      type: netInfo.type || 'unknown',
    };
  } catch (error) {
    console.error('Failed to get network state:', error);
    return { isConnected: false, type: 'unknown' };
  }
}

/**
 * Check if sync is in progress
 */
async function isSyncInProgress(): Promise<boolean> {
  try {
    const syncStatus = await AsyncStorage.getItem(SYNC_IN_PROGRESS_KEY);
    return syncStatus === 'true';
  } catch {
    return false;
  }
}

/**
 * Set sync in progress flag
 */
async function setSyncInProgress(inProgress: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_IN_PROGRESS_KEY, inProgress ? 'true' : 'false');
  } catch (error) {
    console.error('Failed to set sync status:', error);
  }
}

/**
 * Sync a single queued sale
 */
async function syncQueuedSale(queuedSale: QueuedSale): Promise<boolean> {
  try {
    const sale = await checkout(queuedSale.saleData);
    await removeQueuedSale(queuedSale.id);
    console.log(`Successfully synced sale ${queuedSale.id}`);
    return true;
  } catch (error: any) {
    // If it's a validation error (400), remove from queue
    // Otherwise, increment retry count
    if (error?.message?.includes('400') || error?.message?.includes('Bad Request')) {
      console.error(`Sale ${queuedSale.id} failed validation, removing from queue:`, error);
      await removeQueuedSale(queuedSale.id);
      return false;
    }

    const newRetryCount = queuedSale.retryCount + 1;
    await updateQueuedSaleRetry(queuedSale.id, newRetryCount);
    console.error(`Failed to sync sale ${queuedSale.id}, retry count: ${newRetryCount}`, error);
    return false;
  }
}

/**
 * Sync all queued offline sales
 * This should be called when the app comes back online
 */
export async function syncQueuedSales(): Promise<{ synced: number; failed: number }> {
  const result = { synced: 0, failed: 0 };

  try {
    // Check if already syncing
    if (await isSyncInProgress()) {
      console.log('Sync already in progress, skipping...');
      return result;
    }

    // Check if online
    const online = await isOnline();
    if (!online) {
      console.log('Device is offline, cannot sync sales');
      return result;
    }

    // Check if there are queued sales
    const queuedSales = await getQueuedSales();
    if (queuedSales.length === 0) {
      return result;
    }

    await setSyncInProgress(true);

    console.log(`Starting sync of ${queuedSales.length} queued sales...`);

    // Sync each sale
    for (const queuedSale of queuedSales) {
      const success = await syncQueuedSale(queuedSale);
      if (success) {
        result.synced++;
      } else {
        result.failed++;
      }

      // Small delay between syncs to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`Sync completed: ${result.synced} synced, ${result.failed} failed`);
  } catch (error) {
    console.error('Error during sync:', error);
  } finally {
    await setSyncInProgress(false);
  }

  return result;
}

/**
 * Clear all queued sales (use with caution)
 */
export async function clearQueuedSales(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OFFLINE_SALES_QUEUE_KEY);
    await AsyncStorage.removeItem(SYNC_IN_PROGRESS_KEY);
  } catch (error) {
    console.error('Failed to clear queued sales:', error);
  }
}

/**
 * Get count of queued sales
 */
export async function getQueuedSalesCount(): Promise<number> {
  const queuedSales = await getQueuedSales();
  return queuedSales.length;
}

