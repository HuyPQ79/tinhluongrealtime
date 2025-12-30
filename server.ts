import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- 1. GÀI BẪY BẮT LỖI ---
process.on('uncaughtException', (err) => {
  console.error('🔥 LỖI CHẾT NGƯỜI (Uncaught Exception):', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 LỖI PROMISE (Unhandled Rejection):', reason);
});

console.log("=== SERVER ĐANG KHỞI ĐỘNG (SIMPLE START) ===");

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

// === 2. INIT DB (Không chặn app nếu lỗi) ===
async function initDatabase() {
  try {
    console.log("--> [DB] Đang kiểm tra kết nối...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("--> [DB] Kết nối thành công.");
    
    const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
    if (!config) {
      console.log("--> [DB] Tạo config mặc định...");
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
    console.error("--> [DB LỖI] Web vẫn chạy, nhưng không có DB. Chi tiết:", e);
  }
}
initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- 3. HELPER ---
const createCrud = (modelName: string, route: string) => {
    // @ts-ignore
    const model = prisma[modelName];
    app.get(`/api/${route}`, async (req, res) => {
        try { res.json(await model.findMany()); } 
        catch(e) { res.status(500).json({ error: `Lỗi lấy ${route}` }); }
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
        try { await model.delete({ where: { id: req.params.id } }); res.json({ success: true }); } 
        catch(e) { res.status(500).json({ error: `Lỗi xóa ${route}` }); }
    });
};

// --- 4. API AUTH ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return res.status(401).json({ success: false, message: 'Sai tài khoản' });

    let isMatch = user.password.startsWith('$2') 
        ? await bcrypt.compare(password, user.password)
        : (password === user.password);

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
    } catch(e) { res.status(500).json({error: "Lỗi"}); }
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
    try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
    catch(e) { res.status(500).json({ error: "Lỗi xóa user" }); }
});

// --- 5. REGISTER CRUD ---
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

// --- 6. OTHER APIS ---
app.get('/api/config/system', async (req, res) => {
    try { res.json(await prisma.systemConfig.findUnique({ where: { id: "default_config" } }) || {}); } 
    catch(e) { res.json({}); }
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

app.get('/api/ranks', async (req, res) => {
    try { res.json(await prisma.salaryRank.findMany({ include: { grades: true } })); } 
    catch(e) { res.status(500).json({error: "Lỗi"}); }
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
    } catch(e) { res.status(500).json({error: "Lỗi"}); }
});

app.get('/api/attendance', async (req, res) => {
    try {
        const { month } = req.query; 
        res.json(await prisma.attendanceRecord.findMany({
            where: month ? { date: { startsWith: month as string } } : {}
        }));
    } catch(e) { res.status(500).json({error: "Lỗi"}); }
});
app.post('/api/attendance', async (req, res) => {
    try {
        const data = req.body; 
        const records = Array.isArray(data) ? data : [data];
        for (const rec of records) {
            await prisma.attendanceRecord.upsert({
                where: { userId_date: { userId: rec.userId, date: rec.date } },
                update: rec,
                create: rec
            });
        }
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Lỗi" }); }
});

app.get('/api/salary-records', async (req, res) => {
    try {
        const { month } = req.query;
        res.json(await prisma.salaryRecord.findMany({
            where: month ? { date: month as string } : {}
        }));
    } catch(e) { res.status(500).json({error: "Lỗi"}); }
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
    } catch(e) { res.status(500).json({ error: "Lỗi" }); }
});

app.get('/api/evaluations', async (req, res) => {
    try { res.json(await prisma.evaluationRequest.findMany({ orderBy: { createdAt: 'desc' } })); } 
    catch(e) { res.status(500).json({error: "Lỗi"}); }
});
app.post('/api/evaluations', async (req, res) => {
    try { res.json(await prisma.evaluationRequest.create({ data: req.body })); } 
    catch(e) { res.status(500).json({error: "Lỗi"}); }
});

// --- 7. SERVE FRONTEND ---
app.get('/api/ping', (req, res) => { res.json({ status: "OK" }); });

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
    console.log(`[STATIC] Serving dist: ${distPath}`);
    app.use(express.static(distPath));
}

app.get('*', (req, res) => {
    if (fs.existsSync(path.join(distPath, 'index.html'))) {
        res.sendFile(path.join(distPath, 'index.html'));
    } else {
        res.send("<h1>Backend Running.</h1><p>Frontend 'dist' not found.</p>");
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server chạy tại cổng ${PORT}`);
});
