import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- IMPORT SEEDER ---
// Lưu ý: File seeder.ts phải nằm cùng thư mục gốc với server.ts
import { seedDatabase } from './seeder';

// --- GÀI BẪY BẮT LỖI TOÀN CỤC (CRITICAL ERROR TRAP) ---
// Giúp server không bị crash im lặng, in lỗi chi tiết ra log để debug
process.on('uncaughtException', (err) => {
    console.error('🔥 LỖI CHẾT NGƯỜI (Uncaught Exception):', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('🔥 LỖI PROMISE (Unhandled Rejection):', reason);
});

console.log("=== SERVER ĐANG KHỞI ĐỘNG (PHIÊN BẢN FULL - KHÔNG CẮT BỚT) ===");

const app = express();
// Ép kiểu số cho PORT để tránh lỗi
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

// === TỰ ĐỘNG KHỞI TẠO DATABASE ===
async function initDatabase() {
    try {
        console.log("--> [DB] Đang kiểm tra kết nối...");
        await prisma.$queryRaw`SELECT 1`; // Test connection
        console.log("--> [DB] Kết nối Database thành công.");

        // 1. Tự động tạo System Config mặc định nếu chưa có
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

        // 2. Tự động tạo Admin mặc định nếu chưa có user nào
        const userCount = await prisma.user.count();
        if (userCount === 0) {
            console.log("--> [DB] Database trống. Đang tạo Admin mặc định (admin/123)...");
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash("123", salt);
            await prisma.user.create({
                data: {
                    id: "admin_01",
                    username: "admin",
                    password: hashedPassword,
                    name: "Quản Trị Hệ Thống",
                    roles: ["ADMIN"], // Lưu dạng JSON Array
                    status: "ACTIVE"
                }
            });
        }

    } catch (e) {
        console.error("--> [DB LỖI] Không thể kết nối DB (Server vẫn sẽ chạy tiếp để phục vụ Web). Lỗi:", e);
    }
}

// Gọi hàm khởi tạo ngay khi server start
initDatabase();

// Middleware
app.use(cors());
// Tăng giới hạn body lên 10mb để upload ảnh/file không bị lỗi
app.use(express.json({ limit: '10mb' }));

// --- CÁC HÀM API CRUD CHUNG ---
// Hàm này giúp tạo nhanh API cho các bảng đơn giản
const createCrud = (modelName: string, route: string) => {
    // @ts-ignore
    const model = prisma[modelName];

    // GET ALL
    app.get(`/api/${route}`, async (req, res) => {
        try {
            const items = await model.findMany();
            res.json(items);
        } catch (e: any) {
            console.error(`Lỗi lấy ${route}:`, e);
            res.status(500).json({ error: `Lỗi lấy ${route}: ${e.message}` });
        }
    });

    // CREATE / UPDATE (Upsert)
    app.post(`/api/${route}`, async (req, res) => {
        try {
            const data = req.body;
            // Upsert: Có ID thì sửa, không có thì thêm mới
            const item = await model.upsert({
                where: { id: data.id || "new_record_id" },
                update: data,
                create: { ...data, id: data.id || `${route}_` + Date.now() }
            });
            res.json(item);
        } catch (e: any) {
            console.error(`Lỗi lưu ${route}:`, e);
            res.status(500).json({ error: `Lỗi lưu ${route}: ${e.message}` });
        }
    });

    // DELETE
    app.delete(`/api/${route}/:id`, async (req, res) => {
        try {
            await model.delete({ where: { id: req.params.id } });
            res.json({ success: true });
        } catch (e: any) {
            console.error(`Lỗi xóa ${route}:`, e);
            res.status(500).json({ error: `Lỗi xóa ${route}: ${e.message}` });
        }
    });
};

// ==========================================
// API MODULE: AUTH & USER
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) return res.status(401).json({ success: false, message: 'Sai tài khoản' });

        let isMatch = false;
        // Hỗ trợ cả pass thường (cho data cũ) và pass mã hóa
        if (user.password.startsWith('$2')) {
            isMatch = await bcrypt.compare(password, user.password);
        } else {
            isMatch = (password === user.password);
        }

        if (isMatch) {
            // @ts-ignore
            const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
            // Loại bỏ password khi trả về
            const { password: _, ...userData } = user;
            res.json({ success: true, token, user: userData });
        } else {
            res.status(401).json({ success: false, message: 'Sai mật khẩu' });
        }
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ success: false, message: 'Lỗi Server' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        // Lấy danh sách user kèm thông tin phòng ban
        const users = await prisma.user.findMany({ include: { department: true } });
        // @ts-ignore
        res.json(users.map(({ password, ...u }) => u));
    } catch (e) {
        console.error("Get Users Error:", e);
        res.status(500).json({ error: "Lỗi lấy users" });
    }
});

// *** API LƯU USER QUAN TRỌNG (ĐÃ SỬA LỖI & THÊM LOGIC MẶC ĐỊNH) ***
app.post('/api/users', async (req, res) => {
    try {
        const data = req.body;
        console.log("--> Đang xử lý lưu User:", JSON.stringify(data)); // Log dữ liệu nhận được để debug

        // 1. FIX LỖI: Map departmentId (Frontend gửi) sang currentDeptId (Backend cần)
        // Đây là nguyên nhân chính gây lỗi 500 khi Prisma nhận được trường lạ
        if (data.departmentId) {
            data.currentDeptId = data.departmentId;
            delete data.departmentId; // Xóa trường cũ đi để Prisma không báo lỗi
        }
        // Xử lý trường hợp gửi chuỗi rỗng
        if (data.currentDeptId === "") {
            data.currentDeptId = null;
        }

        // 2. Xử lý Mật khẩu
        if (data.password && data.password.trim() !== "") {
            const salt = await bcrypt.genSalt(10);
            data.password = await bcrypt.hash(data.password, salt);
        } else {
            delete data.password; // Nếu không gửi pass thì giữ nguyên pass cũ
        }

        // 3. TỰ ĐỘNG ĐIỀN THÔNG TIN CÒN THIẾU (Fix lỗi 500 khi thêm mới)
        // Nếu không chọn quyền, mặc định là NHAN_VIEN
        if (!data.roles || data.roles.length === 0) {
            data.roles = ["NHAN_VIEN"];
        }

        // Các giá trị mặc định bắt buộc (Tránh lỗi NULL ở Database)
        if (!data.paymentType) data.paymentType = "TIME";
        if (data.efficiencySalary === undefined) data.efficiencySalary = 0;
        if (data.pieceworkUnitPrice === undefined) data.pieceworkUnitPrice = 0;
        if (data.reservedBonusAmount === undefined) data.reservedBonusAmount = 0;
        if (data.probationRate === undefined) data.probationRate = 100;
        if (data.numberOfDependents === undefined) data.numberOfDependents = 0;
        if (!data.status) data.status = "ACTIVE";

        // 4. Lưu vào DB (Upsert)
        const user = await prisma.user.upsert({
            where: { id: data.id || "new_" + Date.now() },
            update: data,
            create: { ...data, id: data.id || "user_" + Date.now() }
        });

        res.json(user);
    } catch (e: any) {
        console.error("Lỗi lưu User:", e);
        // Trả về lỗi chi tiết cho client thấy
        res.status(500).json({ error: "Lỗi lưu User: " + e.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch (e: any) {
        console.error("Delete User Error:", e);
        res.status(500).json({ error: "Lỗi xóa User: " + e.message });
    }
});

// ==========================================
// API MODULE: CORE DATA
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
// API MODULE: SEEDER & LOGIC
// ==========================================

// --- API NẠP DỮ LIỆU TỰ ĐỘNG (Link bí mật) ---
app.get('/api/seed-data-secret', async (req, res) => {
    try {
        console.log("--> [SEEDER] Đang kích hoạt nạp dữ liệu...");
        await seedDatabase();
        res.json({ success: true, message: "Dữ liệu đã được nạp thành công! Vui lòng F5 lại trang chủ." });
    } catch (error: any) {
        console.error("Lỗi Seeder:", error);
        res.status(500).json({ success: false, error: "Lỗi nạp dữ liệu: " + error.message });
    }
});

// --- System Config ---
app.get('/api/config/system', async (req, res) => {
    try {
        const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
        res.json(config || {});
    } catch (e) { res.json({}); }
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
    } catch (e: any) { res.status(500).json({ error: "Lỗi lưu config: " + e.message }); }
});

// --- Ranks & Grades (Logic phức tạp hơn vì có bảng con) ---
app.get('/api/ranks', async (req, res) => {
    try {
        const ranks = await prisma.salaryRank.findMany({ include: { grades: true } });
        res.json(ranks);
    } catch (e: any) { res.status(500).json({ error: "Lỗi lấy ranks: " + e.message }); }
});
app.post('/api/ranks', async (req, res) => {
    try {
        const { grades, ...rankData } = req.body;
        // 1. Lưu Rank
        const rank = await prisma.salaryRank.upsert({
            where: { id: rankData.id || "new_" },
            update: rankData,
            create: { ...rankData, id: rankData.id || "rank_" + Date.now() }
        });
        // 2. Lưu Grades con (nếu có)
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
    } catch (e: any) { res.status(500).json({ error: "Lỗi lưu rank: " + e.message }); }
});

// --- Attendance (Chấm công) ---
app.get('/api/attendance', async (req, res) => {
    try {
        const { month } = req.query;
        const records = await prisma.attendanceRecord.findMany({
            where: month ? { date: { startsWith: month as string } } : {}
        });
        res.json(records);
    } catch (e: any) { res.status(500).json({ error: "Lỗi lấy chấm công: " + e.message }); }
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
    } catch (e: any) { res.status(500).json({ error: "Lỗi lưu chấm công: " + e.message }); }
});

// --- Salary Records (Bảng lương) ---
app.get('/api/salary-records', async (req, res) => {
    try {
        const { month } = req.query;
        const records = await prisma.salaryRecord.findMany({
            where: month ? { date: month as string } : {}
        });
        res.json(records);
    } catch (e: any) { res.status(500).json({ error: "Lỗi lấy bảng lương: " + e.message }); }
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
    } catch (e: any) { res.status(500).json({ error: "Lỗi lưu bảng lương: " + e.message }); }
});

// --- Evaluations (Đánh giá) ---
app.get('/api/evaluations', async (req, res) => {
    try {
        const items = await prisma.evaluationRequest.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(items);
    } catch (e: any) { res.status(500).json({ error: "Lỗi lấy đánh giá: " + e.message }); }
});
app.post('/api/evaluations', async (req, res) => {
    try {
        const item = await prisma.evaluationRequest.create({ data: req.body });
        res.json(item);
    } catch (e: any) { res.status(500).json({ error: "Lỗi lưu đánh giá: " + e.message }); }
});

// ==========================================
// 7. PHỤC VỤ FILE TĨNH (FRONTEND)
// ==========================================
app.get('/api/ping', (req, res) => {
    res.json({ status: "OK", mode: "FULL_VERSION" });
});

// Trỏ đúng vào thư mục 'dist' do Vite build ra (nằm cùng cấp với server.ts vì root là .)
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
        res.send("<h1>Server Backend đang chạy.</h1><p>Đang chờ Frontend build xong (thư mục dist chưa được tạo).</p>");
    }
});

// Lắng nghe cổng
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Backend HRM đã chạy thành công tại cổng ${PORT}`);
});