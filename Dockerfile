# --- Stage 1: Build & Generate Prisma ---
FROM node:20-slim AS builder

# Cài đặt OpenSSL (Cần thiết cho Prisma hoạt động)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

# Copy file cấu hình trước để cài thư viện (Tận dụng Cache giúp build nhanh hơn)
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt thư viện
RUN npm install

# Copy TOÀN BỘ code từ máy vào Docker
COPY . .

# Tạo Prisma Client (Lúc này file schema.prisma đã được copy vào nên sẽ không bị lỗi nữa)
RUN npx prisma generate

# --- Stage 2: Runtime (Chạy ứng dụng nhẹ hơn) ---
FROM node:20-slim AS runner

# Cài OpenSSL cho môi trường chạy
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Thiết lập biến môi trường cơ bản
ENV NODE_ENV=production
ENV PORT=8080

# COPY từ builder sang runner
# 1. Copy thư viện đã cài
COPY --from=builder /app/node_modules ./node_modules
# 2. Copy toàn bộ code ứng dụng (An toàn hơn là copy từng file)
COPY --from=builder /app .

# Mở cổng 8080
EXPOSE 8080

# Lệnh chạy server
CMD ["node", "server.cjs"]
