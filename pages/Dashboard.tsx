
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, TrendingUp, Clock, FileCheck, Activity, FileText, Building, Target, 
  PieChart, AlertTriangle, Calendar, Wallet, AlertCircle, 
  ShieldAlert, User as UserIcon, LayoutDashboard,
  CheckCircle, BadgeCheck, Info, Banknote, ChevronDown, CheckSquare as CheckedIcon, Square,
  Bell,
  Search,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  DollarSign
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { UserRole, AttendanceType, RecordStatus, EvaluationTarget, EvaluationRequest, SalaryRecord } from '../types';
import { hasRole } from '../utils/rbac';

const Dashboard: React.FC = () => {
  const { 
    allUsers, departments, salaryRecords, dailyAttendance, evaluationRequests,
    currentUser, formatDateTime, formatDate, formatCurrency, criteriaList, criteriaGroups, annualBonusPolicies,
    calculateMonthlySalary, dailyWorkCatalog, systemConfig, getStandardWorkDays
  } = useAppContext();
  
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'PERSONAL' | 'ADMIN'>('PERSONAL');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [selectedDeptIds, setSelectedDeptIds] = useState<string[]>([]);
  const [isDeptDropdownOpen, setIsDeptDropdownOpen] = useState(false);
  const deptDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (deptDropdownRef.current && !deptDropdownRef.current.contains(event.target as Node)) {
            setIsDeptDropdownOpen(false);
        }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isManagerUp = useMemo(() => {
    return hasRole(currentUser!, [UserRole.ADMIN, UserRole.BAN_LANH_DAO, UserRole.GIAM_DOC_KHOI, UserRole.QUAN_LY, UserRole.NHAN_SU, UserRole.KE_TOAN_LUONG]);
  }, [currentUser]);

  useEffect(() => {
    if (isManagerUp) {
        setViewMode('ADMIN');
        const initialDepts = hasRole(currentUser!, [UserRole.ADMIN, UserRole.BAN_LANH_DAO]) 
            ? departments.map(d => d.id)
            : (() => {
                // Ưu tiên lấy phòng ban hiện tại của user
                const currentDept = currentUser?.currentDeptId ? departments.find(d => d.id === currentUser.currentDeptId) : null;
                const sideDept = currentUser?.sideDeptId ? departments.find(d => d.id === currentUser.sideDeptId) : null;
                
                // Kiểm tra xem user có phải là manager/hr/gdk của phòng ban hiện tại không
                const isManagerOfCurrentDept = currentDept && currentDept.managerId === currentUser?.id;
                const isHROfCurrentDept = currentDept && currentDept.hrId === currentUser?.id;
                const isGDKOfCurrentDept = currentDept && currentDept.blockDirectorId === currentUser?.id;
                const isManagerOfSideDept = sideDept && sideDept.managerId === currentUser?.id;
                const isHROfSideDept = sideDept && sideDept.hrId === currentUser?.id;
                const isGDKOfSideDept = sideDept && sideDept.blockDirectorId === currentUser?.id;
                
                // Nếu user là manager/hr/gdk của phòng ban hiện tại, chỉ lấy phòng ban đó
                if (isManagerOfCurrentDept || isHROfCurrentDept || isGDKOfCurrentDept) {
                    const deptIds = currentDept ? [currentDept.id] : [];
                    if (sideDept && (isManagerOfSideDept || isHROfSideDept || isGDKOfSideDept)) {
                        deptIds.push(sideDept.id);
                    }
                    return deptIds;
                } else if (isManagerOfSideDept || isHROfSideDept || isGDKOfSideDept) {
                    return sideDept ? [sideDept.id] : [];
                } else if (currentUser?.assignedDeptIds && currentUser.assignedDeptIds.length > 0) {
                    // Kế toán lương: lấy theo assignedDeptIds
                    return currentUser.assignedDeptIds;
                } else {
                    // Fallback: lấy phòng ban hiện tại của user
                    return departments.filter(d => d.id === currentUser?.currentDeptId || d.id === currentUser?.sideDeptId).map(d => d.id);
                }
            })();
        setSelectedDeptIds(initialDepts);
    }
    else setViewMode('PERSONAL');
  }, [isManagerUp, departments, currentUser]);

  useEffect(() => {
    if (currentUser && endDate) {
      calculateMonthlySalary(endDate.substring(0, 7));
    }
  }, [endDate, currentUser]);

  const toggleDeptSelection = (id: string) => {
    setSelectedDeptIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAllDepts = () => {
    const all = hasRole(currentUser!, [UserRole.ADMIN, UserRole.BAN_LANH_DAO]) 
        ? departments.map(d => d.id)
        : (() => {
            // Ưu tiên lấy phòng ban hiện tại của user
            const currentDept = currentUser?.currentDeptId ? departments.find(d => d.id === currentUser.currentDeptId) : null;
            const sideDept = currentUser?.sideDeptId ? departments.find(d => d.id === currentUser.sideDeptId) : null;
            
            // Kiểm tra xem user có phải là manager/hr/gdk của phòng ban hiện tại không
            const isManagerOfCurrentDept = currentDept && currentDept.managerId === currentUser?.id;
            const isHROfCurrentDept = currentDept && currentDept.hrId === currentUser?.id;
            const isGDKOfCurrentDept = currentDept && currentDept.blockDirectorId === currentUser?.id;
            const isManagerOfSideDept = sideDept && sideDept.managerId === currentUser?.id;
            const isHROfSideDept = sideDept && sideDept.hrId === currentUser?.id;
            const isGDKOfSideDept = sideDept && sideDept.blockDirectorId === currentUser?.id;
            
            // Nếu user là manager/hr/gdk của phòng ban hiện tại, chỉ lấy phòng ban đó
            if (isManagerOfCurrentDept || isHROfCurrentDept || isGDKOfCurrentDept) {
                const deptIds = currentDept ? [currentDept.id] : [];
                if (sideDept && (isManagerOfSideDept || isHROfSideDept || isGDKOfSideDept)) {
                    deptIds.push(sideDept.id);
                }
                return deptIds;
            } else if (isManagerOfSideDept || isHROfSideDept || isGDKOfSideDept) {
                return sideDept ? [sideDept.id] : [];
            } else if (currentUser?.assignedDeptIds && currentUser.assignedDeptIds.length > 0) {
                // Kế toán lương: lấy theo assignedDeptIds
                return currentUser.assignedDeptIds;
            } else {
                // Fallback: lấy phòng ban hiện tại của user
                return departments.filter(d => d.id === currentUser?.currentDeptId || d.id === currentUser?.sideDeptId).map(d => d.id);
            }
        })();
    setSelectedDeptIds(all);
  };

  const clearDepts = () => setSelectedDeptIds([]);

  // Tính lương trong ngày từ attendance record
  const calculateDailySalary = (userId: string, date: string): number => {
    const attendance = dailyAttendance.find(a => a.userId === userId && a.date === date && a.status === RecordStatus.APPROVED);
    if (!attendance) return 0;
    
    const user = allUsers.find(u => u.id === userId);
    if (!user) return 0;
    
    const monthStr = date.substring(0, 7);
    const salaryRecord = salaryRecords.find(r => r.userId === userId && r.date === monthStr);
    const Ctc = getStandardWorkDays(monthStr);
    const LCB_dm = Number(salaryRecord?.LCB_dm || 0);
    
    let dailySalary = 0;
    
    // Tính lương chính theo loại công
    if (attendance.type === AttendanceType.TIME) {
      // Lương thời gian: (LCB_dm / Ctc) * (hours / 8)
      dailySalary = (LCB_dm / Ctc) * (attendance.hours / 8);
    } else if (attendance.type === AttendanceType.PIECEWORK) {
      // Lương khoán: output * unitPrice
      const unitPrice = attendance.pieceworkUnitPrice ? Number(attendance.pieceworkUnitPrice) : (user.pieceworkUnitPrice || 0);
      dailySalary = (attendance.output || 0) * unitPrice;
    } else if (attendance.type === AttendanceType.DAILY) {
      // Lương công nhật: dailyWorkItem.unitPrice
      const dailyWorkItem = dailyWorkCatalog.find(item => item.id === attendance.dailyWorkItemId);
      dailySalary = dailyWorkItem?.unitPrice ? Number(dailyWorkItem.unitPrice) : 0;
    } else if ([AttendanceType.HOLIDAY, AttendanceType.PAID_LEAVE, AttendanceType.MODE].includes(attendance.type)) {
      // Nghỉ có lương: (LCB_dm / Ctc)
      dailySalary = LCB_dm / Ctc;
    }
    
    // Tính lương tăng ca
    if (attendance.overtimeHours > 0) {
      const otRate = attendance.otRate || 1.5;
      if (attendance.isOvertimeWithOutput) {
        // Tăng ca có sản lượng: tính theo lương khoán
        const unitPrice = attendance.pieceworkUnitPrice ? Number(attendance.pieceworkUnitPrice) : (user.pieceworkUnitPrice || 0);
        const otOutput = attendance.output || 0;
        dailySalary += otOutput * unitPrice * otRate;
      } else {
        // Tăng ca thời gian: (LCB_dm / Ctc / 8) * overtimeHours * otRate
        dailySalary += (LCB_dm / Ctc / 8) * attendance.overtimeHours * otRate;
      }
    }
    
    // Áp dụng tỷ lệ thử việc nếu có
    if (user.probationRate && user.probationRate < 100) {
      dailySalary = dailySalary * (user.probationRate / 100);
    }
    
    return dailySalary;
  };

  const adminStats = useMemo(() => {
    if (viewMode !== 'ADMIN' || !currentUser) return null;

    let targetUsers = allUsers.filter(u => selectedDeptIds.includes(u.currentDeptId || ''));
    const targetUserIds = targetUsers.map(u => u.id);
    const totalStaff = targetUsers.length;
    
    const workingTodayIds = new Set(
        dailyAttendance
            .filter(a => a.date === endDate && [AttendanceType.TIME, AttendanceType.PIECEWORK, AttendanceType.DAILY].includes(a.type))
            .map(a => a.userId)
    );
    const staffWorkingCount = targetUsers.filter(u => workingTodayIds.has(u.id)).length;

    const monthSet = new Set(dailyAttendance.filter(a => a.date >= startDate && a.date <= endDate).map(a => a.date.substring(0, 7)));
    const totalNetSalary = salaryRecords
        .filter(r => monthSet.has(r.date) && targetUserIds.includes(r.userId))
        .reduce((acc, curr) => acc + curr.netSalary, 0);

    const pendingAttendanceDays = Array.from(new Set(
        dailyAttendance
            .filter(a => targetUserIds.includes(a.userId) && (a.status === RecordStatus.PENDING_MANAGER || a.status === RecordStatus.PENDING_HR))
            .map(a => a.date)
    )).sort().reverse();

    const bigErrors = evaluationRequests.filter(e => {
        const date = e.createdAt.split('T')[0];
        const inRange = date >= startDate && date <= endDate && e.status === RecordStatus.APPROVED;
        const isUserInScope = targetUserIds.includes(e.userId);
        const isSevere = Math.abs(e.points) >= 3 || e.target === EvaluationTarget.RESERVED_BONUS;
        return inRange && isUserInScope && e.type === 'PENALTY' && isSevere;
    });

    const totalPenaltyAmount = evaluationRequests
        .filter(e => {
            const date = e.createdAt.split('T')[0];
            return date >= startDate && date <= endDate && e.status === RecordStatus.APPROVED && targetUserIds.includes(e.userId) && e.type === 'PENALTY';
        })
        .reduce((acc, curr) => {
            if (curr.target === EvaluationTarget.RESERVED_BONUS) return acc + curr.points; 
            const user = allUsers.find(u => u.id === curr.userId);
            const criteria = criteriaList.find(c => c.id === curr.criteriaId);
            const group = criteriaGroups.find(g => g.id === criteria?.groupId);
            if (!criteria || !user || !group) return acc;
            const targetSalary = user.paymentType === 'PIECEWORK' ? 0 : user.efficiencySalary; 
            return acc + (criteria.value / 100) * (group.weight / 100) * targetSalary;
        }, 0);

    // Tính tổng lương trong ngày cho tất cả nhân viên được chọn
    const totalDailySalary = targetUsers.reduce((acc, user) => {
      return acc + calculateDailySalary(user.id, endDate);
    }, 0);

    return { totalStaff, staffWorkingCount, totalNetSalary, bigErrors, totalPenaltyAmount, pendingAttendanceDays, totalDailySalary };
  }, [viewMode, allUsers, dailyAttendance, salaryRecords, evaluationRequests, currentUser, departments, endDate, startDate, criteriaList, criteriaGroups, selectedDeptIds, dailyWorkCatalog, getStandardWorkDays]);

  const personalStats = useMemo(() => {
    const userAttendance = dailyAttendance.filter(a => a.userId === currentUser?.id && a.date >= startDate && a.date <= endDate);
    const userEvals = evaluationRequests.filter(e => e.userId === currentUser?.id && e.createdAt.startsWith(endDate.substring(0, 7)));

    const totalWorkDays = userAttendance.reduce((acc, curr) => acc + (curr.hours / 8), 0);
    const monthStr = endDate.substring(0, 7);
    const currentSalaryRecord = salaryRecords.find(r => r.userId === currentUser?.id && r.date === monthStr);
    const tempNetSalary = currentSalaryRecord?.netSalary || 0;

    const totalPenaltyAccumulated = userEvals
        .filter(e => e.type === 'PENALTY' && e.status === RecordStatus.APPROVED)
        .reduce((acc, curr) => {
            if (curr.target === EvaluationTarget.RESERVED_BONUS) return acc + curr.points;
            const criteria = criteriaList.find(c => c.id === curr.criteriaId);
            const group = criteriaGroups.find(g => g.id === criteria?.groupId);
            if (!criteria || !group) return acc;
            return acc + ((criteria.value / 100) * (group.weight / 100) * (currentUser?.efficiencySalary || 0));
        }, 0);

    let reservedBonusLeft = 0;
    if (currentUser) {
        const policyLimit = currentUser.reservedBonusAmount || 0;
        const totalReservedPenalties = evaluationRequests
            .filter(e => e.userId === currentUser.id && e.target === EvaluationTarget.RESERVED_BONUS && e.status === RecordStatus.APPROVED)
            .reduce((acc, curr) => acc + (curr.type === 'BONUS' ? Math.abs(curr.points) : -Math.abs(curr.points)), 0);
        reservedBonusLeft = Math.max(0, policyLimit - totalReservedPenalties); // Trừ lùi phạt thưởng treo
    }

    // Tính lương trong ngày (ngày endDate)
    const dailySalary = currentUser ? calculateDailySalary(currentUser.id, endDate) : 0;

    // Tính KPI trong ngày (ngày endDate) - cả bonus và penalty
    const dailyKpiItems = evaluationRequests.filter(e => {
      if (!currentUser || e.userId !== currentUser.id) return false;
      const date = e.createdAt.split('T')[0];
      return date === endDate && 
             e.status === RecordStatus.APPROVED && 
             e.target === EvaluationTarget.MONTHLY_SALARY;
    }).map(e => {
      const criteria = criteriaList.find(c => c.id === e.criteriaId);
      const group = criteriaGroups.find(g => g.id === criteria?.groupId);
      if (!criteria || !group || !currentUser) return null;
      const kpiPercentage = (criteria.value / 100) * (group.weight / 100);
      const kpiAmount = kpiPercentage * (currentUser.efficiencySalary || 0);
      return {
        id: e.id,
        type: e.type, // 'BONUS' hoặc 'PENALTY'
        criteriaName: criteria.name,
        groupName: group.name,
        value: criteria.value,
        weight: group.weight,
        points: e.points,
        description: e.description,
        createdAt: e.createdAt,
        kpiPercentage: kpiPercentage * 100, // % lương HQ
        kpiAmount: e.type === 'BONUS' ? kpiAmount : -kpiAmount // Dương cho bonus, âm cho penalty
      };
    }).filter((e): e is NonNullable<typeof e> => e !== null);

    const dailyKpiPenaltiesFiltered = dailyKpiItems.filter(e => e.type === 'PENALTY');
    const dailyKpiBonuses = dailyKpiItems.filter(e => e.type === 'BONUS');
    const dailyKpiPenaltyAmount = dailyKpiPenaltiesFiltered.reduce((acc, curr) => acc + Math.abs(curr.kpiAmount), 0);
    const dailyKpiBonusAmount = dailyKpiBonuses.reduce((acc, curr) => acc + curr.kpiAmount, 0);
    const dailyKpiNetAmount = dailyKpiItems.reduce((acc, curr) => acc + curr.kpiAmount, 0);

    return { totalWorkDays, tempNetSalary, totalPenaltyAccumulated, reservedBonusLeft, dailySalary, dailyKpiPenaltyAmount, dailyKpiPenalties: dailyKpiPenaltiesFiltered, dailyKpiItems, dailyKpiBonusAmount, dailyKpiNetAmount };
  }, [dailyAttendance, evaluationRequests, currentUser, salaryRecords, endDate, startDate, criteriaList, criteriaGroups, allUsers, dailyWorkCatalog, getStandardWorkDays]);

  return (
    <div className="space-y-10 pb-20 animate-fade-in text-left">
      {/* INTERNAL BANNER */}
      <div className="bg-slate-900 rounded-[40px] p-10 flex flex-col xl:flex-row justify-between items-center gap-10 shadow-2xl relative overflow-hidden border-4 border-slate-800">
         <div className="absolute right-0 top-0 w-1/2 h-full opacity-10 pointer-events-none">
            <svg viewBox="0 0 400 400" className="w-full h-full fill-white"><path d="M0,0 L400,0 L400,400 L0,400 Z" /></svg>
         </div>
         <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10 text-center lg:text-left">
            <div className="p-5 bg-indigo-600 rounded-[32px] text-white shadow-2xl shadow-indigo-500/40"><LayoutDashboard size={40}/></div>
            <div>
                <h1 className="text-4xl font-black text-white tracking-tighter leading-none">Trung Tâm Điều Hành Nhân Sự</h1>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-4">Phân tích Hiệu suất & Lương Thực lĩnh toàn hệ thống</p>
            </div>
         </div>
         <div className="flex items-center gap-4 bg-white/5 p-6 rounded-[32px] border border-white/10 backdrop-blur-md relative z-10 shrink-0">
             <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <Activity size={20} className="text-indigo-400"/><span className="text-sm font-black text-white uppercase tracking-widest">Hệ Thống Hoạt Động</span>
                </div>
                <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 w-[85%]"></div></div>
             </div>
         </div>
      </div>

      {/* FILTER PANEL */}
      <div className="bg-white p-4 rounded-3xl shadow-xl border border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-100 px-4 py-2.5 rounded-2xl border border-slate-200 shadow-inner">
                  <Calendar size={18} className="text-slate-400"/>
                  <input type="date" className="bg-transparent text-xs font-black outline-none text-slate-700 w-32" value={startDate} onChange={e => setStartDate(e.target.value)}/>
                  <span className="text-slate-300 font-bold">→</span>
                  <input type="date" className="bg-transparent text-xs font-black outline-none text-slate-700 w-32" value={endDate} onChange={e => setEndDate(e.target.value)}/>
              </div>
              {viewMode === 'ADMIN' && (
                <div className="relative" ref={deptDropdownRef}>
                    <button onClick={() => setIsDeptDropdownOpen(!isDeptDropdownOpen)} className="px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs sm:text-[11px] font-black uppercase flex items-center gap-2 hover:border-indigo-500 active:scale-95 transition-all min-w-[260px] justify-between shadow-sm touch-manipulation">
                        <div className="flex items-center gap-2 text-indigo-600"><Building size={16}/><span className="text-slate-800">{selectedDeptIds.length === 0 ? 'Chọn Đơn vị' : (selectedDeptIds.length === departments.length ? 'Tất cả Đơn vị' : `${selectedDeptIds.length} Đơn vị đã chọn`)}</span></div>
                        <ChevronDown size={14} className={`transition-transform duration-300 ${isDeptDropdownOpen ? 'rotate-180' : ''}`}/>
                    </button>
                    {isDeptDropdownOpen && (
                        <div className="absolute top-full mt-3 right-0 w-80 bg-white rounded-[32px] shadow-2xl border border-slate-100 z-[100] p-6 animate-fade-in-up text-left">
                            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-50">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Đơn vị phụ trách</span>
                                <div className="flex items-center gap-3">
                                    <button onClick={selectAllDepts} className="text-[10px] font-black text-indigo-600 hover:text-indigo-800 uppercase transition-colors">Tất cả</button>
                                    {selectedDeptIds.length > 0 && (
                                        <button onClick={clearDepts} className="text-[10px] font-black text-rose-600 hover:text-rose-800 uppercase transition-colors">Bỏ chọn</button>
                                    )}
                                </div>
                            </div>
                            <div className="max-h-72 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-left">
                                {departments.filter(d => hasRole(currentUser!, [UserRole.ADMIN, UserRole.BAN_LANH_DAO]) || d.managerId === currentUser?.id || d.blockDirectorId === currentUser?.id || d.hrId === currentUser?.id || currentUser?.assignedDeptIds?.includes(d.id)).map(d => (
                                    <button key={d.id} onClick={() => toggleDeptSelection(d.id)} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-left ${selectedDeptIds.includes(d.id) ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-600'}`}>
                                        <div className={`shrink-0 ${selectedDeptIds.includes(d.id) ? 'text-indigo-600' : 'text-slate-300'}`}>{selectedDeptIds.includes(d.id) ? <CheckedIcon size={20}/> : <Square size={20}/>}</div>
                                        <span className="text-xs font-bold truncate leading-none uppercase tracking-tight">{d.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
              )}
          </div>
          <div className="flex items-center gap-3">
              {isManagerUp && (
                  <div className="flex p-1.5 bg-slate-100 rounded-2xl shadow-inner border border-slate-200">
                      <button onClick={() => setViewMode('PERSONAL')} className={`px-6 py-3 rounded-xl text-xs sm:text-[10px] font-black uppercase transition-all flex items-center gap-2 active:scale-95 touch-manipulation ${viewMode === 'PERSONAL' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500 active:bg-slate-100 hover:text-slate-800'}`}><UserIcon size={16}/> Cá nhân</button>
                      <button onClick={() => setViewMode('ADMIN')} className={`px-6 py-3 rounded-xl text-xs sm:text-[10px] font-black uppercase transition-all flex items-center gap-2 active:scale-95 touch-manipulation ${viewMode === 'ADMIN' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 active:bg-slate-100 hover:text-slate-800'}`}><ShieldAlert size={16}/> Quản trị</button>
                  </div>
              )}
          </div>
      </div>

      {viewMode === 'ADMIN' && adminStats ? (
          <div className="space-y-8 animate-fade-in-up text-left">
              {/* CRITICAL ATTENDANCE WARNING - NO MORE MISSING DAYS */}
              {adminStats.pendingAttendanceDays.length > 0 && (
                  <div className="bg-amber-50 border-4 border-amber-200 rounded-[40px] p-8 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6 animate-pulse">
                      <div className="flex items-center gap-6 text-left">
                          <div className="w-16 h-16 bg-amber-500 text-white rounded-2xl flex items-center justify-center shadow-lg"><Clock size={32}/></div>
                          <div className="text-left">
                              <h3 className="text-xl font-black text-amber-900 uppercase tracking-tight">Cảnh báo: Duyệt công còn sót</h3>
                              <p className="text-sm text-amber-700 font-medium mt-1">Có {adminStats.pendingAttendanceDays.length} ngày đang chờ bạn hoặc Trưởng phòng phê duyệt để chốt lương.</p>
                          </div>
                      </div>
                      <div className="flex gap-4">
                          <button 
                            onClick={() => navigate(`/timekeeping?tab=ATTENDANCE&date=${adminStats.pendingAttendanceDays[0]}`)}
                            className="px-8 py-3 bg-amber-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-200"
                          >
                            Xử lý ngày gần nhất: {formatDate(adminStats.pendingAttendanceDays[0])}
                          </button>
                      </div>
                  </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div className="bg-white p-8 rounded-[40px] shadow-xl border border-slate-100 relative group overflow-hidden transition-all hover:-translate-y-1">
                      <div className="absolute right-0 top-0 w-40 h-40 bg-indigo-50 rounded-bl-full opacity-60 -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[24px] w-fit relative z-10"><Users size={32}/></div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-10">Nhân sự hiện diện hôm nay</p>
                      <div className="mt-2 flex items-baseline gap-3 relative z-10">
                          <h3 className="text-5xl font-black text-slate-900 tracking-tighter">{adminStats.staffWorkingCount}</h3>
                          <span className="text-xl font-bold text-slate-400">/ {adminStats.totalStaff}</span>
                      </div>
                      <div className="mt-8 flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                          <span>Tỷ lệ hiện diện</span>
                          <span>{adminStats.totalStaff > 0 ? ((adminStats.staffWorkingCount/adminStats.totalStaff)*100).toFixed(0) : 0}%</span>
                      </div>
                      <div className="mt-3 w-full h-3 bg-slate-100 rounded-full border-2 border-white overflow-hidden shadow-inner">
                          <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: adminStats.totalStaff > 0 ? `${(adminStats.staffWorkingCount/adminStats.totalStaff)*100}%` : '0%' }}></div>
                      </div>
                  </div>
                  <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl relative group overflow-hidden transition-all hover:-translate-y-1">
                      <div className="absolute right-0 bottom-0 w-48 h-48 bg-white/5 rounded-full -mr-20 -mb-20"></div>
                      <div className="p-4 bg-white/10 text-amber-400 rounded-[24px] w-fit"><PieChart size={32}/></div>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-10">DỰ CHI PHẠM VI CHỌN</p>
                      <h3 className="text-4xl font-black text-white mt-2 tabular-nums tracking-tighter">{formatCurrency(adminStats.totalNetSalary)}</h3>
                      <div className="mt-8 flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest"><TrendingUp size={14}/> Ổn định so với kỳ trước</div>
                  </div>
                  <div className="bg-rose-600 p-8 rounded-[40px] shadow-2xl text-white relative group overflow-hidden transition-all hover:-translate-y-1">
                      <div className="absolute left-0 top-0 w-full h-full bg-gradient-to-br from-rose-500 to-rose-700"></div>
                      <div className="relative z-10 text-left">
                        <div className="p-4 bg-white/20 text-rose-100 rounded-[24px] w-fit shadow-lg"><Banknote size={32}/></div>
                        <p className="text-[10px] font-black text-rose-200 uppercase tracking-widest mt-10">TỔNG XỬ PHẠT VI PHẠM</p>
                        <h3 className="text-4xl font-black mt-2 tabular-nums tracking-tighter">{formatCurrency(adminStats.totalPenaltyAmount)}</h3>
                        <div className="mt-8 px-4 py-2 bg-white/10 rounded-2xl border border-white/10 w-fit text-[10px] font-black uppercase flex items-center gap-2"><AlertCircle size={14}/> Phát sinh {adminStats.bigErrors.length} lỗi trọng yếu</div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-[48px] border-4 border-slate-50 shadow-2xl overflow-hidden flex flex-col xl:flex-row text-left">
                  <div className="p-10 border-b xl:border-b-0 xl:border-r border-slate-100 bg-slate-50/30 xl:w-96 shrink-0 text-left">
                      <div className="p-5 bg-rose-50 rounded-[32px] w-fit mb-6 text-rose-600 shadow-sm border border-rose-100 text-left"><ShieldAlert size={32}/></div>
                      <h4 className="text-2xl font-black text-slate-800 tracking-tight leading-tight text-left">Cảnh Báo Kiểm Soát</h4>
                      <p className="text-sm text-slate-500 mt-3 font-medium leading-relaxed italic text-left">Tự động phát hiện các sai phạm nghiêm trọng được lọc từ hệ thống chấm công nội bộ.</p>
                      <div className="mt-10 space-y-4 text-left">
                          <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-widest border-b pb-2 text-left"><span>Loại hình</span><span>Số lượng</span></div>
                          <div className="flex justify-between font-black text-sm text-left"><span className="text-indigo-600 uppercase tracking-tighter text-left">Lương Tháng</span><span>{adminStats.bigErrors.filter(e => e.target === EvaluationTarget.MONTHLY_SALARY).length}</span></div>
                          <div className="flex justify-between font-black text-sm text-left"><span className="text-purple-600 uppercase tracking-tighter text-left">Thưởng Treo</span><span>{adminStats.bigErrors.filter(e => e.target === EvaluationTarget.RESERVED_BONUS).length}</span></div>
                      </div>
                  </div>
                  <div className="flex-1 flex flex-col h-[500px] text-left">
                      <div className="p-8 border-b bg-white flex justify-between items-center sticky top-0 z-10 shadow-sm text-left">
                          <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">Nhật ký sai phạm theo luồng</span>
                          <button onClick={() => navigate('/timekeeping?tab=EVALUATION')} className="text-[11px] font-black text-indigo-600 hover:underline uppercase flex items-center gap-2 text-left">Xem toàn bộ <ChevronRight size={14}/></button>
                      </div>
                      <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/10 text-left">
                          {adminStats.bigErrors.length > 0 ? adminStats.bigErrors.map(e => (
                              <div key={e.id} className="p-8 border-b border-slate-50 hover:bg-white transition-all group flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left">
                                  <div className="flex gap-6 items-start text-left">
                                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border-2 shadow-sm text-left ${e.target === EvaluationTarget.RESERVED_BONUS ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                          {e.target === EvaluationTarget.RESERVED_BONUS ? <RotateCcw size={28}/> : <AlertTriangle size={28}/>}
                                      </div>
                                      <div className="text-left text-left text-left">
                                          <p className="font-black text-slate-900 text-lg uppercase tracking-tighter leading-none text-left text-left">{e.userName}</p>
                                          <div className="flex items-center flex-wrap gap-2 mt-2 text-left text-left">
                                              <span className="px-3 py-1 bg-slate-900 text-white text-[9px] font-black rounded-lg uppercase tracking-widest shadow-md text-left text-left">{e.target === EvaluationTarget.RESERVED_BONUS ? `-${formatCurrency(e.points)} TIỀN MẶT` : `-${Math.abs(e.points)} ĐIỂM KPI`}</span>
                                              <span className="text-[10px] font-black text-rose-500 uppercase tracking-tighter bg-rose-50 px-2 py-0.5 rounded border border-rose-100 text-left text-left">{e.criteriaName}</span>
                                          </div>
                                          <p className="text-sm text-slate-500 italic mt-4 leading-relaxed font-medium text-left">"{e.description}"</p>
                                      </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                      <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{formatDateTime(e.createdAt)}</div>
                                      <div className="mt-3 flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                          <button onClick={() => navigate(`/timekeeping?tab=EVALUATION&evalId=${e.id}`)} className="px-5 py-3 bg-slate-900 text-white rounded-xl text-xs sm:text-[9px] font-black uppercase shadow-lg active:scale-95 touch-manipulation text-left">Xử lý</button>
                                      </div>
                                  </div>
                              </div>
                          )) : (
                              <div className="flex flex-col items-center justify-center h-full text-slate-300 text-left">
                                  <div className="p-10 bg-emerald-50 text-emerald-500 rounded-full mb-6 border-4 border-white shadow-xl shadow-emerald-500/10 text-left"><ShieldCheck size={64}/></div>
                                  <h5 className="text-sm font-black uppercase tracking-[0.3em] text-left">Môi trường ổn định</h5>
                                  <p className="text-xs text-slate-400 mt-2 italic text-left">Chưa ghi nhận sai phạm trọng yếu trong dải thời gian này.</p>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      ) : (
          <div className="space-y-10 animate-fade-in-up text-left">
              <div className="bg-white rounded-[60px] border-4 border-slate-50 p-10 flex flex-col xl:flex-row items-center gap-12 shadow-2xl relative overflow-hidden group text-left">
                   <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-50/50 rounded-full -mr-48 -mt-48 transition-transform group-hover:scale-110 duration-1000"></div>
                   <div className="relative shrink-0 text-left">
                       <div className="w-48 h-48 rounded-[56px] p-1.5 bg-gradient-to-tr from-indigo-600 via-purple-500 to-rose-400 shadow-2xl relative overflow-hidden text-left">
                          <img src={currentUser?.avatar} className="w-full h-full rounded-[52px] border-8 border-white object-cover shadow-inner text-left"/>
                       </div>
                       <div className="absolute -bottom-4 -right-4 bg-white p-2 rounded-[24px] shadow-2xl text-left text-left"><div className="bg-emerald-500 text-white p-3 rounded-[20px] shadow-lg border-2 border-emerald-100 animate-bounce text-left text-left"><BadgeCheck size={32}/></div></div>
                   </div>
                   <div className="text-center xl:text-left relative z-10 flex-1 text-left text-left">
                       <div className="flex flex-col xl:flex-row xl:items-end gap-5 text-left text-left">
                           <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-none text-left text-left">{(() => {
                             const name = currentUser?.name || '';
                             // Bỏ phần (Thời gian) hoặc (Khoán) nếu có
                             const cleanName = name.replace(/\s*\(Thời gian\)/gi, '').replace(/\s*\(Khoán\)/gi, '').replace(/\s*\(Thời Gian\)/gi, '');
                             return cleanName;
                           })()}</h2>
                           <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-full uppercase tracking-widest mb-1 border border-indigo-100 shadow-sm text-left text-left">{currentUser?.currentPosition}</span>
                       </div>
                       <div className="mt-12 flex flex-wrap justify-center xl:justify-start gap-12 text-left text-left text-left">
                           <div className="text-left border-l-4 border-indigo-500 pl-4 py-1 text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left text-left text-left">Mã nhân sự</p><p className="text-lg font-black text-slate-800 tracking-tight text-left text-left text-left">#{currentUser?.id}</p></div>
                           <div className="text-left border-l-4 border-purple-500 pl-4 py-1 text-left text-left text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left text-left text-left text-left">Gia nhập</p><p className="text-lg font-black text-slate-800 tracking-tight text-left text-left text-left text-left">{currentUser?.joinDate}</p></div>
                           <div className="text-left border-l-4 border-amber-500 pl-4 py-1 text-left text-left text-left text-left text-left"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-left text-left text-left text-left text-left">Đơn vị</p><p className="text-lg font-black text-slate-800 tracking-tight text-left text-left text-left text-left text-left">{departments.find(d => d.id === currentUser?.currentDeptId)?.name}</p></div>
                       </div>
                   </div>
                   <div className="shrink-0 w-full xl:w-auto relative z-10 space-y-4 text-left">
                        <button onClick={() => navigate('/employees')} className="w-full xl:w-64 py-5 bg-slate-900 text-white rounded-[32px] font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-black transition-all flex items-center justify-center gap-3 active:scale-95 touch-manipulation border border-white/10 text-left text-left">Hồ sơ năng lực <ArrowRight size={18}/></button>
                   </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-left text-left text-left text-left text-left">
                  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl group hover:border-indigo-300 transition-all hover:shadow-indigo-500/10 text-left text-left text-left text-left text-left">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[28px] w-fit shadow-md text-left text-left text-left text-left text-left text-left"><Clock size={32}/></div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 text-left text-left text-left text-left text-left text-left">Công lũy kế</p>
                      <h3 className="text-5xl font-black text-slate-900 mt-3 tracking-tighter text-left text-left text-left text-left text-left">{personalStats.totalWorkDays.toFixed(1)} <span className="text-sm text-slate-400 font-bold uppercase tracking-widest ml-1 text-left text-left text-left text-left text-left text-left text-left">Ngày</span></h3>
                  </div>
                  <div className="bg-emerald-600 p-10 rounded-[48px] shadow-2xl text-white group relative overflow-hidden hover:-translate-y-1 transition-all text-left text-left text-left text-left text-left text-left">
                      <div className="absolute right-0 top-0 w-32 h-32 bg-white/10 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-700 text-left text-left text-left text-left text-left"></div>
                      <div className="p-4 bg-white/20 text-emerald-100 rounded-[28px] w-fit shadow-xl text-left text-left text-left text-left text-left text-left text-left text-left"><Wallet size={32}/></div>
                      <p className="text-[11px] font-black text-emerald-100 uppercase tracking-[0.2em] mt-8 opacity-80 text-left text-left text-left text-left text-left text-left text-left">Lương Thực Lĩnh</p>
                      <h3 className="text-4xl font-black mt-3 tabular-nums tracking-tighter text-left text-left text-left text-left text-left text-left text-left text-left">{formatCurrency(personalStats.tempNetSalary)}</h3>
                  </div>
                  <div className="bg-white p-10 rounded-[48px] border border-slate-100 shadow-xl border-l-8 border-l-rose-500 hover:shadow-rose-500/10 transition-all text-left text-left text-left text-left text-left text-left text-left">
                      <div className="p-4 bg-rose-50 text-rose-600 rounded-[28px] w-fit shadow-md text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><AlertCircle size={32}/></div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mt-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left">Vi phạm kỷ luật</p>
                      <h3 className="text-4xl font-black text-rose-600 mt-3 tabular-nums tracking-tighter text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{formatCurrency(personalStats.totalPenaltyAccumulated)}</h3>
                  </div>
                  <div className="bg-amber-500 p-10 rounded-[48px] shadow-2xl text-white group overflow-hidden relative border-l-8 border-l-amber-600 hover:-translate-y-1 transition-all text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                      <div className="absolute right-0 bottom-0 opacity-10 rotate-12 -mr-8 -mb-8 transition-transform group-hover:scale-125 duration-1000 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"> <RotateCcw size={150}/></div>
                      <div className="p-4 bg-white/20 text-amber-100 rounded-[28px] w-fit shadow-xl text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><TrendingUp size={32}/></div>
                      <p className="text-[11px] font-black text-amber-100 uppercase tracking-[0.2em] mt-8 opacity-80 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Thưởng Treo Còn Lại</p>
                      <h3 className="text-4xl font-black mt-3 tabular-nums tracking-tighter text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">{formatCurrency(personalStats.reservedBonusLeft)}</h3>
                  </div>
              </div>

              {/* Block chi tiết lương trong ngày */}
              <div className="bg-white rounded-[40px] border-4 border-indigo-100 shadow-xl p-8 text-left">
                  <div className="flex items-center gap-4 mb-6">
                      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-[24px] shadow-md"><Calendar size={32}/></div>
                      <div>
                          <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Chi Tiết Lương Trong Ngày</h3>
                          <p className="text-sm text-slate-500 font-medium mt-1">Ngày {formatDate(endDate)}</p>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      {/* Lương cơ bản trong ngày */}
                      <div className="p-6 bg-slate-50 rounded-[24px] border-2 border-slate-200">
                          <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-black text-slate-600 uppercase">Lương Cơ Bản</p>
                              <DollarSign size={20} className="text-slate-400"/>
                          </div>
                          <h3 className="text-3xl font-black text-slate-900 tabular-nums">{formatCurrency(personalStats.dailySalary)}</h3>
                      </div>

                      {/* KPI Net (cộng/trừ) */}
                      <div className={`p-6 rounded-[24px] border-2 ${personalStats.dailyKpiNetAmount >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                              <p className={`text-sm font-black uppercase ${personalStats.dailyKpiNetAmount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>Điều Chỉnh KPI</p>
                              <Target size={20} className={personalStats.dailyKpiNetAmount >= 0 ? 'text-emerald-500' : 'text-rose-500'}/>
                          </div>
                          <h3 className={`text-3xl font-black tabular-nums ${personalStats.dailyKpiNetAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {personalStats.dailyKpiNetAmount >= 0 ? '+' : ''}{formatCurrency(personalStats.dailyKpiNetAmount)}
                          </h3>
                          <p className="text-xs text-slate-500 mt-2">
                              {personalStats.dailyKpiBonusAmount > 0 && <span className="text-emerald-600">+{formatCurrency(personalStats.dailyKpiBonusAmount)} thưởng</span>}
                              {personalStats.dailyKpiBonusAmount > 0 && personalStats.dailyKpiPenaltyAmount > 0 && <span className="mx-2">|</span>}
                              {personalStats.dailyKpiPenaltyAmount > 0 && <span className="text-rose-600">-{formatCurrency(personalStats.dailyKpiPenaltyAmount)} phạt</span>}
                          </p>
                      </div>
                  </div>

                  {/* Tổng lương trong ngày */}
                  <div className="p-6 bg-indigo-50 rounded-[24px] border-2 border-indigo-200 mb-6">
                      <div className="flex items-center justify-between">
                          <p className="text-lg font-black text-indigo-900 uppercase">Tổng Lương Trong Ngày</p>
                          <h3 className="text-4xl font-black text-indigo-600 tabular-nums">
                              {formatCurrency(personalStats.dailySalary + personalStats.dailyKpiNetAmount)}
                          </h3>
                      </div>
                  </div>

                  {/* Chi tiết các khoản KPI */}
                  {personalStats.dailyKpiItems.length > 0 && (
                      <div className="space-y-3">
                          <h4 className="text-lg font-black text-slate-800 uppercase mb-4">Chi Tiết Điều Chỉnh KPI</h4>
                          {personalStats.dailyKpiItems.map((item) => (
                              <div key={item.id} className={`p-5 rounded-[20px] border-2 ${item.type === 'BONUS' ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                                  <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                          <div className="flex items-center gap-3 mb-2">
                                              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${item.type === 'BONUS' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-rose-100 text-rose-700 border-rose-200'}`}>
                                                  {item.type === 'BONUS' ? 'Thưởng' : 'Phạt'}
                                              </span>
                                              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase border border-slate-200">{item.groupName}</span>
                                              <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase border border-slate-200">{item.criteriaName}</span>
                                          </div>
                                          <p className="text-sm font-bold text-slate-700 mb-2">{item.description || 'Không có mô tả'}</p>
                                          <div className="flex items-center gap-4 text-xs text-slate-500">
                                              <span>Giá trị: <span className="font-black text-slate-700">{item.value}%</span></span>
                                              <span>Trọng số: <span className="font-black text-slate-700">{item.weight}%</span></span>
                                              <span className={`font-black ${item.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                  % Lương HQ: {item.kpiPercentage.toFixed(2)}%
                                              </span>
                                          </div>
                                      </div>
                                      <div className="text-right shrink-0">
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Số Tiền</p>
                                          <p className={`text-2xl font-black tabular-nums ${item.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                              {item.type === 'BONUS' ? '+' : '-'}{formatCurrency(Math.abs(item.kpiAmount))}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>

          </div>
      )}
    </div>
  );
};

export default Dashboard;
