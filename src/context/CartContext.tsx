import React, { createContext, useContext } from 'react';
import { useCart } from '../hooks/useCart';
import { useNotifications } from '../hooks/useNotifications';
import { CartItem, Product, NotificationMessage } from '../types';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalCartItems: number;
  notifications: NotificationMessage[];
  addNotification: (message: string, type?: 'success' | 'error') => void;
  removeNotification: (id: number) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { notifications, addNotification, removeNotification } = useNotifications();
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, totalCartItems } = useCart(addNotification);

  return (
    <CartContext.Provider value={{
      cart,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      totalCartItems,
      addNotification,
      notifications,
      removeNotification,
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCartContext must be used within a CartProvider');
  }
  return context;
};
