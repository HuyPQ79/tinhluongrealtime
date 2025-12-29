# --- SỬ DỤNG 1 STAGE (CHẮC CHẮN CHẠY) ---
FROM node:20-slim

# 1. Cài đặt thư viện hệ thống
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

# 2. Thiết lập thư mục
WORKDIR /app

# 3. Copy toàn bộ code
COPY . .

# 4. DỌN DẸP SẠCH SẼ (Xóa rác Windows & Lock file cũ)
# Xóa package-lock.json để ép npm cài lại từ đầu theo chuẩn Linux
RUN rm -rf node_modules dist package-lock.json

# 5. Cài đặt thư viện
RUN npm install

# 6. Generate Database & Build Web
RUN npx prisma generate
RUN npm run build

# 7. Mở cổng
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 8. LỆNH KHỞI ĐỘNG "THÁM TỬ" (Debug Mode)
# Lệnh này sẽ:
# - In ra "--- KIỂM TRA FILE ---"
# - Liệt kê tất cả file đang có trong thư mục (ls -la)
# - Sau đó mới thử chạy server
CMD ["sh", "-c", "echo '--- KIỂM TRA FILE ---'; ls -la; echo '--- CHẠY SERVER ---'; node server.cjs"]
