import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Chỉ định thư mục gốc là thư mục hiện tại
    root: '.',
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // Quan trọng: Báo cho Vite biết file nhập vào là index.html ở rootimport { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    // Quan trọng: Chỉ định root là thư mục hiện tại (.)
    root: '.', 
    publicDir: 'public',
    plugins: [react()],
    resolve: {
      alias: {
        // Fix lỗi __dirname: Dùng process.cwd() thay thế
        '@': path.resolve(process.cwd(), '.'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        // Chỉ định rõ đầu vào là index.html nằm ngay ngoài root
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
      rollupOptions: {
        input: 'index.html',
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
