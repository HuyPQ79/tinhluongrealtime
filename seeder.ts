import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// --- 1. BIẾN SỐ LƯƠNG (SALARY VARIABLES) ---
const INITIAL_VARIABLES = [
  // Nhóm CÔNG
  { code: 'Ctc', name: 'Công tiêu chuẩn', desc: 'Tổng ngày công làm việc chuẩn trong tháng (26)', group: 'CÔNG' },
  { code: 'Ctt', name: 'Công thực tế', desc: 'Tổng ngày công đi làm thực tế được chấm', group: 'CÔNG' },
  { code: 'OT_hs', name: 'Hệ số tăng ca', desc: 'Hệ số nhân khi làm thêm giờ (1.5, 2.0...)', group: 'CÔNG' },
  
  // Nhóm ĐỊNH MỨC (Lấy từ User)
  { code: 'LCB_dm', name: 'Lương CB định mức', desc: 'Mức lương cơ bản trên hợp đồng', group: 'ĐỊNH MỨC' },
  { code: 'LHQ_dm', name: 'Lương HQ định mức', desc: 'Mức lương hiệu quả tối đa', group: 'ĐỊNH MỨC' },
  { code: 'LSL_dm', name: 'Lương khoán định mức', desc: 'Định mức lương khoán sản phẩm', group: 'ĐỊNH MỨC' },
  { code: 'KPI', name: 'Hệ số KPI', desc: 'Kết quả đánh giá hiệu suất (0.0 - 1.2)', group: 'ĐỊNH MỨC' },
  
  // Nhóm KẾT QUẢ
  { code: 'Gross', name: 'Tổng thu nhập Gross', desc: 'Tổng thu nhập trước thuế và bảo hiểm', group: 'KẾT QUẢ' },
  { code: 'Net', name: 'Thực lĩnh', desc: 'Số tiền thực tế chuyển khoản', group: 'KẾT QUẢ' },
  { code: 'Tax', name: 'Thuế TNCN', desc: 'Tiền thuế thu nhập cá nhân phải nộp', group: 'KẾT QUẢ' }
];

// --- 2. CÔNG THỨC TÍNH LƯƠNG (SALARY FORMULAS) ---
const INITIAL_FORMULAS = [
  { 
    code: 'F1_LCB_TT', 
    name: 'Lương CB Thực Tế', 
    area: 'ALL', 
    expression: '({LCB_dm} / {Ctc}) * {Ctt}', 
    description: 'Lương cơ bản tính theo ngày công thực tế',
    group: 'THU NHẬP',
    order: 1
  },
  { 
    code: 'F2_LHQ_TT', 
    name: 'Lương Hiệu Quả TT', 
    area: 'OFFICE', 
    expression: '({LHQ_dm} / {Ctc}) * {Ctt} * {KPI}', 
    description: 'Lương hiệu quả theo KPI và ngày công',
    group: 'THU NHẬP',
    order: 2
  },
  { 
    code: 'F3_KHOAN_TT', 
    name: 'Lương Khoán TT', 
    area: 'FACTORY', 
    expression: '{LSL_dm} * {KPI}', 
    description: 'Lương khoán theo sản phẩm và chất lượng',
    group: 'THU NHẬP',
    order: 3
  },
  { 
    code: 'F4_TAX_TNCN', 
    name: 'Thuế TNCN', 
    area: 'ALL', 
    expression: 'f_tax({Gross} - 11000000 - ({N_pt} * 4400000) - {BHXH})', 
    description: 'Thuế lũy tiến từng phần',
    group: 'KHẤU TRỪ',
    order: 90
  },
  { 
    code: 'F5_NET', 
    name: 'Thực Lĩnh (Net)', 
    area: 'ALL', 
    expression: '{Gross} - {BHXH} - {Tax} - {TamUng}', 
    description: 'Số tiền thực nhận cuối kỳ',
    group: 'KẾT QUẢ',
    order: 100
  }
];

// --- 3. DỮ LIỆU TỔ CHỨC & USER ---
const INITIAL_DEPARTMENTS = [
  { id: 'D1', name: 'Ban Lãnh Đạo & Điều Hành', budgetNorm: 5000000000 },
  { id: 'D2', name: 'Khối Kinh Doanh', budgetNorm: 2000000000 },
  { id: 'D3', name: 'Xưởng Sản Xuất 01', budgetNorm: 1500000000 },
  { id: 'D4', name: 'Phòng Tài Chính Kế Toán', budgetNorm: 800000000 },
  { id: 'D5', name: 'Phòng Hành Chính Nhân Sự', budgetNorm: 600000000 },
];

const INITIAL_USERS = [
  { id: 'USR_BLD', username: 'bld', password: '123', name: 'Lê Ban Lãnh Đạo', roles: ['BAN_LANH_DAO'], currentDeptId: 'D1', paymentType: 'TIME', efficiencySalary: 25000000 },
  { id: 'USR_TPKD', username: 'tpkd', password: '123', name: 'Nguyễn Văn TP Kinh Doanh', roles: ['QUAN_LY'], currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 15000000 },
  { id: 'USR_TPSX', username: 'tpsx', password: '123', name: 'Phạm Văn TP Sản Xuất', roles: ['QUAN_LY'], currentDeptId: 'D3', paymentType: 'PIECEWORK', pieceworkUnitPrice: 150000 },
  { id: 'USR_NV_SALE', username: 'nv.sale', password: '123', name: 'Đặng Nhân Viên Sale', roles: ['NHAN_VIEN'], currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 8000000 },
  { id: 'USR_NV_CN', username: 'nv.cn', password: '123', name: 'Bùi Công Nhân', roles: ['NHAN_VIEN'], currentDeptId: 'D3', paymentType: 'PIECEWORK', pieceworkUnitPrice: 35000 }
];

// --- 4. HÀM SEED CHÍNH ---
export const seedDatabase = async () => {
    console.log("--> [SEEDER] Bắt đầu nạp dữ liệu cấu hình...");

    // 1. Nạp Departments
    for (const d of INITIAL_DEPARTMENTS) {
        await prisma.department.upsert({ where: { id: d.id }, update: d, create: d });
    }

    // 2. Nạp Users
    for (const u of INITIAL_USERS) {
        const exists = await prisma.user.findUnique({ where: { username: u.username } });
        if (!exists) {
            await prisma.user.create({
                data: { ...u, joinDate: new Date().toISOString() }
            });
        }
    }

    // 3. Nạp Variables
    for (const v of INITIAL_VARIABLES) {
        await prisma.salaryVariable.upsert({
            where: { code: v.code },
            update: { name: v.name, group: v.group, description: v.desc },
            create: { code: v.code, name: v.name, group: v.group, description: v.desc }
        });
    }

    // 4. Nạp Formulas
    for (const f of INITIAL_FORMULAS) {
        await prisma.salaryFormula.upsert({
            where: { code: f.code },
            update: f,
            create: f
        });
    }

    console.log("--> [SEEDER] Hoàn tất 100%! Hệ thống đã sẵn sàng.");
    return { success: true };
};