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

// === AUTHENTICATION MIDDLEWARE ===
interface AuthRequest extends express.Request {
  currentUser?: any;
}

const authenticateToken = async (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      // Không có token - cho phép truy cập nhưng không có currentUser
      return next();
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { id: string; roles: string[] };
      const user = await prisma.user.findUnique({ 
        where: { id: decoded.id },
        include: { department: true }
      });
      
      if (user) {
        const { password, ...userData } = user;
        // Parse JSON fields
        let assignedDeptIds = [];
        try {
          if (userData.assignedDeptIds && typeof userData.assignedDeptIds === 'string') {
            assignedDeptIds = JSON.parse(userData.assignedDeptIds);
          } else if (Array.isArray(userData.assignedDeptIds)) {
            assignedDeptIds = userData.assignedDeptIds;
          }
        } catch (e) {}
        // Đảm bảo currentDeptId được include
        req.currentUser = { 
          ...userData, 
          assignedDeptIds,
          currentDeptId: userData.currentDeptId || null
        };
      }
    } catch (err) {
      // Token không hợp lệ - bỏ qua, không set currentUser
      console.warn("Invalid token:", err);
    }
    
    next();
  } catch (e) {
    next();
  }
};

// === DB INIT ===
async function initDatabase() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        console.log("--> DB Connected.");
        
        // Default Config
        const config = await prisma.systemConfig.findUnique({ where: { id: "default_config" } });
        if (!config) {
            await prisma.systemConfig.create({
                data: { 
                    id: "default_config", 
                    baseSalary: 1800000, 
                    standardWorkDays: 26, 
                    insuranceBaseSalary: 1800000, 
                    maxInsuranceBase: 36000000,
                    pitSteps: [],
                    seniorityRules: [],
                    insuranceRules: {}
                }
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

// Authentication middleware - lấy user từ JWT token
app.use(authenticateToken);

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
createCrud('salaryFormula', ['formulas', 'salary-formulas'], {
  mapOut: (row: any) => ({
    ...row,
    targetField: row.targetField || row.code || '', // Map code -> targetField nếu cần
    formulaExpression: row.expression || row.formulaExpression || '',
    isActive: row.status === 'ACTIVE' || row.isActive !== false,
    order: row.order || 0,
  }),
  mapIn: (body: any) => {
    const { targetField, formulaExpression, isActive, ...rest } = body || {};
    return {
      ...rest,
      targetField: targetField || rest.targetField || '', // Lưu targetField vào DB
      expression: formulaExpression || rest.expression || '',
      status: isActive !== false ? 'ACTIVE' : 'INACTIVE',
    };
  },
}); 
createCrud('salaryVariable', ['variables', 'salary-variables'], {
  mapOut: (row: any) => ({
    ...row,
    desc: row.description || '', // Map description -> desc cho frontend
  }),
  mapIn: (body: any) => {
    const { desc, ...rest } = body || {};
    return {
      ...rest,
      description: desc || rest.description || '',
    };
  },
});
createCrud('criterionGroup', ['criteria/groups', 'criterion-groups']);
createCrud('criterion', ['criteria/items', 'criteria', 'criterions'], {
  mapOut: (row: any) => ({
    ...row,
    point: row.points || 0, // Map points -> point cho frontend
    description: row.description || '', // Đảm bảo có description
    departmentId: row.departmentId || undefined, // Map departmentId
  }),
  mapIn: (body: any) => {
    const { point, ...rest } = body || {};
    return {
      ...rest,
      points: point !== undefined ? point : rest.points || 0,
      description: rest.description || '',
      // Đảm bảo target có giá trị mặc định nếu không có
      target: rest.target || 'MONTHLY_SALARY',
      // Đảm bảo proofRequired có giá trị boolean
      proofRequired: rest.proofRequired !== undefined ? rest.proofRequired : false,
      // departmentId có thể null (áp dụng cho tất cả)
      departmentId: rest.departmentId || null,
    };
  },
}); 
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
createCrud('bonusType', ['bonus-types'], {
  mapOut: (row: any) => ({
    ...row,
    month: row.month ?? 0, // Default 0 nếu null (frontend yêu cầu number)
    description: row.description || '', // Đảm bảo có description (required trong frontend)
  }),
  mapIn: (body: any) => {
    return {
      ...body,
      month: body.month !== undefined ? body.month : body.month ?? null,
      description: body.description || '',
    };
  },
});
createCrud('annualBonusPolicy', ['bonus-policies'], {
  mapOut: (row: any) => ({
    ...row,
    bonusTypeId: row.bonusTypeId || '', // Frontend yêu cầu string, không phải null
    rankId: row.rankId || '', // Frontend yêu cầu string, không phải null
    gradeId: row.gradeId || '', // Frontend yêu cầu string, không phải null
    amount: Number(row.amount || 0),
  }),
  mapIn: (body: any) => {
    return {
      ...body,
      bonusTypeId: body.bonusTypeId || null, // Lưu null vào DB nếu empty string
      rankId: body.rankId || null,
      gradeId: body.gradeId || null,
      amount: body.amount || 0,
    };
  },
});
createCrud('auditLog', ['audit', 'audit-logs']);
createCrud('evaluationRequest', ['evaluations'], {
  findManyArgs: { include: { user: true } },
  mapOut: (row: any) => {
    const user = row.user || {};
    return {
      ...row,
      userName: user.name || '',
      createdAt: row.createdAt ? row.createdAt.toISOString() : new Date().toISOString(),
      scope: row.scope || 'MAIN_JOB', // Default scope nếu không có
      description: row.description || '', // Đảm bảo có description (required trong frontend)
      proofFileName: row.proofFileName || '', // Đảm bảo có proofFileName (required trong frontend)
    };
  },
  mapIn: (body: any) => {
    return {
      ...body,
      description: body.description || '',
      proofFileName: body.proofFileName || '',
      scope: body.scope || 'MAIN_JOB',
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
        // Avatar - xử lý base64 string
        avatar: raw.avatar || null,
        // JSON fields
        assignedDeptIds: raw.assignedDeptIds ? (Array.isArray(raw.assignedDeptIds) ? raw.assignedDeptIds : JSON.parse(raw.assignedDeptIds || '[]')) : null,
        activeAssignments: raw.activeAssignments ? (Array.isArray(raw.activeAssignments) ? raw.activeAssignments : JSON.parse(raw.activeAssignments || '[]')) : null,
        salaryHistory: raw.salaryHistory ? (Array.isArray(raw.salaryHistory) ? raw.salaryHistory : JSON.parse(raw.salaryHistory || '[]')) : null,
        sideDeptId: raw.sideDeptId || null,
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
    } else {
        // Khi update, nếu không có password mới thì không update password (giữ nguyên)
        delete cleanData.password;
    }

    // Xử lý currentDeptId: nếu là empty string hoặc undefined thì set thành null
    if (cleanData.currentDeptId === "" || cleanData.currentDeptId === undefined) {
        cleanData.currentDeptId = null;
    }
    
    // Xử lý avatar
    if (raw.avatar === "" || raw.avatar === null) {
        cleanData.avatar = null;
    } else if (raw.avatar === undefined && raw.id) {
        // Khi update, nếu không có avatar trong request => không update avatar (giữ nguyên)
        delete cleanData.avatar;
    } else if (raw.avatar === undefined && !raw.id) {
        // Khi tạo mới, nếu không có avatar => set null
        cleanData.avatar = null;
    }

    console.log("--> User Data Clean:", JSON.stringify(cleanData));

    // Tách update và create data để tránh lỗi
    const isUpdate = !!raw.id;
    
    if (isUpdate) {
        // Khi update: xóa các field không được cung cấp (undefined)
        if (cleanData.password === undefined) delete cleanData.password;
        // avatar đã được xử lý ở trên (delete nếu undefined)
        
        const user = await prisma.user.update({
            where: { id: cleanData.id },
            data: cleanData
        });
        
        // Ghi audit log
        try {
            const actor = req.currentUser?.name || 'System';
            await prisma.auditLog.create({
                data: {
                    action: 'UPDATE_USER',
                    actor,
                    details: `User cập nhật: ${user.name} (${user.username})`,
                    isConfigAction: false
                }
            });
        } catch (logError) {
            console.error("Error saving audit log:", logError);
        }
        
        return res.json(user);
    } else {
        // Khi create: đảm bảo có đầy đủ các field bắt buộc
        const user = await prisma.user.create({
            data: cleanData
        });
        
        // Ghi audit log
        try {
            const actor = req.currentUser?.name || 'System';
            await prisma.auditLog.create({
                data: {
                    action: 'CREATE_USER',
                    actor,
                    details: `User tạo mới: ${user.name} (${user.username})`,
                    isConfigAction: false
                }
            });
        } catch (logError) {
            console.error("Error saving audit log:", logError);
        }
        
        return res.json(user);
    }
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
    
    // Nếu không có config, tạo mặc định
    if (!cfg) {
      return res.json({
        id: 'default_config',
        baseSalary: 1800000,
        standardWorkDays: 26,
        insuranceBaseSalary: 1800000,
        maxInsuranceBase: 36000000,
        pitSteps: [],
        seniorityRules: [],
        isPeriodLocked: false,
        autoApproveDays: 3,
        hrAutoApproveHours: 24,
        approvalMode: 'POST_AUDIT',
        personalRelief: 11000000,
        dependentRelief: 4400000,
        insuranceRate: 10.5,
        unionFeeRate: 1,
        approvalWorkflow: [],
      });
    }
    
    // insuranceRules dùng như "extra" để giữ các field mở rộng của frontend
    const extra = (cfg?.insuranceRules as any) || {};
    
    // Xử lý an toàn cho seniorityRules (có thể chưa có trong DB cũ)
    let seniorityRules = [];
    try {
      seniorityRules = (cfg as any).seniorityRules || extra.seniorityRules || [];
    } catch (e) {
      seniorityRules = extra.seniorityRules || [];
    }
    
    res.json({
      id: 'default_config',
      baseSalary: Number(cfg?.baseSalary || 0),
      standardWorkDays: cfg?.standardWorkDays ?? 26,
      insuranceBaseSalary: Number(cfg?.insuranceBaseSalary || 0),
      maxInsuranceBase: Number(cfg?.maxInsuranceBase || 0),
      pitSteps: (cfg?.pitSteps as any) || extra.pitSteps || [],
      seniorityRules: seniorityRules,
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
    console.error("Error getting system config:", e);
    res.status(500).json({ message: e.message || 'Lỗi đọc cấu hình', error: String(e) });
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

app.get('/api/users', async (req: AuthRequest, res) => {
    try {
        let where: any = {};
        
        // Filter theo role
        if (req.currentUser?.roles?.includes('KE_TOAN_LUONG')) {
            // Kế toán lương: filter theo assignedDeptIds
            const assignedDeptIds = req.currentUser.assignedDeptIds || [];
            const deptIds = assignedDeptIds.length > 0 
                ? assignedDeptIds 
                : (req.currentUser.currentDeptId ? [req.currentUser.currentDeptId] : []);
            
            if (deptIds.length > 0) {
                where = {
                    OR: [
                        { currentDeptId: { in: deptIds } },
                        { sideDeptId: { in: deptIds } }
                    ]
                };
            } else {
                return res.json([]);
            }
        } else if (req.currentUser?.roles?.includes('QUAN_LY')) {
            // Trưởng phòng: chỉ thấy user trong phòng ban mình quản lý
            // Tìm các phòng ban mà user này là manager
            const deptsManaged = await prisma.department.findMany({
                where: { managerId: req.currentUser.id },
                select: { id: true }
            });
            const deptIds = deptsManaged.map(d => d.id);
            
            if (deptIds.length > 0) {
                where = {
                    OR: [
                        { currentDeptId: { in: deptIds } },
                        { sideDeptId: { in: deptIds } }
                    ]
                };
            } else {
                // Không quản lý phòng ban nào -> chỉ thấy chính mình
                where = { id: req.currentUser.id };
            }
        } else if (req.currentUser?.roles?.includes('GIAM_DOC_KHOI')) {
            // Giám đốc khối: thấy user trong các phòng ban mình quản lý
            const deptsManaged = await prisma.department.findMany({
                where: { blockDirectorId: req.currentUser.id },
                select: { id: true }
            });
            const deptIds = deptsManaged.map(d => d.id);
            
            if (deptIds.length > 0) {
                where = {
                    OR: [
                        { currentDeptId: { in: deptIds } },
                        { sideDeptId: { in: deptIds } }
                    ]
                };
            } else {
                where = { id: req.currentUser.id };
            }
        } else if (req.currentUser?.roles?.includes('NHAN_SU')) {
            // Nhân sự: thấy user trong các phòng ban mình phụ trách
            const deptsManaged = await prisma.department.findMany({
                where: { hrId: req.currentUser.id },
                select: { id: true }
            });
            const deptIds = deptsManaged.map(d => d.id);
            
            if (deptIds.length > 0) {
                where = {
                    OR: [
                        { currentDeptId: { in: deptIds } },
                        { sideDeptId: { in: deptIds } }
                    ]
                };
            } else {
                where = { id: req.currentUser.id };
            }
        }
        
        const users = await prisma.user.findMany({ 
            where,
            include: { department: true } 
        });
        // Map dữ liệu để khớp với types.ts
        const clean = users.map((u: any) => {
            const { password, ...rest } = u;
            
            // Parse JSON fields nếu có
            let salaryHistory = [];
            try {
                if (rest.salaryHistory && typeof rest.salaryHistory === 'string') {
                    salaryHistory = JSON.parse(rest.salaryHistory);
                } else if (Array.isArray(rest.salaryHistory)) {
                    salaryHistory = rest.salaryHistory;
                }
            } catch (e) {}
            
            let assignedDeptIds = [];
            try {
                if (rest.assignedDeptIds && typeof rest.assignedDeptIds === 'string') {
                    assignedDeptIds = JSON.parse(rest.assignedDeptIds);
                } else if (Array.isArray(rest.assignedDeptIds)) {
                    assignedDeptIds = rest.assignedDeptIds;
                } else if (rest.currentDeptId) {
                    assignedDeptIds = [rest.currentDeptId];
                }
            } catch (e) {
                if (rest.currentDeptId) assignedDeptIds = [rest.currentDeptId];
            }
            
            let activeAssignments = [];
            try {
                if (rest.activeAssignments && typeof rest.activeAssignments === 'string') {
                    activeAssignments = JSON.parse(rest.activeAssignments);
                } else if (Array.isArray(rest.activeAssignments)) {
                    activeAssignments = rest.activeAssignments;
                }
            } catch (e) {}
            
            return {
                ...rest,
                avatar: rest.avatar || '',
                salaryHistory,
                assignedDeptIds,
                activeAssignments,
                joinDate: rest.joinDate ? rest.joinDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                // Computed fields - có thể tính từ salaryHistory nếu cần
                sideRankName: undefined,
                sideGradeLevel: undefined,
                currentStartDate: undefined,
                sideStartDate: undefined,
                pendingUpdate: undefined,
                pendingUpdateSummary: undefined,
            };
        });
        res.json(clean);
    } catch (e) { 
        console.error("Error getting users:", e);
        res.status(500).json({error: "Lỗi lấy users"}); 
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Xóa cascade các bản ghi liên quan trước
        await prisma.attendanceRecord.deleteMany({ where: { userId } });
        await prisma.salaryRecord.deleteMany({ where: { userId } });
        await prisma.evaluationRequest.deleteMany({ where: { userId } });
        await prisma.pieceworkConfig.deleteMany({ where: { userId } });
        
        // Xóa user
        await prisma.user.delete({ where: { id: userId } });
        
        // Ghi audit log
        try {
            const actor = req.currentUser?.name || 'System';
            await prisma.auditLog.create({
                data: {
                    action: 'DELETE_USER',
                    actor,
                    details: `Xóa user: ${userId}`,
                    isConfigAction: false
                }
            });
        } catch (logError) {
            console.error("Error saving audit log:", logError);
        }
        
        res.json({ success: true });
    } catch (e: any) {
        console.error("Error deleting user:", e);
        res.status(500).json({ error: e.message || "Lỗi xóa User" });
    }
});

app.get('/api/attendance', async (req: AuthRequest, res) => {
    try { 
        const { month } = req.query; 
        let where: any = month ? { date: { startsWith: month as string } } : {};
        
        // Filter theo assignedDeptIds cho KE_TOAN_LUONG
        if (req.currentUser?.roles?.includes('KE_TOAN_LUONG')) {
            const assignedDeptIds = req.currentUser.assignedDeptIds || [];
            // Nếu không có assignedDeptIds, fallback về currentDeptId của chính user đó
            const deptIds = assignedDeptIds.length > 0 
                ? assignedDeptIds 
                : (req.currentUser.currentDeptId ? [req.currentUser.currentDeptId] : []);
            
            if (deptIds.length > 0) {
                const users = await prisma.user.findMany({
                    where: {
                        OR: [
                            { currentDeptId: { in: deptIds } },
                            { sideDeptId: { in: deptIds } }
                        ]
                    },
                    select: { id: true }
                });
                const userIds = users.map(u => u.id);
                where.userId = { in: userIds };
            } else {
                // Không có phòng ban được gán -> trả về rỗng
                return res.json([]);
            }
        }
        
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
        const monthsToRecalculate = new Set<string>();
        
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
            const saved = await prisma.attendanceRecord.upsert({ 
                where: { userId_date: { userId: cleanRec.userId, date: cleanRec.date } }, 
                update: cleanRec, 
                create: cleanRec 
            });
            results.push(saved);
            
            // Nếu status là APPROVED, thêm tháng vào danh sách cần tính lại lương
            if (saved.status === 'APPROVED' && saved.date) {
                const month = saved.date.substring(0, 7); // YYYY-MM
                monthsToRecalculate.add(month);
            }
        }
        
        res.json({ success: true, count: results.length, monthsToRecalculate: Array.from(monthsToRecalculate) });
    } catch(e: any) { 
        console.error("Error saving attendance:", e);
        res.status(500).json({ error: e.message }); 
    }
});

// ==========================================
// SALARY RECORDS (đúng theo api.getSalaryRecords / saveSalaryRecord)
// date: YYYY-MM, unique (userId,date)
// ==========================================
app.get('/api/salary-records', async (req: AuthRequest, res) => {
  try {
    const { month } = req.query;
    let where: any = month ? { date: { startsWith: month as string } } : {};
    
    // Filter theo assignedDeptIds cho KE_TOAN_LUONG
    if (req.currentUser?.roles?.includes('KE_TOAN_LUONG')) {
      const assignedDeptIds = req.currentUser.assignedDeptIds || [];
      // Nếu không có assignedDeptIds, fallback về currentDeptId của chính user đó
      const deptIds = assignedDeptIds.length > 0 
          ? assignedDeptIds 
          : (req.currentUser.currentDeptId ? [req.currentUser.currentDeptId] : []);
      
      if (deptIds.length > 0) {
        const users = await prisma.user.findMany({
          where: {
            OR: [
              { currentDeptId: { in: deptIds } },
              { sideDeptId: { in: deptIds } }
            ]
          },
          select: { id: true }
        });
        const userIds = users.map(u => u.id);
        where.userId = { in: userIds };
      } else {
        // Không có phòng ban được gán -> trả về rỗng
        return res.json([]);
      }
    }
    
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
// SALARY CALCULATION - HÀM TÍNH LƯƠNG TỰ ĐỘNG
// ==========================================

// Helper: Tính công tiêu chuẩn (Ctc) = Tổng ngày trong tháng - Chủ nhật
function calculateCtc(year: number, month: number): number {
  const daysInMonth = new Date(year, month, 0).getDate();
  let sundays = 0;
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    if (date.getDay() === 0) sundays++;
  }
  return daysInMonth - sundays;
}

// Endpoint tính lương tự động
app.post('/api/salary-records/calculate', async (req, res) => {
  try {
    const { month } = req.query; // YYYY-MM
    if (!month || typeof month !== 'string') {
      return res.status(400).json({ message: 'Thiếu tham số month (YYYY-MM)' });
    }
    
    const [year, monthNum] = month.split('-').map(Number);
    if (!year || !monthNum) {
      return res.status(400).json({ message: 'Định dạng month không đúng (YYYY-MM)' });
    }
    
    // Lấy dữ liệu cần thiết
    const users = await prisma.user.findMany({ where: { status: 'ACTIVE' } });
    const attendanceRecords = await prisma.attendanceRecord.findMany({
      where: { date: { startsWith: month }, status: 'APPROVED' }
    });
    const evaluations = await prisma.evaluationRequest.findMany({
      where: { createdAt: { gte: new Date(`${month}-01`) } }
    });
    const pieceworkConfigs = await prisma.pieceworkConfig.findMany({
      where: { month }
    });
    const dailyWorkItems = await prisma.dailyWorkItem.findMany();
    const salaryGrades = await prisma.salaryGrade.findMany();
    const criteriaList = await prisma.criterion.findMany();
    const criteriaGroups = await prisma.criterionGroup.findMany();
    const systemConfig = await prisma.systemConfig.findUnique({ where: { id: 'default_config' } });
    
    const configExtra = (systemConfig?.insuranceRules as any) || {};
    const insuranceRate = configExtra.insuranceRate ?? 10.5;
    const unionFeeRate = configExtra.unionFeeRate ?? 1;
    const personalRelief = configExtra.personalRelief ?? 11000000;
    const dependentRelief = configExtra.dependentRelief ?? 4400000;
    const pitSteps = (systemConfig?.pitSteps as any) || configExtra.pitSteps || [];
    
    const Ctc = calculateCtc(year, monthNum);
    const results = [];
    
    for (const user of users) {
      // Tính các chỉ số công từ attendance
      const userAttendance = attendanceRecords.filter((a) => a.userId === user.id);
      
      let Ctt = 0;
      let Cn = 0;
      let NCD = 0;
      let NL = 0;
      let NCL = 0;
      let NKL = 0;
      let NCV = 0;
      let SL_tt = 0;
      
      for (const att of userAttendance) {
        if (att.type === 'TIME' || att.type === 'PIECEWORK' || att.type === 'DAILY') {
          Ctt += 1;
        }
        if (att.type === 'DAILY') {
          Cn += 1;
        }
        if (att.type === 'MODE') NCD += 1;
        if (att.type === 'HOLIDAY') NL += 1;
        if (att.type === 'PAID_LEAVE') NCL += 1;
        if (att.type === 'UNPAID') NKL += 1;
        if (att.type === 'WAITING') NCV += 1;
        if (att.output) SL_tt += att.output;
      }
      
      // Lấy thông tin lương từ SalaryGrade
      const grade = salaryGrades.find((g) => g.id === user.currentGradeId);
      const LCB_dm = Number(grade?.baseSalary || 0);
      const LHQ_dm = user.paymentType === 'PIECEWORK' ? 0 : Number(user.efficiencySalary || 0);
      
      // Tính LSL_dm (cho nhân viên khoán)
      const pieceworkConfig = pieceworkConfigs.find((p) => p.userId === user.id);
      const SL_khoan = pieceworkConfig?.targetOutput || 0;
      const DG_khoan = Number(pieceworkConfig?.unitPrice || user.pieceworkUnitPrice || 0);
      const LSL_dm = user.paymentType === 'PIECEWORK' ? SL_khoan * DG_khoan : 0;
      
      // Tính LCB_tt
      const actualBaseSalary = (LCB_dm / Ctc) * Ctt;
      
      // Tính LHQ_tt hoặc LSL_tt
      let actualEfficiencySalary = 0;
      let actualPieceworkSalary = 0;
      
      if (user.paymentType === 'PIECEWORK') {
        actualPieceworkSalary = (LSL_dm / Ctc) * Ctt;
      } else {
        actualEfficiencySalary = (LHQ_dm / Ctc) * Ctt;
      }
      
      // Tính Lương Khác (Lcn + Ltc + Lncl)
      let Lcn = 0;
      let Ltc = 0;
      
      for (const att of userAttendance) {
        // Lương công nhật
        if (att.type === 'DAILY' && att.dailyWorkItemId) {
          const workItem = dailyWorkItems.find((d) => d.id === att.dailyWorkItemId);
          if (workItem) {
            Lcn += Number(workItem.unitPrice || 0);
          }
        }
        
        // Lương tăng ca
        if (att.overtimeHours > 0) {
          Ltc += att.overtimeHours * (LCB_dm / Ctc / 8) * (att.otRate || 1.5);
        }
      }
      
      const Lncl = (NCD + NL + NCL) * (LCB_dm / Ctc) + (NCV * LCB_dm / Ctc * 0.7);
      const Lk = Lcn + Ltc + Lncl;
      
      // Tính Phụ cấp
      const PC_cd = Number(grade?.fixedAllowance || 0);
      const totalAllowance = PC_cd;
      
      // Tính Thưởng
      const fixedBonuses = (grade?.fixedBonuses as any) || [];
      const monthBonus = fixedBonuses.find((b: any) => b.month === monthNum);
      const TH_cd = monthBonus ? Number(monthBonus.amount || 0) : 0;
      const totalBonus = TH_cd;
      
      // Tính otherSalary
      const otherSalary = Lk;
      
      // Tính Gross
      const calculatedSalary = actualBaseSalary + actualEfficiencySalary + actualPieceworkSalary + otherSalary + totalAllowance + totalBonus;
      
      // Tính Khấu trừ BHXH
      const insuranceBase = Math.min(calculatedSalary, Number(systemConfig?.maxInsuranceBase || 36000000));
      const insuranceDeduction = insuranceBase * (insuranceRate / 100);
      
      // Tính Phí Công đoàn
      const unionFee = insuranceBase * (unionFeeRate / 100);
      
      // Tính Thuế TNCN
      const TN_ct = calculatedSalary - insuranceDeduction - unionFee - personalRelief - (dependentRelief * (user.numberOfDependents || 0));
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
      
      // Tính Net Salary
      const advancePayment = 0;
      const otherDeductions = 0;
      const netSalary = (calculatedSalary - insuranceDeduction - unionFee - pitDeduction - advancePayment - otherDeductions) * ((user.probationRate || 100) / 100);
      
      // Tính HS_tn
      const HS_tn = 1.0;
      
      // Lưu calculationLog
      const calculationLog = {
        Lcn,
        Ltc,
        Lncl,
        Lk,
      };
      
      // Lưu vào database
      const salaryRecord = await prisma.salaryRecord.upsert({
        where: { userId_date: { userId: user.id, date: month } },
        update: {
          Ctc,
          Ctt,
          Cn,
          NCD,
          NL,
          NCL,
          NKL,
          NCV,
          LCB_dm,
          LHQ_dm,
          LSL_dm,
          SL_khoan,
          SL_tt,
          DG_khoan,
          HS_tn,
          probationRate: user.probationRate || 100,
          actualBaseSalary,
          actualEfficiencySalary,
          actualPieceworkSalary,
          otherSalary,
          totalAllowance,
          totalBonus,
          overtimeSalary: Ltc,
          insuranceDeduction,
          pitDeduction,
          unionFee,
          advancePayment,
          otherDeductions,
          calculatedSalary,
          netSalary,
          calculationLog: calculationLog as any,
        },
        create: {
          id: `sal_${user.id}_${month}`,
          userId: user.id,
          date: month,
          status: 'DRAFT',
          Ctc,
          Ctt,
          Cn,
          NCD,
          NL,
          NCL,
          NKL,
          NCV,
          LCB_dm,
          LHQ_dm,
          LSL_dm,
          SL_khoan,
          SL_tt,
          DG_khoan,
          HS_tn,
          probationRate: user.probationRate || 100,
          actualBaseSalary,
          actualEfficiencySalary,
          actualPieceworkSalary,
          otherSalary,
          totalAllowance,
          totalBonus,
          overtimeSalary: Ltc,
          insuranceDeduction,
          pitDeduction,
          unionFee,
          advancePayment,
          otherDeductions,
          calculatedSalary,
          netSalary,
          calculationLog: calculationLog as any,
        },
      });
      
      results.push(salaryRecord);
    }
    
    res.json({ success: true, count: results.length, records: results });
  } catch (e: any) {
    console.error("Error calculating salary:", e);
    res.status(500).json({ message: e.message || 'Lỗi tính lương' });
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

