import axios from 'axios';

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL}`,
});

// Interceptor de Solicitudes (Request)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    const storedBusiness = localStorage.getItem('selectedBusiness');
    if (storedBusiness) {
      try {
        const parsed = JSON.parse(storedBusiness);
        // Si ya lo seteamos explícitamente en el llamado (como en la revalidación), no sobreescribir
        if (!config.headers['X-Business-Id']) {
          config.headers['X-Business-Id'] = parsed.id;
        }
      } catch (e) {
        console.error('Error parseando selectedBusiness en interceptor');
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de Respuestas (Response)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        // Token inválido o expirado
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('selectedBusiness');
        window.location.href = '/';
      } else if (error.response.status === 403) {
        // Acceso denegado al recurso/negocio
        // Evitamos redirigir si ya estamos en /businesses o en root, para evitar loops
        if (window.location.pathname.startsWith('/admin')) {
          localStorage.removeItem('selectedBusiness');
          window.location.href = '/businesses';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
