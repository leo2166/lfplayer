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
  disable: false, // PWA habilitado también en desarrollo para testear Wake Lock / Media Session en móvil
  // disable: process.env.DISABLE_PWA === 'true', // Alternativa: variable de entorno para desactivar
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Excluir carpetas no-código del file watcher para reducir uso de RAM
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/scripts/**',
          '**/audio_normalizer/**',
          '**/Salsa Para Bailar V1/**',
          '**/*.mp3',
          '**/*.wav',
          '**/*.flac',
          '**/*.ogg',
        ],
        poll: false,
        aggregateTimeout: 500,
      };
    }
    return config;
  },
  turbopack: {
    root: __dirname,
  },
}

export default pwaConfig(nextConfig); // Envolver la configuración existente con pwaConfig
