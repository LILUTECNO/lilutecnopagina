
import { useState, useEffect, useCallback } from 'react';
import { CartItem, Product } from '../types';

const CART_STORAGE_KEY = 'lilutecno_cart_v2';

export const useCart = (addNotification: (message: string, type?: 'success' | 'error') => void) => {
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    console.log("Attempting to load cart from localStorage...");
    const storedCart = localStorage.getItem(CART_STORAGE_KEY);
    if (storedCart) {
      try {
        const parsedCart = JSON.parse(storedCart);
        setCart(parsedCart);
        console.log("Cart loaded from localStorage:", parsedCart);
      } catch (e) {
        console.error("Failed to parse cart from localStorage", e);
        localStorage.removeItem(CART_STORAGE_KEY);
      }
    } else {
      console.log("No cart found in localStorage.");
    }
  }, []);

  useEffect(() => {
    console.log("Attempting to save cart to localStorage:", cart);
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const removeFromCart = useCallback((productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
    addNotification(`Producto eliminado del carrito`, 'error');
  }, [addNotification]);

  const updateCartQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const addToCart = useCallback((product: Product) => {
    setCart(prevCart => {
      console.log("Cart before adding/updating:", prevCart);
      const existingItem = prevCart.find(item => item.id === product.id);
      let newCart;
      if (existingItem) {
        newCart = prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        newCart = [...prevCart, { ...product, quantity: 1, image: product.images[0] }];
      }
      console.log("Cart after adding/updating:", newCart);
      return newCart;
    });
    addNotification(`${product.name} agregado al carrito`);
  }, [addNotification]);

  const clearCart = useCallback(() => {
    setCart([]);
    addNotification('Carrito vaciado', 'success');
  }, [addNotification]);

  const totalCartItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  return { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, totalCartItems };
};
