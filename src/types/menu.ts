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
  totalAmount: number;
  soldBy: string;
  paymentType: string;
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
}

