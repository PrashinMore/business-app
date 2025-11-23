import React, { createContext, useState, ReactNode } from 'react';
import { CartItem, Product } from '../types/menu';

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
  const [cart, setCart] = useState<CartItem[]>([]);

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.productId === product.id);
      if (existing) {
        // Check if we can add more
        if (existing.quantity >= product.stock) {
          return prev; // Can't add more
        }
        // Increment quantity
        return prev.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      // Add new item to cart
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

      // Check stock limit
      if (quantity > item.product.stock) {
        return prev; // Can't exceed stock
      }

      return prev.map(item =>
        item.productId === productId ? { ...item, quantity } : item
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

