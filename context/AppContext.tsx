import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  User, SalaryRecord, AttendanceRecord, EvaluationRequest, AppToast, SystemConfig, 
  Department, Criterion, CriterionGroup, PieceworkConfig, SalaryFormula, SalaryVariable, 
  AuditLog, SalaryRank, SalaryGrade, BonusType, AnnualBonusPolicy, AppNotification,
  UserStatus, RecordStatus, AttendanceType, UserRole, EvaluationTarget, SystemRole, ApprovalWorkflow
} from '../types';
import { api } from '../services/api'; // Kết nối trái tim với API
import { canApproveStatus } from '../utils/rbac'; // Đảm bảo bạn vẫn giữ file này ở thư mục gốc hoặc src/utils

// Cấu hình mặc định rỗng (để tránh lỗi UI khi chưa tải xong data)
const INITIAL_SYSTEM_CONFIG: SystemConfig = {
    id: "default_config",
    baseSalary: 0,
    standardWorkDays: 26,
    insuranceBaseSalary: 0,
    maxInsuranceBase: 0,
    maxHoursForHRReview: 72, // Số giờ tối đa cho HR hậu kiểm (mặc định 72 giờ = 3 ngày)
    isPeriodLocked: false,
    autoApproveDays: 3,
    hrAutoApproveHours: 24,
    approvalMode: 'POST_AUDIT',
    personalRelief: 11000000,
    dependentRelief: 4400000,
    insuranceRate: 10.5,
    unionFeeRate: 1,
    pitSteps: [],
    approvalWorkflow: [],
    seniorityRules: []
};

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
  systemRoles: SystemRole[];
  approvalWorkflows: ApprovalWorkflow[];
  
  // Actions - Authentication
  login: (u: string, p: string) => Promise<boolean>;
  logout: () => void;
  
  // Actions - Core Logic
  saveAttendance: (records: AttendanceRecord[]) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  calculateMonthlySalary: (month: string) => Promise<void>;
  
  // Actions - UI Helpers
  showToast: (msg: string, type?: any) => void;
  formatCurrency: (val: number) => string;
  formatDateTime: (d: string) => string;
  getStandardWorkDays: (month: string) => number;
  canViewUser: (target: User) => boolean;

  // Actions - CRUD (Đã nối API)
  markNotiRead: (id: string) => void;
  updateSalaryStatus: (id: string, status: RecordStatus, rejectionReason?: string) => Promise<void>;
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
  
  // SystemRoles & ApprovalWorkflows
  addSystemRole: (role: SystemRole) => Promise<void>;
  updateSystemRole: (role: SystemRole) => Promise<void>;
  deleteSystemRole: (id: string, reason: string) => Promise<void>;
  addApprovalWorkflow: (workflow: ApprovalWorkflow) => Promise<void>;
  updateApprovalWorkflow: (workflow: ApprovalWorkflow) => Promise<void>;
  deleteApprovalWorkflow: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  // --- 1. STATE QUẢN LÝ DỮ LIỆU ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [salaryRecords, setSalaryRecords] = useState<SalaryRecord[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceRecord[]>([]);
  const [evaluationRequests, setEvaluationRequests] = useState<EvaluationRequest[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>(INITIAL_SYSTEM_CONFIG);
  const [pendingSystemConfig, setPendingSystemConfig] = useState<SystemConfig | null>(null);
  
  const [criteriaList, setCriteriaList] = useState<Criterion[]>([]);
  const [criteriaGroups, setCriteriaGroups] = useState<CriterionGroup[]>([]);
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  const [salaryRanks, setSalaryRanks] = useState<SalaryRank[]>([]);
  const [salaryGrids, setSalaryGrids] = useState<SalaryGrade[]>([]);
  const [dailyWorkCatalog, setDailyWorkCatalog] = useState<any[]>([]);
  const [formulas, setFormulas] = useState<SalaryFormula[]>([]);
  const [salaryVariables, setSalaryVariables] = useState<SalaryVariable[]>([]);
  const [pieceworkConfigs, setPieceworkConfigs] = useState<PieceworkConfig[]>([]);
  const [bonusTypes, setBonusTypes] = useState<BonusType[]>([]);
  const [annualBonusPolicies, setAnnualBonusPolicies] = useState<AnnualBonusPolicy[]>([]);
  const [systemRoles, setSystemRoles] = useState<SystemRole[]>([]);
  const [approvalWorkflows, setApprovalWorkflows] = useState<ApprovalWorkflow[]>([]);

  // --- 2. HÀM TẢI DỮ LIỆU TỪ CLOUD ---
  const refreshData = async () => {
    try {
        // Gọi song song các API để tiết kiệm thời gian
        const [
            usersRes, deptsRes, configRes,
            ranksRes, gradesRes,
            formulasRes, varsRes,
            criteriaRes, groupsRes,
            pieceworkRes, holidaysRes, dailyWorkRes,
            bonusTypesRes, annualPoliciesRes,
            attendanceRes, salaryRes,
            evalRes, auditRes, workflowsRes
        ] = await Promise.all([
            api.getUsers(),
            api.getDepartments(),
            api.getSystemConfig(),

            api.request('/ranks'),
            api.request('/salary-grades').catch(() => []),

            api.request('/formulas'),
            api.request('/variables'),
            api.request('/criteria/items'),
            api.request('/criteria/groups'),
            api.request('/piecework-configs'),
            api.request('/holidays'),
            api.request('/daily-work-items'),
            api.request('/bonus-types'),
            api.request('/bonus-policies'),

            api.getAttendance(),
            api.getSalaryRecords(),
            api.getEvaluations(),
            api.getLogs(),
            api.getApprovalWorkflows().catch(() => []),
        ]);

        // Cập nhật State nếu có dữ liệu
        if (Array.isArray(usersRes)) setAllUsers(usersRes);
        if (Array.isArray(deptsRes)) setDepartments(deptsRes);
        if (configRes && configRes.id) setSystemConfig(configRes);
        if (Array.isArray(ranksRes)) setSalaryRanks(ranksRes);
        if (Array.isArray(gradesRes)) setSalaryGrids(gradesRes);
        if (Array.isArray(formulasRes)) setFormulas(formulasRes);
        if (Array.isArray(varsRes)) setSalaryVariables(varsRes);
        if (Array.isArray(criteriaRes)) setCriteriaList(criteriaRes);
        if (Array.isArray(groupsRes)) setCriteriaGroups(groupsRes);
        if (Array.isArray(pieceworkRes)) setPieceworkConfigs(pieceworkRes);
        if (Array.isArray(holidaysRes)) {/* có thể lưu sau nếu cần */}
        if (Array.isArray(dailyWorkRes)) setDailyWorkCatalog(dailyWorkRes);
        if (Array.isArray(bonusTypesRes)) setBonusTypes(bonusTypesRes);
        if (Array.isArray(annualPoliciesRes)) setAnnualBonusPolicies(annualPoliciesRes);
        if (Array.isArray(attendanceRes)) setDailyAttendance(attendanceRes);
        if (Array.isArray(salaryRes)) setSalaryRecords(salaryRes);
        if (Array.isArray(evalRes)) setEvaluationRequests(evalRes);
        if (Array.isArray(auditRes)) setAuditLogs(auditRes);
        
        // Load SystemRoles từ systemConfig.systemRoles
        if (configRes?.systemRoles && Array.isArray(configRes.systemRoles) && configRes.systemRoles.length > 0) {
          setSystemRoles(configRes.systemRoles);
        } else {
          // Nếu chưa có systemRoles, để mảng rỗng - server sẽ tự động seed khi khởi động
          setSystemRoles([]);
        }
        
        // Load ApprovalWorkflows
        if (Array.isArray(workflowsRes)) {
          setApprovalWorkflows(workflowsRes);
        }

        // Các phần dữ liệu cấu hình chi tiết (sẽ cần gọi thêm nếu API server hỗ trợ tách lẻ)
        // Hiện tại tạm thời để trống hoặc lấy từ systemConfig nếu backend gộp chung
        
    } catch (e) {
        console.error("Lỗi tải dữ liệu Cloud:", e);
        // showToast("Không thể kết nối tới máy chủ", "ERROR");
    }
  };

  // Tự động tải dữ liệu khi mở App nếu đã login
  useEffect(() => {
    const savedUser = localStorage.getItem('HRM_USER');
    if (savedUser) {
        try {
            setCurrentUser(JSON.parse(savedUser));
            refreshData(); // Kích hoạt tải dữ liệu
        } catch (e) {}
    }
  }, []);

  // --- 3. AUTHENTICATION ---
  const login = async (u: string, p: string) => {
    const user = await api.login(u, p);
    if (user) {
        setCurrentUser(user);
        await refreshData(); // Tải dữ liệu ngay lập tức
        return true;
    }
    showToast("Sai tên đăng nhập hoặc mật khẩu", "ERROR");
    return false;
  };

  const logout = () => {
    api.logout();
    setCurrentUser(null);
    setAllUsers([]);
    setSalaryRecords([]);
    // Xóa sạch các state nhạy cảm khác...
  };

  // --- 4. CORE ACTIONS (Kết nối API) ---
  
  const showToast = (msg: string, type: any = 'SUCCESS') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message: msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  };

  // --- USER ---
  const addUser = async (u: User) => {
    const res = await api.saveUser(u);
    if (res) {
        setAllUsers(prev => [...prev, res]);
        showToast("Thêm nhân sự thành công");
    }
  };

  const updateUser = async (user: User) => {
    const res = await api.saveUser(user);
    if (res) {
        setAllUsers(prev => prev.map(u => u.id === user.id ? user : u));
        if (currentUser?.id === user.id) setCurrentUser(user);
        showToast("Cập nhật thành công");
    }
  };

  const deleteUser = async (id: string, reason: string) => {
    await api.deleteUser(id);
    setAllUsers(prev => prev.filter(u => u.id !== id));
    addAuditLog('DELETE_USER', `Xóa user ${id}. Lý do: ${reason}`);
    showToast("Đã xóa nhân sự");
  };

  const bulkAddUsers = async (users: User[]) => {
      // Demo: lặp qua từng user để save (Backend nên hỗ trợ endpoint bulk)
      for (const u of users) {
          await api.saveUser(u);
      }
      refreshData();
      showToast(`Đã import ${users.length} nhân sự`);
  };

  // --- DEPARTMENT ---
  const addDept = async (d: Department) => {
      const res = await api.saveDepartment(d);
      if(res) setDepartments(prev => [...prev, res]);
  };
  const updateDept = async (d: Department) => {
      await api.saveDepartment(d);
      setDepartments(prev => prev.map(i => i.id === d.id ? d : i));
  };
  const deleteDept = async (id: string, reason: string) => {
      await api.deleteDepartment(id);
      setDepartments(prev => prev.filter(i => i.id !== id));
      addAuditLog('DELETE_DEPT', `Xóa phòng ban ${id}. Lý do: ${reason}`);
  };

  // --- ATTENDANCE ---
  const saveAttendance = async (records: AttendanceRecord[]) => {
    const result = await api.saveAttendance(records);
    setDailyAttendance(prev => {
        const next = [...prev];
        records.forEach(r => {
            const idx = next.findIndex(x => x.userId === r.userId && x.date === r.date);
            if(idx > -1) next[idx] = r; else next.push(r);
        });
        return next;
    });
    showToast("Đã lưu chấm công");
    
    // Tự động tính lại lương nếu có chấm công được phê duyệt
    if (result.monthsToRecalculate && result.monthsToRecalculate.length > 0) {
      for (const month of result.monthsToRecalculate) {
        try {
          await calculateMonthlySalary(month);
        } catch (e) {
          console.error(`Lỗi tính lương tự động cho tháng ${month}:`, e);
        }
      }
    }
  };

  const updateAttendanceStatus = async (id: string, status: RecordStatus) => {
      // Cần API support update status riêng, tạm thời dùng saveAttendance
      const record = dailyAttendance.find(r => r.id === id);
      if (record) {
          await api.saveAttendance({ ...record, status });
          setDailyAttendance(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      }
  };

  // --- CONFIGURATIONS (Sử dụng api.saveConfig đa năng) ---
  const updateSystemConfig = async (config: Partial<SystemConfig>) => {
    const newConfig = { ...systemConfig, ...config };
    await api.saveConfig('system', newConfig);
    setSystemConfig(newConfig);
    showToast("Đã lưu cấu hình hệ thống");
  };

  const addFormula = async (f: SalaryFormula) => {
      await api.saveConfig('formulas', f);
      setFormulas(p => [...p, f]);
  };
  const updateFormula = async (f: SalaryFormula) => {
      await api.saveConfig('formulas', f);
      setFormulas(p => p.map(i => i.id === f.id ? f : i));
  };
  const deleteFormula = async (id: string, reason: string) => {
      // Backend cần hỗ trợ delete config, hiện tại UI update trước
      setFormulas(p => p.filter(i => i.id !== id));
      addAuditLog('DELETE_FORMULA', `Xóa công thức ${id}. Lý do: ${reason}`);
  };

  const addSalaryVariable = async (v: SalaryVariable) => {
      await api.saveConfig('variables', v);
      setSalaryVariables(p => [...p, v]);
  };
  const updateSalaryVariable = async (v: SalaryVariable) => {
      await api.saveConfig('variables', v);
      setSalaryVariables(p => p.map(i => i.code === v.code ? v : i));
  };
  const deleteSalaryVariable = (code: string, reason: string) => {
      setSalaryVariables(p => p.filter(i => i.code !== code));
  };

  // --- RANKS & GRADES ---
  const addRank = async (r: SalaryRank) => { await api.saveConfig('ranks', r); setSalaryRanks(p => [...p, r]); };
  const updateRank = async (r: SalaryRank) => { await api.saveConfig('ranks', r); setSalaryRanks(p => p.map(i => i.id === r.id ? r : i)); };
  const deleteRank = (id: string) => setSalaryRanks(p => p.filter(i => i.id !== id));

  const addGrade = (g: SalaryGrade) => setSalaryGrids(p => [...p, g]); // Cần API riêng nếu muốn lưu
  const updateGrade = (g: SalaryGrade) => setSalaryGrids(p => p.map(i => i.id === g.id ? g : i));
  const deleteGrade = (id: string) => setSalaryGrids(p => p.filter(i => i.id !== id));

  // --- CRITERIA ---
  const addCriterion = async (c: Criterion) => { await api.saveConfig('criteria', c); setCriteriaList(p => [...p, c]); };
  const updateCriterion = async (c: Criterion) => { await api.saveConfig('criteria', c); setCriteriaList(p => p.map(i => i.id === c.id ? c : i)); };
  const deleteCriterion = (id: string, reason: string) => setCriteriaList(p => p.filter(i => i.id !== id));

  const addCriterionGroup = async (g: CriterionGroup) => { await api.saveConfig('groups', g); setCriteriaGroups(p => [...p, g]); };
  const updateCriterionGroup = async (g: CriterionGroup) => { await api.saveConfig('groups', g); setCriteriaGroups(p => p.map(i => i.id === g.id ? g : i)); };
  const deleteCriterionGroup = (id: string, reason: string) => setCriteriaGroups(p => p.filter(i => i.id !== id));

  // --- EVALUATIONS ---
  const addEvaluationRequest = async (req: EvaluationRequest) => {
      await api.saveEvaluation(req);
      setEvaluationRequests(p => [...p, req]);
      showToast("Đã gửi yêu cầu đánh giá");
  };
  const approveEvaluationRequest = async (id: string) => {
      try {
          const req = evaluationRequests.find(r => r.id === id);
          if (!req) {
              showToast("Không tìm thấy yêu cầu đánh giá", 'error');
              return;
          }
          // Update status và lưu vào DB
          const updated = { ...req, status: RecordStatus.APPROVED };
          await api.saveEvaluation(updated);
          setEvaluationRequests(p => p.map(r => r.id === id ? updated : r));
          showToast("Đã phê duyệt yêu cầu đánh giá", 'success');
      } catch (error: any) {
          showToast(error.message || "Lỗi khi phê duyệt yêu cầu đánh giá", 'error');
      }
  };
  const rejectEvaluationRequest = async (id: string, reason: string) => {
      try {
          const req = evaluationRequests.find(r => r.id === id);
          if (!req) {
              showToast("Không tìm thấy yêu cầu đánh giá", 'error');
              return;
          }
          // Update status và lưu vào DB
          const updated = { ...req, status: RecordStatus.REJECTED, rejectionReason: reason };
          await api.saveEvaluation(updated);
          setEvaluationRequests(p => p.map(r => r.id === id ? updated : r));
          showToast("Đã từ chối yêu cầu đánh giá", 'success');
      } catch (error: any) {
          showToast(error.message || "Lỗi khi từ chối yêu cầu đánh giá", 'error');
      }
  };

  // --- LOGS & NOTIFICATIONS ---
  const addAuditLog = async (action: string, details: string, entityType?: string, entityId?: string) => {
      const log: AuditLog = { 
        id: `LOG${Date.now()}`, 
        action, 
        actor: currentUser?.name || 'System',
        actorId: currentUser?.id,
        timestamp: new Date().toISOString(), 
        details,
        entityType,
        entityId,
        isConfigAction: action.includes('CONFIG') || action.includes('FORMULA') || action.includes('VARIABLE') || action.includes('WORKFLOW') || action.includes('ROLE')
      };
      try {
        await api.saveLog(log);
      } catch (e) {
        console.error("Error saving audit log:", e);
      }
      setAuditLogs(prev => [log, ...prev]);
  };

  const addNotification = (noti: any) => {
      setNotifications(prev => [{ id: `NOTI${Date.now()}`, createdAt: new Date().toISOString(), isRead: false, ...noti }, ...prev]);
  };
  const markNotiRead = (id: string) => setNotifications(p => p.map(n => n.id === id ? { ...n, isRead: true } : n));

  // --- UTILS & HELPERS ---
  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  const formatDateTime = (d: string) => new Date(d).toLocaleString('vi-VN');
  const getStandardWorkDays = (m: string) => systemConfig.standardWorkDays || 26;
  const canViewUser = (t: User) => true; // Logic quyền hạn có thể mở rộng sau

  // --- SALARY CALCULATION ---
  const calculateMonthlySalary = async (month: string) => {
    try {
      const result = await api.calculateMonthlySalary(month);
      if (result.success) {
        // Reload salary records sau khi tính
        const records = await api.getSalaryRecords(month);
        setSalaryRecords(records);
        showToast(`Đã tính lương cho tháng ${month} (${result.count || 0} bản ghi)`, "SUCCESS");
      }
    } catch (e: any) {
      console.error("Error calculating salary:", e);
      showToast(e.message || "Lỗi tính lương", "ERROR");
    }
  };
  const updateSalaryStatus = async (id: string, status: RecordStatus, rejectionReason?: string) => {
    try {
      await api.updateSalaryStatus(id, status, rejectionReason);
      setSalaryRecords(p => p.map(r => r.id === id ? { ...r, status, rejectionReason } : r));
      showToast(status === RecordStatus.APPROVED ? "Đã phê duyệt bảng lương" : status === RecordStatus.REJECTED ? "Đã từ chối bảng lương" : "Đã cập nhật trạng thái", 'success');
    } catch (error: any) {
      showToast(error.message || "Lỗi khi cập nhật trạng thái bảng lương", 'error');
    }
  };
  const canActionSalary = (record: SalaryRecord) => {
    if (!currentUser) return false;
    const dept = departments.find(d => d.id === record.department);
    return canApproveStatus(currentUser, record.status, dept, systemConfig.approvalWorkflow, departments, systemRoles, 'SALARY', approvalWorkflows);
  };
  
  // Các hàm phụ chưa có API tương ứng cụ thể
  const addSalaryAdjustment = (recordId: string, adj: any) => {};
  const deleteSalaryAdjustment = (recordId: string, adjId: string) => {};
  const updateAdvancePayment = (recordId: string, amount: number) => {};
  const savePieceworkConfigs = (configs: PieceworkConfig[]) => setPieceworkConfigs(configs);
  const addDailyWorkItem = (item: any) => setDailyWorkCatalog(p => [...p, item]);
  const updateDailyWorkItem = (item: any) => setDailyWorkCatalog(p => p.map(i => i.id === item.id ? item : i));
  const deleteDailyWorkItem = (id: string, reason: string) => setDailyWorkCatalog(p => p.filter(i => i.id !== id));
  
  const toggleSystemLock = () => setSystemConfig(p => ({ ...p, isPeriodLocked: !p.isPeriodLocked }));
  const toggleApprovalMode = () => setSystemConfig(p => ({ ...p, approvalMode: p.approvalMode === 'POST_AUDIT' ? 'FULL_APPROVAL' : 'POST_AUDIT' }));
  const approvePendingConfig = () => { if (pendingSystemConfig) { setSystemConfig({ ...pendingSystemConfig, hasPendingChanges: false }); setPendingSystemConfig(null); }};
  const discardPendingConfig = () => { setPendingSystemConfig(null); setSystemConfig(p => ({ ...p, hasPendingChanges: false })); };
  
  const approveUserUpdate = (userId: string) => {};
  const rejectUserUpdate = (userId: string) => {};
  
  const addBonusType = (bt: BonusType) => setBonusTypes(p => [...p, bt]);
  const deleteBonusType = (id: string) => setBonusTypes(p => p.filter(i => i.id !== id));
  const updateBonusPolicy = (policy: AnnualBonusPolicy) => setAnnualBonusPolicies(p => [...p, policy]); // Demo logic
  
  // --- SYSTEM ROLES ---
  const addSystemRole = async (role: SystemRole) => {
    const updatedRoles = [...systemRoles, role];
    await updateSystemConfig({ systemRoles: updatedRoles });
    setSystemRoles(updatedRoles);
    await addAuditLog('ADD_SYSTEM_ROLE', `Thêm vai trò: ${role.name}`, 'SYSTEM_ROLE', role.id);
    showToast("Đã thêm vai trò");
  };
  
  const updateSystemRole = async (role: SystemRole) => {
    const updatedRoles = systemRoles.map(r => r.id === role.id ? role : r);
    await updateSystemConfig({ systemRoles: updatedRoles });
    setSystemRoles(updatedRoles);
    await addAuditLog('UPDATE_SYSTEM_ROLE', `Cập nhật vai trò: ${role.name}`, 'SYSTEM_ROLE', role.id);
    showToast("Đã cập nhật vai trò");
  };
  
  const deleteSystemRole = async (id: string, reason: string) => {
    const role = systemRoles.find(r => r.id === id);
    const updatedRoles = systemRoles.filter(r => r.id !== id);
    await updateSystemConfig({ systemRoles: updatedRoles });
    setSystemRoles(updatedRoles);
    await addAuditLog('DELETE_SYSTEM_ROLE', `Xóa vai trò: ${role?.name || id}. Lý do: ${reason}`, 'SYSTEM_ROLE', id);
    showToast("Đã xóa vai trò");
  };
  
  // --- APPROVAL WORKFLOWS ---
  const addApprovalWorkflow = async (workflow: ApprovalWorkflow) => {
    try {
      const saved = await api.saveApprovalWorkflow(workflow);
      setApprovalWorkflows(p => [...p, saved]);
      await addAuditLog('ADD_APPROVAL_WORKFLOW', `Thêm luồng phê duyệt: ${workflow.contentType}`, 'APPROVAL_WORKFLOW', saved.id);
      showToast("Đã thêm luồng phê duyệt");
    } catch (e: any) {
      showToast(e.message || "Lỗi thêm luồng phê duyệt", "ERROR");
    }
  };
  
  const updateApprovalWorkflow = async (workflow: ApprovalWorkflow) => {
    try {
      const saved = await api.saveApprovalWorkflow(workflow);
      setApprovalWorkflows(p => p.map(w => w.id === workflow.id ? saved : w));
      await addAuditLog('UPDATE_APPROVAL_WORKFLOW', `Cập nhật luồng phê duyệt: ${workflow.contentType}`, 'APPROVAL_WORKFLOW', saved.id);
      showToast("Đã cập nhật luồng phê duyệt");
    } catch (e: any) {
      showToast(e.message || "Lỗi cập nhật luồng phê duyệt", "ERROR");
    }
  };
  
  const deleteApprovalWorkflow = async (id: string) => {
    try {
      // Backend cần có endpoint DELETE, tạm thời đóng workflow bằng cách set effectiveTo
      const workflow = approvalWorkflows.find(w => w.id === id);
      if (workflow) {
        await api.saveApprovalWorkflow({ ...workflow, effectiveTo: new Date().toISOString() });
        setApprovalWorkflows(p => p.filter(w => w.id !== id));
        await addAuditLog('DELETE_APPROVAL_WORKFLOW', `Xóa luồng phê duyệt: ${workflow.contentType}`, 'APPROVAL_WORKFLOW', id);
        showToast("Đã xóa luồng phê duyệt");
      }
    } catch (e: any) {
      showToast(e.message || "Lỗi xóa luồng phê duyệt", "ERROR");
    }
  };

  return (
    <AppContext.Provider value={{ 
        currentUser, allUsers, salaryRecords, dailyAttendance, evaluationRequests, systemConfig, pendingSystemConfig,
        departments, criteriaList, criteriaGroups, toasts, notifications, auditLogs,
        salaryRanks, salaryGrids, dailyWorkCatalog, formulas, salaryVariables, pieceworkConfigs, bonusTypes, annualBonusPolicies,
        systemRoles, approvalWorkflows,
        
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
        addGrade, updateGrade, deleteGrade, addBonusType, deleteBonusType, updateBonusPolicy,
        addSystemRole, updateSystemRole, deleteSystemRole, addApprovalWorkflow, updateApprovalWorkflow, deleteApprovalWorkflow
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
