import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShoppingBag, Search, User, LogOut, Heart, Menu, ChevronDown, SlidersHorizontal, X, Info, Tags, LayoutGrid } from 'lucide-react';
import logo from '../assets/images/lilutecnologo.png';
import ThemeToggleTRON from './ThemeToggleTRON';

interface HeaderProps {
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  totalCartItems?: number;
  onCartClick?: () => void;
  onMobileFiltersClick?: () => void;
  isHeaderVisible?: boolean;
  filteredCount?: number;
  totalAvailableCount?: number;
  categories?: string[];
  onCategorySelect?: (category: string) => void;
}

const menuGroups = [
  { label: 'Tecnología', terms: ['tecnología móvil', 'celular', 'pc', 'teclado', 'ratón', 'mouse', 'televisor', 'audio', 'seguridad', 'repuesto', 'cargador'] },
  { label: 'Estilo de vida', terms: ['morral', 'maleta', 'salud', 'belleza', 'mascota', 'regalo', 'recuerdo'] },
];

export const Header: React.FC<HeaderProps> = ({ searchTerm = '', onSearchChange = () => {}, totalCartItems = 0, onCartClick = () => {}, onMobileFiltersClick = () => {}, isHeaderVisible = true, categories = [], onCategorySelect }) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isProductPage = location.pathname.startsWith('/product/');

  const dashboard = !currentUser ? '/login' : currentUser.role === 'admin' ? '/admin' : currentUser.role === 'proveedor' ? '/proveedor' : currentUser.role === 'dropshipper' ? '/dropshipper' : '/cliente';
  const selectCategory = (category: string) => {
    onCategorySelect?.(category);
    setOpenMenu(null);
    setMobileOpen(false);
    if (location.pathname !== '/') navigate('/');
    window.setTimeout(() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' }), 50);
  };
  const groupedCategories = (terms: string[]) => categories.filter(category => terms.some(term => category.toLowerCase().includes(term)));

  const navigateToHowItWorks = () => { setMobileOpen(false); setOpenMenu(null); navigate('/como-funciona'); };
  return <header className={`sticky top-0 z-50 border-b border-white/[.08] bg-[#100719]/95 shadow-[0_10px_30px_rgba(0,0,0,.4)] backdrop-blur-2xl transition-transform duration-300 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}`}>
    <div className="bg-white/[.05] text-slate-300 text-center py-2 px-4 border-b border-white/[.08]"><p className="text-[9px] uppercase tracking-[0.28em] font-medium">Tecnología y estilo de vida · Envíos nacionales asegurados</p></div>
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-3">
        <Link to="/" className="shrink-0 flex items-center gap-2.5 transition-transform duration-300 hover:scale-[1.02]" aria-label="Inicio Lilu Tecno"><img src={logo} alt="" className="h-9 w-9 rounded-full object-contain ring-1 ring-white/10" /><span className="font-montserrat text-lg sm:text-xl font-black tracking-[0.16em] text-white">LILU TECNO</span></Link>
        {!isProductPage && <div className="relative hidden flex-1 max-w-2xl mx-auto md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input type="search" placeholder="Busca productos, marcas y categorías" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full glass-input rounded-full py-2.5 pl-11 pr-4 text-xs focus:outline-none" />
        </div>}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {!isProductPage && <button onClick={onMobileFiltersClick} className="hidden lg:hidden rounded-full border border-white/10 bg-white/5 p-2 text-orange-300 hover:bg-white/10 hover:border-orange-400/40 transition-all duration-300 hover:scale-105" aria-label="Abrir filtros"><SlidersHorizontal className="h-5 w-5" /></button>}
          <button onClick={() => navigate(dashboard)} className="hidden sm:flex items-center gap-1.5 p-2 text-slate-300 hover:text-white text-[10px] uppercase tracking-wider transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5"><User className="h-4 w-4" /><span>Mi cuenta</span></button>
          <button onClick={() => navigate(dashboard)} className="hidden md:flex items-center gap-1.5 p-2 text-slate-300 hover:text-white text-[10px] uppercase tracking-wider transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5"><Heart className="h-4 w-4" /><span>Favoritos</span></button>
          <ThemeToggleTRON label="Cambiar entre modo día y noche" />
          <button onClick={onCartClick} className="relative flex items-center gap-1.5 rounded-full border border-orange-400/30 bg-orange-400/10 p-2.5 text-orange-100 hover:bg-orange-400/20 hover:border-orange-400/50 transition-all duration-300 hover:scale-105" aria-label="Carrito de compras"><ShoppingBag className="h-5 w-5" /><span className="hidden sm:inline text-[10px] uppercase tracking-wider">Carrito</span>{totalCartItems > 0 && <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gradient-to-r from-[#ff7a00] to-[#7b2cbf] px-1 text-[9px] font-bold text-white shadow-lg">{totalCartItems}</span>}</button>
          {currentUser && <button onClick={async () => { await logout(); navigate('/'); }} className="hidden lg:block p-2 text-slate-400 hover:text-red-400 transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5" title="Cerrar sesión"><LogOut className="h-4 w-4" /></button>}
          {!isProductPage && <button onClick={() => setMobileOpen(value => !value)} className="md:hidden rounded-full border border-white/10 bg-white/5 p-2 text-white hover:bg-white/10 transition-all duration-300 hover:scale-105" aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'} aria-expanded={mobileOpen}>{mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>}
        </div>
      </div>
      {!isProductPage && <div className="relative mt-4 md:hidden"><Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" /><input type="search" placeholder="Busca productos, marcas y categorías" value={searchTerm} onChange={(e) => onSearchChange(e.target.value)} className="w-full glass-input rounded-full py-3 pl-11 pr-4 text-xs focus:outline-none" /></div>}
    </div>
    {!isProductPage && <nav className="hidden border-t border-white/[.08] md:block"><div className="container mx-auto px-4 sm:px-6 lg:px-8 flex min-w-max items-center gap-1">
      {menuGroups.map(group => <div className="relative" key={group.label}><button onClick={() => setOpenMenu(openMenu === group.label ? null : group.label)} className="flex items-center gap-1.5 px-4 py-3.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:text-white transition-colors duration-300 rounded-lg hover:bg-white/5"><Menu className="h-3.5 w-3.5" />{group.label}<ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${openMenu === group.label ? 'rotate-180' : ''}`} /></button>{openMenu === group.label && <div className="absolute left-0 top-full w-64 glass-panel p-2.5 shadow-2xl rounded-2xl mt-1"><p className="px-3 py-2 text-[9px] uppercase tracking-widest text-orange-400 font-semibold">{group.label}</p>{groupedCategories(group.terms).map(category => <button key={category} onClick={() => selectCategory(category)} className="block w-full rounded-xl px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-colors duration-200">{category}</button>)}<button onClick={() => selectCategory('')} className="block w-full rounded-xl px-3 py-2.5 text-left text-xs text-orange-300 hover:bg-white/10 transition-colors duration-200">Ver todo</button></div>}</div>)}
      <button onClick={() => selectCategory('__offers__')} className="px-4 py-3.5 text-[10px] uppercase tracking-[0.16em] text-orange-400 hover:text-orange-300 transition-colors duration-300 rounded-lg hover:bg-orange-400/5">Ofertas</button>
      <button onClick={() => selectCategory('__new__')} className="px-4 py-3.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:text-white transition-colors duration-300 rounded-lg hover:bg-white/5">Novedades</button>
      <button onClick={navigateToHowItWorks} className="flex items-center gap-1.5 px-4 py-3.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:text-white transition-colors duration-300 rounded-lg hover:bg-white/5"><Info className="h-3.5 w-3.5" />Cómo funciona</button>
      <div className="relative"><button onClick={() => setOpenMenu(openMenu === 'more' ? null : 'more')} className="flex items-center gap-1.5 px-4 py-3.5 text-[10px] uppercase tracking-[0.16em] text-slate-300 hover:text-white transition-colors duration-300 rounded-lg hover:bg-white/5">Más <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${openMenu === 'more' ? 'rotate-180' : ''}`} /></button>{openMenu === 'more' && <div className="absolute right-0 top-full max-h-[70vh] w-64 overflow-y-auto glass-panel p-2.5 shadow-2xl rounded-2xl mt-1"><p className="px-3 py-2 text-[9px] uppercase tracking-widest text-orange-400 font-semibold">Todas las categorías</p>{categories.map(category => <button key={category} onClick={() => selectCategory(category)} className="block w-full rounded-xl px-3 py-2.5 text-left text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-colors duration-200">{category}</button>)}<div className="my-2 border-t border-white/10" /><a href="mailto:soporte@lilutecno.com" className="block rounded-xl px-3 py-2.5 text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-colors duration-200">Contacto</a><a href="#preguntas" className="block rounded-xl px-3 py-2.5 text-xs text-slate-200 hover:bg-white/10 hover:text-white transition-colors duration-200">Preguntas frecuentes</a></div>}</div>
    </div></nav>}
    {!isProductPage && mobileOpen && <div className="border-t border-white/[.08] bg-[#100719]/95 px-4 py-5 md:hidden animate-fade-up"><div className="rounded-2xl border border-white/10 bg-white/[.04] p-2.5 shadow-2xl"><p className="px-3 pb-2 pt-2 text-[9px] font-bold uppercase tracking-[.24em] text-slate-500">Navegación</p><div className="grid gap-1"><button onClick={() => selectCategory('')} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-xs hover:bg-white/[.08] transition-colors duration-200"><LayoutGrid className="h-4 w-4 text-orange-300" />Ver todo el catálogo</button><button onClick={() => selectCategory('__offers__')} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-xs text-orange-300 hover:bg-white/[.08] transition-colors duration-200"><Tags className="h-4 w-4" />Ofertas</button><button onClick={() => { setMobileOpen(false); onMobileFiltersClick(); }} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-xs hover:bg-white/[.08] transition-colors duration-200"><SlidersHorizontal className="h-4 w-4 text-purple-300" />Filtrar catálogo</button><button onClick={navigateToHowItWorks} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-xs hover:bg-white/[.08] transition-colors duration-200"><Info className="h-4 w-4 text-purple-300" />Cómo funciona Lilu Tecno</button><button onClick={() => { setMobileOpen(false); navigate(dashboard); }} className="flex items-center gap-3 rounded-xl px-3 py-3.5 text-left text-xs hover:bg-white/[.08] transition-colors duration-200"><User className="h-4 w-4 text-orange-300" />Mi cuenta</button></div></div></div>}
  </header>;
};
