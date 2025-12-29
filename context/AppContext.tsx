
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, SalaryRecord, AttendanceRecord, EvaluationRequest, AppToast, SystemConfig, 
  Department, Criterion, CriterionGroup, PieceworkConfig, SalaryFormula, SalaryVariable, 
  AuditLog, SalaryRank, SalaryGrade, BonusType, AnnualBonusPolicy, AppNotification,
  UserStatus, RecordStatus, AttendanceType, UserRole, EvaluationTarget, SalaryAdjustment
} from '../types';
import { INITIAL_USERS, INITIAL_DEPARTMENTS, INITIAL_RANKS, INITIAL_GRADES, INITIAL_CRITERIA, INITIAL_CRITERIA_GROUPS, INITIAL_FORMULAS, INITIAL_SALARY_VARIABLES, INITIAL_DAILY_WORK } from '../services/mockData';

const API_BASE = '/api';

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  salaryRecords: SalaryRecord[];
  dailyAttendance: AttendanceRecord[];
  evaluationRequests: EvaluationRequest[];
  systemConfig: SystemConfig;
  pendingSystemConfig: SystemConfig | null;
  departments: Department[];
  toasts: AppToast[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  criteriaList: Criterion[];
  criteriaGroups: CriterionGroup[];
  annualBonusPolicies: AnnualBonusPolicy[];
  pieceworkConfigs: PieceworkConfig[];
  dailyWorkCatalog: any[];
  formulas: SalaryFormula[];
  salaryVariables: SalaryVariable[];
  salaryRanks: SalaryRank[];
  salaryGrids: SalaryGrade[];
  bonusTypes: BonusType[];
  
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  saveAttendance: (records: AttendanceRecord[]) => Promise<void>;
  updateAttendanceStatus: (id: string, status: RecordStatus) => void;
  updateUser: (user: User) => Promise<void>;
  addUser: (user: User) => void;
  deleteUser: (id: string, reason: string) => void;
  bulkAddUsers: (users: User[]) => void;
  approveUserUpdate: (userId: string) => void;
  rejectUserUpdate: (userId: string) => void;
  showToast: (msg: string, type?: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING') => void;
  formatCurrency: (val: number) => string;
  formatDateTime: (d: string) => string;
  calculateMonthlySalary: (month: string) => Promise<void>;
  markNotiRead: (id: string) => void;
  addNotification: (noti: any) => void;
  addAuditLog: (action: string, details: string, isConfig?: boolean) => void;
  
  updateSalaryStatus: (id: string, status: RecordStatus) => void;
  canActionSalary: (record: SalaryRecord) => boolean;
  addSalaryAdjustment: (recordId: string, adj: SalaryAdjustment) => void;
  deleteSalaryAdjustment: (recordId: string, adjId: string) => void;
  updateAdvancePayment: (recordId: string, amount: number) => void;
  savePieceworkConfigs: (configs: PieceworkConfig[]) => void;
  
  addDailyWorkItem: (item: any) => void;
  updateDailyWorkItem: (item: any) => void;
  deleteDailyWorkItem: (id: string, reason: string) => void;
  
  addFormula: (f: SalaryFormula) => void;
  updateFormula: (f: SalaryFormula) => void;
  deleteFormula: (id: string, reason: string) => void;
  
  updateSystemConfig: (config: Partial<SystemConfig>) => void;
  toggleSystemLock: () => void;
  toggleApprovalMode: () => void;
  approvePendingConfig: () => void;
  discardPendingConfig: () => void;
  
  addSalaryVariable: (v: SalaryVariable) => void;
  updateSalaryVariable: (v: SalaryVariable) => void;
  deleteSalaryVariable: (code: string, reason: string) => void;
  
  addCriterion: (c: Criterion) => void;
  updateCriterion: (c: Criterion) => void;
  deleteCriterion: (id: string, reason: string) => void;
  addCriterionGroup: (g: CriterionGroup) => void;
  updateCriterionGroup: (g: CriterionGroup) => void;
  deleteCriterionGroup: (id: string, reason: string) => void;
  
  addEvaluationRequest: (req: EvaluationRequest) => void;
  approveEvaluationRequest: (id: string) => void;
  rejectEvaluationRequest: (id: string, reason: string) => void;
  
  addRank: (r: SalaryRank) => void;
  updateRank: (r: SalaryRank) => void;
  deleteRank: (id: string) => void;
  addGrade: (g: SalaryGrade) => void;
  updateGrade: (g: SalaryGrade) => void;
  deleteGrade: (id: string) => void;
  
  addBonusType: (b: BonusType) => void;
  deleteBonusType: (id: string) => void;
  updateBonusPolicy: (p: AnnualBonusPolicy) => void;
  
  canViewUser: (target: User) => boolean;
  getStandardWorkDays: (month: string) => number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('hrm_token'));
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [evaluationRequests, setEvaluationRequests] = useState<EvaluationRequest[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [criteriaList, setCriteriaList] = useState<Criterion[]>(INITIAL_CRITERIA);
  const [criteriaGroups, setCriteriaGroups] = useState<CriterionGroup[]>(INITIAL_CRITERIA_GROUPS);
  const [annualBonusPolicies, setAnnualBonusPolicies] = useState<AnnualBonusPolicy[]>([]);
  const [pieceworkConfigs, setPieceworkConfigs] = useState<PieceworkConfig[]>([]);
  const [dailyWorkCatalog, setDailyWorkCatalog] = useState<any[]>(INITIAL_DAILY_WORK);
  const [formulas, setFormulas] = useState<SalaryFormula[]>(INITIAL_FORMULAS);
  const [salaryVariables, setSalaryVariables] = useState<SalaryVariable[]>(INITIAL_SALARY_VARIABLES);
  const [salaryRanks, setSalaryRanks] = useState<SalaryRank[]>(INITIAL_RANKS);
  const [salaryGrids, setSalaryGrids] = useState<SalaryGrade[]>(INITIAL_GRADES);
  const [bonusTypes, setBonusTypes] = useState<BonusType[]>([]);
  const [pendingSystemConfig, setPendingSystemConfig] = useState<SystemConfig | null>(null);

  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    isPeriodLocked: false,
    autoApproveDays: 3,
    hrAutoApproveHours: 24,
    approvalMode: 'POST_AUDIT',
    personalRelief: 11000000,
    dependentRelief: 4400000,
    insuranceRate: 10.5,
    unionFeeRate: 1,
    maxInsuranceBase: 36000000,
    pitSteps: [
        { id: 'PIT1', label: 'Bậc 1', threshold: 5000000, rate: 5, subtraction: 0 },
        { id: 'PIT2', label: 'Bậc 2', threshold: 10000000, rate: 10, subtraction: 250000 }
    ],
    approvalWorkflow: [
        { id: 'S1', role: UserRole.QUAN_LY, label: 'Quản lý duyệt', statusOnEnter: RecordStatus.PENDING_MANAGER },
        { id: 'S2', role: UserRole.NHAN_SU, label: 'HR Hậu kiểm', statusOnEnter: RecordStatus.PENDING_HR }
    ],
    seniorityRules: [
        { id: 'SR1', label: 'Dưới 3 tháng', minMonths: 0, maxMonths: 3, coefficient: 0.5 },
        { id: 'SR2', label: 'Từ 3-6 tháng', minMonths: 3, maxMonths: 6, coefficient: 0.7 },
        { id: 'SR3', label: 'Trên 6 tháng', minMonths: 6, maxMonths: 999, coefficient: 1.0 }
    ]
  });

  const getHeaders = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  });

  const fetchData = async () => {
    if (!token) return;
    try {
      const uRes = await fetch(`${API_BASE}/users`, { headers: getHeaders() });
      if (uRes.ok) setAllUsers(await uRes.json());
    } catch (e) {
      showToast("Lỗi kết nối máy chủ Cloud SQL", "ERROR");
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const login = async (u: string, p: string) => {
    if (u === 'admin' && p === '123') {
        const adminUser = INITIAL_USERS[0];
        setCurrentUser(adminUser);
        setToken('mock_token');
        showToast(`Chào mừng ${adminUser.name} quay lại`, "SUCCESS");
        return true;
    }
    return false;
  };

  const logout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem('hrm_token');
  };

  const showToast = (msg: string, type: any = 'SUCCESS') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatDateTime = (d: string) => new Date(d).toLocaleString('vi-VN');

  const addAuditLog = (action: string, details: string, isConfig: boolean = false) => {
    const newLog: AuditLog = {
      id: `LOG${Date.now()}`,
      action,
      actor: currentUser?.name || 'System',
      timestamp: new Date().toISOString(),
      details,
      isConfigAction: isConfig
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  const saveAttendance = async (records: AttendanceRecord[]) => {
    setDailyAttendance(prev => {
        const next = [...prev];
        records.forEach(r => {
            const idx = next.findIndex(x => x.userId === r.userId && x.date === r.date);
            if(idx > -1) next[idx] = r; else next.push(r);
        });
        return next;
    });
    showToast("Đã lưu dữ liệu chấm công", "SUCCESS");
  };

  const updateAttendanceStatus = (id: string, status: RecordStatus) => {
    setDailyAttendance(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  };

  const updateUser = async (user: User) => {
    setAllUsers(prev => prev.map(u => u.id === user.id ? user : u));
    showToast("Cập nhật hồ sơ thành công", "SUCCESS");
  };

  const addUser = (user: User) => {
    setAllUsers(prev => [...prev, user]);
    showToast("Đã thêm nhân viên mới", "SUCCESS");
    addAuditLog("THÊM NHÂN VIÊN", `Đã thêm ${user.name} vào hệ thống`);
  };

  const deleteUser = (id: string, reason: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== id));
    showToast("Đã xóa nhân viên", "WARNING");
    addAuditLog("XÓA NHÂN VIÊN", `Lý do: ${reason}`);
  };

  const bulkAddUsers = (users: User[]) => {
    setAllUsers(prev => [...prev, ...users]);
    showToast(`Đã import ${users.length} nhân sự`, "SUCCESS");
  };

  const approveUserUpdate = (userId: string) => {
    setAllUsers(prev => prev.map(u => u.id === userId && u.pendingUpdate ? { ...u, ...u.pendingUpdate, status: UserStatus.ACTIVE, pendingUpdate: undefined, pendingUpdateSummary: undefined } : u));
    showToast("Đã duyệt thay đổi hồ sơ", "SUCCESS");
  };

  const rejectUserUpdate = (userId: string) => {
    setAllUsers(prev => prev.map(u => u.id === userId ? { ...u, status: UserStatus.ACTIVE, pendingUpdate: undefined, pendingUpdateSummary: undefined } : u));
    showToast("Đã từ chối thay đổi hồ sơ", "WARNING");
  };

  const markNotiRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const addNotification = (noti: any) => setNotifications(prev => [{ id: `N${Date.now()}`, createdAt: new Date().toISOString(), isRead: false, ...noti }, ...prev]);

  const calculateMonthlySalary = async (month: string) => {
    // Basic mock implementation for the calculation logic
    const records: SalaryRecord[] = allUsers.map(u => {
        const existing = salaryRecords.find(r => r.userId === u.id && r.date === month);
        if (existing) return existing;

        const grade = salaryGrids.find(g => g.id === u.currentGradeId);
        const baseSalary = grade?.baseSalary || 0;
        
        return {
            id: `SAL_${u.id}_${month}`,
            userId: u.id,
            userName: u.name,
            positionName: u.currentPosition || '',
            department: u.currentDeptId || '',
            date: month,
            status: RecordStatus.DRAFT,
            Ctc: 26, Ctt: 26, Cn: 0, NCD: 0, NL: 0, NCL: 0, NKL: 0, NCV: 0,
            LCB_dm: baseSalary, LHQ_dm: u.efficiencySalary, LSL_dm: 0,
            SL_khoan: 0, SL_tt: 0, DG_khoan: u.pieceworkUnitPrice || 0,
            HS_tn: 1.0, probationRate: u.probationRate || 100,
            actualBaseSalary: baseSalary, actualEfficiencySalary: u.efficiencySalary,
            actualPieceworkSalary: 0, otherSalary: 0, totalAllowance: grade?.fixedAllowance || 0,
            totalBonus: 0, overtimeSalary: 0, insuranceDeduction: 0, pitDeduction: 0,
            unionFee: 0, advancePayment: 0, otherDeductions: 0, calculatedSalary: baseSalary + u.efficiencySalary,
            netSalary: baseSalary + u.efficiencySalary, adjustments: [], lastUpdated: new Date().toISOString()
        };
    });
    setSalaryRecords(records);
  };

  const updateSalaryStatus = (id: string, status: RecordStatus) => {
    setSalaryRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const canActionSalary = (record: SalaryRecord) => {
    if (currentUser?.roles.includes(UserRole.ADMIN)) return true;
    if (record.status === RecordStatus.APPROVED) return false;
    return true;
  };

  const addSalaryAdjustment = (recordId: string, adj: SalaryAdjustment) => {
    setSalaryRecords(prev => prev.map(r => {
        if (r.id === recordId) {
            const newAdjs = [...(r.adjustments || []), adj];
            const netDelta = adj.type === 'DEDUCTION' ? -adj.amount : adj.amount;
            return { ...r, adjustments: newAdjs, netSalary: r.netSalary + netDelta };
        }
        return r;
    }));
  };

  const deleteSalaryAdjustment = (recordId: string, adjId: string) => {
    setSalaryRecords(prev => prev.map(r => {
        if (r.id === recordId) {
            const adj = r.adjustments.find(a => a.id === adjId);
            if (!adj) return r;
            const netDelta = adj.type === 'DEDUCTION' ? adj.amount : -adj.amount;
            return { ...r, adjustments: r.adjustments.filter(a => a.id !== adjId), netSalary: r.netSalary + netDelta };
        }
        return r;
    }));
  };

  const updateAdvancePayment = (recordId: string, amount: number) => {
    setSalaryRecords(prev => prev.map(r => r.id === recordId ? { ...r, advancePayment: amount, netSalary: r.calculatedSalary - (r.insuranceDeduction + r.pitDeduction + r.unionFee + amount + r.otherDeductions) } : r));
  };

  const savePieceworkConfigs = (configs: PieceworkConfig[]) => setPieceworkConfigs(prev => [...prev, ...configs]);

  const addDailyWorkItem = (item: any) => setDailyWorkCatalog(prev => [...prev, item]);
  const updateDailyWorkItem = (item: any) => setDailyWorkCatalog(prev => prev.map(i => i.id === item.id ? item : i));
  const deleteDailyWorkItem = (id: string, reason: string) => {
    setDailyWorkCatalog(prev => prev.filter(i => i.id !== id));
    addAuditLog("XÓA CÔNG NHẬT", `Lý do: ${reason}`, true);
  };

  const addFormula = (f: SalaryFormula) => setFormulas(prev => [...prev, f]);
  const updateFormula = (f: SalaryFormula) => setFormulas(prev => prev.map(i => i.id === f.id ? f : i));
  const deleteFormula = (id: string, reason: string) => {
    setFormulas(prev => prev.filter(f => f.id !== id));
    addAuditLog("XÓA CÔNG THỨC", `Lý do: ${reason}`, true);
  };

  const updateSystemConfig = (config: Partial<SystemConfig>) => {
    if (hasRole(currentUser!, [UserRole.ADMIN])) {
        setSystemConfig(prev => ({ ...prev, ...config }));
        addAuditLog("CẬP NHẬT HỆ THỐNG", "Thay đổi cấu hình hệ thống trực tiếp", true);
    } else {
        setPendingSystemConfig({ ...systemConfig, ...config });
        setSystemConfig(prev => ({ ...prev, hasPendingChanges: true, pendingChangeSummary: "Đề xuất thay đổi định mức từ HR" }));
    }
  };

  const toggleSystemLock = () => setSystemConfig(prev => ({ ...prev, isPeriodLocked: !prev.isPeriodLocked }));
  const toggleApprovalMode = () => setSystemConfig(prev => ({ ...prev, approvalMode: prev.approvalMode === 'POST_AUDIT' ? 'FULL_APPROVAL' : 'POST_AUDIT' }));

  const approvePendingConfig = () => {
    if (pendingSystemConfig) {
        setSystemConfig({ ...pendingSystemConfig, hasPendingChanges: false });
        setPendingSystemConfig(null);
        addAuditLog("PHÊ DUYỆT CẤU HÌNH", "Admin đã duyệt áp dụng cấu hình mới", true);
    }
  };

  const discardPendingConfig = () => {
    setSystemConfig(prev => ({ ...prev, hasPendingChanges: false }));
    setPendingSystemConfig(null);
  };

  const addSalaryVariable = (v: SalaryVariable) => setSalaryVariables(prev => [...prev, v]);
  const updateSalaryVariable = (v: SalaryVariable) => setSalaryVariables(prev => prev.map(i => i.code === v.code ? v : i));
  const deleteSalaryVariable = (code: string, reason: string) => {
    setSalaryVariables(prev => prev.filter(v => v.code !== code));
    addAuditLog("XÓA BIẾN SỐ", `Code: ${code}, Lý do: ${reason}`, true);
  };

  const addCriterion = (c: Criterion) => setCriteriaList(prev => [...prev, c]);
  const updateCriterion = (c: Criterion) => setCriteriaList(prev => prev.map(i => i.id === c.id ? c : i));
  const deleteCriterion = (id: string, reason: string) => {
    setCriteriaList(prev => prev.filter(c => c.id !== id));
    addAuditLog("XÓA TIÊU CHÍ", `Lý do: ${reason}`, true);
  };

  const addCriterionGroup = (g: CriterionGroup) => setCriteriaGroups(prev => [...prev, g]);
  const updateCriterionGroup = (g: CriterionGroup) => setCriteriaGroups(prev => prev.map(i => i.id === g.id ? g : i));
  const deleteCriterionGroup = (id: string, reason: string) => {
    setCriteriaGroups(prev => prev.filter(g => g.id !== id));
    addAuditLog("XÓA NHÓM TIÊU CHÍ", `Lý do: ${reason}`, true);
  };

  const addEvaluationRequest = (req: EvaluationRequest) => setEvaluationRequests(prev => [req, ...prev]);
  const approveEvaluationRequest = (id: string) => setEvaluationRequests(prev => prev.map(e => e.id === id ? { ...e, status: RecordStatus.APPROVED } : e));
  const rejectEvaluationRequest = (id: string, reason: string) => setEvaluationRequests(prev => prev.map(e => e.id === id ? { ...e, status: RecordStatus.REJECTED, rejectionReason: reason } : e));

  const addRank = (r: SalaryRank) => setSalaryRanks(prev => [...prev, r]);
  const updateRank = (r: SalaryRank) => setSalaryRanks(prev => prev.map(i => i.id === r.id ? r : i));
  const deleteRank = (id: string) => setSalaryRanks(prev => prev.filter(r => r.id !== id));

  const addGrade = (g: SalaryGrade) => setSalaryGrids(prev => [...prev, g]);
  const updateGrade = (g: SalaryGrade) => setSalaryGrids(prev => prev.map(i => i.id === g.id ? g : i));
  const deleteGrade = (id: string) => setSalaryGrids(prev => prev.filter(g => g.id !== id));

  const addBonusType = (b: BonusType) => setBonusTypes(prev => [...prev, b]);
  const deleteBonusType = (id: string) => setBonusTypes(prev => prev.filter(b => b.id !== id));
  const updateBonusPolicy = (p: AnnualBonusPolicy) => setAnnualBonusPolicies(prev => [...prev, p]);

  const addDept = (d: Department) => setDepartments(prev => [...prev, d]);
  const updateDept = (d: Department) => setDepartments(prev => prev.map(i => i.id === d.id ? d : i));
  const deleteDept = (id: string, reason: string) => {
    setDepartments(prev => prev.filter(d => d.id !== id));
    addAuditLog("XÓA PHÒNG BAN", `Lý do: ${reason}`, true);
  };

  const canViewUser = (target: User) => {
    if (!currentUser) return false;
    if (currentUser.id === target.id) return true;
    if (hasRole(currentUser, [UserRole.ADMIN, UserRole.BAN_LANH_DAO])) return true;
    return currentUser.assignedDeptIds?.includes(target.currentDeptId || '') || false;
  };

  const getStandardWorkDays = (month: string) => 26;

  return (
    <AppContext.Provider value={{ 
        currentUser, allUsers, salaryRecords, dailyAttendance, evaluationRequests, systemConfig, pendingSystemConfig,
        departments, toasts, notifications, auditLogs, criteriaList, criteriaGroups, annualBonusPolicies,
        pieceworkConfigs, dailyWorkCatalog, formulas, salaryVariables, salaryRanks, salaryGrids, bonusTypes,
        login, logout, saveAttendance, updateAttendanceStatus, updateUser, addUser, deleteUser, bulkAddUsers,
        approveUserUpdate, rejectUserUpdate, showToast, formatCurrency, formatDateTime,
        calculateMonthlySalary, markNotiRead, addNotification, addAuditLog,
        updateSalaryStatus, canActionSalary, addSalaryAdjustment, deleteSalaryAdjustment, updateAdvancePayment, savePieceworkConfigs,
        addDailyWorkItem, updateDailyWorkItem, deleteDailyWorkItem, addFormula, updateFormula, deleteFormula,
        updateSystemConfig, toggleSystemLock, toggleApprovalMode, approvePendingConfig, discardPendingConfig,
        addSalaryVariable, updateSalaryVariable, deleteSalaryVariable, addCriterion, updateCriterion, deleteCriterion,
        addCriterionGroup, updateCriterionGroup, deleteCriterionGroup, addEvaluationRequest, approveEvaluationRequest, rejectEvaluationRequest,
        addRank, updateRank, deleteRank, addGrade, updateGrade, deleteGrade, addBonusType, deleteBonusType, updateBonusPolicy,
        addDept, updateDept, deleteDept, canViewUser, getStandardWorkDays
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
};
