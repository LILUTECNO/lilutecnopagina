import React from 'react';
import { CATEGORY_EMOJIS } from '../constants';

interface CategoryExplorerProps {
  categories: string[];
  activeCategory: string;
  onCategorySelect: (category: string) => void;
}

/**
 * Mapa de íconos SVG por categoría.
 * Si la categoría no está mapeada, usa un ícono genérico de shopping bag.
 */
const CATEGORY_ICONS: { [key: string]: React.ReactNode } = {
  TELEVISOR: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 17v4" strokeLinecap="round" />
    </svg>
  ),
  ENTRETENIMIENTO: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none" />
    </svg>
  ),
  "AUDIO Y SONIDO": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
      <path d="M3 18v-6a9 9 0 0118 0v6" strokeLinecap="round" />
      <path d="M21 19a2 2 0 01-2 2h-1a2 2 0 01-2-2v-3a2 2 0 012-2h3v5zM3 19a2 2 0 002 2h1a2 2 0 002-2v-3a2 2 0 00-2-2H3v5z" />
    </svg>
  ),
  "CUIDADO PERSONAL": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
      <circle cx="12" cy="8" r="5" />
      <path d="M3 21c0-4.97 4.03-9 9-9s9 4.03 9 9" strokeLinecap="round" />
    </svg>
  ),
  "SALUD Y BELLEZA": (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  ),
  COCINA: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
      <path d="M12 2v6M6 6v4a6 6 0 0012 0V6" strokeLinecap="round" />
      <path d="M6 10a6 6 0 0012 0" />
      <line x1="12" y1="16" x2="12" y2="22" strokeLinecap="round" />
      <line x1="8" y1="22" x2="16" y2="22" strokeLinecap="round" />
    </svg>
  ),
  HOGAR: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
      <polyline points="9,22 9,12 15,12 15,22" />
    </svg>
  ),
};

/** Ícono genérico para categorías sin mapeo */
const DefaultCategoryIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="category-icon-svg">
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" strokeLinecap="round" strokeLinejoin="round" />
    <line x1="7" y1="7" x2="7.01" y2="7" strokeLinecap="round" />
  </svg>
);

const CategoryExplorer: React.FC<CategoryExplorerProps> = ({
  categories,
  activeCategory,
  onCategorySelect,
}) => {
  if (!categories || categories.length === 0) return null;

  const handleClick = (cat: string) => {
    // Si ya está seleccionada, deseleccionar (limpiar filtro de categoría)
    if (activeCategory === cat) {
      onCategorySelect('');
    } else {
      onCategorySelect(cat);
    }
  };

  return (
    <section className="relative py-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* ── Glow decorativo de fondo ── */}
      <div className="absolute top-0 left-1/4 w-[350px] h-[350px] bg-[#ff7a00]/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[350px] h-[350px] bg-[#7b2cbf]/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Título de sección */}
        <div className="text-center mb-14 space-y-4">
          <span className="inline-block bg-white/5 border border-white/10 px-4 py-1.5 rounded-full text-[9px] uppercase tracking-[0.4em] text-orange-400 font-semibold backdrop-blur-md">
            Explora por Categoría
          </span>
          <h2 className="font-montserrat text-3xl sm:text-5xl font-extralight tracking-tight text-white">
            Encuentra lo que buscas
          </h2>
          <p className="text-sm font-light text-slate-400 max-w-lg mx-auto leading-relaxed tracking-wide">
            Navega directamente a la categoría que te interesa
          </p>
        </div>

        {/* Grid de tarjetas de categoría */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-5">
          {categories.map((cat, index) => {
            const isActive = activeCategory === cat;
            const icon = CATEGORY_ICONS[cat] || <DefaultCategoryIcon />;
            const emoji = CATEGORY_EMOJIS[cat] || CATEGORY_EMOJIS['DEFAULT'];

            return (
              <button
                key={cat}
                onClick={() => handleClick(cat)}
                className={`
                  category-glass-card group relative flex flex-col items-center justify-center
                  min-h-[140px] sm:min-h-[160px] rounded-2xl p-5 sm:p-6
                  cursor-pointer select-none text-center
                  transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]
                  ${isActive
                    ? 'category-glass-card--active'
                    : ''
                  }
                `}
                style={{
                  animationDelay: `${index * 60}ms`,
                }}
                aria-label={`Filtrar por categoría: ${cat}`}
              >
                {/* Borde animado al hover/activo */}
                <div
                  className={`
                    absolute inset-0 rounded-2xl pointer-events-none transition-opacity duration-500
                    ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                  `}
                  style={{
                    background: 'linear-gradient(135deg, #ff7a00, #7b2cbf)',
                    padding: '1px',
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                    borderRadius: '1rem',
                  }}
                />

                {/* Glow activo */}
                {isActive && (
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#ff7a00]/20 to-[#7b2cbf]/20 blur-xl pointer-events-none" />
                )}

                {/* Ícono */}
                <div
                  className={`
                    relative z-10 w-10 h-10 sm:w-12 sm:h-12 mb-3 sm:mb-4
                    flex items-center justify-center
                    transition-all duration-500
                    ${isActive
                      ? 'text-orange-400 scale-110'
                      : 'text-slate-400 group-hover:text-white group-hover:scale-110'
                    }
                  `}
                >
                  {icon}
                </div>

                {/* Emoji decorativo pequeño */}
                <span className="absolute top-3 right-3 text-lg opacity-30 group-hover:opacity-60 transition-opacity duration-300">
                  {emoji}
                </span>

                {/* Nombre de categoría */}
                <span
                  className={`
                    relative z-10 text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.2em]
                    transition-colors duration-300
                    ${isActive
                      ? 'text-white'
                      : 'text-slate-300 group-hover:text-white'
                    }
                  `}
                >
                  {cat}
                </span>

                {/* Indicador activo */}
                {isActive && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-gradient-to-r from-[#ff7a00] to-[#7b2cbf] rounded-full" />
                )}
              </button>
            );
          })}
        </div>

        {/* Indicador de categoría activa */}
        {activeCategory && (
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => onCategorySelect('')}
              className="
                inline-flex items-center gap-2
                bg-white/5 border border-white/10
                px-4 py-2 rounded-full
                text-[10px] uppercase tracking-[0.2em] text-slate-300
                hover:text-white hover:border-white/20
                transition-all duration-300
                backdrop-blur-md cursor-pointer
              "
            >
              <span>Mostrando:</span>
              <span className="text-orange-400 font-semibold">{activeCategory}</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-slate-400">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default React.memo(CategoryExplorer);
