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
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity duration-300 ease-in-out"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modal-appear [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            {/* Image Gallery */}
            <div className="flex flex-col">
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
                <img
                  id="main-modal-image"
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  onError={(e) => (e.currentTarget.src = placeholderImage)}
                />
              </div>
              
              {product.images.length > 1 && (
                <div className="thumbnail-gallery flex items-center gap-2 mt-4 overflow-x-auto pb-2">
                  {product.images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      loading="lazy"
                      alt={`Miniatura ${idx + 1} de ${product.name}`}
                      className={`w-16 h-16 object-cover rounded-md cursor-pointer border-2 transition-all duration-200
                        ${mainImage === img ? 'border-orange-500 shadow-md scale-105' : 'border-transparent hover:border-orange-300'}`}
                      onClick={() => setMainImage(img)}
                      onError={(e) => (e.currentTarget.src = "https://picsum.photos/100/100?random=" + product.id + idx)}
                    />
                  ))}
                </div>
              )}
              
               {techFeatures.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-x-6 gap-y-2 text-gray-500 flex-wrap">
                  {techFeatures.map((feature) => (
                    <div key={feature.name} className="flex flex-col items-center gap-1" title={feature.name}>
                       <feature.icon className="h-8 w-8 text-gray-700"/>
                       <span className="text-xs font-semibold">{feature.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-4 md:space-y-6 flex flex-col">
               <div className="flex items-start justify-between">
                <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 tracking-tight pr-4">{product.name}</h2>
                <button
                  onClick={onClose}
                  className="p-2 -mt-2 -mr-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
                  aria-label="Cerrar modal"
                >
                  <CloseIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Price Section */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Precio</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <p className="text-4xl font-extrabold text-red-600 tracking-tight">{formatPrice(product.price)}</p>
                  {hasOffer && (
                    <p className="text-xl font-medium text-gray-400 line-through">{formatPrice(product.old_price!)}</p>
                  )}
                  {hasOffer && (
                    <div className="ml-auto flex items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">
                      <FireIcon className="h-4 w-4" />
                      <span>OFERTA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Section */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">Disponibilidad</p>
                <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold ${isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {isAvailable ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                  {isAvailable ? `${product.stock} disponibles` : 'Agotado'}
                </div>
              </div>

              {/* Summary Section */}
              {product.summary && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">Resumen</p>
                  <p className="text-gray-700 text-base">{product.summary}</p>
                </div>
              )}
              
              {/* Features Section */}
              {product.features && product.features.length > 0 && (
                <div className="space-y-2 border-t border-gray-200 pt-4">
                  <h3 className="text-sm font-medium text-gray-500">Características Principales:</h3>
                  <ul className="list-disc list-inside space-y-1 text-gray-600 marker:text-orange-500">
                    {product.features.map((feature, idx) => <li key={idx}>{feature}</li>)}
                  </ul>
                </div>
              )}
              
              {/* Action Buttons */}
              <div className="mt-auto pt-6 space-y-3">
                {isAvailable && (
                    <button
                        onClick={handleAddToCart}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75"
                    >
                        <ShoppingCartIcon className="w-5 h-5" />
                        Agregar al Carrito
                    </button>
                )}
                 <a
                    href={isAvailable ? wompiDynamicURL : generateWhatsAppMessageForProduct(product)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-opacity-75
                        ${isAvailable 
                            ? 'bg-blue-500 hover:bg-blue-600 text-white focus:ring-blue-400' 
                            : 'bg-green-500 hover:bg-green-600 text-white focus:ring-green-400'}`}
                >
                    {isAvailable ? '💳 PAGAR AHORA (WOMPI)' : <><WhatsAppIcon className="w-5 h-5" /> CONSULTAR POR WHATSAPP</>}
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