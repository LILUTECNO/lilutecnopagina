import { useState, useEffect, useCallback } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Product, FiltersState } from '../types';
import { INITIAL_FILTERS } from '../constants';

export const useProducts = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const productsCollection = collection(db, 'products');
      const productSnapshot = await getDocs(productsCollection);
      const productList: Product[] = productSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          price: data.price,
          old_price: data.old_price || null,
          category: data.category,
          stock: data.stock,
          summary: data.summary,
          images: Array.isArray(data.images) ? data.images : [],
          features: Array.isArray(data.features) ? data.features : [],
        };
      });

      setAllProducts(productList);
      const uniqueCategories = [...new Set(productList.map(p => p.category))].sort();
      setCategories(uniqueCategories);
    } catch (error) {
      console.error("Error fetching products from Firebase:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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