import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    root: '.', 
    publicDir: 'public',
    plugins: [react()],
    resolve: {
      alias: {
        // SỬA LỖI Ở ĐÂY: Dùng process.cwd() thay vì __dirname
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(process.cwd(), 'index.html'),
      }
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    define: {
      'process.env': env
    }
  };
});
