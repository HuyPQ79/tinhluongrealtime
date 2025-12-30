import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import * as PrismaNamespace from '@prisma/client';
import bcrypt from 'bcryptjs'; // Cần import thư viện mã hóa

// Fix: Khởi tạo Prisma an toàn
const PrismaClient = (PrismaNamespace as any).PrismaClient;
const prisma = new PrismaClient();

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';

app.use(cors());
app.use(express.json() as any);

// --- 1. API ĐĂNG NHẬP (CƠ CHẾ HYBRID: Hỗ trợ cả cũ và mới) ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[LOGIN] Đang thử đăng nhập: ${username}`);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      console.log(`[LOGIN] User không tồn tại: ${username}`);
      return res.status(401).json({ success: false, message: 'Sai tài khoản' });
    }

    // Kiểm tra mật khẩu: Thử cả 2 cách (Mã hóa & Không mã hóa)
    let isMatch = false;
    
    // Cách 1: So sánh nếu mật khẩu trong DB đã được mã hóa (Bcrypt)
    if (user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
    } 
    // Cách 2: So sánh thô (Dành cho user cũ/demo chưa mã hóa)
    else {
        isMatch = (password === user.password);
    }

    if (isMatch) {
      console.log(`[LOGIN] Thành công: ${username}`);
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
      // Trả về thông tin user (loại bỏ password)
      const { password: _, ...userWithoutPass } = user;
      res.json({ success: true, token, user: userWithoutPass });
    } else {
      console.log(`[LOGIN] Sai mật khẩu: ${username}`);
      res.status(401).json({ success: false, message: 'Sai mật khẩu' });
    }
  } catch (error) {
    console.error("[LOGIN] Lỗi server:", error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// --- 2. API QUẢN LÝ USER (Tự động mã hóa pass khi tạo/sửa) ---
app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany();
        res.json(users);
    } catch(e) { res.status(500).json({error: "Lỗi lấy danh sách user"}); }
});

app.post('/api/users', async (req, res) => {
  try {
    const data = req.body;
    console.log(`[USER] Đang lưu user: ${data.username}`);

    // Nếu có đổi mật khẩu thì mã hóa, không thì thôi
    if (data.password && data.password.trim() !== "") {
        data.password = await bcrypt.hash(data.password, 10);
    } else {
        // Nếu không gửi pass (khi edit), xóa trường password để không bị ghi đè thành rỗng
        delete data.password;
    }

    const user = await prisma.user.upsert({
      where: { id: data.id || "new_id_" + Date.now() }, // Fallback nếu thiếu ID
      update: data,
      create: data
    });
    res.json(user);
  } catch(e) { 
      console.error("[USER] Lỗi lưu user:", e);
      res.status(500).json({error: "Lỗi lưu user"}); 
  }
});

// --- 3. CÁC API KHÁC (GIỮ NGUYÊN) ---
app.get('/api/config', async (req, res) => {
  try {
    const config = await prisma.systemConfig.findFirst();
    res.json(config);
  } catch(e) { res.json({}); }
});

// API Ping Healthcheck
app.get('/api/ping', (req, res) => {
  res.json({ status: "OK", time: new Date() });
});


// --- 4. PHỤC VỤ GIAO DIỆN (ĐÃ FIX MÀN HÌNH TRẮNG) ---
const distPath = path.join(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
  console.log("--> [FRONTEND] Đã tìm thấy thư mục 'dist'. Đang phục vụ...");
  app.use(express.static(distPath));
} else {
  console.log("--> [FRONTEND] CẢNH BÁO: Không tìm thấy thư mục 'dist'!");
}

app.get('*', (req, res) => {
  if (fs.existsSync(path.join(distPath, 'index.html'))) {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    res.send('Server đang chạy nhưng chưa tìm thấy giao diện (Thư mục dist thiếu). Vui lòng kiểm tra lại Log Build.');
  }
});

// --- KHỞI ĐỘNG ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend HRM đang chạy tại cổng ${PORT}`);
});
