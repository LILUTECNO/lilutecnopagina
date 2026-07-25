import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { LogIn, UserRound } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, currentUser, signInWithProvider } = useAuth();

  // Obtener mensaje de redirección de estado (como cuenta rechazada o error de protección)
  const stateError = (location.state as any)?.error;

  useEffect(() => {
    if (stateError) {
      toast.error(stateError);
    }
  }, [stateError]);

  // Manejar redirecciones basadas en el rol cuando el usuario ya esté autenticado
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role !== 'admin' && currentUser.status === 'pending') {
        navigate('/pending-verification', { replace: true });
        return;
      }
      
      switch (currentUser.role) {
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'proveedor':
          navigate('/proveedor', { replace: true });
          break;
        case 'dropshipper':
          navigate('/dropshipper', { replace: true });
          break;
        case 'cliente':
        default:
          navigate('/', { replace: true });
          break;
      }
    }
  }, [currentUser, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Sesión iniciada correctamente.');
    } catch (err: any) {
      console.error(err);
      toast.error('Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    try { await signInWithProvider(provider); toast.success('Sesión iniciada correctamente.'); }
    catch (error: any) { console.error(error); toast.error(error.code === 'auth/account-exists-with-different-credential' ? 'Esta cuenta ya usa otro método de acceso.' : `No fue posible ingresar con ${provider === 'google' ? 'Google' : 'Facebook'}.`); }
  };

  return (
    <div className="auth-page flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 sm:py-12">
      <div className="auth-card w-full max-w-md space-y-7 rounded-2xl p-6 sm:p-8">
        <div className="text-center">
          <Link to="/" className="font-montserrat text-2xl font-black tracking-[0.2em] text-white sm:text-3xl">
            LILUTECNO
          </Link>
          <p className="mt-4 text-[9px] font-semibold uppercase tracking-[0.32em] text-orange-400">Mi cuenta</p>
          <h2 className="mt-2 font-montserrat text-2xl font-light tracking-wide text-white">
            Iniciar Sesión
          </h2>
          <p className="mt-3 text-sm font-light leading-6 text-slate-400">
            Introduce tus credenciales para acceder a tu cuenta premium.
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          <div className="space-y-4 rounded-md">
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
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="auth-label mb-0">
                  Contraseña
                </label>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </div>
        </form>

        <div className="relative py-1 text-center"><span className="bg-[#120a1d] px-3 text-[10px] uppercase tracking-widest text-slate-500">o continúa con</span><div className="absolute inset-x-0 top-1/2 -z-10 border-t border-white/10" /></div>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => handleSocialLogin('google')} className="auth-social-button"><LogIn className="h-4 w-4" />Google</button>
          <button type="button" onClick={() => handleSocialLogin('facebook')} className="auth-social-button"><UserRound className="h-4 w-4" />Facebook</button>
        </div>

        <div className="text-center mt-4">
          <p className="text-xs font-light text-slate-400">
            ¿No tienes una cuenta?{' '}
            <Link to="/register" className="font-medium text-orange-400 hover:text-white hover:underline">
              Regístrate gratis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
