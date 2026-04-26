/// <reference types="vite/client" />

// Extiende la interfaz ImportMeta para Vite
interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  // otras variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}