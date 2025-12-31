import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- DỮ LIỆU MẪU ---
const INITIAL_DEPARTMENTS = [
  { id: 'DEP01', name: 'Ban Lãnh Đạo & Điều Hành', budgetNorm: 5000000000 },
  { id: 'DEP02', name: 'Khối Kinh Doanh', budgetNorm: 2000000000 },
  { id: 'DEP03', name: 'Xưởng Sản Xuất 01', budgetNorm: 1500000000 },
  { id: 'DEP04', name: 'Phòng Tài Chính Kế Toán', budgetNorm: 800000000 },
  { id: 'DEP05', name: 'Phòng Hành Chính Nhân Sự', budgetNorm: 600000000 },
];

const INITIAL_RANKS = [
  { id: 'R1', name: 'Ban Lãnh Đạo / HĐQT', baseSalary: 0, allowance: 0 },
  { id: 'R2', name: 'Giám Đốc Khối', baseSalary: 0, allowance: 0 },
  { id: 'R3', name: 'Trưởng Phòng / Đơn Vị', baseSalary: 0, allowance: 0 },
  { id: 'R4', name: 'Tổ Trưởng / Giám Sát', baseSalary: 0, allowance: 0 },
  { id: 'R5', name: 'Nhân Viên / Công Nhân', baseSalary: 0, allowance: 0 },
];

const INITIAL_GRADES = [
    { id: 'G_R1_5', rankId: 'R1', name: 'Bậc 5', multiplier: 5.0, amount: 25000000 },
    { id: 'G_R2_3', rankId: 'R2', name: 'Bậc 3', multiplier: 3.0, amount: 18000000 },
    { id: 'G_R3_2', rankId: 'R3', name: 'Bậc 2', multiplier: 2.0, amount: 12000000 },
    { id: 'G_R3_3', rankId: 'R3', name: 'Bậc 3', multiplier: 2.5, amount: 15000000 },
    { id: 'G_R4_2', rankId: 'R4', name: 'Bậc 2', multiplier: 1.5, amount: 10000000 },
    { id: 'G_R4_4', rankId: 'R4', name: 'Bậc 4', multiplier: 2.0, amount: 14000000 },
    { id: 'G_R5_1', rankId: 'R5', name: 'Bậc 1', multiplier: 1.0, amount: 6000000 },
];

const INITIAL_VARIABLES = [
  { code: 'Ctc', name: 'Công tiêu chuẩn', description: 'Tổng ngày làm việc chuẩn', group: 'CÔNG' },
  { code: 'Ctt', name: 'Công thực tế', description: 'Ngày công đi làm thực tế', group: 'CÔNG' },
  { code: 'LCB_dm', name: 'Lương CB định mức', description: 'Lương cơ bản trên HĐ', group: 'ĐỊNH MỨC' },
  { code: 'LHQ_dm', name: 'Lương HQ định mức', description: 'Lương hiệu quả tối đa', group: 'ĐỊNH MỨC' },
  { code: 'LSL_dm', name: 'Lương khoán định mức', description: 'Sản lượng * Đơn giá', group: 'ĐỊNH MỨC' },
  { code: 'KPI', name: 'Hệ số KPI', description: 'Kết quả đánh giá (0-1.2)', group: 'ĐỊNH MỨC' },
  { code: 'Gross', name: 'Tổng thu nhập Gross', description: 'Tổng thu nhập trước thuế', group: 'KẾT QUẢ' },
  { code: 'Net', name: 'Thực lĩnh', description: 'Tiền về tài khoản', group: 'KẾT QUẢ' },
];

const INITIAL_FORMULAS = [
  { code: 'LUONG_TG', name: 'Lương Thời Gian', area: 'OFFICE', expression: '({LCB_dm} / {Ctc}) * {Ctt}', group: 'CHINH', status: 'ACTIVE' },
  { code: 'LUONG_KPI', name: 'Lương Hiệu Quả', area: 'OFFICE', expression: '{LHQ_dm} * {KPI}', group: 'CHINH', status: 'ACTIVE' },
  { code: 'LUONG_KHOAN', name: 'Lương Khoán', area: 'FACTORY', expression: '{LSL_dm} * {KPI}', group: 'CHINH', status: 'ACTIVE' },
  { code: 'THUC_LINH', name: 'Thực Lĩnh (Net)', area: 'ALL', expression: '{Gross} - 10.5% - {Tax}', group: 'KET_QUA', status: 'ACTIVE' },
];

const INITIAL_GROUPS = [
  { id: 'CG1', name: 'Tuân thủ kỷ luật', weight: 20 },
  { id: 'CG2', name: 'Hiệu suất chuyên môn', weight: 50 },
  { id: 'CG3', name: 'Sáng kiến & Phối hợp', weight: 30 },
];

const INITIAL_CRITERIA = [
  { id: 'C1', groupId: 'CG1', name: 'Đi muộn/Về sớm', type: 'PENALTY', target: 'MONTHLY', points: 2, description: 'Vi phạm quy định giờ giấc' },
  { id: 'C2', groupId: 'CG1', name: 'Nghỉ không phép', type: 'PENALTY', target: 'MONTHLY', points: 10, description: 'Tự ý bỏ việc' },
  { id: 'C3', groupId: 'CG2', name: 'Vượt tiến độ dự án', type: 'BONUS', target: 'MONTHLY', points: 15, description: 'Hoàn thành trước hạn' },
  { id: 'C4', groupId: 'CG3', name: 'Sáng kiến quy trình', type: 'BONUS', target: 'MONTHLY', points: 20, description: 'Cải tiến công việc' },
  { id: 'C5', groupId: 'CG2', name: 'Sai lỗi kỹ thuật', type: 'PENALTY', target: 'MONTHLY', points: 30, description: 'Gây thiệt hại hệ thống' },
];

const INITIAL_DAILY_WORK = [
  { id: 'DW1', name: 'Sửa chữa máy phát', unitPrice: 350000, type: 'SERVICE' },
  { id: 'DW2', name: 'Kiểm kê kho bãi', unitPrice: 200000, type: 'SERVICE' },
];

// Bonus & Holidays (để màn hình cấu hình không bị trống)
const INITIAL_BONUS_TYPES = [
  { code: 'BONUS', name: 'Thưởng', isTaxable: true },
  { code: 'ALLOWANCE', name: 'Phụ cấp', isTaxable: true },
  { code: 'NON_TAX', name: 'Khoản không tính thuế', isTaxable: false },
];

const INITIAL_BONUS_POLICIES = [
  { name: 'Thưởng Tết (mặc định)', formulaCode: 'THUC_LINH', condition: 'DEFAULT' },
];

const INITIAL_HOLIDAYS = [
  { date: '2026-01-01', name: 'Tết Dương lịch', rate: 3.0 },
];

// --- HÀM SEED CHÍNH ---
export const seedDatabase = async () => {
    console.log("--> [SEEDER] Bắt đầu nạp dữ liệu...");

    // 1. Departments
    try {
        for (const d of INITIAL_DEPARTMENTS) {
            await prisma.department.upsert({ where: { id: d.id }, update: d, create: d });
        }
        console.log("   - Departments: OK");
    } catch(e) { console.error("   x Departments Error:", e); }

    // 2. Ranks & Grades
    try {
        for (const r of INITIAL_RANKS) await prisma.salaryRank.upsert({ where: { id: r.id }, update: r, create: r });
        for (const g of INITIAL_GRADES) await prisma.salaryGrade.upsert({ where: { id: g.id }, update: g, create: g });
        console.log("   - Ranks/Grades: OK");
    } catch(e) { console.error("   x Ranks Error:", e); }

    // 3. Configs (Variables, Formulas)
    try {
        for (const v of INITIAL_VARIABLES) await prisma.salaryVariable.upsert({ where: { code: v.code }, update: v, create: v });
        for (const f of INITIAL_FORMULAS) await prisma.salaryFormula.upsert({ where: { code: f.code }, update: f, create: f });
        console.log("   - Configs: OK");
    } catch(e) { console.error("   x Configs Error:", e); }
    
    // 4. Criteria
    try {
        for (const g of INITIAL_GROUPS) await prisma.criterionGroup.upsert({ where: { id: g.id }, update: g, create: g });
        for (const c of INITIAL_CRITERIA) await prisma.criterion.upsert({ where: { id: c.id }, update: c, create: { ...c, proofRequired: false } });
        console.log("   - Criteria: OK");
    } catch(e) { console.error("   x Criteria Error:", e); }

    // 5. Daily Work
    try {
        for (const w of INITIAL_DAILY_WORK) await prisma.dailyWorkItem.upsert({ where: { id: w.id }, update: w, create: w });
        console.log("   - DailyWork: OK");
    } catch(e) { console.error("   x DailyWork Error:", e); }

    // 6. Bonus types & policies
    try {
        for (const b of INITIAL_BONUS_TYPES) {
            await prisma.bonusType.upsert({ where: { code: b.code }, update: b, create: b });
        }
        for (const p of INITIAL_BONUS_POLICIES) {
            // AnnualBonusPolicy không có unique code; dùng name làm khóa tạm bằng findFirst
            const existed = await prisma.annualBonusPolicy.findFirst({ where: { name: p.name } });
            if (existed) {
                await prisma.annualBonusPolicy.update({ where: { id: existed.id }, data: p });
            } else {
                await prisma.annualBonusPolicy.create({ data: p });
            }
        }
        console.log("   - BonusTypes/Policies: OK");
    } catch(e) { console.error("   x Bonus Error:", e); }

    // 7. Holidays
    try {
        for (const h of INITIAL_HOLIDAYS) {
            await prisma.holiday.upsert({ where: { date: h.date }, update: h, create: h });
        }
        console.log("   - Holidays: OK");
    } catch(e) { console.error("   x Holidays Error:", e); }

    console.log("--> [SEEDER] Hoàn tất!");
    return { success: true };
};