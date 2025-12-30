# 1. Dùng Node 20 (bản Slim cho nhẹ)
FROM node:20-slim

# 2. Cài thư viện hệ thống (Bắt buộc cho Prisma & Cloud SQL)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy file định nghĩa trước để tận dụng Cache
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 4. Cài đặt thư viện (Install toàn bộ để có tsx)
RUN npm install

# 5. Tạo Prisma Client
RUN npx prisma generate

# 6. Copy toàn bộ code
COPY . .

# 7. Build giao diện React (Sẽ tạo ra thư mục dist)
# Tăng bộ nhớ cho Node để tránh lỗi "Heap out of memory" khi build
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 8. Cấu hình biến môi trường
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# --- LỆNH KHỞI ĐỘNG CHIẾN LƯỢC ---
# Không dùng "npx tsx" nữa.
# Gọi trực tiếp file thực thi trong node_modules để đảm bảo 100% chạy được.
CMD ["node", "node_modules/tsx/dist/cli.mjs", "server.ts"]
