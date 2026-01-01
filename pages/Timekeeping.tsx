
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    UserCheck, AlertCircle, Save, Plus, CheckCircle, XCircle, Undo2, 
    Trash2, Clock, Building2, Search, Calendar as CalendarIcon, Target, Check, Info, ChevronRight, Briefcase, Layers, ThumbsUp, ThumbsDown, FileText, Paperclip, Upload, X, Calculator, DollarSign, Wallet, Eye, UserPlus, ListPlus, ChevronDown, User as UserIcon,
    Banknote, BarChart3, FileSpreadsheet, ChevronLeft, CalendarDays, Zap, ShieldAlert, Send, ArrowRight, Loader2, RotateCcw, ShieldCheck, FileCheck, Printer
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { RecordStatus, EvaluationRequest, UserRole, EvaluationScope, AttendanceType, AttendanceRecord, User, Criterion, EvaluationTarget } from '../types';
import { hasRole, getNextPendingStatus, canApproveStatus } from '../utils/rbac';
import * as XLSX from 'xlsx';

const ATTENDANCE_LABELS: Record<string, string> = {
  [AttendanceType.TIME]: 'Công thời gian',
  [AttendanceType.PIECEWORK]: 'Công khoán',
  [AttendanceType.DAILY]: 'Công nhật',
  [AttendanceType.MODE]: 'Nghỉ chế độ',
  [AttendanceType.HOLIDAY]: 'Nghỉ lễ',
  [AttendanceType.PAID_LEAVE]: 'Nghỉ phép/Có lương',
  [AttendanceType.UNPAID]: 'Nghỉ không lương',
  [AttendanceType.WAITING]: 'Nghỉ chờ việc'
};

const Timekeeping: React.FC = () => {
  const { 
    allUsers, departments, criteriaList, criteriaGroups, dailyWorkCatalog, 
    dailyAttendance, saveAttendance, updateAttendanceStatus, addEvaluationRequest, evaluationRequests, 
    approveEvaluationRequest, rejectEvaluationRequest, currentUser, canViewUser, formatDateTime,
    addCriterion, getStandardWorkDays, systemConfig, salaryRecords, addNotification, showToast
  } = useAppContext();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeMode, setActiveMode] = useState<'ATTENDANCE' | 'EVALUATION' | 'SUMMARY'>('ATTENDANCE');

  // Handle Deep Links from Notifications
  useEffect(() => {
    const tab = searchParams.get('tab');
    const dateParam = searchParams.get('date');
    const deptParam = searchParams.get('deptId');

    if (tab === 'EVALUATION') setActiveMode('EVALUATION');
    else if (tab === 'SUMMARY') setActiveMode('SUMMARY');
    else setActiveMode('ATTENDANCE');

    if (dateParam) setSelectedDate(dateParam);
    if (deptParam) setSelectedDeptId(deptParam);
  }, [searchParams]);

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isCriteriaDropdownOpen, setIsCriteriaDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const criteriaDropdownRef = useRef<HTMLDivElement>(null);

  const [actionProcessing, setActionProcessing] = useState<string | null>(null);
  const [lastActionStatus, setLastActionStatus] = useState<{ id: string, type: 'SUCCESS' | 'ERROR' } | null>(null);

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  const isKTL = useMemo(() => currentUser?.roles.includes(UserRole.KE_TOAN_LUONG), [currentUser]);
  const isManager = useMemo(() => hasRole(currentUser!, [UserRole.QUAN_LY, UserRole.GIAM_DOC_KHOI, UserRole.BAN_LANH_DAO, UserRole.ADMIN]), [currentUser]);
  const isHR = useMemo(() => hasRole(currentUser!, [UserRole.NHAN_SU, UserRole.ADMIN]), [currentUser]);

  const canApproveThisEval = (req: EvaluationRequest) => {
    if (!currentUser) return false;
    const user = allUsers.find(u => u.id === req.userId);
    const dept = departments.find(d => d.id === user?.currentDeptId || d.id === user?.sideDeptId);
    return canApproveStatus(currentUser, req.status, dept, systemConfig.approvalWorkflow, departments);
  };

  const getStatusColor = (status?: RecordStatus) => {
    if (!status) return 'bg-slate-100 text-slate-500 border-slate-200';
    switch (status) {
      case RecordStatus.APPROVED: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case RecordStatus.REJECTED: return 'bg-rose-100 text-rose-700 border-rose-200';
      case RecordStatus.DRAFT: return 'bg-slate-100 text-slate-500 border-slate-200';
      case RecordStatus.PENDING_MANAGER: return 'bg-blue-100 text-blue-700 border-blue-200';
      case RecordStatus.PENDING_GDK: return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      case RecordStatus.PENDING_BLD: return 'bg-amber-100 text-amber-700 border-amber-200';
      case RecordStatus.PENDING_HR: return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getHRCountdown = (record: AttendanceRecord) => {
    if (record.status !== RecordStatus.PENDING_HR || !record.sentToHrAt) return null;
    const sentDate = new Date(record.sentToHrAt).getTime();
    const limitHours = systemConfig.hrAutoApproveHours;
    const deadline = sentDate + (limitHours * 60 * 60 * 1000);
    const diff = deadline - now;
    
    if (diff <= 0) return 'Hết giờ hậu kiểm';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}p`;
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record?.status) return null;
    const color = getStatusColor(record.status);
    const countdown = getHRCountdown(record);
    
    let label = record.status.replace('PENDING_', 'CHỜ ');
    if (record.status === RecordStatus.PENDING_HR) label = 'HẬU KIỂM';
    if (record.status === RecordStatus.APPROVED) label = 'ĐÃ DUYỆT';

    return (
      <div className="flex flex-col items-center gap-1">
        <span className={`px-2 py-0.5 rounded text-[8px] font-black border uppercase tracking-tighter ${color}`}>
            {label}
        </span>
        {countdown && <span className="text-[7px] font-black text-rose-500 animate-pulse flex items-center gap-0.5 text-left"><Clock size={8}/> {countdown}</span>}
      </div>
    );
  };

  const availableDepts = useMemo(() => {
    if (!currentUser) return [];
    let baseDepts = departments;
    if (!hasRole(currentUser, [UserRole.ADMIN, UserRole.BAN_LANH_DAO])) {
        if (currentUser.roles.includes(UserRole.KE_TOAN_LUONG)) {
            baseDepts = departments.filter(d => currentUser.assignedDeptIds?.includes(d.id));
        } else {
            const supervisorDepts = departments.filter(d => d.managerId === currentUser.id || d.blockDirectorId === currentUser.id || d.hrId === currentUser.id);
            if (supervisorDepts.length > 0) baseDepts = supervisorDepts;
            else baseDepts = departments.filter(d => d.id === currentUser.currentDeptId || d.id === currentUser.sideDeptId);
        }
    }
    return baseDepts;
  }, [departments, currentUser]);

  const [selectedDeptId, setSelectedDeptId] = useState(availableDepts[0]?.id || 'ALL');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceBuffer, setAttendanceBuffer] = useState<Record<string, Partial<AttendanceRecord>>>({});
  
  const [evalStartDate, setEvalStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [evalEndDate, setEvalEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [rejectionModal, setRejectionModal] = useState<{ isOpen: boolean, id: string }>({ isOpen: false, id: '' });
  const [rejectionReason, setRejectionReason] = useState('');

  const [evalForm, setEvalForm] = useState<Partial<EvaluationRequest>>({ 
    userId: '', 
    criteriaId: '', 
    description: '', 
    proofFileName: '', 
    scope: EvaluationScope.MAIN_JOB,
    target: EvaluationTarget.MONTHLY_SALARY,
    points: 0 
  });

  const [userSearch, setUserSearch] = useState('');
  const [criteriaSearch, setCriteriaSearch] = useState('');
  const [isQuickCriteriaModalOpen, setIsQuickCriteriaModalOpen] = useState(false);

  const isOnlyEmployee = useMemo(() => {
      if (!currentUser) return true;
      return !hasRole(currentUser, [UserRole.ADMIN, UserRole.BAN_LANH_DAO, UserRole.KE_TOAN_LUONG, UserRole.QUAN_LY, UserRole.GIAM_DOC_KHOI, UserRole.NHAN_SU]);
  }, [currentUser]);

  const currentDeptUsers = useMemo(() => {
    return allUsers.filter(u => {
        if (isOnlyEmployee) return u.id === currentUser?.id;
        const inSelectedDept = selectedDeptId === 'ALL' || (u.currentDeptId === selectedDeptId || u.sideDeptId === selectedDeptId);
        return inSelectedDept && canViewUser(u);
    });
  }, [allUsers, selectedDeptId, canViewUser, isOnlyEmployee, currentUser]);

  const filteredUsersForSelect = useMemo(() => {
    return currentDeptUsers.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()) || u.id.toLowerCase().includes(userSearch.toLowerCase()));
  }, [currentDeptUsers, userSearch]);

  const filteredCriteriaForSelect = useMemo(() => {
    return criteriaList.filter(c => c.name.toLowerCase().includes(criteriaSearch.toLowerCase()));
  }, [criteriaList, criteriaSearch]);

  const filteredEvaluationsByDate = useMemo(() => {
    return evaluationRequests.filter(req => {
        const date = req.createdAt.split('T')[0];
        const inDateRange = date >= evalStartDate && date <= evalEndDate;
        const belongsToUser = (req.userId === currentUser?.id || !isOnlyEmployee);
        const belongsToDept = selectedDeptId === 'ALL' || 
            allUsers.find(u => u.id === req.userId)?.currentDeptId === selectedDeptId || 
            allUsers.find(u => u.id === req.userId)?.sideDeptId === selectedDeptId;
        
        return inDateRange && belongsToUser && belongsToDept;
    });
  }, [evaluationRequests, evalStartDate, evalEndDate, currentUser, isOnlyEmployee, selectedDeptId, allUsers]);

  // Click outside listener for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
            setIsUserDropdownOpen(false);
        }
        if (criteriaDropdownRef.current && !criteriaDropdownRef.current.contains(event.target as Node)) {
            setIsCriteriaDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const existing = dailyAttendance.filter(r => r.date === selectedDate);
    const newBuffer: Record<string, Partial<AttendanceRecord>> = {};
    currentDeptUsers.forEach(u => {
      const record = existing.find(r => r.userId === u.id);
      
      // FIX: Lựa chọn loại công ưu tiên dựa trên paymentType của User
      const defaultType = u.paymentType === 'PIECEWORK' ? AttendanceType.PIECEWORK : AttendanceType.TIME;

      newBuffer[u.id] = record ? { ...record } : { 
          userId: u.id, 
          date: selectedDate, 
          type: defaultType, 
          hours: 8, 
          overtimeHours: 0,
          otRate: 1.5,
          isOvertimeWithOutput: false,
          overtimeDailyWorkItemId: '',
          pieceworkUnitPrice: u.pieceworkUnitPrice || 0,
          status: RecordStatus.DRAFT 
      };
    });
    setAttendanceBuffer(newBuffer);
  }, [selectedDate, selectedDeptId, currentDeptUsers, dailyAttendance]);

  const stats = useMemo(() => {
    const monthStr = selectedDate.substring(0, 7);
    const monthAttendance = dailyAttendance.filter(a => a.date.startsWith(monthStr));
    const monthEvals = evaluationRequests.filter(e => e.createdAt.startsWith(monthStr) && e.status === RecordStatus.APPROVED);
    
    const targetUserIds = isOnlyEmployee ? [currentUser?.id] : allUsers.filter(u => selectedDeptId === 'ALL' || u.currentDeptId === selectedDeptId || u.sideDeptId === selectedDeptId).map(u => u.id);
    
    const targetAttendance = monthAttendance.filter(a => targetUserIds.includes(a.userId));
    const totalHours = targetAttendance.reduce((acc, curr) => acc + curr.hours, 0);
    const totalOT = targetAttendance.reduce((acc, curr) => acc + curr.overtimeHours, 0);

    const calcPenaltyMoney = (evalList: EvaluationRequest[]) => {
        return evalList.filter(e => e.type === 'PENALTY').reduce((acc, curr) => {
            if (curr.target === EvaluationTarget.RESERVED_BONUS) {
                return acc + curr.points; 
            }
            const user = allUsers.find(u => u.id === curr.userId);
            const criteria = criteriaList.find(c => c.id === curr.criteriaId);
            const group = criteriaGroups.find(g => g.id === criteria?.groupId);
            if (!criteria || !user || !group) return acc;

            const userMonthEvals = evaluationRequests.filter(x => x.userId === curr.userId && x.criteriaId === curr.criteriaId && x.createdAt.startsWith(monthStr) && x.createdAt <= curr.createdAt);
            if (criteria.threshold > 0 && userMonthEvals.length <= criteria.threshold) {
                return acc;
            }

            const targetSalary = user?.paymentType === 'PIECEWORK' ? 0 : (user?.efficiencySalary || 0);
            return acc + (criteria.value / 100 * group.weight / 100 * targetSalary);
        }, 0);
    };

    const penaltiesTodayMoney = calcPenaltyMoney(evaluationRequests.filter(e => e.createdAt.startsWith(selectedDate) && e.status === RecordStatus.APPROVED && targetUserIds.includes(e.userId)));
    const penaltiesMonthMoney = calcPenaltyMoney(monthEvals.filter(e => targetUserIds.includes(e.userId)));

    return { totalHours, totalOT, penaltiesToday: penaltiesTodayMoney, penaltiesMonth: penaltiesMonthMoney };
  }, [dailyAttendance, evaluationRequests, selectedDate, isOnlyEmployee, currentUser, selectedDeptId, allUsers, criteriaList, criteriaGroups]);

  const actionableBatch = useMemo(() => {
    if (!currentUser) return { hasDraft: false, canApproveCount: 0, canRejectCount: 0 };
    const list = Object.values(attendanceBuffer) as AttendanceRecord[];
    
    let canApproveCount = 0;
    let canRejectCount = 0;

    list.forEach(r => {
        const user = allUsers.find(u => u.id === r.userId);
        const dept = departments.find(d => d.id === user?.currentDeptId || d.id === user?.sideDeptId);
        
        if (canApproveStatus(currentUser, r.status, dept, systemConfig.approvalWorkflow, departments)) {
            canApproveCount++;
            if (r.status !== RecordStatus.DRAFT && r.status !== RecordStatus.APPROVED) {
                canRejectCount++;
            }
        }
    });

    return {
        hasDraft: list.some(r => (r.status || RecordStatus.DRAFT) === RecordStatus.DRAFT),
        canApproveCount,
        canRejectCount
    };
  }, [attendanceBuffer, currentUser, allUsers, departments, systemConfig.approvalWorkflow]);

  const handleSaveAllAttendance = async () => {
    if (isOnlyEmployee) return;
    setActionProcessing('SAVE');
    await new Promise(resolve => setTimeout(resolve, 800));
    const records = (Object.values(attendanceBuffer) as Partial<AttendanceRecord>[]).map(r => ({ 
        ...r, 
        id: r.id || `ATT_${r.userId}_${selectedDate}`,
        status: r.status || RecordStatus.DRAFT 
    } as AttendanceRecord));
    saveAttendance(records);
    setActionProcessing(null);
    setLastActionStatus({ id: 'SAVE', type: 'SUCCESS' });
    setTimeout(() => setLastActionStatus(null), 2000);
  };

  const handleActionBatch = async (action: 'SUBMIT' | 'APPROVE' | 'REJECT') => {
    if (isOnlyEmployee) return;
    setActionProcessing(action);
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const recordsToUpdate: AttendanceRecord[] = [];
    
    (Object.values(attendanceBuffer) as Partial<AttendanceRecord>[]).forEach(r => {
        const record = { 
            ...r, 
            id: r.id || `ATT_${r.userId}_${selectedDate}`,
            status: r.status || RecordStatus.DRAFT 
        } as AttendanceRecord;

        const user = allUsers.find(u => u.id === record.userId);
        const dept = departments.find(d => d.id === user?.currentDeptId || d.id === user?.sideDeptId);
        const hasPermission = canApproveStatus(currentUser!, record.status, dept, systemConfig.approvalWorkflow, departments);

        if (action === 'SUBMIT' && record.status === RecordStatus.DRAFT) {
            record.status = RecordStatus.PENDING_MANAGER;
            recordsToUpdate.push(record);
        } else if (action === 'APPROVE' && hasPermission) {
            if (record.status === RecordStatus.PENDING_MANAGER) {
                record.status = RecordStatus.PENDING_HR;
                record.sentToHrAt = new Date().toISOString();
            }
            else if (record.status === RecordStatus.PENDING_HR) {
                record.status = RecordStatus.APPROVED;
            }
            else {
                const nextStatus = getNextPendingStatus(user!, systemConfig.approvalWorkflow, record.status);
                record.status = nextStatus;
            }
            recordsToUpdate.push(record);
        } else if (action === 'REJECT' && hasPermission) {
            if (record.status !== RecordStatus.DRAFT && record.status !== RecordStatus.APPROVED) {
                record.status = RecordStatus.DRAFT;
                record.rejectionReason = 'Quản lý yêu cầu điều chỉnh lại hàng loạt.';
                recordsToUpdate.push(record);
            }
        }
    });

    if (recordsToUpdate.length > 0) {
        saveAttendance(recordsToUpdate);
        if (action === 'SUBMIT') {
            const dept = departments.find(d => d.id === selectedDeptId);
            if (dept?.managerId) {
                addNotification({
                    title: 'Duyệt công ngày mới',
                    content: `Kế toán vừa gửi dữ liệu công ngày ${selectedDate} của ${dept.name} chờ bạn phê duyệt.`,
                    type: 'WARNING',
                    actionUrl: `/timekeeping?tab=ATTENDANCE&date=${selectedDate}&deptId=${selectedDeptId}`
                });
            }
        }
    }

    setActionProcessing(null);
    setLastActionStatus({ id: action, type: action === 'REJECT' ? 'ERROR' : 'SUCCESS' });
    setTimeout(() => setLastActionStatus(null), 2000);
  };

  const handleIndividualAction = (userId: string, action: 'APPROVE' | 'REJECT') => {
      const r = attendanceBuffer[userId];
      if (!r) return;
      const updated = { ...r, id: r.id || `ATT_${userId}_${selectedDate}` } as AttendanceRecord;
      const user = allUsers.find(u => u.id === userId);
      
      if (action === 'APPROVE') {
          updated.status = getNextPendingStatus(user!, systemConfig.approvalWorkflow, updated.status);
          if (updated.status === RecordStatus.PENDING_HR) updated.sentToHrAt = new Date().toISOString();
      } else {
          updated.status = RecordStatus.DRAFT;
          updated.rejectionReason = 'Điều chỉnh theo yêu cầu.';
      }
      saveAttendance([updated]);
  };

  const handleSendEval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalForm.userId) return alert("Thiếu thông tin nhân viên!");
    const user = allUsers.find(u => u.id === evalForm.userId);
    let newReq: EvaluationRequest;
    if (evalForm.target === EvaluationTarget.RESERVED_BONUS) {
        if (!evalForm.points || evalForm.points <= 0) return alert("Vui lòng nhập số tiền phạt!");
        newReq = {
            id: `EV${Date.now()}`,
            userId: evalForm.userId!,
            userName: user?.name || '',
            criteriaId: 'DIRECT_MONEY',
            criteriaName: 'Khấu trừ tiền trực tiếp (Thưởng treo)',
            scope: evalForm.scope || EvaluationScope.MAIN_JOB,
            target: EvaluationTarget.RESERVED_BONUS,
            type: 'PENALTY', 
            points: evalForm.points || 0,
            description: evalForm.description || '',
            proofFileName: evalForm.proofFileName || '',
            requesterId: currentUser?.id || '',
            status: getNextPendingStatus(user!, systemConfig.approvalWorkflow),
            createdAt: new Date().toISOString()
        };
    } else {
        if (!evalForm.criteriaId) return alert("Vui lòng chọn tiêu chí!");
        const criteria = criteriaList.find(c => c.id === evalForm.criteriaId);
        newReq = {
          id: `EV${Date.now()}`,
          userId: evalForm.userId!,
          userName: user?.name || '',
          criteriaId: evalForm.criteriaId!,
          criteriaName: criteria?.name || '',
          scope: evalForm.scope || EvaluationScope.MAIN_JOB,
          target: evalForm.target || EvaluationTarget.MONTHLY_SALARY,
          type: criteria?.type || 'PENALTY',
          points: criteria?.value || 0,
          description: evalForm.description || '',
          proofFileName: evalForm.proofFileName || '',
          requesterId: currentUser?.id || '',
          status: getNextPendingStatus(user!, systemConfig.approvalWorkflow),
          createdAt: new Date().toISOString()
        };
    }
    addEvaluationRequest(newReq);
    setEvalForm({ userId: '', criteriaId: '', description: '', proofFileName: '', scope: EvaluationScope.MAIN_JOB, target: EvaluationTarget.MONTHLY_SALARY, points: 0 });
    setUserSearch('');
    setCriteriaSearch('');
  };

  const handleRejectEval = () => {
      if (!rejectionModal.id || !rejectionReason.trim()) return;
      rejectEvaluationRequest(rejectionModal.id, rejectionReason);
      setRejectionModal({ isOpen: false, id: '' });
      setRejectionReason('');
  };

  const handleQuickAddCriteria = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const newC: Criterion = {
        id: `C${Date.now()}`,
        groupId: f.get('groupId') as string,
        name: f.get('name') as string,
        type: f.get('type') as 'BONUS' | 'PENALTY',
        unit: 'PERCENT',
        value: Number(f.get('value')),
        point: 0,
        threshold: Number(f.get('threshold') || 0),
        description: f.get('name') as string
    };
    addCriterion(newC);
    setIsQuickCriteriaModalOpen(false);
    setEvalForm({ ...evalForm, criteriaId: newC.id });
    setCriteriaSearch(newC.name);
  };

  const daysInMonth = useMemo(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    const date = new Date(year, month, 0);
    return Array.from({ length: date.getDate() }, (_, i) => i + 1);
  }, [selectedDate]);

  const summaryData = useMemo(() => {
    const monthStr = selectedDate.substring(0, 7);
    return currentDeptUsers.map(u => {
        const userAtt = dailyAttendance.filter(a => a.userId === u.id && a.date.startsWith(monthStr));
        const totalHours = userAtt.filter(a => a.status === RecordStatus.APPROVED).reduce((acc, curr) => acc + curr.hours, 0);
        const totalOT = userAtt.filter(a => a.status === RecordStatus.APPROVED).reduce((acc, curr) => acc + curr.overtimeHours, 0);
        const totalOutput = userAtt.filter(a => a.status === RecordStatus.APPROVED).reduce((acc, curr) => acc + (curr.output || 0), 0);
        
        const workDaysCount = userAtt.filter(a => 
            a.status === RecordStatus.APPROVED && 
            [AttendanceType.TIME, AttendanceType.PIECEWORK, AttendanceType.DAILY].includes(a.type)
        ).length;

        const userEvals = evaluationRequests.filter(e => e.userId === u.id && e.createdAt.startsWith(monthStr) && e.status === RecordStatus.APPROVED && e.type === 'PENALTY');
        const criteriaCountsInSummary: Record<string, number> = {};
        const sortedEvals = [...userEvals].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        
        const totalPenaltyMoney = sortedEvals.reduce((acc, curr) => {
            if (curr.target === EvaluationTarget.RESERVED_BONUS) return acc + curr.points;
            const criteria = criteriaList.find(c => c.id === curr.criteriaId);
            const group = criteriaGroups.find(g => g.id === criteria?.groupId);
            if (!criteria || !group) return acc;
            criteriaCountsInSummary[curr.criteriaId] = (criteriaCountsInSummary[curr.criteriaId] || 0) + 1;
            if (criteria.threshold > 0 && criteriaCountsInSummary[curr.criteriaId] <= criteria.threshold) return acc;
            return acc + ((criteria.value / 100) * (group.weight / 100) * (u.efficiencySalary || 0));
        }, 0);
        return { user: u, totalHours, totalOT, totalOutput, workDaysCount, totalPenaltyMoney, dailyLogs: userAtt };
    });
  }, [currentDeptUsers, dailyAttendance, evaluationRequests, selectedDate, criteriaList, criteriaGroups]);

  const handleExportSummaryXLSX = () => {
      const monthStr = selectedDate.substring(0, 7);
      const dataForExport = summaryData.map(d => {
          const row: any = {
              "Mã NV": d.user.id,
              "Họ Tên": d.user.name,
              "Đơn vị": departments.find(dept => dept.id === (d.user.currentDeptId || d.user.sideDeptId))?.name || '',
              "Chức danh": d.user.currentPosition || '',
          };
          
          daysInMonth.forEach(day => {
              const dayStr = `${monthStr}-${String(day).padStart(2, '0')}`;
              const log = d.dailyLogs.find(l => l.date === dayStr);
              let code = '--';
              if (log) {
                if (log.status !== RecordStatus.APPROVED) code = '?';
                else {
                    if (log.type === AttendanceType.TIME) code = 'X';
                    else if (log.type === AttendanceType.PIECEWORK) code = 'K';
                    else if (log.type === AttendanceType.PAID_LEAVE) code = 'P';
                    else if (log.type === AttendanceType.HOLIDAY) code = 'L';
                    else if (log.type === AttendanceType.MODE) code = 'Ô';
                    else if (log.type === AttendanceType.DAILY) code = 'N';
                }
              }
              row[`Ngày ${day}`] = code;
          });

          row["Tổng Công"] = d.workDaysCount;
          row["Tổng Giờ OT"] = d.totalOT;
          row["Phạt KPI"] = d.totalPenaltyMoney;
          
          return row;
      });

      const ws = XLSX.utils.json_to_sheet(dataForExport);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Summary_Attendance");
      XLSX.writeFile(wb, `Bang_Cong_Tong_Hop_${monthStr}.xlsx`);
      showToast("Đã xuất file bảng công tổng hợp", "SUCCESS");
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-left">
      {/* HEADER */}
      <div className="bg-slate-900 rounded-2xl shadow-xl p-6 flex flex-col lg:flex-row justify-between items-center gap-6 no-print">
          <div className="flex items-center gap-4 w-full lg:w-auto">
              <div className="bg-orange-500 p-2.5 rounded-xl text-white shadow-lg"><CalendarIcon size={24}/></div>
              <div>
                  <h1 className="text-white font-bold text-lg leading-none">Chấm Công & Hiệu Suất</h1>
                  <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Dữ liệu nội bộ NAS Synology</p>
              </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              <div className="flex flex-col text-left">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 text-left">Đơn vị phụ trách</label>
                  <select className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 min-w-[220px]" value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)} disabled={isOnlyEmployee}>
                    <option value="ALL">-- Toàn công ty --</option>
                    {availableDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
              </div>
              <div className="flex flex-col text-left">
                  <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 text-left">Ngày làm việc</label>
                  <input type="date" className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}/>
              </div>
              <div className="flex gap-2 p-1 bg-slate-800 rounded-xl self-end">
                <button onClick={() => { setActiveMode('ATTENDANCE'); setSearchParams({tab:'ATTENDANCE'}); }} className={`px-5 py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${activeMode === 'ATTENDANCE' ? 'bg-white text-indigo-600 shadow' : 'text-slate-400'}`}>Bảng Công</button>
                <button onClick={() => { setActiveMode('SUMMARY'); setSearchParams({tab:'SUMMARY'}); }} className={`px-5 py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${activeMode === 'SUMMARY' ? 'bg-white text-emerald-600 shadow' : 'text-slate-400'}`}>Tổng Hợp</button>
                <button onClick={() => { setActiveMode('EVALUATION'); setSearchParams({tab:'EVALUATION'}); }} className={`px-5 py-2 rounded-lg font-bold text-[10px] uppercase transition-all ${activeMode === 'EVALUATION' ? 'bg-white text-orange-600 shadow' : 'text-slate-400'}`}>KPI & Phạt</button>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 no-print text-left">
          <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 text-left"><div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Clock size={24}/></div><div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase text-left">Tổng giờ công phê duyệt</p><h3 className="text-xl font-black text-slate-800 text-left">{stats.totalHours}h <span className="text-xs text-slate-400 font-bold">(+ {stats.totalOT}h OT)</span></h3></div></div>
          <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 text-left"><div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Wallet size={24}/></div><div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase text-left">Công chuẩn tháng</p><h3 className="text-xl font-black text-emerald-600 text-left">{getStandardWorkDays(selectedDate.substring(0, 7))} ngày</h3></div></div>
          <div className="bg-white p-5 rounded-2xl border shadow-sm flex items-center gap-4 border-l-4 border-l-rose-500 text-left"><div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0"><AlertCircle size={24}/></div><div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase text-left">Phạt hôm nay</p><h3 className="text-xl font-black text-rose-600 text-left">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.penaltiesToday)}</h3></div></div>
          <div className="bg-slate-900 p-5 rounded-2xl border shadow-lg flex items-center gap-4 text-left"><div className="w-12 h-12 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0"><Calculator size={24}/></div><div className="text-left"><p className="text-[10px] font-black text-slate-500 uppercase text-left">Tổng khấu trừ tháng</p><h3 className="text-xl font-black text-white text-left">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(stats.penaltiesMonth)}</h3></div></div>
      </div>

      {/* TAB 1: BẢNG CHẤM CÔNG NGÀY */}
      {activeMode === 'ATTENDANCE' && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[500px] no-print text-left">
              <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center px-6 gap-4 text-left">
                  <div className="flex flex-wrap items-center gap-3 text-left">
                    <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2 text-left"><UserCheck size={16} className="text-indigo-500"/> Chấm công nhân sự ngày {selectedDate}</h3>
                    
                    <div className="flex gap-2 text-left">
                        {isKTL && actionableBatch.hasDraft && (
                            <button 
                                onClick={() => handleActionBatch('SUBMIT')} 
                                disabled={!!actionProcessing}
                                className={`px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${lastActionStatus?.id === 'SUBMIT' ? 'bg-emerald-500 text-white scale-105' : 'bg-blue-600 text-white shadow-blue-100'}`}
                            >
                                {actionProcessing === 'SUBMIT' ? <Loader2 size={14} className="animate-spin"/> : lastActionStatus?.id === 'SUBMIT' ? <Check size={14}/> : <Send size={14}/>} 
                                {lastActionStatus?.id === 'SUBMIT' ? 'Đã gửi' : 'Gửi duyệt ngày'}
                            </button>
                        )}
                        {isManager && (actionableBatch.canApproveCount > 0) && (
                            <button 
                                onClick={() => handleActionBatch('APPROVE')} 
                                disabled={!!actionProcessing}
                                className={`px-4 py-1.5 rounded-xl font-bold text-[10px] uppercase flex items-center gap-1.5 shadow-md transition-all active:scale-95 bg-emerald-600 text-white shadow-emerald-100`}
                            >
                                {actionProcessing === 'APPROVE' ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle size={14}/>} 
                                {isHR && actionableBatch.canApproveCount > 0 ? 'Hậu kiểm hàng loạt' : 'Duyệt hàng loạt'} ({actionableBatch.canApproveCount})
                            </button>
                        )}
                    </div>
                  </div>
                  {!isOnlyEmployee && (
                    <button 
                        onClick={handleSaveAllAttendance} 
                        disabled={!!actionProcessing}
                        className={`px-8 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 ${lastActionStatus?.id === 'SAVE' ? 'bg-emerald-600 scale-105' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                    >
                        {actionProcessing === 'SAVE' ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
                        {lastActionStatus?.id === 'SAVE' ? 'ĐÃ LƯU NHÁP' : 'LƯU NHÁP BẢNG CÔNG'}
                    </button>
                  )}
              </div>
              <div className="overflow-x-auto custom-scrollbar text-left">
                  <table className="w-full text-left text-xs table-fixed min-w-[1600px]">
                      <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] border-b sticky top-0 z-10">
                          <tr className="text-center">
                              <th className="px-6 py-5 text-left w-56">Nhân viên / Trạng thái</th>
                              <th className="px-2 py-5 w-32">Loại công</th>
                              <th className="px-2 py-5 w-20">Giờ chính</th>
                              <th className="px-2 py-5 w-44">Sản lượng (X)</th>
                              <th className="px-2 py-5 w-44 bg-emerald-50 text-emerald-800">Đơn giá khoán (DG_khoan)</th>
                              <th className="px-2 py-5 w-20">Giờ Tăng ca</th>
                              <th className="px-2 py-5 w-28 bg-orange-50 text-orange-700">Hệ số OT</th>
                              <th className="px-2 py-5 w-24 bg-indigo-50 text-indigo-700">T.Ca có SL?</th>
                              <th className="px-2 py-5 w-44 bg-blue-50 text-blue-700">T.Ca việc nhật (OT_dm)</th>
                              <th className="px-6 py-5 w-44">Ghi chú</th>
                              <th className="px-6 py-5 w-32 text-right">Thao tác</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-left">
                          {currentDeptUsers.map(u => {
                              const buffer = attendanceBuffer[u.id] || {};
                              const dept = departments.find(d => d.id === u.currentDeptId || d.id === u.sideDeptId);
                              const hasPermission = canApproveStatus(currentUser!, buffer.status || RecordStatus.DRAFT, dept, systemConfig.approvalWorkflow, departments);

                              return (
                                  <tr key={u.id} className="hover:bg-slate-50/80 text-center transition-colors">
                                      <td className="px-6 py-4 text-left border-r bg-slate-50/30">
                                          <div className="flex items-center gap-3">
                                              <img src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100"/>
                                              <div className="text-left">
                                                <p className="font-black text-slate-800 text-sm leading-tight">{u.name}</p>
                                                <div className="mt-1">{getStatusBadge(buffer as AttendanceRecord)}</div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-2 py-4">
                                          <select className="w-full px-2 py-1.5 border rounded-lg font-bold bg-white text-[10px] outline-none focus:border-indigo-500" value={buffer.type} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, type: e.target.value as AttendanceType}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}>{Object.values(AttendanceType).map(t => <option key={t} value={t}>{ATTENDANCE_LABELS[t]}</option>)}</select>
                                      </td>
                                      <td className="px-2 py-4"><input type="number" step="0.5" className="w-full px-2 py-1.5 border rounded-lg font-black text-center text-indigo-600 outline-none" value={buffer.hours} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, hours: Number(e.target.value)}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}/></td>
                                      <td className="px-2 py-4">{buffer.type === AttendanceType.PIECEWORK ? (<div className="relative"><input type="number" placeholder="Sản lượng..." className="w-full px-2 py-1.5 border rounded-lg bg-emerald-50 text-[10px] text-center font-black text-emerald-700 pr-6 outline-none" value={buffer.output || ''} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, output: Number(e.target.value)}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}/><span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-emerald-300 font-bold uppercase">SP</span></div>) : buffer.type === AttendanceType.DAILY ? (<select className="w-full px-2 py-1.5 border rounded-lg bg-blue-50 text-[9px] font-bold outline-none text-blue-700" value={buffer.dailyWorkItemId || ''} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, dailyWorkItemId: e.target.value}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}><option value="">-- Chọn việc nhật --</option>{dailyWorkCatalog.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select>) : (<span className="text-[10px] text-slate-300 italic font-medium">Theo quy định công</span>)}</td>
                                      <td className="px-2 py-4 bg-emerald-50/30">
                                          {buffer.type === AttendanceType.PIECEWORK ? (
                                              <div className="relative">
                                                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" size={12}/>
                                                  <input type="number" className="w-full pl-6 pr-2 py-1.5 border-2 border-emerald-100 rounded-lg font-black text-center text-emerald-700 text-[10px] outline-none bg-white focus:border-emerald-500" value={buffer.pieceworkUnitPrice || 0} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, pieceworkUnitPrice: Number(e.target.value)}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}/>
                                              </div>
                                          ) : <span className="text-slate-300">--</span>}
                                      </td>
                                      <td className="px-2 py-4"><input type="number" step="0.5" className="w-full px-2 py-1.5 border rounded-lg font-black text-center text-orange-600 outline-none" value={buffer.overtimeHours} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, overtimeHours: Number(e.target.value)}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}/></td>
                                      <td className="px-2 py-4 bg-orange-50/20">
                                          <select 
                                              className="w-full px-2 py-1.5 border border-orange-200 rounded-lg font-black text-center text-orange-700 outline-none bg-white text-[10px]" 
                                              value={buffer.otRate} 
                                              onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, otRate: Number(e.target.value)}})}
                                              disabled={isOnlyEmployee || buffer.overtimeHours! <= 0 || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}
                                          >
                                              <option value={1.5}>Ngày thường (1.5)</option>
                                              <option value={2.0}>Chủ nhật (2.0)</option>
                                              <option value={3.0}>Lễ/Tết (3.0)</option>
                                          </select>
                                      </td>
                                      <td className="px-2 py-4 bg-indigo-50/20">
                                          <div className="flex justify-center">
                                              <input type="checkbox" className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 border-indigo-200" checked={buffer.isOvertimeWithOutput || false} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, isOvertimeWithOutput: e.target.checked}})} disabled={isOnlyEmployee || buffer.overtimeHours! <= 0 || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}/>
                                          </div>
                                      </td>
                                      <td className="px-2 py-4 bg-blue-50/20">
                                          <select 
                                            className={`w-full px-2 py-1.5 border rounded-lg text-[9px] font-black outline-none transition-all ${buffer.isOvertimeWithOutput ? 'bg-slate-100 text-slate-400 border-slate-100' : 'bg-white text-blue-700 border-blue-200 focus:border-blue-500 shadow-sm'}`} 
                                            value={buffer.overtimeDailyWorkItemId || ''} 
                                            onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, overtimeDailyWorkItemId: e.target.value}})} 
                                            disabled={isOnlyEmployee || buffer.overtimeHours! <= 0 || buffer.isOvertimeWithOutput || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}
                                          >
                                              <option value="">-- Theo Lương CB --</option>
                                              {dailyWorkCatalog.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                          </select>
                                      </td>
                                      <td className="px-6 py-4"><input className="w-full px-3 py-1.5 border rounded-lg text-[10px] outline-none bg-slate-50 focus:bg-white" placeholder="Ghi chú..." value={buffer.notes || ''} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, notes: e.target.value}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}/></td>
                                      <td className="px-6 py-4 text-right">
                                          <div className="flex justify-end gap-1.5">
                                              {hasPermission && buffer.status !== RecordStatus.APPROVED && buffer.status !== RecordStatus.DRAFT && (
                                                  <>
                                                    <button onClick={() => handleIndividualAction(u.id, 'APPROVE')} className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 transition-all" title="Duyệt bản ghi"><Check size={14}/></button>
                                                    <button onClick={() => handleIndividualAction(u.id, 'REJECT')} className="p-1.5 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition-all" title="Từ chối/Trả về"><RotateCcw size={14}/></button>
                                                  </>
                                              )}
                                          </div>
                                      </td>
                                  </tr>
                              );
                          })}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {/* TAB 2: TỔNG HỢP CÔNG THÁNG */}
      {activeMode === 'SUMMARY' && (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden flex flex-col min-h-[500px] text-left">
              <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6 px-8 text-left">
                  <div className="text-left">
                      <h3 className="font-bold text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2 text-left"><BarChart3 size={18} className="text-emerald-500"/> Bảng công tổng hợp tháng {selectedDate.substring(0, 7)}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium text-left">Chỉ bao gồm các bản ghi đã được phê duyệt chính thức.</p>
                  </div>
                  <button 
                    onClick={handleExportSummaryXLSX}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95 text-left"
                  >
                      <FileSpreadsheet size={18}/> Xuất Excel Tổng Hợp
                  </button>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar text-left">
                  <table className="w-full text-left border-collapse table-fixed min-w-[2000px]">
                      <thead className="bg-slate-900 text-white font-bold uppercase text-[8px] tracking-widest sticky top-0 z-20">
                          <tr>
                              <th className="px-6 py-4 w-56 sticky left-0 bg-slate-900 border-r border-white/5 shadow-right">Nhân sự</th>
                              {daysInMonth.map(day => (
                                  <th key={day} className="w-10 text-center border-r border-white/5 py-4">{day}</th>
                              ))}
                              <th className="w-20 text-center bg-indigo-800">Tổng Công</th>
                              <th className="w-16 text-center bg-orange-700">Giờ OT</th>
                              <th className="w-24 text-center bg-emerald-700">Sản Lượng</th>
                              <th className="w-32 text-center bg-rose-800">Khấu trừ KPI</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-[10px] font-bold text-left">
                          {summaryData.map(d => (
                              <tr key={d.user.id} className="hover:bg-slate-50 transition-colors">
                                  <td className="px-6 py-3 sticky left-0 bg-white border-r shadow-right z-10">
                                      <div className="text-left text-left text-left">
                                          <p className="text-slate-800 truncate text-left">{d.user.name}</p>
                                          <p className="text-[8px] text-slate-400 uppercase text-left">{d.user.id}</p>
                                      </div>
                                  </td>
                                  {daysInMonth.map(day => {
                                      const dayStr = `${selectedDate.substring(0, 7)}-${String(day).padStart(2, '0')}`;
                                      const log = d.dailyLogs.find(l => l.date === dayStr);
                                      let code = '--';
                                      let colorClass = 'text-slate-200';
                                      
                                      if (log) {
                                          if (log.status !== RecordStatus.APPROVED) {
                                              code = '?';
                                              colorClass = 'text-amber-400 animate-pulse';
                                          } else {
                                              if (log.type === AttendanceType.TIME) { code = 'X'; colorClass = 'text-indigo-600'; }
                                              else if (log.type === AttendanceType.PIECEWORK) { code = 'K'; colorClass = 'text-emerald-600'; }
                                              else if (log.type === AttendanceType.PAID_LEAVE) { code = 'P'; colorClass = 'text-blue-500'; }
                                              else if (log.type === AttendanceType.HOLIDAY) { code = 'L'; colorClass = 'text-orange-500'; }
                                              else if (log.type === AttendanceType.MODE) { code = 'Ô'; colorClass = 'text-purple-500'; }
                                              else if (log.type === AttendanceType.DAILY) { code = 'N'; colorClass = 'text-teal-500'; }
                                              else if (log.type === AttendanceType.UNPAID) { code = 'KP'; colorClass = 'text-rose-500'; }
                                          }
                                      }

                                      return (
                                          <td key={day} className={`text-center border-r border-slate-50 py-3 ${colorClass} text-xs font-black`}>
                                              {code}
                                          </td>
                                      );
                                  })}
                                  <td className="text-center font-black text-indigo-700 bg-indigo-50/50 text-xs py-3">{d.workDaysCount}</td>
                                  <td className="text-center font-black text-orange-700 bg-orange-50/50 text-xs py-3">{d.totalOT}h</td>
                                  <td className="text-center font-black text-emerald-700 bg-emerald-50/50 text-xs py-3">{d.totalOutput}</td>
                                  <td className="text-center font-black text-rose-700 bg-rose-50/50 text-xs py-3">-{new Intl.NumberFormat('vi-VN').format(d.totalPenaltyMoney)}</td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
              
              <div className="p-4 bg-slate-50 border-t flex flex-wrap gap-6 px-8 text-left">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 text-left"><span className="w-3 h-3 bg-indigo-600 rounded"></span> X: Công thời gian</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 text-left"><span className="w-3 h-3 bg-emerald-600 rounded"></span> K: Công khoán</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 text-left"><span className="w-3 h-3 bg-teal-500 rounded"></span> N: Công nhật</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 text-left"><span className="w-3 h-3 bg-blue-500 rounded"></span> P: Nghỉ phép</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 text-left"><span className="w-3 h-3 bg-orange-500 rounded"></span> L: Nghỉ lễ</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 text-left"><span className="w-3 h-3 bg-purple-500 rounded"></span> Ô: Nghỉ chế độ</div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 text-left"><span className="w-3 h-3 bg-rose-500 rounded"></span> KP: Không lương</div>
              </div>
          </div>
      )}

      {/* TAB 3: KPI & PHẠT */}
      {activeMode === 'EVALUATION' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 animate-fade-in text-left">
            <div className="xl:col-span-1 space-y-6 text-left">
                <form onSubmit={handleSendEval} className="bg-white rounded-[32px] border shadow-xl overflow-hidden text-left sticky top-24">
                    <div className="p-8 bg-slate-900 text-white flex items-center gap-4 text-left">
                        <div className="p-3 bg-orange-500 rounded-2xl shadow-lg text-left"><ListPlus size={28}/></div>
                        <h3 className="font-black uppercase tracking-tight text-xl text-left">Gửi phiếu đánh giá</h3>
                    </div>
                    <div className="p-10 space-y-8 text-left">
                        {/* CHỌN NHÂN VIÊN */}
                        <div className="relative text-left" ref={userDropdownRef}>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1 text-left">Nhân sự thực hiện (Target)</label>
                            <button 
                                type="button"
                                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                                className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-400 transition-all text-left"
                            >
                                <div className="flex items-center gap-4 text-left text-left text-left text-left">
                                    {allUsers.find(u => u.id === evalForm.userId) ? (
                                        <>
                                            <img src={allUsers.find(u => u.id === evalForm.userId)?.avatar} className="w-8 h-8 rounded-full border shadow-sm text-left"/>
                                            <span className="font-black text-slate-800 text-sm uppercase text-left">{allUsers.find(u => u.id === evalForm.userId)?.name}</span>
                                        </>
                                    ) : <span className="text-slate-400 font-bold text-sm text-left text-left text-left">-- Nhấp để chọn nhân sự --</span>}
                                </div>
                                <ChevronDown size={18} className="text-slate-400 group-hover:text-indigo-600 transition-transform text-left"/>
                            </button>

                            {isUserDropdownOpen && (
                                <div className="absolute top-full mt-3 left-0 w-full bg-white rounded-[24px] shadow-2xl border border-slate-100 z-50 p-6 animate-fade-in-up text-left text-left text-left">
                                    <div className="relative mb-4 text-left text-left text-left text-left text-left">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-left text-left text-left text-left" size={16}/>
                                        <input 
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-left" 
                                            placeholder="Tìm tên hoặc ID..."
                                            value={userSearch}
                                            onChange={e => setUserSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1 text-left text-left text-left text-left text-left text-left">
                                        {filteredUsersForSelect.map(u => (
                                            <button 
                                                key={u.id}
                                                type="button"
                                                onClick={() => { setEvalForm({...evalForm, userId: u.id}); setIsUserDropdownOpen(false); }}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 transition-all text-left group"
                                            >
                                                <img src={u.avatar} className="w-8 h-8 rounded-full border text-left"/>
                                                <div className="text-left text-left text-left text-left text-left text-left text-left"><p className="text-[11px] font-black text-slate-700 group-hover:text-indigo-600 uppercase text-left"> {u.name}</p><p className="text-[9px] text-slate-400 font-bold uppercase text-left"> {u.id} • {u.currentPosition}</p></div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* LOẠI MỤC TIÊU */}
                        <div className="text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1 text-left">Hình thức áp dụng</label>
                            <div className="grid grid-cols-2 gap-3 text-left">
                                <button type="button" onClick={() => setEvalForm({...evalForm, target: EvaluationTarget.MONTHLY_SALARY})} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all flex flex-col items-center gap-2 ${evalForm.target === EvaluationTarget.MONTHLY_SALARY ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-indigo-200'}`}><Zap size={18}/> KPI Lương tháng</button>
                                <button type="button" onClick={() => setEvalForm({...evalForm, target: EvaluationTarget.RESERVED_BONUS})} className={`py-4 rounded-2xl font-black text-[10px] uppercase border-2 transition-all flex flex-col items-center gap-2 ${evalForm.target === EvaluationTarget.RESERVED_BONUS ? 'bg-purple-600 text-white border-purple-600 shadow-xl' : 'bg-white text-slate-400 border-slate-100 hover:border-purple-200'}`}><RotateCcw size={18}/> Phạt tiền mặt</button>
                            </div>
                        </div>

                        {/* CHỌN TIÊU CHÍ */}
                        {evalForm.target === EvaluationTarget.MONTHLY_SALARY ? (
                            <div className="relative text-left" ref={criteriaDropdownRef}>
                                <div className="flex justify-between items-center mb-2 ml-1 text-left text-left text-left text-left text-left text-left">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left text-left text-left text-left text-left">Lỗi vi phạm / Thành tích</label>
                                    <button type="button" onClick={() => setIsQuickCriteriaModalOpen(true)} className="text-[10px] font-black text-indigo-600 hover:underline uppercase text-left text-left text-left text-left text-left"> + Tiêu chí mới</button>
                                </div>
                                <button 
                                    type="button"
                                    onClick={() => setIsCriteriaDropdownOpen(!isCriteriaDropdownOpen)}
                                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between group hover:border-indigo-400 transition-all text-left text-left text-left text-left text-left"
                                >
                                    <div className="flex items-center gap-4 text-left text-left text-left text-left text-left text-left">
                                        {criteriaList.find(c => c.id === evalForm.criteriaId) ? (
                                            <>
                                                <span className={`p-1.5 rounded-lg ${criteriaList.find(c => c.id === evalForm.criteriaId)?.type === 'BONUS' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>{criteriaList.find(c => c.id === evalForm.criteriaId)?.type === 'BONUS' ? <ThumbsUp size={16}/> : <ThumbsDown size={16}/>}</span>
                                                <span className="font-black text-slate-800 text-sm uppercase text-left text-left text-left text-left text-left text-left">{criteriaList.find(c => c.id === evalForm.criteriaId)?.name}</span>
                                            </>
                                        ) : <span className="text-slate-400 font-bold text-sm text-left text-left text-left text-left text-left">-- Chọn từ danh mục cấu hình --</span>}
                                    </div>
                                    <ChevronDown size={18} className="text-slate-400 group-hover:text-indigo-600 transition-transform text-left text-left text-left text-left text-left"/>
                                </button>

                                {isCriteriaDropdownOpen && (
                                    <div className="absolute top-full mt-3 left-0 w-full bg-white rounded-[24px] shadow-2xl border border-slate-100 z-50 p-6 animate-fade-in-up text-left text-left text-left text-left text-left text-left">
                                        <div className="relative mb-4 text-left text-left text-left text-left text-left text-left text-left">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-left text-left text-left text-left text-left text-left" size={16}/>
                                            <input 
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 text-left text-left text-left text-left text-left text-left" 
                                                placeholder="Tìm tiêu chí..."
                                                value={criteriaSearch}
                                                onChange={e => setCriteriaSearch(e.target.value)}
                                            />
                                        </div>
                                        <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar pr-1 text-left text-left text-left text-left text-left text-left text-left">
                                            {filteredCriteriaForSelect.map(c => (
                                                <button 
                                                    key={c.id}
                                                    type="button"
                                                    onClick={() => { setEvalForm({...evalForm, criteriaId: c.id}); setIsCriteriaDropdownOpen(false); }}
                                                    className={`w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-all text-left group ${c.type === 'BONUS' ? 'border-l-4 border-emerald-500' : 'border-l-4 border-rose-500'}`}
                                                >
                                                    <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                                                        <p className="text-[11px] font-black text-slate-700 uppercase text-left text-left text-left"> {c.name}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase text-left text-left text-left">Nhóm: {criteriaGroups.find(g => g.id === c.groupId)?.name}</p>
                                                    </div>
                                                    <span className={`text-[10px] font-black ${c.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600'}`}>{c.type === 'BONUS' ? '+' : '-'}{c.value}% HQ</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-1 text-left">Số tiền khấu trừ trực tiếp (VND)</label>
                                <div className="relative text-left">
                                    <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-purple-600 text-left" size={24}/>
                                    <input type="number" className="w-full pl-14 pr-6 py-5 bg-purple-50 border-2 border-purple-100 rounded-[24px] font-black text-purple-700 text-3xl outline-none focus:ring-4 focus:ring-purple-200 transition-all text-left" placeholder="0" value={evalForm.points} onChange={e => setEvalForm({...evalForm, points: Number(e.target.value)})}/>
                                </div>
                                <p className="text-[9px] text-purple-400 italic mt-3 text-left">Phạt từ ngân sách "Thưởng treo" hàng năm của cá nhân.</p>
                            </div>
                        )}

                        <div className="text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1 text-left">Đính kèm minh chứng (Tệp/Ảnh)</label>
                            <div className="relative group text-left">
                                <input 
                                    type="file" 
                                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) setEvalForm({...evalForm, proofFileName: file.name});
                                    }}
                                />
                                <div className="w-full px-6 py-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] flex items-center justify-between group-hover:border-indigo-400 transition-all text-left text-left text-left">
                                    <div className="flex items-center gap-3 text-left text-left text-left text-left">
                                        <Paperclip size={18} className="text-slate-400 text-left"/>
                                        <span className="text-sm font-bold text-slate-500 truncate max-w-[200px] text-left">
                                            {evalForm.proofFileName || 'Chọn tệp tin minh chứng...'}
                                        </span>
                                    </div>
                                    <Upload size={18} className="text-slate-400 text-left"/>
                                </div>
                            </div>
                        </div>

                        <div className="text-left">
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1 text-left text-left">Diễn giải / Chứng cứ nội dung</label>
                            <textarea className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-[24px] text-sm font-bold outline-none focus:border-indigo-500 transition-all text-left" rows={4} placeholder="Nhập chi tiết sự việc, thời gian..." value={evalForm.description} onChange={e => setEvalForm({...evalForm, description: e.target.value})}/>
                        </div>

                        <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3 text-left">
                            <Send size={18}/> Gửi yêu cầu phê duyệt
                        </button>
                    </div>
                </form>
            </div>

            <div className="xl:col-span-2 space-y-6 text-left text-left">
                <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[800px] text-left text-left text-left">
                    <div className="p-8 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6 text-left text-left text-left">
                        <div className="text-left text-left">
                            <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest text-left text-left">Lịch sử đánh giá nhân sự</h3>
                            <div className="flex items-center gap-2 mt-2 text-left text-left text-left">
                                <CalendarIcon size={14} className="text-slate-400 text-left text-left"/>
                                <input type="date" className="bg-transparent text-[11px] font-black text-indigo-600 outline-none uppercase text-left" value={evalStartDate} onChange={e => setEvalStartDate(e.target.value)}/>
                                <ArrowRight size={14} className="text-slate-300 text-left text-left text-left"/>
                                <input type="date" className="bg-transparent text-[11px] font-black text-indigo-600 outline-none uppercase text-left" value={evalEndDate} onChange={e => setEvalEndDate(e.target.value)}/>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar text-left bg-slate-50/20 p-8 text-left text-left text-left text-left">
                        {filteredEvaluationsByDate.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-300 py-40 text-left text-left">
                                <div className="p-10 bg-slate-50 rounded-full mb-6 text-left text-left"><FileText size={64} className="opacity-10 text-left text-left"/></div>
                                <p className="font-black uppercase tracking-widest text-[10px] text-left">Không có dữ liệu đánh giá trong kỳ này</p>
                            </div>
                        ) : (
                            <div className="space-y-6 text-left text-left text-left">
                                {filteredEvaluationsByDate.map(req => {
                                    const isTargetMoney = req.target === EvaluationTarget.RESERVED_BONUS;
                                    const canApprove = canApproveThisEval(req);

                                    return (
                                        <div key={req.id} className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-xl hover:border-indigo-200 group text-left">
                                            <div className={`w-2 shrink-0 ${req.type === 'BONUS' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                                            <div className="flex-1 p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-left text-left text-left">
                                                <div className="flex items-start gap-6 text-left text-left text-left">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border-2 border-white transition-transform group-hover:scale-110 text-left text-left ${req.type === 'BONUS' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                        {req.type === 'BONUS' ? <ThumbsUp size={28}/> : <ThumbsDown size={28}/>}
                                                    </div>
                                                    <div className="text-left text-left">
                                                        <div className="flex items-center gap-3 text-left text-left text-left">
                                                            <p className="font-black text-slate-900 text-lg uppercase tracking-tight text-left text-left">{req.userName}</p>
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border shadow-sm text-left text-left ${getStatusColor(req.status)}`}>
                                                                {req.status.replace('PENDING_', 'CHỜ ')}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-4 mt-2 text-left text-left text-left">
                                                            <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase text-left text-left">{req.criteriaName}</span>
                                                            <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1 text-left text-left"><Clock size={12}/> {formatDateTime(req.createdAt)}</span>
                                                        </div>
                                                        <p className="text-sm text-slate-500 italic mt-4 font-medium leading-relaxed max-w-lg text-left text-left">"{req.description || 'Không có ghi chú diễn giải.'}"</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-end gap-5 shrink-0 text-right text-right">
                                                    <div className="text-right text-right">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-right text-right">Giá trị điều chỉnh</p>
                                                        <p className={`text-3xl font-black tabular-nums tracking-tighter text-right text-right ${req.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                            {req.type === 'BONUS' ? '+' : '-'}{isTargetMoney ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.points) : `${Math.abs(req.points)}% HQ`}
                                                        </p>
                                                    </div>

                                                    {canApprove && req.status !== RecordStatus.APPROVED && req.status !== RecordStatus.REJECTED && (
                                                        <div className="flex gap-2 text-left text-left text-left">
                                                            <button onClick={() => approveEvaluationRequest(req.id)} className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all text-left text-left text-left">
                                                                <CheckCircle size={14}/> Phê duyệt
                                                            </button>
                                                            <button onClick={() => setRejectionModal({ isOpen: true, id: req.id })} className="px-5 py-2.5 bg-white text-rose-600 border-2 border-rose-100 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-50 active:scale-95 transition-all text-left text-left text-left">
                                                                <XCircle size={14}/> Từ chối
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}
      
      {/* QUICK CRITERIA MODAL */}
      {isQuickCriteriaModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left text-left">
              <form onSubmit={handleQuickAddCriteria} className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden text-left text-left">
                  <div className="p-6 bg-indigo-600 text-white flex justify-between items-center text-left text-left">
                      <h3 className="font-black uppercase tracking-tight text-left text-left">Thêm tiêu chí đánh giá nhanh</h3>
                      <button type="button" onClick={() => setIsQuickCriteriaModalOpen(false)}><X size={24}/></button>
                  </div>
                  <div className="p-8 space-y-4 text-left text-left">
                    <div className="text-left text-left">
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left">Nhóm</label>
                        <select name="groupId" className="w-full px-4 py-2.5 border rounded-xl font-bold text-left text-left">
                            {criteriaGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div className="text-left text-left text-left">
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left">Tên tiêu chí</label>
                        <input name="name" required placeholder="VD: Sáng kiến tháng..." className="w-full px-4 py-2.5 border rounded-xl font-bold text-left text-left"/>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left text-left text-left">
                        <div className="text-left text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left">Loại</label>
                            <select name="type" className="w-full px-4 py-2.5 border rounded-xl font-bold text-left text-left text-left">
                                <option value="BONUS">Thưởng (+)</option>
                                <option value="PENALTY">Phạt (-)</option>
                            </select>
                        </div>
                        <div className="text-left text-left text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left">Giá trị (% HQ)</label>
                            <input name="value" type="number" step="0.1" required className="w-full px-4 py-2.5 border rounded-xl font-black text-indigo-600 text-left text-left text-left"/>
                        </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 text-left text-left">
                      <button type="button" onClick={() => setIsQuickCriteriaModalOpen(false)} className="px-6 py-2 bg-white border rounded-xl font-bold text-slate-500 text-left text-left">Hủy</button>
                      <button type="submit" className="px-10 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg text-left text-left">Lưu & Chọn</button>
                  </div>
              </form>
          </div>
      )}

      {/* REJECTION MODAL */}
      {rejectionModal.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left text-left">
              <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-fade-in-up p-8 text-left text-left">
                  <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 text-left text-left">
                      <ShieldAlert size={24} className="text-rose-600 text-left text-left"/> Xác nhận từ chối
                  </h3>
                  <textarea 
                    className="w-full p-4 border-2 border-slate-100 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 text-sm font-bold text-left" 
                    placeholder="Vui lòng nhập lý do từ chối..."
                    rows={4}
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e.target.value)}
                  />
                  <div className="flex gap-3 justify-end text-left text-left">
                      <button onClick={() => setRejectionModal({ isOpen: false, id: '' })} className="px-6 py-3 font-bold text-slate-500 text-left text-left">Hủy</button>
                      <button onClick={handleRejectEval} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-lg text-left text-left">Từ chối</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
export default Timekeeping;
