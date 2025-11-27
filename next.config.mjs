import path from 'path';
import { fileURLToPath } from 'url';

// These are needed to replicate __dirname functionality in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export default nextConfig
