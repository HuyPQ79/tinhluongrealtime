# Stage 1: Build & Generate Prisma
FROM node:20-slim AS builder

# Cài đặt OpenSSL cho Prisma
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build ứng dụng (Nếu bạn có bước build TS, nếu chạy trực tiếp qua tsx thì bỏ qua)
# RUN npm run build 

# Stage 2: Runtime
FROM node:20-slim AS runner

# Cài đặt OpenSSL trong môi trường chạy
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy các file cần thiết từ builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/server.ts ./
COPY --from=builder /app/types.ts ./

# Thiết lập biến môi trường mặc định
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run lắng nghe cổng 8080
EXPOSE 8080

# Chạy ứng dụng bằng tsx (phù hợp với cấu trúc file hiện tại của bạn)
CMD ["npx", "tsx", "server.ts"]
