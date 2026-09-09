import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev: goi /api/... -> tu dong chuyen sang backend cong 3000 (khong dinh CORS)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/health': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
