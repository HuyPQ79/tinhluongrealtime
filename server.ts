import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- 1. GÀI BẪY BẮT LỖI (Giúp Server không bị sập im lặng) ---
process.on('uncaughtException', (err) => {
  console.error('🔥 LỖI CHẾT NGƯỜI (Uncaught Exception):', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 LỖI PROMISE (Unhandled Rejection):', reason);
});

console.log("=== SERVER ĐANG KHỞI ĐỘNG (FINAL STABLE VERSION) ===");

const app = express();
// Ép kiểu số cho PORT
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

// === 2. TỰ ĐỘNG KHỞI TẠO DATABASE ===
async function initDatabase() {
  try {
    console.log("--> [DB] Đang kiểm tra kết nối...");
    // Query nhẹ để test kết nối
    await prisma.$queryRaw`SELECT 1`;
    console.log("--> [DB] Kết nối Database thành công.");
    
    // Tự động tạo System Config mặc định nếu bảng trống
    const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
    if (!config) {
      console.log("--> [DB] Đang tạo cấu hình hệ thống mặc định...");
      await prisma.systemConfig.create({
        data: {
          id: "default_config",
          baseSalary: 1800000,
          standardWorkDays: 26,
          insuranceBaseSalary: 1800000,
          maxInsuranceBase: 36000000
        }
      });
    }
  } catch (e) {
    console.error("--> [DB LỖI] Không thể kết nối DB (Server vẫn sẽ chạy tiếp để phục vụ Web). Lỗi:", e);
  }
}
// Chạy ngay khi start
initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- 3. CÁC HÀM API CRUD CHUNG ---
const createCrud = (modelName: string, route: string) => {
    // @ts-ignore
    const model = prisma[modelName];
    
    app.get(`/api/${route}`, async (req, res) => {
        try {
            const items = await model.findMany();
            res.json(items);
        } catch(e) { res.status(500).json({ error: `Lỗi lấy ${route}` }); }
    });
    
    app.post(`/api/${route}`, async (req, res) => {
        try {
            const data = req.body;
            const item = await model.upsert({
                where: { id: data.id || "new_" },
                update: data,
                create: { ...data, id: data.id || `${route}_` + Date.now() }
            });
            res.json(item);
        } catch(e) { res.status(500).json({ error: `Lỗi lưu ${route}` }); }
    });

    app.delete(`/api/${route}/:id`, async (req, res) => {
        try {
            await model.delete({ where: { id: req.params.id } });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: `Lỗi xóa ${route}` }); }
    });
};

// ==========================================
// 4. API MODULE: AUTH & USER
// ==========================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ success: false, message: 'Sai tài khoản' });

    let isMatch = false;
    // Kiểm tra pass mã hóa hoặc pass thường
    if (user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
    } else {
        isMatch = (password === user.password);
    }

    if (isMatch) {
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
      // Loại bỏ password khi trả về
      const { password: _, ...userData } = user;
      res.json({ success: true, token, user: userData });
    } else {
      res.status(401).json({ success: false, message: 'Sai mật khẩu' });
    }
  } catch (error) { res.status(500).json({ success: false, message: 'Lỗi Server' }); }
});

app.get('/api/users', async (req, res) => {
  try {
      const users = await prisma.user.findMany({ include: { department: true } });
      res.json(users.map(({ password, ...u }) => u));
  } catch (e) { res.status(500).json({error: "Lỗi lấy users"}); }
});

app.post('/api/users', async (req, res) => {
  try {
    const data = req.body;
    // Mã hóa mật khẩu nếu có nhập mới
    if (data.password && data.password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    } else { delete data.password; }
    
    const user = await prisma.user.upsert({
      where: { id: data.id || "new_" + Date.now() },
      update: data,
      create: { ...data, id: data.id || "user_" + Date.now() }
    });
    res.json(user);
  } catch (e) { res.status(500).json({ error: "Lỗi lưu User" }); }
});
app.delete('/api/users/:id', async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
});

// ==========================================
// 5. API MODULE: CORE DATA
// ==========================================
createCrud('department', 'departments');
createCrud('salaryFormula', 'formulas');
createCrud('salaryVariable', 'variables');
createCrud('criterionGroup', 'criteria/groups');
createCrud('criterion', 'criteria/items');
createCrud('auditLog', 'audit');
createCrud('pieceworkConfig', 'piecework-configs');
createCrud('dailyWorkItem', 'daily-work-items');
createCrud('holiday', 'holidays');
createCrud('bonusType', 'bonus-types');
createCrud('annualBonusPolicy', 'bonus-policies');

// ==========================================
// 6. API MODULE: COMPLEX LOGIC
// ==========================================

// --- System Config ---
app.get('/api/config/system', async (req, res) => {
    const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
    res.json(config || {});
});
app.post('/api/config/system', async (req, res) => {
    const data = req.body;
    const config = await prisma.systemConfig.upsert({
        where: { id: "default_config" },
        update: data,
        create: { ...data, id: "default_config" }
    });
    res.json(config);
});

// --- Ranks & Grades ---
app.get('/api/ranks', async (req, res) => {
    const ranks = await prisma.salaryRank.findMany({ include: { grades: true } });
    res.json(ranks);
});
app.post('/api/ranks', async (req, res) => {
    const { grades, ...rankData } = req.body;
    const rank = await prisma.salaryRank.upsert({
        where: { id: rankData.id || "new_" },
        update: rankData,
        create: { ...rankData, id: rankData.id || "rank_" + Date.now() }
    });
    if (grades && Array.isArray(grades)) {
        for (const g of grades) {
            await prisma.salaryGrade.upsert({
                where: { id: g.id || "new_" },
                update: { ...g, rankId: rank.id },
                create: { ...g, id: g.id || "grade_" + Date.now(), rankId: rank.id }
            });
        }
    }
    res.json(rank);
});

// --- Attendance (Chấm công) ---
app.get('/api/attendance', async (req, res) => {
    const { month } = req.query; 
    const records = await prisma.attendanceRecord.findMany({
        where: month ? { date: { startsWith: month as string } } : {}
    });
    res.json(records);
});
app.post('/api/attendance', async (req, res) => {
    const data = req.body; 
    const records = Array.isArray(data) ? data : [data];
    try {
        const results = [];
        for (const rec of records) {
            const saved = await prisma.attendanceRecord.upsert({
                where: { userId_date: { userId: rec.userId, date: rec.date } },
                update: rec,
                create: rec
            });
            results.push(saved);
        }
        res.json({ success: true, count: results.length });
    } catch(e) { res.status(500).json({ error: "Lỗi lưu chấm công" }); }
});

// --- Salary Records (Bảng lương) ---
app.get('/api/salary-records', async (req, res) => {
    const { month } = req.query;
    const records = await prisma.salaryRecord.findMany({
        where: month ? { date: month as string } : {}
    });
    res.json(records);
});
app.post('/api/salary-records', async (req, res) => {
    try {
        const rec = req.body;
        const saved = await prisma.salaryRecord.upsert({
            where: { userId_date: { userId: rec.userId, date: rec.date } },
            update: rec,
            create: { ...rec, id: rec.id || `sal_${rec.userId}_${rec.date}` }
        });
        res.json(saved);
    } catch(e) { res.status(500).json({ error: "Lỗi lưu bảng lương" }); }
});

// --- Evaluations (Đánh giá) ---
app.get('/api/evaluations', async (req, res) => {
    const items = await prisma.evaluationRequest.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(items);
});
app.post('/api/evaluations', async (req, res) => {
    const item = await prisma.evaluationRequest.create({ data: req.body });
    res.json(item);
});

// ==========================================
// 7. PHỤC VỤ FILE TĨNH (FRONTEND)
// ==========================================
app.get('/api/ping', (req, res) => {
    res.json({ status: "OK", mode: "FINAL_VERSION" });
});

// Trỏ đúng vào thư mục 'dist' do Vite build ra
const distPath = path.join(process.cwd(), 'dist');

if (fs.existsSync(distPath)) {
    console.log(`[STATIC] Đang phục vụ giao diện từ: ${distPath}`);
    app.use(express.static(distPath));
} else {
    console.error(`[STATIC] CẢNH BÁO: Không tìm thấy thư mục 'dist'. Vui lòng kiểm tra log Build.`);
}

// Fallback: Mọi đường dẫn không phải API đều trả về index.html (để React Router xử lý)
app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.send("<h1>Server Backend đang chạy.</h1><p>Đang chờ Frontend build xong (thư mục dist).</p>");
    }
});

// Lắng nghe cổng 0.0.0.0 để Cloud Run nhận diện
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend HRM đã chạy thành công tại cổng ${PORT}`);
});
