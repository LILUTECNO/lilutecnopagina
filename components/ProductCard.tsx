import React, { useState, useEffect } from 'react';
import { Product } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { WHATSAPP_NUMBER_LINK_BASE } from '../constants.ts';
import { ShoppingCartIcon, WhatsAppIconSmall } from './Icons.tsx';

interface ProductCardProps {
  product: Product;
  onProductClick: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onProductClick, onAddToCart }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger fade-in animation
    const timer = setTimeout(() => setIsVisible(true), 50); // Small delay to ensure transition triggers
    return () => clearTimeout(timer);
  }, []);
  
  const { name, price, old_price, category, stock, images } = product;
  const hasOffer = old_price && old_price > price;
  const isAvailable = stock > 0;
  let offerBadge = null;

  if (hasOffer) {
    const discount = Math.round(((old_price - price) / old_price) * 100);
    offerBadge = (
      <div className="absolute top-3 right-3 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg z-10">
        -{discount}%
      </div>
    );
  }

  const generateWhatsAppMessageForProduct = (p: Product) => {
    const msg = `🛍️ *¡Hola LiluTecno!* 🛍️\n\nEstoy interesado en el siguiente producto:\n\n*Producto:* ${p.name}\n*Código:* ${p.id}\n\nQuisiera confirmar disponibilidad y métodos de pago. ¡Gracias! 🚀`;
    return `${WHATSAPP_NUMBER_LINK_BASE}?text=${encodeURIComponent(msg)}`;
  };

  const handleCardClick = () => {
    onProductClick(product);
  };
  
  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click when clicking button
    onAddToCart(product);
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    window.open(generateWhatsAppMessageForProduct(product), '_blank', 'noopener,noreferrer');
  };

  const placeholderImage = "https://picsum.photos/300/300?random=" + product.id;


  return (
    <div
      onClick={handleCardClick}
      className={`bg-white rounded-2xl shadow-lg flex flex-col group cursor-pointer transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-2 
                  ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
    >
      <div className="relative">
        <div className="block h-36 sm:h-44 bg-gray-100 rounded-t-2xl overflow-hidden">
          <img
            src={images[0] || placeholderImage}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={(e) => (e.currentTarget.src = placeholderImage)}
          />
        </div>
        {!isAvailable && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-t-2xl">
            <span className="font-bold text-gray-600 border border-gray-400 px-3 py-1 rounded-full bg-gray-50">AGOTADO</span>
          </div>
        )}
        {offerBadge}
      </div>
      <div className="p-4 flex flex-col flex-grow">
         <div className="flex-grow">
             <span className="text-xs font-semibold uppercase text-orange-600 tracking-wider">{category}</span>
             <h3 className="mt-1 text-sm font-bold text-gray-800 leading-snug group-hover:text-orange-700 transition-colors h-10 line-clamp-2" title={name}>
               {name}
             </h3>
         </div>

        <div className="mt-2">
            {hasOffer ? (
              <div>
                <p className="text-xs text-gray-500 line-through">{formatPrice(old_price)}</p>
                <p className="text-lg font-extrabold text-red-600">{formatPrice(price)}</p>
              </div>
            ) : (
              <p className="text-lg font-extrabold text-gray-900 h-[38px] flex items-end">{formatPrice(price)}</p>
            )}
        </div>
        
        <div className="mt-3">
          {isAvailable ? (
            <div className="flex">
              <button
                onClick={handleAddToCartClick}
                className="flex-grow bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold text-sm py-2 px-1 rounded-l-lg transition-all duration-300 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75 flex items-center justify-center"
                aria-label={`Agregar ${name} al carrito`}
              >
                <ShoppingCartIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="hidden sm:inline-block ml-1">Agregar</span>
              </button>
              <button
                onClick={handleWhatsAppClick}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-r-lg transition-all duration-300 ease-in-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 -ml-px"
                aria-label={`Consultar ${name} por WhatsApp`}
              >
                <WhatsAppIconSmall className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          ) : (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed text-sm"
            >
              Agotado
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(ProductCard);