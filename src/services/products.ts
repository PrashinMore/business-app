/**
 * Products Service
 * 
 * Handles all product and inventory management operations
 */

import { API_BASE_URL } from '../config/api';
import { apiRequest } from './auth';
import { Product } from '../types/menu';

export interface ProductFilters {
  search?: string;
  category?: string;
  lowStock?: boolean;
}

export interface CreateProductData {
  name: string;
  category: string;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  unit: string;
  lowStockThreshold: number;
  imageUrl?: string | null;
}

export interface UpdateProductData {
  name?: string;
  category?: string;
  costPrice?: number;
  sellingPrice?: number;
  stock?: number;
  unit?: string;
  lowStockThreshold?: number;
  imageUrl?: string | null;
}

/**
 * Get product by ID
 */
export async function getProductById(productId: string): Promise<Product> {
  try {
    const response = await apiRequest(`/products/${productId}`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load product');
    }

    const product: Product = await response.json();
    return product;
  } catch (error) {
    console.error('Get product error:', error);
    throw error;
  }
}

/**
 * Get multiple products by IDs
 */
export async function getProductsByIds(productIds: string[]): Promise<Product[]> {
  try {
    // Fetch all products and filter by IDs
    const allProducts = await getProducts();
    return allProducts.filter(product => productIds.includes(product.id));
  } catch (error) {
    console.error('Get products by IDs error:', error);
    throw error;
  }
}

/**
 * Get all products with optional filters
 */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  try {
    const queryParams = new URLSearchParams();
    
    if (filters?.search) {
      queryParams.append('search', filters.search);
    }
    if (filters?.category) {
      queryParams.append('category', filters.category);
    }
    if (filters?.lowStock) {
      queryParams.append('lowStock', 'true');
    }

    const queryString = queryParams.toString();
    const endpoint = `/products${queryString ? `?${queryString}` : ''}`;

    const response = await apiRequest(endpoint, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to load products');
    }

    const products: Product[] = await response.json();
    return products;
  } catch (error) {
    console.error('Get products error:', error);
    throw error;
  }
}

/**
 * Create a new product
 * @param productData - Product data
 * @param imageFile - Optional image file (FormData will be used if provided)
 */
export async function createProduct(
  productData: CreateProductData,
  imageFile?: any
): Promise<Product> {
  try {
    let response: Response;

    if (imageFile) {
      // Use FormData for image upload
      const formData = new FormData();
      formData.append('name', productData.name);
      formData.append('category', productData.category);
      formData.append('costPrice', productData.costPrice.toString());
      formData.append('sellingPrice', productData.sellingPrice.toString());
      formData.append('stock', productData.stock.toString());
      formData.append('unit', productData.unit);
      formData.append('lowStockThreshold', productData.lowStockThreshold.toString());
      
      if (productData.imageUrl) {
        formData.append('imageUrl', productData.imageUrl);
      }

      // For React Native, we need to handle file differently
      const fileUri = imageFile.uri || imageFile;
      const filename = imageFile.fileName || imageFile.name || 'image.jpg';
      const fileType = imageFile.type || 'image/jpeg';

      formData.append('image', {
        uri: fileUri,
        type: fileType,
        name: filename,
      } as any);

      // For FormData, we need to make a direct fetch call to avoid Content-Type header issues
      const token = await import('./auth').then(m => m.getToken());
      if (!token) {
        throw new Error('No token found. Please login.');
      }

      response = await fetch(`${API_BASE_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData as any,
      });
    } else {
      // Use JSON for product without image
      response = await apiRequest('/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to create product');
    }

    const product: Product = await response.json();
    return product;
  } catch (error) {
    console.error('Create product error:', error);
    throw error;
  }
}

/**
 * Update an existing product
 * @param productId - Product ID
 * @param productData - Partial product data
 * @param imageFile - Optional new image file
 */
export async function updateProduct(
  productId: string,
  productData: UpdateProductData,
  imageFile?: any
): Promise<Product> {
  try {
    let response: Response;

    if (imageFile) {
      // Use FormData for image upload
      const formData = new FormData();
      
      if (productData.name) formData.append('name', productData.name);
      if (productData.category) formData.append('category', productData.category);
      if (productData.costPrice !== undefined) formData.append('costPrice', productData.costPrice.toString());
      if (productData.sellingPrice !== undefined) formData.append('sellingPrice', productData.sellingPrice.toString());
      if (productData.stock !== undefined) formData.append('stock', productData.stock.toString());
      if (productData.unit) formData.append('unit', productData.unit);
      if (productData.lowStockThreshold !== undefined) formData.append('lowStockThreshold', productData.lowStockThreshold.toString());
      if (productData.imageUrl !== undefined) formData.append('imageUrl', productData.imageUrl || '');

      const fileUri = imageFile.uri || imageFile;
      const filename = imageFile.fileName || imageFile.name || 'image.jpg';
      const fileType = imageFile.type || 'image/jpeg';

      formData.append('image', {
        uri: fileUri,
        type: fileType,
        name: filename,
      } as any);

      // For FormData, we need to make a direct fetch call to avoid Content-Type header issues
      const token = await import('./auth').then(m => m.getToken());
      if (!token) {
        throw new Error('No token found. Please login.');
      }

      response = await fetch(`${API_BASE_URL}/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          // Don't set Content-Type - let fetch set it with boundary
        },
        body: formData as any,
      });
    } else {
      // Use JSON for update without image
      response = await apiRequest(`/products/${productId}`, {
        method: 'PATCH',
        body: JSON.stringify(productData),
      });
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to update product');
    }

    const product: Product = await response.json();
    return product;
  } catch (error) {
    console.error('Update product error:', error);
    throw error;
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<void> {
  try {
    const response = await apiRequest(`/products/${productId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to delete product');
    }
  } catch (error) {
    console.error('Delete product error:', error);
    throw error;
  }
}

/**
 * Adjust product stock by a delta value
 * @param productId - Product ID
 * @param delta - Positive to increase, negative to decrease
 */
export async function adjustStock(
  productId: string,
  delta: number
): Promise<Product> {
  try {
    const response = await apiRequest(`/products/${productId}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ delta }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to adjust stock');
    }

    const product: Product = await response.json();
    return product;
  } catch (error) {
    console.error('Adjust stock error:', error);
    throw error;
  }
}

/**
 * Get low stock products
 */
export async function getLowStockProducts(): Promise<Product[]> {
  return getProducts({ lowStock: true });
}

/**
 * Get unique categories from products
 */
export async function getCategories(): Promise<string[]> {
  try {
    const products = await getProducts();
    const categories = [...new Set(products.map(p => p.category))];
    return categories.sort();
  } catch (error) {
    console.error('Get categories error:', error);
    throw error;
  }
}

