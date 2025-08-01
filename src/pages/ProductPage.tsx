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
import { useNotifications } from '../hooks/useNotifications';

const ProductPage: React.FC = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState<string>('');

  const { addNotification, addToCart, cart, totalCartItems } = useCartContext();
  const {
    categories,
    filters,
    handleSetFilters,
    productsOnOfferCount,
    totalAvailableCount
  } = useProducts();
  const {
    isHeaderVisible,
    openCartModal,
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
          const productData = { id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) };
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
      <div className="flex flex-col min-h-screen bg-gray-50">
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
      <div className="flex flex-col min-h-screen bg-gray-50">
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
      <div className="flex flex-col min-h-screen bg-gray-50">
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
    <div className="flex flex-col min-h-screen bg-gray-50">
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
      <main className="container mx-auto px-2 sm:px-4 py-0 flex-grow">
        <section className="w-full max-w-5xl bg-white rounded-2xl shadow-lg p-2 sm:p-4 md:p-6 flex flex-col md:flex-row gap-4 md:gap-8 mt-2 md:mt-6">
          <button
            onClick={() => navigate(-1)}
            className="mb-4 mt-0 pt-0 flex items-center text-gray-600 hover:text-orange-500 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400"
            aria-label="Volver a la lista de productos"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Volver
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10">
            {/* Image Gallery */}
            <div className="flex flex-col">
              <div className="relative w-full aspect-square bg-gray-100 rounded-lg shadow-lg border border-gray-200 overflow-hidden">
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
                        ${mainImage === img ? 'border-orange-500 shadow-md scale-105' : 'border-transparent hover:border-orange-300'}`}
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
                <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-center gap-x-6 gap-y-2 text-gray-500 flex-wrap">
                  {techFeatures.map((feature) => (
                    <div key={feature.name} className="flex flex-col items-center gap-1" title={feature.name}>
                      <feature.icon className="h-8 w-8 text-gray-700" />
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
              <div className="mt-auto pt-6 space-y-3 flex flex-col gap-3">
                {isAvailable && (
                  <button
                    onClick={handleAddToCart}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-opacity-75"
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
                  className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-400"
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
      <footer className="bg-gray-800 text-white text-center py-6">
        <p>&copy; {new Date().getFullYear()} LiluTecno. Todos los derechos reservados.</p>
        <p className="text-sm text-gray-400">Tecnología Mundial a Tu Alcance!</p>
      </footer>
    </div>
  );
};

export default ProductPage;
