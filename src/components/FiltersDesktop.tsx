import React from 'react';
import { FiltersState } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';

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
    onPriceChange({ min: newMin, max: filters.priceRange.max });
  };

  const handleMaxPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = Math.max(Number(e.target.value), filters.priceRange.min + 50000);
    onPriceChange({ min: filters.priceRange.min, max: newMax });
  };

  return (
    <aside className="hidden lg:block lg:w-64 flex-shrink-0">
      <div className="glass-panel rounded-3xl p-6 sticky top-28 space-y-7 border border-white/10">
        
        {/* Título */}
        <div className="border-b border-white/10 pb-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white">
            Filtrar
          </h3>
        </div>

        {/* Categoría */}
        <div className="space-y-3">
          <label htmlFor="category-filter" className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Categoría
          </label>
          <select
            id="category-filter"
            value={filters.category}
            onChange={handleCategoryChange}
            className="
              w-full glass-input text-white
              py-2.5 px-3 text-[12px] font-light tracking-wide
              focus:outline-none cursor-pointer
              rounded-xl bg-[#14061f]
            "
          >
            <option value="" className="bg-[#14061f]">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat} className="bg-[#14061f]">{cat}</option>
            ))}
          </select>
        </div>

        {/* Rango de precio */}
        <div className="space-y-4">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Precio
          </label>
          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-slate-400 tracking-wide">Mínimo</span>
              <input
                type="range"
                id="price-min"
                min="0"
                max={maxPrice}
                value={filters.priceRange.min}
                step="50000"
                onChange={handleMinPriceChange}
                className="w-full h-[2px] bg-white/10 appearance-none cursor-pointer mt-2"
                style={{ accentColor: '#ff7a00' }}
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-400 tracking-wide">Máximo</span>
              <input
                type="range"
                id="price-max"
                min="0"
                max={maxPrice}
                value={filters.priceRange.max}
                step="50000"
                onChange={handleMaxPriceChange}
                className="w-full h-[2px] bg-white/10 appearance-none cursor-pointer mt-2"
                style={{ accentColor: '#ff7a00' }}
              />
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-[11px] text-white font-medium">{formatPrice(filters.priceRange.min)}</span>
              <span className="text-[11px] text-white font-medium">{formatPrice(filters.priceRange.max)}</span>
            </div>
          </div>
        </div>

        {/* Solo en stock */}
        <div>
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                id="stock-filter"
                checked={filters.stockOnly}
                onChange={handleStockChange}
                className="sr-only"
              />
              <div className={`
                w-4 h-4 border flex items-center justify-center transition-all duration-200 rounded-md
                ${filters.stockOnly ? 'bg-gradient-to-r from-orange-500 to-purple-600 border-white/20' : 'bg-white/5 border-white/10 group-hover:border-orange-400'}
              `}>
                {filters.stockOnly && (
                  <svg viewBox="0 0 10 8" className="w-2.5 h-2 fill-none stroke-white stroke-[2]">
                    <path d="M1 4l2.5 2.5L9 1" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
            </div>
            <span className="text-[11px] font-light text-slate-300 tracking-wide group-hover:text-white transition-colors">
              Solo en stock
            </span>
          </label>
        </div>

        {/* Limpiar filtros */}
        <button
          onClick={onClearFilters}
          className="
            w-full py-2.5 text-[10px] font-semibold uppercase tracking-[0.2em]
            btn-glass-secondary rounded-xl cursor-pointer
          "
        >
          Limpiar filtros
        </button>
      </div>
    </aside>
  );
};

export default FiltersDesktop;