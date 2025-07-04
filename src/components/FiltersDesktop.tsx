import React from 'react';
import { FiltersState } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { CATEGORY_EMOJIS } from '../constants.ts';

interface FiltersDesktopProps {
  categories: string[];
  filters: FiltersState;
  onFilterChange: (newFilters: Partial<FiltersState>) => void;
  onPriceChange: (newPriceRange: {min: number, max: number}) => void;
  onClearFilters: () => void;
  maxPrice: number;
}

const FiltersDesktop: React.FC<FiltersDesktopProps> = ({
  categories,
  filters,
  onFilterChange,
  onPriceChange,
  onClearFilters,
  maxPrice
}) => {
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onFilterChange({ category: e.target.value });
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ stockOnly: e.target.checked });
  };
  
  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), filters.priceRange.max - 50000);
    onPriceChange({min: newMin, max: filters.priceRange.max});
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), filters.priceRange.min + 50000);
    onPriceChange({min: filters.priceRange.min, max: newMax});
  };

  return (
    <aside className="hidden lg:block lg:w-80 flex-shrink-0">
      <div className="bg-white p-6 rounded-2xl shadow-lg sticky top-28"> {/* Adjusted top for sticky header */}
        <h3 className="text-xl font-bold text-gray-800 mb-4">🔍 Filtros</h3>
        <div className="mb-6">
          <label htmlFor="category-filter" className="block text-sm font-semibold text-gray-700 mb-2">
            Categoría
          </label>
          <select
            id="category-filter"
            value={filters.category}
            onChange={handleCategoryChange}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors"
          >
            <option value="">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {CATEGORY_EMOJIS[cat] || CATEGORY_EMOJIS.DEFAULT} {cat}
              </option>
            ))}
          </select>
        </div>
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Rango de precio</label>
          <div className="space-y-2">
            <input
              type="range"
              id="price-min"
              min="0"
              max={maxPrice}
              value={filters.priceRange.min}
              step="50000"
              onChange={handleMinPriceChange}
              className="w-full appearance-none h-2 bg-gray-200 rounded-lg cursor-pointer accent-orange-500"
            />
            <input
              type="range"
              id="price-max"
              min="0"
              max={maxPrice}
              value={filters.priceRange.max}
              step="50000"
              onChange={handleMaxPriceChange}
              className="w-full appearance-none h-2 bg-gray-200 rounded-lg cursor-pointer accent-orange-500"
            />
            <div className="flex justify-between text-sm text-gray-600">
              <span>{formatPrice(filters.priceRange.min)}</span>
              <span>{formatPrice(filters.priceRange.max)}</span>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="stock-filter"
              checked={filters.stockOnly}
              onChange={handleStockChange}
              className="rounded text-orange-500 focus:ring-orange-400 h-4 w-4 border-gray-300"
            />
            <span className="ml-2 text-sm text-gray-700">Solo productos en stock</span>
          </label>
        </div>
        <button
          onClick={onClearFilters}
          className="w-full py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          Limpiar filtros
        </button>
      </div>
    </aside>
  );
};

export default FiltersDesktop;