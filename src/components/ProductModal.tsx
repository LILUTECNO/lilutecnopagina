import React, { useState, useMemo } from 'react';
import { Product } from '../types.ts';
import { formatPrice } from '../utils/formatters.ts';
import { WOMPI_PAYMENT_LINK_BASE, WHATSAPP_NUMBER_LINK_BASE } from '../constants.ts';
import { CloseIcon, CheckCircleIcon, XCircleIcon, ShoppingCartIcon, WhatsAppIcon, FireIcon, HdmiIcon, BluetoothIcon } from './Icons.tsx';

interface ProductModalProps {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onAddToCart }) => {
  const [mainImage, setMainImage] = useState(product.images[0] || "https://picsum.photos/600/600?random=" + product.id);

  const techFeatures = useMemo(() => {
    const features: { name: string; icon: React.FC<any> }[] = [];
    const featureString = product.features.join(' ').toLowerCase();

    if (featureString.includes('hdmi')) {
      features.push({ name: 'HDMI', icon: HdmiIcon });
    }
    if (featureString.includes('bluetooth') || featureString.includes('bt')) {
      features.push({ name: 'Bluetooth', icon: BluetoothIcon });
    }
    return features;
  }, [product.features]);

  const isAvailable = product.stock > 0;
  const hasOffer = product.old_price && product.old_price > product.price;
  const wompiDynamicURL = `${WOMPI_PAYMENT_LINK_BASE}?reference=${product.id}&amount-in-cents=${product.price * 100}`;
  
  const generateWhatsAppMessageForProduct = (p: Product) => {
    const msg = `🛍️ *¡Hola LiluTecno!* 🛍️\n\nEstoy interesado en el siguiente producto:\n\n*Producto:* ${p.name}\n*Código:* ${p.id}\n*Precio:* ${formatPrice(p.price)}\n\nQuisiera confirmar disponibilidad y métodos de pago. ¡Gracias! 🚀`;
    return `${WHATSAPP_NUMBER_LINK_BASE}?text=${encodeURIComponent(msg)}`;
  };

  const handleAddToCart = () => {
    onAddToCart(product);
    onClose(); // Optionally close modal after adding to cart
  };
  
  const placeholderImage = "https://picsum.photos/600/600?random=" + product.id;

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div
        className="glass-panel rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-appear [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-12">
            {/* Image Gallery */}
            <div className="flex flex-col">
              <div className="relative w-full aspect-square bg-white/[.04] rounded-2xl shadow-lg border border-white/10 overflow-hidden">
                <img
                  id="main-modal-image"
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain transition-transform duration-700 hover:scale-[1.03]"
                  onError={(e) => (e.currentTarget.src = placeholderImage)}
                />
              </div>
              
              {product.images.length > 1 && (
                <div className="thumbnail-gallery flex items-center gap-2 mt-5 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      loading="lazy"
                      alt={`Miniatura ${idx + 1} de ${product.name}`}
                      className={`w-16 h-16 object-cover rounded-xl cursor-pointer border-2 transition-all duration-300
                        ${mainImage === img ? 'border-orange-500 shadow-md scale-105' : 'border-white/10 hover:border-orange-300/60 hover:scale-105'}`}
                      onClick={() => setMainImage(img)}
                      onError={(e) => (e.currentTarget.src = "https://picsum.photos/100/100?random=" + product.id + idx)}
                    />
                  ))}
                </div>
              )}
              
               {techFeatures.length > 0 && (
                <div className="mt-5 pt-5 border-t border-white/10 flex items-center justify-center gap-x-6 gap-y-2 text-slate-400 flex-wrap">
                  {techFeatures.map((feature) => (
                    <div key={feature.name} className="flex flex-col items-center gap-1.5 transition-all duration-300 hover:text-orange-400" title={feature.name}>
                       <feature.icon className="h-8 w-8 text-orange-400/90"/>
                       <span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{feature.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-5 md:space-y-7 flex flex-col">
               <div className="flex items-start justify-between">
                <h2 className="font-montserrat text-2xl md:text-3xl font-bold text-white tracking-tight pr-4 leading-tight">{product.name}</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mt-2 -mr-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 flex-shrink-0 hover:scale-110"
                  aria-label="Cerrar modal"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Price Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Precio</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <p className="text-4xl font-bold text-white tracking-tight">{formatPrice(product.price)}</p>
                  {hasOffer && (
                    <p className="text-xl font-light text-slate-500 line-through">{formatPrice(product.old_price!)}</p>
                  )}
                  {hasOffer && (
                    <div className="ml-auto flex items-center gap-1 rounded-full bg-gradient-to-r from-[#ff7a00]/20 to-[#7b2cbf]/20 border border-[#ff7a00]/40 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">
                      <FireIcon className="h-4 w-4" />
                      <span>OFERTA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Disponibilidad</p>
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.15em] ${isAvailable ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-red-500/15 text-red-400 border border-red-500/30'}`}>
                  {isAvailable ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                  {isAvailable ? `${product.stock} disponibles` : 'Agotado'}
                </div>
              </div>

              {/* Summary Section */}
              {product.summary && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Resumen</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{product.summary}</p>
                </div>
              )}
              
              {/* Features Section */}
              {product.features && product.features.length > 0 && (
                <div className="space-y-3 border-t border-white/10 pt-5">
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.25em] text-slate-400">Características Principales</h3>
                  <ul className="list-disc list-inside space-y-1.5 text-slate-300 text-sm marker:text-orange-400 leading-relaxed">
                    {product.features.map((feature, idx) => <li key={idx}>{feature}</li>)}
                  </ul>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="mt-auto pt-6 space-y-3">
                {isAvailable && (
                    <button
                        onClick={handleAddToCart}
                        className="w-full flex items-center justify-center gap-2 btn-glass-primary font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg tracking-[0.12em] text-[10px] uppercase"
                    >
                        <ShoppingCartIcon className="w-5 h-5" />
                        Agregar al Carrito
                    </button>
                )}
                 <a
                    href={isAvailable ? wompiDynamicURL : generateWhatsAppMessageForProduct(product)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-center gap-2 font-semibold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-opacity-75 text-[10px] uppercase tracking-[0.12em]
                        ${isAvailable 
                            ? 'glass-card border border-white/10 text-white hover:border-orange-400/40 hover:bg-white/[.08] focus:ring-orange-400' 
                            : 'border border-[#25D366]/30 bg-[#25D366]/10 backdrop-blur-md text-[#25D366] hover:bg-[#25D366]/20 focus:ring-green-400'}`}
                >
                    {isAvailable ? '💳 Pagar ahora' : <><WhatsAppIcon className="w-5 h-5" /> CONSULTAR POR WHATSAPP</>}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;