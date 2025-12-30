import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- DỮ LIỆU MẪU ---
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

const INITIAL_DEPARTMENTS = [
  { id: 'DEP01', name: 'Ban Lãnh Đạo & Điều Hành', budgetNorm: 5000000000 },
  { id: 'DEP02', name: 'Khối Kinh Doanh', budgetNorm: 2000000000 },
  { id: 'DEP03', name: 'Xưởng Sản Xuất 01', budgetNorm: 1500000000 },
  { id: 'DEP04', name: 'Phòng Tài Chính Kế Toán', budgetNorm: 800000000 },
  { id: 'DEP05', name: 'Phòng Hành Chính Nhân Sự', budgetNorm: 600000000 },
];

const INITIAL_USERS = [
  // Bỏ qua Admin ở đây vì server tự tạo rồi, tránh xung đột
  { id: 'USR_BLD', username: 'bld', password: '123', name: 'Lê Ban Lãnh Đạo', roles: ['BAN_LANH_DAO'], status: 'ACTIVE', currentDeptId: 'DEP01', paymentType: 'TIME', efficiencySalary: 25000000, reservedBonusAmount: 100000000 },
  { id: 'USR_GDK', username: 'gdk', password: '123', name: 'Trần Giám Đốc Khối', roles: ['GIAM_DOC_KHOI'], status: 'ACTIVE', currentDeptId: 'DEP02', paymentType: 'TIME', efficiencySalary: 18000000, reservedBonusAmount: 70000000 },
  { id: 'USR_TP_TIME', username: 'tpkd', password: '123', name: 'Nguyễn Văn TP Kinh Doanh', roles: ['QUAN_LY'], status: 'ACTIVE', currentDeptId: 'DEP02', paymentType: 'TIME', efficiencySalary: 12000000, reservedBonusAmount: 50000000 },
  { id: 'USR_TP_PIECE', username: 'tpsx', password: '123', name: 'Phạm Văn TP Sản Xuất', roles: ['QUAN_LY'], status: 'ACTIVE', currentDeptId: 'DEP03', paymentType: 'PIECEWORK', pieceworkUnitPrice: 150000, efficiencySalary: 0, reservedBonusAmount: 30000000 },
  { id: 'USR_KTL', username: 'ktl', password: '123', name: 'Hoàng Kế Toán Lương', roles: ['KE_TOAN_LUONG'], status: 'ACTIVE', currentDeptId: 'DEP04', paymentType: 'TIME', efficiencySalary: 10000000, reservedBonusAmount: 20000000 },
  { id: 'USR_NS', username: 'ns', password: '123', name: 'Vũ Nhân Sự', roles: ['NHAN_SU'], status: 'ACTIVE', currentDeptId: 'DEP05', paymentType: 'TIME', efficiencySalary: 10000000, reservedBonusAmount: 20000000 },
  { id: 'USR_NV_TIME', username: 'nv.sale', password: '123', name: 'Đặng Nhân Viên Sale', roles: ['NHAN_VIEN'], status: 'ACTIVE', currentDeptId: 'DEP02', paymentType: 'TIME', efficiencySalary: 6000000, reservedBonusAmount: 10000000 },
  { id: 'USR_NV_PIECE', username: 'nv.cn', password: '123', name: 'Bùi Công Nhân', roles: ['NHAN_VIEN'], status: 'ACTIVE', currentDeptId: 'DEP03', paymentType: 'PIECEWORK', pieceworkUnitPrice: 35000, efficiencySalary: 0, reservedBonusAmount: 10000000 }
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
  { code: 'LUONG_TG', name: 'Lương Thời Gian', area: 'OFFICE', expression: '({LCB_dm} / {Ctc}) * {Ctt}', group: 'CHINH' },
  { code: 'LUONG_KPI', name: 'Lương Hiệu Quả', area: 'OFFICE', expression: '{LHQ_dm} * {KPI}', group: 'CHINH' },
  { code: 'LUONG_KHOAN', name: 'Lương Khoán', area: 'FACTORY', expression: '{LSL_dm} * {KPI}', group: 'CHINH' },
  { code: 'THUC_LINH', name: 'Thực Lĩnh (Net)', area: 'ALL', expression: '{Gross} - 10.5% - {Tax}', group: 'KET_QUA' },
];

const INITIAL_DAILY_WORK = [
  { id: 'DW1', name: 'Sửa chữa máy phát', unitPrice: 350000, type: 'SERVICE' },
  { id: 'DW2', name: 'Kiểm kê kho bãi', unitPrice: 200000, type: 'SERVICE' },
];

// --- HÀM SEED (ĐÃ NÂNG CẤP) ---
export const seedDatabase = async () => {
    console.log("--> START SEEDING...");

    // Dùng try-catch cho từng phần để không bị dừng giữa chừng
    try {
        for (const d of INITIAL_DEPARTMENTS) await prisma.department.upsert({ where: { id: d.id }, update: d, create: d });
        console.log("✓ Departments");
    } catch(e) { console.error("x Departments error", e) }

    try {
        for (const r of INITIAL_RANKS) await prisma.salaryRank.upsert({ where: { id: r.id }, update: r, create: r });
        for (const g of INITIAL_GRADES) await prisma.salaryGrade.upsert({ where: { id: g.id }, update: g, create: g });
        console.log("✓ Ranks & Grades");
    } catch(e) { console.error("x Ranks error", e) }

    try {
        for (const u of INITIAL_USERS) {
            // Check trùng username trước để không bị lỗi
            const existing = await prisma.user.findUnique({ where: { username: u.username } });
            if (!existing) {
                await prisma.user.create({ data: { ...u, joinDate: new Date().toISOString() } });
            }
        }
        console.log("✓ Users");
    } catch(e) { console.error("x Users error", e) }

    try {
        for (const v of INITIAL_VARIABLES) await prisma.salaryVariable.upsert({ where: { code: v.code }, update: v, create: v });
        for (const f of INITIAL_FORMULAS) await prisma.salaryFormula.upsert({ where: { code: f.code }, update: f, create: f });
        console.log("✓ Configs (Variables, Formulas)");
    } catch(e) { console.error("x Configs error", e) }
    
    try {
        for (const g of INITIAL_GROUPS) await prisma.criterionGroup.upsert({ where: { id: g.id }, update: g, create: g });
        for (const c of INITIAL_CRITERIA) await prisma.criterion.upsert({ where: { id: c.id }, update: c, create: { ...c, proofRequired: false } });
        console.log("✓ Criteria");
    } catch(e) { console.error("x Criteria error", e) }

    console.log("--> SEEDING COMPLETED!");
    return { success: true };
};