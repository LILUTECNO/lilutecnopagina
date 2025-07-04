import React, { useState } from 'react';
import { CartItem } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { WOMPI_PAYMENT_LINK_BASE, WHATSAPP_NUMBER_LINK_BASE } from '../constants.ts';
import { CloseIcon, TrashIcon, PlusIcon, MinusIcon, ShoppingBagIcon } from './Icons.tsx';

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
  addNotification
}) => {
  const [showCheckoutForm, setShowCheckoutForm] = useState(false);
  const [customerDetails, setCustomerDetails] = useState({ name: '', phone: '', address: '', comments: '' });

  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  
  const wompiCartReference = `LTCart-${Date.now()}`;
  const wompiCartURL = `${WOMPI_PAYMENT_LINK_BASE}?reference=${wompiCartReference}&amount-in-cents=${cartTotal * 100}`;


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setCustomerDetails(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerDetails.name || !customerDetails.phone) {
      addNotification('Por favor ingresa tu nombre y teléfono.', 'error');
      return;
    }

    let msg = `📄 *NUEVO PEDIDO LILUTECNO (#LT${Math.floor(100000 + Math.random() * 900000)})*\n\n`;
    msg += `*CLIENTE:*\n👤 Nombre: ${customerDetails.name}\n📞 Teléfono: ${customerDetails.phone}\n`;
    if (customerDetails.address) msg += `📍 Dirección: ${customerDetails.address}\n`;
    msg += `\n*PRODUCTOS:*\n`;
    cart.forEach(item => {
      msg += `\n• ${item.name} (x${item.quantity}) - ${formatPrice(item.price * item.quantity)}`;
    });
    msg += `\n\n*TOTAL DEL PEDIDO: ${formatPrice(cartTotal)}*\n`;
    if (customerDetails.comments) msg += `\n*Comentarios:*\n_${customerDetails.comments}_\n`;
    msg += `\nUn asesor confirmará el pedido y el pago. ¡Gracias por tu compra! 🚀`;

    const whatsappURL = `${WHATSAPP_NUMBER_LINK_BASE}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappURL, '_blank', 'noopener,noreferrer');
    
    addNotification('¡Pedido enviado por WhatsApp! Te contactaremos pronto.');
    onClearCart();
    onClose();
  };
  
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
        <div className="bg-gradient-to-r from-green-500 to-teal-500 p-4 sm:p-6 text-white flex items-center justify-between rounded-t-2xl">
          <h2 className="text-xl sm:text-2xl font-bold">Mi Carrito ({totalItems})</h2>
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
          <form onSubmit={handleCheckoutSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
            <h3 className="text-lg font-semibold text-gray-700">Finalizar Compra por WhatsApp</h3>
            <input type="text" name="name" value={customerDetails.name} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400" placeholder="Nombre completo *" />
            <input type="tel" name="phone" value={customerDetails.phone} onChange={handleInputChange} required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400" placeholder="Teléfono *" />
            <input type="text" name="address" value={customerDetails.address} onChange={handleInputChange} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400" placeholder="Dirección de entrega (opcional)" />
            <textarea name="comments" value={customerDetails.comments} onChange={handleInputChange} rows={2} className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-400 focus:border-green-400" placeholder="Comentarios (opcional)"></textarea>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex justify-between font-bold text-gray-700">
                <span>Total del Pedido:</span>
                <span className="text-green-600 text-xl">{formatPrice(cartTotal)}</span>
              </div>
            </div>
            <div className="space-y-3 pt-2">
              <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                🚀 ENVIAR PEDIDO POR WHATSAPP
              </button>
              <button type="button" onClick={() => setShowCheckoutForm(false)} className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                ← Volver al carrito
              </button>
            </div>
          </form>
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
            <div className="border-t border-gray-200 pt-4 mt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-semibold text-gray-700">Total:</span>
                <span className="text-2xl font-bold text-green-600">{formatPrice(cartTotal)}</span>
              </div>
              <div className="space-y-3">
                 <a
                    href={wompiCartURL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => addNotification('Redirigiendo a la pasarela de pago...')}
                    className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-lg font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                >
                    💳 PAGAR CON WOMPI
                </a>
                <button onClick={() => setShowCheckoutForm(true)} className="w-full bg-green-500 hover:bg-green-600 text-white text-lg font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5">
                  🛒 FINALIZAR POR WHATSAPP
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