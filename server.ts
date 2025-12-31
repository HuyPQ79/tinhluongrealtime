import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- IMPORT SEEDER ---
// ĐÂY LÀ CHỖ QUAN TRỌNG: Import từ file cùng cấp (không có src)
import { seedDatabase } from './seeder'; 

// --- GÀI BẪY BẮT LỖI (CRITICAL) ---
process.on('uncaughtException', (err) => { console.error('🔥 CRITICAL ERROR:', err); });
process.on('unhandledRejection', (reason, promise) => { console.error('🔥 PROMISE REJECTION:', reason); });

console.log("=== SERVER ĐANG KHỞI ĐỘNG (FULL VERSION - ROOT DIR) ===");

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

// === TỰ ĐỘNG KHỞI TẠO DB ===
async function initDatabase() {
  try {
    console.log("--> [DB] Đang kiểm tra kết nối...");
    await prisma.$queryRaw`SELECT 1`;
    console.log("--> [DB] Kết nối Database thành công.");
    
    // 1. Tạo Config mặc định
    const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
    if (!config) {
      console.log("--> [DB] Tạo SystemConfig mặc định...");
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

    // 2. Tạo Admin mặc định (nếu chưa có user nào)
    const userCount = await prisma.user.count();
    if (userCount === 0) {
       console.log("--> [DB] DB trống. Tạo Admin mặc định (admin/123)...");
       const salt = await bcrypt.genSalt(10);
       const hashedPassword = await bcrypt.hash("123", salt);
       await prisma.user.create({
         data: {
           id: "admin_01",
           username: "admin",
           password: hashedPassword,
           name: "Quản Trị Hệ Thống",
           roles: ["ADMIN"],
           status: "ACTIVE"
         }
       });
    }
  } catch (e) {
    console.error("--> [DB INIT LỖI]:", e);
  }
}

initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==========================================
// API HELPER (CRUD CHUNG)
// ==========================================
const createCrud = (modelName: string, route: string) => {
    // @ts-ignore
    const model = prisma[modelName];
    
    app.get(`/api/${route}`, async (req, res) => {
        try {
            const items = await model.findMany();
            res.json(items);
        } catch(e) { 
            console.error(`[GET ${route} FAIL]`, e);
            res.status(500).json({ error: `Lỗi lấy ${route}` }); 
        }
    });
    
    app.post(`/api/${route}`, async (req, res) => {
        try {
            const data = req.body;
            const item = await model.upsert({
                where: { id: data.id || "new_temp_id" }, 
                update: data,
                create: { ...data, id: data.id || `${route}_` + Date.now() }
            });
            res.json(item);
        } catch(e) { 
            console.error(`[SAVE ${route} FAIL]`, e);
            res.status(500).json({ error: `Lỗi lưu ${route}` }); 
        }
    });

    app.delete(`/api/${route}/:id`, async (req, res) => {
        try {
            await model.delete({ where: { id: req.params.id } });
            res.json({ success: true });
        } catch(e) { res.status(500).json({ error: `Lỗi xóa ${route}` }); }
    });
};

// ==========================================
// API: AUTH & USER
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
      // @ts-ignore
      const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
      const { password: _, ...userData } = user;
      res.json({ success: true, token, user: userData });
    } else {
      res.status(401).json({ success: false, message: 'Sai mật khẩu' });
    }
  } catch (error) { res.status(500).json({ success: false, message: 'Server Error' }); }
});

app.get('/api/users', async (req, res) => {
  try {
      const users = await prisma.user.findMany({ include: { department: true } });
      // @ts-ignore
      res.json(users.map(({ password, ...u }) => u));
  } catch (e) { res.status(500).json({error: "Lỗi lấy users"}); }
});

// *** QUAN TRỌNG: API TẠO USER ĐÃ ĐƯỢC GIA CỐ ***
app.post('/api/users', async (req, res) => {
  try {
    const data = req.body;
    
    // 1. Xử lý Password
    if (data.password && data.password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        data.password = await bcrypt.hash(data.password, salt);
    } else { delete data.password; }
    
    // 2. Điền giá trị mặc định (Tránh lỗi 500)
    if (!data.roles || data.roles.length === 0) data.roles = ["NHAN_VIEN"];
    if (!data.paymentType) data.paymentType = "TIME";
    if (data.efficiencySalary === undefined) data.efficiencySalary = 0;
    if (data.pieceworkUnitPrice === undefined) data.pieceworkUnitPrice = 0;
    if (data.reservedBonusAmount === undefined) data.reservedBonusAmount = 0;
    if (data.probationRate === undefined) data.probationRate = 100;
    if (data.numberOfDependents === undefined) data.numberOfDependents = 0;
    if (!data.status) data.status = "ACTIVE";
    
    // 3. Xử lý Department (Tránh lỗi Foreign Key nếu Frontend gửi departmentId rỗng)
    if (data.currentDeptId === "") {
        data.currentDeptId = null;
    }

    // 4. Lưu vào DB
    const user = await prisma.user.upsert({
      where: { id: data.id || "new_" + Date.now() },
      update: data,
      create: { ...data, id: data.id || "user_" + Date.now() }
    });
    
    res.json(user);
  } catch (e) { 
      console.error("🔥 LỖI TẠO USER:", e); // In lỗi ra log để soi
      res.status(500).json({ error: "Lỗi tạo User. Vui lòng kiểm tra Log Server." }); 
  }
});

app.delete('/api/users/:id', async (req, res) => {
    try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ success: true }); } 
    catch (e) { res.status(500).json({ error: "Lỗi xóa User" }); }
});

// ==========================================
// API: CORE DATA
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
// API: SEEDER & LOGIC
// ==========================================

// --- ROUTE BÍ MẬT ĐỂ NẠP DỮ LIỆU ---
app.get('/api/seed-data-secret', async (req, res) => {
    try {
      console.log("--> Kích hoạt nạp dữ liệu...");
      await seedDatabase();
      res.json({ success: true, message: "Dữ liệu đã được nạp thành công!" });
    } catch (error) {
      console.error("Lỗi Seeder:", error);
      res.status(500).json({ success: false, error: "Lỗi nạp dữ liệu" });
    }
});

// --- System Config ---
app.get('/api/config/system', async (req, res) => {
    try { const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } }); res.json(config || {}); } 
    catch(e) { res.json({}); }
});
app.post('/api/config/system', async (req, res) => {
    try { const data = req.body; const config = await prisma.systemConfig.upsert({ where: { id: "default_config" }, update: data, create: { ...data, id: "default_config" } }); res.json(config); } 
    catch(e) { res.status(500).json({ error: "Lỗi lưu config" }); }
});

// --- Ranks & Grades ---
app.get('/api/ranks', async (req, res) => {
    try { const ranks = await prisma.salaryRank.findMany({ include: { grades: true } }); res.json(ranks); } 
    catch(e) { res.status(500).json({ error: "Lỗi lấy ranks" }); }
});
app.post('/api/ranks', async (req, res) => {
    try {
        const { grades, ...rankData } = req.body;
        const rank = await prisma.salaryRank.upsert({ where: { id: rankData.id || "new_" }, update: rankData, create: { ...rankData, id: rankData.id || "rank_" + Date.now() } });
        if (grades && Array.isArray(grades)) {
            for (const g of grades) await prisma.salaryGrade.upsert({ where: { id: g.id || "new_" }, update: { ...g, rankId: rank.id }, create: { ...g, id: g.id || "grade_" + Date.now(), rankId: rank.id } });
        }
        res.json(rank);
    } catch(e) { res.status(500).json({ error: "Lỗi lưu rank" }); }
});

// --- Attendance ---
app.get('/api/attendance', async (req, res) => {
    try { const { month } = req.query; const records = await prisma.attendanceRecord.findMany({ where: month ? { date: { startsWith: month as string } } : {} }); res.json(records); } 
    catch(e) { res.status(500).json({ error: "Lỗi lấy chấm công" }); }
});
app.post('/api/attendance', async (req, res) => {
    try {
        const data = req.body; const records = Array.isArray(data) ? data : [data]; const results = [];
        for (const rec of records) results.push(await prisma.attendanceRecord.upsert({ where: { userId_date: { userId: rec.userId, date: rec.date } }, update: rec, create: rec }));
        res.json({ success: true, count: results.length });
    } catch(e) { res.status(500).json({ error: "Lỗi lưu chấm công" }); }
});

// --- Salary ---
app.get('/api/salary-records', async (req, res) => {
    try { const { month } = req.query; const records = await prisma.salaryRecord.findMany({ where: month ? { date: month as string } : {} }); res.json(records); } 
    catch(e) { res.status(500).json({ error: "Lỗi lấy bảng lương" }); }
});
app.post('/api/salary-records', async (req, res) => {
    try { const rec = req.body; const saved = await prisma.salaryRecord.upsert({ where: { userId_date: { userId: rec.userId, date: rec.date } }, update: rec, create: { ...rec, id: rec.id || `sal_${rec.userId}_${rec.date}` } }); res.json(saved); } 
    catch(e) { res.status(500).json({ error: "Lỗi lưu bảng lương" }); }
});

// --- Evaluations ---
app.get('/api/evaluations', async (req, res) => { try { const items = await prisma.evaluationRequest.findMany({ orderBy: { createdAt: 'desc' } }); res.json(items); } catch(e) { res.status(500).json({ error: "Lỗi lấy đánh giá" }); } });
app.post('/api/evaluations', async (req, res) => { try { const item = await prisma.evaluationRequest.create({ data: req.body }); res.json(item); } catch(e) { res.status(500).json({ error: "Lỗi lưu đánh giá" }); } });

// ==========================================
// 7. PHỤC VỤ FILE TĨNH
// ==========================================
app.get('/api/ping', (req, res) => { res.json({ status: "OK", mode: "FULL_VERSION" }); });

const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
    console.log(`[STATIC] Serving: ${distPath}`);
    app.use(express.static(distPath));
}
app.get('*', (req, res) => { 
    if (fs.existsSync(path.join(distPath, 'index.html'))) res.sendFile(path.join(distPath, 'index.html'));
    else res.send("<h1>Backend Running. Waiting for Frontend Build...</h1>");
});

app.listen(PORT, '0.0.0.0', () => { console.log(`✅ Server running on port ${PORT}`); });