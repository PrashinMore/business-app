import { useState, useEffect } from 'react';
import { getProductsByIds } from '../services/products';
import { Product } from '../types/menu';

interface UseProductNamesOptions {
  productIds: string[];
  enabled?: boolean;
}

interface UseProductNamesReturn {
  productNames: Map<string, string>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useProductNames(options: UseProductNamesOptions): UseProductNamesReturn {
  const { productIds, enabled = true } = options;

  const [productNames, setProductNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProductNames = async () => {
    if (!enabled || productIds.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const products = await getProductsByIds(productIds);
      const namesMap = new Map<string, string>();

      products.forEach(product => {
        namesMap.set(product.id, product.name);
      });

      setProductNames(namesMap);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load product names';
      setError(errorMessage);
      console.error('Fetch product names error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductNames();
  }, [productIds.join(','), enabled]); // Re-fetch when productIds change

  const refetch = async () => {
    await fetchProductNames();
  };

  return {
    productNames,
    loading,
    error,
    refetch,
  };
}
