import React, { useState } from 'react';
import { CartItem } from '../types';
import { formatPrice } from '../utils/formatters';
import CheckoutForm from './CheckoutForm';

// Íconos ultra-finos
const XIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const TrashIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
);
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const MinusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const BagIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="w-12 h-12 text-[#D5D5D3]">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
  </svg>
);

interface CartModalProps {
  cart: CartItem[];
  onClose: () => void;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveFromCart: (productId: string) => void;
  onClearCart: () => void;
  addNotification: (message: string, type?: 'success' | 'error') => void;
}

const CartModal: React.FC<CartModalProps> = ({
  cart,
  onClose,
  onUpdateQuantity,
  onRemoveFromCart,
  onClearCart,
  addNotification,
}) => {
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  const placeholderImage = (itemId: string) => `https://picsum.photos/seed/${itemId}/100/100`;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-stretch justify-end"
      onClick={onClose}
    >
      {/* Panel lateral derecho Apple Glass — opacidad reforzada para legibilidad */}
      <div
        className="glass-panel border-y-0 border-r-0 border-l border-white/15 w-full max-w-md flex flex-col h-full animate-slide-in-right shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del carrito */}
        <div className="bg-white/[.06] border-b border-white/10 px-7 py-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="font-montserrat text-[11px] font-bold uppercase tracking-[0.3em] text-white">
              {showCheckoutForm ? 'Confirmar Pedido' : 'Tu Selección'}
            </h2>
            {!showCheckoutForm && totalItems > 0 && (
              <p className="text-[11px] text-slate-400 font-light mt-1">{totalItems} {totalItems === 1 ? 'artículo' : 'artículos'}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {cart.length > 0 && !showCheckoutForm && (
              <button
                onClick={onClearCart}
                className="text-slate-400 hover:text-red-400 transition-all duration-300 cursor-pointer hover:scale-110"
                aria-label="Vaciar carrito"
              >
                <TrashIcon />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 cursor-pointer hover:scale-110"
              aria-label="Cerrar"
            >
              <XIcon />
            </button>
          </div>
        </div>

        {/* Contenido */}
        {showCheckoutForm ? (
          <div className="flex-grow overflow-y-auto">
            <CheckoutForm
              cart={cart}
              cartTotal={cartTotal}
              onBackToCart={() => setShowCheckoutForm(false)}
              onOrderSuccess={() => {
                onClearCart();
                onClose();
                addNotification('¡Pedido recibido! Gracias por tu compra.');
              }}
            />
          </div>
        ) : cart.length === 0 ? (
          /* Carrito vacío */
          <div className="flex-grow flex flex-col items-center justify-center px-10 text-center space-y-5">
            <BagIcon />
            <div className="space-y-1.5">
              <p className="text-[13px] font-medium text-white tracking-wide">Tu carrito está vacío</p>
              <p className="text-[11px] text-slate-400 font-light leading-relaxed">Explora nuestro catálogo y agrega productos.</p>
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-10 py-3.5 btn-glass-primary text-[10px] font-semibold uppercase tracking-[0.25em] rounded-xl cursor-pointer"
            >
              Explorar Catálogo
            </button>
          </div>
        ) : (
          /* Lista de productos */
          <div className="flex flex-col flex-grow overflow-hidden">
            <div className="flex-grow overflow-y-auto px-6 py-5 space-y-4">
              {cart.map(item => (
                <div key={item.id} className="glass-card border border-white/[.07] flex gap-4 p-4 group rounded-2xl hover:bg-white/[.06]">
                  {/* Imagen */}
                  <div className="w-16 h-16 flex-shrink-0 bg-white/5 overflow-hidden rounded-xl">
                    <img
                      src={item.image || placeholderImage(item.id)}
                      alt={item.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={(e) => (e.currentTarget.src = placeholderImage(item.id))}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[12px] font-medium text-white leading-snug line-clamp-2">{item.name}</p>
                      <button
                        onClick={() => onRemoveFromCart(item.id)}
                        className="text-slate-400 hover:text-red-400 transition-all duration-300 flex-shrink-0 mt-0.5 cursor-pointer hover:scale-110 rounded p-0.5 hover:bg-red-500/10"
                        aria-label="Eliminar"
                      >
                        <XIcon />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-3">
                      {/* Controles de cantidad */}
                      <div className="flex items-center border border-white/10 rounded-lg overflow-hidden bg-white/[.05]">
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                          aria-label="Disminuir"
                        >
                          <MinusIcon />
                        </button>
                        <span className="w-8 text-center text-[12px] font-semibold text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                          className="w-7 h-7 flex items-center justify-center text-slate-400 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                          aria-label="Aumentar"
                        >
                          <PlusIcon />
                        </button>
                      </div>

                      {/* Precio */}
                      <span className="text-[13px] font-semibold text-white tracking-tight">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer con total y botones */}
            <div className="bg-black/40 border-t border-white/10 px-6 py-6 space-y-4 flex-shrink-0 backdrop-blur-md">
              <div className="flex justify-between items-baseline">
                <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Total</span>
                <span className="font-montserrat text-2xl font-light text-white tracking-tight">{formatPrice(cartTotal)}</span>
              </div>
              <div className="space-y-2.5">
                <button
                  onClick={() => setShowCheckoutForm(true)}
                  className="w-full py-4 btn-glass-primary text-[10px] font-semibold uppercase tracking-[0.25em] rounded-xl cursor-pointer"
                >
                  Finalizar Compra
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 btn-glass-secondary text-[10px] font-semibold uppercase tracking-[0.2em] rounded-xl cursor-pointer"
                >
                  Seguir Comprando
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartModal;