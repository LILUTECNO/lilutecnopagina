import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  setDoc, 
  addDoc,
  query,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { Product } from '../types';
import { ShieldAlert, Users, Package, Settings, Tag, Plus, Edit, Trash, Upload, LogOut, Check, X, RefreshCw, FileDown, AlertTriangle, TrendingUp, Images, Truck, Wallet } from 'lucide-react';
import { downloadCatalogPdf } from '../utils/catalogPdf';
import LogisticsPanel from '../components/LogisticsPanel';
import PayoutsPanel from '../components/PayoutsPanel';
import ConfiguracionGlobalMargenes from '../components/ConfiguracionGlobalMargenes';
import EditorPreciosProducto from '../components/EditorPreciosProducto';
import ThemeToggleTRON from '../components/ThemeToggleTRON';
import VitrinaHomeManager from '../components/admin/VitrinaHomeManager';
import BannerEditor from '../components/admin/BannerEditor';
import { fetchConfigMargenes } from '../services/margenes';
import { ConfigMargenesGlobal, DEFAULT_CONFIG_MARGENES } from '../types';

interface FirestoreUser {
  id: string;
  name: string;
  email: string;
  role: 'cliente' | 'proveedor' | 'dropshipper' | 'admin';
  status: 'approved' | 'pending' | 'rejected';
  createdAt?: string;
  storeName?: string; taxId?: string; phone?: string; address?: string; logoUrl?: string;
}

interface CategoryDoc {
  id: string;
  name: string;
}

const MasterAdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'products' | 'categories' | 'prices' | 'users' | 'banners' | 'logistics' | 'payouts'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<{ id: string; total?: number; status?: string; paymentStatus?: string }[]>([]);
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // Price adjustment states
  const [priceAdjustmentPercent, setPriceAdjustmentPercent] = useState<number | ''>('');
  const [globalDiscount, setGlobalDiscount] = useState<number | ''>(15); // dropshipper discount in %
  const [shippingBogota, setShippingBogota] = useState<number | ''>(10000);
  const [shippingOther, setShippingOther] = useState<number | ''>(15000);
  const [coupons, setCoupons] = useState<{ id: string; code: string; type: 'shipping' | 'percent'; value?: number; active?: boolean }[]>([]);
  const [couponDraft, setCouponDraft] = useState<{ code: string; type: 'shipping' | 'percent'; value: number | '' }>({ code: '', type: 'shipping', value: '' });
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);

  // Products CRUD Form states
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [pName, setPName] = useState('');
  const [pPrice, setPPrice] = useState<number | ''>('');
  const [pVendorPrice, setPVendorPrice] = useState<number | ''>('');
  const [pCategory, setPCategory] = useState('');
  const [pStock, setPStock] = useState<number | ''>('');
  const [pSummary, setPSummary] = useState('');
  const [pFeatures, setPFeatures] = useState('');
  const [pImageFiles, setPImageFiles] = useState<FileList | null>(null);
  const [pImageUrls, setPImageUrls] = useState('');
  const [pExistingImages, setPExistingImages] = useState<string[]>([]);
  const [pCollections, setPCollections] = useState({ featured: false, offers: false, new: false });
  const [productSearch, setProductSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'cliente' | 'proveedor' | 'dropshipper'>('all');
  const [submittingProduct, setSubmittingProduct] = useState(false);

  // Category Form states
  const [newCatName, setNewCatName] = useState('');
  const [creatingCat, setCreatingCat] = useState(false);

  // --- Sistema de 3 Niveles de Precios (v3) ---
  const [configMargenes, setConfigMargenes] = useState<ConfigMargenesGlobal>({ ...DEFAULT_CONFIG_MARGENES });

  // --- Vitrina Home (tab Productos) ---
  const [vistaActiva, setVistaActiva] = useState<'catalogo' | 'vitrina'>('catalogo');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchProducts(), fetchOrders(),
        fetchUsers(),
        fetchCategories(),
        fetchSettings(), fetchCoupons()
      ]);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar datos del panel maestro.');
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    const q = query(collection(db, 'products'), orderBy('name'));
    const snapshot = await getDocs(q);
    const items: Product[] = [];
    snapshot.forEach((doc) => {
      items.push({ id: doc.id, ...doc.data() } as Product);
    });
    setProducts(items);
  };
  const fetchOrders = async () => { const snapshot = await getDocs(collection(db, 'orders')); setOrders(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as { id: string; total?: number; status?: string; paymentStatus?: string }))); };

  const fetchUsers = async () => {
    const snapshot = await getDocs(collection(db, 'users'));
    const items: FirestoreUser[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Incluir usuarios que no sean admin para verificación
      if (data.role !== 'admin') {
        items.push({ id: doc.id, ...data } as FirestoreUser);
      }
    });
    setUsers(items);
  };

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, 'categories'));
    const items: CategoryDoc[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      items.push({ id: doc.id, name: String(data.name || data.label || data.title || doc.id) });
    });
    setCategories(items);
  };

  const fetchSettings = async () => {
    try {
      const docSnap = await getDocs(collection(db, 'settings'));
      docSnap.forEach((doc) => {
        if (doc.id === 'priceMargins') {
          setGlobalDiscount(doc.data().dropshipperDiscount !== undefined ? doc.data().dropshipperDiscount : 15);
        }
      });
      const shippingDoc = await getDocs(collection(db, 'settings'));
      shippingDoc.forEach(item => {
        if (item.id === 'shipping') {
          setShippingBogota(item.data().bogota !== undefined ? Number(item.data().bogota) : 10000);
          setShippingOther(item.data().other !== undefined ? Number(item.data().other) : 15000);
        }
      });
      const cfg = await fetchConfigMargenes();
      setConfigMargenes(cfg);
    } catch (e) {
      console.warn("No settings doc found, using default 15%");
    }
  };
  const fetchCoupons = async () => { const snapshot = await getDocs(collection(db, 'coupons')); setCoupons(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as { id: string; code: string; type: 'shipping' | 'percent'; value?: number; active?: boolean }))); };
  const saveShipping = async () => { await setDoc(doc(db, 'settings', 'shipping'), { bogota: shippingBogota === '' ? 10000 : Number(shippingBogota), other: shippingOther === '' ? 15000 : Number(shippingOther) }); toast.success('Tarifas de envío guardadas.'); };
  
  const saveCoupon = async () => {
    if (!couponDraft.code.trim()) return;
    const cleanCode = couponDraft.code.trim().toUpperCase();
    const dataToSave = {
      code: cleanCode,
      type: couponDraft.type,
      value: couponDraft.type === 'shipping' ? null : (couponDraft.value === '' ? 0 : Number(couponDraft.value)),
    };
    
    try {
      if (editingCouponId) {
        await updateDoc(doc(db, 'coupons', editingCouponId), dataToSave);
        toast.success('Cupón actualizado.');
        setEditingCouponId(null);
      } else {
        await addDoc(collection(db, 'coupons'), {
          ...dataToSave,
          active: true,
          createdAt: new Date().toISOString()
        });
        toast.success('Cupón creado.');
      }
      setCouponDraft({ code: '', type: 'shipping', value: '' });
      fetchCoupons();
    } catch (e) {
      console.error(e);
      toast.error('Error al guardar cupón.');
    }
  };
  const deleteCoupon = async (id: string) => { await deleteDoc(doc(db, 'coupons', id)); fetchCoupons(); toast.success('Cupón eliminado.'); };
 
  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión de administrador cerrada.');
      navigate('/');
    } catch (error) {
      toast.error('Error al cerrar sesión.');
    }
  };
 
  const handleDownloadStoreCatalog = async () => {
    try {
      await downloadCatalogPdf(products, 'catalogo-completo-lilu-tecno.pdf', 'Catálogo completo de tienda');
      toast.success('El catálogo completo fue generado.');
    } catch (error) {
      console.error(error);
      toast.error('No fue posible generar el catálogo PDF.');
    }
  };

  // --- USER VERIFICATION ACTIONS ---
  const handleUserStatus = async (userId: string, newStatus: 'approved' | 'rejected' | 'pending') => {
    try {
      await updateDoc(doc(db, 'users', userId), { status: newStatus });
      toast.success(`Cuenta ${newStatus === 'approved' ? 'aprobada' : 'rechazada'} exitosamente.`);
      fetchUsers();
    } catch (error) {
      console.error(error);
      toast.error('Error al actualizar estado del usuario.');
    }
  };

  // --- CATEGORIES ACTIONS ---
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCreatingCat(true);
    try {
      const cleanId = newCatName.toLowerCase().replace(/\s+/g, '-');
      await setDoc(doc(db, 'categories', cleanId), { name: newCatName });
      toast.success('Categoría agregada.');
      setNewCatName('');
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error('Error al agregar categoría.');
    } finally {
      setCreatingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    if (!window.confirm('¿Eliminar esta categoría? Esto no eliminará los productos asociados.')) return;
    try {
      await deleteDoc(doc(db, 'categories', catId));
      toast.success('Categoría eliminada.');
      fetchCategories();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar categoría.');
    }
  };

  // --- PRICE CONTROL ACTIONS ---
  const handleMassivePriceAdjustment = async () => {
    if (priceAdjustmentPercent === 0) return;
    if (!window.confirm(`¿Ajustar el precio de todos los productos en un ${priceAdjustmentPercent}%?`)) return;

    setLoading(true);
    try {
      const batch = writeBatch(db);
      products.forEach((product) => {
        const factor = 1 + (Number(priceAdjustmentPercent) / 100);
        const newPrice = Math.round(product.price * factor);
        const productRef = doc(db, 'products', product.id);
        batch.update(productRef, { price: newPrice });
      });
      await batch.commit();
      toast.success('Ajuste de precios masivo completado.');
      setPriceAdjustmentPercent(0);
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error('Error en el ajuste de precios masivo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'priceMargins'), { dropshipperDiscount: Number(globalDiscount) });
      toast.success('Margen global de dropshipping guardado.');
    } catch (error) {
      console.error(error);
      toast.error('Error al guardar ajustes.');
    }
  };

  // --- PRODUCTS CRUD ACTIONS ---
  const handleImageUploads = async (productId: string): Promise<string[]> => {
    if (!pImageFiles || pImageFiles.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < pImageFiles.length; i++) {
      const file = pImageFiles[i];
      const storageRef = ref(storage, `products/${productId}/${Date.now()}_${file.name}`);
      try {
        const uploadResult = await uploadBytes(storageRef, file);
        const url = await getDownloadURL(uploadResult.ref);
        urls.push(url);
      } catch (uploadError: any) {
        console.error('Storage upload error:', uploadError?.code || uploadError?.message || uploadError);
        const code = String(uploadError?.code || '');
        let humanMessage = 'No fue posible subir una imagen.';
        if (code.includes('storage/unauthorized') || code.includes('permission')) humanMessage = 'Permiso de Storage denegado. Revisa storage.rules o despliégalas de nuevo.';
        else if (code.includes('storage/cors')) humanMessage = 'CORS de Storage bloqueando la subida.';
        else if (code.includes('storage/quota') || code.includes('storage/bucket')) humanMessage = 'Bucket de Storage no configurado o sin cuota.';
        else if (code.includes('storage/retry-limit')) humanMessage = 'Red inestable. Reintenta por favor.';
        toast.error(humanMessage + ` (${file.name})`);
      }
    }
    return urls;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingProduct(true);

    try {
      const featuresArray = pFeatures.split('\n').filter(f => f.trim() !== '');
      const manualUrls = pImageUrls.split(/\n|,/).map(url => url.trim()).filter(Boolean);

      if (editingProduct) {
        // Edit Mode
        const docRef = doc(db, 'products', editingProduct.id);
        // Conservar imágenes preexistentes (siempre, aunque el array sea undefined/null).
        const existingSafe = Array.isArray(editingProduct.images) ? [...editingProduct.images] : (Array.isArray(pExistingImages) ? [...pExistingImages] : []);
        let uploadedUrls: string[] = [];
        if (pImageFiles && pImageFiles.length > 0) {
          uploadedUrls = await handleImageUploads(editingProduct.id);
        }
        const finalImages = [...existingSafe, ...uploadedUrls, ...manualUrls];

        await updateDoc(docRef, {
          name: pName,
          price: Number(pPrice), vendorPrice: pVendorPrice === '' ? null : Number(pVendorPrice),
          category: pCategory,
          stock: Number(pStock || 0),
          summary: pSummary,
          features: featuresArray,
          images: finalImages,
          collections: pCollections,
        });

        if (pImageFiles && pImageFiles.length > 0 && uploadedUrls.length === 0) {
          toast('Producto actualizado. Algunas imágenes no se subieron; revisa Storage.', { icon: '⚠️' });
        } else {
          toast.success('Producto actualizado.');
        }
      } else {
        // Create Mode: crear primero el doc con las URLs manuales, luego subir archivos y luego actualizar.
        const newDocRef = await addDoc(collection(db, 'products'), {
          name: pName,
          price: Number(pPrice), vendorPrice: pVendorPrice === '' ? null : Number(pVendorPrice),
          category: pCategory,
          stock: Number(pStock || 0),
          summary: pSummary,
          features: featuresArray,
          images: manualUrls,
          collections: pCollections,
          providerId: 'admin_maestro',
          createdAt: new Date().toISOString()
        });

        let uploadedUrls: string[] = [];
        if (pImageFiles && pImageFiles.length > 0) {
          uploadedUrls = await handleImageUploads(newDocRef.id);
          // Solo actualizar si hubo por lo menos un upload exitoso (si todos fallaron, dejamos images: manualUrls).
          if (uploadedUrls.length > 0) {
            await updateDoc(newDocRef, { images: [...manualUrls, ...uploadedUrls] });
          }
        }

        if (pImageFiles && pImageFiles.length > 0 && uploadedUrls.length === 0 && manualUrls.length === 0) {
          toast('Producto creado. No se subió ninguna imagen; revisa Storage.', { icon: '⚠️' });
        } else if (pImageFiles && pImageFiles.length > uploadedUrls.length) {
          toast(`Producto creado. Subidas ${uploadedUrls.length} de ${pImageFiles.length} imágenes.`, { icon: '⚠️' });
        } else {
          toast.success('Producto creado.');
        }
      }

      setShowProductModal(false);
      resetProductForm();
      fetchProducts();
    } catch (error: any) {
      console.error(error);
      toast.error('Error al guardar producto: ' + (error?.message || String(error)));
    } finally {
      setSubmittingProduct(false);
    }
  };

  const handleEditProductClick = (product: Product) => {
    setEditingProduct(product);
    setPName(product.name);
    setPPrice(product.price);
    setPVendorPrice(product.vendorPrice ?? '');
    setPCategory(product.category);
    setPStock(product.stock);
    setPSummary(product.summary);
    setPFeatures(product.features.join('\n'));
    setPImageUrls('');
    setPExistingImages(product.images || []);
    setPCollections({ featured: Boolean(product.collections?.featured), offers: Boolean(product.collections?.offers), new: Boolean(product.collections?.new) });
    setShowProductModal(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('¿Eliminar definitivamente este producto?')) return;
    try {
      await deleteDoc(doc(db, 'products', id));
      toast.success('Producto eliminado.');
      fetchProducts();
    } catch (error) {
      console.error(error);
      toast.error('Error al eliminar producto.');
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setPName('');
    setPPrice('');
    setPVendorPrice('');
    setPCategory('');
    setPStock('');
    setPSummary('');
    setPFeatures('');
    setPImageFiles(null);
    setPImageUrls('');
    setPExistingImages([]);
    setPCollections({ featured: false, offers: false, new: false });
  };

  return (
    <div className="admin-shell min-h-screen font-sans">
      {/* Header Admin */}
      <header className="border-b border-white/10 bg-[#100719]/92 text-white px-6 py-4 flex justify-between items-center backdrop-blur-2xl">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="h-6 w-6 text-luxury-gold" />
          <span className="wordmark font-montserrat text-lg font-black tracking-widest text-white">
            LILUTECNO MAESTRO
          </span>
        </div>
        <div className="flex items-center space-x-6">
          <span className="role-label text-xs uppercase tracking-wider text-luxury-gold font-semibold">
            PANEL DE ADMINISTRADOR MAESTRO
          </span>
          <ThemeToggleTRON label="Cambiar entre modo día y noche" size={36} />
          <button onClick={handleLogout} className="text-gray-400 hover:text-white transition-colors" title="Cerrar Sesión">
            <LogOut className="h-5 w-5 stroke-1" />
          </button>
        </div>
      </header>

      {/* Tabs Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {!loading && <section className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white border border-luxury-silver p-4 shadow-luxury">
            <p className="text-[9px] uppercase tracking-widest text-gray-400">Inventario</p>
            <p className="mt-2 text-2xl font-montserrat font-light text-luxury-black">{products.length} Refs</p>
            <p className="mt-1 text-[9px] text-slate-400 font-light">Unidades: {products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0)}</p>
          </div>
          <div className="bg-white border border-luxury-silver p-4 shadow-luxury">
            <p className="text-[9px] uppercase tracking-widest text-gray-400">Stock bajo (&lt;=5)</p>
            <p className="mt-2 flex items-center gap-2 text-2xl font-montserrat font-light text-luxury-black">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {products.filter(p => (Number(p.stock) || 0) <= 5).length}
            </p>
          </div>
          <div className="bg-white border border-luxury-silver p-4 shadow-luxury">
            <p className="text-[9px] uppercase tracking-widest text-gray-400">Proveedores</p>
            <p className="mt-2 text-2xl font-montserrat font-light text-luxury-black">
              {users.filter(u => u.role === 'proveedor' && u.status === 'approved').length} Aprob.
            </p>
            <p className="mt-1 text-[9px] text-amber-500 font-light">{users.filter(u => u.role === 'proveedor' && u.status === 'pending').length} Pendientes</p>
          </div>
          <div className="bg-white border border-luxury-silver p-4 shadow-luxury">
            <p className="text-[9px] uppercase tracking-widest text-gray-400">Valor catálogo</p>
            <p className="mt-2 flex items-center gap-1 text-lg font-montserrat font-light text-luxury-black">
              <TrendingUp className="h-4 w-4 text-[#ff7a00]" />
              ${products.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-luxury-silver p-4 shadow-luxury">
            <p className="text-[9px] uppercase tracking-widest text-gray-400">Ventas Pagadas</p>
            <p className="mt-2 text-lg font-montserrat font-light text-luxury-black">
              ${orders.filter(order => order.paymentStatus === 'paid').reduce((sum, order) => sum + (order.total || 0), 0).toLocaleString()}
            </p>
            <p className="mt-1 text-[9px] text-orange-400 font-light">
              {orders.filter(order => order.paymentStatus !== 'paid' && order.status !== 'cancelled').length} pendientes
            </p>
          </div>
        </section>}
        <div className="flex space-x-4 border-b border-luxury-silver pb-2 mb-8">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center space-x-2 pb-2.5 text-xs font-medium uppercase tracking-widest transition-all ${
              activeTab === 'products' ? 'border-b-2 border-luxury-gold text-luxury-black font-semibold' : 'text-gray-400 hover:text-luxury-black'
            }`}
          >
            <Package className="h-4 w-4" />
            <span>Productos</span>
          </button>
          <button
            onClick={() => setActiveTab('banners')}
            className={`flex items-center space-x-2 pb-2.5 text-xs font-medium uppercase tracking-widest transition-all ${activeTab === 'banners' ? 'border-b-2 border-luxury-gold text-luxury-black font-semibold' : 'text-gray-400 hover:text-luxury-black'}`}
          >
            <Images className="h-4 w-4" /><span>Banners</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`flex items-center space-x-2 pb-2.5 text-xs font-medium uppercase tracking-widest transition-all ${
              activeTab === 'categories' ? 'border-b-2 border-luxury-gold text-luxury-black font-semibold' : 'text-gray-400 hover:text-luxury-black'
            }`}
          >
            <Tag className="h-4 w-4" />
            <span>Categorías</span>
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`flex items-center space-x-2 pb-2.5 text-xs font-medium uppercase tracking-widest transition-all ${
              activeTab === 'prices' ? 'border-b-2 border-luxury-gold text-luxury-black font-semibold' : 'text-gray-400 hover:text-luxury-black'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>Precios y Márgenes</span>
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center space-x-2 pb-2.5 text-xs font-medium uppercase tracking-widest transition-all ${
              activeTab === 'users' ? 'border-b-2 border-luxury-gold text-luxury-black font-semibold' : 'text-gray-400 hover:text-luxury-black'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Verificar Usuarios</span>
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className={`flex items-center space-x-2 pb-2.5 text-xs font-medium uppercase tracking-widest transition-all ${
              activeTab === 'logistics' ? 'border-b-2 border-luxury-gold text-luxury-black font-semibold' : 'text-gray-400 hover:text-luxury-black'
            }`}
          >
            <Truck className="h-4 w-4" />
            <span>Logística</span>
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`flex items-center space-x-2 pb-2.5 text-xs font-medium uppercase tracking-widest transition-all ${
              activeTab === 'payouts' ? 'border-b-2 border-luxury-gold text-luxury-black font-semibold' : 'text-gray-400 hover:text-luxury-black'
            }`}
          >
            <Wallet className="h-4 w-4" />
            <span>Pagos (Martes/Viernes)</span>
          </button>
          <button onClick={handleDownloadStoreCatalog} className="ml-auto flex items-center gap-2 self-start border border-luxury-gold px-3 py-2 text-[10px] uppercase tracking-widest text-luxury-black hover:bg-white">
            <FileDown className="h-4 w-4" /> Catálogo PDF
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold border-t-transparent"></div>
          </div>
        ) : (
          <div>
            {/* 1. PRODUCTOS CRUD */}
            {activeTab === 'products' && (
              <div className="space-y-6">
                {/* Pills de vista (NO tocan el Catálogo General existente) */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setVistaActiva('catalogo')}
                    className={vistaActiva === 'catalogo'
                      ? 'rounded-full border border-luxury-gold bg-luxury-black px-4 py-1.5 text-[10px] uppercase tracking-widest text-white font-semibold'
                      : 'rounded-full border border-luxury-silver bg-white px-4 py-1.5 text-[10px] uppercase tracking-widest text-gray-500 hover:border-luxury-gold'}
                  >
                    Catálogo General
                  </button>
                  <button
                    onClick={() => setVistaActiva('vitrina')}
                    className={vistaActiva === 'vitrina'
                      ? 'rounded-full border border-[#FF7A00]/60 bg-[#FF7A00]/15 px-4 py-1.5 text-[10px] uppercase tracking-widest text-[#FF7A00] font-semibold'
                      : 'rounded-full border border-luxury-silver bg-white px-4 py-1.5 text-[10px] uppercase tracking-widest text-gray-500 hover:border-[#FF7A00]'}
                  >
                    ⭐ Gestionar Vitrina Home
                  </button>
                </div>

                {vistaActiva === 'vitrina' ? (
                  <VitrinaHomeManager products={products} />
                ) : (
                <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-montserrat text-lg font-light text-luxury-black">Catálogo General</h3>
                  <button
                    onClick={() => { resetProductForm(); setShowProductModal(true); }}
                    className="flex items-center space-x-2 border border-luxury-gold bg-luxury-black px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-white transition-all duration-300 hover:bg-white hover:text-luxury-black"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Añadir Producto</span>
                  </button>
                </div>
                <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Buscar por nombre, referencia o categoría" className="w-full rounded-xl border border-luxury-silver bg-luxury-off-white px-4 py-3 text-sm" />

                <div className="bg-white border border-luxury-silver overflow-hidden shadow-luxury">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-luxury-silver bg-luxury-off-white text-[10px] uppercase tracking-widest text-gray-400 font-semibold">
                        <th className="py-4 px-6">Producto</th>
                        <th className="py-4 px-6">Categoría</th>
                        <th className="py-4 px-6">Precio (COP)</th>
                        <th className="py-4 px-6">Stock</th>
                        <th className="py-4 px-6 text-right">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-luxury-off-white text-sm font-light">
                      {products.filter(product => `${product.name} ${product.category} ${product.reference || ''}`.toLowerCase().includes(productSearch.toLowerCase())).map((product) => (
                        <tr key={product.id} className="hover:bg-luxury-off-white/50 transition-colors">
                          <td className="py-4 px-6 flex items-center space-x-4">
                            {product.images && product.images.length > 0 ? (
                              <img src={product.images[0]} alt="" className="h-10 w-10 object-cover" />
                            ) : (
                              <div className="h-10 w-10 bg-luxury-off-white border border-luxury-silver flex items-center justify-center text-[8px] uppercase tracking-widest font-light text-gray-300">N/A</div>
                            )}
                            <span className="font-medium text-luxury-black">{product.name}</span>
                          </td>
                          <td className="py-4 px-6 uppercase tracking-wider text-xs text-luxury-gold">{product.category}</td>
                          <td className="py-4 px-6">${product.price.toLocaleString()}</td>
                          <td className="py-4 px-6">{product.stock}</td>
                          <td className="py-4 px-6 text-right space-x-3">
                            <button onClick={() => handleEditProductClick(product)} className="text-gray-400 hover:text-luxury-gold transition-colors inline-block" title="Editar">
                              <Edit className="h-4 w-4 stroke-1" />
                            </button>
                            <button onClick={() => handleDeleteProduct(product.id)} className="text-gray-400 hover:text-red-400 transition-colors inline-block" title="Eliminar">
                              <Trash className="h-4 w-4 stroke-1" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                </div>
                )}
              </div>
            )}

            {/* 2. CATEGORÍAS */}
            {activeTab === 'categories' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white border border-luxury-silver p-6 shadow-luxury h-fit">
                  <h3 className="font-montserrat text-base font-light text-luxury-black mb-4">Nueva Categoría</h3>
                  <form onSubmit={handleAddCategory} className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Nombre</label>
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                        placeholder="Ej. Audio Premium"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={creatingCat}
                      className="w-full border border-luxury-gold bg-luxury-black py-2.5 text-xs font-medium uppercase tracking-widest text-white hover:bg-white hover:text-luxury-black transition-colors"
                    >
                      {creatingCat ? 'Creando...' : 'Crear Categoría'}
                    </button>
                  </form>
                </div>

                <div className="md:col-span-2 bg-white border border-luxury-silver p-6 shadow-luxury">
                  <h3 className="font-montserrat text-base font-light text-luxury-black mb-4">Listado de Categorías</h3>
                  {categories.length === 0 ? (
                    <p className="text-sm text-gray-400 font-light">No hay categorías configuradas. Crea una.</p>
                  ) : (
                    <div className="divide-y divide-luxury-off-white">
                      {categories.map((cat) => (
                        <div key={cat.id} className="flex justify-between items-center py-3">
                          <span className="text-sm font-light text-luxury-black uppercase tracking-wider">{cat.name}</span>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Eliminar"
                          >
                            <Trash className="h-4 w-4 stroke-1" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. PRECIOS Y MÁRGENES */}
            {activeTab === 'prices' && (
              <div className="space-y-8">
                {/* Tarjeta 5 (NUEVA): Configuración Global — arriba de las 4 existentes */}
                <ConfiguracionGlobalMargenes
                  products={products}
                  onRecalculado={() => { fetchProducts(); }}
                />

                {/* === Inicio: 4 tarjetas existentes — NO MODIFICAR === */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Control Masivo */}
                <div className="bg-white border border-luxury-silver p-6 shadow-luxury space-y-6">
                  <h3 className="font-montserrat text-base font-light text-luxury-black">Ajuste Masivo de Precios</h3>
                  <p className="text-xs text-gray-500 font-light">Modifica el precio de todos los productos por un porcentaje porcentual de inmediato. Úsalo con precaución.</p>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-1/2">
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Ajuste Porcentual (%)</label>
                      <input
                        type="number"
                        value={priceAdjustmentPercent}
                        onChange={(e) => setPriceAdjustmentPercent(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                        placeholder="Ej. 5 o -10"
                      />
                    </div>
                    <button
                      onClick={handleMassivePriceAdjustment}
                      className="w-1/2 border border-luxury-gold bg-luxury-black py-2.5 mt-5 text-xs font-medium uppercase tracking-widest text-white hover:bg-white hover:text-luxury-black transition-colors cursor-pointer"
                    >
                      Aplicar Ajuste
                    </button>
                  </div>
                </div>

                {/* Tarifas de Envío */}
                <div className="bg-white border border-luxury-silver p-6 shadow-luxury space-y-4">
                  <h3 className="font-montserrat text-base font-light text-luxury-black">Envíos</h3>
                  <p className="text-xs text-gray-500 font-light">Tarifa fija para Bogotá y tarifa flexible para el resto de ciudades.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-gray-400 font-medium mb-1">Bogotá (COP)</label>
                      <input type="number" value={shippingBogota} onChange={e => setShippingBogota(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black" placeholder="Bogotá" />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-gray-400 font-medium mb-1">Otras Ciudades (COP)</label>
                      <input type="number" value={shippingOther} onChange={e => setShippingOther(e.target.value === '' ? '' : Number(e.target.value))} className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black" placeholder="Otras ciudades" />
                    </div>
                  </div>
                  <button onClick={saveShipping} className="border border-luxury-gold bg-luxury-black px-4 py-2 text-xs uppercase tracking-widest text-white cursor-pointer hover:bg-white hover:text-luxury-black transition-colors">
                    Guardar tarifas
                  </button>
                </div>

                {/* Cupones */}
                <div className="bg-white border border-luxury-silver p-6 shadow-luxury space-y-4">
                  <h3 className="font-montserrat text-base font-light text-luxury-black">
                    {editingCouponId ? 'Editar Cupón' : 'Cupones Dinámicos'}
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-gray-400 font-medium mb-1">CÓDIGO</label>
                      <input value={couponDraft.code} onChange={e => setCouponDraft({ ...couponDraft, code: e.target.value })} className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black" placeholder="CÓDIGO" />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-gray-400 font-medium mb-1">TIPO</label>
                      <select value={couponDraft.type} onChange={e => setCouponDraft({ ...couponDraft, type: e.target.value as 'shipping' | 'percent' })} className="w-full rounded border border-luxury-silver bg-luxury-off-white px-2 py-2 text-sm font-light text-luxury-black">
                        <option value="shipping">Envío gratis</option>
                        <option value="percent">% descuento</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-gray-400 font-medium mb-1">VALOR (%)</label>
                      <input type="number" disabled={couponDraft.type === 'shipping'} value={couponDraft.value} onChange={e => setCouponDraft({ ...couponDraft, value: e.target.value === '' ? '' : Number(e.target.value) })} className="w-full rounded border border-luxury-silver bg-luxury-off-white px-2 py-2 text-sm font-light text-luxury-black" placeholder="%" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={saveCoupon} className="border border-luxury-gold bg-luxury-black px-4 py-2 text-xs uppercase tracking-widest text-white cursor-pointer hover:bg-white hover:text-luxury-black transition-colors">
                      {editingCouponId ? 'Actualizar cupón' : 'Crear cupón'}
                    </button>
                    {editingCouponId && (
                      <button onClick={() => { setEditingCouponId(null); setCouponDraft({ code: '', type: 'shipping', value: '' }); }} className="border border-gray-300 px-4 py-2 text-xs uppercase tracking-widest text-gray-500 cursor-pointer hover:bg-gray-100">
                        Cancelar
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 pt-2">
                    <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold">Cupones Existentes</p>
                    {coupons.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-2 border-t border-luxury-silver pt-2 text-xs text-luxury-black">
                        <span className="font-medium">{item.code} · {item.type === 'shipping' ? 'Envío gratis' : `${item.value}%`}</span>
                        <div className="ml-auto flex gap-3">
                          <button onClick={() => { setEditingCouponId(item.id); setCouponDraft({ code: item.code, type: item.type, value: item.value ?? '' }); }} className="text-orange-400 hover:text-orange-600 cursor-pointer" title="Editar">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={async () => { await updateDoc(doc(db, 'coupons', item.id), { active: item.active === false }); fetchCoupons(); }} className="text-purple-400 hover:text-purple-600 cursor-pointer font-medium">
                            {item.active === false ? 'Activar' : 'Pausar'}
                          </button>
                          <button onClick={() => deleteCoupon(item.id)} className="text-red-400 hover:text-red-600 cursor-pointer" title="Eliminar">
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Margen Dropshippers */}
                <div className="bg-white border border-luxury-silver p-6 shadow-luxury space-y-6">
                  <h3 className="font-montserrat text-base font-light text-luxury-black">Descuento Global Dropshippers</h3>
                  <p className="text-xs text-gray-500 font-light">Configura el porcentaje de descuento global que se le otorgará automáticamente a las cuentas de Dropshippers en su catálogo especial.</p>
                  
                  <div className="flex items-center space-x-4">
                    <div className="w-1/2">
                      <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Porcentaje de Descuento (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={globalDiscount}
                        onChange={(e) => setGlobalDiscount(e.target.value === '' ? '' : Number(e.target.value))}
                        className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleSaveSettings}
                      className="w-1/2 border border-luxury-gold bg-luxury-black py-2.5 mt-5 text-xs font-medium uppercase tracking-widest text-white hover:bg-white hover:text-luxury-black transition-colors cursor-pointer"
                    >
                      Guardar Ajustes
                    </button>
                  </div>
                </div>
                {/* === Fin: 4 tarjetas existentes — NO MODIFICAR === */}
              </div>

                {/* Tarjeta 6 (NUEVA): Editor de Precios por Producto — abajo de todo */}
                <EditorPreciosProducto
                  products={products}
                  cfg={configMargenes}
                  filtroExterno={null}
                  onProductosActualizados={() => { fetchProducts(); }}
                />
              </div>
            )}

            {/* 4. VERIFICAR USUARIOS */}
            {activeTab === 'users' && (
              <div className="bg-white border border-luxury-silver shadow-luxury">
                <div className="p-6 border-b border-luxury-silver flex justify-between items-center">
                  <h3 className="font-montserrat text-base font-light text-luxury-black">Verificación de Cuentas</h3>
                  <button onClick={fetchUsers} className="text-gray-400 hover:text-luxury-black transition-colors">
                    <RefreshCw className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-3 border-b border-luxury-silver p-4 sm:grid-cols-[1fr_auto]"><input value={userSearch} onChange={e => setUserSearch(e.target.value)} className="rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm" placeholder="Buscar por nombre, tienda o teléfono" /><select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value as typeof userRoleFilter)} className="rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm"><option value="all">Todos los perfiles</option><option value="cliente">Clientes</option><option value="proveedor">Proveedores</option><option value="dropshipper">Vendedores</option></select></div>
                {users.length === 0 ? (
                  <div className="p-12 text-center text-gray-400 text-sm font-light">No hay usuarios registrados (excepto administradores).</div>
                ) : (
                  <div className="divide-y divide-luxury-off-white">
                    {users.filter(user => (userRoleFilter === 'all' || user.role === userRoleFilter) && `${user.name || ''} ${user.storeName || ''} ${user.phone || ''} ${user.email || ''}`.toLowerCase().includes(userSearch.toLowerCase())).map((user) => (
                      <div key={user.id} className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium text-luxury-black text-sm">{user.name}</span>
                            <span className="px-2 py-0.5 text-[9px] uppercase tracking-widest font-semibold bg-luxury-off-white border border-luxury-silver text-luxury-gold">
                              {user.role === 'dropshipper' ? 'vendedor' : user.role}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 font-light">{user.email}</p>
                          {(user.storeName || user.phone || user.taxId) && <p className="text-[10px] leading-5 text-gray-400">{user.storeName && <>Tienda: {user.storeName} · </>}{user.taxId && <>ID: {user.taxId} · </>}{user.phone && <>Tel: {user.phone}</>}{user.address && <><br />{user.address}</>}</p>}
                          {user.logoUrl && <img src={user.logoUrl} alt={`Logo de ${user.storeName || user.name}`} className="mt-2 h-10 w-10 rounded-lg border border-luxury-silver object-contain" />}
                          <p className="text-[10px] text-gray-400">ID: {user.id}</p>
                        </div>

                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-0.5 uppercase tracking-widest text-[9px] font-semibold border ${
                            user.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            user.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {user.status}
                          </span>
                          
                          {user.status === 'pending' && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleUserStatus(user.id, 'approved')}
                                className="flex items-center space-x-1 border border-green-500 text-green-600 hover:bg-green-50 px-2 py-1 text-xs uppercase tracking-wider"
                              >
                                <Check className="h-3 w-3" />
                                <span>Aprobar</span>
                              </button>
                              <button
                                onClick={() => handleUserStatus(user.id, 'rejected')}
                                className="flex items-center space-x-1 border border-red-500 text-red-600 hover:bg-red-50 px-2 py-1 text-xs uppercase tracking-wider"
                              >
                                <X className="h-3 w-3" />
                                <span>Rechazar</span>
                              </button>
                            </div>
                          )}

                          {user.status !== 'pending' && (
                            <button
                              onClick={() => handleUserStatus(user.id, 'pending')}
                              className="text-xs text-gray-400 hover:text-luxury-black hover:underline"
                            >
                              Restablecer
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'banners' && (
              <BannerEditor />
            )}

            {/* 5. LOGÍSTICA — Kanban de órdenes pagadas con rutas, validación foto, guías */}
            {activeTab === 'logistics' && <LogisticsPanel />}

            {/* 6. PAGOS — Batch martes/viernes con cálculo de comisiones */}
            {activeTab === 'payouts' && <PayoutsPanel />}
          </div>
        )}
      </div>

      {/* CRUD Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-luxury-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white border border-luxury-silver p-8 shadow-luxury relative space-y-6 my-8 max-h-[90vh] overflow-y-auto rounded-none">
            <h3 className="font-montserrat text-xl font-light text-luxury-black tracking-wide">
              {editingProduct ? 'Editar Producto (Admin)' : 'Nuevo Producto'}
            </h3>
            
            <form onSubmit={handleSaveProduct} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Nombre</label>
                  <input
                    type="text"
                    required
                    value={pName}
                    onChange={(e) => setPName(e.target.value)}
                    className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                    placeholder="iPhone 15 Pro Max"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Categoría</label>
                  <select
                    required
                    value={pCategory}
                    onChange={(e) => setPCategory(e.target.value)}
                    className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                  >
                    <option value="">Selecciona Categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Precio (COP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={pPrice}
                    onChange={(e) => setPPrice(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej. 199900"
                    className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Precio para vendedor (COP)</label>
                  <input type="number" min="0" value={pVendorPrice} onChange={e => setPVendorPrice(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Opcional; se aplica descuento por defecto" className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Stock</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={pStock}
                    onChange={(e) => setPStock(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej. 10"
                    className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Resumen del Producto</label>
                <input
                  type="text"
                  required
                  value={pSummary}
                  onChange={(e) => setPSummary(e.target.value)}
                  className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                  placeholder="iPhone con pantalla OLED de 6.7 pulgadas..."
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Características (Una por línea)</label>
                <textarea
                  value={pFeatures}
                  onChange={(e) => setPFeatures(e.target.value)}
                  rows={4}
                  className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black focus:border-luxury-gold focus:outline-none"
                  placeholder="Chip A17 Pro&#10;Cámara de 48MP"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-1">Imágenes del Producto</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border border-dashed border-luxury-silver bg-luxury-off-white">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400 stroke-1" />
                    <div className="flex text-xs text-gray-500 font-light">
                      <label className="relative cursor-pointer font-medium text-luxury-gold hover:underline">
                        <span>Subir imágenes</span>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          onChange={(e) => setPImageFiles(e.target.files)}
                          className="sr-only"
                        />
                      </label>
                    </div>
                    {pImageFiles && (
                      <p className="text-xs text-luxury-gold font-normal mt-2">
                        {pImageFiles.length} archivos seleccionados
                      </p>
                    )}
                  </div>
                </div>
                <textarea value={pImageUrls} onChange={e => setPImageUrls(e.target.value)} rows={2} className="mt-3 w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm" placeholder="Pega URL de imagen (una por línea o separadas por coma)" />
                {pExistingImages.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto">{pExistingImages.map((url, index) => <div key={`${url}-${index}`} className="relative h-16 w-16 shrink-0"><img src={url} alt="" className="h-full w-full rounded object-cover" /><div className="absolute -bottom-1 left-0 right-0 flex justify-center gap-1"><button type="button" disabled={index === 0} onClick={() => setPExistingImages(items => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next; })} className="rounded bg-black/75 px-1 text-[10px] disabled:opacity-30">←</button><button type="button" disabled={index === pExistingImages.length - 1} onClick={() => setPExistingImages(items => { const next = [...items]; [next[index + 1], next[index]] = [next[index], next[index + 1]]; return next; })} className="rounded bg-black/75 px-1 text-[10px] disabled:opacity-30">→</button><button type="button" onClick={() => setPExistingImages(items => items.filter((_, itemIndex) => itemIndex !== index))} className="rounded bg-red-500/90 px-1 text-[10px]">×</button></div></div>)}</div>}
              </div>
              <fieldset className="rounded-xl border border-luxury-silver p-4"><legend className="px-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Colecciones comerciales</legend><div className="mt-2 flex flex-wrap gap-4">{([{ key: 'featured', label: 'Destacados' }, { key: 'offers', label: 'Ofertas para ti' }, { key: 'new', label: 'Novedades' }] as const).map(item => <label key={item.key} className="flex items-center gap-2 text-xs"><input type="checkbox" checked={pCollections[item.key]} onChange={e => setPCollections({ ...pCollections, [item.key]: e.target.checked })} />{item.label}</label>)}</div></fieldset>

              <div className="flex justify-end space-x-4 pt-4 border-t border-luxury-off-white">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-4 py-2 border border-luxury-silver text-xs font-medium uppercase tracking-widest text-luxury-black hover:bg-luxury-off-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingProduct}
                  className="px-4 py-2 border border-luxury-gold bg-luxury-black text-xs font-medium uppercase tracking-widest text-white hover:bg-white hover:text-luxury-black transition-colors disabled:opacity-50"
                >
                  {submittingProduct ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterAdminDashboard;
