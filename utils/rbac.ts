
import { User, UserRole, Department, SalaryRecord, RecordStatus, EvaluationRequest, ApprovalStep } from '../types';

/**
 * Kiểm tra User có sở hữu ít nhất một trong các Role được cho phép không
 */
export const hasRole = (user: User, allowedRoles: UserRole[]): boolean => {
  if (!user || !user.roles) return false;
  if (allowedRoles.length === 0) return true;
  return user.roles.some(role => allowedRoles.includes(role));
};

/**
 * Kiểm tra quan hệ với Phòng ban
 */
export const isBlockDirectorOf = (user: User, dept: Department): boolean => {
    return user.roles.includes(UserRole.GIAM_DOC_KHOI) && dept.blockDirectorId === user.id;
};

export const isHRInChargeOf = (user: User, dept: Department): boolean => {
    return user.roles.includes(UserRole.NHAN_SU) && dept.hrId === user.id;
};

export const isManagerOf = (user: User, dept: Department): boolean => {
    return user.roles.includes(UserRole.QUAN_LY) && dept.managerId === user.id;
};

/**
 * Kiểm tra xem người dùng hiện tại có thể XEM thông tin của đối tượng (Target) không
 */
export const canViewTarget = (currentUser: User, targetUser: User, departments: Department[]): boolean => {
    if (hasRole(currentUser, [UserRole.ADMIN, UserRole.BAN_LANH_DAO])) return true;
    if (currentUser.id === targetUser.id) return true;

    // Kế toán lương thấy toàn bộ nhân sự (bao gồm Manager) trong các đơn vị được gán
    if (currentUser.roles.includes(UserRole.KE_TOAN_LUONG)) {
        const isAssignedMain = currentUser.assignedDeptIds?.includes(targetUser.currentDeptId || '');
        const isAssignedSide = currentUser.assignedDeptIds?.includes(targetUser.sideDeptId || '');
        if (isAssignedMain || isAssignedSide) return true;
    }

    // Manager / Trưởng phòng thấy nhân viên cùng phòng ban
    const targetDept = departments.find(d => d.id === targetUser.currentDeptId || d.id === targetUser.sideDeptId);
    if (targetDept) {
        if (isManagerOf(currentUser, targetDept)) return true;
        if (isBlockDirectorOf(currentUser, targetDept)) return true;
        if (isHRInChargeOf(currentUser, targetDept)) return true;
    }

    return false;
};

/**
 * Xác định trạng thái phê duyệt tiếp theo dựa trên vai trò của người hưởng lợi và workflow động
 */
export const getNextPendingStatus = (beneficiary: User, workflow: ApprovalStep[], currentStatus: RecordStatus = RecordStatus.DRAFT): RecordStatus => {
    if (workflow.length === 0) return RecordStatus.APPROVED;

    const beneficiaryRoles = beneficiary.roles;
    
    if (currentStatus === RecordStatus.DRAFT) {
        const firstStep = workflow.find(step => !beneficiaryRoles.includes(step.role));
        return firstStep ? firstStep.statusOnEnter : RecordStatus.APPROVED;
    }

    const currentIndex = workflow.findIndex(step => step.statusOnEnter === currentStatus);
    if (currentIndex === -1 || currentIndex === workflow.length - 1) return RecordStatus.APPROVED;

    return workflow[currentIndex + 1].statusOnEnter;
};

/**
 * Kiểm tra quyền phê duyệt bản ghi tại trạng thái hiện tại
 * Chấp nhận cả status string để dùng chung cho Attendance và Salary
 */
export const canApproveStatus = (currentUser: User, status: RecordStatus, dept: Department | undefined, workflow: ApprovalStep[]): boolean => {
    if (hasRole(currentUser, [UserRole.ADMIN])) return true;
    if (!dept) return false;

    const currentStep = workflow.find(step => step.statusOnEnter === status);
    if (!currentStep) return false;

    // Ràng buộc 1: Phải có đúng Role mà bước đó yêu cầu
    if (!currentUser.roles.includes(currentStep.role)) return false;

    // Ràng buộc 2: Kiểm tra thẩm quyền theo Đơn vị (ngoại trừ BLD duyệt toàn cục)
    switch (currentStep.role) {
        case UserRole.QUAN_LY:
            return dept.managerId === currentUser.id;
        case UserRole.GIAM_DOC_KHOI:
            return dept.blockDirectorId === currentUser.id;
        case UserRole.BAN_LANH_DAO:
            return true;
        case UserRole.NHAN_SU:
            return dept.hrId === currentUser.id || hasRole(currentUser, [UserRole.NHAN_SU]);
        default:
            return false;
    }
};

export const ROLES = {
  ADMINS: [UserRole.ADMIN],
  AUDITORS: [UserRole.ADMIN, UserRole.BAN_LANH_DAO], 
  MANAGERS: [UserRole.QUAN_LY, UserRole.GIAM_DOC_KHOI, UserRole.ADMIN, UserRole.BAN_LANH_DAO],
  HR_ADMINS: [UserRole.ADMIN, UserRole.NHAN_SU],
};
