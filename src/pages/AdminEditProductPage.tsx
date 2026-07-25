import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebaseConfig';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Upload, Trash } from 'lucide-react';
import logo from '../assets/images/lilutecnologo.png';

interface CategoryDoc {
  id: string;
  name: string;
}

const AdminEditProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [oldPrice, setOldPrice] = useState<number | ''>('');
  const [category, setCategory] = useState('');
  const [stock, setStock] = useState<number | ''>('');
  const [summary, setSummary] = useState('');
  const [features, setFeatures] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);

  const [categories, setCategories] = useState<CategoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (!id) return;
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'products', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setName(data.name || '');
          setPrice(data.price || 0);
          setOldPrice(data.old_price || '');
          setCategory(data.category || '');
          setStock(data.stock || 0);
          setSummary(data.summary || '');
          setFeatures(data.features ? data.features.join('\n') : '');
          setImages(data.images || []);
        } else {
          toast.error('Producto no encontrado.');
          navigate('/admin');
        }
      } catch (err) {
        console.error(err);
        toast.error('Error al cargar datos del producto.');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, navigate]);

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

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !name || !category || Number(price) <= 0) {
      toast.error('Completa los campos requeridos.');
      return;
    }

    setSaving(true);
    try {
      const featuresArray = features.split('\n').filter(f => f.trim() !== '');
      let updatedImages = [...images];

      if (imageFiles && imageFiles.length > 0) {
        const newUrls = await handleImageUploads(id);
        updatedImages = [...updatedImages, ...newUrls];
      }

      await updateDoc(doc(db, 'products', id), {
        name,
        price: Number(price),
        old_price: oldPrice ? Number(oldPrice) : null,
        category,
        stock: Number(stock),
        summary,
        features: featuresArray,
        images: updatedImages
      });

      toast.success('Producto actualizado exitosamente.');
      navigate('/admin');
    } catch (err) {
      console.error(err);
      toast.error('Error al actualizar el producto.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="admin-shell min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-orange-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="admin-shell min-h-screen font-sans py-12 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto glass-panel p-8 sm:p-10 relative space-y-7 rounded-2xl">
        <div className="flex items-center space-x-4 mb-2">
          <Link to="/admin" className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-all duration-300 hover:scale-105">
            <ArrowLeft className="h-5 w-5 stroke-1" />
          </Link>
          <img src={logo} alt="Lilu Tecno" className="h-9 w-9 rounded-full object-contain ring-1 ring-white/10" />
          <h1 className="font-montserrat text-xl font-light text-white tracking-wide">
            Editar Producto (Admin)
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
                className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
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
                className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Precio Anterior (COP - Opcional)</label>
              <input
                type="number"
                min="0"
                value={oldPrice}
                onChange={(e) => setOldPrice(e.target.value ? Number(e.target.value) : '')}
                className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
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
                className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
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
              className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Características (Una por línea)</label>
            <textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-white/12 bg-white/[.05] px-3.5 py-2.5 text-sm font-light text-white focus:border-orange-400/60 focus:outline-none transition-colors duration-200"
            />
          </div>

          {/* Current Images List */}
          {images.length > 0 && (
            <div>
              <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-3">Imágenes Existentes</label>
              <div className="grid grid-cols-4 gap-3">
                {images.map((url, idx) => (
                  <div key={idx} className="relative aspect-square border border-white/12 bg-white/[.04] rounded-xl overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute top-1.5 right-1.5 bg-red-500/80 backdrop-blur-md text-white p-1.5 rounded-full hover:bg-red-500 transition-all duration-300 hover:scale-110"
                      title="Eliminar Imagen"
                    >
                      <Trash className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-[9px] uppercase tracking-[0.22em] text-slate-400 font-semibold mb-2">Agregar Nuevas Imágenes</label>
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
              disabled={saving}
              className="px-5 py-2.5 btn-glass-primary text-[10px] font-semibold uppercase tracking-[0.18em] disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminEditProductPage;
