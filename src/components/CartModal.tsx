import React, { useState } from 'react';
import { CartItem } from '../types';
import { formatPrice } from '../utils/formatters';
import { CloseIcon, TrashIcon, PlusIcon, MinusIcon, ShoppingBagIcon } from './Icons';
import CheckoutForm from './CheckoutForm';

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

  const placeholderImage = (itemId: string) => `https://picsum.photos/100/100?random=${itemId}`;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div
        className="bg-gray-50 rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-appear"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 sm:p-6 text-white flex items-center justify-between rounded-t-2xl flex-shrink-0">
          <h2 className="text-xl sm:text-2xl font-bold">
            {showCheckoutForm ? 'Confirmar Pedido' : `Mi Carrito (${totalItems})`}
          </h2>
          <div className="flex items-center gap-3">
            {cart.length > 0 && !showCheckoutForm && (
              <button onClick={onClearCart} aria-label="Vaciar carrito" className="hover:text-red-200 transition-colors">
                <TrashIcon className="h-5 w-5" />
              </button>
            )}
            <button onClick={onClose} aria-label="Cerrar modal" className="hover:text-red-200 transition-colors">
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {showCheckoutForm ? (
          <div className="flex-grow overflow-y-auto p-1">
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
          <div className="p-6 text-center flex flex-col items-center justify-center flex-grow">
            <ShoppingBagIcon className="w-16 h-16 text-gray-300 mb-4" />
            <h2 className="text-xl font-bold text-gray-700 mb-2">Tu carrito está vacío</h2>
            <p className="text-gray-500 mb-6">Añade productos para verlos aquí.</p>
            <button onClick={onClose} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-6 rounded-lg shadow hover:shadow-md transition-all">
              Continuar Comprando
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-6 flex-grow flex flex-col">
            <div className="space-y-4 flex-grow overflow-y-auto max-h-96 pr-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-100 [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              {cart.map(item => (
                <div key={item.id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                  <img
                    src={item.image || placeholderImage(item.id)}
                    alt={item.name}
                    className="w-16 h-16 object-cover rounded-md border border-gray-100"
                    onError={(e) => (e.currentTarget.src = placeholderImage(item.id))}
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm truncate" title={item.name}>{item.name}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-bold text-green-600 text-sm">{formatPrice(item.price)}</span>
                      <div className="flex items-center gap-1">
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors" aria-label="Disminuir cantidad">
                          <MinusIcon className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm text-gray-700">{item.quantity}</span>
                        <button onClick={() => onUpdateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors" aria-label="Aumentar cantidad">
                          <PlusIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => onRemoveFromCart(item.id)} className="w-7 h-7 rounded-full bg-red-100 hover:bg-red-200 flex items-center justify-center ml-2 text-red-600 transition-colors" aria-label="Eliminar producto">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-200 pt-4 mt-4 flex-shrink-0">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-semibold text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-green-600">{formatPrice(cartTotal)}</span>
              </div>
              <div className="space-y-3">
                <button
                  onClick={() => setShowCheckoutForm(true)}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg"
                >
                  Finalizar Compra
                </button>
                <button onClick={onClose} className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  Continuar Comprando
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