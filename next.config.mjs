import path from 'path';
import { fileURLToPath } from 'url';
import withPWA from 'next-pwa'; // Importar next-pwa

// These are needed to replicate __dirname functionality in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Deshabilitar PWA en desarrollo para Fast Refresh
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Explicitly set the workspace root to prevent Next.js from inferring it incorrectly
  // This helps with file watching and module resolution in monorepos or complex setups.
  turbopack: {
    root: __dirname,
  },
}

export default pwaConfig(nextConfig); // Envolver la configuración existente con pwaConfig
