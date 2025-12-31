import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Import Seeder
import { seedDatabase } from './seeder';

// --- ERROR TRAP ---
process.on('uncaughtException', (err) => { console.error('🔥 CRITICAL:', err); });
process.on('unhandledRejection', (reason, promise) => { console.error('🔥 PROMISE:', reason); });

console.log("=== SERVER RESTARTING (FIX DATABASE SYNC) ===");

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

// === DB INIT ===
async function initDatabase() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("--> DB Connected.");
        
        // Tạo Config mặc định
        const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
        if (!config) {
            await prisma.systemConfig.create({
                data: { id: "default_config", baseSalary: 1800000, standardWorkDays: 26, insuranceBaseSalary: 1800000, maxInsuranceBase: 36000000 }
            });
        }
        // Tạo Admin mặc định
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

// Helper CRUD
const createCrud = (modelName: string, routes: string[]) => {
    // @ts-ignore
    const model = prisma[modelName];
    routes.forEach(route => {
        app.get(`/api/${route}`, async (req, res) => {
            try { const items = await model.findMany(); res.json(items); } 
            catch(e: any) { res.status(500).json({ error: e.message }); }
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
            } catch(e: any) { res.status(500).json({ error: e.message }); }
        });
        app.delete(`/api/${route}/:id`, async (req, res) => {
            try { await model.delete({ where: { id: req.params.id } }); res.json({ success: true }); } 
            catch(e: any) { res.status(500).json({ error: e.message }); }
        });
    });
};

// API Config (Đa dạng hóa route)
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

// === API USER (QUAN TRỌNG: ĐÃ THÊM BỘ LỌC DỮ LIỆU) ===
app.post('/api/users', async (req, res) => {
  try {
    const raw = req.body;
    console.log("--> Nhận dữ liệu User:", JSON.stringify(raw));

    // 1. TẠO ĐỐI TƯỢNG SẠCH (Chỉ lấy trường cần thiết)
    const cleanData: any = {
        id: raw.id || "user_" + Date.now(),
        username: raw.username,
        name: raw.name,
        email: raw.email || null,
        phone: raw.phone || null,
        status: raw.status || "ACTIVE",
        roles: (raw.roles && raw.roles.length > 0) ? raw.roles : ["NHAN_VIEN"],
        paymentType: raw.paymentType || "TIME",
        // Ép kiểu số để tránh lỗi DB
        efficiencySalary: Number(raw.efficiencySalary) || 0,
        pieceworkUnitPrice: Number(raw.pieceworkUnitPrice) || 0,
        reservedBonusAmount: Number(raw.reservedBonusAmount) || 0,
        probationRate: Number(raw.probationRate) || 100,
        numberOfDependents: Number(raw.numberOfDependents) || 0,
        avatar: raw.avatar || null,
        // Map departmentId sang currentDeptId
        currentDeptId: raw.currentDeptId || raw.departmentId || null
    };

    // Nếu currentDeptId rỗng thì cho về null
    if (!cleanData.currentDeptId || cleanData.currentDeptId === "") {
        cleanData.currentDeptId = null;
    }

    // 2. XỬ LÝ NGÀY THÁNG (Fix lỗi 500 Invalid Date)
    if (raw.joinDate && raw.joinDate !== "") {
        try {
            cleanData.joinDate = new Date(raw.joinDate).toISOString();
        } catch {
            cleanData.joinDate = new Date().toISOString();
        }
    } else {
        cleanData.joinDate = new Date().toISOString();
    }

    // 3. XỬ LÝ MẬT KHẨU
    if (raw.password && raw.password.trim() !== "") {
        const salt = await bcrypt.genSalt(10);
        cleanData.password = await bcrypt.hash(raw.password, salt);
    } else if (!raw.id) {
        // Tạo mới mặc định pass 123
        const salt = await bcrypt.genSalt(10);
        cleanData.password = await bcrypt.hash("123", salt);
    }

    console.log("--> Dữ liệu sạch sẽ lưu:", JSON.stringify(cleanData));

    const user = await prisma.user.upsert({
      where: { id: cleanData.id },
      update: cleanData,
      create: cleanData
    });
    
    res.json(user);
  } catch (e: any) { 
      console.error("LỖI LƯU USER:", e);
      // Trả về lỗi chi tiết cho Frontend xem
      res.status(500).json({ error: "Lỗi Server: " + e.message }); 
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
    catch (e) { res.status(500).json({ error: "Lỗi xóa User" }); }
});

app.get('/api/attendance', async (req, res) => {
    try { const { month } = req.query; const records = await prisma.attendanceRecord.findMany({ where: month ? { date: { startsWith: month as string } } : {} }); res.json(records); } 
    catch(e: any) { res.status(500).json({ error: e.message }); }
});
app.post('/api/attendance', async (req, res) => {
    try {
        const data = req.body; const records = Array.isArray(data) ? data : [data]; const results = [];
        for (const rec of records) results.push(await prisma.attendanceRecord.upsert({ where: { userId_date: { userId: rec.userId, date: rec.date } }, update: rec, create: rec }));
        res.json({ success: true, count: results.length });
    } catch(e: any) { res.status(500).json({ error: e.message }); }
});

// API Nạp dữ liệu
app.get('/api/seed-data-secret', async (req, res) => {
    try {
        await seedDatabase();
        res.json({ success: true, message: "OK! Dữ liệu đã được nạp." });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// Static Files
app.get('/api/ping', (req, res) => { res.json({ status: "OK" }); });
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) app.use(express.static(distPath));
app.get('*', (req, res) => { 
    if (fs.existsSync(path.join(distPath, 'index.html'))) res.sendFile(path.join(distPath, 'index.html'));
    else res.send("Backend OK. Frontend waiting...");
});

app.listen(PORT, '0.0.0.0', () => { console.log(`Server running on ${PORT}`); });