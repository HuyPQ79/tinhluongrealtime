# 1. Dùng Node 20
FROM node:20-slim

# 2. Cài thư viện hệ thống (Bắt buộc cho Prisma & Cloud SQL)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy file cấu hình
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 4. Cài đặt TOÀN BỘ thư viện (Vì ta đã gộp hết vào dependencies)
RUN npm install

# 5. Generate Prisma Client
RUN npx prisma generate

# 6. Copy code nguồn
COPY . .

# 7. Build Web (Tăng RAM để tránh lỗi build)
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 8. Môi trường & Cổng
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 9. Lệnh khởi động ĐƠN GIẢN NHẤT
# Nó sẽ chạy lệnh "tsx server.ts" đã khai báo trong package.json
CMD ["npm", "start"]
