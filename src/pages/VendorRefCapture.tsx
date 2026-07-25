import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useVendorRef } from '../context/VendorRefContext';
import LoadingScreen from '../components/LoadingScreen';
import { toast } from 'react-hot-toast';

/**
 * Ruta /v/:slug — link personal del vendedor.
 * Valida que exista un dropshipper aprobado con storeName === slug,
 * guarda la referencia en localStorage (VendorRefContext) y redirige al home.
 */
const VendorRefCapture: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { setVendorRef } = useVendorRef();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!slug) {
        navigate('/', { replace: true });
        return;
      }
      try {
        const q = query(
          collection(db, 'users'),
          where('role', '==', 'dropshipper'),
          where('status', '==', 'approved'),
          where('storeName', '==', slug),
          limit(1)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        if (snap.empty) {
          toast.error(`El vendedor "${slug}" no existe o no está activo.`);
          setVendorRef(null, null);
          navigate('/', { replace: true });
          return;
        }
        const data = snap.docs[0].data();
        setVendorRef(slug, String(data.name || data.storeName || slug));
        toast.success(`Comprando con ${data.name || data.storeName}`);
        navigate('/', { replace: true });
      } catch (err) {
        console.error(err);
        navigate('/', { replace: true });
      }
    })();
    return () => { cancelled = true; };
  }, [slug, navigate, setVendorRef]);

  return <LoadingScreen />;
};

export default VendorRefCapture;
