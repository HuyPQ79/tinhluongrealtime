# Sử dụng Node 20
FROM node:20-slim

# Cài OpenSSL (cần cho Prisma hoạt động)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy toàn bộ code vào
COPY . .

# 1. Cài đặt thư viện
RUN npm install

# 2. Tạo Prisma Client (Để code hiểu cấu trúc DB)
RUN npx prisma generate

# 3. Build giao diện React (Tạo thư mục dist)
RUN npm run build

# Thiết lập biến môi trường
ENV NODE_ENV=production
ENV PORT=8080

# Mở cổng 8080
EXPOSE 8080

# --- LỆNH KHỞI ĐỘNG (QUAN TRỌNG NHẤT) ---
# Ý nghĩa: 
# 1. "npx prisma db push": Ép Database tạo các bảng mới (SystemConfig, Holiday...)
# 2. "--accept-data-loss": Chấp nhận ghi đè cấu trúc cũ (cần thiết cho bản Dev/Internal)
# 3. "&&": Nếu bước 1 xong thì mới làm bước 2
# 4. "npx tsx server.ts": Chạy server backend
CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npx tsx server.ts"]
