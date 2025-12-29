# --- Stage 1: Build Frontend & Backend Deps ---
FROM node:20-slim AS builder

# Cài đặt OpenSSL
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

# Copy file cấu hình
COPY package*.json ./
COPY prisma ./prisma/

# Cài đặt toàn bộ thư viện (bao gồm cả Vite để build)
RUN npm install

# Copy toàn bộ code
COPY . .

# 1. Tạo Prisma Client
RUN npx prisma generate

# 2. QUAN TRỌNG: Chạy lệnh build giao diện (Tạo ra thư mục dist)
RUN npm run build

# --- Stage 2: Runtime ---
FROM node:20-slim AS runner

RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy các thư viện cần thiết
COPY --from=builder /app/node_modules ./node_modules
# Copy Prisma Client đã tạo
COPY --from=builder /app/prisma ./prisma
# Copy file chạy server
COPY --from=builder /app/server.cjs ./
COPY --from=builder /app/package.json ./

# QUAN TRỌNG: Copy thư mục 'dist' (Giao diện đã build) sang đây
COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["node", "server.cjs"]
