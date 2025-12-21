/**
 * Tables Service
 * 
 * Handles all table management API calls
 * Based on table_api_docs.md
 */

import { apiRequest } from './auth';
import { Sale } from '../types/sales';
import {
  DiningTable,
  DiningTableWithOrders,
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStatusDto,
  AssignTableDto,
  SwitchTableDto,
  MergeTablesDto,
  AssignTableResponse,
  SwitchTableResponse,
  MergeTablesResponse,
} from '../types/tables';

/**
 * List all tables for the user's organization
 * @returns Promise with array of tables
 */
export async function getTables(): Promise<DiningTable[]> {
  try {
    const response = await apiRequest('/tables', {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load tables');
    }

    const tables: DiningTable[] = await response.json();
    return tables;
  } catch (error) {
    console.error('Get tables error:', error);
    throw error;
  }
}

/**
 * Get table details with active order and order history
 * @param tableId - Table UUID
 * @returns Promise with table details including orders
 */
export async function getTableById(tableId: string): Promise<DiningTableWithOrders> {
  try {
    const response = await apiRequest(`/tables/${tableId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load table details');
    }

    const table: DiningTableWithOrders = await response.json();
    return table;
  } catch (error) {
    console.error('Get table by id error:', error);
    throw error;
  }
}

/**
 * Get the active (unpaid) sale/order for a specific table
 * @param tableId - Table UUID
 * @returns Promise with active sale or null if no active order
 */
export async function getActiveSaleForTable(tableId: string): Promise<Sale | null> {
  try {
    const response = await apiRequest(`/tables/${tableId}/active-sale`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load active sale for table');
    }

    const sale: Sale | null = await response.json();
    return sale;
  } catch (error) {
    console.error('Get active sale for table error:', error);
    throw error;
  }
}

/**
 * Create a new table
 * @param tableData - Table creation data
 * @returns Promise with created table
 */
export async function createTable(tableData: CreateTableDto): Promise<DiningTable> {
  try {
    const response = await apiRequest('/tables', {
      method: 'POST',
      body: JSON.stringify(tableData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create table');
    }

    const table: DiningTable = await response.json();
    return table;
  } catch (error) {
    console.error('Create table error:', error);
    throw error;
  }
}

/**
 * Update table information
 * @param tableId - Table UUID
 * @param tableData - Table update data
 * @returns Promise with updated table
 */
export async function updateTable(
  tableId: string,
  tableData: UpdateTableDto
): Promise<DiningTable> {
  try {
    const response = await apiRequest(`/tables/${tableId}`, {
      method: 'PATCH',
      body: JSON.stringify(tableData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update table');
    }

    const table: DiningTable = await response.json();
    return table;
  } catch (error) {
    console.error('Update table error:', error);
    throw error;
  }
}

/**
 * Delete a table (soft delete - sets isActive to false)
 * Cannot delete if table has active orders
 * @param tableId - Table UUID
 * @returns Promise<void>
 */
export async function deleteTable(tableId: string): Promise<void> {
  try {
    const response = await apiRequest(`/tables/${tableId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete table');
    }
  } catch (error) {
    console.error('Delete table error:', error);
    throw error;
  }
}

/**
 * Update table status
 * @param tableId - Table UUID
 * @param statusData - Status update data
 * @returns Promise with updated table
 */
export async function updateTableStatus(
  tableId: string,
  statusData: UpdateTableStatusDto
): Promise<DiningTable> {
  try {
    const response = await apiRequest(`/tables/${tableId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(statusData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update table status');
    }

    const table: DiningTable = await response.json();
    return table;
  } catch (error) {
    console.error('Update table status error:', error);
    throw error;
  }
}

/**
 * Assign a table to an existing sale/order
 * @param saleId - Sale UUID
 * @param assignData - Table assignment data
 * @returns Promise with sale and table
 */
export async function assignTableToSale(
  saleId: string,
  assignData: AssignTableDto
): Promise<AssignTableResponse> {
  try {
    const response = await apiRequest(`/tables/sales/${saleId}/assign`, {
      method: 'POST',
      body: JSON.stringify(assignData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to assign table to sale');
    }

    const result: AssignTableResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Assign table to sale error:', error);
    throw error;
  }
}

/**
 * Switch a sale from one table to another
 * @param saleId - Sale UUID
 * @param switchData - Table switch data
 * @returns Promise with sale and both tables
 */
export async function switchTable(
  saleId: string,
  switchData: SwitchTableDto
): Promise<SwitchTableResponse> {
  try {
    const response = await apiRequest(`/tables/sales/${saleId}/switch`, {
      method: 'POST',
      body: JSON.stringify(switchData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to switch table');
    }

    const result: SwitchTableResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Switch table error:', error);
    throw error;
  }
}

/**
 * Merge multiple tables by moving all active orders to a target table
 * @param mergeData - Table merge data
 * @returns Promise with merged tables information
 */
export async function mergeTables(
  mergeData: MergeTablesDto
): Promise<MergeTablesResponse> {
  try {
    const response = await apiRequest('/tables/merge', {
      method: 'POST',
      body: JSON.stringify(mergeData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to merge tables');
    }

    const result: MergeTablesResponse = await response.json();
    return result;
  } catch (error) {
    console.error('Merge tables error:', error);
    throw error;
  }
}

