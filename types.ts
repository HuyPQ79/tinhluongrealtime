
export enum UserRole {
  ADMIN = 'ADMIN',
  BAN_LANH_DAO = 'BAN_LANH_DAO',
  GIAM_DOC_KHOI = 'GIAM_DOC_KHOI',
  QUAN_LY = 'QUAN_LY',
  KE_TOAN_LUONG = 'KE_TOAN_LUONG',
  NHAN_SU = 'NHAN_SU',
  NHAN_VIEN = 'NHAN_VIEN'
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MATERNITY = 'MATERNITY',
  PROBATION = 'PROBATION',
  PENDING_APPROVAL = 'PENDING_APPROVAL'
}

export enum RecordStatus {
  DRAFT = 'DRAFT', 
  PENDING = 'PENDING', 
  PENDING_MANAGER = 'PENDING_MANAGER', 
  PENDING_GDK = 'PENDING_GDK',         
  PENDING_BLD = 'PENDING_BLD',         
  PENDING_HR = 'PENDING_HR',           
  APPROVED = 'APPROVED', 
  REJECTED = 'REJECTED'
}

export enum AttendanceType {
  TIME = 'TIME',           
  PIECEWORK = 'PIECEWORK', 
  DAILY = 'DAILY',         
  MODE = 'MODE',           
  HOLIDAY = 'HOLIDAY',     
  PAID_LEAVE = 'PAID_LEAVE',
  UNPAID = 'UNPAID',       
  WAITING = 'WAITING'      
}

export enum EvaluationScope {
  MAIN_JOB = 'MAIN_JOB',
  SIDE_JOB = 'SIDE_JOB'
}

export enum EvaluationTarget {
  MONTHLY_SALARY = 'MONTHLY_SALARY',
  RESERVED_BONUS = 'RESERVED_BONUS'
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  type: 'INFO' | 'WARNING' | 'SUCCESS' | 'DANGER';
  createdAt: string;
  isRead: boolean;
  actionUrl?: string;
}

export interface AppToast {
  id: string;
  message: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
}

export interface SalaryVariable {
  code: string;
  name: string;
  desc: string;
  group: string;
}

export interface PitStep {
  id: string;
  label: string;
  threshold: number;
  rate: number;
  subtraction: number;
}

export interface SeniorityRule {
  id: string;
  minMonths: number;
  maxMonths: number;
  coefficient: number;
  label: string;
}

export interface SalaryAdjustment {
  id: string;
  name: string;
  type: 'BONUS' | 'ALLOWANCE' | 'OTHER_DEDUCTION' | 'OTHER_SALARY';
  amount: number;
  note: string;
}

export interface ApprovalStep {
  id: string;
  role: UserRole;
  label: string;
  statusOnEnter: RecordStatus;
  approvalType?: 'DECISIVE' | 'INFORMATIVE'; 
  condition?: 'ALL' | 'PRODUCTION_ONLY' | 'OFFICE_ONLY';
}

// System Role - quản lý vai trò trong hệ thống
export interface SystemRole {
  id: string;
  code: string; // ADMIN, QUAN_LY, etc.
  name: string;
  description?: string;
}

// Approval Workflow mới với cấu trúc phức tạp
export interface ApprovalWorkflow {
  id: string;
  contentType: 'ATTENDANCE' | 'EVALUATION' | 'SALARY'; // Nội dung cần phê duyệt
  targetRankIds: string[]; // Đối tượng áp dụng (từ SalaryRank) - chọn nhiều
  initiatorRoleIds: string[]; // Vai trò khởi tạo - chọn nhiều
  approverRoleIds: string[]; // Vai trò phê duyệt - chọn nhiều
  auditorRoleIds?: string[]; // Vai trò hậu kiểm - chọn nhiều
  effectiveFrom: string; // Thời điểm bắt đầu áp dụng (snapshot)
  effectiveTo?: string; // null nếu đang active
  version: number;
  createdAt: string;
}

export interface SystemConfig {
  isPeriodLocked: boolean;
  autoApproveDays: number; 
  hrAutoApproveHours: number;
  approvalMode: 'POST_AUDIT' | 'FULL_APPROVAL';
  personalRelief: number;      
  dependentRelief: number;     
  insuranceRate: number;       
  unionFeeRate: number;        
  maxInsuranceBase: number;    
  maxHoursForHRReview?: number; // Số giờ tối đa cho HR hậu kiểm (mặc định 72 giờ)
  pitSteps: PitStep[];
  approvalWorkflow: ApprovalStep[]; // Legacy - giữ để tương thích
  seniorityRules: SeniorityRule[];
  systemRoles?: SystemRole[]; // Danh sách vai trò hệ thống
  lastModifiedBy?: string;
  lastModifiedAt?: string;
  hasPendingChanges?: boolean;
  pendingChangeSummary?: string; 
}

export interface CriterionGroup {
  id: string;
  name: string;
  weight: number; 
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  type: AttendanceType;
  hours: number;
  overtimeHours: number;
  otRate: number; 
  isOvertimeWithOutput: boolean;
  output?: number;       
  pieceworkUnitPrice?: number; // DG_khoan
  dailyWorkItemId?: string; 
  overtimeDailyWorkItemId?: string;
  notes?: string;
  status: RecordStatus;
  sentToHrAt?: string;
  rejectionReason?: string;
}

export interface PieceworkConfig {
  id: string;
  userId: string;
  month: string; 
  targetOutput: number;
  unitPrice: number;
}

export interface SalaryRank {
  id: string;
  name: string;
  order: number;
}

export interface FixedBonusItem {
    month: number; 
    name: string;
    amount: number;
}

export interface SalaryGrade {
  id: string;
  rankId: string;
  level: number;
  baseSalary: number;
  efficiencySalary: number; 
  fixedAllowance: number;
  flexibleAllowance: number;
  otherSalary: number;
  fixedBonuses?: FixedBonusItem[]; 
}

export interface Criterion {
  id: string;
  groupId: string; 
  name: string;
  type: 'BONUS' | 'PENALTY';
  unit: 'PERCENT' | 'AMOUNT';
  value: number;
  point?: number;
  threshold: number; 
  description: string;
  departmentId?: string; // Phòng ban áp dụng (undefined/null = áp dụng cho tất cả)
}

export interface EvaluationRequest {
  id: string;
  userId: string;
  userName: string;
  criteriaId: string;
  criteriaName: string;
  scope: EvaluationScope;
  target: EvaluationTarget;
  type: 'BONUS' | 'PENALTY';
  points: number;
  description: string;
  proofFileName: string;
  requesterId: string;
  status: RecordStatus;
  createdAt: string;
  rejectionReason?: string;
}

export interface Department { 
  id: string; 
  name: string; 
  blockDirectorId?: string; 
  managerId?: string;
  hrId?: string; 
  budgetNorm: number;
}

export interface SalaryHistoryItem {
  id: string;
  startDate: string;
  endDate?: string;
  departmentId: string;
  departmentName: string;
  position: string;
  rankId: string;
  rankName: string;
  gradeId: string;
  gradeLevel: number;
  sideDepartmentId?: string;
  sideDepartmentName?: string;
  sidePosition?: string;
  sideRankId?: string;
  sideRankName?: string;
  sideGradeId?: string;
  sideGradeLevel?: number;
  note: string;
}

export interface User {
  id: string;
  username: string; 
  password?: string;
  name: string;
  avatar: string;
  email?: string;
  phone?: string;
  joinDate: string; 
  status: UserStatus;
  roles: UserRole[]; 
  numberOfDependents: number; 
  salaryHistory: SalaryHistoryItem[];
  assignedDeptIds: string[];
  activeAssignments: any[];
  currentRankId?: string;
  currentGradeId?: string;
  currentPosition?: string;
  currentDeptId?: string;
  currentStartDate?: string;
  sideDeptId?: string;
  sidePosition?: string;
  sideRankId?: string;
  sideRankName?: string;
  sideGradeId?: string;
  sideGradeLevel?: number;
  sideStartDate?: string;
  paymentType?: 'TIME' | 'PIECEWORK';
  pieceworkUnitPrice?: number; // DG_khoan
  efficiencySalary: number;
  reservedBonusAmount?: number; // THƯỞNG TREO CÁ NHÂN
  probationRate?: number; // % lương thử việc
  pendingUpdate?: Partial<User>; 
  pendingUpdateSummary?: string; 
}

export interface SalaryRecord {
  id: string;
  userId: string;
  userName: string;
  positionName: string;
  department: string; 
  date: string; 
  status: RecordStatus;
  
  Ctc: number;
  Ctt: number;
  Cn: number;
  NCD: number;
  NL: number;
  NCL: number;
  NKL: number;
  NCV: number;
  LCB_dm: number;
  LHQ_dm: number;
  LSL_dm: number;
  SL_khoan: number;
  SL_tt: number;
  DG_khoan: number;
  HS_tn: number;
  probationRate: number; // Snapshot tỷ lệ tại thời điểm tính

  actualBaseSalary: number;      
  actualEfficiencySalary: number; 
  actualPieceworkSalary: number;  
  otherSalary: number;            
  totalAllowance: number;         
  totalBonus: number;             
  overtimeSalary: number;         
  
  insuranceDeduction: number;     
  pitDeduction: number;           
  unionFee: number;               
  advancePayment: number;         
  otherDeductions: number;        
  
  calculatedSalary: number;       
  netSalary: number;              
  
  adjustments: SalaryAdjustment[];
  lastUpdated: string;
  sentToHrAt?: string; 
  rejectionReason?: string;
  calculationLog?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  actor: string;
  actorId?: string;
  timestamp: string;
  details: string;
  entityType?: string;
  entityId?: string;
  isConfigAction?: boolean;
}

export interface SalaryFormula {
    id: string;
    name: string;
    targetField: string;
    formulaExpression: string;
    isActive: boolean;
    order: number;
    description: string;
}

export interface DailyWorkItem {
    id: string;
    name: string;
    unitPrice: number;
}

export interface BonusType {
    id: string;
    name: string;
    month: number;
    description: string;
}

export interface AnnualBonusPolicy {
    bonusTypeId: string;
    rankId: string;
    gradeId: string;
    amount: number;
}
