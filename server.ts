import express from 'express';
import cors from 'cors';
import path from 'path';
// Fix: Use a more flexible import for Prisma Namespace
import * as PrismaNamespace from '@prisma/client';

// Fix: Access PrismaClient dynamically to bypass potential generation errors in some environments
const PrismaClient = (PrismaNamespace as any).PrismaClient;
const prisma = new PrismaClient();

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';

app.use(cors());
// Fix: Cast express.json() to any or RequestHandler to fix overload matching error
app.use(express.json() as any);

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await prisma.user.findUnique({ where: { username } });
  
  if (user && (password === user.password)) { // Đơn giản hóa cho người mới, sau này nên dùng bcrypt
    const token = (require('jsonwebtoken')).sign({ id: user.id, roles: user.roles }, JWT_SECRET);
    res.json({ success: true, token, user });
  } else {
    res.status(401).json({ success: false, message: 'Sai tài khoản hoặc mật khẩu' });
  }
});

// --- USERS API ---
app.get('/api/users', async (req, res) => {
  const users = await prisma.user.findMany();
  res.json(users);
});

app.post('/api/users', async (req, res) => {
  const data = req.body;
  const user = await prisma.user.upsert({
    where: { id: data.id },
    update: data,
    create: data
  });
  res.json(user);
});

// --- ATTENDANCE API ---
app.get('/api/attendance', async (req, res) => {
  const records = await prisma.attendanceRecord.findMany();
  res.json(records);
});

app.post('/api/attendance/bulk', async (req, res) => {
  const { records } = req.body;
  for (const r of records) {
    await prisma.attendanceRecord.upsert({
      where: { id: r.id },
      update: r,
      create: r
    });
  }
  res.json({ success: true });
});

// --- CONFIG API ---
app.get('/api/config', async (req, res) => {
  const config = await prisma.systemConfig.findFirst();
  res.json(config);
});

// Khởi động server
// --- PHẦN MỚI THÊM: CẤU HÌNH FRONTEND ---

// 1. Cho phép server đọc các file tĩnh (CSS, JS, Ảnh...) trong thư mục hiện tại
app.use(express.static(path.join(process.cwd())));

// 2. Với mọi đường dẫn không phải API, trả về file index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// ----------------------------------------
app.listen(PORT, () => {
  console.log(`Backend HRM đang chạy tại cổng ${PORT}`);
});
