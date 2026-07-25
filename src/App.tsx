import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { vitrinaListPublic } from './services/vitrina';
import type { Product } from './types';
import { MAX_PRICE } from './constants';
import { Header } from './components/Header';
import FiltersDesktop from './components/FiltersDesktop';
import ProductGrid from './components/ProductGrid';
import ProductCard from './components/ProductCard';
import WhatsAppButton from './components/WhatsAppButton';
import CartModal from './components/CartModal';
import FiltersMobileModal from './components/FiltersMobileModal';
import HeroCarousel from './components/HeroCarousel';
import { useProducts } from './hooks/useProducts';
import { useUI } from './hooks/useUI';
import { useCartContext } from './context/CartContext';
import { useAuth } from './context/AuthContext';
import { toast } from 'react-hot-toast';

export const App: React.FC = () => {
  const { cart, addToCart, removeFromCart, updateCartQuantity, clearCart, totalCartItems } = useCartContext();
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const {
    allProducts,
    filteredProducts,
    categories,
    filters,
    loading,
    handleSetFilters,
    handlePriceRangeChange,
    clearFilters,
    productsOnOfferCount,
    totalAvailableCount,
  } = useProducts();

  const {
    isCartModalOpen,
    isMobileFiltersModalOpen,
    isHeaderVisible,
    openCartModal,
    closeCartModal,
    openMobileFiltersModal,
    setMobileFiltersModalOpen,
  } = useUI();

  // --- Vitrina Home admin (con fallback al comportamiento anterior si está vacía) ---
  const [vitrina, setVitrina] = useState<{ destacados: Product[]; ofertas: Product[]; novedades: Product[] }>({ destacados: [], ofertas: [], novedades: [] });
  useEffect(() => {
    if (loading || allProducts.length === 0) return;
    let cancelled = false;
    (async () => {
      const [d, o, n] = await Promise.all([
        vitrinaListPublic('destacados'),
        vitrinaListPublic('ofertas'),
        vitrinaListPublic('novedades'),
      ]);
      if (cancelled) return;
      const toProducts = (items: { product: (Product & { id: string }) | null }[]) =>
        items.map((it) => it.product).filter((p): p is Product & { id: string } => p !== null);
      setVitrina({
        destacados: toProducts(d),
        ofertas: toProducts(o),
        novedades: toProducts(n),
      });
    })();
    return () => { cancelled = true; };
  }, [loading, allProducts.length]);
  const vitrinaDestacados = useMemo(() => vitrina.destacados, [vitrina.destacados]);
  const vitrinaOfertas = useMemo(() => vitrina.ofertas, [vitrina.ofertas]);
  const vitrinaNovedades = useMemo(() => vitrina.novedades, [vitrina.novedades]);

  const handleAddToCart = (product: any) => {
    if (!currentUser) {
      toast.error('Inicia sesión para añadir productos al carrito.');
      navigate('/login');
      return;
    }

    // Si es dropshipper, se aplica el 15% de descuento mayorista
    const priceWithRole =
      currentUser.role === 'dropshipper'
        ? (product.vendorPrice ?? Math.round(product.price * 0.85))
        : product.price;

    addToCart({ ...product, price: priceWithRole });
    toast.success(`${product.name.substring(0, 30)}... añadido al carrito.`);
  };

  return (
    <div className="flex flex-col min-h-screen bg-transparent font-sans text-white">
      <Header
        isHeaderVisible={isHeaderVisible}
        searchTerm={filters.searchTerm}
        onSearchChange={(term) => handleSetFilters({ searchTerm: term })}
        totalCartItems={totalCartItems}
        onCartClick={openCartModal}
        onMobileFiltersClick={openMobileFiltersModal}
        filteredCount={productsOnOfferCount}
        totalAvailableCount={totalAvailableCount}
        categories={categories}
        onCategorySelect={(category) => handleSetFilters({ category })}
      />

      <HeroCarousel />

      {/* Vitrinas comerciales: usa home_vitrina (admin) si tiene items; si no, fallback al inventario por collections (cero riesgo). */}
      {!loading && allProducts.length > 0 && (
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 pb-4 space-y-12">
          {(() => {
            const destacados = vitrinaDestacados.length > 0
              ? vitrinaDestacados
              : allProducts.filter(p => p.stock > 0 && (p.collections?.featured ?? true));
            const ofertas = vitrinaOfertas.length > 0
              ? vitrinaOfertas
              : allProducts.filter(p => p.old_price && p.old_price > p.price && (p.collections?.offers ?? true));
            const novedades = vitrinaNovedades.length > 0
              ? vitrinaNovedades
              : [...allProducts].filter(p => p.collections?.new ?? true).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
            return [
              { title: 'Productos destacados', items: destacados },
              { title: 'Ofertas para ti', items: ofertas },
              { title: 'Novedades', items: novedades },
            ].filter(section => section.items.length > 0).map(section => (
              <div key={section.title}>
                <div className="flex items-center justify-between mb-5"><h2 className="font-montserrat text-2xl font-light text-white">{section.title}</h2><a href="#catalogo" className="text-[10px] uppercase tracking-widest text-orange-400 hover:text-white">Ver todo</a></div>
                <div className="product-strip">{section.items.map(product => <div key={product.id} className="product-strip__item"><ProductCard product={product} onAddToCart={handleAddToCart} /></div>)}</div>
              </div>
            ));
          })()}
        </section>
      )}

      {/* ── Catálogo ── */}
      <main id="catalogo" className="container mx-auto px-4 sm:px-6 lg:px-8 py-16 flex-grow">
        <div className="flex flex-col lg:flex-row gap-12">

          {/* Filtros */}
          <FiltersDesktop
            categories={categories}
            filters={filters}
            onFilterChange={handleSetFilters}
            onPriceChange={handlePriceRangeChange}
            onClearFilters={clearFilters}
            maxPrice={MAX_PRICE}
          />

          {/* Grid de productos */}
          <div className="flex-grow">
            {/* Barra de resultados de cristal */}
            <div className="flex justify-between items-center mb-8 pb-3 border-b border-white/10">
              <p className="text-[10px] uppercase tracking-[0.25em] text-slate-400 font-light">
                {loading
                  ? 'Cargando productos...'
                  : `${filteredProducts.length} ${filteredProducts.length === 1 ? 'producto' : 'productos'}`}
              </p>
              {productsOnOfferCount > 0 && (
                <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-medium">
                  {productsOnOfferCount} en oferta
                </span>
              )}
            </div>

            {/* Estado de carga */}
            {loading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="glass-card animate-pulse rounded-2xl overflow-hidden border border-white/5">
                    <div className="aspect-square bg-white/5" />
                    <div className="p-4 space-y-3">
                      <div className="h-2 bg-white/10 w-1/3 rounded-full" />
                      <div className="h-3 bg-white/10 w-3/4 rounded-full" />
                      <div className="h-3 bg-white/10 w-1/2 rounded-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ProductGrid
                products={filteredProducts}
                onAddToCart={handleAddToCart}
              />
            )}
          </div>
        </div>
      </main>

      <section id="preguntas" className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="glass-card rounded-2xl p-7 sm:p-10 grid gap-6 md:grid-cols-3">
          <div><p className="text-[10px] uppercase tracking-[0.2em] text-orange-400">Compra con confianza</p><h2 className="mt-2 font-montserrat text-2xl font-light">Preguntas frecuentes</h2></div>
          <div><h3 className="text-sm font-medium">¿Cómo consulto mi pedido?</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">Ingresa a Mi cuenta para revisar el estado de tus compras.</p></div>
          <div><h3 className="text-sm font-medium">¿Necesitas ayuda?</h3><p className="mt-2 text-xs leading-relaxed text-slate-400">Nuestro equipo está disponible por WhatsApp y correo para orientarte.</p></div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/10 bg-black/20 backdrop-blur-md text-center py-12 px-4 space-y-2">
        <span className="font-montserrat text-sm font-bold tracking-[0.35em] text-white">
          LILUTECNO
        </span>
        <p className="text-[10px] text-slate-400 uppercase tracking-[0.2em] font-light">
          &copy; {new Date().getFullYear()} LiluTecno. Todos los derechos reservados.
        </p>
        <p className="text-[10px] text-orange-400 uppercase tracking-[0.2em] font-medium pt-1">
          Tecnología Mundial a Tu Alcance
        </p>
      </footer>

      {/* ── Modales ── */}
      {isCartModalOpen && (
        <CartModal
          cart={cart}
          onClose={closeCartModal}
          onUpdateQuantity={updateCartQuantity}
          onRemoveFromCart={removeFromCart}
          onClearCart={clearCart}
          addNotification={() => {}}
        />
      )}

      {isMobileFiltersModalOpen && (
        <FiltersMobileModal
          isOpen={isMobileFiltersModalOpen}
          onClose={() => setMobileFiltersModalOpen(false)}
          categories={categories}
          currentFilters={filters}
          onApplyFilters={(appliedFilters) => {
            handleSetFilters(appliedFilters);
            setMobileFiltersModalOpen(false);
          }}
          maxPrice={MAX_PRICE}
        />
      )}

      <WhatsAppButton />
    </div>
  );
};
