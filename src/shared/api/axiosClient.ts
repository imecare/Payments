import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ============================================
// API CONFIGURATION
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL || '/';

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ============================================
// REQUEST INTERCEPTOR
// ============================================
axiosClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default axiosClient;

// ============================================
// ERROR HELPERS
// ============================================
export const extractErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 403) {
      return 'No tienes permisos para realizar esta acción.';
    }
    if (status === 401) {
      return 'Tu sesión expiró o no tienes acceso. Inicia sesión nuevamente.';
    }
    return (
      error.response?.data?.message ||
      error.response?.data?.title ||
      error.message ||
      'Error desconocido'
    );
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Error desconocido';
};
