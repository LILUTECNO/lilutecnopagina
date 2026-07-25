import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { WHATSAPP_NUMBER_LINK_BASE } from '../constants.ts';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

// Ícono WhatsApp ultra-fino
const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.555 4.122 1.528 5.856L.057 23.286c-.083.34.235.643.57.55l5.584-1.467A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818c-1.87 0-3.618-.503-5.12-1.38l-.367-.216-3.813 1.003 1.018-3.71-.237-.38A9.799 9.799 0 012.182 12C2.182 6.574 6.574 2.182 12 2.182S21.818 6.574 21.818 12 17.426 21.818 12 21.818z"/>
  </svg>
);

// Ícono carrito ultra-fino
const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm6.75 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
  </svg>
);

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToCart }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const { name, price, old_price, category, stock, images } = product;
  const hasOffer = old_price && old_price > price;
  const isAvailable = stock > 0;
  const discount = hasOffer ? Math.round(((old_price - price) / old_price) * 100) : 0;

  const placeholderImage = `https://picsum.photos/seed/${product.id}/400/400`;

  const generateWhatsAppMsg = (p: Product) => {
    const msg = `🛍️ *¡Hola LiluTecno!*\n\nEstoy interesado en:\n*${p.name}*\nCódigo: ${p.id}\n\n¿Está disponible? ¡Gracias!`;
    return `${WHATSAPP_NUMBER_LINK_BASE}?text=${encodeURIComponent(msg)}`;
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onAddToCart(product);
  };

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    window.open(generateWhatsAppMsg(product), '_blank', 'noopener,noreferrer');
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className={`
        group relative flex flex-col glass-card rounded-2xl overflow-hidden
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}
      `}
      style={{ transitionProperty: 'opacity, transform, border-color, box-shadow' }}
    >
      {/* Badge descuento glass */}
      {hasOffer && (
        <div className="absolute top-3 left-3 z-10 bg-gradient-to-r from-[#ff7a00] to-[#7b2cbf] text-white px-2.5 py-1 text-[9px] font-semibold tracking-[0.18em] uppercase rounded-full shadow-lg ring-1 ring-white/15">
          -{discount}%
        </div>
      )}

      {/* Badge Agotado glass */}
      {!isAvailable && (
        <div className="absolute inset-0 z-10 bg-black/70 backdrop-blur-md flex items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-300 border border-white/15 px-5 py-2.5 rounded-full bg-black/40">
            Sin Stock
          </span>
        </div>
      )}

      {/* Imagen */}
      <div className="relative aspect-square bg-white/[.03] overflow-hidden">
        {!imgLoaded && (
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
        )}
        <img
          src={images?.[0] || placeholderImage}
          alt={name}
          loading="lazy"
          onLoad={() => setImgLoaded(true)}
          onError={(e) => {
            e.currentTarget.src = placeholderImage;
            setImgLoaded(true);
          }}
          className={`
            w-full h-full object-cover transition-transform duration-700 ease-out
            group-hover:scale-[1.05]
            ${imgLoaded ? 'opacity-100' : 'opacity-0'}
          `}
        />
        {/* Overlay sutil en hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      {/* Contenido */}
      <div className="flex flex-col flex-grow p-5 space-y-3.5">
        {/* Categoría */}
        <span className="text-[9px] font-semibold uppercase tracking-[0.28em] text-orange-400/90">
          {category}
        </span>

        {/* Nombre del producto */}
        <h3 className="text-[13px] font-medium text-white leading-snug line-clamp-2 min-h-[2.5rem] group-hover:text-orange-400 transition-colors duration-300">
          {name}
        </h3>

        {/* Precio */}
        <div className="pt-1">
          {hasOffer ? (
            <div className="space-y-1">
              <p className="text-[11px] text-slate-500 line-through font-light tracking-wide">
                {formatPrice(old_price)}
              </p>
              <p className="text-[18px] font-semibold text-white tracking-tight">
                {formatPrice(price)}
              </p>
            </div>
          ) : (
            <p className="text-[18px] font-semibold text-white tracking-tight">
              {formatPrice(price)}
            </p>
          )}
        </div>

        {/* Botones de acción */}
        <div className="flex gap-2 pt-2">
          {isAvailable ? (
            <>
              {/* Agregar al carrito */}
              <button
                onClick={handleAddToCartClick}
                aria-label={`Agregar ${name} al carrito`}
                className="
                  flex-grow flex items-center justify-center gap-2
                  btn-glass-primary
                  py-2.5 px-3 text-[10px] font-semibold tracking-[0.14em] uppercase
                  rounded-xl cursor-pointer
                  active:scale-[0.97]
                "
              >
                <CartIcon />
                <span>Agregar</span>
              </button>

              {/* WhatsApp */}
              <button
                onClick={handleWhatsAppClick}
                aria-label={`Consultar ${name} por WhatsApp`}
                className="
                  flex items-center justify-center
                  border border-[#25D366]/30 text-[#25D366]
                  bg-[#25D366]/10 backdrop-blur-md
                  px-3 py-2.5 rounded-xl cursor-pointer
                  transition-all duration-300
                  hover:bg-[#25D366] hover:text-white hover:border-[#25D366]
                  hover:scale-105
                  active:scale-[0.97]
                "
              >
                <WhatsAppIcon />
              </button>
            </>
          ) : (
            <button
              disabled
              className="w-full py-2.5 text-[10px] font-semibold tracking-[0.18em] uppercase text-slate-500 border border-white/10 bg-white/5 rounded-xl cursor-not-allowed"
            >
              Sin Disponibilidad
            </button>
          )}
        </div>
      </div>

      {/* Línea animada inferior con degradado naranja-morado */}
      <div className="absolute bottom-0 left-0 h-[2px] w-0 bg-gradient-to-r from-[#ff7a00] to-[#7b2cbf] group-hover:w-full transition-all duration-500 ease-out" />
    </Link>
  );
};

export default React.memo(ProductCard);