import path from 'node:path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this repository at /ChessHorizon/; local and Vercel
  // builds remain rooted at /. The workflow sets GITHUB_ACTIONS automatically.
  base: process.env.GITHUB_ACTIONS ? '/ChessHorizon/' : '/',
  plugins: [react()],
  assetsInclude: ['**/*.glb'],
  optimizeDeps: {
    include: ['framer-motion', 'three', '@react-three/fiber', '@react-three/drei'],
  },
  server: {
    port: 3000,
  },
  preview: {
    allowedHosts: ['.manus.computer'],
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
});
