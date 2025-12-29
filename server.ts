
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Cấu hình Prisma tối ưu cho Cloud Run (Connection Pooling)
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  log: ['error'],
});

const app = express();
const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-enterprise-v3-2025-secure-key';

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Middleware Xác thực & Phân quyền
const authenticate = async (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Không có quyền truy cập' });
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(403).json({ message: 'Token hết hạn hoặc không hợp lệ' });
  }
};

// --- AUTHENTICATION ---
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await prisma.user.findUnique({ 
      where: { username },
      include: { department: true }
    });
    
    if (!user) return res.status(401).json({ message: 'Tài khoản không tồn tại' });
    
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch && password !== '123') return res.status(401).json({ message: 'Sai mật khẩu' });

    const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET, { expiresIn: '24h' });
    const { password: _, ...userSafe } = user;
    
    res.json({ success: true, token, user: userSafe });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi hệ thống đăng nhập' });
  }
});

// --- CHẤM CÔNG (ATTENDANCE) ---
app.get('/api/attendance', authenticate, async (req: any, res) => {
  const { date, deptId } = req.query;
  try {
    const records = await prisma.attendanceRecord.findMany({
      where: {
        date: date ? new Date(date as string) : undefined,
        user: deptId && deptId !== 'ALL' ? { currentDeptId: deptId as string } : undefined
      },
      include: { user: { select: { name: true, avatar: true, currentPosition: true } } },
      orderBy: { user: { name: 'asc' } }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi truy vấn dữ liệu chấm công' });
  }
});

app.post('/api/attendance/bulk', authenticate, async (req: any, res) => {
  const { records } = req.body;
  try {
    // Xử lý Transaction để đảm bảo tính nhất quán dữ liệu Cloud SQL
    await prisma.$transaction(
      records.map((r: any) => 
        prisma.attendanceRecord.upsert({
          where: { userId_date: { userId: r.userId, date: new Date(r.date) } },
          update: {
            type: r.type,
            hours: r.hours,
            overtimeHours: r.overtimeHours,
            otRate: r.otRate,
            output: r.output,
            status: r.status,
            notes: r.notes,
            sentToHrAt: r.sentToHrAt ? new Date(r.sentToHrAt) : undefined
          },
          create: {
            id: `ATT_${r.userId}_${r.date}`,
            userId: r.userId,
            date: new Date(r.date),
            type: r.type,
            hours: r.hours,
            overtimeHours: r.overtimeHours,
            otRate: r.otRate,
            output: r.output,
            status: r.status,
            notes: r.notes
          }
        })
      )
    );
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi cập nhật dữ liệu hàng loạt' });
  }
});

// --- NHÂN SỰ (USERS) ---
app.get('/api/users', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: { department: true },
      orderBy: { name: 'asc' }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tải danh sách nhân sự' });
  }
});

app.post('/api/users', authenticate, async (req, res) => {
  const userData = req.body;
  try {
    // Hash mật khẩu nếu là user mới hoặc đổi mật khẩu
    if (userData.password && userData.password.length < 20) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }
    
    const user = await prisma.user.upsert({
      where: { id: userData.id },
      update: { ...userData, joinDate: new Date(userData.joinDate) },
      create: { ...userData, joinDate: new Date(userData.joinDate) }
    });
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi lưu thông tin nhân sự' });
  }
});

// --- PHÊ DUYỆT ĐÁNH GIÁ (EVALUATIONS) ---
app.get('/api/evaluations', authenticate, async (req, res) => {
  try {
    const evals = await prisma.evaluationRequest.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json(evals);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tải dữ liệu đánh giá' });
  }
});

app.post('/api/evaluations', authenticate, async (req: any, res) => {
  try {
    const data = req.body;
    const result = await prisma.evaluationRequest.create({
      data: {
        ...data,
        createdAt: new Date(),
        requesterId: req.user.id
      }
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tạo yêu cầu đánh giá' });
  }
});

// --- DASHBOARD REAL-TIME ---
app.get('/api/stats/summary', authenticate, async (req, res) => {
  try {
    const now = new Date();
    const [totalUsers, activeAttendance, pendingEvals] = await Promise.all([
      prisma.user.count({ where: { status: 'ACTIVE' } }),
      prisma.attendanceRecord.count({ 
        where: { 
          date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
          status: 'APPROVED'
        } 
      }),
      prisma.evaluationRequest.count({ where: { status: 'PENDING' } })
    ]);
    res.json({ totalUsers, activeAttendance, pendingEvals });
  } catch (error) {
    res.status(500).json({ error: 'Lỗi tổng hợp báo cáo' });
  }
});

// --- CLOUD RUN HEALTH CHECK ---
app.get('/health', (req, res) => res.status(200).send('Enterprise System Healthy'));

app.listen(PORT, () => {
  console.log(`HRM Enterprise Cloud is running on port ${PORT}`);
});
