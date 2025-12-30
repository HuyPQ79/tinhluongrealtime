# Sử dụng Node 20
FROM node:20-slim

# Cài đặt thư viện hệ thống cần thiết (OpenSSL cho Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy toàn bộ source code
COPY . .

# 1. Cài đặt toàn bộ thư viện (bao gồm cả devDependencies để có tsx)
RUN npm install

# 2. Tạo Prisma Client (Generate code để server hiểu DB)
RUN npx prisma generate

# 3. Build giao diện React (Tạo folder dist)
RUN npm run build

# Thiết lập môi trường
ENV NODE_ENV=production
ENV PORT=8080

# Mở cổng
EXPOSE 8080

# --- LỆNH KHỞI ĐỘNG CẢI TIẾN ---
# Dùng trực tiếp binary của tsx để tránh lỗi npx
# Tăng giới hạn bộ nhớ cho Node.js lên 512MB (hoặc 1GB tùy cấu hình Cloud Run của bạn) để tránh bị Crash khi khởi động
CMD ["node", "--max-old-space-size=1024", "./node_modules/tsx/dist/cli.mjs", "server.ts"]
