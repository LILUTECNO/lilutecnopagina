import React, { useState, useEffect } from 'react';
import { FiltersState } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { CloseIcon, FilterIcon } from './Icons.tsx';
import { CATEGORY_EMOJIS, INITIAL_FILTERS } from '../constants.ts';


interface FiltersMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
  currentFilters: FiltersState;
  onApplyFilters: (filters: FiltersState) => void;
  maxPrice: number;
}

const FiltersMobileModal: React.FC<FiltersMobileModalProps> = ({
  isOpen,
  onClose,
  categories,
  currentFilters,
  onApplyFilters,
  maxPrice
}) => {
  const [tempFilters, setTempFilters] = useState<FiltersState>(currentFilters);

  useEffect(() => {
    setTempFilters(currentFilters);
  }, [currentFilters, isOpen]); // Reset tempFilters when modal opens or currentFilters change

  if (!isOpen) return null;

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTempFilters(prev => ({ ...prev, category: e.target.value }));
  };

  const handleStockChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTempFilters(prev => ({ ...prev, stockOnly: e.target.checked }));
  };
  
  const handleMinPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = Math.min(Number(e.target.value), tempFilters.priceRange.max - 50000);
    setTempFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, min: newMin } }));
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), tempFilters.priceRange.min + 50000);
    setTempFilters(prev => ({ ...prev, priceRange: { ...prev.priceRange, max: newMax } }));
  };
  
  const handleApply = () => {
    onApplyFilters(tempFilters);
    onClose();
  };

  const handleClear = () => {
    setTempFilters(INITIAL_FILTERS); 
    // Optionally apply immediately or wait for explicit apply
    // onApplyFilters(INITIAL_FILTERS); 
    // onClose();
  };


  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[100] flex justify-end transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out translate-x-full animate-slide-in-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-800 flex items-center">
            <FilterIcon className="w-5 h-5 mr-2 text-orange-500" /> Filtros
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors" aria-label="Cerrar filtros">
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-grow [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          <div>
            <label htmlFor="mobile-category-filter" className="block text-sm font-semibold text-gray-700 mb-2">
              Categoría
            </label>
            <select
              id="mobile-category-filter"
              value={tempFilters.category}
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
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Rango de precio</label>
            <div className="space-y-2">
              <input
                type="range"
                id="mobile-price-min"
                min="0"
                max={maxPrice}
                value={tempFilters.priceRange.min}
                step="50000"
                onChange={handleMinPriceChange}
                className="w-full appearance-none h-2 bg-gray-200 rounded-lg cursor-pointer accent-orange-500"
              />
              <input
                type="range"
                id="mobile-price-max"
                min="0"
                max={maxPrice}
                value={tempFilters.priceRange.max}
                step="50000"
                onChange={handleMaxPriceChange}
                className="w-full appearance-none h-2 bg-gray-200 rounded-lg cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-sm text-gray-600">
                <span>{formatPrice(tempFilters.priceRange.min)}</span>
                <span>{formatPrice(tempFilters.priceRange.max)}</span>
              </div>
            </div>
          </div>
          <div>
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="mobile-stock-filter"
                checked={tempFilters.stockOnly}
                onChange={handleStockChange}
                className="rounded text-orange-500 focus:ring-orange-400 h-4 w-4 border-gray-300"
              />
              <span className="ml-2 text-sm text-gray-700">Solo productos en stock</span>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 space-y-3">
          <button
            onClick={handleApply}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
          >
            Aplicar filtros
          </button>
          <button
            onClick={handleClear}
            className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersMobileModal;