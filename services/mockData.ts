
import { 
  SalaryRank, SalaryGrade, Department, Criterion, UserRole, User, 
  SalaryRecord, AuditLog, SalaryFormula, UserStatus, CriterionGroup, 
  DailyWorkItem, SalaryVariable, AttendanceType, AttendanceRecord, 
  EvaluationRequest, EvaluationScope, EvaluationTarget, RecordStatus 
} from '../types';

// --- DANH MỤC CẤU TRÚC (Giữ lại để hệ thống sẵn sàng vận hành) ---

export const INITIAL_RANKS: SalaryRank[] = [
  { id: 'R1', name: 'Ban Lãnh Đạo / HĐQT', order: 1 },
  { id: 'R2', name: 'Giám Đốc Khối', order: 2 },
  { id: 'R3', name: 'Trưởng Phòng / Đơn Vị', order: 3 },
  { id: 'R4', name: 'Tổ Trưởng / Giám Sát', order: 4 },
  { id: 'R5', name: 'Nhân Viên / Công Nhân', order: 5 },
];

export const INITIAL_CRITERIA_GROUPS: CriterionGroup[] = [
  { id: 'CG1', name: 'Tuân thủ kỷ luật', weight: 20 },
  { id: 'CG2', name: 'Hiệu suất chuyên môn', weight: 50 },
  { id: 'CG3', name: 'Sáng kiến & Phối hợp', weight: 30 },
];

export const INITIAL_CRITERIA: Criterion[] = [
  { id: 'C1', groupId: 'CG1', name: 'Đi muộn/Về sớm', type: 'PENALTY', unit: 'PERCENT', value: 2, point: -1, threshold: 2, description: 'Vi phạm quy định giờ giấc (Bắt đầu trừ từ lần thứ 3)' },
  { id: 'C2', groupId: 'CG1', name: 'Nghỉ không phép', type: 'PENALTY', unit: 'PERCENT', value: 10, point: -5, threshold: 0, description: 'Tự ý bỏ việc không thông báo (Trừ ngay lần đầu)' },
  { id: 'C3', groupId: 'CG2', name: 'Vượt tiến độ dự án', type: 'BONUS', unit: 'PERCENT', value: 15, point: 5, threshold: 0, description: 'Hoàn thành trước thời hạn cam kết (Thưởng ngay)' },
  { id: 'C4', groupId: 'CG3', name: 'Sáng kiến quy trình', type: 'BONUS', unit: 'PERCENT', value: 20, point: 10, threshold: 0, description: 'Cải tiến rút ngắn thời gian làm việc (Thưởng ngay)' },
  { id: 'C5', groupId: 'CG2', name: 'Sai lỗi kỹ thuật nghiêm trọng', type: 'PENALTY', unit: 'PERCENT', value: 30, point: -10, threshold: 0, description: 'Gây thiệt hại lớn cho hệ thống (Trừ ngay lần đầu)' },
];

export const INITIAL_DAILY_WORK: DailyWorkItem[] = [
  { id: 'DW1', name: 'Sửa chữa máy phát', unitPrice: 350000 },
  { id: 'DW2', name: 'Kiểm kê kho bãi', unitPrice: 200000 },
];

export const INITIAL_GRADES: SalaryGrade[] = INITIAL_RANKS.flatMap(rank => 
  [1, 2, 3, 4, 5].map(level => ({
    id: `G_${rank.id}_${level}`,
    rankId: rank.id,
    level: level,
    baseSalary: (6 - rank.order) * 4500000 + (level * 1000000),
    efficiencySalary: 0,
    fixedAllowance: 1500000,
    flexibleAllowance: 500000,
    otherSalary: 0,
    fixedBonuses: []
  }))
);

export const INITIAL_DEPARTMENTS: Department[] = [
  { id: 'D1', name: 'Ban Lãnh Đạo & Điều Hành', budgetNorm: 5000000000, blockDirectorId: 'USR_ADMIN' },
  { id: 'D2', name: 'Khối Kinh Doanh', budgetNorm: 2000000000 },
  { id: 'D3', name: 'Xưởng Sản Xuất 01', budgetNorm: 1500000000 },
  { id: 'D4', name: 'Phòng Tài Chính Kế Toán', budgetNorm: 800000000 },
  { id: 'D5', name: 'Phòng Hành Chính Nhân Sự', budgetNorm: 600000000 },
];

// --- DỮ LIỆU NHÂN SỰ (Chỉ giữ lại duy nhất Admin) ---

export const INITIAL_USERS: User[] = [
  { 
    id: 'USR_ADMIN', 
    username: 'admin', 
    password: '123', 
    name: 'Quản Trị Hệ Thống', 
    avatar: 'https://ui-avatars.com/api/?name=Admin&background=0f172a&color=fff', 
    joinDate: new Date().toISOString().split('T')[0], 
    status: UserStatus.ACTIVE, 
    roles: [UserRole.ADMIN], 
    numberOfDependents: 0, 
    salaryHistory: [], 
    assignedDeptIds: ['D1', 'D2', 'D3', 'D4', 'D5'], 
    activeAssignments: [], 
    paymentType: 'TIME', 
    efficiencySalary: 0, 
    reservedBonusAmount: 0 
  }
];

// --- DỮ LIỆU PHÁT SINH (Xóa sạch để chuẩn bị deploy) ---

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];
export const INITIAL_EVALUATIONS: EvaluationRequest[] = [];
export const INITIAL_RECORDS: SalaryRecord[] = [];
export const INITIAL_LOGS: AuditLog[] = [];

// --- CÔNG THỨC VÀ BIẾN SỐ (Giữ nguyên logic lõi) ---

export const INITIAL_FORMULAS: SalaryFormula[] = [
  { id: 'F1', name: 'Lương CB thực tế (LCB_tt)', targetField: 'actualBaseSalary', formulaExpression: '({LCB_dm} / {Ctc}) * {Ctt}', isActive: true, order: 1, description: 'Lương cơ bản theo tỷ lệ ngày công thực tế.' },
  { id: 'F2', name: 'Lương HQ thực tế (LHQ_tt)', targetField: 'actualEfficiencySalary', formulaExpression: '({LHQ_dm} / {Ctc}) * {Ctt} + (∑({CO_tc} * {TT_ntc}) - ∑({TR_tc} * {TT_ntc})) * {LHQ_dm}', isActive: true, order: 2, description: 'Lương hiệu quả cộng/trừ KPI theo tỷ trọng nhóm tiêu chí.' },
  { id: 'F3', name: 'Lương Khoán thực tế (LSL_tt)', targetField: 'actualPieceworkSalary', formulaExpression: '({LSL_dm} / {Ctc}) * {Ctt} + (∑({CO_tc} * {TT_ntc}) - ∑({TR_tc} * {TT_ntc})) * {LSL_dm}', isActive: true, order: 3, description: 'Lương khoán định mức nhân tỷ lệ công và điều chỉnh hiệu suất.' },
  { id: 'F4', name: 'Lương Khác (Lk)', targetField: 'otherSalary', formulaExpression: '{Lcn} + {Ltc_ksl} + {Ltc_csl} + {Lncl}', isActive: true, order: 4, description: 'Tổng hợp công nhật, tăng ca và nghỉ chế độ.' },
  { id: 'F5', name: 'Lương Nghỉ có lương (Lncl)', targetField: 'Lncl', formulaExpression: '({NCD} + {NL} + {NCL}) * ({LCB_dm} / {Ctc}) + ({NCV} * {LCB_dm} / {Ctc} * 0.7)', isActive: true, order: 5, description: 'Nghỉ chế độ, lễ, phép hưởng 100% lương; Chờ việc hưởng 70%.' },
  { id: 'F6', name: 'Thuế TNCN (TNCN)', targetField: 'pitDeduction', formulaExpression: 'f({TN_ct})', isActive: true, order: 6, description: 'Tính theo biểu thuế lũy tiến từng phần trên thu nhập chịu thuế.' },
  { id: 'F7', name: 'Thực lĩnh (Net)', targetField: 'netSalary', formulaExpression: '{Gross} - {KT} - {TU}', isActive: true, order: 7, description: 'Số tiền cuối cùng nhân viên nhận được.' },
];

export const INITIAL_SALARY_VARIABLES: SalaryVariable[] = [
  { code: 'Ctc', name: 'Công tiêu chuẩn', desc: 'Tổng ngày trong tháng trừ Chủ nhật', group: 'CÔNG' },
  { code: 'Ctt', name: 'Công thực tế', desc: 'Tổng công thời gian hoặc công khoán', group: 'CÔNG' },
  { code: 'Cn', name: 'Công nhật', desc: 'Số ngày làm việc theo đơn giá nhật việc', group: 'CÔNG' },
  { code: 'OT_h_csl', name: 'Giờ OT có SL', desc: 'Giờ tăng ca có tính sản lượng', group: 'CÔNG' },
  { code: 'OT_h_ksl', name: 'Giờ OT không SL', desc: 'Giờ tăng ca không tính sản lượng', group: 'CÔNG' },
  { code: 'NCD', name: 'Nghỉ chế độ', desc: 'Nghỉ hưởng BHXH (ốm, thai sản...)', group: 'CÔNG' },
  { code: 'NL', name: 'Nghỉ lễ', desc: 'Nghỉ các ngày lễ tết theo luật', group: 'CÔNG' },
  { code: 'NCL', name: 'Nghỉ có lương', desc: 'Nghỉ phép năm hưởng lương', group: 'CÔNG' },
  { code: 'NKL', name: 'Nghỉ không lương', desc: 'Nghỉ việc riêng không hưởng lương', group: 'CÔNG' },
  { code: 'NCV', name: 'Nghỉ chờ việc', desc: 'Nghỉ do lỗi doanh nghiệp/khách quan', group: 'CÔNG' },
  { code: 'OT_hs', name: 'Hệ số tăng ca', desc: 'Tỷ lệ nhân lương OT (1.5, 2.0, 3.0)', group: 'CÔNG' },
  { code: 'LCB_dm', name: 'Lương CB định mức', desc: 'Khai báo trong Khung năng lực', group: 'ĐỊNH MỨC' },
  { code: 'LHQ_dm', name: 'Lương HQ định mức', desc: 'Lương hiệu quả tối đa theo User', group: 'ĐỊNH MỨC' },
  { code: 'LSL_dm', name: 'Lương khoán định mức', desc: 'Sản lượng khoán * Đơn giá khoán', group: 'ĐỊNH MỨC' },
  { code: 'SL_khoan', name: 'Sản lượng khoán', desc: 'Chỉ tiêu sản lượng giao đầu tháng', group: 'ĐỊNH MỨC' },
  { code: 'DG_khoan', name: 'Đơn giá khoán', desc: 'Số tiền trên 1 đơn vị sản phẩm', group: 'ĐỊNH MỨC' },
  { code: 'TT_ntc', name: 'Tỷ trọng nhóm TC', desc: 'Trọng số của nhóm tiêu chí KPI', group: 'ĐỊNH MỨC' },
  { code: 'HS_tn', name: 'Hệ số thâm niên', desc: 'Tỷ lệ hưởng thưởng theo thời gian làm việc', group: 'ĐỊNH MỨC' },
  { code: 'LCB_tt', name: 'Lương CB thực tế', desc: '(LCB_dm / Ctc) * Ctt', group: 'THU NHẬP THỰC' },
  { code: 'LHQ_tt', name: 'Lương HQ thực tế', desc: 'LHQ định mức nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'LSL_tt', name: 'Lương khoán thực tế', desc: 'Lương khoán nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'SL_tt', name: 'Sản lượng thực tế', desc: 'Tổng sản lượng làm được trong kỳ', group: 'THU NHẬP THỰC' },
  { code: 'Lk', name: 'Lương khác', desc: 'Tổng Lcn + Ltc + Lncl', group: 'THU NHẬP THỰC' },
  { code: 'PC', name: 'Tổng phụ cấp', desc: 'Tổng PC_cd + PC_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH', name: 'Tổng thưởng', desc: 'Tổng TH_cd + TH_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'KT', name: 'Tổng khấu trừ', desc: 'BHXH + CD + TNCN + KT_kh', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'Gross', name: 'Tổng thu nhập Gross', desc: 'Tổng thu nhập trước bảo hiểm và thuế', group: 'KẾT QUẢ' },
  { code: 'TU', name: 'Tạm ứng', desc: 'Số tiền nhân viên đã ứng trước', group: 'KẾT QUẢ' },
  { code: 'Net', name: 'Thực lĩnh Net', desc: 'Thu nhập cuối cùng thực nhận', group: 'KẾT QUẢ' }
];

export const INITIAL_HOLIDAY_POLICIES: any[] = [];
