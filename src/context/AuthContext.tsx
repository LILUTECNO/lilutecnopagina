import { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';
import apiClient from '../services/api';

// Para simplificar, el estado del usuario ahora puede ser un objeto genérico
// o simplemente un booleano. Usaremos un objeto para futura extensibilidad.
interface UserState {
  email: string;
  // ... otros datos del usuario que podría devolver el backend
}

interface AuthContextType {
  currentUser: UserState | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => {
  return useContext(AuthContext);
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [currentUser, setCurrentUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Al cargar la app, verificar si hay un token para mantener la sesión
    const token = localStorage.getItem('authToken');
    if (token) {
      // En una app real, aquí haríamos una llamada a un endpoint /api/auth/me
      // para obtener los datos del usuario y validar el token.
      // Para este ejemplo, si hay token, asumimos que el usuario está logueado.
      // El interceptor de axios se encargará de borrarlo si es inválido.
      setCurrentUser({ email: 'user@example.com' }); // Placeholder
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Llamada a la API del nuevo backend
    const response = await apiClient.post('/auth/login', {
      email,
      password,
    });

    const { token, user } = response.data; // Asumimos que el backend devuelve token y datos de usuario

    // Guardar el token
    localStorage.setItem('authToken', token);

    // Actualizar el estado del usuario
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('authToken');
    setCurrentUser(null);
    // La redirección se maneja en el componente que llama a logout
  }, []);

  const value = {
    currentUser,
    isAuthenticated: !!currentUser,
    loading,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
