import React, { useState, useEffect } from 'react';
import { FiltersState } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { INITIAL_FILTERS } from '../constants.ts';

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
  maxPrice,
}) => {
  const [tempFilters, setTempFilters] = useState<FiltersState>(currentFilters);

  useEffect(() => {
    setTempFilters(currentFilters);
  }, [currentFilters, isOpen]);

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
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex justify-end"
      onClick={onClose}
    >
      <div
        className="glass-panel border-y-0 border-r-0 border-l border-white/15 w-full max-w-sm h-full flex flex-col animate-slide-in-right shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-white/[.06] border-b border-white/10 px-7 py-6 flex items-center justify-between flex-shrink-0">
          <h3 className="font-montserrat text-[11px] font-bold uppercase tracking-[0.3em] text-white">
            Filtrar Catálogo
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-110"
            aria-label="Cerrar filtros"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-grow overflow-y-auto px-7 py-7 space-y-9">

          {/* Categoría */}
          <div className="space-y-3">
            <label htmlFor="mobile-category-filter" className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Categoría
            </label>
            <select
              id="mobile-category-filter"
              value={tempFilters.category}
              onChange={handleCategoryChange}
              className="w-full glass-input text-white py-3 px-3 text-[12px] font-light tracking-wide focus:outline-none cursor-pointer rounded-xl bg-[#14061f]"
            >
              <option value="" className="bg-[#14061f]">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat} className="bg-[#14061f]">{cat}</option>
              ))}
            </select>
          </div>

          {/* Rango de precio */}
          <div className="space-y-4">
            <label className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">
              Rango de Precio
            </label>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-slate-400">Mínimo</span>
                  <span className="text-[11px] font-medium text-white">{formatPrice(tempFilters.priceRange.min)}</span>
                </div>
                <input
                  type="range"
                  id="mobile-price-min"
                  min="0"
                  max={maxPrice}
                  value={tempFilters.priceRange.min}
                  step="50000"
                  onChange={handleMinPriceChange}
                  className="w-full appearance-none h-[2px] bg-white/10 cursor-pointer"
                  style={{ accentColor: '#ff7a00' }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-[10px] text-slate-400">Máximo</span>
                  <span className="text-[11px] font-medium text-white">{formatPrice(tempFilters.priceRange.max)}</span>
                </div>
                <input
                  type="range"
                  id="mobile-price-max"
                  min="0"
                  max={maxPrice}
                  value={tempFilters.priceRange.max}
                  step="50000"
                  onChange={handleMaxPriceChange}
                  className="w-full appearance-none h-[2px] bg-white/10 cursor-pointer"
                  style={{ accentColor: '#ff7a00' }}
                />
              </div>
            </div>
          </div>

          {/* Solo en stock */}
          <div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  id="mobile-stock-filter"
                  checked={tempFilters.stockOnly}
                  onChange={handleStockChange}
                  className="sr-only"
                />
                <div className={`
                  w-4 h-4 border flex items-center justify-center transition-all duration-200 rounded-md
                  ${tempFilters.stockOnly ? 'bg-gradient-to-r from-orange-500 to-purple-600 border-white/20' : 'bg-white/5 border-white/10 group-hover:border-orange-400'}
                `}>
                  {tempFilters.stockOnly && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-white stroke-[2]">
                      <path d="M1 4l2.5 2.5L9 1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-[12px] font-light text-slate-300 tracking-wide group-hover:text-white transition-colors">
                Solo en stock
              </span>
            </label>
          </div>
        </div>

        {/* Footer con botones */}
        <div className="bg-black/40 border-t border-white/10 px-7 py-6 space-y-2.5 flex-shrink-0 backdrop-blur-md">
          <button
            onClick={handleApply}
            className="w-full py-4 btn-glass-primary text-[10px] font-semibold uppercase tracking-[0.25em] rounded-xl cursor-pointer"
          >
            Aplicar Filtros
          </button>
          <button
            onClick={handleClear}
            className="w-full py-3 btn-glass-secondary text-[10px] font-semibold uppercase tracking-[0.2em] rounded-xl cursor-pointer"
          >
            Limpiar
          </button>
        </div>
      </div>
    </div>
  );
};

export default FiltersMobileModal;