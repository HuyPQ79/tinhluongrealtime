# 1. Sử dụng Node 20 Slim (Nhẹ, ổn định)
FROM node:20-slim

# 2. Cài đặt thư viện hệ thống (Bắt buộc cho Prisma & Cloud SQL connection)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy file định nghĩa trước để tận dụng Cache của Docker
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 4. Cài đặt toàn bộ thư viện (bao gồm cả devDependencies để có tsx và vite)
RUN npm install

# 5. Tạo Prisma Client
RUN npx prisma generate

# 6. Copy toàn bộ mã nguồn
COPY . .

# 7. BUILD GIAO DIỆN REACT
# Tăng giới hạn RAM lên 4GB cho Node để tránh lỗi "Heap out of memory" khi build trên Cloud
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 8. Thiết lập môi trường Production
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 9. LỆNH KHỞI ĐỘNG (CHIẾN LƯỢC MỚI)
# Gọi trực tiếp file thực thi của tsx để chạy server.ts
# Cách này bỏ qua các lỗi liên quan đến "npx" hoặc script trong package.json
CMD ["node", "node_modules/tsx/dist/cli.mjs", "server.ts"]
