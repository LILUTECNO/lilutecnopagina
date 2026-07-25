import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db, functions } from '../firebaseConfig';
import { httpsCallable } from 'firebase/functions';
import { toast } from 'react-hot-toast';
import { Product } from '../types';
import { ShoppingBag, Download, Copy, RefreshCw, LogOut, UserCheck, WalletCards, PackageCheck, Store, Link as LinkIcon, Sparkles, ShoppingCart, X, Trash, CheckCircle2 } from 'lucide-react';
import logo from '../assets/images/lilutecnologo.png';
import ThemeToggleTRON from '../components/ThemeToggleTRON';

type VendorMode = 'dropshipping' | 'surtido';

interface WholesaleLine {
  productId: string;
  name: string;
  image: string;
  unitPrice: number;
  quantity: number;
  providerId?: string | null;
}

const DropshipperDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<VendorMode>('dropshipping');

  // Order integration form (modo dropshipping)
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orders, setOrders] = useState<{ id: string; total: number; status: string; createdAt?: any; dropshipperCommission?: number }[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  // Carrito mayorista (modo surtido)
  const [wholesaleCart, setWholesaleCart] = useState<WholesaleLine[]>([]);
  const [showWholesaleCheckout, setShowWholesaleCheckout] = useState(false);
  const [storeAddress, setStoreAddress] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Margen de dropshipping (editable por admin en settings/priceMargins.dropshipperDiscount)
  const DISCOUNT_RATE = 0.15;
  const volumeDiscount = (units: number) => units >= 24 ? 0.27 : units >= 12 ? 0.22 : units >= 6 ? 0.18 : 0.15;

  // Base URL para el link personal (la plataforma en producción).
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://lilutecno.com';
  const vendorSlug = currentUser?.storeName || currentUser?.uid;
  const vendorShareUrl = currentUser?.role === 'dropshipper' ? `${baseUrl}/v/${encodeURIComponent(vendorSlug || '')}` : '';

  useEffect(() => {
    fetchProducts();
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    if (!currentUser) return;
    try {
      const snapshot = await getDocs(query(collection(db, 'orders'), where('dropshipperId', '==', currentUser.uid), orderBy('createdAt', 'desc')));
      setOrders(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as { id: string; total: number; status: string; createdAt?: any; dropshipperCommission?: number })));
    } catch (error) { console.warn('No fue posible cargar historial de vendedor.', error); }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), orderBy('name'));
      const snapshot = await getDocs(q);
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar catálogo mayorista.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada.');
      navigate('/');
    } catch (error) {
      toast.error('Error al cerrar sesión.');
    }
  };

  const copyVendorLink = () => {
    if (!vendorShareUrl) return;
    navigator.clipboard.writeText(vendorShareUrl);
    toast.success('Tu link personal fue copiado. Compártelo en TikTok/WhatsApp.');
  };

  const copySaleKit = (product: Product) => {
    const publicPrice = product.price;
    const wholesalePrice = product.vendorPrice ?? Math.round(publicPrice * (1 - DISCOUNT_RATE));
    const profitPerSale = publicPrice - wholesalePrice;
    const text = `🔥 ${product.name} · Oferta limited

✨ Precio: ${formatter(publicPrice)}
🚚 Envío: Bogotá 24h / Nacional 3-5 días
👉 Pídelo por DM o por mi link: ${vendorShareUrl}

Características:
${product.features.map(f => `• ${f}`).join('\n')}

${product.summary}

— Tu ganancia por venta: ${formatter(profitPerSale)} (cópiala para tu control interno)`;
    navigator.clipboard.writeText(text);
    toast.success('Kit de venta completo copiado (copy + link incluido).');
  };

  const downloadImage = (url: string) => {
    window.open(url, '_blank');
    toast.success('Imagen abierta. Clic derecho para guardar.');
  };

  const formatter = (n: number) => '$' + (Number(n) || 0).toLocaleString('es-CO');

  const importOrders = async (file: File) => {
    try {
      const rows = (await file.text()).split(/\r?\n/).filter(Boolean);
      const [header, ...data] = rows;
      const columns = header.split(',').map(value => value.trim().toLowerCase());
      const required = ['productid', 'quantity', 'name', 'phone', 'address', 'city'];
      if (!required.every(column => columns.includes(column))) throw new Error('El CSV debe incluir: productId, quantity, name, phone, address, city.');
      const createVendorOrder = httpsCallable(functions, 'createVendorOrder');
      let imported = 0;
      for (const line of data) {
        const values = line.split(',').map(value => value.trim());
        const row = Object.fromEntries(columns.map((column, index) => [column, values[index] || '']));
        await createVendorOrder({ productId: row.productid, quantity: Number(row.quantity), customer: { name: row.name, phone: row.phone, address: row.address, city: row.city } });
        imported++;
      }
      toast.success(`${imported} pedidos importados.`);
      fetchOrders();
    } catch (error: any) { toast.error(error?.message || 'No fue posible importar el archivo.'); }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !selectedProduct) return;

    if (quantity > selectedProduct.stock) {
      toast.error('La cantidad supera el stock disponible.');
      return;
    }

    setSubmittingOrder(true);
    try {
      const createVendorOrder = httpsCallable(functions, 'createVendorOrder');
      await createVendorOrder({ productId: selectedProduct.id, quantity, customer: { name: customerName, phone: customerPhone, address: customerAddress, city: customerCity }, mode: 'dropshipping' });

      toast.success('Pedido conectado exitosamente.');
      setShowOrderModal(false);

      setCustomerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setCustomerCity('');
      setQuantity(1);
      fetchProducts();
      fetchOrders();
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar el pedido.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // ---------- Carrito mayorista ----------
  const addToWholesaleCart = (product: Product) => {
    setWholesaleCart(prev => {
      const existing = prev.find(l => l.productId === product.id);
      const unitPrice = product.vendorPrice ?? Math.round(product.price * (1 - volumeDiscount(1)));
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + 1);
        return prev.map(l => l.productId === product.id ? { ...l, quantity: nextQty } : l);
      }
      return [...prev, { productId: product.id, name: product.name, image: product.images?.[0] || '', unitPrice, quantity: 1, providerId: product.providerId }];
    });
    toast.success(`${product.name.substring(0, 30)}... añadido a tu carrito de surtido.`);
  };

  const updateWholesaleQty = (productId: string, qty: number) => {
    setWholesaleCart(prev => prev.map(l => l.productId === productId ? { ...l, quantity: Math.max(1, qty) } : l));
  };

  const removeWholesaleLine = (productId: string) => {
    setWholesaleCart(prev => prev.filter(l => l.productId !== productId));
  };

  const wholesaleTotals = useMemo(() => {
    let subtotal = 0, units = 0;
    for (const line of wholesaleCart) {
      const effectiveQty = line.quantity;
      const disc = volumeDiscount(effectiveQty);
      const unit = line.unitPrice > 0
        ? line.unitPrice
        : Math.round((products.find(p => p.id === line.productId)?.price || 0) * (1 - disc));
      subtotal += unit * effectiveQty;
      units += effectiveQty;
    }
    return { subtotal, units };
  }, [wholesaleCart, products]);

  const checkoutWholesale = async () => {
    if (wholesaleCart.length === 0) {
      toast.error('Tu carrito de surtido está vacío.');
      return;
    }
    if (!storeAddress.trim()) {
      toast.error('Ingresa la dirección de tu tienda.');
      return;
    }
    setShowWholesaleCheckout(true);
  };

  const confirmWholesaleOrder = async () => {
    if (!currentUser) return;
    setSubmittingOrder(true);
    try {
      const createVendorOrder = httpsCallable(functions, 'createVendorOrder');
      let created = 0;
      for (const line of wholesaleCart) {
        await createVendorOrder({
          productId: line.productId,
          quantity: line.quantity,
          customer: {
            name: currentUser.name || currentUser.storeName || currentUser.email || 'Tienda',
            phone: currentUser.phone || '',
            address: storeAddress,
            city: currentUser.address || 'Bogotá',
          },
          mode: 'surtido',
        });
        created++;
      }
      toast.success(`${created} órdenes de surtido creadas. Total: ${formatter(wholesaleTotals.subtotal)}.`);
      setWholesaleCart([]);
      setShowWholesaleCheckout(false);
      setStoreAddress('');
      fetchOrders();
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || 'No fue posible registrar el pedido surtido.');
    } finally {
      setSubmittingOrder(false);
    }
  };

  const estimatedEarnings = orders.reduce((sum, order) => sum + (Number(order.dropshipperCommission) || Number(order.total) * 0.15), 0);

  return (
    <div className="seller-shell min-h-screen font-sans">
      {/* Header Premium */}
      <header className="border-b border-white/10 bg-white/[.06] backdrop-blur-2xl sticky top-0 z-10 px-6 py-5 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="Lilu Tecno" className="h-9 w-9 rounded-full object-contain ring-1 ring-white/10" />
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 stroke-1 text-orange-400" />
            <span className="font-montserrat text-lg font-black tracking-[0.16em] text-white">
              LILUTECNO VENDEDOR
            </span>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <span className="text-[10px] uppercase tracking-[0.2em] text-orange-400 font-semibold">
            Hola, {currentUser?.name || 'Vendedor'}
          </span>
          <ThemeToggleTRON label="Cambiar entre modo día y noche" size={36} />
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5" title="Cerrar Sesión">
            <LogOut className="h-5 w-5 stroke-1" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Switch de modo */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="bg-white/[.04] border border-white/12 p-1.5 rounded-xl inline-flex shadow-lg backdrop-blur-xl">
            <button onClick={() => setMode('dropshipping')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold rounded-lg transition-all duration-300 ${mode === 'dropshipping' ? 'btn-glass-primary' : 'text-slate-400 hover:text-white'}`}>
              <UserCheck className="h-4 w-4" /> Modo Dropshipping
            </button>
            <button onClick={() => setMode('surtido')} className={`flex items-center gap-2 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold rounded-lg transition-all duration-300 ${mode === 'surtido' ? 'btn-glass-primary' : 'text-slate-400 hover:text-white'}`}>
              <Store className="h-4 w-4" /> Surtir Mi Negocio
            </button>
          </div>
          {/* Link personal */}
          {vendorShareUrl && (
            <div className="bg-gradient-to-r from-purple-500/[.08] to-orange-500/[.08] border border-purple-400/30 p-4 flex items-center gap-3 rounded-2xl backdrop-blur-xl">
              <LinkIcon className="h-4 w-4 text-purple-400" />
              <div className="flex-1 min-w-0">
                <p className="text-[9px] uppercase tracking-[0.22em] text-purple-400 font-semibold">Tu link personal</p>
                <p className="text-xs text-white truncate font-mono mt-0.5">{vendorShareUrl}</p>
              </div>
              <button onClick={copyVendorLink} className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] text-orange-400 hover:text-orange-300 font-semibold transition-colors duration-300">
                <Copy className="h-3.5 w-3.5" /> Copiar
              </button>
            </div>
          )}
        </div>

        {/* Métricas */}
        <section className="mb-12 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6 backdrop-blur-xl shadow-lg hover:border-orange-400/30 transition-colors duration-300">
            <div className="flex items-center gap-2 text-orange-300">
              <WalletCards className="h-5 w-5" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em]">Billetera del vendedor</p>
            </div>
            <p className="mt-4 font-montserrat text-3xl font-light text-white">{formatter(estimatedEarnings)}</p>
            <p className="mt-2 text-xs text-slate-400">Ganancia acumulada · {orders.filter(o => o.status === 'pending_provider' || o.status === 'por_recolectar').length} pedidos en ruta.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[.04] p-6 backdrop-blur-xl shadow-lg hover:border-purple-400/30 transition-colors duration-300">
            <div className="flex items-center gap-2">
              <PackageCheck className="h-5 w-5 text-purple-300" />
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Actividad reciente</p>
            </div>
            {orders.length ? (
              <div className="mt-4 space-y-2.5">
                {orders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Pedido #{order.id.slice(0, 6)}</span>
                    <span className="text-orange-300 font-medium">{formatter(order.total)} · {String(order.status).replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400">Aún no has conectado pedidos. Selecciona un producto para empezar.</p>
            )}
          </div>
        </section>

        {/* === MODO DROPSHIPPING === */}
        {mode === 'dropshipping' && (
          <>
            <details className="mb-10 rounded-2xl border border-white/10 bg-white/[.035] p-6 backdrop-blur-xl shadow-lg">
              <summary className="cursor-pointer text-sm font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-orange-400" /> Academia del vendedor · Aprende a vender más
              </summary>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-5 transition-colors duration-300 hover:border-orange-400/30">
                  <p className="text-xs font-bold text-orange-300 uppercase tracking-[0.16em]">Estrategia Dropshipping</p>
                  <p className="mt-3 text-xs leading-7 text-slate-400">Crea anuncios, responde objeciones y comparte tu link personal con clientes.</p>
                  <button onClick={copyVendorLink} className="mt-4 text-[10px] uppercase tracking-[0.18em] text-white hover:text-orange-300 font-semibold transition-colors duration-300">Copiar mi link</button>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[.03] p-5 transition-colors duration-300 hover:border-purple-400/30">
                  <p className="text-xs font-bold text-purple-300 uppercase tracking-[0.16em]">Venta en físico</p>
                  <p className="mt-3 text-xs leading-7 text-slate-400">Muestra beneficios, compara opciones y usa el margen estimado para construir combos rentables.</p>
                </div>
              </div>
            </details>

            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-5 mb-10">
              <div>
                <h2 className="font-montserrat text-2xl font-light text-white tracking-tight">Catálogo Dropshipping</h2>
                <p className="text-xs text-slate-400 font-light mt-2 leading-relaxed">Conecta pedidos de tus clientes o comparte tu link. Tú no compras inventario.</p>
              </div>
              <div className="flex gap-2">
                <input ref={importRef} type="file" accept=".csv,text/csv" className="hidden" onChange={event => { const file = event.target.files?.[0]; if (file) importOrders(file); event.currentTarget.value = ''; }} />
                <button onClick={() => importRef.current?.click()} className="rounded-xl border border-white/12 px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-white hover:border-orange-400/40 hover:bg-white/[.05] transition-all duration-300">Importar CSV</button>
                <button onClick={fetchProducts} className="p-2.5 rounded-xl border border-white/12 text-slate-400 hover:text-white hover:border-orange-400/40 transition-all duration-300 hover:scale-105"><RefreshCw className="h-4 w-4" /></button>
              </div>
            </div>

            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar por nombre o categoría" className="mb-6 w-full rounded-xl border border-white/12 bg-white/[.05] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" />

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-400 border-t-transparent"></div>
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white/[.04] border border-white/10 p-16 text-center rounded-2xl shadow-lg backdrop-blur-xl">
                <ShoppingBag className="h-12 w-12 stroke-1 text-orange-400 mx-auto mb-4" />
                <p className="text-sm text-slate-400 font-light">No hay productos en el catálogo.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(productSearch.toLowerCase())).map((product) => {
                  const wholesalePrice = product.vendorPrice ?? Math.round(product.price * (1 - DISCOUNT_RATE));
                  const profitPerSale = product.price - wholesalePrice;
                  return (
                    <div key={product.id} className="bg-white/[.03] border border-white/10 rounded-2xl overflow-hidden shadow-lg backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-orange-400/30 hover:-translate-y-1">
                      <div className="relative aspect-video bg-white/[.03]">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] uppercase tracking-[0.18em] font-light">Sin Imagen</div>
                        )}
                        <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[9px] text-white tracking-[0.18em] uppercase rounded-full">
                          Stock: {product.stock}
                        </div>
                      </div>

                      <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <span className="text-[9px] uppercase tracking-[0.22em] text-orange-400 font-semibold">{product.category}</span>
                          <h3 className="font-montserrat text-base font-medium text-white leading-snug">{product.name}</h3>
                          <p className="text-xs text-slate-400 font-light line-clamp-2 leading-relaxed">{product.summary}</p>
                        </div>

                        <div className="space-y-2.5 pt-3 border-t border-white/10">
                          <div className="flex justify-between text-xs font-light text-slate-400">
                            <span>Precio Público:</span>
                            <span className="line-through">{formatter(product.price)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm font-medium">
                            <span className="text-[10px] text-orange-400 uppercase tracking-[0.18em] font-semibold">Tu precio:</span>
                            <span className="text-white text-lg font-semibold">{formatter(wholesalePrice)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-emerald-400 font-medium">
                            <span>Ganas por venta:</span>
                            <span>{formatter(profitPerSale)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-5">
                          <button onClick={() => copySaleKit(product)} className="flex items-center justify-center gap-1.5 border border-white/12 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.18em] hover:border-orange-400/40 hover:text-orange-400 hover:bg-orange-400/10 transition-all duration-300 font-semibold text-slate-300" title="Kit de venta (copy + link)">
                            <Sparkles className="h-3 w-3" /><span>Kit venta</span>
                          </button>
                          <button onClick={() => product.images && product.images.length > 0 && downloadImage(product.images[0])} className="flex items-center justify-center gap-1.5 border border-white/12 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.18em] hover:border-orange-400/40 hover:text-orange-400 hover:bg-orange-400/10 transition-all duration-300 font-semibold text-slate-300" title="Descargar Foto" disabled={!product.images || product.images.length === 0}>
                            <Download className="h-3 w-3" /><span>Foto</span>
                          </button>
                          <button onClick={() => { setSelectedProduct(product); setShowOrderModal(true); }} className="col-span-2 btn-glass-primary flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] uppercase tracking-[0.18em] font-semibold" title="Conectar Venta" disabled={product.stock <= 0}>
                            <span>Conectar venta</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* === MODO SURTIR MI NEGOCIO === */}
        {mode === 'surtido' && (
          <>
            <div className="bg-gradient-to-r from-orange-500/[.08] to-purple-500/[.08] border border-orange-400/30 rounded-2xl p-6 mb-8 backdrop-blur-xl shadow-lg">
              <div className="flex items-center gap-3 mb-3">
                <Store className="h-5 w-5 text-orange-400" />
                <h2 className="font-montserrat text-xl font-light text-white tracking-tight">Surtir Mi Negocio</h2>
              </div>
              <p className="text-xs text-slate-400 font-light leading-relaxed">Aquí compras al precio mayorista real para tu tienda física. Sin pagar margen de plataforma. Cuanto más compras, más descuento por volumen.</p>
            </div>

            {/* Tiers de descuento */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              {[
                { qty: '1+', discount: '15%', label: 'Inicial' },
                { qty: '6+', discount: '18%', label: 'Medio' },
                { qty: '12+', discount: '22%', label: 'Pro' },
                { qty: '24+', discount: '27%', label: 'Mayorista' },
              ].map(tier => (
                <div key={tier.qty} className="bg-white/[.04] border border-white/10 p-5 text-center rounded-2xl backdrop-blur-xl shadow-lg hover:border-orange-400/30 transition-colors duration-300">
                  <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">{tier.label}</p>
                  <p className="mt-2.5 font-montserrat text-xl font-medium text-white">{tier.discount}</p>
                  <p className="mt-1 text-[10px] text-orange-400 font-semibold">desde {tier.qty} unid.</p>
                </div>
              ))}
            </div>

            {/* Carrito flotante */}
            {wholesaleCart.length > 0 && (
              <div className="sticky bottom-4 z-20 bg-gradient-to-r from-[#ff7a00]/95 to-[#7b2cbf]/95 text-white p-4 shadow-2xl rounded-2xl border border-white/20 flex items-center justify-between gap-3 backdrop-blur-md">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5" />
                  <p className="text-sm">{wholesaleCart.length} productos · {wholesaleTotals.units} unid. · <strong className="font-semibold">{formatter(wholesaleTotals.subtotal)}</strong></p>
                </div>
                <button onClick={checkoutWholesale} className="flex items-center gap-2 bg-white text-[#1a0a25] px-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-white/95 transition-all duration-300 hover:scale-105">
                  Comprar para mi tienda <CheckCircle2 className="h-4 w-4" />
                </button>
              </div>
            )}

            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar por nombre o categoría" className="mb-6 w-full rounded-xl border border-white/12 bg-white/[.05] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" />

            {loading ? (
              <div className="flex justify-center py-20">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-400 border-t-transparent"></div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                {products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(productSearch.toLowerCase())).map((product) => {
                  return (
                    <div key={product.id} className="bg-white/[.03] border border-white/10 rounded-2xl overflow-hidden shadow-lg backdrop-blur-xl flex flex-col justify-between transition-all duration-300 hover:border-orange-400/30 hover:-translate-y-1">
                      <div className="relative aspect-video bg-white/[.03]">
                        {product.images && product.images.length > 0 ? (
                          <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-500 text-[10px] uppercase tracking-[0.18em] font-light">Sin Imagen</div>
                        )}
                        <div className="absolute top-2.5 right-2.5 bg-black/70 backdrop-blur-md border border-white/15 px-2.5 py-1 text-[9px] text-white tracking-[0.18em] uppercase rounded-full">
                          Stock: {product.stock}
                        </div>
                      </div>
                      <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <span className="text-[9px] uppercase tracking-[0.22em] text-orange-400 font-semibold">{product.category}</span>
                          <h3 className="font-montserrat text-base font-medium text-white leading-snug">{product.name}</h3>
                          <p className="text-xs text-slate-400 font-light line-clamp-2 leading-relaxed">{product.summary}</p>
                        </div>

                        <div className="grid grid-cols-3 gap-1 text-center pt-3 border-t border-white/10">
                          {[
                            { qty: 1, price: formatter(product.vendorPrice ?? Math.round(product.price * 0.85)) },
                            { qty: 6, price: formatter(product.vendorPrice ?? Math.round(product.price * 0.82)) },
                            { qty: 12, price: formatter(product.vendorPrice ?? Math.round(product.price * 0.78)) },
                          ].map(t => (
                            <div key={t.qty} className="bg-white/[.03] rounded-lg py-2">
                              <p className="text-[9px] uppercase tracking-[0.18em] text-slate-400">{t.qty}x</p>
                              <p className="text-xs font-semibold text-white mt-0.5">{t.price}</p>
                            </div>
                          ))}
                        </div>

                        <button onClick={() => addToWholesaleCart(product)} disabled={product.stock <= 0} className="w-full btn-glass-primary flex items-center justify-center gap-2 py-3 text-[10px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50">
                          <ShoppingCart className="h-4 w-4" /> Añadir a surtido
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ====== Modal Conectar Venta (dropshipping) ====== */}
      {showOrderModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-md p-8 shadow-2xl relative space-y-6 max-h-[95vh] overflow-y-auto rounded-2xl animate-modal-appear">
            <h2 className="font-montserrat text-lg font-light text-white tracking-wide">Conectar Pedido Dropshipping</h2>
            <div className="bg-white/[.05] p-4 border border-white/12 rounded-xl text-xs space-y-1.5">
              <p className="font-medium text-white">{selectedProduct.name}</p>
              <div className="flex justify-between text-slate-400">
                <span>Precio Costo:</span>
                <span className="font-medium text-orange-400">{formatter(selectedProduct.vendorPrice ?? Math.round(selectedProduct.price * (1 - volumeDiscount(quantity))))}</span>
              </div>
              <p className="pt-2 text-[10px] text-orange-400 font-semibold uppercase tracking-[0.16em]">Descuento por volumen: {(volumeDiscount(quantity) * 100).toFixed(0)}% · 6+ unid. 18%, 12+ 22%, 24+ 27%</p>
            </div>
            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div><label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Nombre del Cliente</label><input type="text" required value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" placeholder="María Rodríguez" /></div>
              <div><label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Teléfono Cliente</label><input type="tel" required value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" placeholder="3001234567" /></div>
              <div><label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Dirección de Envío</label><input type="text" required value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" placeholder="Calle 123 # 45 - 67 Apto 101" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Ciudad</label><input type="text" required value={customerCity} onChange={(e) => setCustomerCity(e.target.value)} className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" placeholder="Bogotá" /></div>
                <div><label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Cantidad</label><input type="number" required min="1" max={selectedProduct.stock} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200" /></div>
              </div>
              <div className="flex justify-end space-x-3 pt-5 border-t border-white/10">
                <button type="button" onClick={() => setShowOrderModal(false)} className="px-5 py-2.5 rounded-xl border border-white/12 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 transition-colors duration-300">Cancelar</button>
                <button type="submit" disabled={submittingOrder} className="px-5 py-2.5 btn-glass-primary text-[10px] font-semibold uppercase tracking-[0.18em] disabled:opacity-50">{submittingOrder ? 'Conectando...' : 'Confirmar Pedido'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====== Modal Checkout Wholesale (surtido) ====== */}
      {showWholesaleCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div className="glass-panel w-full max-w-lg p-8 shadow-2xl relative space-y-5 max-h-[95vh] overflow-y-auto rounded-2xl animate-modal-appear">
            <div className="flex justify-between items-center">
              <h2 className="font-montserrat text-lg font-light text-white tracking-wide">Comprar para mi tienda</h2>
              <button onClick={() => setShowWholesaleCheckout(false)} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-110"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {wholesaleCart.map(line => {
                const disc = volumeDiscount(line.quantity);
                const unit = line.unitPrice > 0 ? line.unitPrice : Math.round((products.find(p => p.id === line.productId)?.price || 0) * (1 - disc));
                return (
                  <div key={line.productId} className="flex items-center justify-between bg-white/[.03] border border-white/10 p-3 rounded-xl text-xs transition-colors duration-200 hover:border-orange-400/30">
                    <div className="flex items-center gap-2.5">
                      {line.image && <img src={line.image} alt="" className="h-10 w-10 object-cover rounded-lg" />}
                      <div>
                        <p className="font-medium text-white">{line.name}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{line.quantity} unid. × {formatter(unit)} · {(disc * 100).toFixed(0)}% desc.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" value={line.quantity} onChange={e => updateWholesaleQty(line.productId, Number(e.target.value))} className="w-16 rounded-lg border border-white/12 bg-white/[.05] px-2 py-1.5 text-xs text-white focus:border-orange-400/60 focus:outline-none transition-colors" />
                      <button onClick={() => removeWholesaleLine(line.productId)} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all duration-300"><Trash className="h-4 w-4" /></button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Dirección de tu tienda</label>
              <textarea value={storeAddress} onChange={e => setStoreAddress(e.target.value)} rows={2} className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" placeholder="Ej. Local 14, Centro Comercial Tinto Alegre, Kennedy, Bogotá" />
            </div>
            <div className="bg-white/[.05] p-4 border border-white/12 rounded-xl text-xs space-y-1.5">
              <div className="flex justify-between"><span className="text-slate-400">Total a pagar a la plataforma:</span><span className="font-semibold text-white">{formatter(wholesaleTotals.subtotal)}</span></div>
              <p className="text-[10px] text-orange-400 pt-1 font-semibold uppercase tracking-[0.16em]">El envío mensajero se calcula según tu dirección. Recibirás tu pedido para surtir tu tienda física.</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-xl text-[11px] text-amber-300 leading-relaxed">
              Importante: las órdenes surtido NO se cobran automáticamente aquí. La plataforma coordinará el pago y envío contigo. Si son del mismo proveedor, irán directas (sin pasar por bodega central) para ahorrar tiempo.
            </div>
            <div className="flex justify-end gap-2.5">
              <button onClick={() => setShowWholesaleCheckout(false)} className="px-5 py-2.5 rounded-xl border border-white/12 text-[10px] uppercase tracking-[0.18em] font-semibold text-white hover:bg-white/10 transition-colors duration-300">Volver</button>
              <button onClick={confirmWholesaleOrder} disabled={submittingOrder} className="px-5 py-2.5 btn-glass-primary text-[10px] uppercase tracking-[0.18em] font-semibold disabled:opacity-50">
                {submittingOrder ? 'Confirmando...' : `Confirmar surtido · ${formatter(wholesaleTotals.subtotal)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DropshipperDashboard;
