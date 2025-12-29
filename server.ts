import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const app = express();
const PORT = process.env.PORT || 8080;
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- 1. PHỤC VỤ GIAO DIỆN (FIX LỖI MÀN HÌNH TRẮNG) ---
// Thay vì phục vụ thư mục gốc, ta phục vụ thư mục 'dist' (nơi chứa code đã build)
const distPath = path.join(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
  console.log("--> Đã tìm thấy thư mục build 'dist'. Đang phục vụ...");
  app.use(express.static(distPath));
} else {
  console.log("--> CẢNH BÁO: Không tìm thấy thư mục 'dist'. Web sẽ bị trắng!");
}

// --- 2. API HEALTH CHECK ---
app.get('/api/ping', (req, res) => {
  res.json({ status: 'ok', message: 'Server TS đang chạy!' });
});

// --- 3. CÁC API KHÁC (USER, LOGIN...) ---
// (Bạn có thể paste lại code logic cũ vào đây sau, giờ cứ để test trước đã)

// --- 4. FALLBACK VỀ INDEX.HTML (CHO REACT ROUTER) ---
app.get('*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.send('Server đang chạy nhưng chưa Build xong giao diện (Thiếu folder dist).');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
