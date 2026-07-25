import { useState, useEffect, useCallback } from 'react';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Product, FiltersState } from '../types';
import { INITIAL_FILTERS } from '../constants';

export const useProducts = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  const [loading, setLoading] = useState(true);

  // La lógica de fetching ahora usa Firebase directamente
  const fetchProducts = useCallback(() => {
    setLoading(true);
    
    try {
      // Crear una consulta para obtener productos ordenados por nombre
      const productsQuery = query(collection(db, 'products'), orderBy('name'));
      
      // Escuchar cambios en tiempo real
      const unsubscribe = onSnapshot(productsQuery, (querySnapshot) => {
        const productList: Product[] = [];
        querySnapshot.forEach((doc) => {
          productList.push({
            id: doc.id,
            ...doc.data(),
            images: Array.isArray(doc.data().images)
              ? doc.data().images
              : String(doc.data().images || '').split(',').map((url: string) => url.trim()).filter(Boolean),
            features: Array.isArray(doc.data().features) ? doc.data().features : []
          } as Product);
        });
        setAllProducts(productList);
        setLoading(false);
      }, (error) => {
        console.error("Error fetching products from Firestore:", error);
        setLoading(false);
      });
      
      // Retornar la función de limpieza
      const unsubscribeCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
        const configured = snapshot.docs.map(item => { const data = item.data(); return String(data.name || data.label || data.title || item.id); }).filter(Boolean).sort();
        if (configured.length) setCategories(configured);
      });
      return () => { unsubscribe(); unsubscribeCategories(); };
    } catch (error) {
      console.error("Error setting up Firestore listener:", error);
      setLoading(false);
      return () => {};
    }
  }, []);

  useEffect(() => {
    const unsubscribe = fetchProducts();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchProducts]);

  // Lógica de filtrado y manejo de estado
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
    if (category === '__offers__') {
      tempProducts = tempProducts.filter(p => Boolean(p.old_price && p.old_price > p.price));
    } else if (category === '__new__') {
      tempProducts = [...tempProducts].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 24);
    } else if (category) {
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
