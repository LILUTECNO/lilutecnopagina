import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Clock } from 'lucide-react';

const PendingVerification = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada.');
      navigate('/login');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-luxury-off-white px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 rounded-xl border border-luxury-silver bg-white p-8 text-center shadow-luxury">
        <div className="flex justify-center text-luxury-gold">
          <Clock className="h-16 w-16 stroke-1 animate-pulse" />
        </div>
        
        <div className="space-y-4">
          <h2 className="font-montserrat text-2xl font-light tracking-wide text-luxury-black">
            Cuenta en Verificación
          </h2>
          <p className="text-sm text-gray-500 font-light leading-relaxed">
            Hola, <span className="font-normal text-luxury-black">{currentUser?.name || 'Usuario'}</span>. Tu cuenta como <span className="font-normal uppercase tracking-wider text-luxury-gold">{currentUser?.role}</span> está bajo revisión.
          </p>
          <p className="text-xs text-gray-400 font-light">
            Nuestro equipo verificará tus datos en las próximas horas para activar tu acceso premium. Recibirás un correo cuando esté lista.
          </p>
        </div>

        <div className="pt-6">
          <button
            onClick={handleLogout}
            className="w-full border border-luxury-gold bg-transparent px-4 py-2.5 text-xs font-medium uppercase tracking-widest text-luxury-black transition-all duration-300 hover:bg-luxury-black hover:text-white focus:outline-none"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingVerification;
