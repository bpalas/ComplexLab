import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/ComplexLab/',
  server: {
    // El lanzador de previews asigna el puerto vía env PORT
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
