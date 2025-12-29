# --- Stage 1: Build ---
FROM node:20-slim AS builder

# Cài đặt OpenSSL (Cần thiết cho Prisma và hệ thống)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

# 1. Copy toàn bộ code vào trước
COPY . .

# 2. BƯỚC QUAN TRỌNG NHẤT: Xóa sạch node_modules (nếu lỡ copy từ máy tính lên)
# Để đảm bảo cài đặt lại 100% thư viện chuẩn Linux
RUN rm -rf node_modules dist

# 3. Cài đặt thư viện mới
RUN npm install

# 4. Tạo Prisma Client (Generate các file kết nối DB)
RUN npx prisma generate

# 5. Đóng gói giao diện React (Tạo thư mục dist)
RUN npm run build

# --- Stage 2: Runtime (Chạy ứng dụng) ---
FROM node:20-slim AS runner

# Cài thư viện hệ thống cần thiết
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=8080

# Copy các thành phần đã "nấu chín" từ builder sang
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.cjs ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

# Mở cổng 8080
EXPOSE 8080

# Chạy server bằng lệnh node thuần (ổn định nhất)
CMD ["node", "server.cjs"]
