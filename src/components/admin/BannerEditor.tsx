/* =================================================================
   BannerEditor — admin editor for homepage hero banners.
   Banner slice. Extracted (neutral, no behavior change) from
   MasterAdminDashboard.tsx.

   Scope (banner slice only):
     - state/handlers for the banner form (title, description, link,
       desktop+mobile image uploads, active-banners list).
     - persistence in Firestore collection `heroSlides`.

   Dependencies (re-hooked, NOT pulled from the parent component):
     - `db`, `storage`, firestore fns (re-imported)
     - `toast` from react-hot-toast (re-imported)
   The component does NOT receive prop `activeTab`; the monolith still
   decides WHEN to render it via `{activeTab === 'banners' && <BannerEditor />}`.

   TODO(tron-tests): when the project adopts a test framework (separate
   task), cover: normalizeBanner legacy->defaults (overlay + custom-link
   cta + imageClick false); normalizeBanner passthrough of new banners;
   validation (cta.enabled requires valid destination per linkType;
   imageClick.enabled same; desktop image required); slide renderer
   fallbacks (legacy banner renders as overlay; full mode hides text;
   cta/imageClick resolve href via existing route generators). Manual
   evidence for all of the above is attached to this feature's PR.
   ================================================================== */
import React, { useState } from 'react';
import {
  collection, getDocs, updateDoc, deleteDoc, addDoc, doc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebaseConfig';
import { toast } from 'react-hot-toast';
import { ChevronUp, ChevronDown, Edit, Trash } from 'lucide-react';

interface BannerRow {
  id: string;
  title: string;
  description?: string;
  ctaHref?: string;
  image?: string;
  mobileImage?: string;
  order?: number;
}

const BannerEditor: React.FC = () => {
  const [bannerTitle, setBannerTitle] = useState('');
  const [bannerDescription, setBannerDescription] = useState('');
  const [bannerLink, setBannerLink] = useState('#catalogo');
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [bannerMobileImage, setBannerMobileImage] = useState<File | null>(null);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const [savingBanner, setSavingBanner] = useState(false);
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [existingBannerImage, setExistingBannerImage] = useState('');
  const [existingBannerMobileImage, setExistingBannerMobileImage] = useState('');

  const fetchBanners = async () => {
    const snapshot = await getDocs(collection(db, 'heroSlides'));
    setBanners(
      snapshot.docs
        .map((item) => ({ id: item.id, ...item.data() }) as BannerRow)
        .sort((a, b) => (a.order || 0) - (b.order || 0)),
    );
  };

  // initial load (mirrors monolith's loadAllData -> fetchBanners)
  React.useEffect(() => {
    fetchBanners();
  }, []);

  const moveBanner = async (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= banners.length) return;
    const ordered = [...banners];
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    await Promise.all(
      ordered.map((item, position) => updateDoc(doc(db, 'heroSlides', item.id), { order: position })),
    );
    fetchBanners();
  };

  const handleCreateBanner = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingBanner(true);
    try {
      let image = existingBannerImage || '';
      let mobileImage = existingBannerMobileImage || '';
      let uploadWarnings = 0;

      if (bannerImage) {
        try {
          const upload = await uploadBytes(
            ref(storage, `heroSlides/${Date.now()}_${bannerImage.name}`),
            bannerImage,
          );
          image = await getDownloadURL(upload.ref);
        } catch (uploadError: any) {
          console.error('Storage upload error (desktop):', uploadError?.code || uploadError);
          uploadWarnings++;
          const code = String(uploadError?.code || '');
          if (code.includes('unauthorized') || code.includes('permission'))
            toast.error('Permiso de Storage denegado para banner de escritorio.');
          else if (code.includes('cors'))
            toast.error('CORS de Storage bloqueando el banner de escritorio.');
          else toast.error('No fue posible subir el banner de escritorio.');
        }
      }
      if (bannerMobileImage) {
        try {
          const upload = await uploadBytes(
            ref(storage, `heroSlides/mobile_${Date.now()}_${bannerMobileImage.name}`),
            bannerMobileImage,
          );
          mobileImage = await getDownloadURL(upload.ref);
        } catch (uploadError: any) {
          console.error('Storage upload error (mobile):', uploadError?.code || uploadError);
          uploadWarnings++;
          const code = String(uploadError?.code || '');
          if (code.includes('unauthorized') || code.includes('permission'))
            toast.error('Permiso de Storage denegado para banner móvil.');
          else if (code.includes('cors'))
            toast.error('CORS de Storage bloqueando el banner móvil.');
          else toast.error('No fue posible subir el banner móvil.');
        }
      }

      // Si en edición no se subió nada NUEVO y no había previo, abortamos para no guardar banner sin imagen.
      if (!image && !mobileImage) {
        toast.error('No se pudo guardar el banner: sin imagen de portada. Revisa Storage.');
        setSavingBanner(false);
        return;
      }

      const bannerData = {
        title: bannerTitle,
        description: bannerDescription,
        ctaLabel: 'Explorar catálogo',
        ctaHref: bannerLink || '#catalogo',
        image,
        mobileImage,
        active: true,
      };

      if (editingBannerId) {
        await updateDoc(doc(db, 'heroSlides', editingBannerId), bannerData);
        if (uploadWarnings > 0)
          toast('Banner actualizado, pero algunas imágenes fallaron al subir.', { icon: '⚠️' });
        else toast.success('Banner actualizado.');
        setEditingBannerId(null);
        setExistingBannerImage('');
        setExistingBannerMobileImage('');
      } else {
        await addDoc(collection(db, 'heroSlides'), {
          ...bannerData,
          order: Date.now(),
          createdAt: new Date().toISOString(),
        });
        if (uploadWarnings > 0)
          toast('Banner publicado, pero algunas imágenes fallaron al subir.', { icon: '⚠️' });
        else toast.success('Banner publicado en el carrusel.');
      }

      setBannerTitle('');
      setBannerDescription('');
      setBannerLink('#catalogo');
      setBannerImage(null);
      setBannerMobileImage(null);
      fetchBanners();
    } catch (error: any) {
      console.error(error);
      toast.error('No fue posible guardar el banner: ' + (error?.message || String(error)));
    } finally {
      setSavingBanner(false);
    }
  };

  return (
    <div className="max-w-3xl bg-white border border-luxury-silver p-6 shadow-luxury">
      <h3 className="font-montserrat text-lg font-light text-luxury-black">
        {editingBannerId ? 'Editar Banner Principal' : 'Nuevo banner principal'}
      </h3>
      <p className="mt-2 text-xs leading-relaxed text-gray-500">
        Al publicar, aparecerá automáticamente en el carrusel de inicio. La imagen se optimiza desde
        Storage y el botón puede llevar al catálogo o a una promoción.
      </p>
      <form onSubmit={handleCreateBanner} className="mt-6 space-y-4">
        <input
          required
          value={bannerTitle}
          onChange={(e) => setBannerTitle(e.target.value)}
          placeholder="Título de la promoción"
          className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
        />
        <textarea
          required
          value={bannerDescription}
          onChange={(e) => setBannerDescription(e.target.value)}
          placeholder="Descripción breve"
          rows={3}
          className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
        />
        <input
          value={bannerLink}
          onChange={(e) => setBannerLink(e.target.value)}
          placeholder="#catalogo o enlace de promoción"
          className="w-full rounded border border-luxury-silver bg-luxury-off-white px-3 py-2 text-sm font-light text-luxury-black"
        />

        {existingBannerImage && (
          <div className="text-xs text-gray-500 space-y-2">
            <p>Imagen Escritorio actual:</p>
            <img
              src={existingBannerImage}
              alt=""
              className="h-20 w-36 object-cover border border-luxury-silver"
            />
          </div>
        )}
        {existingBannerMobileImage && (
          <div className="text-xs text-gray-500 space-y-2">
            <p>Imagen Móvil actual:</p>
            <img
              src={existingBannerMobileImage}
              alt=""
              className="h-20 w-16 object-cover border border-luxury-silver"
            />
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-gray-500">
            Escritorio — recomendado 1920 × 700 px
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setBannerImage(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-xs"
            />
          </label>
          <label className="text-xs text-gray-500">
            Móvil — recomendado 750 × 900 px
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(e) => setBannerMobileImage(e.target.files?.[0] || null)}
              className="mt-2 block w-full text-xs"
            />
          </label>
        </div>

        <div className="flex gap-2">
          <button
            disabled={savingBanner}
            className="border border-luxury-gold bg-luxury-black px-5 py-2.5 text-xs font-medium uppercase tracking-widest text-white disabled:opacity-50"
          >
            {savingBanner ? 'Guardando...' : editingBannerId ? 'Actualizar banner' : 'Publicar banner'}
          </button>
          {editingBannerId && (
            <button
              type="button"
              onClick={() => {
                setEditingBannerId(null);
                setBannerTitle('');
                setBannerDescription('');
                setBannerLink('#catalogo');
                setExistingBannerImage('');
                setExistingBannerMobileImage('');
              }}
              className="border border-gray-300 px-5 py-2.5 text-xs uppercase tracking-widest text-gray-500 hover:bg-gray-100"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
      <div className="mt-8 border-t border-luxury-silver pt-5">
        <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-400">Banners activos</h4>
        <div className="mt-4 space-y-3">
          {banners.map((banner, index) => (
            <div key={banner.id} className="flex items-center gap-3 rounded-xl border border-luxury-silver p-3">
              <span className="text-xs text-orange-400">#{index + 1}</span>
              {banner.image && <img src={banner.image} alt="" className="h-12 w-20 rounded object-cover" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-luxury-black truncate">{banner.title}</p>
                {banner.description && <p className="text-xs text-gray-400 truncate">{banner.description}</p>}
              </div>
              <button
                onClick={() => moveBanner(index, -1)}
                disabled={index === 0}
                className="text-slate-400 disabled:opacity-30"
              >
                <ChevronUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveBanner(index, 1)}
                disabled={index === banners.length - 1}
                className="text-slate-400 disabled:opacity-30"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setEditingBannerId(banner.id);
                  setBannerTitle(banner.title);
                  setBannerDescription(banner.description || '');
                  setBannerLink(banner.ctaHref || '#catalogo');
                  setExistingBannerImage(banner.image || '');
                  setExistingBannerMobileImage(banner.mobileImage || '');
                }}
                className="text-orange-300 hover:text-orange-500 transition-colors"
                title="Editar Banner"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={async () => {
                  if (window.confirm('¿Eliminar este banner?')) {
                    await deleteDoc(doc(db, 'heroSlides', banner.id));
                    fetchBanners();
                    toast.success('Banner eliminado.');
                  }
                }}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <Trash className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BannerEditor;
