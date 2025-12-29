# Sử dụng Node 20
FROM node:20-slim

# Cài OpenSSL (cần cho Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates

WORKDIR /app

# Copy toàn bộ code vào
COPY . .

# 1. Cài đặt thư viện
RUN npm install

# 2. Tạo Prisma Client
RUN npx prisma generate

# 3. QUAN TRỌNG: BUILD GIAO DIỆN REACT
# Lệnh này sẽ tạo ra thư mục 'dist' chứa file index.html và js "chín"
RUN npm run build

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=8080

# Mở cổng
EXPOSE 8080

# Chạy server bằng tsx (như mong muốn của bạn)
CMD ["npx", "tsx", "server.ts"]
