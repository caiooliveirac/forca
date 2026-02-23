import axios from 'axios';

const api = axios.create({
  // Dev: VITE_API_URL=http://localhost:3001 (via .env.local)
  // Prod: VITE_API_URL=/forca (set at build time, nginx resolves /forca/api/ → backend)
  baseURL: import.meta.env.VITE_API_URL || '/forca',
});

// Interceptor: injeta token em toda request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('galgenspiel-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: se 401, limpa token (sessão expirou)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('galgenspiel-token');
      window.dispatchEvent(new Event('auth-expired'));
    }
    return Promise.reject(error);
  },
);

export { api };
