/**
 * Canonical Axios client for the BusinessCloud Payments backend (.NET)
 * Base URL: https://localhost:7147 (override with VITE_API_URL env variable)
 *
 * Re-exports the configured instance from axiosClient so the rest of the
 * feature modules can import from a single, stable path:
 *   import apiClient from '@/shared/api/apiClient'
 */
export { default, extractErrorMessage } from './axiosClient';
