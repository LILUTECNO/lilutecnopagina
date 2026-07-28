import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, UserState } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { LogIn, UserRound } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, storage } from '../firebaseConfig';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserState['role']>('cliente');
  const [business, setBusiness] = useState({ storeName: '', taxId: '', phone: '', address: '' });
  const [logo, setLogo] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { register, signInWithProvider } = useAuth();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      toast.error('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      await register(email, password, role, name, role === 'cliente' ? {} : business);
      if (logo && auth.currentUser) {
        const upload = await uploadBytes(ref(storage, `providerLogos/${auth.currentUser.uid}/${Date.now()}_${logo.name}`), logo);
        await setDoc(doc(db, 'users', auth.currentUser.uid), { logoUrl: await getDownloadURL(upload.ref) }, { merge: true });
      }
      toast.success('Cuenta creada exitosamente.');
      
      if (role === 'cliente') {
        navigate('/'); // Cliente aprobado directo, va al home
      } else {
        navigate('/pending-verification'); // Proveedor/dropshipper va a espera
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error al crear la cuenta. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialRegister = async (provider: 'google' | 'facebook') => {
    try { await signInWithProvider(provider); toast.success('Tu cuenta de cliente está lista.'); navigate('/'); }
    catch (error: any) { console.error(error); toast.error(`No fue posible continuar con ${provider === 'google' ? 'Google' : 'Facebook'}.`); }
  };

  return (
    <div className="auth-page flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="auth-card w-full max-w-md space-y-7 rounded-2xl p-6 sm:p-8">
        <div className="text-center">
          <Link to="/" className="wordmark font-montserrat text-2xl font-black tracking-[0.2em] text-white sm:text-3xl">
            LILUTECNO
          </Link>
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.32em] text-orange-400">Mi cuenta</p>
          <h2 className="mt-2 font-montserrat text-2xl font-light tracking-wide text-white">
            Crear Nueva Cuenta
          </h2>
          <p className="mt-3 text-sm font-light leading-6 text-slate-400">
            Regístrate para obtener acceso premium y herramientas exclusivas.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          <div className="space-y-4 rounded-md">
            <div>
              <label htmlFor="role" className="auth-label">Tipo de Cuenta (Perfil)</label>
              <select id="role" name="role" value={role} onChange={(e) => setRole(e.target.value as UserState['role'])} className="auth-input auth-select"><option value="cliente">Cliente</option><option value="proveedor">Proveedor</option><option value="dropshipper">Vendedor</option></select>
            </div>
            <div>
              <label htmlFor="name" className="auth-label">
                Nombre Completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="auth-input"
                placeholder="Juan Pérez"
              />
            </div>
            
            <div>
              <label htmlFor="email-address" className="auth-label">
                Correo Electrónico
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="auth-input"
                placeholder="juan@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="auth-label">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
                placeholder="••••••••"
              />
            </div>

            {role !== 'cliente' && <>
              <div><label className="auth-label">Nombre de la tienda</label><input required value={business.storeName} onChange={e => setBusiness({ ...business, storeName: e.target.value })} className="auth-input" placeholder="Mi tienda" /></div>
              <div><label className="auth-label">{role === 'proveedor' ? 'Cédula o NIT' : 'Identificación fiscal (NIT) o cédula'}</label><input required value={business.taxId} onChange={e => setBusiness({ ...business, taxId: e.target.value })} className="auth-input" placeholder="Número de identificación" /></div>
              <div><label className="auth-label">Dirección del local o bodega</label><input required value={business.address} onChange={e => setBusiness({ ...business, address: e.target.value })} className="auth-input" placeholder="Dirección física" /></div>
              <div><label className="auth-label">Teléfono de contacto</label><input required type="tel" value={business.phone} onChange={e => setBusiness({ ...business, phone: e.target.value })} className="auth-input" placeholder="300 000 0000" /></div>
              {role === 'proveedor' && <div><label className="auth-label">Logo de la tienda</label><input required type="file" accept="image/png,image/jpeg,image/webp" onChange={e => setLogo(e.target.files?.[0] || null)} className="auth-input file:mr-3 file:rounded-md file:border-0 file:bg-orange-400/15 file:px-3 file:py-1 file:text-xs file:text-orange-300" /></div>}
            </>}

            <div>
              <label htmlFor="confirm-password" className="auth-label">
                Confirmar Contraseña
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="btn-glass-primary flex w-full justify-center rounded-xl px-4 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
            </button>
          </div>
        </form>

        <div className="relative py-1 text-center"><span className="bg-[#120a1d] px-3 text-[10px] uppercase tracking-widest text-slate-500">o regístrate con</span><div className="absolute inset-x-0 top-1/2 -z-10 border-t border-white/10" /></div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => handleSocialRegister('google')} className="auth-social-button"><LogIn className="h-4 w-4" />Google</button>
          <button type="button" onClick={() => handleSocialRegister('facebook')} className="auth-social-button"><UserRound className="h-4 w-4" />Facebook</button>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs font-light text-slate-400">
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-medium text-orange-400 hover:text-white hover:underline">
              Inicia Sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
