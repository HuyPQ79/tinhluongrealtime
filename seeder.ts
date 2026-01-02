import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// =============================================================================
// 1. CHUẨN BỊ DỮ LIỆU TỪ MOCKDATA (COPY NGUYÊN BẢN)
// =============================================================================

const INITIAL_RANKS = [
  { id: 'R1', name: 'Ban Lãnh Đạo / HĐQT', order: 1, baseSalary: 0, allowance: 0 },
  { id: 'R2', name: 'Giám Đốc Khối', order: 2, baseSalary: 0, allowance: 0 },
  { id: 'R3', name: 'Trưởng Phòng / Đơn Vị', order: 3, baseSalary: 0, allowance: 0 },
  { id: 'R4', name: 'Tổ Trưởng / Giám Sát', order: 4, baseSalary: 0, allowance: 0 },
  { id: 'R5', name: 'Nhân Viên / Công Nhân', order: 5, baseSalary: 0, allowance: 0 },
];

const INITIAL_GRADES = INITIAL_RANKS.flatMap(rank => 
  [1, 2, 3, 4, 5].map(level => {
    const baseAmount = (6 - rank.order) * 4500000 + (level * 1000000);
    return {
      id: `G_${rank.id}_${level}`,
      rankId: rank.id,
      name: `Bậc ${level}`,
      level: level,
      multiplier: 1.0,
      amount: baseAmount,
      baseSalary: baseAmount * 0.6, // 60% lương cơ bản
      efficiencySalary: baseAmount * 0.3, // 30% lương hiệu quả
      fixedAllowance: baseAmount * 0.05, // 5% phụ cấp cố định
      flexibleAllowance: 0,
      otherSalary: 0,
      fixedBonuses: [] // Có thể thêm thưởng theo tháng sau
    };
  })
);

const INITIAL_CRITERIA_GROUPS = [
  { id: 'CG1', name: 'Tuân thủ kỷ luật', weight: 20 },
  { id: 'CG2', name: 'Hiệu suất chuyên môn', weight: 50 },
  { id: 'CG3', name: 'Sáng kiến & Phối hợp', weight: 30 },
];

const INITIAL_CRITERIA = [
  { id: 'C1', groupId: 'CG1', name: 'Đi muộn/Về sớm', type: 'PENALTY', target: 'MONTHLY', points: 1, unit: 'PERCENT', value: 0.5, threshold: 2, description: 'Vi phạm quy định giờ giấc (Bắt đầu trừ từ lần thứ 3)' },
  { id: 'C2', groupId: 'CG1', name: 'Nghỉ không phép', type: 'PENALTY', target: 'MONTHLY', points: 5, unit: 'PERCENT', value: 2.0, threshold: 0, description: 'Tự ý bỏ việc không thông báo (Trừ ngay lần đầu)' },
  { id: 'C3', groupId: 'CG2', name: 'Vượt tiến độ dự án', type: 'BONUS', target: 'PROJECT', points: 5, unit: 'PERCENT', value: 3.0, threshold: 0, description: 'Hoàn thành trước thời hạn cam kết (Thưởng ngay)' },
  { id: 'C4', groupId: 'CG3', name: 'Sáng kiến quy trình', type: 'BONUS', target: 'MONTHLY', points: 10, unit: 'PERCENT', value: 5.0, threshold: 0, description: 'Cải tiến rút ngắn thời gian làm việc (Thưởng ngay)' },
  { id: 'C5', groupId: 'CG2', name: 'Sai lỗi kỹ thuật nghiêm trọng', type: 'PENALTY', target: 'MONTHLY', points: 10, unit: 'PERCENT', value: 5.0, threshold: 0, description: 'Gây thiệt hại lớn cho hệ thống (Trừ ngay lần đầu)' },
];

const INITIAL_DAILY_WORK = [
  { id: 'DW1', name: 'Sửa chữa máy phát', unitPrice: 350000, type: 'SERVICE' },
  { id: 'DW2', name: 'Kiểm kê kho bãi', unitPrice: 200000, type: 'SERVICE' },
];

const INITIAL_DEPARTMENTS = [
  { id: 'D1', name: 'Ban Lãnh Đạo & Điều Hành', budgetNorm: 5000000000, blockDirectorId: 'USR_BLD' },
  { id: 'D2', name: 'Khối Kinh Doanh', budgetNorm: 2000000000, blockDirectorId: 'USR_GDK', managerId: 'USR_TP_TIME' },
  { id: 'D3', name: 'Xưởng Sản Xuất 01', budgetNorm: 1500000000, managerId: 'USR_TP_PIECE' },
  { id: 'D4', name: 'Phòng Tài Chính Kế Toán', budgetNorm: 800000000, managerId: 'USR_KTL' },
  { id: 'D5', name: 'Phòng Hành Chính Nhân Sự', budgetNorm: 600000000, managerId: 'USR_NS' },
];

const INITIAL_USERS = [
  { id: 'USR_ADMIN', username: 'admin', password: '123', name: 'Quản Trị Hệ Thống', avatar: 'https://ui-avatars.com/api/?name=Admin&background=0f172a&color=fff', joinDate: '2020-01-01', status: 'ACTIVE', roles: ['ADMIN'], numberOfDependents: 0, paymentType: 'TIME', efficiencySalary: 0, reservedBonusAmount: 0 },
  { id: 'USR_BLD', username: 'bld', password: '123', name: 'Lê Ban Lãnh Đạo', avatar: 'https://ui-avatars.com/api/?name=BLD&background=ef4444&color=fff', joinDate: '2018-05-20', status: 'ACTIVE', roles: ['BAN_LANH_DAO'], numberOfDependents: 2, currentRankId: 'R1', currentGradeId: 'G_R1_5', currentDeptId: 'D1', paymentType: 'TIME', efficiencySalary: 25000000, reservedBonusAmount: 100000000 },
  { id: 'USR_GDK', username: 'gdk', password: '123', name: 'Trần Giám Đốc Khối', avatar: 'https://ui-avatars.com/api/?name=GDK&background=3b82f6&color=fff', joinDate: '2019-11-15', status: 'ACTIVE', roles: ['GIAM_DOC_KHOI'], numberOfDependents: 1, currentRankId: 'R2', currentGradeId: 'G_R2_3', currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 18000000, reservedBonusAmount: 70000000 },
  { id: 'USR_TP_TIME', username: 'tpkd', password: '123', name: 'Nguyễn Văn TP Kinh Doanh (Thời Gian)', avatar: 'https://ui-avatars.com/api/?name=TP+KD&background=6366f1&color=fff', joinDate: '2021-03-10', status: 'ACTIVE', roles: ['QUAN_LY'], numberOfDependents: 1, currentRankId: 'R3', currentGradeId: 'G_R3_2', currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 12000000, reservedBonusAmount: 50000000 },
  { id: 'USR_TP_PIECE', username: 'tpsx', password: '123', name: 'Phạm Văn TP Sản Xuất (Khoán)', avatar: 'https://ui-avatars.com/api/?name=TP+SX&background=10b981&color=fff', joinDate: '2021-06-15', status: 'ACTIVE', roles: ['QUAN_LY'], numberOfDependents: 0, currentRankId: 'R3', currentGradeId: 'G_R3_3', currentDeptId: 'D3', paymentType: 'PIECEWORK', pieceworkUnitPrice: 150000, efficiencySalary: 0, reservedBonusAmount: 30000000 },
  { id: 'USR_KTL', username: 'ktl', password: '123', name: 'Hoàng Kế Toán Lương', avatar: 'https://ui-avatars.com/api/?name=KT+L&background=f59e0b&color=fff', joinDate: '2022-01-20', status: 'ACTIVE', roles: ['KE_TOAN_LUONG'], numberOfDependents: 0, currentRankId: 'R4', currentGradeId: 'G_R4_4', currentDeptId: 'D4', paymentType: 'TIME', efficiencySalary: 10000000, reservedBonusAmount: 20000000 },
  { id: 'USR_NS', username: 'ns', password: '123', name: 'Vũ Nhân Sự', avatar: 'https://ui-avatars.com/api/?name=NS&background=ec4899&color=fff', joinDate: '2022-04-10', status: 'ACTIVE', roles: ['NHAN_SU'], numberOfDependents: 1, currentRankId: 'R4', currentGradeId: 'G_R4_2', currentDeptId: 'D5', paymentType: 'TIME', efficiencySalary: 10000000, reservedBonusAmount: 20000000 },
  { id: 'USR_NV_TIME', username: 'nv.sale', password: '123', name: 'Đặng Nhân Viên Sale (Thời Gian)', avatar: 'https://ui-avatars.com/api/?name=NV+Sale&background=8b5cf6&color=fff', joinDate: '2024-02-01', status: 'ACTIVE', roles: ['NHAN_VIEN'], numberOfDependents: 0, currentRankId: 'R5', currentGradeId: 'G_R5_1', currentDeptId: 'D2', paymentType: 'TIME', efficiencySalary: 6000000, reservedBonusAmount: 10000000 },
  { id: 'USR_NV_PIECE', username: 'nv.cn', password: '123', name: 'Bùi Công Nhân (Khoán)', avatar: 'https://ui-avatars.com/api/?name=CN&background=06b6d4&color=fff', joinDate: '2024-05-10', status: 'ACTIVE', roles: ['NHAN_VIEN'], numberOfDependents: 0, currentRankId: 'R5', currentGradeId: 'G_R5_1', currentDeptId: 'D3', paymentType: 'PIECEWORK', pieceworkUnitPrice: 35000, efficiencySalary: 0, reservedBonusAmount: 10000000 }
];

// Công thức từ mockData.ts (đã convert sang format DB, loại bỏ {})
export const INITIAL_FORMULAS = [
  { code: 'F1', name: 'Lương CB thực tế (LCB_tt)', area: 'ALL', targetField: 'actualBaseSalary', expression: '(LCB_dm / Ctc) * Ctt', status: 'ACTIVE', order: 1, description: 'Lương cơ bản theo tỷ lệ ngày công thực tế.', group: 'THU NHẬP' },
  { code: 'F2', name: 'Lương HQ thực tế (LHQ_tt)', area: 'OFFICE', targetField: 'actualEfficiencySalary', expression: '(LHQ_dm / Ctc) * Ctt + (CO_tc - TR_tc) * LHQ_dm', status: 'ACTIVE', order: 2, description: 'Lương hiệu quả cộng/trừ KPI theo tỷ trọng nhóm tiêu chí.', group: 'THU NHẬP' },
  { code: 'F3', name: 'Lương Khoán thực tế (LSL_tt)', area: 'FACTORY', targetField: 'actualPieceworkSalary', expression: '(LSL_dm / Ctc) * Ctt + (CO_tc - TR_tc) * LSL_dm', status: 'ACTIVE', order: 3, description: 'Lương khoán định mức nhân tỷ lệ công và điều chỉnh hiệu suất.', group: 'THU NHẬP' },
  { code: 'F4', name: 'Lương Khác (Lk)', area: 'ALL', targetField: 'otherSalary', expression: 'Lcn + Ltc + Lncl', status: 'ACTIVE', order: 4, description: 'Tổng hợp công nhật, tăng ca và nghỉ chế độ.', group: 'THU NHẬP' },
  { code: 'F5', name: 'Lương Nghỉ có lương (Lncl)', area: 'ALL', targetField: 'Lncl', expression: '(NCD + NL + NCL) * (LCB_dm / Ctc) + (NCV * LCB_dm / Ctc * 0.7)', status: 'ACTIVE', order: 5, description: 'Nghỉ chế độ, lễ, phép hưởng 100% lương; Chờ việc hưởng 70%.', group: 'THU NHẬP' },
  // F6 và F7 sẽ được xử lý đặc biệt (thuế TNCN và Net) - không dùng formula engine
];

export const INITIAL_SALARY_VARIABLES = [
  // NHÓM CÔNG
  { code: 'Ctc', name: 'Công tiêu chuẩn', description: 'Tổng ngày trong tháng trừ Chủ nhật', group: 'CÔNG' },
  { code: 'Ctt', name: 'Công thực tế', description: 'Tổng công thời gian hoặc công khoán', group: 'CÔNG' },
  { code: 'Cn', name: 'Công nhật', description: 'Số ngày làm việc theo đơn giá nhật việc', group: 'CÔNG' },
  { code: 'NCD', name: 'Nghỉ chế độ', description: 'Nghỉ hưởng BHXH (ốm, thai sản...)', group: 'CÔNG' },
  { code: 'NL', name: 'Nghỉ lễ', description: 'Nghỉ các ngày lễ tết theo luật', group: 'CÔNG' },
  { code: 'NCL', name: 'Nghỉ có lương', description: 'Nghỉ phép năm hưởng lương', group: 'CÔNG' },
  { code: 'NKL', name: 'Nghỉ không lương', description: 'Nghỉ việc riêng không hưởng lương', group: 'CÔNG' },
  { code: 'NCV', name: 'Nghỉ chờ việc', description: 'Nghỉ do lỗi doanh nghiệp/khách quan', group: 'CÔNG' },
  
  // NHÓM ĐỊNH MỨC
  { code: 'LCB_dm', name: 'Lương CB định mức', description: 'Khai báo trong Khung năng lực', group: 'ĐỊNH MỨC' },
  { code: 'LHQ_dm', name: 'Lương HQ định mức', description: 'Lương hiệu quả tối đa theo User', group: 'ĐỊNH MỨC' },
  { code: 'LSL_dm', name: 'Lương khoán định mức', description: 'Sản lượng khoán * Đơn giá khoán', group: 'ĐỊNH MỨC' },
  { code: 'SL_khoan', name: 'Sản lượng khoán', description: 'Chỉ tiêu sản lượng giao đầu tháng', group: 'ĐỊNH MỨC' },
  { code: 'DG_khoan', name: 'Đơn giá khoán', description: 'Số tiền trên 1 đơn vị sản phẩm', group: 'ĐỊNH MỨC' },
  { code: 'CO_tc', name: 'Điểm cộng tiêu chí', description: 'Điểm thưởng KPI từ phiếu đánh giá', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TR_tc', name: 'Điểm trừ tiêu chí', description: 'Điểm phạt KPI từ phiếu đánh giá', group: 'PHỤ CẤP / THƯỞNG' },
  
  // NHÓM THU NHẬP THỰC
  { code: 'Lcn', name: 'Lương công nhật', description: 'Tổng cộng thù lao công việc nhật', group: 'THU NHẬP THỰC' },
  { code: 'Ltc', name: 'Lương tăng ca', description: 'Tổng lương tăng ca', group: 'THU NHẬP THỰC' },
  { code: 'Lncl', name: 'Lương nghỉ có lương', description: 'Tiền lương các ngày nghỉ lễ/phép/chế độ', group: 'THU NHẬP THỰC' },
  
  // Bổ sung thêm các biến số từ mockData.ts
  { code: 'OT_h_csl', name: 'Giờ OT có SL', description: 'Giờ tăng ca có tính sản lượng', group: 'CÔNG' },
  { code: 'OT_h_ksl', name: 'Giờ OT không SL', description: 'Giờ tăng ca không tính sản lượng', group: 'CÔNG' },
  { code: 'OT_hs', name: 'Hệ số tăng ca', description: 'Tỷ lệ nhân lương OT (1.5, 2.0, 3.0)', group: 'CÔNG' },
  { code: 'TT_ntc', name: 'Tỷ trọng nhóm TC', description: 'Trọng số của nhóm tiêu chí KPI', group: 'ĐỊNH MỨC' },
  { code: 'HS_tn', name: 'Hệ số thâm niên', description: 'Tỷ lệ hưởng thưởng theo thời gian làm việc', group: 'ĐỊNH MỨC' },
  { code: 'LCB_tt', name: 'Lương CB thực tế', description: '(LCB_dm / Ctc) * Ctt', group: 'THU NHẬP THỰC' },
  { code: 'LHQ_tt', name: 'Lương HQ thực tế', description: 'LHQ định mức nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'LSL_tt', name: 'Lương khoán thực tế', description: 'Lương khoán nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'SL_tt', name: 'Sản lượng thực tế', description: 'Tổng sản lượng làm được trong kỳ', group: 'THU NHẬP THỰC' },
  { code: 'Lk', name: 'Lương khác', description: 'Tổng Lcn + Ltc + Lncl', group: 'THU NHẬP THỰC' },
  { code: 'DG_cn', name: 'Đơn giá công nhật', description: 'Số tiền trả cho 1 ngày nhật việc', group: 'THU NHẬP THỰC' },
  { code: 'Ltc_ksl', name: 'Lương OT không SL', description: 'Lương tăng ca tính theo đơn giá nhật việc', group: 'THU NHẬP THỰC' },
  { code: 'Ltc_csl', name: 'Lương OT có SL', description: 'Lương tăng ca tính theo Lương CB', group: 'THU NHẬP THỰC' },
  { code: 'PC', name: 'Tổng phụ cấp', description: 'Tổng PC_cd + PC_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'PC_cd', name: 'Phụ cấp cố định', description: 'Phụ cấp theo khung năng lực', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'PC_lh', name: 'Phụ cấp linh hoạt', description: 'Các khoản phụ cấp điều chỉnh tay', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH', name: 'Tổng thưởng', description: 'Tổng TH_cd + TH_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH_cd', name: 'Thưởng cố định', description: 'Thưởng định kỳ lễ tết theo khung', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH_lh', name: 'Thưởng linh hoạt', description: 'Thưởng điều chỉnh tay/dự án', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'KT', name: 'Tổng khấu trừ', description: 'BHXH + CD + TNCN + KT_kh', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'BHXH', name: 'Bảo hiểm xã hội', description: 'Tiền trích đóng BHXH (10.5%)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'CD', name: 'Công đoàn', description: 'Kinh phí công đoàn (1%)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'TNCN', name: 'Thuế TNCN', description: 'Thuế thu nhập cá nhân tạm tính', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'GT_bt', name: 'Giảm trừ bản thân', description: 'Mức giảm trừ thuế (11.000.000)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'N_pt', name: 'Người phụ thuộc', description: 'Số người phụ thuộc khai báo', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'GT_pt', name: 'Giảm trừ phụ thuộc', description: '4.400.000 * N_pt', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'KT_kh', name: 'Khấu trừ khác', description: 'Các khoản trừ điều chỉnh tay/phạt', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'Gross', name: 'Tổng thu nhập Gross', description: 'Tổng thu nhập trước bảo hiểm và thuế', group: 'KẾT QUẢ' },
  { code: 'TU', name: 'Tạm ứng', description: 'Số tiền nhân viên đã ứng trước', group: 'KẾT QUẢ' },
  { code: 'Net', name: 'Thực lĩnh Net', description: 'Thu nhập cuối cùng thực nhận', group: 'KẾT QUẢ' }
];
  // NHÓM CÔNG
  { code: 'Ctc', name: 'Công tiêu chuẩn', description: 'Tổng ngày trong tháng trừ Chủ nhật', group: 'CÔNG' },
  { code: 'Ctt', name: 'Công thực tế', description: 'Tổng công thời gian hoặc công khoán', group: 'CÔNG' },
  { code: 'Cn', name: 'Công nhật', description: 'Số ngày làm việc theo đơn giá nhật việc', group: 'CÔNG' },
  { code: 'OT_h_csl', name: 'Giờ OT có SL', description: 'Giờ tăng ca có tính sản lượng', group: 'CÔNG' },
  { code: 'OT_h_ksl', name: 'Giờ OT không SL', description: 'Giờ tăng ca không tính sản lượng', group: 'CÔNG' },
  { code: 'NCD', name: 'Nghỉ chế độ', description: 'Nghỉ hưởng BHXH (ốm, thai sản...)', group: 'CÔNG' },
  { code: 'NL', name: 'Nghỉ lễ', description: 'Nghỉ các ngày lễ tết theo luật', group: 'CÔNG' },
  { code: 'NCL', name: 'Nghỉ có lương', description: 'Nghỉ phép năm hưởng lương', group: 'CÔNG' },
  { code: 'NKL', name: 'Nghỉ không lương', description: 'Nghỉ việc riêng không hưởng lương', group: 'CÔNG' },
  { code: 'NCV', name: 'Nghỉ chờ việc', description: 'Nghỉ do lỗi doanh nghiệp/khách quan', group: 'CÔNG' },
  { code: 'OT_hs', name: 'Hệ số tăng ca', description: 'Tỷ lệ nhân lương OT (1.5, 2.0, 3.0)', group: 'CÔNG' },

  // NHÓM ĐỊNH MỨC
  { code: 'LCB_dm', name: 'Lương CB định mức', description: 'Khai báo trong Khung năng lực', group: 'ĐỊNH MỨC' },
  { code: 'LHQ_dm', name: 'Lương HQ định mức', description: 'Lương hiệu quả tối đa theo User', group: 'ĐỊNH MỨC' },
  { code: 'LSL_dm', name: 'Lương khoán định mức', description: 'Sản lượng khoán * Đơn giá khoán', group: 'ĐỊNH MỨC' },
  { code: 'SL_khoan', name: 'Sản lượng khoán', description: 'Chỉ tiêu sản lượng giao đầu tháng', group: 'ĐỊNH MỨC' },
  { code: 'DG_khoan', name: 'Đơn giá khoán', description: 'Số tiền trên 1 đơn vị sản phẩm', group: 'ĐỊNH MỨC' },
  { code: 'TT_ntc', name: 'Tỷ trọng nhóm TC', description: 'Trọng số của nhóm tiêu chí KPI', group: 'ĐỊNH MỨC' },
  { code: 'HS_tn', name: 'Hệ số thâm niên', description: 'Tỷ lệ hưởng thưởng theo thời gian làm việc', group: 'ĐỊNH MỨC' },

  // NHÓM THU NHẬP THỰC
  { code: 'LCB_tt', name: 'Lương CB thực tế', description: '(LCB_dm / Ctc) * Ctt', group: 'THU NHẬP THỰC' },
  { code: 'LHQ_tt', name: 'Lương HQ thực tế', description: 'LHQ định mức nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'LSL_tt', name: 'Lương khoán thực tế', description: 'Lương khoán nhân tỷ lệ công và KPI', group: 'THU NHẬP THỰC' },
  { code: 'SL_tt', name: 'Sản lượng thực tế', description: 'Tổng sản lượng làm được trong kỳ', group: 'THU NHẬP THỰC' },
  { code: 'Lk', name: 'Lương khác', description: 'Tổng Lcn + Ltc + Lncl', group: 'THU NHẬP THỰC' },
  { code: 'Lcn', name: 'Lương công nhật', description: 'Tổng cộng thù lao công việc nhật', group: 'THU NHẬP THỰC' },
  { code: 'DG_cn', name: 'Đơn giá công nhật', description: 'Số tiền trả cho 1 ngày nhật việc', group: 'THU NHẬP THỰC' },
  { code: 'Ltc_ksl', name: 'Lương OT không SL', description: 'Lương tăng ca tính theo đơn giá nhật việc', group: 'THU NHẬP THỰC' },
  { code: 'Ltc_csl', name: 'Lương OT có SL', description: 'Lương tăng ca tính theo Lương CB', group: 'THU NHẬP THỰC' },
  { code: 'Lncl', name: 'Lương nghỉ có lương', description: 'Tiền lương các ngày nghỉ lễ/phép/chế độ', group: 'THU NHẬP THỰC' },

  // PHỤ CẤP / THƯỞNG
  { code: 'PC', name: 'Tổng phụ cấp', description: 'Tổng PC_cd + PC_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'PC_cd', name: 'Phụ cấp cố định', description: 'Phụ cấp theo khung năng lực', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'PC_lh', name: 'Phụ cấp linh hoạt', description: 'Các khoản phụ cấp điều chỉnh tay', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH', name: 'Tổng thưởng', description: 'Tổng TH_cd + TH_lh', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH_cd', name: 'Thưởng cố định', description: 'Thưởng định kỳ lễ tết theo khung', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TH_lh', name: 'Thưởng linh hoạt', description: 'Thưởng điều chỉnh tay/dự án', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'CO_tc', name: 'Điểm cộng tiêu chí', description: 'Điểm thưởng KPI từ phiếu đánh giá', group: 'PHỤ CẤP / THƯỞNG' },
  { code: 'TR_tc', name: 'Điểm trừ tiêu chí', description: 'Điểm phạt KPI từ phiếu đánh giá', group: 'PHỤ CẤP / THƯỞNG' },

  // KHẤU TRỪ / THUẾ
  { code: 'KT', name: 'Tổng khấu trừ', description: 'BHXH + CD + TNCN + KT_kh', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'BHXH', name: 'Bảo hiểm xã hội', description: 'Tiền trích đóng BHXH (10.5%)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'CD', name: 'Công đoàn', description: 'Kinh phí công đoàn (1%)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'TNCN', name: 'Thuế TNCN', description: 'Thuế thu nhập cá nhân tạm tính', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'GT_bt', name: 'Giảm trừ bản thân', description: 'Mức giảm trừ thuế (11.000.000)', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'N_pt', name: 'Người phụ thuộc', description: 'Số người phụ thuộc khai báo', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'GT_pt', name: 'Giảm trừ phụ thuộc', description: '4.400.000 * N_pt', group: 'KHẤU TRỪ / THUẾ' },
  { code: 'KT_kh', name: 'Khấu trừ khác', description: 'Các khoản trừ điều chỉnh tay/phạt', group: 'KHẤU TRỪ / THUẾ' },

  // KẾT QUẢ
  { code: 'Gross', name: 'Tổng thu nhập Gross', description: 'Tổng thu nhập trước bảo hiểm và thuế', group: 'KẾT QUẢ' },
  { code: 'TU', name: 'Tạm ứng', description: 'Số tiền nhân viên đã ứng trước', group: 'KẾT QUẢ' },
  { code: 'Net', name: 'Thực lĩnh Net', description: 'Thu nhập cuối cùng thực nhận', group: 'KẾT QUẢ' }
];

const INITIAL_EVALUATIONS = [
    { id: 'EV_DEC_1', userId: 'USR_NV_TIME', criteriaId: 'C1', criteriaName: 'Đi muộn/Về sớm', type: 'PENALTY', target: 'MONTHLY_SALARY', points: 1, description: 'Đi muộn 20p sáng 02/12', requesterId: 'USR_TP_TIME', status: 'APPROVED', createdAt: '2025-12-02T08:20:00Z' },
    { id: 'EV_DEC_2', userId: 'USR_NV_PIECE', criteriaId: 'C3', criteriaName: 'Vượt tiến độ dự án', type: 'BONUS', target: 'MONTHLY_SALARY', points: 5, description: 'Hoàn thành sớm lô hàng xuất khẩu', requesterId: 'USR_TP_PIECE', status: 'APPROVED', createdAt: '2025-12-05T16:00:00Z' },
];

// =============================================================================
// 2. HÀM SEED CHÍNH (ĐÃ CẬP NHẬT ĐỂ NẠP ĐỦ)
// =============================================================================
export const seedDatabase = async () => {
    console.log("--> [SEEDER] Bắt đầu nạp dữ liệu Mockdata...");

    // 1. Variables & Formulas
    try {
        console.log("   - Configs...");
        for (const v of INITIAL_SALARY_VARIABLES) {
            await prisma.salaryVariable.upsert({
                where: { code: v.code },
                update: { ...v },
                create: { ...v }
            });
        }
        for (const f of INITIAL_FORMULAS) {
            await prisma.salaryFormula.upsert({
                where: { code: f.code },
                update: { ...f },
                create: { ...f }
            });
        }
    } catch(e) {
        console.error("   x Lỗi Configs:", e);
    }

    // 2. Ranks & Grades
    try {
        console.log("   - Ranks & Grades...");
        for (const r of INITIAL_RANKS) await prisma.salaryRank.upsert({ where: { id: r.id }, update: r, create: r });
        for (const g of INITIAL_GRADES) await prisma.salaryGrade.upsert({ where: { id: g.id }, update: g, create: g });
    } catch(e) { console.error("   x Lỗi Ranks:", e); }

    // 3. Criteria & Groups
    try {
        console.log("   - Criteria...");
        for (const g of INITIAL_CRITERIA_GROUPS) await prisma.criterionGroup.upsert({ where: { id: g.id }, update: g, create: g });
        for (const c of INITIAL_CRITERIA) await prisma.criterion.upsert({ where: { id: c.id }, update: c, create: { ...c, proofRequired: false } });
    } catch(e) { console.error("   x Lỗi Criteria:", e); }

    // 4. Daily Work
    try {
        console.log("   - Daily Work...");
        for (const w of INITIAL_DAILY_WORK) await prisma.dailyWorkItem.upsert({ where: { id: w.id }, update: w, create: w });
    } catch(e) { console.error("   x Lỗi DailyWork:", e); }

    // 5. Departments
    try {
        console.log("   - Departments...");
        for (const d of INITIAL_DEPARTMENTS) {
            await prisma.department.upsert({ where: { id: d.id }, update: d, create: d });
        }
    } catch(e) { console.error("   x Lỗi Departments:", e); }

    // 6. Users (Nạp sau Departments để tránh lỗi khóa ngoại)
    try {
        console.log("   - Users...");
        for (const u of INITIAL_USERS) {
            const exists = await prisma.user.findUnique({ where: { username: u.username } });
            if (!exists) {
                // Tạo mới nếu chưa có
                await prisma.user.create({
                    data: { ...u, joinDate: new Date(u.joinDate).toISOString() } // Chuyển đổi ngày tháng
                });
            } else {
                // Cập nhật nếu đã có (để update thông tin mới nhất từ mock)
                const { password, ...updateData } = u; // Không update password để tránh reset pass của user đang dùng
                await prisma.user.update({
                    where: { username: u.username },
                    data: { ...updateData, joinDate: new Date(u.joinDate).toISOString() }
                });
            }
        }
    } catch(e) { console.error("   x Lỗi Users:", e); }

    // 7. Evaluations (Nạp cuối cùng vì cần Users và Criteria)
    try {
        console.log("   - Evaluations...");
        for (const ev of INITIAL_EVALUATIONS) {
            await prisma.evaluationRequest.upsert({
                where: { id: ev.id },
                update: { ...ev, createdAt: new Date(ev.createdAt).toISOString() },
                create: { ...ev, createdAt: new Date(ev.createdAt).toISOString() }
            });
        }
    } catch(e) { console.error("   x Lỗi Evaluations:", e); }

    // 8. SystemConfig - Đảm bảo có cấu hình mặc định đầy đủ
    try {
        console.log("   - SystemConfig...");
        const existingConfig = await prisma.systemConfig.findUnique({ where: { id: 'default_config' } });
        if (!existingConfig) {
            await prisma.systemConfig.create({
                data: {
                    id: 'default_config',
                    baseSalary: 1800000,
                    standardWorkDays: 26,
                    insuranceBaseSalary: 1800000,
                    maxInsuranceBase: 36000000,
                    pitSteps: [
                        { threshold: 5000000, rate: 5, subtraction: 0 },
                        { threshold: 10000000, rate: 10, subtraction: 250000 },
                        { threshold: 18000000, rate: 15, subtraction: 750000 },
                        { threshold: 32000000, rate: 20, subtraction: 1650000 }
                    ],
                    seniorityRules: [
                        { minMonths: 0, maxMonths: 12, coefficient: 1.0 },
                        { minMonths: 12, maxMonths: 24, coefficient: 1.05 },
                        { minMonths: 24, maxMonths: 36, coefficient: 1.1 },
                        { minMonths: 36, maxMonths: 48, coefficient: 1.15 },
                        { minMonths: 48, maxMonths: 999, coefficient: 1.2 }
                    ],
                    insuranceRules: {
                        isPeriodLocked: false,
                        autoApproveDays: 3,
                        hrAutoApproveHours: 24,
                        approvalMode: 'POST_AUDIT',
                        personalRelief: 11000000,
                        dependentRelief: 4400000,
                        insuranceRate: 10.5,
                        unionFeeRate: 1,
                        approvalWorkflow: []
                    }
                }
            });
        }
    } catch(e) { console.error("   x Lỗi SystemConfig:", e); }

    console.log("--> [SEEDER] Hoàn tất 100%! Dữ liệu đã đồng bộ.");
    return { success: true };
};