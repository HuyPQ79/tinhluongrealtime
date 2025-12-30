import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load biến môi trường
  const env = loadEnv(mode, process.cwd(), '');

  return {
    // 1. Quan trọng: Chỉ định root là thư mục hiện tại (.)
    // Vì index.html của bạn nằm ngay ngoài cùng
    root: '.', 
    
    // Thư mục chứa tài nguyên tĩnh (favicon, robots.txt...)
    publicDir: 'public',

    plugins: [react()],

    resolve: {
      alias: {
        // 2. Fix lỗi "__dirname is not defined":
        // Trong "type": "module", ta phải dùng process.cwd() để lấy đường dẫn gốc
        '@': path.resolve(process.cwd(), '.'),
      },
    },

    build: {
      outDir: 'dist',
      emptyOutDir: true,
      rollupOptions: {
        // 3. Chỉ định rõ đầu vào là file index.html (dùng đường dẫn tuyệt đối cho chắc ăn)
        // Điều này giúp Docker không bị lạc đường khi build
        input: path.resolve(process.cwd(), 'index.html'),
      }
    },

    server: {
      port: 3000,
      host: '0.0.0.0',
    },

    // 4. Expose biến môi trường cho code React dùng (nếu cần)
    define: {
      'process.env': env
    }
  };
});
