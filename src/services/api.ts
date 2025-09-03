import axios from 'axios';

// Crear una instancia de axios con una configuración base
const apiClient = axios.create({
  // Asumimos que el API Gateway estará disponible en esta ruta.
  // En producción, esto debería ser una variable de entorno.
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de peticiones:
// Este código se ejecuta ANTES de que cada petición sea enviada.
// Su trabajo es buscar el token JWT en el localStorage y añadirlo
// a la cabecera 'Authorization' si existe.
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken'); // Asumimos que el token se guarda aquí
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuestas (opcional, pero buena práctica):
// Este código se ejecuta cuando se recibe una respuesta.
// Es útil para manejar errores globales (ej. si el token ha expirado).
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Si recibimos un error 401 (No autorizado),
      // podría significar que el token ha expirado.
      // Aquí podríamos limpiar el localStorage y redirigir al login.
      localStorage.removeItem('authToken');
      // No podemos usar `useNavigate` aquí, pero podemos forzar una recarga en la página de login.
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
