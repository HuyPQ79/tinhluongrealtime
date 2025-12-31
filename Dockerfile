# 1. Dùng Node 20
FROM node:20-slim

# 2. Cài thư viện hệ thống
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 3. Copy file cấu hình
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# 4. QUAN TRỌNG: Xóa node_modules rác nếu lỡ copy vào, sau đó cài mới
RUN rm -rf node_modules && npm install

# 5. Generate Prisma
RUN npx prisma generate

# 6. Copy toàn bộ code
COPY . .

# 7. Build Web
# Tăng RAM để tránh crash
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# 8. Cấu hình
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# 9. Khởi động (Dùng npm start để gọi tsx server.ts)
CMD ["npm", "start"]
