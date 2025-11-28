/**
 * Category Types
 *
 * TypeScript interfaces for category management
 */

export interface Category {
  id: string;
  name: string;
  description?: string | null;
  isRawMaterial: boolean;
  products?: Product[];
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: string;
  sellingPrice: string;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  imageUrl?: string | null;
  organizationId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string | null;
  isRawMaterial?: boolean;
}

export interface UpdateCategoryData {
  name?: string;
  description?: string | null;
  isRawMaterial?: boolean;
}

