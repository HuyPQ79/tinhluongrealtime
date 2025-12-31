import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- IMPORT SEEDER ---
import { seedDatabase } from './seeder';

// --- ERROR TRAP ---
process.on('uncaughtException', (err) => { console.error('🔥 CRITICAL:', err); });
process.on('unhandledRejection', (reason, promise) => { console.error('🔥 PROMISE:', reason); });

console.log("=== SERVER RESTARTING (FIX JOINDATE + ALIAS ROUTES) ===");

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

// =========================
// Helpers (chuẩn hoá dữ liệu từ Frontend)
// =========================
// Prisma DateTime cần ISO-8601 đầy đủ. Frontend đôi khi gửi "YYYY-MM-DD".
// Hàm này cố gắng parse nhiều dạng; nếu không parse được thì trả undefined.
function normalizeDateTime(input: any): Date | undefined {
    if (input === null || input === undefined) return undefined;
    if (input instanceof Date && !isNaN(input.getTime())) return input;

    // Timestamp số
    if (typeof input === 'number') {
        const d = new Date(input);
        return isNaN(d.getTime()) ? undefined : d;
    }

    if (typeof input !== 'string') return undefined;
    const s = input.trim();
    if (!s) return undefined;

    // Dạng YYYY-MM-DD (date-only)
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
        const d = new Date(`${s}T00:00:00.000Z`);
        return isNaN(d.getTime()) ? undefined : d;
    }

    // Dạng ISO đầy đủ
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
}

// Date-only (AttendanceRecord.date là @db.Date) — vẫn dùng Date object.
function normalizeDateOnly(input: any): Date | undefined {
    const d = normalizeDateTime(input);
    if (!d) return undefined;
    // Cắt thời gian về 00:00 UTC để ổn định
    const iso = d.toISOString().slice(0, 10);
    const d0 = new Date(`${iso}T00:00:00.000Z`);
    return isNaN(d0.getTime()) ? undefined : d0;
}

// === DB INIT ===
async function initDatabase() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("--> DB Connected.");
        
        // Default Config
        const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
        if (!config) {
            await prisma.systemConfig.create({
                data: { id: "default_config", baseSalary: 1800000, standardWorkDays: 26, insuranceBaseSalary: 1800000, maxInsuranceBase: 36000000 }
            });
        }
        // Default Admin
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            const salt = await bcrypt.genSalt(10);
            await prisma.user.create({
                data: { id: "admin_01", username: "admin", password: await bcrypt.hash("123", salt), name: "Quản Trị Hệ Thống", roles: ["ADMIN"], status: "ACTIVE" }
            });
        }
    } catch (e) { console.error("DB Init Error:", e); }
}
initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Middleware log request
app.use((req, res, next) => {
    console.log(`[REQ] ${req.method} ${req.url}`);
    next();
});

// --- HELPER: TẠO API VỚI NHIỀU TÊN GỌI KHÁC NHAU ---
// Frontend gọi api/formulas hay api/salary-formulas đều được
const createCrud = (modelName: string, routes: string[]) => {
    // @ts-ignore
    const model = prisma[modelName];
    routes.forEach(route => {
        app.get(`/api/${route}`, async (req, res) => {
            try { const items = await model.findMany(); res.json(items); } 
            catch(e: any) { res.status(500).json({ message: e.message }); }
        });
        app.post(`/api/${route}`, async (req, res) => {
            try {
                const data = req.body;
                const item = await model.upsert({
                    where: { id: data.id || "new_" }, 
                    update: data, 
                    create: { ...data, id: data.id || `rec_${Date.now()}` }
                });
                res.json(item);
            } catch(e: any) { res.status(500).json({ message: e.message }); }
        });
        app.delete(`/api/${route}/:id`, async (req, res) => {
            try { await model.delete({ where: { id: req.params.id } }); res.json({ success: true }); } 
            catch(e: any) { res.status(500).json({ message: e.message }); }
        });
    });
};

// ==========================================
// API CONFIG (MỞ RỘNG ROUTE ĐỂ FRONTEND KHÔNG BỊ 404)
// ==========================================
createCrud('salaryFormula', ['formulas', 'salary-formulas']); 
createCrud('salaryVariable', ['variables', 'salary-variables']);
createCrud('criterionGroup', ['criteria/groups', 'criterion-groups']);
createCrud('criterion', ['criteria/items', 'criteria', 'criterions']); 
createCrud('department', ['departments']);
createCrud('salaryRank', ['ranks', 'salary-ranks']);
createCrud('dailyWorkItem', ['daily-work-items', 'daily-works']);
createCrud('pieceworkConfig', ['piecework-configs']);
createCrud('holiday', ['holidays']);
createCrud('auditLog', ['audit', 'audit-logs']);

// ==========================================
// API USER (FIX LỖI JOINDATE & 500 ERROR)
// ==========================================
app.post('/api/users', async (req, res) => {
  try {
    const raw = req.body;
    console.log("--> User Data Raw:", JSON.stringify(raw));

    // 1. CHUẨN HÓA DỮ LIỆU (Tránh lỗi thừa trường)
    const cleanData: any = {
        id: raw.id || "user_" + Date.now(),
        username: raw.username,
        name: raw.name,
        email: raw.email || null,
        phone: raw.phone || null,
        status: raw.status || "ACTIVE",
        roles: (raw.roles && raw.roles.length > 0) ? raw.roles : ["NHAN_VIEN"],
        paymentType: raw.paymentType || "TIME",
        efficiencySalary: raw.efficiencySalary || 0,
        pieceworkUnitPrice: raw.pieceworkUnitPrice || 0,
        reservedBonusAmount: raw.reservedBonusAmount || 0,
        probationRate: raw.probationRate || 100,
        numberOfDependents: raw.numberOfDependents || 0,
        // Map departmentId -> currentDeptId
        currentDeptId: raw.currentDeptId || raw.departmentId || null
    };

    // 2. FIX LỖI joinDate (Prisma DateTime KHÔNG nhận "YYYY-MM-DD")
    // - Nếu frontend gửi joinDate hợp lệ: convert -> Date
    // - Nếu joinDate rỗng/không hợp lệ: KHÔNG set trường này để Prisma dùng @default(now())
    const jd = normalizeDateTime(raw.joinDate);
    if (jd) cleanData.joinDate = jd;

    // 3. Xử lý Password
    if (raw.password && raw.password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        cleanData.password = await bcrypt.hash(raw.password, salt);
    } else if (!raw.id) {
        // Tạo mới bắt buộc có pass
        const salt = await bcrypt.genSalt(10);
        cleanData.password = await bcrypt.hash("123", salt);
    }

    if (cleanData.currentDeptId === "") cleanData.currentDeptId = null;

    console.log("--> User Data Clean:", JSON.stringify(cleanData));

    const user = await prisma.user.upsert({
      where: { id: cleanData.id },
      update: cleanData,
      create: cleanData
    });
    
    res.json(user);
  } catch (e: any) { 
      console.error("USER ERROR:", e);
      res.status(500).json({ message: "Lỗi lưu User: " + e.message }); 
  }
});

app.post('/api/login', async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await prisma.user.findUnique({ where: { username } });
      if (!user) return res.status(401).json({ success: false, message: 'Sai tài khoản' });
      const isMatch = user.password.startsWith('$2') ? await bcrypt.compare(password, user.password) : password === user.password;
      if (isMatch) {
        // @ts-ignore
        const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
        const { password: _, ...userData } = user;
        res.json({ success: true, token, user: userData });
      } else { res.status(401).json({ success: false, message: 'Sai mật khẩu' }); }
    } catch (error) { res.status(500).json({ success: false, message: 'Lỗi Server' }); }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({ include: { department: true } });
        // @ts-ignore
        res.json(users.map(({ password, ...u }) => u));
    } catch (e) { res.status(500).json({error: "Lỗi lấy users"}); }
});

app.delete('/api/users/:id', async (req, res) => {
    try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
    catch (e: any) { res.status(500).json({ message: "Lỗi xóa User" + (e?.message ? (": " + e.message) : "") }); }
});

app.get('/api/attendance', async (req, res) => {
    try {
        const { month } = req.query;
        // Frontend truyền month dạng "YYYY-MM".
        // AttendanceRecord.date là Date (@db.Date) nên phải lọc theo khoảng thời gian.
        let where: any = {};
        if (typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
            const start = new Date(`${month}-01T00:00:00.000Z`);
            const [y, m] = month.split('-').map(Number);
            const next = new Date(Date.UTC(y, m, 1, 0, 0, 0)); // tháng kế tiếp
            where = { date: { gte: start, lt: next } };
        }
        const records = await prisma.attendanceRecord.findMany({ where, orderBy: { date: 'asc' } });
        res.json(records);
    } catch(e: any) {
        res.status(500).json({ message: e.message });
    }
});
app.post('/api/attendance', async (req, res) => {
    try {
        const data = req.body;
        const records = Array.isArray(data) ? data : [data];
        const results: any[] = [];
        for (const rec of records) {
            const date = normalizeDateOnly(rec.date);
            if (!date) throw new Error(`Invalid date: ${rec.date}`);
            const payload = { ...rec, date };
            results.push(
                await prisma.attendanceRecord.upsert({
                    where: { userId_date: { userId: rec.userId, date } },
                    update: payload,
                    create: payload
                })
            );
        }
        res.json({ success: true, count: results.length });
    } catch(e: any) {
        res.status(500).json({ message: e.message });
    }
});

// API Nạp dữ liệu
app.get('/api/seed-data-secret', async (req, res) => {
    try {
        await seedDatabase();
        res.json({ success: true, message: "OK" });
    } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

// Static
app.get('/api/ping', (req, res) => { res.json({ status: "OK" }); });
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) app.use(express.static(distPath));
app.get('*', (req, res) => { 
    if (fs.existsSync(path.join(distPath, 'index.html'))) res.sendFile(path.join(distPath, 'index.html'));
    else res.send("Backend OK.");
});

app.listen(PORT, '0.0.0.0', () => { console.log(`Server running on ${PORT}`); });