# Sử dụng Node 20
FROM node:20-slim

# Cài OpenSSL & CA Certificates (Bắt buộc cho Cloud SQL & Prisma)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy toàn bộ code vào
COPY . .

# 1. Cài đặt thư viện
RUN npm install

# 2. Tạo Prisma Client
RUN npx prisma generate

# 3. Build giao diện React
RUN npm run build

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=8080

# Mở cổng
EXPOSE 8080

# --- LỆNH KHỞI ĐỘNG (ĐÃ SỬA ĐỔI) ---
# Thay '&&' bằng ';' để dù DB lỗi thì Server vẫn chạy tiếp
# Thêm '|| true' để chặn lỗi thoát chương trình
CMD ["sh", "-c", "echo '--> [1/2] Đang cập nhật Database...'; npx prisma db push --accept-data-loss || echo '--> ⚠️ LỖI CẬP NHẬT DB (BỎ QUA ĐỂ CHẠY SERVER)'; echo '--> [2/2] Khởi động Server...'; npx tsx server.ts"]
