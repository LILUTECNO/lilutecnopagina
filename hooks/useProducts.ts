import { useState, useEffect, useCallback } from 'react';
import { Product, FiltersState } from '../types'; // 'ProductWithStringImages' ya no es necesario
import { INITIAL_FILTERS } from '../constants';

// --- NUEVOS IMPORTS DE FIREBASE ---
import { db } from '../firebaseConfig'; // La conexión a nuestra base de datos
import { collection, getDocs } from 'firebase/firestore'; // Funciones para obtener los datos

export const useProducts = () => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS);
  
  // --- NUEVO ESTADO PARA SABER CUÁNDO ESTAMOS CARGANDO DATOS ---
  const [loading, setLoading] = useState(true);

  // ESTE ES EL CAMBIO PRINCIPAL: AHORA LEEMOS DESDE FIREBASE
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true); // Empezamos a cargar
      try {
        // 1. Apuntamos a nuestra colección "products" en Firestore
        const productsCollection = collection(db, 'products');

        // 2. Obtenemos todos los documentos (await espera a que lleguen)
        const productSnapshot = await getDocs(productsCollection);

        // 3. Transformamos los datos de Firebase a nuestro formato de 'Product'
        const productList: Product[] = productSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name,
            price: data.price,
            old_price: data.old_price,
            category: data.category,
            stock: data.stock,
            summary: data.summary,
            images: data.images, // Ya es un array, no hay que hacer .split()
            features: data.features
          };
        });
        
        // 4. Guardamos los productos y extraemos las categorías
        setAllProducts(productList);
        const uniqueCategories = [...new Set(productList.map(p => p.category))].sort();
        setCategories(uniqueCategories);

      } catch (error) {
        console.error("Error al obtener los productos desde Firebase:", error);
      } finally {
        setLoading(false); // Terminamos de cargar (incluso si hubo un error)
      }
    };

    fetchProducts();
  }, []); // El array vacío [] asegura que esto solo se ejecute una vez al principio

  // --- TODA TU LÓGICA DE FILTRADO SE MANTIENE EXACTAMENTE IGUAL ---
  // --- ¡NO NECESITAS CAMBIAR NADA DE AQUÍ EN ADELANTE! ---
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
    // Este useEffect se activará automáticamente cuando 'allProducts' se llene con los datos de Firebase
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
    totalAvailableCount: filteredProducts.length,
    loading // --- NUEVO: Exportamos el estado de carga ---
  };
};