import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- 1. GÀI BẪY BẮT LỖI (Giúp Server không bị sập im lặng) ---
// --- 1. GÀI BẪY BẮT LỖI (Quan trọng để Server không sập nguồn) ---
process.on('uncaughtException', (err) => {
console.error('🔥 LỖI CHẾT NGƯỜI (Uncaught Exception):', err);
  // Không exit process để giữ server sống cho bạn debug
});
process.on('unhandledRejection', (reason, promise) => {
console.error('🔥 LỖI PROMISE (Unhandled Rejection):', reason);
});

console.log("=== SERVER ĐANG KHỞI ĐỘNG (FINAL STABLE VERSION) ===");
console.log("=== SERVER ĐANG KHỞI ĐỘNG (STABLE VERSION) ===");

const app = express();
// Ép kiểu số cho PORT
// Ép kiểu số nguyên cho PORT (quan trọng với Cloud Run)
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

// === 2. TỰ ĐỘNG KHỞI TẠO DATABASE ===
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// === 2. TỰ ĐỘNG KHỞI TẠO DATABASE (Non-blocking) ===
async function initDatabase() {
try {
console.log("--> [DB] Đang kiểm tra kết nối...");
    // Query nhẹ để test kết nối
await prisma.$queryRaw`SELECT 1`;
console.log("--> [DB] Kết nối Database thành công.");

    // Tự động tạo System Config mặc định nếu bảng trống
    // Tạo cấu hình mặc định nếu chưa có
const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
if (!config) {
console.log("--> [DB] Đang tạo cấu hình hệ thống mặc định...");
@@ -45,16 +48,13 @@ async function initDatabase() {
});
}
} catch (e) {
    console.error("--> [DB LỖI] Không thể kết nối DB (Server vẫn sẽ chạy tiếp để phục vụ Web). Lỗi:", e);
    console.error("--> [DB LỖI] Không thể kết nối DB (Web vẫn chạy ở chế độ hạn chế). Lỗi:", e);
}
}
// Chạy ngay khi start
// Gọi hàm này nhưng không await để server start ngay lập tức
initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- 3. CÁC HÀM API CRUD CHUNG ---
// --- 3. HELPER TẠO API NHANH ---
const createCrud = (modelName: string, route: string) => {
// @ts-ignore
const model = prisma[modelName];
@@ -96,7 +96,6 @@ app.post('/api/login', async (req, res) => {
if (!user) return res.status(401).json({ success: false, message: 'Sai tài khoản' });

let isMatch = false;
    // Kiểm tra pass mã hóa hoặc pass thường
if (user.password.startsWith('$2')) {
isMatch = await bcrypt.compare(password, user.password);
} else {
@@ -105,7 +104,6 @@ app.post('/api/login', async (req, res) => {

if (isMatch) {
const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
      // Loại bỏ password khi trả về
const { password: _, ...userData } = user;
res.json({ success: true, token, user: userData });
} else {
@@ -124,7 +122,6 @@ app.get('/api/users', async (req, res) => {
app.post('/api/users', async (req, res) => {
try {
const data = req.body;
    // Mã hóa mật khẩu nếu có nhập mới
if (data.password && data.password.trim() !== "") {
const salt = await bcrypt.genSalt(10);
data.password = await bcrypt.hash(data.password, salt);
@@ -139,8 +136,10 @@ app.post('/api/users', async (req, res) => {
} catch (e) { res.status(500).json({ error: "Lỗi lưu User" }); }
});
app.delete('/api/users/:id', async (req, res) => {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
    try {
        await prisma.user.delete({ where: { id: req.params.id } });
        res.json({ success: true });
    } catch(e) { res.status(500).json({ error: "Lỗi xóa user" }); }
});

// ==========================================
@@ -164,55 +163,65 @@ createCrud('annualBonusPolicy', 'bonus-policies');

// --- System Config ---
app.get('/api/config/system', async (req, res) => {
    const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
    res.json(config || {});
    try {
        const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
        res.json(config || {});
    } catch(e) { res.json({}); }
});
app.post('/api/config/system', async (req, res) => {
    const data = req.body;
    const config = await prisma.systemConfig.upsert({
        where: { id: "default_config" },
        update: data,
        create: { ...data, id: "default_config" }
    });
    res.json(config);
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
    const ranks = await prisma.salaryRank.findMany({ include: { grades: true } });
    res.json(ranks);
    try {
        const ranks = await prisma.salaryRank.findMany({ include: { grades: true } });
        res.json(ranks);
    } catch(e) { res.status(500).json({error: "Lỗi lấy ranks"}); }
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
    }
    res.json(rank);
        res.json(rank);
    } catch(e) { res.status(500).json({error: "Lỗi lưu rank"}); }
});

// --- Attendance (Chấm công) ---
// --- Attendance ---
app.get('/api/attendance', async (req, res) => {
    const { month } = req.query; 
    const records = await prisma.attendanceRecord.findMany({
        where: month ? { date: { startsWith: month as string } } : {}
    });
    res.json(records);
    try {
        const { month } = req.query; 
        const records = await prisma.attendanceRecord.findMany({
            where: month ? { date: { startsWith: month as string } } : {}
        });
        res.json(records);
    } catch(e) { res.status(500).json({error: "Lỗi lấy chấm công"}); }
});
app.post('/api/attendance', async (req, res) => {
    const data = req.body; 
    const records = Array.isArray(data) ? data : [data];
try {
        const data = req.body; 
        const records = Array.isArray(data) ? data : [data];
const results = [];
for (const rec of records) {
const saved = await prisma.attendanceRecord.upsert({
@@ -223,66 +232,4 @@ app.post('/api/attendance', async (req, res) => {
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
    } catch(e) { res.status
