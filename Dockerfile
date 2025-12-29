# Stage 1: Build & Generate Prisma
FROM node:20-slim AS builder

# Cài đặt OpenSSL và ca-certificates (QUAN TRỌNG: ca-certificates giúp tải Prisma Engine)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

# Copy package files trước để tận dụng Docker cache
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client (Lúc này đã có binaryTargets và thư viện hệ thống đầy đủ)
RUN npx prisma generate

# Stage 2: Runtime
FROM node:20-slim AS runner

# Cài đặt OpenSSL trong môi trường chạy
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=8080

# Copy node_modules và các file build từ builder
# Lưu ý: Copy cả thư mục prisma đã generate client
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./
# Nếu bạn có file types.ts hoặc các file source khác cần chạy
COPY --from=builder /app/types.ts ./ 

EXPOSE 8080

# Chạy ứng dụng
CMD ["npx", "tsx", "server.ts"]
