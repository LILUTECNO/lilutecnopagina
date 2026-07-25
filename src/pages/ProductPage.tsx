import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { Product } from '../types';
import { formatPrice } from '../utils/formatters';
import { CheckCircleIcon, XCircleIcon, ShoppingCartIcon, FireIcon, HdmiIcon, BluetoothIcon, ArrowLeftIcon } from '../components/Icons'; // Importar ArrowLeftIcon
import { Header } from '../components/Header';
import { useProducts } from '../hooks/useProducts';
import { useUI } from '../hooks/useUI';
import { useCartContext } from '../context/CartContext';
import CartModal from '../components/CartModal';

const ProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState<string>('');

  const { addNotification, addToCart, totalCartItems, cart, removeFromCart, updateCartQuantity, clearCart } = useCartContext();
  const {
    filters,
    handleSetFilters,
    productsOnOfferCount,
    totalAvailableCount
  } = useProducts();
  const {
    isHeaderVisible,
    openCartModal, closeCartModal, isCartModalOpen,
    openMobileFiltersModal
  } = useUI();

  useEffect(() => {
    const fetchProduct = async () => {
      if (!productId) {
        setError('ID de producto no proporcionado.');
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'products', productId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const rawData = docSnap.data() as Omit<Product, 'id'>;
          const productData = { id: docSnap.id, ...rawData, images: Array.isArray(rawData.images) ? rawData.images : String(rawData.images || '').split(',').map(url => url.trim()).filter(Boolean), features: Array.isArray(rawData.features) ? rawData.features : [] } as Product;
          setProduct(productData);
          setMainImage(productData.images[0] || `https://picsum.photos/600/600?random=${productData.id}`);
        } else {
          setError('Producto no encontrado.');
        }
      } catch (err) {
        setError('Error al cargar el producto.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
    // Mejorar experiencia: scroll al top al cargar producto
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [productId]);

  const techFeatures = useMemo(() => {
    if (!product) return [];
    const features: { name: string; icon: React.FC<any> }[] = [];
    const featureString = product.features.join(' ').toLowerCase();
    if (featureString.includes('hdmi')) {
      features.push({ name: 'HDMI', icon: HdmiIcon });
    }
    if (featureString.includes('bluetooth') || featureString.includes('bt')) {
      features.push({ name: 'Bluetooth', icon: BluetoothIcon });
    }
    return features;
  }, [product]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-grow flex items-center justify-center">
          <span className="sr-only">Cargando producto...</span>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center text-center">
          <p className="text-lg text-red-600" role="alert">Error: {error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            Volver al inicio
          </button>
        </main>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-grow flex flex-col items-center justify-center text-center">
          <p className="text-lg text-gray-700">Producto no disponible.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            Volver al inicio
          </button>
        </main>
      </div>
    );
  }

  const isAvailable = product.stock > 0;
  const hasOffer = product.old_price && product.old_price > product.price;
  
  const handleAddToCart = () => {
    if (product) {
      addToCart(product);
      addNotification(`¡${product.name} añadido al carrito!`, 'success');
    } else {
      addNotification("Error: No se pudo añadir el producto al carrito.", 'error');
    }
  };

  const placeholderImage = `https://picsum.photos/600/600?random=${product.id}`;

  return (
    <div className="flex flex-col min-h-screen text-white">
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
      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12 flex-grow">
        <section className="mx-auto w-full max-w-6xl rounded-3xl border border-white/10 bg-[#130a20]/75 p-5 shadow-2xl backdrop-blur-xl sm:p-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-7 flex items-center text-sm text-slate-300 hover:text-orange-300 transition-colors focus:outline-none"
            aria-label="Volver a la lista de productos"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver
          </button>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Image Gallery */}
            <div className="flex flex-col">
              <div className="relative w-full aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[.04] shadow-xl">
                <img
                  id="main-modal-image"
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => (e.currentTarget.src = placeholderImage)}
                  tabIndex={0}
                  aria-label={`Imagen principal de ${product.name}`}
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
                        ${mainImage === img ? 'border-orange-400 shadow-md scale-105' : 'border-white/10 hover:border-purple-300'}`}
                      onClick={() => setMainImage(img)}
                      onKeyDown={(e) => { if (e.key === 'Enter') setMainImage(img); }}
                      tabIndex={0}
                      aria-label={`Seleccionar miniatura ${idx + 1} de ${product.name}`}
                      onError={(e) => (e.currentTarget.src = `https://picsum.photos/100/100?random=${product.id}${idx}`)}
                    />
                  ))}
                </div>
              )}
              {techFeatures.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-white/10 pt-5 text-slate-300">
                  {techFeatures.map((feature) => (
                    <div key={feature.name} className="flex flex-col items-center gap-1" title={feature.name}>
                      <feature.icon className="h-8 w-8 text-orange-300" />
                      <span className="text-xs font-semibold">{feature.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Details */}
            <div className="space-y-4 md:space-y-6 flex flex-col">
               <div className="flex items-start justify-between">
                <div><p className="mb-3 text-[10px] font-bold uppercase tracking-[.25em] text-orange-400">{product.category}</p><h1 className="pr-4 font-montserrat text-3xl font-light tracking-tight sm:text-4xl">{product.name}</h1></div>
              </div>

              {/* Price Section */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">Precio especial</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <p className="text-4xl font-bold tracking-tight text-orange-400">{formatPrice(product.price)}</p>
                  {hasOffer && (<p className="text-xl font-medium text-slate-500 line-through">{formatPrice(product.old_price!)}</p>
                  )}
                  {hasOffer && (
                    <div className="ml-auto flex items-center gap-1 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-sm font-bold text-orange-300">
                      <FireIcon className="h-4 w-4" />
                      <span>OFERTA</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Availability Section */}
              <div className="space-y-2">
                <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-bold ${isAvailable ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-red-400/30 bg-red-400/10 text-red-300'}`}>
                  {isAvailable ? <CheckCircleIcon className="w-4 h-4" /> : <XCircleIcon className="w-4 h-4" />}
                  {isAvailable ? `${product.stock} disponibles` : 'Agotado'}
                </div>
              </div>

              {/* Summary Section */}
              {product.summary && (
                <div className="space-y-2">
                  <p className="text-base leading-7 text-slate-300">{product.summary}</p>
                </div>
              )}
              
              {/* Features Section */}
              {product.features && product.features.length > 0 && (<details className="group rounded-2xl border border-white/10 bg-white/[.03] p-4" open>
                  <summary className="cursor-pointer list-none text-sm font-semibold">Especificaciones <span className="float-right text-orange-400 transition-transform group-open:rotate-45">+</span></summary>
                  <ul className="mt-4 space-y-2 text-sm text-slate-300 marker:text-orange-400">
                    {product.features.map((feature, idx) => <li key={idx}>{feature}</li>)}
                  </ul></details>)}
              
              {/* Action Buttons */}
              <div className="mt-auto pt-6 space-y-3 flex flex-col gap-3">
                {isAvailable && (
                  <button
                    onClick={handleAddToCart}
                    className="btn-glass-primary w-full flex items-center justify-center gap-2 rounded-xl py-4 px-4 text-xs font-bold uppercase tracking-widest"
                  >
                    <ShoppingCartIcon className="w-5 h-5" />
                    Agregar al Carrito
                  </button>
                )}
                {/* Botón WhatsApp con link del producto */}
                <button
                  onClick={() => {
                    const url = window.location.href;
                    const msg = `Tengo una pregunta sobre este producto: ${url}`;
                    const wa = `https://wa.me/573163026089?text=${encodeURIComponent(msg)}`;
                    window.open(wa, '_blank', 'noopener,noreferrer');
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[.07] py-4 px-4 text-xs font-bold uppercase tracking-widest text-white hover:bg-white/[.12]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12c0 5.385 4.365 9.75 9.75 9.75.978 0 1.93-.144 2.828-.412.267-.08.553-.02.753.174l2.316 2.316a.75.75 0 0 0 1.28-.53v-3.068a.75.75 0 0 1 .22-.53A9.708 9.708 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12Z" />
                  </svg>
                  Preguntar por WhatsApp
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-white/10 bg-black/20 text-center py-8 text-white">
        <p>&copy; {new Date().getFullYear()} LiluTecno. Todos los derechos reservados.</p>
        <p className="text-sm text-gray-400">Tecnología Mundial a Tu Alcance!</p>
      </footer>
      {isCartModalOpen && <CartModal cart={cart} onClose={closeCartModal} onUpdateQuantity={updateCartQuantity} onRemoveFromCart={removeFromCart} onClearCart={clearCart} addNotification={() => {}} />}
    </div>
  );
};

export default ProductPage;
