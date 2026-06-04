import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// ============================================
// API CONFIGURATION
// ============================================
const API_BASE_URL = import.meta.env.VITE_API_URL ?? '';
const DEBUG_API = import.meta.env.DEV; // Solo en desarrollo

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
    
    if (DEBUG_API) {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params,
      });
    }
    
    return config;
  },
  (error: AxiosError) => {
    if (DEBUG_API) {
      console.error('[API Request Error]', error);
    }
    return Promise.reject(error);
  }
);

// ============================================
// RESPONSE INTERCEPTOR
// ============================================
axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (DEBUG_API) {
      console.log(`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    return response;
  },
  (error: AxiosError) => {
    if (DEBUG_API) {
      console.error(`[API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }
    
    if (error.response?.status === 401) {
      // Dispatch event so AuthContext handles logout + navigation via React Router
      // instead of doing a hard browser redirect that clears all React state.
      window.dispatchEvent(new Event('auth:unauthorized'));
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
