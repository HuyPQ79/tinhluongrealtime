import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // Thư viện mã hóa mật khẩu
import jwt from 'jsonwebtoken'; // Thư viện tạo token

// --- KHỞI TẠO SERVER ---
console.log("=== SERVER ĐANG KHỞI ĐỘNG (CHẾ ĐỘ PRODUCTION) ===");

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';

const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- 1. API ĐĂNG NHẬP (QUAN TRỌNG: FIX LỖI LOGIN) ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(`[LOGIN] Đang kiểm tra user: ${username}`);

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Tài khoản không tồn tại' });
    }

    // --- LOGIC KIỂM TRA MẬT KHẨU THÔNG MINH (HYBRID) ---
    let isMatch = false;

    // Trường hợp 1: User mới (Mật khẩu đã mã hóa bằng Bcrypt - bắt đầu bằng $2...)
    if (user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
    } 
    // Trường hợp 2: User cũ/Demo (Mật khẩu dạng chữ thường 123456)
    else {
        isMatch = (password === user.password);
    }

    if (isMatch) {
      console.log(`[LOGIN] Thành công: ${username}`);
      // Tạo Token
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
      
      // Trả về user (nhưng giấu mật khẩu đi)
      const { password: _, ...userData } = user;
      res.json({ success: true, token, user: userData });
    } else {
      console.log(`[LOGIN] Sai mật khẩu: ${username}`);
      res.status(401).json({ success: false, message: 'Sai mật khẩu' });
    }
  } catch (error) {
    console.error("[LOGIN] Lỗi:", error);
    res.status(500).json({ success: false, message: 'Lỗi server khi đăng nhập' });
  }
});

// --- 2. API QUẢN LÝ USER (TỰ ĐỘNG MÃ HÓA PASSWORD) ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    // Ẩn mật khẩu khi trả về danh sách
    const safeUsers = users.map(u => {
      const { password, ...rest } = u;
      return rest;
    });
    res.json(safeUsers);
  } catch (e) { res.status(500).json({ error: "Lỗi lấy danh sách user" }); }
});

app.post('/api/users', async (req, res) => {
  try {
    const data = req.body;
    console.log(`[USER] Đang tạo/sửa user: ${data.username}`);

    // LOGIC QUAN TRỌNG: Nếu có nhập mật khẩu mới -> Mã hóa ngay
    if (data.password && data.password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    } else {
        // Nếu edit mà không nhập pass thì xóa trường này để không bị ghi đè thành rỗng
        delete data.password;
    }

    const user = await prisma.user.upsert({
      where: { id: data.id || "new_" + Date.now() },
      update: data,
      create: {
        ...data,
        id: data.id || "user_" + Date.now() // Đảm bảo luôn có ID khi tạo mới
      }
    });
    
    res.json(user);
  } catch (e) { 
    console.error("[USER] Lỗi lưu user:", e);
    res.status(500).json({ error: "Không thể lưu user. Có thể trùng ID hoặc Username." }); 
  }
});

// --- 3. CÁC API PHỤ TRỢ KHÁC ---
app.get('/api/config', async (req, res) => {
  try {
    const config = await prisma.systemConfig.findFirst();
    res.json(config);
  } catch(e) { res.json({}); }
});

app.get('/api/ping', (req, res) => {
  res.json({ status: "OK", message: "Server HRM đang chạy ổn định!" });
});

// --- 4. PHỤC VỤ GIAO DIỆN (ĐÃ TỐI ƯU CHO CLOUD RUN) ---
// Trỏ thẳng vào thư mục 'dist' nơi chứa code React đã build
const distPath = path.join(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
  console.log(`[STATIC] Đang phục vụ giao diện từ: ${distPath}`);
  app.use(express.static(distPath));
} else {
  console.error("[STATIC] CẢNH BÁO: Không tìm thấy thư mục 'dist'!");
}

// Bắt mọi route còn lại để trả về index.html (Hỗ trợ React Router)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('<h1>Server Backend đang chạy.</h1><p>Nhưng chưa thấy giao diện Frontend (folder dist). Vui lòng kiểm tra lại log Build.</p>');
  }
});

// --- KHỞI ĐỘNG ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend HRM đã sẵn sàng tại cổng ${PORT}`);
});
