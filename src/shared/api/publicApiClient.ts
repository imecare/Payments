import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:7147';

/**
 * Public API client without auth redirect interceptors.
 * Used for anonymous customer self-service pages.
 */
const publicApiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

export default publicApiClient;
