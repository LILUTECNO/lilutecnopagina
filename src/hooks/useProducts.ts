import { useState, useEffect, useCallback } from 'react';
import apiClient from '../services/api'; // Importamos nuestro cliente de API
import { Product, FiltersState } from '../types';
import { INITIAL_FILTERS } from '../constants';

export const useProducts = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);

  // La lógica de fetching ahora usa nuestro apiClient
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Hacemos una petición GET al endpoint de productos del nuevo backend
      const response = await apiClient.get('/products');
      const productList: Product[] = response.data; // Asumimos que la API devuelve un array de productos

      setAllProducts(productList);
      const uniqueCategories = [...new Set(productList.map(p => p.category))].sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching products from API:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // El resto de la lógica de filtrado y manejo de estado no necesita cambios
  const applyFilters = useCallback(() => {
    let tempProducts = [...allProducts];
    const { searchTerm, category, priceRange, stockOnly } = filters;

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
    if (stockOnly) {
      tempProducts = tempProducts.filter(p => p.stock > 0);
    }
    tempProducts = tempProducts.filter(p => p.price >= priceRange.min && p.price <= priceRange.max);

    setFilteredProducts(tempProducts);
  }, [allProducts, filters]);

  useEffect(() => {
    applyFilters();
  }, [allProducts, filters, applyFilters]);

  const handleSetFilters = useCallback((newFilters: Partial<FiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  const handlePriceRangeChange = useCallback((newPriceRange: { min: number, max: number }) => {
    setFilters(prev => ({ ...prev, priceRange: newPriceRange }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
  }, []);

  const productsOnOfferCount = filteredProducts.filter(p => p.old_price && p.old_price > p.price).length;

  return {
    allProducts,
    filteredProducts,
    categories,
    filters,
    loading,
    handleSetFilters,
    handlePriceRangeChange,
    clearFilters,
    productsOnOfferCount,
    totalAvailableCount: filteredProducts.length,
    refetchProducts: fetchProducts,
  };
};