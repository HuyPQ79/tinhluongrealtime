# --- Stage 1: Build ---
FROM node:20-slim AS builder

# Cài đặt OpenSSL
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

# 1. Copy file cấu hình trước
COPY package*.json ./
# 2. Copy thư mục prisma để generate client
COPY prisma ./prisma/

# 3. QUAN TRỌNG: Copy toàn bộ code vào TRƯỚC khi cài thư viện
# (Nhờ file .dockerignore, node_modules của máy bạn sẽ không bị copy vào đây)
COPY . .

# 4. Cài đặt thư viện (Sẽ cài đúng bản cho Linux)
RUN npm install

# 5. Tạo Prisma Client & Build React
RUN npx prisma generate
RUN npm run build

# --- Stage 2: Runtime ---
FROM node:20-slim AS runner

# Cài OpenSSL cho môi trường chạy
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy tài nguyên từ builder sang runner
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/server.cjs ./
COPY --from=builder /app/prisma ./prisma
# Copy giao diện đã build
COPY --from=builder /app/dist ./dist

# Mở cổng
EXPOSE 8080

# Chạy server
CMD ["node", "server.cjs"]
