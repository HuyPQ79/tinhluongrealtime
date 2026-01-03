
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    UserCheck, AlertCircle, Save, Plus, CheckCircle, XCircle, Undo2, 
    Trash2, Clock, Building2, Search, Calendar as CalendarIcon, Target, Check, Info, ChevronRight, Briefcase, Layers, ThumbsUp, ThumbsDown, FileText, Paperclip, Upload, X, Calculator, DollarSign, Wallet, Eye, UserPlus, ListPlus, ChevronDown, User as UserIcon,
    Banknote, BarChart3, FileSpreadsheet, ChevronLeft, CalendarDays, Zap, ShieldAlert, Send, ArrowRight, Loader2, RotateCcw, ShieldCheck, FileCheck, Printer,
    Timer, Package, Sun, Calendar, Coffee, Ban, Pause, HelpCircle
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

const ATTENDANCE_ICONS: Record<string, any> = {
  [AttendanceType.TIME]: Timer,
  [AttendanceType.PIECEWORK]: Package,
  [AttendanceType.DAILY]: Sun,
  [AttendanceType.MODE]: Calendar,
  [AttendanceType.HOLIDAY]: Coffee,
  [AttendanceType.PAID_LEAVE]: CheckCircle,
  [AttendanceType.UNPAID]: Ban,
  [AttendanceType.WAITING]: Pause
};

const ATTENDANCE_COLORS: Record<string, string> = {
  [AttendanceType.TIME]: 'text-indigo-600 bg-indigo-50 border-indigo-200',
  [AttendanceType.PIECEWORK]: 'text-emerald-600 bg-emerald-50 border-emerald-200',
  [AttendanceType.DAILY]: 'text-blue-600 bg-blue-50 border-blue-200',
  [AttendanceType.MODE]: 'text-purple-600 bg-purple-50 border-purple-200',
  [AttendanceType.HOLIDAY]: 'text-amber-600 bg-amber-50 border-amber-200',
  [AttendanceType.PAID_LEAVE]: 'text-green-600 bg-green-50 border-green-200',
  [AttendanceType.UNPAID]: 'text-rose-600 bg-rose-50 border-rose-200',
  [AttendanceType.WAITING]: 'text-slate-600 bg-slate-50 border-slate-200'
};

const Timekeeping: React.FC = () => {
  const { 
    allUsers, departments, criteriaList, criteriaGroups, dailyWorkCatalog, 
    dailyAttendance, saveAttendance, updateAttendanceStatus, addEvaluationRequest, evaluationRequests, 
    approveEvaluationRequest, rejectEvaluationRequest, currentUser, canViewUser, formatDateTime,
    addCriterion, getStandardWorkDays, systemConfig, salaryRecords, addNotification, showToast,
    systemRoles, approvalWorkflows
  } = useAppContext();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeMode, setActiveMode] = useState<'ATTENDANCE' | 'EVALUATION' | 'SUMMARY'>('ATTENDANCE');

  // Handle Deep Links from Notifications
  useEffect(() => {
    const tab = searchParams.get('tab');
    const dateParam = searchParams.get('date');
    const deptParam = searchParams.get('deptId');
    const evalIdParam = searchParams.get('evalId');

    // Set active mode based on tab parameter
    if (tab === 'EVALUATION') {
      setActiveMode('EVALUATION');
    } else if (tab === 'SUMMARY') {
      setActiveMode('SUMMARY');
    } else if (tab === 'ATTENDANCE' || !tab) {
      setActiveMode('ATTENDANCE');
    }

    // Set date if provided (always set if param exists, let React handle deduplication)
    if (dateParam) {
      setSelectedDate(dateParam);
    }

    // Set department if provided and valid
    if (deptParam) {
      // Validate deptId exists in availableDepts
      const isValidDept = availableDepts.some(d => d.id === deptParam) || deptParam === 'ALL';
      if (isValidDept) {
        setSelectedDeptId(deptParam);
      }
    }
    
    // Scroll đến evaluation request cụ thể nếu có evalId
    if (evalIdParam && tab === 'EVALUATION') {
      // Wait for evaluations to load and render
      setTimeout(() => {
        const element = document.getElementById(`eval-${evalIdParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2');
          }, 3000);
        } else {
          // Retry after a longer delay if element not found (evaluations might still be loading)
          setTimeout(() => {
            const retryElement = document.getElementById(`eval-${evalIdParam}`);
            if (retryElement) {
              retryElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              retryElement.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2');
              setTimeout(() => {
                retryElement.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2');
              }, 3000);
            }
          }, 1500);
        }
      }, 500);
    }
  }, [searchParams, availableDepts]); // Depend on searchParams and availableDepts

  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isCriteriaDropdownOpen, setIsCriteriaDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const criteriaDropdownRef = useRef<HTMLDivElement>(null);
  const handleSaveAllAttendanceRef = useRef<() => Promise<void>>();

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
    return canApproveStatus(currentUser, req.status, dept, systemConfig.approvalWorkflow, departments, systemRoles, 'EVALUATION', approvalWorkflows);
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

  // Kiểm tra xem bản ghi APPROVED có thể hậu kiểm không (trong vòng maxHoursForHRReview giờ)
  const canReviewApprovedRecord = (record: AttendanceRecord): boolean => {
    if (record.status !== RecordStatus.APPROVED) return false;
    if (!systemConfig.maxHoursForHRReview) return false;
    
    // Lấy thời gian updated (khi approved)
    const updatedAt = record.updatedAt ? new Date(record.updatedAt).getTime() : null;
    if (!updatedAt) return false;
    
    const maxHours = systemConfig.maxHoursForHRReview;
    const deadline = updatedAt + (maxHours * 60 * 60 * 1000);
    const now = Date.now();
    
    return now <= deadline;
  };

  // Tính countdown cho hậu kiểm bản ghi APPROVED
  const getPostAuditCountdown = (record: AttendanceRecord): string | null => {
    if (record.status !== RecordStatus.APPROVED || !systemConfig.maxHoursForHRReview) return null;
    
    const updatedAt = record.updatedAt ? new Date(record.updatedAt).getTime() : null;
    if (!updatedAt) return null;
    
    const maxHours = systemConfig.maxHoursForHRReview;
    const deadline = updatedAt + (maxHours * 60 * 60 * 1000);
    const diff = deadline - now;
    
    if (diff <= 0) return 'Hết thời gian hậu kiểm';
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${h}h ${m}p`;
  };

  const getStatusBadge = (record: AttendanceRecord) => {
    if (!record?.status) return null;
    const color = getStatusColor(record.status);
    const countdown = record.status === RecordStatus.PENDING_HR ? getHRCountdown(record) : 
                      record.status === RecordStatus.APPROVED ? getPostAuditCountdown(record) : null;
    
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
            // Ưu tiên lấy phòng ban hiện tại của user trước
            const currentDept = currentUser.currentDeptId ? departments.find(d => d.id === currentUser.currentDeptId) : null;
            const sideDept = currentUser.sideDeptId ? departments.find(d => d.id === currentUser.sideDeptId) : null;
            
            // Kiểm tra xem user có phải là manager/hr/gdk của phòng ban hiện tại không
            const isManagerOfCurrentDept = currentDept && currentDept.managerId === currentUser.id;
            const isHROfCurrentDept = currentDept && currentDept.hrId === currentUser.id;
            const isGDKOfCurrentDept = currentDept && currentDept.blockDirectorId === currentUser.id;
            const isManagerOfSideDept = sideDept && sideDept.managerId === currentUser.id;
            const isHROfSideDept = sideDept && sideDept.hrId === currentUser.id;
            const isGDKOfSideDept = sideDept && sideDept.blockDirectorId === currentUser.id;
            
            // Nếu user là manager/hr/gdk của phòng ban hiện tại, chỉ lấy phòng ban đó
            if (isManagerOfCurrentDept || isHROfCurrentDept || isGDKOfCurrentDept) {
                baseDepts = currentDept ? [currentDept] : [];
                if (sideDept && (isManagerOfSideDept || isHROfSideDept || isGDKOfSideDept)) {
                    baseDepts.push(sideDept);
                }
            } else if (isManagerOfSideDept || isHROfSideDept || isGDKOfSideDept) {
                baseDepts = sideDept ? [sideDept] : [];
            } else {
                // Fallback: lấy phòng ban hiện tại của user (không cần là manager)
                baseDepts = departments.filter(d => d.id === currentUser.currentDeptId || d.id === currentUser.sideDeptId);
            }
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
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkEditMode, setBulkEditMode] = useState<boolean>(false);

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
    // Filter theo search text
    let filtered = criteriaList.filter(c => c.name.toLowerCase().includes(criteriaSearch.toLowerCase()));
    
    // Filter theo department của user được chọn (nếu có)
    if (evalForm.userId) {
      const user = allUsers.find(u => u.id === evalForm.userId);
      const userDeptId = user?.currentDeptId;
      
      if (userDeptId) {
        // Chỉ hiển thị criteria không có departmentId (áp dụng cho tất cả) hoặc có departmentId trùng với phòng ban của user
        filtered = filtered.filter(c => !c.departmentId || c.departmentId === userDeptId);
      }
    }
    
    return filtered;
  }, [criteriaList, criteriaSearch, evalForm.userId, allUsers]);

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

  // Validation function
  const validateAttendanceRecord = (userId: string, buffer: Partial<AttendanceRecord>): string | null => {
    const hours = buffer.hours || 0;
    const overtimeHours = buffer.overtimeHours || 0;
    
    if (!buffer.type) {
      return 'Vui lòng chọn loại công';
    }
    if (!hours || hours <= 0) {
      return 'Giờ công phải lớn hơn 0';
    }
    if (hours > 24) {
      return 'Giờ công không được vượt quá 24h';
    }
    if (overtimeHours > hours && hours > 0) {
      return 'Giờ tăng ca không được vượt quá giờ chính';
    }
    if (buffer.type === AttendanceType.PIECEWORK && (buffer.output === undefined || buffer.output === null || buffer.output < 0)) {
      return 'Vui lòng nhập sản lượng cho công khoán';
    }
    if (buffer.type === AttendanceType.DAILY && !buffer.dailyWorkItemId) {
      return 'Vui lòng chọn việc nhật';
    }
    return null;
  };

  // Update validation errors when buffer changes
  useEffect(() => {
    const errors: Record<string, string> = {};
    Object.entries(attendanceBuffer).forEach(([userId, buffer]) => {
      if (buffer.status === RecordStatus.DRAFT || !buffer.status) {
        const error = validateAttendanceRecord(userId, buffer);
        if (error) {
          errors[userId] = error;
        }
      }
    });
    setValidationErrors(errors);
  }, [attendanceBuffer]);

  // Keyboard shortcuts will be set up after handleSaveAllAttendance is defined

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
        
        if (canApproveStatus(currentUser, r.status, dept, systemConfig.approvalWorkflow, departments, systemRoles, 'ATTENDANCE', approvalWorkflows)) {
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
    
    // Check validation before saving
    const errors: Record<string, string> = {};
    Object.entries(attendanceBuffer).forEach(([userId, buffer]) => {
      if (buffer.status === RecordStatus.DRAFT || !buffer.status) {
        const error = validateAttendanceRecord(userId, buffer);
        if (error) {
          errors[userId] = error;
        }
      }
    });
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      showToast(`Có ${Object.keys(errors).length} lỗi cần sửa trước khi lưu`, 'error');
      return;
    }
    
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
    setValidationErrors({});
  };

  // Update ref when handleSaveAllAttendance changes
  useEffect(() => {
    handleSaveAllAttendanceRef.current = handleSaveAllAttendance;
  }, [handleSaveAllAttendance]);

  // Keyboard shortcuts: Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (!isOnlyEmployee && !actionProcessing && handleSaveAllAttendanceRef.current) {
          handleSaveAllAttendanceRef.current();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOnlyEmployee, actionProcessing]);

  // Bulk edit functions
  const handleBulkFill = (field: 'hours' | 'overtimeHours' | 'type' | 'output' | 'dailyWorkItemId', value: any) => {
    if (selectedUserIds.size === 0) {
      showToast('Vui lòng chọn ít nhất một nhân viên', 'ERROR');
      return;
    }
    
    const newBuffer = { ...attendanceBuffer };
    selectedUserIds.forEach(userId => {
      const currentBuffer = newBuffer[userId] || {};
      newBuffer[userId] = {
        ...currentBuffer,
        [field]: value,
        status: currentBuffer.status || RecordStatus.DRAFT
      };
    });
    setAttendanceBuffer(newBuffer);
    showToast(`Đã áp dụng cho ${selectedUserIds.size} nhân viên`, 'SUCCESS');
  };

  const handleBulkFillDown = (field: 'hours' | 'overtimeHours' | 'type' | 'output' | 'dailyWorkItemId', sourceUserId: string) => {
    const sourceBuffer = attendanceBuffer[sourceUserId];
    if (!sourceBuffer) return;
    
    const value = sourceBuffer[field as keyof typeof sourceBuffer];
    if (value === undefined || value === null) {
      showToast('Giá trị nguồn không hợp lệ', 'ERROR');
      return;
    }
    
    const newBuffer = { ...attendanceBuffer };
    const sortedUserIds = currentDeptUsers.map(u => u.id);
    const sourceIndex = sortedUserIds.indexOf(sourceUserId);
    
    if (sourceIndex === -1 || sourceIndex === sortedUserIds.length - 1) {
      showToast('Không thể fill down từ dòng cuối', 'ERROR');
      return;
    }
    
    let fillCount = 0;
    for (let i = sourceIndex + 1; i < sortedUserIds.length; i++) {
      const targetUserId = sortedUserIds[i];
      const currentBuffer = newBuffer[targetUserId] || {};
      newBuffer[targetUserId] = {
        ...currentBuffer,
        [field]: value,
        status: currentBuffer.status || RecordStatus.DRAFT
      };
      fillCount++;
    }
    
    setAttendanceBuffer(newBuffer);
    showToast(`Đã fill down cho ${fillCount} nhân viên`, 'SUCCESS');
  };

  // Copy/paste from Excel
  const handlePasteFromExcel = async (e: React.ClipboardEvent) => {
    if (isOnlyEmployee) return;
    
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    const lines = pastedData.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      showToast('Không có dữ liệu để paste', 'ERROR');
      return;
    }
    
    // Parse tab-separated or space-separated data
    const rows = lines.map(line => {
      // Try tab first, then space
      const cells = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
      return cells.map(cell => cell.trim()).filter(cell => cell);
    });
    
    // Expected format: [Type, Hours, Overtime, Output/DailyWorkItem, ...]
    // Or: [Hours, Overtime, ...]
    const newBuffer = { ...attendanceBuffer };
    let successCount = 0;
    let errorCount = 0;
    
    currentDeptUsers.forEach((user, index) => {
      if (index >= rows.length) return;
      
      const row = rows[index];
      if (row.length === 0) return;
      
      const currentBuffer = newBuffer[user.id] || {
        userId: user.id,
        date: selectedDate,
        status: RecordStatus.DRAFT
      };
      
      try {
        // Try to parse: [Type, Hours, Overtime, Output/DailyWorkItem]
        if (row.length >= 3) {
          // Check if first cell is a type
          const possibleType = row[0].toUpperCase();
          const attendanceTypes = Object.values(AttendanceType);
          if (attendanceTypes.includes(possibleType as AttendanceType)) {
            currentBuffer.type = possibleType as AttendanceType;
            currentBuffer.hours = parseFloat(row[1]) || currentBuffer.hours || 8;
            currentBuffer.overtimeHours = parseFloat(row[2]) || currentBuffer.overtimeHours || 0;
            
            if (row.length >= 4) {
              if (currentBuffer.type === AttendanceType.PIECEWORK) {
                currentBuffer.output = parseFloat(row[3]) || currentBuffer.output;
              } else if (currentBuffer.type === AttendanceType.DAILY) {
                currentBuffer.dailyWorkItemId = row[3] || currentBuffer.dailyWorkItemId;
              }
            }
          } else {
            // Assume format: [Hours, Overtime, ...]
            currentBuffer.hours = parseFloat(row[0]) || currentBuffer.hours || 8;
            currentBuffer.overtimeHours = parseFloat(row[1]) || currentBuffer.overtimeHours || 0;
          }
        } else if (row.length === 2) {
          // Format: [Hours, Overtime]
          currentBuffer.hours = parseFloat(row[0]) || currentBuffer.hours || 8;
          currentBuffer.overtimeHours = parseFloat(row[1]) || currentBuffer.overtimeHours || 0;
        } else if (row.length === 1) {
          // Format: [Hours]
          currentBuffer.hours = parseFloat(row[0]) || currentBuffer.hours || 8;
        }
        
        newBuffer[user.id] = currentBuffer;
        successCount++;
      } catch (error) {
        errorCount++;
      }
    });
    
    setAttendanceBuffer(newBuffer);
    if (successCount > 0) {
      showToast(`Đã paste ${successCount} dòng${errorCount > 0 ? `, ${errorCount} lỗi` : ''}`, successCount > errorCount ? 'SUCCESS' : 'WARNING');
    } else {
      showToast('Không thể paste dữ liệu', 'ERROR');
    }
  };

  const toggleUserSelection = (userId: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) {
      newSet.delete(userId);
    } else {
      newSet.add(userId);
    }
    setSelectedUserIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === currentDeptUsers.length) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(currentDeptUsers.map(u => u.id)));
    }
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
        const hasPermission = canApproveStatus(currentUser!, record.status, dept, systemConfig.approvalWorkflow, departments, systemRoles, 'ATTENDANCE', approvalWorkflows);

        if (action === 'SUBMIT' && record.status === RecordStatus.DRAFT) {
            const nextStatus = getNextPendingStatus(user!, systemConfig.approvalWorkflow, RecordStatus.DRAFT, systemRoles, 'ATTENDANCE', approvalWorkflows);
            record.status = nextStatus;
            if (nextStatus === RecordStatus.PENDING_HR) record.sentToHrAt = new Date().toISOString();
            recordsToUpdate.push(record);
        } else if (action === 'APPROVE' && hasPermission) {
            const nextStatus = getNextPendingStatus(user!, systemConfig.approvalWorkflow, record.status, systemRoles, 'ATTENDANCE', approvalWorkflows);
            record.status = nextStatus;
            if (nextStatus === RecordStatus.PENDING_HR) record.sentToHrAt = new Date().toISOString();
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
        
        // Tạo notification cho các trường hợp
        if (action === 'SUBMIT') {
            const dept = departments.find(d => d.id === selectedDeptId);
            if (dept?.managerId) {
                const manager = allUsers.find(u => u.id === dept.managerId);
                if (manager) {
                    addNotification({
                        title: 'Duyệt công ngày mới',
                        content: `Kế toán vừa gửi dữ liệu công ngày ${selectedDate} của ${dept.name} chờ bạn phê duyệt.`,
                        type: 'WARNING',
                        actionUrl: `/timekeeping?tab=ATTENDANCE&date=${selectedDate}&deptId=${selectedDeptId}`
                    });
                }
            }
        } else if (action === 'APPROVE') {
            // Tìm các record đã được approve và chuyển sang bước tiếp theo
            const approvedRecords = recordsToUpdate.filter(r => {
                const user = allUsers.find(u => u.id === r.userId);
                if (!user) return false;
                const dept = departments.find(d => d.id === user.currentDeptId || d.id === user.sideDeptId);
                const nextStatus = getNextPendingStatus(user, systemConfig.approvalWorkflow, r.status, systemRoles, 'ATTENDANCE', approvalWorkflows);
                return nextStatus !== RecordStatus.APPROVED && nextStatus !== RecordStatus.DRAFT;
            });
            
            // Tạo notification cho người có quyền phê duyệt bước tiếp theo
            approvedRecords.forEach(record => {
                const user = allUsers.find(u => u.id === record.userId);
                if (!user) return;
                const dept = departments.find(d => d.id === user.currentDeptId || d.id === user.sideDeptId);
                const nextStatus = getNextPendingStatus(user, systemConfig.approvalWorkflow, record.status, systemRoles, 'ATTENDANCE', approvalWorkflows);
                
                let approverUsers: User[] = [];
                if (nextStatus === RecordStatus.PENDING_MANAGER && dept?.managerId) {
                    const manager = allUsers.find(u => u.id === dept.managerId);
                    if (manager) approverUsers.push(manager);
                } else if (nextStatus === RecordStatus.PENDING_GDK) {
                    approverUsers = allUsers.filter(u => u.roles.includes(UserRole.GIAM_DOC_KHOI) && departments.some(d => d.blockDirectorId === u.id && (d.id === user.currentDeptId || d.id === user.sideDeptId)));
                } else if (nextStatus === RecordStatus.PENDING_BLD) {
                    approverUsers = allUsers.filter(u => u.roles.includes(UserRole.BAN_LANH_DAO));
                } else if (nextStatus === RecordStatus.PENDING_HR) {
                    if (dept?.hrId) {
                        const hr = allUsers.find(u => u.id === dept.hrId);
                        if (hr) approverUsers.push(hr);
                    }
                }
                
                approverUsers.forEach(approver => {
                    addNotification({
                        title: 'Công cần duyệt tiếp',
                        content: `Công ngày ${record.date} của ${user.name} đã được phê duyệt bước trước, chờ bạn phê duyệt tiếp.`,
                        type: 'WARNING',
                        actionUrl: `/timekeeping?tab=ATTENDANCE&date=${record.date}&deptId=${dept?.id || selectedDeptId}`
                    });
                });
            });
        } else if (action === 'REJECT') {
            // Tạo notification cho người tạo record khi bị reject
            const rejectedRecords = recordsToUpdate.filter(r => r.status === RecordStatus.DRAFT && r.rejectionReason);
            rejectedRecords.forEach(record => {
                const user = allUsers.find(u => u.id === record.userId);
                if (!user) return;
                const dept = departments.find(d => d.id === user.currentDeptId || d.id === user.sideDeptId);
                
                // Tìm người tạo (thường là kế toán lương)
                const creator = allUsers.find(u => u.roles.includes(UserRole.KE_TOAN_LUONG) && (u.assignedDeptIds?.includes(dept?.id || '') || u.currentDeptId === dept?.id));
                if (creator) {
                    addNotification({
                        title: 'Công bị từ chối',
                        content: `Công ngày ${record.date} của ${user.name} đã bị từ chối. Vui lòng kiểm tra và điều chỉnh lại.`,
                        type: 'DANGER',
                        actionUrl: `/timekeeping?tab=ATTENDANCE&date=${record.date}&deptId=${dept?.id || selectedDeptId}`
                    });
                }
            });
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
          updated.status = getNextPendingStatus(user!, systemConfig.approvalWorkflow, updated.status, systemRoles, 'ATTENDANCE', approvalWorkflows);
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
            status: getNextPendingStatus(user!, systemConfig.approvalWorkflow, RecordStatus.DRAFT, systemRoles, 'EVALUATION', approvalWorkflows),
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
          status: getNextPendingStatus(user!, systemConfig.approvalWorkflow, RecordStatus.DRAFT, systemRoles, 'EVALUATION', approvalWorkflows),
          createdAt: new Date().toISOString()
        };
    }
    addEvaluationRequest(newReq);
    
    // Tạo notification cho người có quyền phê duyệt
    if (newReq.status !== RecordStatus.APPROVED && newReq.status !== RecordStatus.DRAFT) {
        const user = allUsers.find(u => u.id === newReq.userId);
        const dept = departments.find(d => d.id === user?.currentDeptId || d.id === user?.sideDeptId);
        
        // Tìm người có quyền phê duyệt dựa trên status
        let approverUsers: User[] = [];
        if (newReq.status === RecordStatus.PENDING_MANAGER) {
            if (dept?.managerId) {
                const manager = allUsers.find(u => u.id === dept.managerId);
                if (manager) approverUsers.push(manager);
            }
        } else if (newReq.status === RecordStatus.PENDING_GDK) {
            approverUsers = allUsers.filter(u => u.roles.includes(UserRole.GIAM_DOC_KHOI) && departments.some(d => d.blockDirectorId === u.id && (d.id === user?.currentDeptId || d.id === user?.sideDeptId)));
        } else if (newReq.status === RecordStatus.PENDING_BLD) {
            approverUsers = allUsers.filter(u => u.roles.includes(UserRole.BAN_LANH_DAO));
        } else if (newReq.status === RecordStatus.PENDING_HR) {
            if (dept?.hrId) {
                const hr = allUsers.find(u => u.id === dept.hrId);
                if (hr) approverUsers.push(hr);
            }
        }
        
        approverUsers.forEach(approver => {
            addNotification({
                title: 'Yêu cầu đánh giá cần duyệt',
                content: `${currentUser?.name} đã gửi yêu cầu đánh giá "${newReq.criteriaName}" cho ${newReq.userName} chờ bạn phê duyệt.`,
                type: 'WARNING',
                actionUrl: `/timekeeping?tab=EVALUATION&evalId=${newReq.id}`
            });
        });
    }
    
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
                  <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest mt-1">Dữ liệu nội bộ</p>
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
                <button onClick={() => { setActiveMode('ATTENDANCE'); setSearchParams({tab:'ATTENDANCE'}); }} className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-[10px] uppercase transition-all active:scale-95 touch-manipulation ${activeMode === 'ATTENDANCE' ? 'bg-white text-indigo-600 shadow' : 'text-slate-400 active:bg-slate-100'}`}>Bảng Công</button>
                <button onClick={() => { setActiveMode('SUMMARY'); setSearchParams({tab:'SUMMARY'}); }} className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-[10px] uppercase transition-all active:scale-95 touch-manipulation ${activeMode === 'SUMMARY' ? 'bg-white text-emerald-600 shadow' : 'text-slate-400 active:bg-slate-100'}`}>Tổng Hợp</button>
                <button onClick={() => { setActiveMode('EVALUATION'); setSearchParams({tab:'EVALUATION'}); }} className={`px-6 py-3 rounded-xl font-bold text-xs sm:text-[10px] uppercase transition-all active:scale-95 touch-manipulation ${activeMode === 'EVALUATION' ? 'bg-white text-orange-600 shadow' : 'text-slate-400 active:bg-slate-100'}`}>KPI & Phạt</button>
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
                    
                    {!isOnlyEmployee && (
                      <div className="flex gap-2 items-center flex-wrap">
                        <button
                          onClick={() => {
                            setBulkEditMode(!bulkEditMode);
                            if (bulkEditMode) setSelectedUserIds(new Set());
                          }}
                          className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase flex items-center gap-1.5 transition-all ${bulkEditMode ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                          title="Bulk edit mode"
                        >
                          <ListPlus size={12}/>
                          {bulkEditMode ? 'Tắt Bulk' : 'Bulk Edit'}
                        </button>
                        {bulkEditMode && selectedUserIds.size > 0 && (
                          <>
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black">
                              {selectedUserIds.size} đã chọn
                            </span>
                            <div className="flex gap-1 items-center">
                              <button
                                onClick={() => {
                                  const firstSelected = Array.from(selectedUserIds)[0];
                                  if (firstSelected) {
                                    const buffer = attendanceBuffer[firstSelected];
                                    if (buffer?.hours) handleBulkFill('hours', buffer.hours);
                                  }
                                }}
                                className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-[9px] font-bold hover:bg-emerald-200"
                                title="Fill giờ chính từ dòng đầu tiên"
                              >
                                Fill Giờ
                              </button>
                              <button
                                onClick={() => {
                                  const firstSelected = Array.from(selectedUserIds)[0];
                                  if (firstSelected) {
                                    handleBulkFillDown('hours', firstSelected);
                                  }
                                }}
                                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[9px] font-bold hover:bg-blue-200"
                                title="Fill down giờ chính"
                              >
                                Fill ↓
                              </button>
                            </div>
                          </>
                        )}
                        <span className="text-[9px] text-slate-500 italic">Ctrl+V để paste từ Excel</span>
                      </div>
                    )}
                    
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
                        data-save-attendance
                        onClick={handleSaveAllAttendance} 
                        disabled={!!actionProcessing}
                        className={`px-8 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all active:scale-95 ${lastActionStatus?.id === 'SAVE' ? 'bg-emerald-600 scale-105' : 'bg-indigo-600 hover:bg-indigo-700 text-white'} ${Object.keys(validationErrors).length > 0 ? 'ring-2 ring-rose-500' : ''}`}
                        title={Object.keys(validationErrors).length > 0 ? `Có ${Object.keys(validationErrors).length} lỗi cần sửa` : 'Lưu nháp (Ctrl+S)'}
                    >
                        {actionProcessing === 'SAVE' ? <Loader2 size={16} className="animate-spin"/> : <Save size={16}/>} 
                        {lastActionStatus?.id === 'SAVE' ? 'ĐÃ LƯU NHÁP' : 'LƯU NHÁP BẢNG CÔNG'}
                        {Object.keys(validationErrors).length > 0 && (
                            <span className="ml-1 px-2 py-0.5 bg-rose-500 text-white text-[9px] rounded-full font-black animate-pulse">
                                {Object.keys(validationErrors).length}
                            </span>
                        )}
                    </button>
                  )}
              </div>
              <div 
                className="overflow-x-auto custom-scrollbar text-left"
                onPaste={handlePasteFromExcel}
                title="Paste dữ liệu từ Excel (Ctrl+V)"
              >
                  <table className="w-full text-left text-xs table-fixed min-w-[1600px]">
                      <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] border-b sticky top-0 z-10">
                          <tr className="text-center">
                              {!isOnlyEmployee && bulkEditMode && (
                                <th className="px-3 py-5 w-12">
                                  <input
                                    type="checkbox"
                                    checked={selectedUserIds.size === currentDeptUsers.length && currentDeptUsers.length > 0}
                                    onChange={toggleSelectAll}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    title="Chọn tất cả"
                                  />
                                </th>
                              )}
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
                              const hasPermission = canApproveStatus(currentUser!, buffer.status || RecordStatus.DRAFT, dept, systemConfig.approvalWorkflow, departments, systemRoles, 'ATTENDANCE', approvalWorkflows);

                              const status = buffer.status || RecordStatus.DRAFT;
                              const statusColor = getStatusColor(status);
                              const rowBgColor = status === RecordStatus.APPROVED ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 
                                                 status === RecordStatus.REJECTED ? 'bg-rose-50/30 hover:bg-rose-50/50' :
                                                 status !== RecordStatus.DRAFT ? 'bg-blue-50/20 hover:bg-blue-50/40' : 
                                                 'hover:bg-slate-50/80';
                              const TypeIcon = buffer.type ? ATTENDANCE_ICONS[buffer.type] : Timer;
                              const typeColor = buffer.type ? ATTENDANCE_COLORS[buffer.type] : 'text-slate-600 bg-slate-50 border-slate-200';
                              const hasError = validationErrors[u.id];
                              const fieldId = `att-${u.id}`;

                              return (
                                  <tr key={u.id} className={`${rowBgColor} text-center transition-colors border-l-4 ${hasError ? 'border-l-rose-500' : status === RecordStatus.APPROVED ? 'border-l-emerald-500' : status === RecordStatus.REJECTED ? 'border-l-rose-500' : status !== RecordStatus.DRAFT ? 'border-l-blue-500' : 'border-l-transparent'} ${selectedUserIds.has(u.id) && bulkEditMode ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : ''}`}>
                                      {!isOnlyEmployee && bulkEditMode && (
                                        <td className="px-3 py-4">
                                          <input
                                            type="checkbox"
                                            checked={selectedUserIds.has(u.id)}
                                            onChange={() => toggleUserSelection(u.id)}
                                            className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            title="Chọn nhân viên này"
                                          />
                                        </td>
                                      )}
                                      <td className="px-6 py-4 text-left border-r bg-slate-50/30">
                                          <div className="flex items-center gap-3">
                                              <div className="relative">
                                                  <img src={u.avatar} className="w-10 h-10 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-100"/>
                                                  {status === RecordStatus.APPROVED && (
                                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                                                          <Check size={10} className="text-white"/>
                                                      </div>
                                                  )}
                                                  {status === RecordStatus.REJECTED && (
                                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center">
                                                          <X size={10} className="text-white"/>
                                                      </div>
                                                  )}
                                                  {hasError && (status === RecordStatus.DRAFT || !status) && (
                                                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-rose-500 rounded-full border-2 border-white flex items-center justify-center animate-pulse">
                                                          <AlertCircle size={10} className="text-white"/>
                                                      </div>
                                                  )}
                                              </div>
                                              <div className="text-left flex-1">
                                                <p className="font-black text-slate-800 text-sm leading-tight">{u.name}</p>
                                                <div className="mt-1">{getStatusBadge(buffer as AttendanceRecord)}</div>
                                                {hasError && (
                                                    <div className="mt-1 text-[9px] text-rose-600 font-bold flex items-center gap-1 animate-pulse">
                                                        <AlertCircle size={10}/>
                                                        {hasError}
                                                    </div>
                                                )}
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-2 py-4">
                                          <div className="relative group">
                                              <div className="flex items-center gap-1.5">
                                                  {buffer.type && TypeIcon && (
                                                      <div className={`p-1.5 rounded-lg ${typeColor.split(' ').slice(1, 3).join(' ')} border ${typeColor.split(' ')[2]}`}>
                                                          <TypeIcon size={14} className={typeColor.split(' ')[0]}/>
                                                      </div>
                                                  )}
                                                  <select 
                                                      id={`${fieldId}-type`}
                                                      className={`flex-1 px-2 py-1.5 border-2 rounded-lg font-bold text-[10px] outline-none focus:ring-2 focus:ring-indigo-500 transition-all ${validationErrors[u.id] && !buffer.type ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200' : typeColor} ${focusedField === `${fieldId}-type` ? 'ring-2 ring-indigo-300' : ''}`}
                                                      value={buffer.type || ''} 
                                                      onChange={e => {
                                                          const newBuffer = {...buffer, type: e.target.value as AttendanceType};
                                                          setAttendanceBuffer({...attendanceBuffer, [u.id]: newBuffer});
                                                          // Clear error if fixed
                                                          if (validationErrors[u.id] && validateAttendanceRecord(u.id, newBuffer) === null) {
                                                              setValidationErrors(prev => {
                                                                  const next = {...prev};
                                                                  delete next[u.id];
                                                                  return next;
                                                              });
                                                          }
                                                      }}
                                                      onFocus={() => setFocusedField(`${fieldId}-type`)}
                                                      onBlur={() => setFocusedField(null)}
                                                      onKeyDown={(e) => {
                                                          if (e.key === 'Enter' || e.key === 'Tab') {
                                                              e.preventDefault();
                                                              const nextField = document.getElementById(`${fieldId}-hours`);
                                                              if (nextField) nextField.focus();
                                                          }
                                                      }}
                                                      disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}
                                                      title={buffer.type ? ATTENDANCE_LABELS[buffer.type] : 'Chọn loại công'}
                                                  >
                                                      <option value="">-- Chọn loại --</option>
                                                      {Object.values(AttendanceType).map(t => (
                                                          <option key={t} value={t}>{ATTENDANCE_LABELS[t]}</option>
                                                      ))}
                                                  </select>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-2 py-4">
                                          <div className="relative group">
                                              <input 
                                                  id={`${fieldId}-hours`}
                                                  type="number" 
                                                  step="0.5" 
                                                  className={`w-full px-2 py-1.5 border-2 rounded-lg font-black text-center text-indigo-600 outline-none transition-all ${validationErrors[u.id] && (buffer.hours === undefined || buffer.hours === null || buffer.hours <= 0) ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200' : (buffer.hours || 0) > 24 ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200' : (buffer.hours || 0) > 12 ? 'border-amber-500 bg-amber-50' : (buffer.hours || 0) <= 0 && buffer.hours !== undefined && buffer.hours !== null ? 'border-rose-300 bg-rose-50/50' : 'border-indigo-200 focus:border-indigo-500'} ${focusedField === `${fieldId}-hours` ? 'ring-2 ring-indigo-300' : ''}`}
                                                  value={buffer.hours || ''} 
                                                  onChange={e => {
                                                      const newBuffer = {...buffer, hours: Number(e.target.value)};
                                                      setAttendanceBuffer({...attendanceBuffer, [u.id]: newBuffer});
                                                      // Clear error if fixed
                                                      if (validationErrors[u.id] && validateAttendanceRecord(u.id, newBuffer) === null) {
                                                          setValidationErrors(prev => {
                                                              const next = {...prev};
                                                              delete next[u.id];
                                                              return next;
                                                          });
                                                      }
                                                  }}
                                                  onFocus={() => setFocusedField(`${fieldId}-hours`)}
                                                  onBlur={() => setFocusedField(null)}
                                                  onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                          e.preventDefault();
                                                          const nextField = document.getElementById(`${fieldId}-overtime`);
                                                          if (nextField) nextField.focus();
                                                      }
                                                  }}
                                                  disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}
                                                  placeholder="8"
                                                  required
                                              />
                                              {((buffer.hours || 0) > 24 || (buffer.hours === undefined || buffer.hours === null || buffer.hours <= 0)) && (
                                                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                                      <AlertCircle size={14} className="text-rose-500"/>
                                                  </div>
                                              )}
                                              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                  <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                                      Giờ công chính {
                                                          (buffer.hours || 0) > 24 ? '⚠️ Vượt quá 24h' : 
                                                          (buffer.hours === undefined || buffer.hours === null || buffer.hours <= 0) ? '⚠️ Chưa nhập hoặc ≤ 0' : 
                                                          ''
                                                      }
                                                  </div>
                                              </div>
                                          </div>
                                      </td>
                                      <td className="px-2 py-4">{buffer.type === AttendanceType.PIECEWORK ? (
                                          <div className="relative">
                                              <input 
                                                  id={`${fieldId}-output`}
                                                  type="number" 
                                                  placeholder="Sản lượng..." 
                                                  className={`w-full px-2 py-1.5 border-2 rounded-lg bg-emerald-50 text-[10px] text-center font-black text-emerald-700 pr-6 outline-none transition-all ${validationErrors[u.id] && buffer.type === AttendanceType.PIECEWORK && (buffer.output === undefined || buffer.output === null || buffer.output < 0) ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200' : 'border-emerald-200 focus:border-emerald-500'} ${focusedField === `${fieldId}-output` ? 'ring-2 ring-emerald-300' : ''}`}
                                                  value={buffer.output || ''} 
                                                  onChange={e => {
                                                      const newBuffer = {...buffer, output: Number(e.target.value)};
                                                      setAttendanceBuffer({...attendanceBuffer, [u.id]: newBuffer});
                                                      if (validationErrors[u.id] && validateAttendanceRecord(u.id, newBuffer) === null) {
                                                          setValidationErrors(prev => {
                                                              const next = {...prev};
                                                              delete next[u.id];
                                                              return next;
                                                          });
                                                      }
                                                  }}
                                                  onFocus={() => setFocusedField(`${fieldId}-output`)}
                                                  onBlur={() => setFocusedField(null)}
                                                  onKeyDown={(e) => {
                                                      if (e.key === 'Enter') {
                                                          e.preventDefault();
                                                          const nextField = document.getElementById(`${fieldId}-overtime`);
                                                          if (nextField) nextField.focus();
                                                      }
                                                  }}
                                                  disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}
                                              />
                                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[8px] text-emerald-300 font-bold uppercase">SP</span>
                                          </div>
                                      ) : buffer.type === AttendanceType.DAILY ? (
                                          <select 
                                              id={`${fieldId}-daily`}
                                              className={`w-full px-2 py-1.5 border-2 rounded-lg bg-blue-50 text-[9px] font-bold outline-none text-blue-700 transition-all ${validationErrors[u.id] && buffer.type === AttendanceType.DAILY && !buffer.dailyWorkItemId ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-200' : 'border-blue-200 focus:border-blue-500'} ${focusedField === `${fieldId}-daily` ? 'ring-2 ring-blue-300' : ''}`}
                                              value={buffer.dailyWorkItemId || ''} 
                                              onChange={e => {
                                                  const newBuffer = {...buffer, dailyWorkItemId: e.target.value};
                                                  setAttendanceBuffer({...attendanceBuffer, [u.id]: newBuffer});
                                                  if (validationErrors[u.id] && validateAttendanceRecord(u.id, newBuffer) === null) {
                                                      setValidationErrors(prev => {
                                                          const next = {...prev};
                                                          delete next[u.id];
                                                          return next;
                                                      });
                                                  }
                                              }}
                                              onFocus={() => setFocusedField(`${fieldId}-daily`)}
                                              onBlur={() => setFocusedField(null)}
                                              onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                      e.preventDefault();
                                                      const nextField = document.getElementById(`${fieldId}-overtime`);
                                                      if (nextField) nextField.focus();
                                                  }
                                              }}
                                              disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}
                                          >
                                              <option value="">-- Chọn việc nhật --</option>
                                              {dailyWorkCatalog.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                                          </select>
                                      ) : (
                                          <span className="text-[10px] text-slate-300 italic font-medium">Theo quy định công</span>
                                      )}</td>
                                      <td className="px-2 py-4 bg-emerald-50/30">
                                          {buffer.type === AttendanceType.PIECEWORK ? (
                                              <div className="relative">
                                                  <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 text-emerald-400" size={12}/>
                                                  <input type="number" className="w-full pl-6 pr-2 py-1.5 border-2 border-emerald-100 rounded-lg font-black text-center text-emerald-700 text-[10px] outline-none bg-white focus:border-emerald-500" value={buffer.pieceworkUnitPrice || 0} onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, pieceworkUnitPrice: Number(e.target.value)}})} disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}/>
                                              </div>
                                          ) : <span className="text-slate-300">--</span>}
                                      </td>
                                      <td className="px-2 py-4">
                                          <div className="relative group">
                                              <input 
                                                  type="number" 
                                                  step="0.5" 
                                                  className={`w-full px-2 py-1.5 border-2 rounded-lg font-black text-center text-orange-600 outline-none transition-all ${(buffer.overtimeHours || 0) > (buffer.hours || 0) ? 'border-rose-500 bg-rose-50' : 'border-orange-200 focus:border-orange-500'}`}
                                                  value={buffer.overtimeHours} 
                                                  onChange={e => setAttendanceBuffer({...attendanceBuffer, [u.id]: {...buffer, overtimeHours: Number(e.target.value)}})} 
                                                  disabled={isOnlyEmployee || (buffer.status !== undefined && buffer.status !== RecordStatus.DRAFT)}
                                                  placeholder="0"
                                              />
                                              {(buffer.overtimeHours || 0) > (buffer.hours || 0) && (buffer.hours || 0) > 0 && (
                                                  <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                                      <AlertCircle size={14} className="text-rose-500"/>
                                                  </div>
                                              )}
                                              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                                  <div className="bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap shadow-lg">
                                                      Giờ tăng ca {(buffer.overtimeHours || 0) > (buffer.hours || 0) && (buffer.hours || 0) > 0 ? '⚠️ Vượt giờ chính' : ''}
                                                  </div>
                                              </div>
                                          </div>
                                      </td>
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
                                                    <button onClick={() => handleIndividualAction(u.id, 'APPROVE')} className="p-3 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 active:scale-95 transition-all touch-manipulation" title="Duyệt bản ghi"><Check size={16}/></button>
                                                    <button onClick={() => handleIndividualAction(u.id, 'REJECT')} className="p-3 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 active:scale-95 transition-all touch-manipulation" title="Từ chối/Trả về"><RotateCcw size={16}/></button>
                                                  </>
                                              )}
                                              {/* Nút hậu kiểm cho bản ghi APPROVED */}
                                              {hasPermission && buffer.status === RecordStatus.APPROVED && canReviewApprovedRecord(buffer as AttendanceRecord) && (
                                                  <button 
                                                      onClick={() => handleIndividualAction(u.id, 'REJECT')} 
                                                      className="p-3 bg-purple-600 text-white rounded-lg shadow-sm hover:bg-purple-700 active:scale-95 transition-all touch-manipulation" 
                                                      title="Hậu kiểm: Trả về để điều chỉnh"
                                                  >
                                                      <ShieldCheck size={16}/>
                                                  </button>
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
                            <div className="relative">
                                {/* Timeline line */}
                                <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-200 via-indigo-300 to-indigo-200"></div>
                                
                                <div className="space-y-6 text-left text-left text-left relative">
                                {filteredEvaluationsByDate.map((req, index) => {
                                    const isTargetMoney = req.target === EvaluationTarget.RESERVED_BONUS;
                                    const canApprove = canApproveThisEval(req);

                                    const isApproved = req.status === RecordStatus.APPROVED;
                                    const isRejected = req.status === RecordStatus.REJECTED;
                                    const isPending = req.status !== RecordStatus.APPROVED && req.status !== RecordStatus.REJECTED;
                                    
                                    // Color coding based on status and type
                                    const cardBorderColor = isApproved 
                                        ? (req.type === 'BONUS' ? 'border-emerald-300' : 'border-rose-300')
                                        : isRejected 
                                        ? 'border-slate-300'
                                        : 'border-indigo-200';
                                    const cardBgColor = isApproved
                                        ? (req.type === 'BONUS' ? 'bg-emerald-50/30' : 'bg-rose-50/30')
                                        : isRejected
                                        ? 'bg-slate-50'
                                        : 'bg-white';
                                    
                                    return (
                                        <div key={req.id} id={`eval-${req.id}`} className={`relative ${cardBgColor} rounded-[32px] border-2 ${cardBorderColor} shadow-sm overflow-hidden flex flex-col md:flex-row transition-all hover:shadow-xl hover:scale-[1.01] group text-left`}>
                                            {/* Timeline dot */}
                                            <div className={`absolute left-6 top-8 w-4 h-4 rounded-full border-4 border-white shadow-lg z-10 ${
                                                isApproved 
                                                    ? (req.type === 'BONUS' ? 'bg-emerald-500' : 'bg-rose-500')
                                                    : isRejected
                                                    ? 'bg-slate-400'
                                                    : 'bg-indigo-500 animate-pulse'
                                            }`}></div>
                                            
                                            {/* Left border accent */}
                                            <div className={`w-3 shrink-0 ${
                                                isApproved 
                                                    ? (req.type === 'BONUS' ? 'bg-gradient-to-b from-emerald-500 to-emerald-400' : 'bg-gradient-to-b from-rose-500 to-rose-400')
                                                    : isRejected
                                                    ? 'bg-gradient-to-b from-slate-400 to-slate-300'
                                                    : 'bg-gradient-to-b from-indigo-500 to-indigo-400'
                                            }`}></div>
                                            
                                            <div className="flex-1 p-8 pl-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-8 text-left text-left text-left">
                                                <div className="flex items-start gap-6 text-left text-left text-left flex-1">
                                                    {/* Icon with status indicator */}
                                                    <div className="relative shrink-0">
                                                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border-4 transition-all group-hover:scale-110 text-left text-left ${
                                                            isApproved
                                                                ? (req.type === 'BONUS' ? 'bg-emerald-500 text-white border-emerald-300' : 'bg-rose-500 text-white border-rose-300')
                                                                : isRejected
                                                                ? 'bg-slate-400 text-white border-slate-300'
                                                                : (req.type === 'BONUS' ? 'bg-emerald-400 text-white border-emerald-200' : 'bg-rose-400 text-white border-rose-200')
                                                        }`}>
                                                            {req.type === 'BONUS' ? <ThumbsUp size={32}/> : <ThumbsDown size={32}/>}
                                                        </div>
                                                        {isApproved && (
                                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                                                                <Check size={12} className="text-white"/>
                                                            </div>
                                                        )}
                                                        {isRejected && (
                                                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-slate-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                                                                <X size={12} className="text-white"/>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="text-left text-left flex-1">
                                                        {/* Header with user and status */}
                                                        <div className="flex items-center gap-3 flex-wrap text-left text-left text-left mb-2">
                                                            <p className="font-black text-slate-900 text-xl uppercase tracking-tight text-left text-left">{req.userName}</p>
                                                            <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase border-2 shadow-sm text-left text-left ${
                                                                isApproved 
                                                                    ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                                                    : isRejected
                                                                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                                                                    : 'bg-indigo-100 text-indigo-700 border-indigo-300 animate-pulse'
                                                            }`}>
                                                                {req.status.replace('PENDING_', 'CHỜ ').replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Criteria and date */}
                                                        <div className="flex items-center gap-3 flex-wrap mt-3 text-left text-left text-left">
                                                            <span className={`text-[11px] font-black px-3 py-1.5 rounded-lg border-2 uppercase text-left text-left ${
                                                                req.type === 'BONUS' 
                                                                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                                                                    : 'text-rose-700 bg-rose-50 border-rose-200'
                                                            }`}>
                                                                {req.criteriaName}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-lg border border-slate-200 text-left text-left">
                                                                <Clock size={12}/> {formatDateTime(req.createdAt)}
                                                            </span>
                                                        </div>
                                                        
                                                        {/* Description */}
                                                        <div className="mt-4 p-4 bg-slate-50/50 rounded-xl border border-slate-200 text-left text-left">
                                                            <p className="text-sm text-slate-600 font-medium leading-relaxed text-left text-left">
                                                                <span className="text-slate-400 font-bold text-xs uppercase mr-2">Mô tả:</span>
                                                                {req.description || <span className="italic text-slate-400">Không có ghi chú diễn giải.</span>}
                                                            </p>
                                                        </div>
                                                        
                                                        {/* Proof file if exists */}
                                                        {req.proofFileName && (
                                                            <div className="mt-3 flex items-center gap-2 text-left text-left">
                                                                <Paperclip size={14} className="text-slate-400"/>
                                                                <span className="text-[10px] font-bold text-slate-500 italic">{req.proofFileName}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-end gap-5 shrink-0 text-right text-right min-w-[180px]">
                                                    {/* Value card */}
                                                    <div className={`text-right text-right p-5 rounded-2xl border-2 shadow-lg ${
                                                        isApproved
                                                            ? (req.type === 'BONUS' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200')
                                                            : isRejected
                                                            ? 'bg-slate-50 border-slate-200'
                                                            : (req.type === 'BONUS' ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200')
                                                    }`}>
                                                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-right text-right mb-2">Giá trị điều chỉnh</p>
                                                        <p className={`text-4xl font-black tabular-nums tracking-tighter text-right text-right ${
                                                            isApproved
                                                                ? (req.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600')
                                                                : isRejected
                                                                ? 'text-slate-500'
                                                                : (req.type === 'BONUS' ? 'text-emerald-500' : 'text-rose-500')
                                                        }`}>
                                                            {req.type === 'BONUS' ? '+' : '-'}{isTargetMoney ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(req.points) : `${Math.abs(req.points)}% HQ`}
                                                        </p>
                                                        {isTargetMoney && (
                                                            <p className="text-[9px] font-bold text-slate-400 mt-1 text-right text-right">Từ thưởng treo</p>
                                                        )}
                                                    </div>

                                                    {/* Action buttons */}
                                                    {canApprove && req.status !== RecordStatus.APPROVED && req.status !== RecordStatus.REJECTED && (
                                                        <div className="flex flex-col gap-2 w-full text-left text-left text-left">
                                                            <button onClick={() => approveEvaluationRequest(req.id)} className="w-full px-6 py-3 bg-emerald-600 text-white rounded-xl text-xs sm:text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all touch-manipulation">
                                                                <CheckCircle size={16}/> Phê duyệt
                                                            </button>
                                                            <button onClick={() => setRejectionModal({ isOpen: true, id: req.id })} className="w-full px-6 py-3 bg-white text-rose-600 border-2 border-rose-200 rounded-xl text-xs sm:text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-rose-50 active:scale-95 transition-all touch-manipulation">
                                                                <XCircle size={16}/> Từ chối
                                                            </button>
                                                        </div>
                                                    )}
                                                    
                                                    {/* Status indicator for approved/rejected */}
                                                    {(isApproved || isRejected) && (
                                                        <div className={`w-full px-4 py-2 rounded-lg text-[9px] font-black uppercase text-center ${
                                                            isApproved 
                                                                ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                                                        }`}>
                                                            {isApproved ? '✓ Đã duyệt' : '✗ Đã từ chối'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                </div>
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
