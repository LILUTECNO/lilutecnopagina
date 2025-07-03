
import { useState, useEffect, useRef, useCallback } from 'react';
import { Product } from '../types';

export const useUI = () => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isCartModalOpen, setCartModalOpen] = useState(false);
  const [isMobileFiltersModalOpen, setMobileFiltersModalOpen] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const controlHeaderVisibility = () => {
      const currentScrollY = window.scrollY;
      const headerHeightThreshold = 150;

      if (currentScrollY > lastScrollY.current && currentScrollY > headerHeightThreshold) {
        setIsHeaderVisible(false);
      } else {
        setIsHeaderVisible(true);
      }
      
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', controlHeaderVisibility, { passive: true });

    return () => {
      window.removeEventListener('scroll', controlHeaderVisibility);
    };
  }, []);

  const onProductClick = useCallback((product: Product) => {
    setSelectedProduct(product);
  }, []);

  const closeProductModal = () => setSelectedProduct(null);
  const openCartModal = () => setCartModalOpen(true);
  const closeCartModal = () => setCartModalOpen(false);
  const openMobileFiltersModal = () => setMobileFiltersModalOpen(true);
  const closeMobileFiltersModal = () => setMobileFiltersModalOpen(false);

  return {
    selectedProduct,
    isCartModalOpen,
    isMobileFiltersModalOpen,
    isHeaderVisible,
    onProductClick,
    closeProductModal,
    openCartModal,
    closeCartModal,
    openMobileFiltersModal,
    closeMobileFiltersModal,
    setMobileFiltersModalOpen
  };
};
