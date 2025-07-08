import React, { useEffect, useRef } from 'react';
// 1. IMPORTACIONES MODIFICADAS: Añadido MenuIcon y tu logo, quitado FilterIcon y el logo antiguo.
import { SearchIcon, MenuIcon, ShoppingCartIcon, WhatsAppIcon, SparklesIcon, TagIcon, ClockIcon, ShieldCheckIcon } from './Icons.tsx';
import liluLogo from '../assets/images/lilutecnologo.png'; 
import { WHATSAPP_NUMBER_LINK_BASE } from '../constants.ts';

interface HeaderProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  totalCartItems: number;
  onCartClick: () => void;
  onMobileFiltersClick: () => void;
  filteredCount: number;
  totalAvailableCount: number;
  isHeaderVisible: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  searchTerm,
  onSearchChange,
  totalCartItems,
  onCartClick,
  onMobileFiltersClick,
  filteredCount,
  totalAvailableCount,
  isHeaderVisible
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<number | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const stats = [
    { icon: TagIcon, value: filteredCount, label: 'En oferta' },
    { icon: SparklesIcon, value: totalAvailableCount, label: 'Disponibles' },
    { icon: ClockIcon, value: '24h', label: 'Envío Rápido' },
    { icon: ShieldCheckIcon, value: '100%', label: 'Garantía' }
  ];

  const startAutoScroll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    
    intervalRef.current = window.setInterval(() => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 1) {
          scrollContainerRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          scrollContainerRef.current.scrollBy({ left: clientWidth / 4, behavior: 'smooth' });
        }
      }
    }, 3000);
  };

  const stopAutoScroll = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  const handleManualInteraction = () => {
    stopAutoScroll();
    timeoutRef.current = window.setTimeout(startAutoScroll, 5000);
  };
  
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    
    const handleMediaQueryChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        startAutoScroll();
      } else {
        stopAutoScroll();
      }
    };

    if (mediaQuery.matches) {
      startAutoScroll();
    }

    mediaQuery.addEventListener('change', handleMediaQueryChange);
    
    if (scrollContainer) {
      scrollContainer.addEventListener('pointerdown', handleManualInteraction);
      scrollContainer.addEventListener('wheel', handleManualInteraction, { passive: true });
    }

    return () => {
      stopAutoScroll();
      mediaQuery.removeEventListener('change', handleMediaQueryChange);
      if (scrollContainer) {
        scrollContainer.removeEventListener('pointerdown', handleManualInteraction);
        scrollContainer.removeEventListener('wheel', handleManualInteraction);
      }
    };
  }, [filteredCount, totalAvailableCount]);

  return (
    <header className={`bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 shadow-2xl sticky top-0 z-50 text-white transition-transform duration-300 ease-in-out ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-black text-center py-2 px-4">
        <div className="flex items-center justify-center gap-2 text-sm sm:text-base font-black tracking-wide">
          <SparklesIcon className="w-5 h-5 text-red-600 animate-pulse" />
          <span className="truncate">¡OFERTAS MUNDIALES! Hasta 70% OFF</span>
          <SparklesIcon className="w-5 h-5 text-red-600 animate-pulse" />
        </div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {/* 2. LOGO MODIFICADO: Se usa la etiqueta <img> con tu logo importado. */}
              <img 
                src={liluLogo} 
                alt="Logo de LiluTecno" 
                className="h-14 w-auto" // Puedes ajustar el tamaño aquí (ej: h-12, h-16)
              />
              <div className="flex flex-col">
                <h1 className="text-2xl md:text-3xl font-black text-white drop-shadow-lg">LiluTecno</h1>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3">
              <button
                onClick={onMobileFiltersClick}
                className="lg:hidden p-2 bg-white/20 border border-white/25 rounded-xl text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                aria-label="Abrir menú y filtros"
              >
                {/* 3. ICONO DE FILTRO MODIFICADO: Se usa MenuIcon en lugar de FilterIcon. */}
                <MenuIcon className="h-6 w-6" />
              </button>
              <button
                onClick={onCartClick}
                className="relative p-3 bg-white/20 border border-white/25 rounded-xl text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
                aria-label="Ver carrito de compras"
              >
                <ShoppingCartIcon className="h-6 w-6" />
                {totalCartItems > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold ring-2 ring-white">
                    {totalCartItems}
                  </span>
                )}
              </button>
              <a
                href={WHATSAPP_NUMBER_LINK_BASE}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-green-500 rounded-xl text-white shadow-lg hover:bg-green-600 transition-colors"
                aria-label="Contactar por WhatsApp"
              >
                <WhatsAppIcon className="h-6 w-6" />
              </a>
            </div>
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-300 pointer-events-none" />
            <input
              type="text"
              placeholder="Busca tu producto favorito..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-gray-600/50 backdrop-blur-sm text-white placeholder-gray-300 border border-white/25 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-orange-300 transition-all"
            />
          </div>

          <div ref={scrollContainerRef} className="md:grid md:grid-cols-4 flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            {stats.map((stat, index) => (
              <div key={index} className="flex-shrink-0 flex items-center gap-2 text-white bg-white/10 p-3 rounded-lg backdrop-blur-sm w-40 md:w-auto">
                <stat.icon className="w-6 h-6" />
                <div>
                  <p className="font-bold text-lg">{stat.value}</p>
                  <p className="text-xs opacity-80">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};