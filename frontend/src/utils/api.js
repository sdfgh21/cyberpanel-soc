import axios from 'axios';

const VITE_URL = import.meta.env.VITE_API_URL;
const API_BASE = (!VITE_URL || VITE_URL === '' || VITE_URL === 'undefined') ? '' : VITE_URL;

const api = axios.create({ baseURL: `${API_BASE}/api`, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    if ((status === 401 || status === 403) && !err.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('cp_token');
      localStorage.removeItem('cp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
