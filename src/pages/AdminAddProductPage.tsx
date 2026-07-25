import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { collection, addDoc, updateDoc, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Upload } from 'lucide-react';
import logo from '../assets/images/lilutecnologo.png';

interface CategoryDoc {
  id: string;
  name: string;
}

const AdminAddProductPage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [oldPrice, setOldPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [features, setFeatures] = useState('');
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  
  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'categories'));
        const items: CategoryDoc[] = [];
        snapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as CategoryDoc);
        });
        setCategories(items);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCategories();
  }, []);

  const handleImageUploads = async (productId: string): Promise<string[]> => {
    if (!imageFiles || imageFiles.length === 0) return [];
    const urls: string[] = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const storageRef = ref(storage, `products/${productId}/${Date.now()}_${file.name}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(uploadResult.ref);
      urls.push(url);
    }
    return urls;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !category || Number(price) <= 0) {
      toast.error('Completa los campos requeridos.');
      return;
    }

    setLoading(true);
    try {
      const featuresArray = features.split('\n').filter(f => f.trim() !== '');

      const docRef = await addDoc(collection(db, 'products'), {
        name,
        price: Number(price),
        old_price: oldPrice ? Number(oldPrice) : null,
        category,
        stock: Number(stock),
        summary,
        features: featuresArray,
        images: [],
        providerId: 'admin_maestro',
        createdAt: new Date().toISOString()
      });

      if (imageFiles && imageFiles.length > 0) {
        const imageUrls = await handleImageUploads(docRef.id);
        await updateDoc(docRef, { images: imageUrls });
      }

      toast.success('Producto creado exitosamente.');
      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast.error('Error al guardar el producto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-shell min-h-screen font-sans py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto glass-panel p-8 sm:p-10 relative space-y-7 rounded-2xl">
        <div className="flex items-center space-x-4 mb-2">
          <Link to="/admin" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-105">
            <ArrowLeft className="h-5 w-5 stroke-1" />
          </Link>
          <img src={logo} alt="Lilu Tecno" className="h-9 w-9 rounded-full object-contain ring-1 ring-white/10" />
          <h1 className="font-montserrat text-xl font-light text-white tracking-wide">
            Añadir Nuevo Producto (Admin)
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7">
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
              >
                <option value="">Selecciona Categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Precio sugerido (COP)</label>
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
              <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Precio Anterior (COP - Opcional)</label>
              <input
                type="number"
                min="0"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Stock</label>
              <input
                type="number"
                required
                min="0"
                value={stock}
                onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Resumen del Producto</label>
            <input
              type="text"
              required
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
              placeholder="Descripción corta para catálogos..."
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Características (Una por línea)</label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white placeholder-slate-500 focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
              placeholder="Chip A17 Pro&#10;Cámara de 48MP"
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
                {imageFiles && (
                  <p className="text-xs text-orange-400 font-medium mt-2">
                    {imageFiles.length} archivos seleccionados
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-5 border-t border-white/10">
            <button
              type="button"
              onClick={() => navigate('/admin')}
              className="px-5 py-2.5 rounded-xl border border-white/12 text-[10px] font-semibold uppercase tracking-[0.18em] text-white hover:bg-white/10 transition-colors duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 btn-glass-primary text-[10px] font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminAddProductPage;
