# Sử dụng Node 20
FROM node:20-slim

# Cài OpenSSL (Cần thiết)
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy code
COPY . .

# 1. Cài thư viện
RUN npm install

# 2. Generate Prisma
RUN npx prisma generate

# 3. Build Web
RUN npm run build

# Env
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# --- LỆNH KHỞI ĐỘNG ĐƠN GIẢN (KHÔNG CHẠY DB PUSH NỮA) ---
# Vì DB đã được tạo thủ công bằng SQL rồi
CMD ["npx", "tsx", "server.ts"]
