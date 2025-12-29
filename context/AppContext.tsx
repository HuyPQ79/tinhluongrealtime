
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, SalaryRecord, AttendanceRecord, EvaluationRequest, AppToast, SystemConfig, 
  Department, Criterion, CriterionGroup, PieceworkConfig, SalaryFormula, SalaryVariable, 
  AuditLog, SalaryRank, SalaryGrade, BonusType, AnnualBonusPolicy, AppNotification,
  UserStatus, RecordStatus, AttendanceType, UserRole, EvaluationTarget, PitStep, SeniorityRule
} from '../types';
import { 
  INITIAL_USERS, INITIAL_DEPARTMENTS, INITIAL_RECORDS, INITIAL_FORMULAS, 
  INITIAL_CRITERIA, INITIAL_SALARY_VARIABLES, INITIAL_RANKS, INITIAL_GRADES,
  INITIAL_CRITERIA_GROUPS, INITIAL_DAILY_WORK
} from '../services/mockData';
import { canApproveStatus } from '../utils/rbac';

const API_BASE = ''; // Để trống để tự động nhận URL từ Cloud Run

interface AppContextType {
  currentUser: User | null;
  allUsers: User[];
  salaryRecords: SalaryRecord[];
  dailyAttendance: AttendanceRecord[];
  evaluationRequests: EvaluationRequest[];
  systemConfig: SystemConfig;
  pendingSystemConfig: SystemConfig | null;
  departments: Department[];
  criteriaList: Criterion[];
  criteriaGroups: CriterionGroup[];
  toasts: AppToast[];
  notifications: AppNotification[];
  auditLogs: AuditLog[];
  salaryRanks: SalaryRank[];
  salaryGrids: SalaryGrade[];
  dailyWorkCatalog: any[];
  formulas: SalaryFormula[];
  salaryVariables: SalaryVariable[];
  pieceworkConfigs: PieceworkConfig[];
  bonusTypes: BonusType[];
  annualBonusPolicies: AnnualBonusPolicy[];
  
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  saveAttendance: (records: AttendanceRecord[]) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  calculateMonthlySalary: (month: string) => Promise<void>;
  showToast: (msg: string, type?: any) => void;
  formatCurrency: (val: number) => string;
  formatDateTime: (d: string) => string;
  getStandardWorkDays: (month: string) => number;
  canViewUser: (target: User) => boolean;

  // Added missing methods used in components
  markNotiRead: (id: string) => void;
  updateSalaryStatus: (id: string, status: RecordStatus) => void;
  canActionSalary: (record: SalaryRecord) => boolean;
  addSalaryAdjustment: (recordId: string, adj: any) => void;
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
  addSalaryVariable: (v: SalaryVariable) => void;
  updateSalaryVariable: (v: SalaryVariable) => void;
  deleteSalaryVariable: (code: string, reason: string) => void;
  addAuditLog: (action: string, details: string) => void;
  toggleSystemLock: () => void;
  toggleApprovalMode: () => void;
  approvePendingConfig: () => void;
  discardPendingConfig: () => void;
  addCriterion: (c: Criterion) => void;
  updateCriterion: (c: Criterion) => void;
  deleteCriterion: (id: string, reason: string) => void;
  addCriterionGroup: (g: CriterionGroup) => void;
  updateCriterionGroup: (g: CriterionGroup) => void;
  deleteCriterionGroup: (id: string, reason: string) => void;
  addUser: (u: User) => void;
  deleteUser: (id: string, reason: string) => void;
  approveUserUpdate: (userId: string) => void;
  rejectUserUpdate: (userId: string) => void;
  addDept: (d: Department) => void;
  updateDept: (d: Department) => void;
  deleteDept: (id: string, reason: string) => void;
  bulkAddUsers: (users: User[]) => void;
  updateAttendanceStatus: (id: string, status: RecordStatus) => void;
  addEvaluationRequest: (req: EvaluationRequest) => void;
  approveEvaluationRequest: (id: string) => void;
  rejectEvaluationRequest: (id: string, reason: string) => void;
  addNotification: (noti: any) => void;
  addRank: (r: SalaryRank) => void;
  updateRank: (r: SalaryRank) => void;
  deleteRank: (id: string) => void;
  addGrade: (g: SalaryGrade) => void;
  updateGrade: (g: SalaryGrade) => void;
  deleteGrade: (id: string) => void;
  addBonusType: (bt: BonusType) => void;
  deleteBonusType: (id: string) => void;
  updateBonusPolicy: (policy: AnnualBonusPolicy) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>(INITIAL_USERS);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>(INITIAL_RECORDS);
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [evaluationRequests, setEvaluationRequests] = useState<EvaluationRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
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
    pitSteps: [],
    approvalWorkflow: [],
    seniorityRules: []
  });
  const [pendingSystemConfig, setPendingSystemConfig] = useState<SystemConfig | null>(null);
  const [criteriaList, setCriteriaList] = useState<Criterion[]>(INITIAL_CRITERIA);
  const [criteriaGroups, setCriteriaGroups] = useState<CriterionGroup[]>(INITIAL_CRITERIA_GROUPS);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [salaryRanks, setSalaryRanks] = useState<SalaryRank[]>(INITIAL_RANKS);
  const [salaryGrids, setSalaryGrids] = useState<SalaryGrade[]>(INITIAL_GRADES);
  const [dailyWorkCatalog, setDailyWorkCatalog] = useState<any[]>(INITIAL_DAILY_WORK);
  const [formulas, setFormulas] = useState<SalaryFormula[]>(INITIAL_FORMULAS);
  const [salaryVariables, setSalaryVariables] = useState<SalaryVariable[]>(INITIAL_SALARY_VARIABLES);
  const [pieceworkConfigs, setPieceworkConfigs] = useState<PieceworkConfig[]>([]);
  const [bonusTypes, setBonusTypes] = useState<BonusType[]>([]);
  const [annualBonusPolicies, setAnnualBonusPolicies] = useState<AnnualBonusPolicy[]>([]);

  // Tải dữ liệu ban đầu từ Cloud khi ứng dụng mở
  useEffect(() => {
    const fetchData = async () => {
        try {
            const [uRes, aRes, cRes] = await Promise.all([
                fetch(`${API_BASE}/api/users`),
                fetch(`${API_BASE}/api/attendance`),
                fetch(`${API_BASE}/api/config`)
            ]);
            if (uRes.ok) setAllUsers(await uRes.json());
            if (aRes.ok) setDailyAttendance(await aRes.json());
            if (cRes.ok) setSystemConfig(await cRes.json());
        } catch (e) {
            console.error("Lỗi kết nối Backend Cloud:", e);
        }
    };
    fetchData();
  }, []);

  const login = async (u: string, p: string) => {
    const res = await fetch(`${API_BASE}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: u, password: p })
    });
    if (res.ok) {
        const data = await res.json();
        setCurrentUser(data.user);
        return true;
    }
    // Mock login for demo if API fails
    if (u === 'admin' && p === '123') {
        setCurrentUser(INITIAL_USERS[0]);
        return true;
    }
    return false;
  };

  const logout = () => setCurrentUser(null);

  const saveAttendance = async (records: AttendanceRecord[]) => {
    try {
        await fetch(`${API_BASE}/api/attendance/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ records })
        });
    } catch (e) {}
    setDailyAttendance(prev => {
        const next = [...prev];
        records.forEach(r => {
            const idx = next.findIndex(x => x.id === r.id);
            if(idx > -1) next[idx] = r; else next.push(r);
        });
        return next;
    });
  };

  const updateUser = async (user: User) => {
    try {
        await fetch(`${API_BASE}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
        });
    } catch (e) {}
    setAllUsers(prev => prev.map(u => u.id === user.id ? user : u));
    if (currentUser?.id === user.id) setCurrentUser(user);
  };

  const calculateMonthlySalary = async (month: string) => { 
    /* Mock implementation for calculateMonthlySalary */ 
  };
  
  const showToast = (msg: string, type: any = 'SUCCESS') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatDateTime = (d: string) => new Date(d).toLocaleString('vi-VN');
  const getStandardWorkDays = (m: string) => 26;
  const canViewUser = (t: User) => true;

  // Implementation of missing methods
  const markNotiRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
  const updateSalaryStatus = (id: string, status: RecordStatus) => setSalaryRecords(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  const canActionSalary = (record: SalaryRecord) => {
    if (!currentUser) return false;
    const dept = departments.find(d => d.id === record.department);
    return canApproveStatus(currentUser, record.status, dept, systemConfig.approvalWorkflow);
  };
  const addSalaryAdjustment = (recordId: string, adj: any) => setSalaryRecords(prev => prev.map(r => r.id === recordId ? { ...r, adjustments: [...(r.adjustments || []), adj] } : r));
  const deleteSalaryAdjustment = (recordId: string, adjId: string) => setSalaryRecords(prev => prev.map(r => r.id === recordId ? { ...r, adjustments: (r.adjustments || []).filter(a => a.id !== adjId) } : r));
  const updateAdvancePayment = (recordId: string, amount: number) => setSalaryRecords(prev => prev.map(r => r.id === recordId ? { ...r, advancePayment: amount } : r));
  const savePieceworkConfigs = (configs: PieceworkConfig[]) => setPieceworkConfigs(prev => {
    const next = [...prev];
    configs.forEach(c => {
      const idx = next.findIndex(x => x.userId === c.userId && x.month === c.month);
      if (idx > -1) next[idx] = c; else next.push(c);
    });
    return next;
  });
  const addDailyWorkItem = (item: any) => setDailyWorkCatalog(prev => [...prev, item]);
  const updateDailyWorkItem = (item: any) => setDailyWorkCatalog(prev => prev.map(i => i.id === item.id ? item : i));
  const deleteDailyWorkItem = (id: string, reason: string) => {
    setDailyWorkCatalog(prev => prev.filter(i => i.id !== id));
    addAuditLog('DELETE_DAILY_WORK', `Xóa nghiệp vụ ID ${id}. Lý do: ${reason}`);
  };
  const addFormula = (f: SalaryFormula) => setFormulas(prev => [...prev, f]);
  const updateFormula = (f: SalaryFormula) => setFormulas(prev => prev.map(i => i.id === f.id ? f : i));
  const deleteFormula = (id: string, reason: string) => {
    setFormulas(prev => prev.filter(i => i.id !== id));
    addAuditLog('DELETE_FORMULA', `Xóa công thức ID ${id}. Lý do: ${reason}`);
  };
  const updateSystemConfig = (config: Partial<SystemConfig>) => {
    if (currentUser?.roles.includes(UserRole.ADMIN)) {
      setSystemConfig(prev => ({ ...prev, ...config, hasPendingChanges: false }));
    } else {
      setPendingSystemConfig({ ...systemConfig, ...config });
      setSystemConfig(prev => ({ ...prev, hasPendingChanges: true, pendingChangeSummary: 'Yêu cầu cập nhật cấu hình tài chính từ HR' }));
    }
  };
  const addSalaryVariable = (v: SalaryVariable) => setSalaryVariables(prev => [...prev, v]);
  const updateSalaryVariable = (v: SalaryVariable) => setSalaryVariables(prev => prev.map(i => i.code === v.code ? v : i));
  const deleteSalaryVariable = (code: string, reason: string) => {
    setSalaryVariables(prev => prev.filter(i => i.code !== code));
    addAuditLog('DELETE_VARIABLE', `Xóa biến số ${code}. Lý do: ${reason}`);
  };
  const addAuditLog = (action: string, details: string) => {
    const log: AuditLog = { id: `LOG${Date.now()}`, action, actor: currentUser?.name || 'System', timestamp: new Date().toISOString(), details };
    setAuditLogs(prev => [log, ...prev]);
  };
  const toggleSystemLock = () => setSystemConfig(prev => ({ ...prev, isPeriodLocked: !prev.isPeriodLocked }));
  const toggleApprovalMode = () => setSystemConfig(prev => ({ ...prev, approvalMode: prev.approvalMode === 'POST_AUDIT' ? 'FULL_APPROVAL' : 'POST_AUDIT' }));
  const approvePendingConfig = () => {
    if (pendingSystemConfig) {
      setSystemConfig({ ...pendingSystemConfig, hasPendingChanges: false });
      setPendingSystemConfig(null);
      addAuditLog('APPROVE_CONFIG', 'Admin phê duyệt cấu hình hệ thống mới.');
    }
  };
  const discardPendingConfig = () => {
    setPendingSystemConfig(null);
    setSystemConfig(prev => ({ ...prev, hasPendingChanges: false }));
    addAuditLog('DISCARD_CONFIG', 'Admin từ chối cấu hình hệ thống đề xuất.');
  };
  const addCriterion = (c: Criterion) => setCriteriaList(prev => [...prev, c]);
  const updateCriterion = (c: Criterion) => setCriteriaList(prev => prev.map(i => i.id === c.id ? c : i));
  const deleteCriterion = (id: string, reason: string) => {
    setCriteriaList(prev => prev.filter(i => i.id !== id));
    addAuditLog('DELETE_CRITERION', `Xóa tiêu chí ID ${id}. Lý do: ${reason}`);
  };
  const addCriterionGroup = (g: CriterionGroup) => setCriteriaGroups(prev => [...prev, g]);
  const updateCriterionGroup = (g: CriterionGroup) => setCriteriaGroups(prev => prev.map(i => i.id === g.id ? g : i));
  const deleteCriterionGroup = (id: string, reason: string) => {
    setCriteriaGroups(prev => prev.filter(i => i.id !== id));
    addAuditLog('DELETE_GROUP', `Xóa nhóm tiêu chí ID ${id}. Lý do: ${reason}`);
  };
  const addUser = (u: User) => setAllUsers(prev => [...prev, u]);
  const deleteUser = (id: string, reason: string) => {
    setAllUsers(prev => prev.filter(u => u.id !== id));
    addAuditLog('DELETE_USER', `Xóa nhân sự ID ${id}. Lý do: ${reason}`);
  };
  const approveUserUpdate = (userId: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId && u.pendingUpdate) {
        return { ...u, ...u.pendingUpdate, status: UserStatus.ACTIVE, pendingUpdate: undefined, pendingUpdateSummary: undefined };
      }
      return u;
    }));
  };
  const rejectUserUpdate = (userId: string) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === userId) {
        return { ...u, status: UserStatus.ACTIVE, pendingUpdate: undefined, pendingUpdateSummary: undefined };
      }
      return u;
    }));
  };
  const addDept = (d: Department) => setDepartments(prev => [...prev, d]);
  const updateDept = (d: Department) => setDepartments(prev => prev.map(i => i.id === d.id ? d : i));
  const deleteDept = (id: string, reason: string) => {
    setDepartments(prev => prev.filter(i => i.id !== id));
    addAuditLog('DELETE_DEPT', `Xóa đơn vị ID ${id}. Lý do: ${reason}`);
  };
  const bulkAddUsers = (users: User[]) => setAllUsers(prev => [...prev, ...users]);
  const updateAttendanceStatus = (id: string, status: RecordStatus) => setDailyAttendance(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  const addEvaluationRequest = (req: EvaluationRequest) => setEvaluationRequests(prev => [...prev, req]);
  const approveEvaluationRequest = (id: string) => setEvaluationRequests(prev => prev.map(r => r.id === id ? { ...r, status: RecordStatus.APPROVED } : r));
  const rejectEvaluationRequest = (id: string, reason: string) => setEvaluationRequests(prev => prev.map(r => r.id === id ? { ...r, status: RecordStatus.REJECTED, rejectionReason: reason } : r));
  const addNotification = (noti: any) => setNotifications(prev => [{ id: `NOTI${Date.now()}`, createdAt: new Date().toISOString(), isRead: false, ...noti }, ...prev]);
  const addRank = (r: SalaryRank) => setSalaryRanks(prev => [...prev, r]);
  const updateRank = (r: SalaryRank) => setSalaryRanks(prev => prev.map(i => i.id === r.id ? r : i));
  const deleteRank = (id: string) => setSalaryRanks(prev => prev.filter(i => i.id !== id));
  const addGrade = (g: SalaryGrade) => setSalaryGrids(prev => [...prev, g]);
  const updateGrade = (g: SalaryGrade) => setSalaryGrids(prev => prev.map(i => i.id === g.id ? g : i));
  const deleteGrade = (id: string) => setSalaryGrids(prev => prev.filter(i => i.id !== id));
  const addBonusType = (bt: BonusType) => setBonusTypes(prev => [...prev, bt]);
  const deleteBonusType = (id: string) => setBonusTypes(prev => prev.filter(i => i.id !== id));
  const updateBonusPolicy = (policy: AnnualBonusPolicy) => setAnnualBonusPolicies(prev => {
    const next = [...prev];
    const idx = next.findIndex(p => p.bonusTypeId === policy.bonusTypeId && p.rankId === policy.rankId && p.gradeId === policy.gradeId);
    if (idx > -1) next[idx] = policy; else next.push(policy);
    return next;
  });

  return (
    <AppContext.Provider value={{ 
        currentUser, allUsers, salaryRecords, dailyAttendance, evaluationRequests, systemConfig, pendingSystemConfig,
        departments, criteriaList, criteriaGroups, toasts, notifications, auditLogs,
        salaryRanks, salaryGrids, dailyWorkCatalog, formulas, salaryVariables, pieceworkConfigs, bonusTypes, annualBonusPolicies,
        login, logout, saveAttendance, updateUser, calculateMonthlySalary,
        showToast, formatCurrency, formatDateTime, getStandardWorkDays, canViewUser,
        markNotiRead, updateSalaryStatus, canActionSalary, addSalaryAdjustment, deleteSalaryAdjustment,
        updateAdvancePayment, savePieceworkConfigs, addDailyWorkItem, updateDailyWorkItem, deleteDailyWorkItem,
        addFormula, updateFormula, deleteFormula, updateSystemConfig, addSalaryVariable, updateSalaryVariable,
        deleteSalaryVariable, addAuditLog, toggleSystemLock, toggleApprovalMode, approvePendingConfig,
        discardPendingConfig, addCriterion, updateCriterion, deleteCriterion, addCriterionGroup,
        updateCriterionGroup, deleteCriterionGroup, addUser, deleteUser, approveUserUpdate, rejectUserUpdate,
        addDept, updateDept, deleteDept, bulkAddUsers, updateAttendanceStatus, addEvaluationRequest,
        approveEvaluationRequest, rejectEvaluationRequest, addNotification, addRank, updateRank, deleteRank,
        addGrade, updateGrade, deleteGrade, addBonusType, deleteBonusType, updateBonusPolicy
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
