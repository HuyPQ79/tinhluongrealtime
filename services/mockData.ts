
import { 
  SalaryRank, SalaryGrade, Department, Criterion, UserRole, User, 
  SalaryRecord, AuditLog, SalaryFormula, UserStatus, CriterionGroup, 
  DailyWorkItem, SalaryVariable, AttendanceType, AttendanceRecord, 
  EvaluationRequest, EvaluationScope, EvaluationTarget, RecordStatus 
} from '../types';

// --- DANH MỤC CỐ ĐỊNH ---

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
  { id: 'D1', name: 'Ban Lãnh Đạo & Điều Hành', budgetNorm: 5000000000, blockDirectorId: 'USR_BLD' },
  { id: 'D2', name: 'Khối Kinh Doanh', budgetNorm: 2000000000, blockDirectorId: 'USR_GDK', managerId: 'USR_TP_TIME' },
  { id: 'D3', name: 'Xưởng Sản Xuất 01', budgetNorm: 1500000000, managerId: 'USR_TP_PIECE' },
  { id: 'D4', name: 'Phòng Tài Chính Kế Toán', budgetNorm: 800000000, managerId: 'USR_KTL' },
  { id: 'D5', name: 'Phòng Hành Chính Nhân Sự', budgetNorm: 600000000, managerId: 'USR_NS' },
];

export const INITIAL_USERS: User[] = [
  { id: 'USR_ADMIN', username: 'admin', password: '123', name: 'Quản Trị Hệ Thống', avatar: 'https://ui-avatars.com/api/?name=Admin&background=0f172a&color=fff', joinDate: '2020-01-01', status: UserStatus.ACTIVE, roles: [UserRole.ADMIN], numberOfDependents: 0, salaryHistory: [], assignedDeptIds: ['D1', 'D2', 'D3', 'D4', 'D5'], activeAssignments: [], paymentType: 'TIME', efficiencySalary: 0, reservedBonusAmount: 0 },
  { id: 'USR_BLD', username: 'bld', password: '123', name: 'Lê Ban Lãnh Đạo', avatar: 'https://ui-avatars.com/api/?name=BLD&background=ef4444&color=fff', joinDate: '2018-05-20', status: UserStatus.ACTIVE, roles: [UserRole.BAN_LANH_DAO], numberOfDependents: 2, salaryHistory: [], assignedDeptIds: ['D1'], activeAssignments: [], currentRankId: 'R1', currentGradeId: 'G_R1_5', currentPosition: 'Tổng Giám Đốc', currentDeptId: 'D1', paymentType: 'TIME', efficiencySalary: 25000000, reservedBonusAmount: 100000000 },
  { id: 'USR_GDK', username: 'gdk', password: '123', name: 'Trần Giám Đốc Khối', avatar: 'https://ui-avatars.com/api/?name=GDK&background=3b82f6&color=fff', joinDate: '2019-11-15', status: UserStatus.ACTIVE, roles: [UserRole.GIAM_DOC_KHOI], numberOfDependents: 1, salaryHistory: [], assignedDeptIds: ['D2', 'D3'], activeAssignments: [], currentRankId: 'R2', currentGradeId: 'G_R2_3', currentPosition: 'Giám Đốc Khối Vận Hành', currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 18000000, reservedBonusAmount: 70000000 },
  { id: 'USR_TP_TIME', username: 'tpkd', password: '123', name: 'Nguyễn Văn TP Kinh Doanh (Thời Gian)', avatar: 'https://ui-avatars.com/api/?name=TP+KD&background=6366f1&color=fff', joinDate: '2021-03-10', status: UserStatus.ACTIVE, roles: [UserRole.QUAN_LY], numberOfDependents: 1, salaryHistory: [], assignedDeptIds: ['D2'], activeAssignments: [], currentRankId: 'R3', currentGradeId: 'G_R3_2', currentPosition: 'Trưởng Phòng Kinh Doanh', currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 12000000, reservedBonusAmount: 50000000 },
  { id: 'USR_TP_PIECE', username: 'tpsx', password: '123', name: 'Phạm Văn TP Sản Xuất (Khoán)', avatar: 'https://ui-avatars.com/api/?name=TP+SX&background=10b981&color=fff', joinDate: '2021-06-15', status: UserStatus.ACTIVE, roles: [UserRole.QUAN_LY], numberOfDependents: 0, salaryHistory: [], assignedDeptIds: ['D3'], activeAssignments: [], currentRankId: 'R3', currentGradeId: 'G_R3_3', currentPosition: 'Trưởng Xưởng Sản Xuất', currentDeptId: 'D3', paymentType: 'PIECEWORK', pieceworkUnitPrice: 150000, efficiencySalary: 0, reservedBonusAmount: 30000000 },
  { id: 'USR_KTL', username: 'ktl', password: '123', name: 'Hoàng Kế Toán Lương', avatar: 'https://ui-avatars.com/api/?name=KT+L&background=f59e0b&color=fff', joinDate: '2022-01-20', status: UserStatus.ACTIVE, roles: [UserRole.KE_TOAN_LUONG], numberOfDependents: 0, salaryHistory: [], assignedDeptIds: ['D1', 'D2', 'D3', 'D4', 'D5'], activeAssignments: [], currentRankId: 'R4', currentGradeId: 'G_R4_4', currentPosition: 'Kế Toán Trưởng', currentDeptId: 'D4', paymentType: 'TIME', efficiencySalary: 10000000, reservedBonusAmount: 20000000 },
  { id: 'USR_NS', username: 'ns', password: '123', name: 'Vũ Nhân Sự', avatar: 'https://ui-avatars.com/api/?name=NS&background=ec4899&color=fff', joinDate: '2022-04-10', status: UserStatus.ACTIVE, roles: [UserRole.NHAN_SU], numberOfDependents: 1, salaryHistory: [], assignedDeptIds: ['D5'], activeAssignments: [], currentRankId: 'R4', currentGradeId: 'G_R4_2', currentPosition: 'Trưởng Phòng Nhân Sự', currentDeptId: 'D5', paymentType: 'TIME', efficiencySalary: 10000000, reservedBonusAmount: 20000000 },
  { id: 'USR_NV_TIME', username: 'nv.sale', password: '123', name: 'Đặng Nhân Viên Sale (Thời Gian)', avatar: 'https://ui-avatars.com/api/?name=NV+Sale&background=8b5cf6&color=fff', joinDate: '2024-02-01', status: UserStatus.ACTIVE, roles: [UserRole.NHAN_VIEN], numberOfDependents: 0, salaryHistory: [], assignedDeptIds: [], activeAssignments: [], currentRankId: 'R5', currentGradeId: 'G_R5_1', currentPosition: 'Chuyên Viên Kinh Doanh', currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 6000000, reservedBonusAmount: 10000000 },
  { id: 'USR_NV_PIECE', username: 'nv.cn', password: '123', name: 'Bùi Công Nhân (Khoán)', avatar: 'https://ui-avatars.com/api/?name=CN&background=06b6d4&color=fff', joinDate: '2024-05-10', status: UserStatus.ACTIVE, roles: [UserRole.NHAN_VIEN], numberOfDependents: 0, salaryHistory: [], assignedDeptIds: [], activeAssignments: [], currentRankId: 'R5', currentGradeId: 'G_R5_1', currentPosition: 'Công Nhân Bậc 1', currentDeptId: 'D3', paymentType: 'PIECEWORK', pieceworkUnitPrice: 35000, efficiencySalary: 0, reservedBonusAmount: 10000000 }
];

// CLEAR DỮ LIỆU CHẤM CÔNG GIẢ ĐỊNH THEO YÊU CẦU
export const INITIAL_ATTENDANCE: AttendanceRecord[] = [];

export const INITIAL_EVALUATIONS: EvaluationRequest[] = [
    { id: 'EV_DEC_1', userId: 'USR_NV_TIME', userName: 'Đặng Nhân Viên Sale (Thời Gian)', criteriaId: 'C1', criteriaName: 'Đi muộn/Về sớm', scope: EvaluationScope.MAIN_JOB, target: EvaluationTarget.MONTHLY_SALARY, type: 'PENALTY', points: 1, description: 'Đi muộn 20p sáng 02/12', proofFileName: '', requesterId: 'USR_TP_TIME', status: RecordStatus.APPROVED, createdAt: '2025-12-02T08:20:00Z' },
    { id: 'EV_DEC_2', userId: 'USR_NV_PIECE', userName: 'Bùi Công Nhân (Khoán)', criteriaId: 'C3', criteriaName: 'Vượt tiến độ dự án', scope: EvaluationScope.MAIN_JOB, target: EvaluationTarget.MONTHLY_SALARY, type: 'BONUS', points: 5, description: 'Hoàn thành sớm lô hàng xuất khẩu', proofFileName: 'export-report.pdf', requesterId: 'USR_TP_PIECE', status: RecordStatus.APPROVED, createdAt: '2025-12-05T16:00:00Z' },
];

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
  // NHÓM CÔNG
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

  // NHÓM ĐỊNH MỨC
  { code: 'LCB_dm', name: 'Lương CB định mức', desc: 'Khai báo trong Khung năng lực', group: 'ĐỊNH MỨC' },
  { code: 'LHQ_dm', name: 'Lương HQ định mức', desc: 'Lương hiệu quả tối đa theo User', group: 'ĐỊNH MỨC' },
  { code: 'LSL_dm', name: 'Lương khoán định mức', desc: 'Sản lượng khoán * Đơn giá khoán', group: 'ĐỊNH MỨC' },
  { code: 'SL_khoan', name: 'Sản lượng khoán', desc: 'Chỉ tiêu sản lượng giao đầu tháng', group: 'ĐỊNH MỨC' },
  { code: 'DG_khoan', name: 'Đơn giá khoán', desc: 'Số tiền trên 1 đơn vị sản phẩm', group: 'ĐỊNH MỨC' },
  { code: 'TT_ntc', name: 'Tỷ trọng nhóm TC', desc: 'Trọng số của nhóm tiêu chí KPI', group: 'ĐỊNH MỨC' },
  { code: 'HS_tn', name: 'Hệ số thâm niên', desc: 'Tỷ lệ hưởng thưởng theo thời gian làm việc', group: 'ĐỊNH MỨC' },

  // NHÓM THU NHẬP THỰC
  { code: 'LCB_tt', name: 'Lương CB thực tế', desc: '(LCB_dm / Ctc) * Ctt', group: 'THU NHẬP THỰC' },
  { code: 'LHQ_tt', name: 'Lương HQ thực tế', desc: 'LHQ định mức nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'LSL_tt', name: 'Lương khoán thực tế', desc: 'Lương khoán nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'SL_tt', name: 'Sản lượng thực tế', desc: 'Tổng sản lượng làm được trong kỳ', group: 'THU NHẬP THỰC' },
  { code: 'Lk', name: 'Lương khác', desc: 'Tổng Lcn + Ltc + Lncl', group: 'THU NHẬP THỰC' },
  { code: 'Lcn', name: 'Lương công nhật', desc: 'Tổng cộng thù lao công việc nhật', group: 'THU NHẬP THỰC' },
  { code: 'DG_cn', name: 'Đơn giá công nhật', desc: 'Số tiền trả cho 1 ngày nhật việc', group: 'THU NHẬP THỰC' },
  { code: 'Ltc_ksl', name: 'Lương OT không SL', desc: 'Lương tăng ca tính theo đơn giá nhật việc', group: 'THU NHẬP THỰC' },
  { code: 'Ltc_csl', name: 'Lương OT có SL', desc: 'Lương tăng ca tính theo Lương CB', group: 'THU NHẬP THỰC' },
  { code: 'Lncl', name: 'Lương nghỉ có lương', desc: 'Tiền lương các ngày nghỉ lễ/phép/chế độ', group: 'THU NHẬP THỰC' },

  // PHỤ CẤP / THƯỞNG
  { code: 'PC', name: 'Tổng phụ cấp', desc: 'Tổng PC_cd + PC_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'PC_cd', name: 'Phụ cấp cố định', desc: 'Phụ cấp theo khung năng lực', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'PC_lh', name: 'Phụ cấp linh hoạt', desc: 'Các khoản phụ cấp điều chỉnh tay', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH', name: 'Tổng thưởng', desc: 'Tổng TH_cd + TH_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH_cd', name: 'Thưởng cố định', desc: 'Thưởng định kỳ lễ tết theo khung', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH_lh', name: 'Thưởng linh hoạt', desc: 'Thưởng điều chỉnh tay/dự án', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'CO_tc', name: 'Điểm cộng tiêu chí', desc: 'Điểm thưởng KPI từ phiếu đánh giá', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TR_tc', name: 'Điểm trừ tiêu chí', desc: 'Điểm phạt KPI từ phiếu đánh giá', group: 'PHỤ CẤP / THƯỞNG' },

  // KHẤU TRỪ / THUẾ
  { code: 'KT', name: 'Tổng khấu trừ', desc: 'BHXH + CD + TNCN + KT_kh', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'BHXH', name: 'Bảo hiểm xã hội', desc: 'Tiền trích đóng BHXH (10.5%)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'CD', name: 'Công đoàn', desc: 'Kinh phí công đoàn (1%)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'TNCN', name: 'Thuế TNCN', desc: 'Thuế thu nhập cá nhân tạm tính', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'GT_bt', name: 'Giảm trừ bản thân', desc: 'Mức giảm trừ thuế (11.000.000)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'N_pt', name: 'Người phụ thuộc', desc: 'Số người phụ thuộc khai báo', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'GT_pt', name: 'Giảm trừ phụ thuộc', desc: '4.400.000 * N_pt', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'KT_kh', name: 'Khấu trừ khác', desc: 'Các khoản trừ điều chỉnh tay/phạt', group: 'KHẤU TRỪ / THUẾ' },

  // KẾT QUẢ
  { code: 'Gross', name: 'Tổng thu nhập Gross', desc: 'Tổng thu nhập trước bảo hiểm và thuế', group: 'KẾT QUẢ' },
  { code: 'TU', name: 'Tạm ứng', desc: 'Số tiền nhân viên đã ứng trước', group: 'KẾT QUẢ' },
  { code: 'Net', name: 'Thực lĩnh Net', desc: 'Thu nhập cuối cùng thực nhận', group: 'KẾT QUẢ' }
];

export const INITIAL_HOLIDAY_POLICIES: any[] = [];
export const INITIAL_LOGS: AuditLog[] = [];
export const INITIAL_RECORDS: SalaryRecord[] = [];
