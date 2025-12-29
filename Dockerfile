# --- SỬ DỤNG 1 STAGE DUY NHẤT ĐỂ TRÁNH LỖI THIẾU FILE ---
FROM node:20-slim

# 1. Cài đặt thư viện hệ thống (OpenSSL cho Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 2. Thiết lập thư mục làm việc
WORKDIR /app

# 3. Copy toàn bộ code từ GitHub vào (bao gồm cả server.cjs)
COPY . .

# 4. Xóa sạch thư mục rác (nếu lỡ dính từ Windows) để cài mới
RUN rm -rf node_modules dist

# 5. Cài đặt thư viện (Dependencies)
RUN npm install

# 6. Tạo Prisma Client (Kết nối DB)
RUN npx prisma generate

# 7. Đóng gói giao diện React (Tạo thư mục dist)
RUN npm run build

# 8. Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=8080

# 9. Mở cổng mạng
EXPOSE 8080

# 10. Lệnh khởi động server
# (Sử dụng trực tiếp node để chạy file cjs)
CMD ["node", "server.cjs"]
