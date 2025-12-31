import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// --- IMPORT SEEDER ---
import { seedDatabase } from './seeder';

// --- ERROR TRAP ---
process.on('uncaughtException', (err) => { console.error('🔥 CRITICAL:', err); });
process.on('unhandledRejection', (reason) => { console.error('🔥 PROMISE:', reason); });

console.log("=== SERVER START (FULL API for services/api.ts) ===");

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// --- INIT DB (best-effort) ---
async function initDatabase() {
  try {
    await prisma.$connect();
    console.log("✅ Prisma connected");
  } catch (e) {
    console.error("DB Init Error:", e);
  }
}
initDatabase();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// --- REQUEST LOGGER ---
app.use((req, _res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// --- HELPERS ---
function ok(res: express.Response, data: any) { return res.json(data); }
function fail(res: express.Response, status: number, message: string, detail?: any) {
  if (detail) console.error("❌ API ERROR:", message, detail);
  return res.status(status).json({ message, detail });
}

function isISODate(s: string) { return /^\d{4}-\d{2}-\d{2}$/.test(s); }
function isISOMonth(s: string) { return /^\d{4}-\d{2}$/.test(s); }

/**
 * Normalize various date inputs to Date object for Prisma DateTime.
 * Accepts:
 * - ISO DateTime string
 * - "YYYY-MM-DD" (assumes 00:00:00Z)
 * - number (timestamp)
 * - Date
 */
function normalizeDateTime(input: any): Date | undefined {
  if (input === null || input === undefined || input === '') return undefined;
  if (input instanceof Date) return input;
  if (typeof input === 'number') {
    const d = new Date(input);
    return isNaN(d.getTime()) ? undefined : d;
  }
  if (typeof input === 'string') {
    const s = input.trim();
    if (!s) return undefined;
    // YYYY-MM-DD -> convert to ISO
    if (isISODate(s)) return new Date(`${s}T00:00:00.000Z`);
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

/**
 * Remove undefined fields (so Prisma can use defaults and avoid validation errors)
 */
function stripUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  const out: any = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

/**
 * Auth: optional (frontend may or may not send token).
 * If token exists and invalid -> 401. If missing -> allow (for easier testing).
 */
function optionalAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const auth = req.headers.authorization;
  if (!auth) return next();
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return next();
  try {
    // @ts-ignore
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (e) {
    return fail(res, 401, "Token không hợp lệ");
  }
}

app.use('/api', optionalAuth);

// ==================================================
// 0. HEALTH
// ==================================================
app.get('/api/ping', (_req, res) => ok(res, { ok: true, ts: new Date().toISOString() }));

// ==================================================
// 1. AUTHENTICATION
// ==================================================
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) return fail(res, 400, "Thiếu username/password");

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) return fail(res, 401, "Sai tài khoản");

    const isHashed = typeof user.password === 'string' && user.password.startsWith('$2');
    const okPass = isHashed ? await bcrypt.compare(password, user.password) : password === user.password;
    if (!okPass) return fail(res, 401, "Sai mật khẩu");

    // @ts-ignore
    const token = jwt.sign({ id: user.id, roles: user.roles }, JWT_SECRET);
    // remove password
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _pw, ...userData } = user as any;
    return ok(res, { success: true, token, user: userData });
  } catch (e) {
    return fail(res, 500, "Lỗi Server", e);
  }
});

// ==================================================
// 2. USERS & DEPARTMENTS
// ==================================================
app.get('/api/users', async (_req, res) => {
  try {
    const users = await prisma.user.findMany({ orderBy: { fullName: 'asc' } });
    const safe = users.map((u: any) => { const { password, ...rest } = u; return rest; });
    return ok(res, safe);
  } catch (e) {
    return fail(res, 500, "Không tải được users", e);
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const body = req.body || {};

    // Fix joinDate: accept YYYY-MM-DD or ISO or empty
    const joinDate = normalizeDateTime(body.joinDate);

    // Password: if provided and not hashed -> hash
    let password = body.password;
    if (password && typeof password === 'string' && !password.startsWith('$2')) {
      // hash only when creating/updating explicitly
      password = await bcrypt.hash(password, 10);
    }

    const data = stripUndefined({
      ...body,
      joinDate,
      password,
    });

    // Ensure we don't accidentally set empty joinDate
    if (!joinDate) delete (data as any).joinDate;

    const createdOrUpdated = body.id
      ? await prisma.user.update({ where: { id: body.id }, data })
      : await prisma.user.create({ data });

    const { password: _pw, ...safe } = createdOrUpdated as any;
    return ok(res, safe);
  } catch (e: any) {
    return fail(res, 500, "Lỗi lưu user", e);
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.user.delete({ where: { id } });
    return ok(res, { success: true });
  } catch (e) {
    return fail(res, 500, "Không xoá được user", e);
  }
});

app.get('/api/departments', async (_req, res) => {
  try {
    const depts = await prisma.department.findMany({ orderBy: { name: 'asc' } });
    return ok(res, depts);
  } catch (e) {
    return fail(res, 500, "Không tải được phòng ban", e);
  }
});

app.post('/api/departments', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });

    const dept = body.id
      ? await prisma.department.upsert({
          where: { id: body.id },
          create: data as any,
          update: data as any,
        })
      : await prisma.department.create({ data: data as any });

    return ok(res, dept);
  } catch (e) {
    return fail(res, 500, "Lỗi lưu phòng ban", e);
  }
});

app.delete('/api/departments/:id', async (req, res) => {
  try {
    const id = req.params.id;
    await prisma.department.delete({ where: { id } });
    return ok(res, { success: true });
  } catch (e) {
    return fail(res, 500, "Không xoá được phòng ban", e);
  }
});

// ==================================================
// 3. ATTENDANCE & SALARY
// ==================================================
app.get('/api/attendance', async (req, res) => {
  try {
    const month = (req.query.month as string | undefined) || undefined;
    const where: any = {};
    if (month) {
      if (!isISOMonth(month)) return fail(res, 400, "month phải có dạng YYYY-MM");
      where.date = { startsWith: month }; // AttendanceRecord.date: "YYYY-MM-DD"
    }
    const rows = await prisma.attendanceRecord.findMany({ where, orderBy: [{ date: 'asc' }] });
    return ok(res, rows);
  } catch (e) {
    return fail(res, 500, "Không tải được chấm công", e);
  }
});

/**
 * Save attendance: accepts single record or array.
 * Upsert by unique (userId, date)
 */
app.post('/api/attendance', async (req, res) => {
  try {
    const payload = req.body;
    const items = Array.isArray(payload) ? payload : [payload];

    const results = [];
    for (const it of items) {
      if (!it?.userId || !it?.date) return fail(res, 400, "Thiếu userId/date cho attendance");
      if (!isISODate(it.date)) return fail(res, 400, "attendance.date phải có dạng YYYY-MM-DD");

      const data = stripUndefined({ ...it });
      // Use composite unique: userId_date
      const saved = await prisma.attendanceRecord.upsert({
        where: { userId_date: { userId: it.userId, date: it.date } },
        create: data as any,
        update: data as any,
      });
      results.push(saved);
    }

    return ok(res, Array.isArray(payload) ? results : results[0]);
  } catch (e) {
    return fail(res, 500, "Lỗi lưu chấm công", e);
  }
});

app.get('/api/salary-records', async (req, res) => {
  try {
    const month = (req.query.month as string | undefined) || undefined;
    const where: any = {};
    if (month) {
      if (!isISOMonth(month)) return fail(res, 400, "month phải có dạng YYYY-MM");
      where.date = month; // SalaryRecord.date: "YYYY-MM"
    }
    const rows = await prisma.salaryRecord.findMany({
      where,
      orderBy: [{ date: 'asc' }],
    });
    return ok(res, rows);
  } catch (e) {
    return fail(res, 500, "Không tải được bảng lương", e);
  }
});

/**
 * Save salary record: upsert by unique (userId, date)
 */
app.post('/api/salary-records', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.userId || !body.date) return fail(res, 400, "Thiếu userId/date cho salary-record");
    if (!isISOMonth(body.date)) return fail(res, 400, "salaryRecord.date phải có dạng YYYY-MM");

    const data = stripUndefined({ ...body });
    const saved = await prisma.salaryRecord.upsert({
      where: { userId_date: { userId: body.userId, date: body.date } },
      create: data as any,
      update: data as any,
    });
    return ok(res, saved);
  } catch (e) {
    return fail(res, 500, "Lỗi lưu bảng lương", e);
  }
});

// ==================================================
// 4. CONFIGURATION & MASTER DATA
// (used by api.saveConfig in services/api.ts)
// ==================================================
app.get('/api/config/system', async (_req, res) => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { id: 'default_config' } });
    if (!config) {
      const created = await prisma.systemConfig.create({ data: { id: 'default_config' } as any });
      return ok(res, created);
    }
    return ok(res, config);
  } catch (e) {
    return fail(res, 500, "Không tải được system config", e);
  }
});

app.post('/api/config/system', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body, id: 'default_config' });
    const saved = await prisma.systemConfig.upsert({
      where: { id: 'default_config' },
      create: data as any,
      update: data as any,
    });
    return ok(res, saved);
  } catch (e) {
    return fail(res, 500, "Lỗi lưu system config", e);
  }
});

// --- FORMULAS ---
app.get('/api/formulas', async (_req, res) => {
  try {
    const rows = await prisma.salaryFormula.findMany({ orderBy: [{ group: 'asc' }, { name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được formulas", e); }
});
app.post('/api/formulas', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.code) return fail(res, 400, "Formula thiếu code");
    const data = stripUndefined({ ...body });
    const saved = await prisma.salaryFormula.upsert({
      where: { code: body.code },
      create: data as any,
      update: data as any,
    });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu formula", e); }
});

// --- VARIABLES ---
app.get('/api/variables', async (_req, res) => {
  try {
    const rows = await prisma.salaryVariable.findMany({ orderBy: [{ group: 'asc' }, { name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được variables", e); }
});
app.post('/api/variables', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.code) return fail(res, 400, "Variable thiếu code");
    const data = stripUndefined({ ...body });
    const saved = await prisma.salaryVariable.upsert({
      where: { code: body.code },
      create: data as any,
      update: data as any,
    });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu variable", e); }
});

// --- CRITERIA GROUPS ---
app.get('/api/criteria/groups', async (_req, res) => {
  try {
    const rows = await prisma.criterionGroup.findMany({ orderBy: [{ name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được criterion groups", e); }
});
app.post('/api/criteria/groups', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });
    const saved = body.id
      ? await prisma.criterionGroup.upsert({ where: { id: body.id }, create: data as any, update: data as any })
      : await prisma.criterionGroup.create({ data: data as any });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu criterion group", e); }
});

// --- CRITERIA ITEMS ---
app.get('/api/criteria/items', async (_req, res) => {
  try {
    const rows = await prisma.criterion.findMany({ orderBy: [{ name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được criteria", e); }
});
app.post('/api/criteria/items', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });
    const saved = body.id
      ? await prisma.criterion.upsert({ where: { id: body.id }, create: data as any, update: data as any })
      : await prisma.criterion.create({ data: data as any });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu criterion", e); }
});

// --- RANKS ---
app.get('/api/ranks', async (_req, res) => {
  try {
    const rows = await prisma.salaryRank.findMany({ include: { grades: true }, orderBy: [{ name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được ranks", e); }
});
app.post('/api/ranks', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });
    const saved = body.id
      ? await prisma.salaryRank.upsert({ where: { id: body.id }, create: data as any, update: data as any })
      : await prisma.salaryRank.create({ data: data as any });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu rank", e); }
});

// --- PIECEWORK CONFIGS ---
app.get('/api/piecework-configs', async (_req, res) => {
  try {
    const rows = await prisma.pieceworkConfig.findMany({ orderBy: [{ name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được piecework-configs", e); }
});
app.post('/api/piecework-configs', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.code) return fail(res, 400, "PieceworkConfig thiếu code");
    const data = stripUndefined({ ...body });
    const saved = await prisma.pieceworkConfig.upsert({
      where: { code: body.code },
      create: data as any,
      update: data as any,
    });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu piecework-config", e); }
});

// --- HOLIDAYS ---
app.get('/api/holidays', async (_req, res) => {
  try {
    const rows = await prisma.holiday.findMany({ orderBy: [{ date: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được holidays", e); }
});
app.post('/api/holidays', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.date || !isISODate(body.date)) return fail(res, 400, "Holiday.date phải có dạng YYYY-MM-DD");
    const data = stripUndefined({ ...body });
    const saved = await prisma.holiday.upsert({
      where: { date: body.date },
      create: data as any,
      update: data as any,
    });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu holiday", e); }
});

// --- BONUS TYPES ---
app.get('/api/bonus-types', async (_req, res) => {
  try {
    const rows = await prisma.bonusType.findMany({ orderBy: [{ name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được bonus-types", e); }
});
app.post('/api/bonus-types', async (req, res) => {
  try {
    const body = req.body || {};
    if (!body.code) return fail(res, 400, "BonusType thiếu code");
    const data = stripUndefined({ ...body });
    const saved = await prisma.bonusType.upsert({
      where: { code: body.code },
      create: data as any,
      update: data as any,
    });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu bonus-type", e); }
});

// --- BONUS POLICIES ---
app.get('/api/bonus-policies', async (_req, res) => {
  try {
    const rows = await prisma.annualBonusPolicy.findMany({ orderBy: [{ name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được bonus-policies", e); }
});
app.post('/api/bonus-policies', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });
    const saved = body.id
      ? await prisma.annualBonusPolicy.upsert({ where: { id: body.id }, create: data as any, update: data as any })
      : await prisma.annualBonusPolicy.create({ data: data as any });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu bonus-policy", e); }
});

// --- DAILY WORK ITEMS ---
app.get('/api/daily-work-items', async (_req, res) => {
  try {
    const rows = await prisma.dailyWorkItem.findMany({ orderBy: [{ name: 'asc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được daily-work-items", e); }
});
app.post('/api/daily-work-items', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });
    const saved = body.id
      ? await prisma.dailyWorkItem.upsert({ where: { id: body.id }, create: data as any, update: data as any })
      : await prisma.dailyWorkItem.create({ data: data as any });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu daily-work-item", e); }
});

// ==================================================
// 5. OTHERS (Logs, Evaluations)
// ==================================================
app.get('/api/audit', async (_req, res) => {
  try {
    const rows = await prisma.auditLog.findMany({ orderBy: [{ createdAt: 'desc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được audit logs", e); }
});
app.post('/api/audit', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });
    const saved = await prisma.auditLog.create({ data: data as any });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu audit log", e); }
});

app.get('/api/evaluations', async (_req, res) => {
  try {
    const rows = await prisma.evaluationRequest.findMany({ orderBy: [{ createdAt: 'desc' }] });
    return ok(res, rows);
  } catch (e) { return fail(res, 500, "Không tải được evaluations", e); }
});
app.post('/api/evaluations', async (req, res) => {
  try {
    const body = req.body || {};
    const data = stripUndefined({ ...body });
    const saved = body.id
      ? await prisma.evaluationRequest.upsert({ where: { id: body.id }, create: data as any, update: data as any })
      : await prisma.evaluationRequest.create({ data: data as any });
    return ok(res, saved);
  } catch (e) { return fail(res, 500, "Lỗi lưu evaluation", e); }
});

// ==================================================
// 6. SEED (DEV/TEST)
// ==================================================
app.get('/api/seed-data-secret', async (_req, res) => {
  try {
    await seedDatabase();
    return ok(res, { success: true });
  } catch (e) {
    return fail(res, 500, "Seed thất bại", e);
  }
});

// ==================================================
// 7. SERVE FRONTEND (static build if exists)
// ==================================================
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
} else {
  app.get('*', (_req, res) => ok(res, { ok: true, message: "Backend running. Build frontend to serve static." }));
}

app.listen(PORT, () => console.log(`🚀 Server listening on ${PORT}`));
