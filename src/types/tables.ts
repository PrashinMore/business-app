/**
 * Table Management Types
 * 
 * Type definitions for table management functionality
 */

// Re-export Sale type from sales for table order references
import { Sale } from './sales';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING' | 'BLOCKED';

export interface DiningTable {
  id: string;
  name: string;
  capacity: number;
  area?: string | null;
  status: TableStatus;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}

export interface DiningTableWithOrders extends DiningTable {
  activeOrder?: Sale;
  orderHistory?: Sale[];
}

export interface CreateTableDto {
  name: string;
  capacity: number;
  area?: string;
}

export interface UpdateTableDto {
  name?: string;
  capacity?: number;
  area?: string;
  isActive?: boolean;
}

export interface UpdateTableStatusDto {
  status: TableStatus;
}

export interface AssignTableDto {
  tableId: string;
}

export interface SwitchTableDto {
  toTableId: string;
}

export interface MergeTablesDto {
  sourceTableIds: string[];
  targetTableId: string;
}

export interface AssignTableResponse {
  sale: Sale;
  table: DiningTable;
}

export interface SwitchTableResponse {
  sale: Sale;
  fromTable: DiningTable | null;
  toTable: DiningTable;
}

export interface MergeTablesResponse {
  targetTable: DiningTable;
  sourceTables: DiningTable[];
}

