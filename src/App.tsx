import React from 'react';
import { MAX_PRICE } from './constants';
import { Header } from './components/Header';
import FiltersDesktop from './components/FiltersDesktop';
import ProductGrid from './components/ProductGrid';
import WhatsAppButton from './components/WhatsAppButton';
import Notification from './components/Notification';
import CartModal from './components/CartModal';
import FiltersMobileModal from './components/FiltersMobileModal';
import { useProducts } from './hooks/useProducts';
import { useUI } from './hooks/useUI';
import { useCartContext } from './context/CartContext';

export const App: React.FC = () => {
  const { notifications, addNotification, removeNotification, cart, addToCart, removeFromCart, updateCartQuantity, clearCart, totalCartItems } = useCartContext();
  const {
    filteredProducts,
    categories,
    filters,
    handleSetFilters,
    handlePriceRangeChange,
    clearFilters,
    productsOnOfferCount,
    totalAvailableCount
  } = useProducts();
  const {
    isCartModalOpen,
    isMobileFiltersModalOpen,
    isHeaderVisible,
    openCartModal,
    closeCartModal,
    openMobileFiltersModal,
    setMobileFiltersModalOpen
  } = useUI();

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <script src="https://checkout.wompi.co/widget.js"></script>
      <Header
        isHeaderVisible={isHeaderVisible}
        searchTerm={filters.searchTerm}
        onSearchChange={(term) => handleSetFilters({ searchTerm: term })}
        totalCartItems={totalCartItems}
        onCartClick={openCartModal}
        onMobileFiltersClick={openMobileFiltersModal}
        filteredCount={productsOnOfferCount}
        totalAvailableCount={totalAvailableCount}
      />
      
      <main className="container mx-auto px-4 py-8 flex-grow">
        <div className="flex flex-col lg:flex-row gap-8">
          <FiltersDesktop
            categories={categories}
            filters={filters}
            onFilterChange={handleSetFilters}
            onPriceChange={handlePriceRangeChange}
            onClearFilters={clearFilters}
            maxPrice={MAX_PRICE}
          />
          <ProductGrid
            products={filteredProducts}
            onAddToCart={addToCart}
          />
        </div>
      </main>

      <footer className="bg-gray-800 text-white text-center py-6">
        <p>&copy; {new Date().getFullYear()} LiluTecno. Todos los derechos reservados.</p>
        <p className="text-sm text-gray-400">Tecnología Mundial a Tu Alcance!</p>
      </footer>

      {isCartModalOpen && (
        <CartModal
          cart={cart}
          onClose={closeCartModal}
          onUpdateQuantity={updateCartQuantity}
          onRemoveFromCart={removeFromCart}
          onClearCart={clearCart}
          addNotification={addNotification}
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
      <div className="fixed top-4 right-4 z-[1000] space-y-2">
        {notifications.map(n => (
          <Notification key={n.id} message={n.message} type={n.type} onClose={() => removeNotification(n.id)} />
        ))}
      </div>
    </div>
  );
};