import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- 1. GÀI BẪY BẮT LỖI (Quan trọng để Server không sập nguồn) ---
process.on('uncaughtException', (err) => {
  console.error('🔥 LỖI CHẾT NGƯỜI (Uncaught Exception):', err);
  // Không exit process để giữ server sống cho bạn debug
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 LỖI PROMISE (Unhandled Rejection):', reason);
});

console.log("=== SERVER ĐANG KHỞI ĐỘNG (STABLE VERSION) ===");

const app = express();
// Ép kiểu số nguyên cho PORT (quan trọng với Cloud Run)
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// === 2. TỰ ĐỘNG KHỞI TẠO DATABASE (Non-blocking) ===
async function initDatabase() {
  try {
    console.log("--> [DB] Đang kiểm tra kết nối...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("--> [DB] Kết nối Database thành công.");
    
    // Tạo cấu hình mặc định nếu chưa có
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
    console.error("--> [DB LỖI] Không thể kết nối DB (Web vẫn chạy ở chế độ hạn chế). Lỗi:", e);
  }
}
// Gọi hàm này nhưng không await để server start ngay lập tức
initDatabase();

// --- 3. HELPER TẠO API NHANH ---
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
    if (user.password.startsWith('$2')) {
        isMatch = await bcrypt.compare(password, user.password);
    } else {
        isMatch = (password === user.password);
    }

    if (isMatch) {
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
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
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Lỗi xóa user" }); }
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
    try {
        const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
        res.json(config || {});
    } catch(e) { res.json({}); }
});
app.post('/api/config/system', async (req, res) => {
    try {
        const data = req.body;
        const config = await prisma.systemConfig.upsert({
            where: { id: "default_config" },
            update: data,
            create: { ...data, id: "default_config" }
        });
        res.json(config);
    } catch(e) { res.status(500).json({error: "Lỗi lưu config"}); }
});

// --- Ranks & Grades ---
app.get('/api/ranks', async (req, res) => {
    try {
        const ranks = await prisma.salaryRank.findMany({ include: { grades: true } });
        res.json(ranks);
    } catch(e) { res.status(500).json({error: "Lỗi lấy ranks"}); }
});
app.post('/api/ranks', async (req, res) => {
    try {
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
    } catch(e) { res.status(500).json({error: "Lỗi lưu rank"}); }
});

// --- Attendance ---
app.get('/api/attendance', async (req, res) => {
    try {
        const { month } = req.query; 
        const records = await prisma.attendanceRecord.findMany({
            where: month ? { date: { startsWith: month as string } } : {}
        });
        res.json(records);
    } catch(e) { res.status(500).json({error: "Lỗi lấy chấm công"}); }
});
app.post('/api/attendance', async (req, res) => {
    try {
        const data = req.body; 
        const records = Array.isArray(data) ? data : [data];
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
    } catch(e) { res.status
