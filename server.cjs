const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

console.log("=== SERVER ĐANG KHỞI ĐỘNG (CHẾ ĐỘ NATIVE CJS) ===");

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';

// Khởi tạo Prisma an toàn
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- API LOGIN ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Đang thử đăng nhập:", username);
    const user = await prisma.user.findUnique({ where: { username } });
    
    if (user && (password === user.password)) { 
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

// --- API USER (MẪU) ---
app.get('/api/users', async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- API TEST SERVER ---
app.get('/api/ping', (req, res) => {
  res.json({ status: "OK", mode: "Native CJS", time: new Date() });
});

// --- SERVE FRONTEND ---
const staticPath = path.join(process.cwd());
console.log("Phục vụ file tĩnh tại:", staticPath);

app.use(express.static(staticPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(staticPath, 'index.html'));
});

// --- KHỞI ĐỘNG ---
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend HRM đang chạy tại cổng ${PORT}`);
});
