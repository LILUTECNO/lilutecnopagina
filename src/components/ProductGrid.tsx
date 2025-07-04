import React from 'react';
import { Product } from '../types.ts';
import ProductCard from './ProductCard.tsx';
import { SearchIcon as NoResultsSearchIcon } from './Icons.tsx'; // Renamed to avoid conflict

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onProductClick, onAddToCart }) => {
  if (products.length === 0) {
    return (
      <div className="flex-1 text-center py-12">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md">
          <NoResultsSearchIcon className="h-10 w-10 text-gray-400" />
        </div>
        <p className="text-gray-600 text-lg mb-4">No se encontraron productos que coincidan con tu búsqueda.</p>
        <p className="text-sm text-gray-500">Intenta ajustar los filtros o ampliar tu búsqueda.</p>
        {/* Consider adding a 'Clear Filters' button here if appropriate contextually */}
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onProductClick={onProductClick}
            onAddToCart={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
};

// Placeholder for loading state, can be expanded
export const LoadingSpinner: React.FC = () => (
  <div className="text-center py-12 flex-1">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
    <p className="mt-4 text-gray-600">Cargando productos...</p>
  </div>
);


export default React.memo(ProductGrid);