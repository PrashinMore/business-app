export interface Product {
  id: string;
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  imageUrl: string | null;
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
  paymentType?: 'cash' | 'UPI';
  isPaid?: boolean;
  tableId?: string; // Optional table ID to assign table during sale creation
}

