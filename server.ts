import express from 'express';
import cors from 'cors';
import * as path from 'path'; // SỬA LỖI 1: Import path an toàn
import * as jwt from 'jsonwebtoken'; // SỬA LỖI 2: Dùng import thay vì require
import * as PrismaNamespace from '@prisma/client';

// Log khởi động để debug
console.log("Server đang khởi động...");

// Fix: Lấy PrismaClient an toàn
const PrismaClient = (PrismaNamespace as any).PrismaClient;
const prisma = new PrismaClient();

const app = express();
// Ép kiểu số nguyên cho PORT để tránh lỗi
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';

app.use(cors());
app.use(express.json() as any);

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (user && (password === user.password)) { 
      // Sửa lỗi dùng jwt.sign thay vì require
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
      res.json({ success: true, token, user });
    } else {
      res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
    }
  } catch (error) {
    console.error("Lỗi đăng nhập:", error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

// --- USERS API ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch(e) { res.status(500).json({error: "Lỗi lấy user"}); }
});

app.post('/api/users', async (req, res) => {
  try {
    const data = req.body;
    const user = await prisma.user.upsert({
      where: { id: data.id },
      update: data,
      create: data
    });
    res.json(user);
  } catch(e) { res.status(500).json({error: "Lỗi lưu user"}); }
});

// --- ATTENDANCE API ---
app.get('/api/attendance', async (req, res) => {
  try {
    const records = await prisma.attendanceRecord.findMany();
    res.json(records);
  } catch(e) { res.status(500).json({error: "Lỗi lấy chấm công"}); }
});

app.post('/api/attendance/bulk', async (req, res) => {
  try {
    const { records } = req.body;
    for (const r of records) {
      await prisma.attendanceRecord.upsert({
        where: { id: r.id },
        update: r,
        create: r
      });
    }
    res.json({ success: true });
  } catch(e) { res.status(500).json({error: "Lỗi lưu chấm công"}); }
});

// --- CONFIG API ---
app.get('/api/config', async (req, res) => {
  try {
    const config = await prisma.systemConfig.findFirst();
    res.json(config);
  } catch(e) { res.json({}); }
});

// --- SERVE FRONTEND (Đã fix lỗi path) ---
// Sử dụng đường dẫn tuyệt đối an toàn
const staticPath = path.resolve(process.cwd());
console.log("Đang phục vụ file tĩnh từ:", staticPath);

app.use(express.static(staticPath));

app.get('*', (req, res) => {
  // Trả về file index.html cho mọi đường dẫn khác
  res.sendFile(path.join(staticPath, 'index.html'));
});

// Khởi động server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend HRM đang chạy tại cổng ${PORT}`);
});
