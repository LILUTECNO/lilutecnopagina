
import { useState, useEffect, useCallback } from 'react';
import { Product, FiltersState, ProductWithStringImages } from '../types';
import { productDatabase } from '../data/products';
import { INITIAL_FILTERS } from '../constants';

export const useProducts = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);

  useEffect(() => {
    const processedProducts: Product[] = productDatabase.map((p: ProductWithStringImages) => ({
      ...p,
      images: p.images.split(',').map(i => i.trim()).filter(Boolean)
    }));
    setAllProducts(processedProducts);
    const uniqueCategories = [...new Set(processedProducts.map(p => p.category))].sort();
    setCategories(uniqueCategories);
  }, []);

  const filterProducts = useCallback(() => {
    const { searchTerm, category, priceRange, stockOnly } = filters;
    let tempProducts = [...allProducts];

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      tempProducts = tempProducts.filter(p =>
        p.name.toLowerCase().includes(lowerSearchTerm) ||
        (p.summary && p.summary.toLowerCase().includes(lowerSearchTerm))
      );
    }
    if (category) {
      tempProducts = tempProducts.filter(p => p.category === category);
    }
    tempProducts = tempProducts.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);
    if (stockOnly) {
      tempProducts = tempProducts.filter(p => p.stock > 0);
    }
    setFilteredProducts(tempProducts);
  }, [allProducts, filters]);

  useEffect(() => {
    filterProducts();
  }, [allProducts, filters, filterProducts]);

  const handleSetFilters = useCallback((newFilters: Partial<FiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handlePriceRangeChange = useCallback((newPriceRange: {min: number, max: number}) => {
    setFilters(prev => ({...prev, priceRange: newPriceRange}));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const productsOnOfferCount = filteredProducts.filter(p => p.old_price && p.old_price > p.price).length;

  return {
    filteredProducts,
    categories,
    filters,
    handleSetFilters,
    handlePriceRangeChange,
    clearFilters,
    productsOnOfferCount,
    totalAvailableCount: filteredProducts.length
  };
};
