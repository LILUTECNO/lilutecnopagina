import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { Product } from '../types';
import type { Order, PayoutBatch } from '../types';
import { Package, Plus, Trash, Edit, Upload, LogOut, LayoutGrid, FileDown, Truck, Camera, Wallet, Boxes } from 'lucide-react';
import { downloadCatalogPdf } from '../utils/catalogPdf';
import { normalizeProviderBranding, cleanupBrandingForSave } from '../utils/providerBranding';
import type { ProviderBranding } from '../types';
import BrandingEditor from '../components/provider/BrandingEditor';
import logo from '../assets/images/lilutecnologo.png';
import ThemeToggleTRON from '../components/ThemeToggleTRON';

const ProviderDashboard: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  // Logística del proveedor: pedidos asignados y saldo por cobrar
  const [providerOrders, setProviderOrders] = useState<Order[]>([]);
  const [providerPayouts, setProviderPayouts] = useState<PayoutBatch[]>([]);
  const [activeView, setActiveView] = useState<'inventory' | 'orders' | 'wallet'>('inventory');
  const [productSearch, setProductSearch] = useState('');

  // Form states
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [features, setFeatures] = useState('');
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stockDraft, setStockDraft] = useState<Record<string, number>>({});
  const [brand, setBrand] = useState({ storeName: '', phone: '', address: '', taxId: '', accent: '#ff7a00' });
  // Logo
  const [logoUrl, setLogoUrl] = useState<string>(currentUser?.logoUrl || '');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProviderProducts();
    getDocs(collection(db, 'categories')).then(snapshot => setCategories(snapshot.docs.map(item => { const data = item.data(); return String(data.name || data.label || data.title || item.id); })));
    setBrand({ storeName: currentUser?.storeName || '', phone: currentUser?.phone || '', address: currentUser?.address || '', taxId: currentUser?.taxId || '', accent: '#ff7a00' });
    if (currentUser?.logoUrl) setLogoUrl(currentUser.logoUrl);
  }, [currentUser]);

  // Listener de órdenes asignadas a este proveedor (regla anti-robo: nunca exponemos datos del cliente final).
  useEffect(() => {
    if (!currentUser) return;
    // Órdenes en flujo logístico (post-pago) que tienen items.providerId === currentUser.uid.
    // Usamos query por providerId (campo plano en la orden) — creamos el snapshot en tiempo real.
    const ordersQ = query(
      collection(db, 'orders'),
      where('providerId', '==', currentUser.uid),
      where('paymentStatus', '==', 'paid')
    );
    const unsub = onSnapshot(ordersQ, (snap) => {
      const list: Order[] = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        // Filtramos manualmente por estado logístico relevante (no queremos 'pagado' histórico a menos que esté en el flujo).
        const status = String(data.status || '');
        if (['por_recolectar', 'en_bodega', 'para_empaque', 'despachado', 'entregado', 'para_pagar', 'garantia'].includes(status)) {
          list.push({ id: docSnap.id, ...(data as Record<string, unknown>) } as Order);
        }
      });
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setProviderOrders(list);
    });
    // Listener de batches de pago
    const payoutsQ = query(collection(db, 'payoutBatches'), orderBy('date', 'desc'));
    const unsub2 = onSnapshot(payoutsQ, (snap) => {
      setProviderPayouts(snap.docs.map(d => ({ id: d.id, ...d.data() } as PayoutBatch)).slice(0, 20));
    });
    return () => { unsub(); unsub2(); };
  }, [currentUser]);
  const saveBrand = async () => { if (!currentUser) return; try { await updateDoc(doc(db, 'users', currentUser.uid), brand); toast.success('Datos de marca actualizados.'); } catch { toast.error('No fue posible guardar los datos de marca.'); } };
  /**
   * P1 — persist the branding sub-object THROUGH the existing save path (the
   * SAME updateDoc on users/{uid}), without touching unrelated fields.
   * Read-modify-write: only `branding` is written; logoUrl stays as the source
   * of truth (the BrandingEditor reads logoUrl from currentUser.logoUrl).
   */
  const saveBranding = async (next: ProviderBranding) => {
    if (!currentUser) return;
    try {
      const cleaned = cleanupBrandingForSave(next);
      await updateDoc(doc(db, 'users', currentUser.uid), { branding: cleaned });
    } catch (error) {
      console.error('[saveBranding] Error al guardar branding en Firestore:', error);
      throw error;
    }
  };
  const brandingInit = useMemo(() => normalizeProviderBranding(currentUser), [currentUser]);
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };
  const handleLogoUpload = async () => {
    if (!logoFile || !currentUser) return;
    setUploadingLogo(true);
    try {
      const storageRef = ref(storage, `providerLogos/${currentUser.uid}/${Date.now()}_${logoFile.name}`);
      const result = await uploadBytes(storageRef, logoFile);
      const url = await getDownloadURL(result.ref);
      await updateDoc(doc(db, 'users', currentUser.uid), { logoUrl: url });
      setLogoUrl(url);
      setLogoFile(null);
      setLogoPreview('');
      toast.success('Logo actualizado correctamente.');
    } catch {
      toast.error('No fue posible subir el logo.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const fetchProviderProducts = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'products'), where('providerId', '==', currentUser.uid));
      const querySnapshot = await getDocs(q);
      const items: Product[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
    } catch (error) {
      console.error("Error fetching provider products:", error);
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

  const [downloadingCatalog, setDownloadingCatalog] = useState(false);
  const [catalogProgress, setCatalogProgress] = useState<{ done: number; total: number; phase: string } | null>(null);

  const handleDownloadCatalog = async () => {
    if (downloadingCatalog) return;
    setDownloadingCatalog(true);
    setCatalogProgress({ done: 0, total: products.length || 0, phase: 'images' });
    try {
      // Use normalizeProviderBranding(currentUser) which pulls the latest saved `currentUser.branding`,
      // merged with current logoUrl and storeName so the PDF respects the saved identity editor settings.
      const latestBranding = normalizeProviderBranding(currentUser);
      const catalogBrand: ProviderBranding = {
        ...latestBranding,
        logoUrl: logoUrl || latestBranding.logoUrl,
        companyName: brand.storeName || latestBranding.companyName,
      };
      await downloadCatalogPdf(products, `catalogo-${currentUser?.uid || 'proveedor'}.pdf`, {
        brand: catalogBrand,
        onProgress: (done, total, phase) => setCatalogProgress({ done, total, phase: phase || 'render' }),
      });
      toast.success('Tu catálogo PDF se descargó con los datos actualizados.');
    } catch (error) {
      console.error('[PDF] catalog error:', error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`No fue posible generar el catálogo: ${msg}`);
    } finally {
      setDownloadingCatalog(false);
      setCatalogProgress(null);
    }
  };

  const handleImageUploads = async (productId: string): Promise<string[]> => {
    if (!imageFiles || imageFiles.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const storageRef = ref(storage, `products/${productId}/${Date.now()}_${file.name}`);
      try {
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        urls.push(url);
      } catch (uploadError: any) {
        console.error('Storage upload error:', uploadError?.code || uploadError?.message || uploadError);
        const code = String(uploadError?.code || '');
        let humanMessage = 'No fue posible subir una imagen.';
        if (code.includes('storage/unauthorized') || code.includes('permission')) humanMessage = 'Permiso de Storage denegado. Contacta al administrador.';
        else if (code.includes('storage/cors')) humanMessage = 'CORS de Storage bloqueando la subida.';
        else if (code.includes('storage/quota') || code.includes('storage/bucket')) humanMessage = 'Bucket de Storage no configurado o sin cuota.';
        else if (code.includes('storage/retry-limit')) humanMessage = 'Red inestable. Reintenta por favor.';
        toast.error(humanMessage + ` (${file.name})`);
      }
    }
    return urls;
  };

  const resetForm = () => {
    setName('');
    setPrice('');
    setCategory('');
    setStock('');
    setSummary('');
    setFeatures('');
    setImageFiles(null);
    setImageUrlInput('');
    setExistingImages([]);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setUploading(true);

    try {
      const featuresArray = features.split('\n').filter(f => f.trim() !== '');
      const manualUrls = imageUrlInput.split(/\n|,/).map(url => url.trim()).filter(Boolean);

      if (editingProduct) {
        // Edit Mode
        const docRef = doc(db, 'products', editingProduct.id);
        const existingSafe = Array.isArray(editingProduct.images) ? [...editingProduct.images] : (Array.isArray(existingImages) ? [...existingImages] : []);
        let uploadedUrls: string[] = [];
        if (imageFiles && imageFiles.length > 0) {
          uploadedUrls = await handleImageUploads(editingProduct.id);
        }
        const finalImages = [...existingSafe, ...uploadedUrls, ...manualUrls];

        await updateDoc(docRef, {
          name,
          precio_base: Number(price),
          category,
          stock: Number(stock),
          summary,
          features: featuresArray,
          images: finalImages,
        });
        // El trigger syncProductCategory recalcula precio_cliente_final/dropshipper/surtir_* y price (mirror) automáticamente.

        if (imageFiles && imageFiles.length > 0 && uploadedUrls.length === 0) {
          toast('Producto actualizado. Algunas imágenes no se subieron; revisa Storage.', { icon: '⚠️' });
        } else {
          toast.success('Producto actualizado con éxito.');
        }
      } else {
        // Create Mode
        const newDocRef = await addDoc(collection(db, 'products'), {
          name,
          precio_base: Number(price),
          price: Number(price),
          category,
          stock: Number(stock),
          summary,
          features: featuresArray,
          images: manualUrls,
          is_cliente_final_manual: false,
          is_dropshipper_manual: false,
          is_surtir_manual: false,
          estado_rentabilidad: 'ok',
          providerId: currentUser.uid,
          createdAt: new Date().toISOString()
        });

        let uploadedUrls: string[] = [];
        if (imageFiles && imageFiles.length > 0) {
          uploadedUrls = await handleImageUploads(newDocRef.id);
          if (uploadedUrls.length > 0) {
            await updateDoc(newDocRef, { images: [...manualUrls, ...uploadedUrls] });
          }
        }

        if (imageFiles && imageFiles.length > 0 && uploadedUrls.length === 0 && manualUrls.length === 0) {
          toast('Producto creado. No se subió ninguna imagen; revisa Storage.', { icon: '⚠️' });
        } else if (imageFiles && imageFiles.length > uploadedUrls.length) {
          toast(`Producto creado. Subidas ${uploadedUrls.length} de ${imageFiles.length} imágenes.`, { icon: '⚠️' });
        } else {
          toast.success('Producto creado con éxito.');
        }
      }

      resetForm();
      setShowAddModal(false);
      fetchProviderProducts();
    } catch (error: any) {
      console.error(error);
      toast.error('Error al guardar el producto: ' + (error?.message || String(error)));
    } finally {
      setUploading(false);
    }
  };

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(Number(product.precio_base ?? product.price) || '');
    setCategory(product.category);
    setStock(product.stock);
    setSummary(product.summary);
    setFeatures(product.features.join('\n'));
    setExistingImages(product.images || []);
    setImageUrlInput('');
    setShowAddModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Producto eliminado.');
      fetchProviderProducts();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar el producto.');
    }
  };
  const saveQuickStock = async (product: Product) => {
    const next = stockDraft[product.id];
    if (next === undefined || next === product.stock) return;
    try { await updateDoc(doc(db, 'products', product.id), { stock: Math.max(0, Number(next)) }); toast.success(`Stock actualizado: ${product.name}`); setStockDraft(current => { const copy = { ...current }; delete copy[product.id]; return copy; }); fetchProviderProducts(); } catch { toast.error('No fue posible actualizar el stock.'); }
  };

  return (
    <div className="partner-shell min-h-screen font-sans">
      {/* Header Premium */}
      <header className="border-b border-white/10 bg-white/[.06] backdrop-blur-2xl sticky top-0 z-10 px-6 py-5 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img src={logo} alt="Lilu Tecno" className="h-9 w-9 rounded-full object-contain ring-1 ring-white/10" />
            <div className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5 stroke-1 text-orange-400" />
              <span className="wordmark font-montserrat text-lg font-black tracking-[0.16em] text-white">
                LILUTECNO PARTNER
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-6">
            <span className="role-label text-[10px] uppercase tracking-[0.2em] text-orange-400 font-semibold">
              PANEL DE PROVEEDOR
            </span>
          <ThemeToggleTRON label="Cambiar entre modo día y noche" size={36} />
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-400 transition-all duration-300 hover:scale-105 rounded-lg hover:bg-white/5" title="Cerrar Sesión">
            <LogOut className="h-5 w-5 stroke-1" />
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Logo + Datos de marca */}
        <details className="mb-8 rounded-2xl border border-white/10 bg-white/[.04] p-6 open:pb-7 backdrop-blur-xl shadow-2xl">
          <summary className="cursor-pointer text-sm font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-2"><Camera className="h-4 w-4 text-orange-400" />Perfil de marca y logotipo comercial</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">Click para {`{}`}</span>
          </summary>
          <div className="mt-6 flex flex-col sm:flex-row gap-6">
            {/* Logo upload */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative h-24 w-24 rounded-2xl border border-white/12 overflow-hidden bg-white/[.04] flex items-center justify-center">
                {(logoPreview || logoUrl) ? (
                  <img src={logoPreview || logoUrl} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <Camera className="h-8 w-8 text-slate-500 stroke-1" />
                )}
              </div>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoSelect} />
              <button onClick={() => logoInputRef.current?.click()} className="rounded-xl border border-white/12 px-3 py-1.5 text-[10px] uppercase tracking-widest text-slate-300 hover:text-white hover:border-orange-400/40 transition-colors duration-300">
                {logoPreview ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logoPreview && (
                <button onClick={handleLogoUpload} disabled={uploadingLogo} className="rounded-xl border border-orange-400/40 px-3 py-1.5 text-[10px] uppercase tracking-widest text-orange-400 hover:bg-orange-400/10 disabled:opacity-50 transition-colors duration-300">
                  {uploadingLogo ? 'Subiendo...' : 'Confirmar logo'}
                </button>
              )}
            </div>
            {/* Form de marca */}
            <div className="flex-1 grid gap-3 sm:grid-cols-2">
              <input value={brand.storeName} onChange={e => setBrand({ ...brand, storeName: e.target.value })} placeholder="Nombre comercial" className="rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" />
              <input value={brand.phone} onChange={e => setBrand({ ...brand, phone: e.target.value })} placeholder="Teléfono" className="rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" />
              <input value={brand.taxId} onChange={e => setBrand({ ...brand, taxId: e.target.value })} placeholder="NIT / RUT" className="rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" />
              <input value={brand.address} onChange={e => setBrand({ ...brand, address: e.target.value })} placeholder="Dirección" className="rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" />
              <label className="flex items-center gap-2 text-xs text-slate-300">Color de acento<input type="color" value={brand.accent} onChange={e => setBrand({ ...brand, accent: e.target.value })} className="w-8 h-8 rounded-lg border border-white/12 bg-transparent cursor-pointer" /></label>
            </div>
          </div>
          <button onClick={saveBrand} className="mt-5 rounded-xl border border-orange-400/40 px-5 py-2.5 text-[10px] uppercase tracking-[0.18em] text-orange-400 hover:bg-orange-400/10 font-semibold transition-colors duration-300">Guardar datos de marca</button>

          {/* P1 — BrandingEditor (new). Mounts inside this same brand <details>
               panel (REGION LOCK respected: header spans ~305-325 untouched).
               Saves `branding` THROUGH saveBranding (the same updateDoc on
               users/{uid}); never touches unrelated profile fields. */}
          <div className="mt-8 border-t border-white/10 pt-6">
            <h3 className="mb-4 font-montserrat text-base font-light text-white tracking-tight">Editor de identidad de catálogo</h3>
            <BrandingEditor
              initialBranding={brandingInit}
              previewProducts={products.slice(0, 6)}
              logoUrl={logoUrl}
              logoPreview={logoPreview}
              onLogoSelect={handleLogoSelect}
              onLogoUpload={handleLogoUpload}
              uploadingLogo={uploadingLogo}
              logoInputRef={logoInputRef}
              onSave={saveBranding}
              existingContacts={{ phone: brand.phone, address: brand.address, storeName: brand.storeName }}
            />
          </div>
        </details>

        {/* Sub-pestañas */}
        <div className="flex gap-1 border-b border-white/10 mb-8 overflow-x-auto">
          <button onClick={() => setActiveView('inventory')} className={`flex items-center gap-2 pb-3 px-4 text-[10px] uppercase tracking-[0.18em] transition-all duration-300 rounded-t-lg ${activeView === 'inventory' ? 'border-b-2 border-orange-400 text-orange-400 font-semibold' : 'text-slate-400 hover:text-white border-b-2 border-transparent hover:border-white/20'}`}><Boxes className="h-3.5 w-3.5" /> Inventario</button>
          <button onClick={() => setActiveView('orders')} className={`flex items-center gap-2 pb-3 px-4 text-[10px] uppercase tracking-[0.18em] transition-all duration-300 rounded-t-lg ${activeView === 'orders' ? 'border-b-2 border-orange-400 text-orange-400 font-semibold' : 'text-slate-400 hover:text-white border-b-2 border-transparent hover:border-white/20'}`}><Truck className="h-3.5 w-3.5" /> Pedidos asignados</button>
          <button onClick={() => setActiveView('wallet')} className={`flex items-center gap-2 pb-3 px-4 text-[10px] uppercase tracking-[0.18em] transition-all duration-300 rounded-t-lg ${activeView === 'wallet' ? 'border-b-2 border-orange-400 text-orange-400 font-semibold' : 'text-slate-400 hover:text-white border-b-2 border-transparent hover:border-white/20'}`}><Wallet className="h-3.5 w-3.5" /> Billetera y pagos</button>
        </div>

        {/* Métricas */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-5 mb-10">
          <div className="bg-white/[.04] border border-white/10 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-orange-400/30 transition-colors duration-300">
            <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Productos</p>
            <p className="mt-3 font-montserrat text-3xl font-light text-white">{products.length}</p>
          </div>
          <div className="bg-white/[.04] border border-white/10 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-orange-400/30 transition-colors duration-300">
            <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Unidades</p>
            <p className="mt-3 font-montserrat text-3xl font-light text-white">{products.reduce((total, item) => total + (Number(item.stock) || 0), 0)}</p>
          </div>
          <div className="bg-white/[.04] border border-white/10 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-orange-400/30 transition-colors duration-300">
            <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Pedidos por alistar</p>
            <p className="mt-3 flex items-center gap-2 font-montserrat text-3xl font-light text-white">
              <Truck className="h-5 w-5 text-orange-400" />
              {providerOrders.filter(o => o.status === 'por_recolectar').length}
            </p>
          </div>
          <div className="bg-white/[.04] border border-white/10 p-6 rounded-2xl backdrop-blur-xl shadow-lg hover:border-green-400/30 transition-colors duration-300">
            <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Saldo por cobrar</p>
            <p className="mt-3 flex items-center gap-2 font-montserrat text-xl font-light text-green-400">
              <Wallet className="h-5 w-5" />
              ${providerOrders.filter(o => ['entregado', 'para_pagar'].includes(String(o.status))).reduce((sum, o) => {
                const prov = Math.max(0, (Number(o.providerCost) || Number(o.subtotal) || Number(o.total) || 0) - (Number(o.wholesaleCommission) || 0));
                return sum + prov;
              }, 0).toLocaleString('es-CO')}
            </p>
          </div>
        </section>
        {activeView === 'inventory' && (
        <>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-5 mb-8">
          <div>
            <h2 className="font-montserrat text-2xl font-light text-white tracking-tight">Gestionar Mi Inventario</h2>
            <p className="text-xs text-slate-400 font-light mt-2 leading-relaxed">Controla tus productos disponibles, stock y sube nuevo material.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadCatalog}
              disabled={downloadingCatalog}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-[0.18em] text-white border border-white/15 hover:border-orange-400/40 hover:bg-white/[.05] transition-all duration-300 hover:scale-[1.02] disabled:opacity-60 disabled:hover:scale-100"
            >
              <FileDown className="h-4 w-4" />
              <span>
                {downloadingCatalog
                  ? `Preparando catálogo… ${catalogProgress?.done ?? 0}/${catalogProgress?.total ?? products.length}`
                  : 'Descargar catálogo PDF'}
              </span>
            </button>
            <button onClick={() => { resetForm(); setShowAddModal(true); }} className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-[0.18em] text-white btn-glass-primary">
              <Plus className="h-4 w-4" /><span>Añadir Producto</span>
            </button>
          </div>
        </div>

        {/* Listado de Productos */}
        <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar por nombre o categoría" className="mb-6 w-full rounded-xl border border-white/12 bg-white/[.05] px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" />
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold border-t-transparent"></div>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white/[.04] border border-white/10 p-16 text-center rounded-2xl shadow-lg backdrop-blur-xl">
            <Package className="h-12 w-12 stroke-1 text-orange-400 mx-auto mb-4" />
            <p className="text-sm text-slate-400 font-light mb-5">No tienes productos en tu catálogo.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-[10px] uppercase tracking-[0.22em] text-orange-400 hover:text-orange-300 font-semibold transition-colors duration-300"
            >
              Crea tu primer producto →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.filter(product => `${product.name} ${product.category}`.toLowerCase().includes(productSearch.toLowerCase())).map((product) => (
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
                
                <div className="p-5 space-y-4 flex-grow flex flex-col justify-between">
                  <div className="space-y-2.5">
                    <span className="text-[9px] uppercase tracking-[0.22em] text-orange-400 font-semibold">{product.category}</span>
                    <h3 className="font-montserrat text-base font-medium text-white leading-snug">{product.name}</h3>
                    <p className="text-xs text-slate-400 font-light line-clamp-2 leading-relaxed">{product.summary}</p>
                  </div>
                  
                  <div className="flex justify-between items-center pt-4 border-t border-white/10">
                    <span className="font-montserrat text-lg font-medium text-white">${product.price.toLocaleString()}</span>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditClick(product)}
                        className="p-2 rounded-lg border border-white/10 hover:border-orange-400/40 hover:text-orange-400 hover:bg-orange-400/10 transition-all duration-300 text-slate-400 hover:scale-105"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4 stroke-1" />
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id)}
                        className="p-2 rounded-lg border border-white/10 hover:border-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-all duration-300 text-slate-400 hover:scale-105"
                        title="Eliminar"
                      >
                        <Trash className="h-4 w-4 stroke-1" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2"><label className="text-[9px] uppercase tracking-[0.18em] text-slate-400">Stock rápido</label><input type="number" min="0" value={stockDraft[product.id] ?? product.stock} onChange={e => setStockDraft({ ...stockDraft, [product.id]: Number(e.target.value) })} className="w-20 rounded-lg border border-white/12 bg-white/[.05] px-2 py-1.5 text-xs text-white" /><button onClick={() => saveQuickStock(product)} className="text-[10px] uppercase tracking-[0.18em] text-orange-400 hover:text-orange-300 font-semibold transition-colors duration-300">Guardar</button></div>
                </div>
              </div>
            ))}
          </div>
        )}
        </>
        )}

        {/* Sub-pestaña: Pedidos asignados */}
        {activeView === 'orders' && (
          <div className="bg-white/[.04] border border-white/10 p-7 shadow-lg rounded-2xl backdrop-blur-xl space-y-5">
            <h2 className="font-montserrat text-xl font-light text-white mb-3 flex items-center gap-2.5"><Truck className="h-5 w-5 text-orange-400" /> Pedidos por alistar</h2>
            <p className="text-xs text-slate-400 font-light mb-4 leading-relaxed">Aquí verás las órdenes pagadas que se te asignaron. Por seguridad los datos del cliente final no están disponibles — la plataforma gestiona el envío.</p>
            {(() => {
              const pendientes = providerOrders.filter(o => o.status === 'por_recolectar');
              if (pendientes.length === 0) return                   <p>No tienes pedidos por alistar hoy. Vuelve luego del próximo pago de un cliente.</p>;
              const cutoff = new Date();
              cutoff.setHours(15, 0, 0, 0);
              return (
                <div className="space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-orange-500">Alista {pendientes.length} pedidos {new Date().getHours() < 15 ? 'para hoy antes de 3pm' : 'para mañana antes de 3pm'}</p>
                  {pendientes.map(order => {
                    const itemsSummary = (order.items || []).map(item => `${item.name} x${item.quantity}`).join(', ');
                    const prov = Math.max(0, (Number(order.providerCost) || Number(order.subtotal) || Number(order.total) || 0) - (Number(order.wholesaleCommission) || 0));
                    return (
                      <div key={order.id} className="bg-white/[.03] border border-white/10 p-4 rounded-xl text-sm transition-colors duration-200 hover:border-orange-400/30">
                        <div className="flex justify-between">
                          <span className="font-mono text-[10px] text-slate-400">#{order.id.slice(0, 6)}</span>
                          <span className="text-[10px] text-orange-400 uppercase tracking-wider">{order.type}</span>
                        </div>
                        <p className="mt-2 font-medium text-white leading-snug">{itemsSummary}</p>
                        <p className="mt-1.5 text-xs text-slate-400">Unidades totales: {(order.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0)}</p>
                        <p className="mt-1 text-xs text-green-400 font-medium">Income: ${prov.toLocaleString('es-CO')}</p>
                        <p className="mt-1 text-[10px] text-slate-500">El sistema ya comunicó la dirección al mensajero de la plataforma.</p>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            {/* En curso */}
            {providerOrders.filter(o => !['por_recolectar', 'entregado', 'para_pagar', 'pagado'].includes(String(o.status))).length > 0 && (
              <details className="mt-6 border-t border-white/10 pt-5">
                <summary className="cursor-pointer text-xs uppercase tracking-[0.18em] text-slate-500 hover:text-white transition-colors">En curso</summary>
                <div className="mt-4 space-y-2">
                  {providerOrders.filter(o => !['por_recolectar', 'entregado', 'para_pagar', 'pagado'].includes(String(o.status))).map(order => (
                    <div key={order.id} className="bg-white/[.03] border border-white/10 p-3 rounded-lg text-xs flex justify-between">
                      <span className="font-mono text-[10px]">#{order.id.slice(0, 6)} · {(order.items || []).map(i => i.name).join(', ')}</span>
                      <span className="text-[10px] text-orange-400 uppercase tracking-wider">{order.status}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Sub-pestaña: Billetera */}
        {activeView === 'wallet' && (
          <div className="bg-white/[.04] border border-white/10 p-7 shadow-lg rounded-2xl backdrop-blur-xl space-y-6">
            <h2 className="font-montserrat text-xl font-light text-white mb-2 flex items-center gap-2.5"><Wallet className="h-5 w-5 text-orange-400" /> Billetera</h2>
            <p className="text-xs text-slate-400 font-light leading-relaxed">Resumen de tu saldo por cobrar y transferencias ejecutadas (martes y viernes).</p>
            {(() => {
              const porCobrar = providerOrders.filter(o => ['entregado', 'para_pagar'].includes(String(o.status)))
                .reduce((sum, o) => sum + Math.max(0, (Number(o.providerCost) || Number(o.subtotal) || Number(o.total) || 0) - (Number(o.wholesaleCommission) || 0)), 0);
              const pagado = providerOrders.filter(o => o.status === 'pagado')
                .reduce((sum, o) => sum + Math.max(0, (Number(o.providerCost) || Number(o.subtotal) || Number(o.total) || 0) - (Number(o.wholesaleCommission) || 0)), 0);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border border-white/12 bg-white/[.03] p-5 rounded-xl">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Saldo por cobrar</p>
                    <p className="mt-3 font-montserrat text-2xl font-light text-green-400">${porCobrar.toLocaleString('es-CO')}</p>
                    <p className="mt-1.5 text-[10px] text-slate-500">Próximo batch: {new Date().getDay() < 2 ? 'martes' : new Date().getDay() === 2 ? 'hoy (martes)' : new Date().getDay() < 5 ? 'viernes' : 'martes'}</p>
                  </div>
                  <div className="border border-white/12 bg-white/[.03] p-5 rounded-xl">
                    <p className="text-[9px] uppercase tracking-[0.22em] text-slate-400">Pagado acumulado</p>
                    <p className="mt-3 font-montserrat text-2xl font-light text-white">${pagado.toLocaleString('es-CO')}</p>
                    <p className="mt-1.5 text-[10px] text-slate-500">Histórico de transferencias ejecutadas</p>
                  </div>
                </div>
              );
            })()}
            <div>
              <h3 className="text-[10px] uppercase tracking-[0.22em] text-slate-400 mb-4 font-semibold">Historial de transferencias</h3>
              {providerPayouts.length === 0 ? (
                <p className="text-xs text-slate-400 font-light">Todavía no se han ejecutado transferencias a tu cuenta.</p>
              ) : (
                <div className="space-y-2.5">
                  {providerPayouts.map(batch => (
                    <div key={batch.id} className="flex justify-between bg-white/[.03] border border-white/10 p-4 rounded-xl text-xs transition-colors duration-200 hover:border-orange-400/25">
                      <div>
                        <p className="font-medium text-white">{batch.period.toUpperCase()} · {batch.date}</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Ref: {batch.reference}</p>
                      </div>
                      <p className="text-orange-400 font-medium">{batch.status === 'ejecutado' ? 'Acreditado' : batch.status}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Add / Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 overflow-y-auto">
          <div
            className="glass-panel w-full max-w-2xl p-8 shadow-2xl relative space-y-7 my-8 max-h-[90vh] overflow-y-auto rounded-2xl animate-modal-appear">
            <h2 className="font-montserrat text-xl font-light text-white tracking-wide">
              {editingProduct ? 'Editar Producto' : 'Subir Nuevo Producto'}
            </h2>
            
            <form onSubmit={handleSaveProduct} className="space-y-7">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Nombre</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
                    placeholder="iPhone 15 Pro Max"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Categoría</label>
                  <select
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
                  ><option value="">Selecciona una categoría</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Precio Base (COP) · fuente de verdad del proveedor</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Stock Inicial</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={stock}
                    onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
                  />
                </div>
                <textarea value={imageUrlInput} onChange={e => setImageUrlInput(e.target.value)} rows={2} className="md:col-span-2 w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200" placeholder="O pega enlaces de imágenes, uno por línea" />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Resumen del Producto</label>
                <input
                  type="text"
                  required
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
                  placeholder="iPhone con pantalla OLED de 6.7 pulgadas..."
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Características (Una por línea)</label>
                <textarea
                  value={features}
                  onChange={(e) => setFeatures(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
                  placeholder="Chip A17 Pro&#10;Cámara de 48MP&#10;Titanio aeroespacial"
                />
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Imágenes del Producto</label>
                <div className="mt-2 flex justify-center px-6 pt-7 pb-8 border border-dashed border-white/15 bg-white/[.03] rounded-xl">
                  <div className="space-y-2 text-center">
                    <Upload className="mx-auto h-8 w-8 text-slate-400 stroke-1" />
                    <div className="flex text-xs text-slate-400 font-light">
                      <label className="relative cursor-pointer font-semibold text-orange-400 hover:text-orange-300 transition-colors duration-200">
                        <span>Subir imágenes</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => setImageFiles(e.target.files)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 font-light">PNG, JPG, WEBP hasta 5MB</p>
                    {imageFiles && (
                      <p className="text-xs text-orange-400 font-medium mt-2">
                        {imageFiles.length} archivos seleccionados
                      </p>
                    )}
                  </div>
                </div>
                {existingImages.length > 0 && <div className="mt-4 flex gap-3 overflow-x-auto">{existingImages.map((url, index) => <div key={`${url}-${index}`} className="relative h-20 w-20 shrink-0"><img src={url} alt="" className="h-full w-full rounded-xl object-cover" /><div className="absolute -bottom-2 left-0 right-0 flex justify-center gap-1"><button type="button" disabled={index === 0} onClick={() => setExistingImages(items => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="rounded bg-black/80 px-1 text-xs disabled:opacity-30">←</button><button type="button" disabled={index === existingImages.length - 1} onClick={() => setExistingImages(items => { const next = [...items]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="rounded bg-black/80 px-1 text-xs disabled:opacity-30">→</button><button type="button" onClick={() => setExistingImages(items => items.filter((_, itemIndex) => itemIndex !== index))} className="rounded bg-red-500 px-1 text-xs">×</button></div></div>)}</div>}
              </div>

              <div className="flex justify-end space-x-3 pt-5 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-white/12 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 transition-colors duration-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-5 py-2.5 btn-glass-primary text-[10px] font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {uploading ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProviderDashboard;
