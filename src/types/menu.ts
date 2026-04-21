/**
 * Inventory-behaviour flags for a product. These mirror the backend's
 * inventoryType enum (see RECIPE_INVENTORY_UPGRADE.md):
 *
 *  - NONE    — product never touches stock (e.g. service charges)
 *  - SIMPLE  — classic 1:1 deduction of this product's own stock row
 *  - RECIPE  — selling this dish deducts the ingredients defined in its recipe
 */
export type InventoryType = 'NONE' | 'SIMPLE' | 'RECIPE';

export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  /**
   * For SIMPLE + tracked products this is the outlet on-hand count. For
   * RECIPE/NONE products it is meaningless (backend returns 0 or nothing)
   * and must not be used to gate add-to-cart. Defaults to 0 when missing.
   */
  stock: number;
  unit: string;
  lowStockThreshold: number;
  imageUrl: string | null;
  /**
   * Master switch. When false, stock logic is skipped entirely for this
   * product regardless of inventoryType. Treat undefined as true for
   * backward compatibility with pre-upgrade products.
   */
  trackInventory?: boolean;
  /** See InventoryType. Defaults to 'SIMPLE' when undefined. */
  inventoryType?: InventoryType;
  /** Optional hint from the backend — also available via category.isRawMaterial. */
  isRawMaterial?: boolean;
  createdAt: string;
  updatedAt: string;
  isLowStock?: boolean;
}

export interface CartItem {
  productId: string;
  product: Product;
  quantity: number;
  sellingPrice: number;
}

export interface SaleItem {
  id: string;
  productId: string;
  quantity: number;
  sellingPrice: number;
  subtotal: number;
}

export interface Sale {
  id: string;
  date: string;
  items: SaleItem[];
  totalAmount: number | string; // Can be number or string (API returns string for some endpoints)
  soldBy: string;
  paymentType: 'cash' | 'UPI' | 'mixed' | string;
  cashAmount?: string | number;
  upiAmount?: string | number;
  isPaid: boolean;
  tableId?: string | null;
  organizationId: string;
  openedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
}

export interface CreateSaleRequest {
  date: string; // ISO 8601
  items: {
    productId: string;
    quantity: number;
    sellingPrice: number;
  }[];
  totalAmount: number;
  soldBy: string;
  paymentType?: 'cash' | 'UPI' | 'mixed';
  cashAmount?: number;
  upiAmount?: number;
  isPaid?: boolean;
  tableId?: string; // Optional table ID to assign table during sale creation
  // CRM fields
  customerId?: string; // Existing customer UUID
  customerPhone?: string; // Phone number (will create/find customer automatically)
  visitType?: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'; // Default: DINE_IN
  /** Set once per checkout; retries/offline sync send the same key so the server dedupes */
  idempotencyKey?: string;
}
