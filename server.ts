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

console.log("=== SERVER START (ALIGN API WITH services/api.ts) ===");

// --- Helpers ---
const asString = (v: any) => (v === undefined || v === null) ? null : String(v);

// joinDate from FE may be: "YYYY-MM-DD" or ISO or empty.
const normalizeDateTime = (v: any): Date | null => {
    if (v === undefined || v === null) return null;
    if (typeof v === 'string' && v.trim() === '') return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return null;
    return d;
};

// For YYYY-MM filter on string dates
const monthToRange = (month: string) => {
    // month: YYYY-MM
    const [y, m] = month.split('-').map(Number);
    if (!y || !m) return null;
    const mm = String(m).padStart(2, '0');
    const start = `${y}-${mm}-01`;
    const nextMonth = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
    return { start, nextMonth };
};

const app = express();
const PORT = parseInt(process.env.PORT || '8080');
const JWT_SECRET = process.env.JWT_SECRET || 'hrm-super-secret-key';
const prisma = new PrismaClient();

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

// --- HELPER: CRUD nhanh cho các bảng cấu hình ---
// Lưu ý: Prisma upsert yêu cầu "where" là unique. Nếu thiếu id, ta tạo mới để tránh ghi đè nhầm.
const createCrud = (
  modelName: string,
  routes: string[],
  opts?: {
    findManyArgs?: any;
    mapOut?: (row: any) => any;
    mapIn?: (body: any) => any;
  }
) => {
  // @ts-ignore
  const model = prisma[modelName];
  const mapOut = opts?.mapOut || ((x: any) => x);
  const mapIn = opts?.mapIn || ((x: any) => x);

  routes.forEach((route) => {
    app.get(`/api/${route}`, async (req, res) => {
      try {
        const rows = await model.findMany(opts?.findManyArgs || undefined);
        res.json(Array.isArray(rows) ? rows.map(mapOut) : rows);
      } catch (e: any) {
        res.status(500).json({ message: e.message || 'Server error' });
      }
    });

    app.post(`/api/${route}`, async (req, res) => {
      try {
        const data = mapIn(req.body || {});
        if (data?.id) {
          const item = await model.upsert({
            where: { id: data.id },
            update: data,
            create: data,
          });
          return res.json(mapOut(item));
        }
        const created = await model.create({
          data: { ...data, id: `rec_${Date.now()}` },
        });
        res.json(mapOut(created));
      } catch (e: any) {
        res.status(500).json({ message: e.message || 'Server error' });
      }
    });

    app.delete(`/api/${route}/:id`, async (req, res) => {
      try {
        await model.delete({ where: { id: req.params.id } });
        res.json({ success: true });
      } catch (e: any) {
        res.status(500).json({ message: e.message || 'Server error' });
      }
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
createCrud('salaryRank', ['ranks', 'salary-ranks'], {
  // include grades để UI dễ dùng
  findManyArgs: { include: { grades: true } },
  mapOut: (row: any) => {
    // Frontend cần field "order" để sort; nếu chưa có thì tự sinh
    let order = 0;
    try {
      const meta = row?.description ? JSON.parse(row.description) : null;
      order = meta?.order ?? 0;
    } catch (_) {}
    return { ...row, order };
  },
  mapIn: (body: any) => {
    // Lưu order vào description dạng JSON để không phải đổi schema DB
    const { order, ...rest } = body || {};
    let description = rest.description;
    try {
      const old = description ? JSON.parse(description) : {};
      description = JSON.stringify({ ...old, order });
    } catch (_) {
      description = JSON.stringify({ order });
    }
    return { ...rest, description };
  },
});
createCrud('salaryGrade', ['salary-grades', 'grades']);
createCrud('dailyWorkItem', ['daily-work-items', 'daily-works']);
createCrud('pieceworkConfig', ['piecework-configs'], {
  mapOut: (row: any) => ({
    ...row,
    targetOutput: row.targetOutput ?? 0,
    unitPrice: Number(row.unitPrice || 0),
  }),
  mapIn: (body: any) => ({
    ...body,
    targetOutput: body.targetOutput ?? 0,
    unitPrice: body.unitPrice ?? 0,
  }),
});
createCrud('holiday', ['holidays']);
createCrud('bonusType', ['bonus-types']);
createCrud('annualBonusPolicy', ['bonus-policies']);
createCrud('auditLog', ['audit', 'audit-logs']);
createCrud('evaluationRequest', ['evaluations'], {
  findManyArgs: { include: { user: true } },
  mapOut: (row: any) => {
    const user = row.user || {};
    return {
      ...row,
      userName: user.name || '',
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      scope: row.scope || undefined,
    };
  },
});

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
        currentDeptId: raw.currentDeptId || raw.departmentId || null,
        currentPosition: raw.currentPosition || null,
        currentRankId: raw.currentRankId || null,
        currentGradeId: raw.currentGradeId || null,
        gender: raw.gender || null,
        birthday: raw.birthday ? new Date(raw.birthday) : null,
        address: raw.address || null,
        identityNumber: raw.identityNumber || null,
        bankAccount: raw.bankAccount || null,
        bankName: raw.bankName || null,
        taxCode: raw.taxCode || null,
        socialInsuranceNo: raw.socialInsuranceNo || null,
    };

    // 2. FIX LỖI DATE (THỦ PHẠM CHÍNH)
    // Nếu joinDate rỗng hoặc null, lấy ngày hiện tại. Nếu có, ép kiểu về ISO.
    try {
        if (raw.joinDate && raw.joinDate !== "") {
            cleanData.joinDate = new Date(raw.joinDate).toISOString();
        } else {
            cleanData.joinDate = new Date().toISOString();
        }
    } catch (err) {
        console.error("Lỗi Date Parser, dùng ngày mặc định");
        cleanData.joinDate = new Date().toISOString();
    }

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
      res.status(500).json({ error: "Lỗi lưu User: " + e.message }); 
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

// ==========================================
// SYSTEM CONFIG (đúng theo api.getSystemConfig / saveConfig('system'))
// Lưu ý: Frontend gửi nhiều field hơn DB. Ta lưu phần "mở rộng" vào insuranceRules (Json)
// ==========================================
app.get('/api/config/system', async (req, res) => {
  try {
    const cfg = await prisma.systemConfig.findUnique({ where: { id: 'default_config' } });
    // insuranceRules dùng như "extra" để giữ các field mở rộng của frontend
    const extra = (cfg?.insuranceRules as any) || {};
    res.json({
      id: 'default_config',
      baseSalary: Number(cfg?.baseSalary || 0),
      standardWorkDays: cfg?.standardWorkDays ?? 26,
      insuranceBaseSalary: Number(cfg?.insuranceBaseSalary || 0),
      maxInsuranceBase: Number(cfg?.maxInsuranceBase || 0),
      pitSteps: (cfg?.pitSteps as any) || extra.pitSteps || [],
      seniorityRules: (cfg?.seniorityRules as any) || extra.seniorityRules || [],
      // Các field mở rộng (không có cột riêng trong DB)
      isPeriodLocked: extra.isPeriodLocked ?? false,
      autoApproveDays: extra.autoApproveDays ?? 3,
      hrAutoApproveHours: extra.hrAutoApproveHours ?? 24,
      approvalMode: extra.approvalMode ?? 'POST_AUDIT',
      personalRelief: extra.personalRelief ?? 11000000,
      dependentRelief: extra.dependentRelief ?? 4400000,
      insuranceRate: extra.insuranceRate ?? 10.5,
      unionFeeRate: extra.unionFeeRate ?? 1,
      approvalWorkflow: extra.approvalWorkflow || [],
      lastModifiedBy: extra.lastModifiedBy,
      lastModifiedAt: extra.lastModifiedAt,
      hasPendingChanges: extra.hasPendingChanges,
      pendingChangeSummary: extra.pendingChangeSummary,
    });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Lỗi đọc cấu hình' });
  }
});

app.post('/api/config/system', async (req, res) => {
  try {
    const body = req.body || {};
    const known = {
      id: 'default_config',
      baseSalary: body.baseSalary ?? 0,
      standardWorkDays: body.standardWorkDays ?? 26,
      insuranceBaseSalary: body.insuranceBaseSalary ?? 0,
      maxInsuranceBase: body.maxInsuranceBase ?? 0,
      pitSteps: body.pitSteps ?? [],
      seniorityRules: body.seniorityRules ?? [],
      // insuranceRules lưu phần mở rộng
      insuranceRules: {
        isPeriodLocked: body.isPeriodLocked,
        autoApproveDays: body.autoApproveDays,
        hrAutoApproveHours: body.hrAutoApproveHours,
        approvalMode: body.approvalMode,
        personalRelief: body.personalRelief,
        dependentRelief: body.dependentRelief,
        insuranceRate: body.insuranceRate,
        unionFeeRate: body.unionFeeRate,
        approvalWorkflow: body.approvalWorkflow,
        lastModifiedBy: body.lastModifiedBy,
        lastModifiedAt: body.lastModifiedAt || new Date().toISOString(),
        hasPendingChanges: body.hasPendingChanges,
        pendingChangeSummary: body.pendingChangeSummary,
      },
    };

    const cfg = await prisma.systemConfig.upsert({
      where: { id: 'default_config' },
      update: known,
      create: known,
    });
    res.json({ success: true, id: cfg.id });
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Lỗi lưu cấu hình' });
  }
});

app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({ include: { department: true } });
        // Map dữ liệu để khớp với types.ts
        const clean = users.map((u: any) => {
            const { password, ...rest } = u;
            return {
                ...rest,
                avatar: rest.avatar || '',
                salaryHistory: [], // Frontend có thể tính từ lịch sử
                assignedDeptIds: rest.currentDeptId ? [rest.currentDeptId] : [],
                activeAssignments: [],
                joinDate: rest.joinDate ? rest.joinDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            };
        });
        res.json(clean);
    } catch (e) { 
        console.error("Error getting users:", e);
        res.status(500).json({error: "Lỗi lấy users"}); 
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try { await prisma.user.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
    catch (e) { res.status(500).json({ error: "Lỗi xóa User" }); }
});

app.get('/api/attendance', async (req, res) => {
    try { 
        const { month } = req.query; 
        const where = month ? { date: { startsWith: month as string } } : {};
        const records = await prisma.attendanceRecord.findMany({ where });
        // Map dữ liệu để khớp với types.ts
        const clean = records.map((r: any) => ({
            ...r,
            date: r.date, // Đã là string YYYY-MM-DD
            sentToHrAt: r.sentToHrAt ? r.sentToHrAt.toISOString() : undefined,
            rejectionReason: r.rejectionReason || undefined,
            dailyWorkItemId: r.dailyWorkItemId || undefined,
            overtimeDailyWorkItemId: r.overtimeDailyWorkItemId || undefined,
        }));
        res.json(clean); 
    } 
    catch(e: any) { 
        console.error("Error getting attendance:", e);
        res.status(500).json({ error: e.message }); 
    }
});
app.post('/api/attendance', async (req, res) => {
    try {
        const data = req.body; 
        const records = Array.isArray(data) ? data : [data]; 
        const results = [];
        for (const rec of records) {
            // Chuẩn hóa dữ liệu trước khi lưu
            const cleanRec: any = {
                id: rec.id || `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                userId: rec.userId,
                date: rec.date, // YYYY-MM-DD string
                type: rec.type || 'TIME',
                hours: rec.hours ?? 8,
                overtimeHours: rec.overtimeHours ?? 0,
                otRate: rec.otRate ?? 1.5,
                isOvertimeWithOutput: rec.isOvertimeWithOutput ?? false,
                output: rec.output || null,
                pieceworkUnitPrice: rec.pieceworkUnitPrice ? parseFloat(rec.pieceworkUnitPrice) : null,
                dailyWorkItemId: rec.dailyWorkItemId || null,
                overtimeDailyWorkItemId: rec.overtimeDailyWorkItemId || null,
                status: rec.status || 'DRAFT',
                notes: rec.notes || null,
                sentToHrAt: rec.sentToHrAt ? new Date(rec.sentToHrAt) : null,
                rejectionReason: rec.rejectionReason || null,
            };
            results.push(await prisma.attendanceRecord.upsert({ 
                where: { userId_date: { userId: cleanRec.userId, date: cleanRec.date } }, 
                update: cleanRec, 
                create: cleanRec 
            }));
        }
        res.json({ success: true, count: results.length });
    } catch(e: any) { 
        console.error("Error saving attendance:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// ==========================================
// SALARY RECORDS (đúng theo api.getSalaryRecords / saveSalaryRecord)
// date: YYYY-MM, unique (userId,date)
// ==========================================
app.get('/api/salary-records', async (req, res) => {
  try {
    const { month } = req.query;
    const where = month ? { date: { startsWith: month as string } } : {};
    const records = await prisma.salaryRecord.findMany({ 
      where, 
      include: { 
        user: {
          include: {
            department: true
          }
        }
      } 
    });
    // Map dữ liệu để khớp với types.ts
    const clean = records.map((r: any) => {
      const user = r.user || {};
      if (user.password) delete user.password;
      
      return {
        ...r,
        userName: user.name || '',
        positionName: user.currentPosition || '',
        department: user.currentDeptId || '',
        // Đảm bảo tất cả các trường tính toán có giá trị mặc định
        Ctc: r.Ctc ?? 0,
        Ctt: r.Ctt ?? 0,
        Cn: r.Cn ?? 0,
        NCD: r.NCD ?? 0,
        NL: r.NL ?? 0,
        NCL: r.NCL ?? 0,
        NKL: r.NKL ?? 0,
        NCV: r.NCV ?? 0,
        LCB_dm: Number(r.LCB_dm || 0),
        LHQ_dm: Number(r.LHQ_dm || 0),
        LSL_dm: Number(r.LSL_dm || 0),
        SL_khoan: r.SL_khoan ?? 0,
        SL_tt: r.SL_tt ?? 0,
        DG_khoan: Number(r.DG_khoan || 0),
        HS_tn: r.HS_tn ?? 0,
        probationRate: r.probationRate ?? 100,
        otherSalary: Number(r.otherSalary || 0),
        overtimeSalary: Number(r.overtimeSalary || 0),
        unionFee: Number(r.unionFee || 0),
        otherDeductions: Number(r.otherDeductions || 0),
        calculatedSalary: Number(r.calculatedSalary || 0),
        actualBaseSalary: Number(r.actualBaseSalary || 0),
        actualEfficiencySalary: Number(r.actualEfficiencySalary || 0),
        actualPieceworkSalary: Number(r.actualPieceworkSalary || 0),
        totalAllowance: Number(r.totalAllowance || 0),
        totalBonus: Number(r.totalBonus || 0),
        insuranceDeduction: Number(r.insuranceDeduction || 0),
        pitDeduction: Number(r.pitDeduction || 0),
        advancePayment: Number(r.advancePayment || 0),
        netSalary: Number(r.netSalary || 0),
        adjustments: r.adjustments || [],
        calculationLog: r.calculationLog ? (typeof r.calculationLog === 'string' ? r.calculationLog : JSON.stringify(r.calculationLog)) : undefined,
        lastUpdated: r.lastUpdated ? r.lastUpdated.toISOString() : new Date().toISOString(),
        sentToHrAt: r.sentToHrAt ? r.sentToHrAt.toISOString() : undefined,
        rejectionReason: r.rejectionReason || undefined,
      };
    });
    res.json(clean);
  } catch (e: any) {
    res.status(500).json({ message: e.message || 'Lỗi lấy bảng lương' });
  }
});

app.post('/api/salary-records', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.userId || !body.date) {
      return res.status(400).json({ message: 'Thiếu userId hoặc date (YYYY-MM)' });
    }
    
    // Chuẩn hóa dữ liệu trước khi lưu (loại bỏ các trường computed)
    const { userName, positionName, department, ...dbData } = body;
    
    // Đảm bảo các trường Decimal được chuyển đổi đúng
    const cleanData: any = {
      id: dbData.id || `sal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: dbData.userId,
      date: dbData.date,
      status: dbData.status || 'DRAFT',
      Ctc: dbData.Ctc ?? 0,
      Ctt: dbData.Ctt ?? 0,
      Cn: dbData.Cn ?? 0,
      NCD: dbData.NCD ?? 0,
      NL: dbData.NL ?? 0,
      NCL: dbData.NCL ?? 0,
      NKL: dbData.NKL ?? 0,
      NCV: dbData.NCV ?? 0,
      LCB_dm: dbData.LCB_dm ?? 0,
      LHQ_dm: dbData.LHQ_dm ?? 0,
      LSL_dm: dbData.LSL_dm ?? 0,
      SL_khoan: dbData.SL_khoan ?? 0,
      SL_tt: dbData.SL_tt ?? 0,
      DG_khoan: dbData.DG_khoan ?? 0,
      HS_tn: dbData.HS_tn ?? 0,
      probationRate: dbData.probationRate ?? 100,
      actualBaseSalary: dbData.actualBaseSalary ?? 0,
      actualEfficiencySalary: dbData.actualEfficiencySalary ?? 0,
      actualPieceworkSalary: dbData.actualPieceworkSalary ?? 0,
      otherSalary: dbData.otherSalary ?? 0,
      totalAllowance: dbData.totalAllowance ?? 0,
      totalBonus: dbData.totalBonus ?? 0,
      overtimeSalary: dbData.overtimeSalary ?? 0,
      insuranceDeduction: dbData.insuranceDeduction ?? 0,
      pitDeduction: dbData.pitDeduction ?? 0,
      unionFee: dbData.unionFee ?? 0,
      advancePayment: dbData.advancePayment ?? 0,
      otherDeductions: dbData.otherDeductions ?? 0,
      calculatedSalary: dbData.calculatedSalary ?? 0,
      netSalary: dbData.netSalary ?? 0,
      calculationLog: dbData.calculationLog ? (typeof dbData.calculationLog === 'string' ? JSON.parse(dbData.calculationLog) : dbData.calculationLog) : null,
      adjustments: dbData.adjustments ? (Array.isArray(dbData.adjustments) ? dbData.adjustments : JSON.parse(dbData.adjustments)) : null,
      sentToHrAt: dbData.sentToHrAt ? new Date(dbData.sentToHrAt) : null,
      rejectionReason: dbData.rejectionReason || null,
    };
    
    const record = await prisma.salaryRecord.upsert({
      where: { userId_date: { userId: cleanData.userId, date: cleanData.date } },
      update: cleanData,
      create: cleanData,
    });
    
    // Trả về với các trường computed
    const user = await prisma.user.findUnique({ 
      where: { id: record.userId },
      include: { department: true }
    });
    
    const response = {
      ...record,
      userName: user?.name || '',
      positionName: user?.currentPosition || '',
      department: user?.currentDeptId || '',
      lastUpdated: record.lastUpdated ? record.lastUpdated.toISOString() : new Date().toISOString(),
      sentToHrAt: record.sentToHrAt ? record.sentToHrAt.toISOString() : undefined,
    };
    
    res.json(response);
  } catch (e: any) {
    console.error("Error saving salary record:", e);
    res.status(500).json({ message: e.message || 'Lỗi lưu bảng lương' });
  }
});

// ==========================================
// SALARY ADJUSTMENTS & ADVANCE PAYMENT
// ==========================================

// Thêm điều chỉnh vào salary record
app.post('/api/salary-records/:id/adjustments', async (req, res) => {
  try {
    const { id } = req.params;
    const adjustment = req.body;
    
    const record = await prisma.salaryRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
    }
    
    const adjustments = (record.adjustments as any) || [];
    const newAdjustment = {
      id: `adj_${Date.now()}`,
      ...adjustment,
      createdAt: new Date().toISOString(),
    };
    adjustments.push(newAdjustment);
    
    // Cập nhật lại các thành phần lương dựa trên adjustments
    let PC_lh = 0;
    let TH_lh = 0;
    let otherSalaryAdj = 0;
    let otherDeductionsAdj = 0;
    
    for (const adj of adjustments) {
      if (adj.type === 'ALLOWANCE') PC_lh += adj.amount;
      if (adj.type === 'BONUS') TH_lh += adj.amount;
      if (adj.type === 'OTHER_SALARY') otherSalaryAdj += adj.amount;
      if (adj.type === 'OTHER_DEDUCTION') otherDeductionsAdj += adj.amount;
    }
    
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    const gradeData = user?.currentGradeId ? await prisma.salaryGrade.findUnique({ where: { id: user.currentGradeId } }) : null;
    const PC_cd = Number(gradeData?.fixedAllowance || 0);
    
    // Tính lại totalBonus từ fixed bonuses + adjustments
    const fixedBonuses = (gradeData?.fixedBonuses as any) || [];
    const [year, monthNum] = record.date.split('-').map(Number);
    const monthBonus = fixedBonuses.find((b: any) => b.month === monthNum);
    const TH_cd = monthBonus ? Number(monthBonus.amount || 0) : 0;
    const totalBonus = TH_cd + TH_lh;
    
    const totalAllowance = PC_cd + PC_lh;
    
    // Tính lại otherSalary = Lk (từ calculation) + điều chỉnh tay
    const log = (record.calculationLog as any) || {};
    const Lk = log.Lk || 0;
    const otherSalary = Lk + otherSalaryAdj;
    
    const calculatedSalary = Number(record.actualBaseSalary || 0) + Number(record.actualEfficiencySalary || 0) + Number(record.actualPieceworkSalary || 0) + otherSalary + totalAllowance + totalBonus;
    
    const systemConfig = await prisma.systemConfig.findUnique({ where: { id: 'default_config' } });
    const configExtra = (systemConfig?.insuranceRules as any) || {};
    const insuranceRate = configExtra.insuranceRate ?? 10.5;
    const unionFeeRate = configExtra.unionFeeRate ?? 1;
    const personalRelief = configExtra.personalRelief ?? 11000000;
    const dependentRelief = configExtra.dependentRelief ?? 4400000;
    const pitSteps = (systemConfig?.pitSteps as any) || configExtra.pitSteps || [];
    
    const insuranceBase = Math.min(calculatedSalary, Number(systemConfig?.maxInsuranceBase || 36000000));
    const insuranceDeduction = insuranceBase * (insuranceRate / 100);
    const unionFee = insuranceBase * (unionFeeRate / 100);
    
    const TN_ct = calculatedSalary - insuranceDeduction - unionFee - personalRelief - (dependentRelief * (user?.numberOfDependents || 0));
    let pitDeduction = 0;
    if (TN_ct > 0) {
      const sortedSteps = [...pitSteps].sort((a: any, b: any) => a.threshold - b.threshold);
      for (const step of sortedSteps) {
        if (TN_ct <= step.threshold) {
          pitDeduction = (TN_ct * step.rate / 100) - (step.subtraction || 0);
          break;
        }
      }
      if (pitDeduction < 0) pitDeduction = 0;
    }
    
    const advancePayment = Number(record.advancePayment || 0);
    const netSalary = (calculatedSalary - insuranceDeduction - unionFee - pitDeduction - advancePayment - otherDeductionsAdj) * ((user?.probationRate || 100) / 100);
    
    const updated = await prisma.salaryRecord.update({
      where: { id },
      data: {
        adjustments: adjustments as any,
        totalAllowance,
        totalBonus,
        otherSalary,
        otherDeductions: otherDeductionsAdj,
        calculatedSalary,
        insuranceDeduction,
        pitDeduction,
        unionFee,
        netSalary,
      },
    });
    
    res.json(updated);
  } catch (e: any) {
    console.error("Error adding adjustment:", e);
    res.status(500).json({ message: e.message || 'Lỗi thêm điều chỉnh' });
  }
});

// Xóa điều chỉnh - BUG FIX: Tìm deletedAdj TRƯỚC KHI filter
app.delete('/api/salary-records/:id/adjustments/:adjId', async (req, res) => {
  try {
    const { id, adjId } = req.params;
    
    const record = await prisma.salaryRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
    }
    
    const originalAdjustments = (record.adjustments as any) || [];
    
    // BUG FIX: Tìm deletedAdj TRƯỚC KHI filter
    const deletedAdj = originalAdjustments.find((adj: any) => adj.id === adjId);
    
    // Sau đó mới filter để loại bỏ adjustment
    const adjustments = originalAdjustments.filter((adj: any) => adj.id !== adjId);
    
    // Tính lại các thành phần
    let PC_lh = 0;
    let TH_lh = 0;
    let otherSalaryAdj = 0;
    let otherDeductionsAdj = 0;
    
    for (const adj of adjustments) {
      if (adj.type === 'ALLOWANCE') PC_lh += adj.amount;
      if (adj.type === 'BONUS') TH_lh += adj.amount;
      if (adj.type === 'OTHER_SALARY') otherSalaryAdj += adj.amount;
      if (adj.type === 'OTHER_DEDUCTION') otherDeductionsAdj += adj.amount;
    }
    
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    const gradeData = user?.currentGradeId ? await prisma.salaryGrade.findUnique({ where: { id: user.currentGradeId } }) : null;
    const PC_cd = Number(gradeData?.fixedAllowance || 0);
    
    // Tính lại totalBonus
    const fixedBonuses = (gradeData?.fixedBonuses as any) || [];
    const [year, monthNum] = record.date.split('-').map(Number);
    const monthBonus = fixedBonuses.find((b: any) => b.month === monthNum);
    const TH_cd = monthBonus ? Number(monthBonus.amount || 0) : 0;
    const totalBonus = TH_cd + TH_lh;
    
    const totalAllowance = PC_cd + PC_lh;
    
    // Tính lại otherSalary = Lk (từ calculation) + điều chỉnh tay còn lại
    const log = (record.calculationLog as any) || {};
    const Lk = log.Lk || 0;
    const otherSalary = Lk + otherSalaryAdj;
    
    const calculatedSalary = Number(record.actualBaseSalary || 0) + Number(record.actualEfficiencySalary || 0) + Number(record.actualPieceworkSalary || 0) + otherSalary + totalAllowance + totalBonus;
    
    const systemConfig = await prisma.systemConfig.findUnique({ where: { id: 'default_config' } });
    const configExtra = (systemConfig?.insuranceRules as any) || {};
    const insuranceRate = configExtra.insuranceRate ?? 10.5;
    const unionFeeRate = configExtra.unionFeeRate ?? 1;
    const personalRelief = configExtra.personalRelief ?? 11000000;
    const dependentRelief = configExtra.dependentRelief ?? 4400000;
    const pitSteps = (systemConfig?.pitSteps as any) || configExtra.pitSteps || [];
    
    const insuranceBase = Math.min(calculatedSalary, Number(systemConfig?.maxInsuranceBase || 36000000));
    const insuranceDeduction = insuranceBase * (insuranceRate / 100);
    const unionFee = insuranceBase * (unionFeeRate / 100);
    
    const TN_ct = calculatedSalary - insuranceDeduction - unionFee - personalRelief - (dependentRelief * (user?.numberOfDependents || 0));
    let pitDeduction = 0;
    if (TN_ct > 0) {
      const sortedSteps = [...pitSteps].sort((a: any, b: any) => a.threshold - b.threshold);
      for (const step of sortedSteps) {
        if (TN_ct <= step.threshold) {
          pitDeduction = (TN_ct * step.rate / 100) - (step.subtraction || 0);
          break;
        }
      }
      if (pitDeduction < 0) pitDeduction = 0;
    }
    
    const advancePayment = Number(record.advancePayment || 0);
    const netSalary = (calculatedSalary - insuranceDeduction - unionFee - pitDeduction - advancePayment - otherDeductionsAdj) * ((user?.probationRate || 100) / 100);
    
    const updated = await prisma.salaryRecord.update({
      where: { id },
      data: {
        adjustments: adjustments as any,
        totalAllowance,
        totalBonus,
        otherSalary,
        otherDeductions: otherDeductionsAdj,
        calculatedSalary,
        insuranceDeduction,
        pitDeduction,
        unionFee,
        netSalary,
      },
    });
    
    res.json(updated);
  } catch (e: any) {
    console.error("Error deleting adjustment:", e);
    res.status(500).json({ message: e.message || 'Lỗi xóa điều chỉnh' });
  }
});

// Cập nhật tạm ứng
app.put('/api/salary-records/:id/advance-payment', async (req, res) => {
  try {
    const { id } = req.params;
    const { amount } = req.body;
    
    const record = await prisma.salaryRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
    }
    
    const user = await prisma.user.findUnique({ where: { id: record.userId } });
    const systemConfig = await prisma.systemConfig.findUnique({ where: { id: 'default_config' } });
    const configExtra = (systemConfig?.insuranceRules as any) || {};
    const insuranceRate = configExtra.insuranceRate ?? 10.5;
    const unionFeeRate = configExtra.unionFeeRate ?? 1;
    const personalRelief = configExtra.personalRelief ?? 11000000;
    const dependentRelief = configExtra.dependentRelief ?? 4400000;
    const pitSteps = (systemConfig?.pitSteps as any) || configExtra.pitSteps || [];
    
    const calculatedSalary = Number(record.calculatedSalary || 0);
    const insuranceBase = Math.min(calculatedSalary, Number(systemConfig?.maxInsuranceBase || 36000000));
    const insuranceDeduction = insuranceBase * (insuranceRate / 100);
    const unionFee = insuranceBase * (unionFeeRate / 100);
    
    const TN_ct = calculatedSalary - insuranceDeduction - unionFee - personalRelief - (dependentRelief * (user?.numberOfDependents || 0));
    let pitDeduction = 0;
    if (TN_ct > 0) {
      const sortedSteps = [...pitSteps].sort((a: any, b: any) => a.threshold - b.threshold);
      for (const step of sortedSteps) {
        if (TN_ct <= step.threshold) {
          pitDeduction = (TN_ct * step.rate / 100) - (step.subtraction || 0);
          break;
        }
      }
      if (pitDeduction < 0) pitDeduction = 0;
    }
    
    const advancePayment = Number(amount || 0);
    const otherDeductions = Number(record.otherDeductions || 0);
    const netSalary = (calculatedSalary - insuranceDeduction - unionFee - pitDeduction - advancePayment - otherDeductions) * ((user?.probationRate || 100) / 100);
    
    const updated = await prisma.salaryRecord.update({
      where: { id },
      data: {
        advancePayment,
        netSalary,
      },
    });
    
    res.json(updated);
  } catch (e: any) {
    console.error("Error updating advance payment:", e);
    res.status(500).json({ message: e.message || 'Lỗi cập nhật tạm ứng' });
  }
});

// Cập nhật trạng thái bảng lương (approve/reject)
app.put('/api/salary-records/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;
    
    const record = await prisma.salaryRecord.findUnique({ where: { id } });
    if (!record) {
      return res.status(404).json({ message: 'Không tìm thấy bảng lương' });
    }
    
    const updateData: any = { status };
    if (status === 'REJECTED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }
    if (status === 'PENDING_HR' || status === 'APPROVED') {
      updateData.sentToHrAt = new Date();
    }
    
    const updated = await prisma.salaryRecord.update({
      where: { id },
      data: updateData,
    });
    
    res.json(updated);
  } catch (e: any) {
    console.error("Error updating salary status:", e);
    res.status(500).json({ message: e.message || 'Lỗi cập nhật trạng thái' });
  }
});

// API Nạp dữ liệu
app.get('/api/seed-data-secret', async (req, res) => {
    try {
        await seedDatabase();
        res.json({ success: true, message: "OK" });
    } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
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