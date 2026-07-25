import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth, UserState } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserState['role'][];
}

const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { currentUser, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-luxury-off-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-luxury-gold border-t-transparent"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  // Si requiere verificación y está pendiente, y no es admin
  if (currentUser.role !== 'admin' && currentUser.status === 'pending') {
    return <Navigate to="/pending-verification" replace />;
  }

  if (currentUser.status === 'rejected') {
    // Si está rechazado, se le echa de la sesión (o redirige)
    return <Navigate to="/login" state={{ error: 'Tu cuenta ha sido rechazada por el administrador.' }} replace />;
  }

  // Validar si el rol actual está dentro de los roles permitidos para esta ruta
  if (allowedRoles && !allowedRoles.includes(currentUser.role)) {
    // Redirigir a su panel correspondiente
    if (currentUser.role === 'admin') return <Navigate to="/admin" replace />;
    if (currentUser.role === 'proveedor') return <Navigate to="/proveedor" replace />;
    if (currentUser.role === 'dropshipper') return <Navigate to="/dropshipper" replace />;
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
