import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- KHỞI TẠO SERVER ---
console.log("=== SERVER ĐANG KHỞI ĐỘNG (FULL MODE) ===");

const app = express();
// Ép kiểu số nguyên cho PORT
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// ==========================================
// 1. API ĐĂNG NHẬP (FIX LỖI LOGIN & USER)
// ==========================================

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[LOGIN] Đang kiểm tra: ${username}`);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    // --- KIỂM TRA MẬT KHẨU THÔNG MINH (HYBRID) ---
    let isMatch = false;

    // Nếu pass trong DB đã mã hóa (bắt đầu bằng $2) -> Dùng Bcrypt
    if (user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
    } 
    // Nếu pass trong DB là chữ thường (User cũ) -> So sánh thường
    else {
        isMatch = (password === user.password);
    }

    if (isMatch) {
      console.log(`[LOGIN] Thành công: ${username}`);
      // Tạo Token
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
      
      // Trả về user (Bỏ mật khẩu đi để bảo mật)
      const { password: _, ...userData } = user;
      
      // Quan trọng: Trả về đầy đủ để Frontend cập nhật State ngay lập tức
      res.json({ success: true, token, user: userData });
    } else {
      console.log(`[LOGIN] Sai mật khẩu: ${username}`);
      res.status(401).json({ success: false, message: 'Sai mật khẩu' });
    }
  } catch (error) {
    console.error("[LOGIN] Lỗi:", error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// ==========================================
// 2. API QUẢN LÝ USER (LƯU VÀO DB THẬT)
// ==========================================

app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    // Ẩn mật khẩu
    const safeUsers = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    res.json(safeUsers);
  } catch (e) { 
    console.error("Lỗi lấy users:", e);
    res.status(500).json({ error: "Lỗi lấy danh sách user" }); 
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const data = req.body;
    console.log(`[USER] Đang lưu user: ${data.username}`);

    // MÃ HÓA MẬT KHẨU (Nếu có nhập pass mới)
    if (data.password && data.password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    } else {
        // Nếu edit mà không nhập pass -> Xóa field này để không ghi đè thành rỗng
        delete data.password;
    }

    // Dùng upsert để: Có thì cập nhật, Chưa có thì tạo mới
    // (Khắc phục lỗi tạo xong F5 bị mất)
    const user = await prisma.user.upsert({
      where: { id: data.id || "new_" + Date.now() },
      update: data,
      create: {
        ...data,
        id: data.id || "user_" + Date.now()
      }
    });
    
    console.log(`[USER] Đã lưu thành công: ${user.username}`);
    res.json(user);
  } catch (e) { 
    console.error("[USER] Lỗi lưu user:", e);
    res.status(500).json({ error: "Không thể lưu user. Có thể trùng Username." }); 
  }
});

// ==========================================
// 3. CÁC API KHÁC
// ==========================================

app.get('/api/config', async (req, res) => {
  try {
    const config = await prisma.systemConfig.findFirst();
    res.json(config);
  } catch(e) { res.json({}); }
});

app.get('/api/ping', (req, res) => {
  res.json({ status: "OK", message: "Server Full Mode đang chạy!" });
});

// ==========================================
// 4. PHỤC VỤ GIAO DIỆN WEB (QUAN TRỌNG)
// ==========================================

// Trỏ đúng vào thư mục 'dist' như bản chạy thành công
const distPath = path.join(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
  console.log(`[STATIC] Đang phục vụ giao diện từ: ${distPath}`);
  app.use(express.static(distPath));
} else {
  console.error("[STATIC] CẢNH BÁO: Không tìm thấy thư mục 'dist'!");
}

// Fallback về index.html để React Router hoạt động
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('Server đang chạy nhưng chưa thấy giao diện (dist/index.html).');
  }
});

// --- KHỞI ĐỘNG ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend HRM đã sẵn sàng tại cổng ${PORT}`);
});
