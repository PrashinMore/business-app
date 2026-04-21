import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { CartItem, Product } from '../types/menu';
import { useAuth } from './AuthContext';
import {
  canAddMore,
  isInventoryTracked,
  isRecipeProduct,
  maxClientQuantity,
} from '../services/inventory';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  getTotalAmount: () => number;
  getCartItemCount: () => number;
}

export const CartContext = createContext<CartContextType | undefined>(undefined);

interface CartProviderProps {
  children: ReactNode;
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);

  // Clear cart when user logs out
  useEffect(() => {
    if (!isAuthenticated) {
      setCart([]);
    }
  }, [isAuthenticated]);

  const addToCart = (product: Product) => {
    // SIMPLE+tracked: respect on-hand stock. RECIPE / NONE / untracked:
    // allow freely — the backend validates ingredient availability at
    // checkout, and blocking on a meaningless `stock` field would prevent
    // selling recipe-driven dishes entirely.
    const simpleOutOfStock =
      isInventoryTracked(product) &&
      !isRecipeProduct(product) &&
      (product.stock ?? 0) <= 0;

    if (simpleOutOfStock) {
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        if (!canAddMore(product, existing.quantity)) {
          return prev;
        }
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          product: product,
          quantity: 1,
          sellingPrice: Number(product.sellingPrice),
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(prev => {
      const item = prev.find(i => i.productId === productId);
      if (!item) return prev;

      // Only cap SIMPLE+tracked products on the client. maxClientQuantity
      // returns Infinity for RECIPE/untracked items so we never block them.
      if (quantity > maxClientQuantity(item.product)) {
        return prev;
      }

      return prev.map(ci =>
        ci.productId === productId ? { ...ci, quantity } : ci
      );
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalAmount = (): number => {
    return cart.reduce(
      (sum, item) => sum + item.sellingPrice * item.quantity,
      0
    );
  };

  const getCartItemCount = (): number => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const value: CartContextType = {
    cart,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotalAmount,
    getCartItemCount,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

export const useCart = () => {
  const context = React.useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

