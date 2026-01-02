
import { User, UserRole, Department, SalaryRecord, RecordStatus, EvaluationRequest, ApprovalStep, ApprovalWorkflow, SystemRole } from '../types';

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
 * Tìm workflow phù hợp dựa trên contentType, targetRankIds, initiatorRoleIds và snapshot
 */
export const findMatchingWorkflow = (
    workflows: ApprovalWorkflow[],
    contentType: 'ATTENDANCE' | 'EVALUATION' | 'SALARY',
    beneficiary: User,
    systemRoles: SystemRole[],
    salaryRanks: any[],
    snapshotDate?: Date
): ApprovalWorkflow | null => {
    const now = snapshotDate || new Date();
    
    // Lọc workflows theo contentType và snapshot
    const activeWorkflows = workflows.filter(w => 
        w.contentType === contentType &&
        (!w.effectiveTo || new Date(w.effectiveTo) >= now) &&
        new Date(w.effectiveFrom) <= now
    );
    
    if (activeWorkflows.length === 0) return null;
    
    // Tìm workflow phù hợp nhất
    for (const workflow of activeWorkflows) {
        // Kiểm tra targetRankIds: nếu có, phải match với rank của beneficiary
        if (workflow.targetRankIds && workflow.targetRankIds.length > 0) {
            const beneficiaryRankId = beneficiary.currentRankId;
            if (!beneficiaryRankId || !workflow.targetRankIds.includes(beneficiaryRankId)) {
                continue; // Không match rank
            }
        }
        
        // Kiểm tra initiatorRoleIds: nếu có, phải match với role của beneficiary
        if (workflow.initiatorRoleIds && workflow.initiatorRoleIds.length > 0) {
            // Map role codes từ systemRoles sang UserRole
            const workflowRoleCodes = workflow.initiatorRoleIds
                .map(roleId => systemRoles.find(sr => sr.id === roleId)?.code)
                .filter(Boolean);
            
            // Map workflowRoleCodes sang UserRole enum
            const workflowUserRoles = workflowRoleCodes
                .map(code => mapRoleCodeToUserRole(code || ''))
                .filter((role): role is UserRole => role !== null);
            
            // Kiểm tra xem beneficiary có role nào trong workflowUserRoles không
            const hasMatchingRole = beneficiary.roles.some(role => 
                workflowUserRoles.includes(role)
            );
            
            if (!hasMatchingRole) {
                continue; // Không match initiator role
            }
        }
        
        // Tìm thấy workflow phù hợp
        return workflow;
    }
    
    // Không tìm thấy workflow cụ thể, trả về workflow đầu tiên (nếu có)
    return activeWorkflows[0] || null;
};

/**
 * Map SystemRole code sang UserRole enum
 */
const mapRoleCodeToUserRole = (roleCode: string): UserRole | null => {
    const mapping: Record<string, UserRole> = {
        'ADMIN': UserRole.ADMIN,
        'BAN_LANH_DAO': UserRole.BAN_LANH_DAO,
        'GIAM_DOC_KHOI': UserRole.GIAM_DOC_KHOI,
        'QUAN_LY': UserRole.QUAN_LY,
        'KE_TOAN_LUONG': UserRole.KE_TOAN_LUONG,
        'NHAN_SU': UserRole.NHAN_SU,
        'NHAN_VIEN': UserRole.NHAN_VIEN,
    };
    return mapping[roleCode] || null;
};

/**
 * Xác định trạng thái phê duyệt tiếp theo dựa trên ApprovalWorkflow mới
 */
export const getNextPendingStatusFromWorkflow = (
    beneficiary: User,
    workflow: ApprovalWorkflow | null,
    systemRoles: SystemRole[],
    currentStatus: RecordStatus = RecordStatus.DRAFT
): RecordStatus => {
    if (!workflow) return RecordStatus.APPROVED;
    
    const beneficiaryRoles = beneficiary.roles;
    
    // Map approverRoleIds và auditorRoleIds sang UserRole
    const approverRoles = workflow.approverRoleIds
        .map(roleId => systemRoles.find(sr => sr.id === roleId)?.code)
        .map(code => mapRoleCodeToUserRole(code || ''))
        .filter((role): role is UserRole => role !== null);
    
    const auditorRoles = (workflow.auditorRoleIds || [])
        .map(roleId => systemRoles.find(sr => sr.id === roleId)?.code)
        .map(code => mapRoleCodeToUserRole(code || ''))
        .filter((role): role is UserRole => role !== null);
    
    // Nếu đang ở DRAFT, tìm bước đầu tiên mà beneficiary không có role
    if (currentStatus === RecordStatus.DRAFT) {
        // Tìm role đầu tiên trong approverRoles mà beneficiary không có
        const firstApproverRole = approverRoles.find(role => !beneficiaryRoles.includes(role));
        if (firstApproverRole) {
            // Map role sang status
            if (firstApproverRole === UserRole.QUAN_LY) return RecordStatus.PENDING_MANAGER;
            if (firstApproverRole === UserRole.GIAM_DOC_KHOI) return RecordStatus.PENDING_GDK;
            if (firstApproverRole === UserRole.BAN_LANH_DAO) return RecordStatus.PENDING_BLD;
            if (firstApproverRole === UserRole.NHAN_SU) return RecordStatus.PENDING_HR;
        }
        
        // Nếu không có approver nào, kiểm tra auditor
        const firstAuditorRole = auditorRoles.find(role => !beneficiaryRoles.includes(role));
        if (firstAuditorRole === UserRole.NHAN_SU) return RecordStatus.PENDING_HR;
        
        return RecordStatus.APPROVED;
    }
    
    // Nếu đã qua DRAFT, xác định bước tiếp theo dựa trên thứ tự trong approverRoles
    if (currentStatus === RecordStatus.PENDING_MANAGER) {
        // Tìm vị trí của QUAN_LY trong approverRoles
        const managerIndex = approverRoles.findIndex(r => r === UserRole.QUAN_LY);
        if (managerIndex >= 0 && managerIndex < approverRoles.length - 1) {
            // Lấy role tiếp theo sau QUAN_LY
            const nextRole = approverRoles[managerIndex + 1];
            if (nextRole === UserRole.GIAM_DOC_KHOI) return RecordStatus.PENDING_GDK;
            if (nextRole === UserRole.BAN_LANH_DAO) return RecordStatus.PENDING_BLD;
            if (nextRole === UserRole.NHAN_SU) return RecordStatus.PENDING_HR;
        }
        // Nếu không còn approver nào, kiểm tra auditor
        if (auditorRoles.includes(UserRole.NHAN_SU)) return RecordStatus.PENDING_HR;
        return RecordStatus.APPROVED;
    }
    
    if (currentStatus === RecordStatus.PENDING_GDK) {
        // Tìm vị trí của GIAM_DOC_KHOI trong approverRoles
        const gdkIndex = approverRoles.findIndex(r => r === UserRole.GIAM_DOC_KHOI);
        if (gdkIndex >= 0 && gdkIndex < approverRoles.length - 1) {
            // Lấy role tiếp theo sau GIAM_DOC_KHOI
            const nextRole = approverRoles[gdkIndex + 1];
            if (nextRole === UserRole.BAN_LANH_DAO) return RecordStatus.PENDING_BLD;
            if (nextRole === UserRole.NHAN_SU) return RecordStatus.PENDING_HR;
        }
        // Nếu không còn approver nào, kiểm tra auditor
        if (auditorRoles.includes(UserRole.NHAN_SU)) return RecordStatus.PENDING_HR;
        return RecordStatus.APPROVED;
    }
    
    if (currentStatus === RecordStatus.PENDING_BLD) {
        // Sau BAN_LANH_DAO, chỉ còn auditor (nếu có)
        if (auditorRoles.includes(UserRole.NHAN_SU)) return RecordStatus.PENDING_HR;
        return RecordStatus.APPROVED;
    }
    
    if (currentStatus === RecordStatus.PENDING_HR) {
        return RecordStatus.APPROVED;
    }
    
    return RecordStatus.APPROVED;
};

/**
 * Xác định trạng thái phê duyệt tiếp theo (backward compatible với ApprovalStep)
 */
export const getNextPendingStatus = (
    beneficiary: User, 
    workflow: ApprovalStep[] | ApprovalWorkflow[] | null, 
    currentStatus: RecordStatus = RecordStatus.DRAFT,
    systemRoles: SystemRole[] = [],
    contentType?: 'ATTENDANCE' | 'EVALUATION' | 'SALARY',
    allWorkflows?: ApprovalWorkflow[]
): RecordStatus => {
    // Nếu workflow là ApprovalWorkflow[] (mới), sử dụng logic mới
    if (allWorkflows && contentType && systemRoles.length > 0) {
        const matchingWorkflow = findMatchingWorkflow(
            allWorkflows,
            contentType,
            beneficiary,
            systemRoles,
            [],
            new Date()
        );
        if (matchingWorkflow) {
            return getNextPendingStatusFromWorkflow(beneficiary, matchingWorkflow, systemRoles, currentStatus);
        }
    }
    
    // Fallback về logic cũ (ApprovalStep[])
    if (!Array.isArray(workflow) || workflow.length === 0) return RecordStatus.APPROVED;
    
    // Kiểm tra xem có phải ApprovalStep[] không (có field 'role')
    if (workflow.length > 0 && 'role' in workflow[0]) {
        const stepWorkflow = workflow as ApprovalStep[];
        const beneficiaryRoles = beneficiary.roles;
        
        if (currentStatus === RecordStatus.DRAFT) {
            const firstStep = stepWorkflow.find(step => !beneficiaryRoles.includes(step.role));
            return firstStep ? firstStep.statusOnEnter : RecordStatus.APPROVED;
        }

        const currentIndex = stepWorkflow.findIndex(step => step.statusOnEnter === currentStatus);
        if (currentIndex === -1 || currentIndex === stepWorkflow.length - 1) return RecordStatus.APPROVED;

        return stepWorkflow[currentIndex + 1].statusOnEnter;
    }
    
    return RecordStatus.APPROVED;
};

/**
 * Kiểm tra quyền phê duyệt bản ghi tại trạng thái hiện tại (với ApprovalWorkflow mới)
 */
export const canApproveStatusFromWorkflow = (
    currentUser: User,
    status: RecordStatus,
    dept: Department | undefined,
    workflow: ApprovalWorkflow | null,
    systemRoles: SystemRole[],
    allDepartments: Department[] = []
): boolean => {
    if (hasRole(currentUser, [UserRole.ADMIN])) return true;
    if (!dept || !workflow) return false;
    
    // Xác định role cần thiết dựa trên status
    let requiredRole: UserRole | null = null;
    if (status === RecordStatus.PENDING_MANAGER) {
        requiredRole = UserRole.QUAN_LY;
    } else if (status === RecordStatus.PENDING_GDK) {
        requiredRole = UserRole.GIAM_DOC_KHOI;
    } else if (status === RecordStatus.PENDING_BLD) {
        requiredRole = UserRole.BAN_LANH_DAO;
    } else if (status === RecordStatus.PENDING_HR) {
        requiredRole = UserRole.NHAN_SU;
    }
    
    if (!requiredRole) return false;
    
    // Kiểm tra xem currentUser có role cần thiết không
    if (!currentUser.roles.includes(requiredRole)) return false;
    
    // Kiểm tra xem role này có trong approverRoleIds hoặc auditorRoleIds không
    const workflowRoleIds = [
        ...workflow.approverRoleIds,
        ...(workflow.auditorRoleIds || [])
    ];
    
    // Map workflowRoleIds sang UserRole enum
    const workflowUserRoles = workflowRoleIds
        .map(roleId => systemRoles.find(sr => sr.id === roleId)?.code)
        .map(code => mapRoleCodeToUserRole(code || ''))
        .filter((role): role is UserRole => role !== null);
    
    // Kiểm tra xem requiredRole có trong workflowUserRoles không
    if (!workflowUserRoles.includes(requiredRole)) return false;
    
    // Ràng buộc 2: Kiểm tra thẩm quyền theo Đơn vị theo logic phân cấp
    switch (requiredRole) {
        case UserRole.QUAN_LY:
            return dept.managerId === currentUser.id;
            
        case UserRole.GIAM_DOC_KHOI:
            const deptsUnderGDK = allDepartments.filter(d => d.blockDirectorId === currentUser.id);
            return deptsUnderGDK.some(d => d.id === dept.id);
            
        case UserRole.BAN_LANH_DAO:
            return true;
            
        case UserRole.NHAN_SU:
            const deptsUnderHR = allDepartments.filter(d => d.hrId === currentUser.id);
            return deptsUnderHR.some(d => d.id === dept.id);
            
        case UserRole.KE_TOAN_LUONG:
            // Kế toán lương phê duyệt cho các phòng ban được gán
            if (currentUser.assignedDeptIds && currentUser.assignedDeptIds.length > 0) {
                return currentUser.assignedDeptIds.includes(dept.id);
            }
            return currentUser.currentDeptId === dept.id;
            
        default:
            return false;
    }
};

/**
 * Kiểm tra quyền phê duyệt bản ghi tại trạng thái hiện tại (backward compatible)
 */
export const canApproveStatus = (
    currentUser: User, 
    status: RecordStatus, 
    dept: Department | undefined, 
    workflow: ApprovalStep[] | ApprovalWorkflow[] | null,
    allDepartments: Department[] = [],
    systemRoles: SystemRole[] = [],
    contentType?: 'ATTENDANCE' | 'EVALUATION' | 'SALARY',
    allWorkflows?: ApprovalWorkflow[]
): boolean => {
    if (hasRole(currentUser, [UserRole.ADMIN])) return true;
    if (!dept) return false;
    
    // Nếu có allWorkflows và contentType, sử dụng logic mới
    if (allWorkflows && contentType && systemRoles.length > 0) {
        // Tìm workflow phù hợp (cần beneficiary để tìm workflow)
        // Tạm thời dùng workflow đầu tiên phù hợp với contentType
        const matchingWorkflow = allWorkflows.find(w => 
            w.contentType === contentType &&
            (!w.effectiveTo || new Date(w.effectiveTo) >= new Date()) &&
            new Date(w.effectiveFrom) <= new Date()
        );
        
        if (matchingWorkflow) {
            return canApproveStatusFromWorkflow(currentUser, status, dept, matchingWorkflow, systemRoles, allDepartments);
        }
    }
    
    // Fallback về logic cũ (ApprovalStep[])
    if (!Array.isArray(workflow) || workflow.length === 0) return false;
    
    // Kiểm tra xem có phải ApprovalStep[] không
    if (workflow.length > 0 && 'role' in workflow[0]) {
        const stepWorkflow = workflow as ApprovalStep[];
        const currentStep = stepWorkflow.find(step => step.statusOnEnter === status);
        if (!currentStep) return false;

        // Ràng buộc 1: Phải có đúng Role mà bước đó yêu cầu
        if (!currentUser.roles.includes(currentStep.role)) return false;

        // Ràng buộc 2: Kiểm tra thẩm quyền theo Đơn vị theo logic phân cấp mới
        switch (currentStep.role) {
            case UserRole.QUAN_LY:
                return dept.managerId === currentUser.id;
                
            case UserRole.GIAM_DOC_KHOI:
                const deptsUnderGDK = allDepartments.filter(d => d.blockDirectorId === currentUser.id);
                return deptsUnderGDK.some(d => d.id === dept.id);
                
            case UserRole.BAN_LANH_DAO:
                return true;
                
            case UserRole.NHAN_SU:
                const deptsUnderHR = allDepartments.filter(d => d.hrId === currentUser.id);
                return deptsUnderHR.some(d => d.id === dept.id);
                
            default:
                return false;
        }
    }
    
    return false;
};

export const ROLES = {
  ADMINS: [UserRole.ADMIN],
  AUDITORS: [UserRole.ADMIN, UserRole.BAN_LANH_DAO], 
  MANAGERS: [UserRole.QUAN_LY, UserRole.GIAM_DOC_KHOI, UserRole.ADMIN, UserRole.BAN_LANH_DAO],
  HR_ADMINS: [UserRole.ADMIN, UserRole.NHAN_SU],
};
