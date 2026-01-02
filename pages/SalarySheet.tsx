
import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    Search, Calculator, Plus, Trash2, Info, X, Eye, Printer, ThumbsUp, ThumbsDown,
    Calendar, Target, CreditCard, Briefcase, ChevronDown, Package, History, Landmark,
    DollarSign, Banknote, FileSpreadsheet, Check, Loader2, ShieldAlert, Zap, TrendingUp, AlertCircle, FileText,
    Layers, ShieldCheck, Send
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { RecordStatus, UserRole, SalaryRecord, PieceworkConfig, AttendanceType, EvaluationTarget, User } from '../types';
import { getNextPendingStatus, hasRole, canApproveStatus } from '../utils/rbac';
import * as XLSX from 'xlsx';

// CSS cho print
const printStyles = `
  @media print {
    @page {
      size: A4;
      margin: 0.5cm;
    }
    body * {
      visibility: hidden;
    }
    .printable-area, .printable-area * {
      visibility: visible;
    }
    .printable-area {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      background: white;
      padding: 1cm;
    }
    .no-print, .no-print * {
      display: none !important;
    }
    .print-only {
      display: block !important;
    }
    .print-only table {
      page-break-inside: avoid;
    }
  }
`;

const SalarySheet: React.FC = () => {
  // Inject print styles
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = printStyles;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);
  const { 
    salaryRecords, currentUser, updateSalaryStatus, 
    calculateMonthlySalary, canActionSalary, addSalaryAdjustment, 
    deleteSalaryAdjustment, systemConfig, allUsers, departments,
    pieceworkConfigs, dailyAttendance, evaluationRequests,
    updateAdvancePayment, savePieceworkConfigs, showToast,
    systemRoles, approvalWorkflows, addNotification
  } = useAppContext();

  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<'SUMMARY' | 'DETAILED_REPORT'>('SUMMARY');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));
  const [selectedDeptId, setSelectedDeptId] = useState('ALL');
  
  // Handle Deep Links from Notifications
  useEffect(() => {
    const monthParam = searchParams.get('month');
    const recordIdParam = searchParams.get('recordId');
    
    if (monthParam) setSelectedMonth(monthParam);
    
    // Scroll đến salary record cụ thể nếu có recordId
    if (recordIdParam) {
      setTimeout(() => {
        const element = document.getElementById(`salary-record-${recordIdParam}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('ring-4', 'ring-indigo-500', 'ring-offset-2', 'bg-indigo-50');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-indigo-500', 'ring-offset-2', 'bg-indigo-50');
          }, 3000);
        }
      }, 500);
    }
  }, [searchParams]);
  
  const [adjustingRecord, setAdjustingRecord] = useState<SalaryRecord | null>(null);
  const [detailedRecord, setDetailedRecord] = useState<SalaryRecord | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{id: string, isOpen: boolean}>({id: '', isOpen: false});
  const [rejectionReason, setRejectionReason] = useState('');
  
  const [advanceModal, setAdvanceModal] = useState<{ recordId: string, name: string, current: number, isOpen: boolean, status: RecordStatus }>({ recordId: '', name: '', current: 0, isOpen: false, status: RecordStatus.DRAFT });

  const [isPieceworkModalOpen, setIsPieceworkModalOpen] = useState(false);
  const [pieceworkBuffer, setPieceworkBuffer] = useState<Record<string, number>>({});

  const [activeTooltip, setActiveTooltip] = useState<{
    type: 'LCB' | 'LHQ_LSL' | 'L_K' | 'KH_TRU' | 'PC' | 'THUONG' | 'NET';
    data: SalaryRecord;
    rect: DOMRect;
  } | null>(null);

  useEffect(() => {
    if (selectedMonth) {
        calculateMonthlySalary(selectedMonth);
    }
  }, [selectedMonth, dailyAttendance, evaluationRequests, pieceworkConfigs, allUsers, systemConfig]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const filtered = useMemo(() => {
    if (!currentUser) return [];
    return (salaryRecords || []).filter(r => {
        const matchMonth = r.date === selectedMonth;
        const matchSearch = r.userName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchDept = selectedDeptId === 'ALL' || r.department === selectedDeptId;

        if (hasRole(currentUser, [UserRole.ADMIN, UserRole.BAN_LANH_DAO])) return matchSearch && matchMonth && matchDept;
        if (currentUser.roles.includes(UserRole.KE_TOAN_LUONG)) return matchSearch && matchMonth && matchDept && currentUser.assignedDeptIds?.includes(r.department);
        
        const dept = departments.find(d => d.id === r.department);
        const isSupervisor = dept?.managerId === currentUser.id || dept?.blockDirectorId === currentUser.id || dept?.hrId === currentUser.id;
        const isSelf = r.userId === currentUser.id;
        
        return matchMonth && matchDept && (isSupervisor ? matchSearch : isSelf);
    });
  }, [salaryRecords, searchTerm, selectedMonth, selectedDeptId, currentUser, departments]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, curr) => ({
        base: acc.base + curr.actualBaseSalary,
        efficiency: acc.efficiency + curr.actualEfficiencySalary,
        piecework: acc.piecework + curr.actualPieceworkSalary,
        other: acc.other + curr.otherSalary,
        net: acc.net + curr.netSalary
    }), { base: 0, efficiency: 0, piecework: 0, other: 0, net: 0 });
  }, [filtered]);

  const handleAction = (id: string, action: 'SUBMIT' | 'APPROVE' | 'REJECT') => {
    const record = salaryRecords.find(r => r.id === id);
    if (!record) return;
    if (action === 'SUBMIT') {
        const beneficiary = allUsers.find(u => u.id === record.userId);
        if (beneficiary) {
            const nextStatus = getNextPendingStatus(beneficiary, systemConfig.approvalWorkflow, RecordStatus.DRAFT, systemRoles, 'SALARY', approvalWorkflows);
            updateSalaryStatus(id, nextStatus);
            
            // Tạo notification cho người có quyền phê duyệt
            if (nextStatus !== RecordStatus.APPROVED && nextStatus !== RecordStatus.DRAFT) {
                const dept = departments.find(d => d.id === record.department);
                let approverUsers: User[] = [];
                
                if (nextStatus === RecordStatus.PENDING_MANAGER && dept?.managerId) {
                    const manager = allUsers.find(u => u.id === dept.managerId);
                    if (manager) approverUsers.push(manager);
                } else if (nextStatus === RecordStatus.PENDING_GDK) {
                    approverUsers = allUsers.filter(u => u.roles.includes(UserRole.GIAM_DOC_KHOI) && departments.some(d => d.blockDirectorId === u.id && d.id === record.department));
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
                        title: 'Bảng lương cần duyệt',
                        content: `${currentUser?.name} đã gửi bảng lương tháng ${record.date} của ${record.userName} chờ bạn phê duyệt.`,
                        type: 'WARNING',
                        actionUrl: `/salary?month=${record.date}&recordId=${id}`
                    });
                });
            }
        }
    } else if (action === 'APPROVE') {
        const beneficiary = allUsers.find(u => u.id === record.userId);
        if (beneficiary) {
            const nextStatus = getNextPendingStatus(beneficiary, systemConfig.approvalWorkflow, record.status, systemRoles, 'SALARY', approvalWorkflows);
            updateSalaryStatus(id, nextStatus);
            
            // Tạo notification cho bước tiếp theo nếu còn
            if (nextStatus !== RecordStatus.APPROVED && nextStatus !== RecordStatus.DRAFT) {
                const dept = departments.find(d => d.id === record.department);
                let approverUsers: User[] = [];
                
                if (nextStatus === RecordStatus.PENDING_MANAGER && dept?.managerId) {
                    const manager = allUsers.find(u => u.id === dept.managerId);
                    if (manager) approverUsers.push(manager);
                } else if (nextStatus === RecordStatus.PENDING_GDK) {
                    approverUsers = allUsers.filter(u => u.roles.includes(UserRole.GIAM_DOC_KHOI) && departments.some(d => d.blockDirectorId === u.id && d.id === record.department));
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
                        title: 'Bảng lương cần duyệt',
                        content: `Bảng lương tháng ${record.date} của ${record.userName} đã được phê duyệt bước trước, chờ bạn phê duyệt tiếp.`,
                        type: 'WARNING',
                        actionUrl: `/salary?month=${record.date}&recordId=${id}`
                    });
                });
            }
        }
    } else if (action === 'REJECT') {
        setRejectionModal({ id, isOpen: true });
    }
  };

  const handleOpenPieceworkModal = () => {
    const pieceworkUsers = allUsers.filter(u => u.paymentType === 'PIECEWORK');
    const buffer: Record<string, number> = {};
    pieceworkUsers.forEach(u => {
        const existing = pieceworkConfigs.find(c => c.userId === u.id && c.month === selectedMonth);
        buffer[u.id] = existing?.targetOutput || 0;
    });
    setPieceworkBuffer(buffer);
    setIsPieceworkModalOpen(true);
  };

  const handleSavePiecework = () => {
      const configs: PieceworkConfig[] = Object.entries(pieceworkBuffer).map(([userId, target]) => ({
          id: `PW_${userId}_${selectedMonth}`,
          userId,
          month: selectedMonth,
          targetOutput: Number(target) || 0,
          unitPrice: allUsers.find(u => u.id === userId)?.pieceworkUnitPrice || 0
      }));
      savePieceworkConfigs(configs);
      setIsPieceworkModalOpen(false);
  };

  const handleExportXLSX = () => {
    if (activeTab === 'SUMMARY') {
        const data = filtered.map(r => ({
            "Mã NV": r.userId,
            "Họ Tên": r.userName,
            "Kỳ": r.date,
            "Lương CB Thực": r.actualBaseSalary,
            "Lương HQ/LSL Thực": r.actualEfficiencySalary + r.actualPieceworkSalary,
            "Lương Khác": r.otherSalary,
            "Phụ Cấp": r.totalAllowance,
            "Thưởng": r.totalBonus,
            "Khấu Trừ": r.insuranceDeduction + r.pitDeduction + r.unionFee + r.advancePayment + r.otherDeductions,
            "Thực Lĩnh (NET)": r.netSalary,
            "Trạng thái": r.status
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bang_Luong_Tong_Hop");
        XLSX.writeFile(wb, `Bang_Luong_Tong_Hop_${selectedMonth}.xlsx`);
    } else {
        const data = filtered.map(r => ({
            "Mã NV": r.userId,
            "Họ Tên": r.userName,
            "Ctc": r.Ctc,
            "Ctt": r.Ctt,
            "LCB Định mức": r.LCB_dm,
            "LCB Thực tế": r.actualBaseSalary,
            "LHQ Định mức": r.LHQ_dm,
            "LHQ Thực tế": r.actualEfficiencySalary,
            "LSL Định mức": r.LSL_dm,
            "LSL Thực tế": r.actualPieceworkSalary,
            "Hệ số thâm niên": r.HS_tn,
            "Phụ cấp PC_cd": r.totalAllowance,
            "Thưởng TH_cd": r.totalBonus,
            "Lương Tăng ca": r.overtimeSalary,
            "Lương Khác": r.otherSalary,
            "Tổng GROSS": r.calculatedSalary,
            "BHXH (10.5%)": r.insuranceDeduction,
            "Kinh phí CĐ": r.unionFee,
            "Thuế TNCN": r.pitDeduction,
            "Tạm ứng": r.advancePayment,
            "Khấu trừ khác": r.otherDeductions,
            "Tỷ lệ thử việc (%)": r.probationRate,
            "THỰC LĨNH (NET)": r.netSalary
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Bang_Luong_Chi_Tiet");
        XLSX.writeFile(wb, `Bang_Luong_Chi_Tiet_${selectedMonth}.xlsx`);
    }
    showToast("Đã xuất file báo cáo Excel", "SUCCESS");
  };

  const getStatusBadge = (record: SalaryRecord) => {
    const status = record.status;
    switch (status) {
      case RecordStatus.DRAFT: return <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-black border border-slate-200 uppercase tracking-tighter shadow-sm">Bản Nháp</span>;
      case RecordStatus.APPROVED: return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-black border border-emerald-200 uppercase tracking-tighter shadow-sm">Đã Phê Duyệt</span>;
      case RecordStatus.PENDING_MANAGER: return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black border border-blue-200 uppercase tracking-tighter shadow-sm">Chờ Quản Lý</span>;
      case RecordStatus.PENDING_GDK: return <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black border border-indigo-200 uppercase tracking-tighter shadow-sm">Chờ GĐ Khối</span>;
      case RecordStatus.PENDING_BLD: return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black border border-amber-200 uppercase tracking-tighter shadow-sm">Chờ Ban LĐ</span>;
      case RecordStatus.PENDING_HR: return <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[9px] font-black border border-purple-200 uppercase tracking-tighter shadow-sm">Chờ Hậu Kiểm</span>;
      default: return <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-[9px] font-black border border-rose-200 uppercase tracking-tighter shadow-sm">Từ Chối</span>;
    }
  };

  const isOperator = hasRole(currentUser!, [UserRole.ADMIN, UserRole.KE_TOAN_LUONG]);

  return (
    <div className="space-y-8 pb-20 animate-fade-in text-left relative">
      {/* TOOLTIP PHÂN RÃ CÔNG THỨC */}
      {activeTooltip && (
          <div 
            className="fixed z-[9999] bg-slate-900 text-white p-6 rounded-[24px] shadow-2xl w-80 pointer-events-none animate-fade-in-up border border-white/10"
            style={{ 
                left: Math.min(window.innerWidth - 340, activeTooltip.rect.left), 
                top: activeTooltip.rect.bottom + 10 
            }}
          >
              <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                <Calculator size={14} className="text-indigo-400"/>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Phân rã logic tính toán</span>
              </div>
              <div className="space-y-3">
                  {(() => {
                      const { data, type } = activeTooltip;
                      const info = data.calculationLog ? JSON.parse(data.calculationLog) : {};
                      const adjs = data.adjustments || [];
                      
                      switch(type) {
                          case 'LCB': return (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 italic">"Lương CB thực tế = (LCB_dm / Ctc) * Ctt"</p>
                                <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                                    <div className="flex justify-between"><span>Định mức:</span><span>{data.LCB_dm.toLocaleString()}</span></div>
                                    <div className="flex justify-between"><span>Công chuẩn:</span><span>{data.Ctc}</span></div>
                                    <div className="flex justify-between text-indigo-400"><span>Công thực:</span><span>{data.Ctt}</span></div>
                                    <div className="border-t border-white/10 mt-1 pt-1 flex justify-between font-black text-indigo-300"><span>Kết quả:</span><span>{data.actualBaseSalary.toLocaleString()}</span></div>
                                </div>
                              </div>
                          );
                          case 'LHQ_LSL': return (
                              <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 italic">"LHQ/LSL thực tế = (Định mức / Ctc * Ctt) +/- Tiền KPI"</p>
                                <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                                    <div className="flex justify-between"><span>Lương KPI ĐM:</span><span>{(data.LHQ_dm + data.LSL_dm).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-emerald-400"><span>Thưởng KPI:</span><span>+{(info.total_CO_tc * (data.LHQ_dm || data.LSL_dm)).toLocaleString()}</span></div>
                                    <div className="flex justify-between text-rose-400"><span>Phạt KPI:</span><span>-{(info.total_TR_tc * (data.LHQ_dm || data.LSL_dm)).toLocaleString()}</span></div>
                                    <div className="border-t border-white/10 mt-1 pt-1 flex justify-between font-black text-indigo-300"><span>Kết quả:</span><span>{(data.actualEfficiencySalary + data.actualPieceworkSalary).toLocaleString()}</span></div>
                                </div>
                              </div>
                          );
                          case 'L_K': return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 italic">"Tổng các khoản lương biến động & OT"</p>
                              <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                                  <div className="flex justify-between"><span>Tăng ca (OT):</span><span>{(info.Ltc || 0).toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span>Công nhật:</span><span>{(info.Lcn || 0).toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span>Nghỉ lễ/phép:</span><span>{(info.Lncl || 0).toLocaleString()}</span></div>
                                  <div className="flex justify-between text-blue-400"><span>Điều chỉnh tay:</span><span>{adjs.filter(a=>a.type==='OTHER_SALARY').reduce((s,a)=>s+a.amount,0).toLocaleString()}</span></div>
                                  <div className="border-t border-white/10 mt-1 pt-1 flex justify-between font-black text-indigo-300"><span>Tổng:</span><span>{data.otherSalary.toLocaleString()}</span></div>
                              </div>
                            </div>
                          );
                          case 'KH_TRU': return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 italic">"Tổng các khoản khấu trừ nghĩa vụ & tài chính"</p>
                              <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-1 text-rose-300">
                                  <div className="flex justify-between"><span>BHXH (10.5%):</span><span>-{data.insuranceDeduction.toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span>Công đoàn (1%):</span><span>-{data.unionFee.toLocaleString()}</span></div>
                                  <div className="flex justify-between"><span>Thuế TNCN:</span><span>-{data.pitDeduction.toLocaleString()}</span></div>
                                  <div className="flex justify-between font-black"><span>Tạm ứng (TU):</span><span>-{data.advancePayment.toLocaleString()}</span></div>
                                  <div className="flex justify-between italic"><span>Khác:</span><span>-{data.otherDeductions.toLocaleString()}</span></div>
                              </div>
                            </div>
                          );
                          case 'NET': return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 italic">"Net = (Gross - Khấu trừ - Tạm ứng) * Thử việc"</p>
                              <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                                  <div className="flex justify-between"><span>Tổng Gross:</span><span>{data.calculatedSalary.toLocaleString()}</span></div>
                                  <div className="flex justify-between text-rose-400"><span>Khấu trừ & TU:</span><span>-{(data.insuranceDeduction + data.unionFee + data.pitDeduction + data.otherDeductions + data.advancePayment).toLocaleString()}</span></div>
                                  {data.probationRate < 100 && (
                                    <div className="flex justify-between text-amber-400"><span>Tỷ lệ thử việc:</span><span>x {data.probationRate}%</span></div>
                                  )}
                                  <div className="border-t border-white/10 mt-1 pt-1 flex justify-between font-black text-emerald-400"><span>Thực lĩnh:</span><span>{data.netSalary.toLocaleString()}</span></div>
                              </div>
                            </div>
                          );
                          case 'PC': return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 italic">"Phụ cấp = PC_cố định + PC_linh hoạt"</p>
                              <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                                  <div className="flex justify-between"><span>Phụ cấp cố định:</span><span>{(data.totalAllowance - adjs.filter(a=>a.type==='ALLOWANCE').reduce((s,a)=>s+a.amount,0)).toLocaleString()}</span></div>
                                  <div className="flex justify-between text-emerald-400"><span>Phụ cấp linh hoạt:</span><span>+{adjs.filter(a=>a.type==='ALLOWANCE').reduce((s,a)=>s+a.amount,0).toLocaleString()}</span></div>
                                  <div className="border-t border-white/10 mt-1 pt-1 flex justify-between font-black text-blue-300"><span>Tổng phụ cấp:</span><span>{data.totalAllowance.toLocaleString()}</span></div>
                              </div>
                            </div>
                          );
                          case 'THUONG': return (
                            <div className="space-y-2">
                              <p className="text-[10px] font-bold text-slate-400 italic">"Thưởng = TH_định kỳ + TH_linh hoạt"</p>
                              <div className="font-mono text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 space-y-1">
                                  <div className="flex justify-between"><span>Thưởng định kỳ:</span><span>{(data.totalBonus - adjs.filter(a=>a.type==='BONUS').reduce((s,a)=>s+a.amount,0)).toLocaleString()}</span></div>
                                  <div className="flex justify-between text-amber-400"><span>Thưởng linh hoạt:</span><span>+{adjs.filter(a=>a.type==='BONUS').reduce((s,a)=>s+a.amount,0).toLocaleString()}</span></div>
                                  <div className="border-t border-white/10 mt-1 pt-1 flex justify-between font-black text-amber-300"><span>Tổng thưởng:</span><span>{data.totalBonus.toLocaleString()}</span></div>
                              </div>
                            </div>
                          );
                          default: return <p className="text-xs italic text-slate-400">Đang cập nhật phân rã cho mục này...</p>;
                      }
                  })()}
              </div>
          </div>
      )}

      {/* HEADER SECTION */}
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-200/60 flex flex-col xl:flex-row justify-between items-center gap-8 no-print">
        <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-indigo-600 rounded-[28px] flex items-center justify-center text-white shadow-xl shadow-indigo-100"><DollarSign size={32}/></div>
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Quyết Toán & Phân Rã Lương</h1>
                <p className="text-sm text-slate-500 font-medium mt-1">Dữ liệu tính từ Chấm công và KPI đã phê duyệt.</p>
            </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-4 rounded-[32px] border border-slate-100">
            <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Kỳ quyết toán</label>
                <input type="month" className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black outline-none focus:border-indigo-500" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}/>
            </div>
            <div className="flex flex-col">
                <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Đơn vị / Phòng ban</label>
                <select className="px-5 py-2.5 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black outline-none focus:border-indigo-500 min-w-[220px] uppercase tracking-tighter" value={selectedDeptId} onChange={e => setSelectedDeptId(e.target.value)}>
                    <option value="ALL">Toàn bộ công ty</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>
            <div className="flex items-end gap-3">
                <button 
                    onClick={handleOpenPieceworkModal}
                    className="px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all"
                >
                    <Package size={16}/> Nhập SL Khoán
                </button>
                <button 
                    onClick={handleExportXLSX}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"
                >
                    <FileSpreadsheet size={16}/> Xuất Báo Cáo Excel
                </button>
            </div>
        </div>
      </div>

      {/* Tab Mode Selection */}
      <div className="flex gap-4 no-print">
          <button 
            onClick={() => setActiveTab('SUMMARY')}
            className={`px-8 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'SUMMARY' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
          >
              <Layers size={18}/> Bảng lương tổng hợp
          </button>
          <button 
            onClick={() => setActiveTab('DETAILED_REPORT')}
            className={`px-8 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all ${activeTab === 'DETAILED_REPORT' ? 'bg-slate-900 text-white shadow-2xl' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}
          >
              <Calculator size={18}/> BẢNG LƯƠNG CHI TIẾT
          </button>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden">
          <div className="p-6 border-b bg-slate-50/50 flex flex-col md:flex-row justify-between items-center px-10 gap-6">
              <div className="relative w-full md:w-96">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                  <input 
                    type="text" 
                    placeholder="Tìm theo tên nhân viên..." 
                    className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
              </div>
              <div className="flex gap-10">
                  <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tổng thực lĩnh (Net)</p>
                      <p className="text-xl font-black text-emerald-600 tabular-nums">{formatCurrency(totals.net)}</p>
                  </div>
              </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
              {activeTab === 'SUMMARY' ? (
                  <table className="w-full text-left text-xs table-fixed min-w-[1600px]">
                      <thead className="bg-slate-900 text-white font-black uppercase text-[9px] tracking-[0.2em] sticky top-0 z-10">
                          <tr>
                              <th className="px-8 py-6 w-64 sticky left-0 bg-slate-900 z-20 shadow-right">Nhân sự</th>
                              <th className="px-4 py-6 w-32">Lương CB Thực</th>
                              <th className="px-4 py-6 w-32">LHQ / LSL Thực</th>
                              <th className="px-4 py-6 w-32">Lương Khác</th>
                              <th className="px-4 py-6 w-32">Phụ Cấp</th>
                              <th className="px-4 py-6 w-32 text-amber-400">Thưởng</th>
                              <th className="px-4 py-6 w-32 text-rose-400">Khấu Trừ</th>
                              <th className="px-4 py-6 w-32 bg-emerald-800">Thực Lĩnh (NET)</th>
                              <th className="px-4 py-6 w-32">Trạng thái</th>
                              <th className="px-8 py-6 text-right w-56">Thao tác</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filtered.map(r => {
                              const totalKT = r.insuranceDeduction + r.pitDeduction + r.unionFee + r.advancePayment + r.otherDeductions;
                              const isDraft = r.status === RecordStatus.DRAFT;
                              return (
                              <tr key={r.id} id={`salary-record-${r.id}`} className="hover:bg-indigo-50/30 transition-all">
                                  <td className="px-8 py-5 sticky left-0 bg-white z-10 border-r shadow-right">
                                      <div className="flex items-center gap-4 text-left">
                                          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs">{r.userName.charAt(0)}</div>
                                          <div className="overflow-hidden text-left">
                                              <p className="font-black text-slate-800 text-sm truncate">{r.userName}</p>
                                              <p className="text-[9px] text-slate-400 font-bold uppercase truncate">{r.positionName}</p>
                                          </div>
                                      </div>
                                  </td>
                                  <td 
                                    className="px-4 py-5 font-bold text-slate-600 tabular-nums cursor-help"
                                    onMouseEnter={(e) => setActiveTooltip({ type: 'LCB', data: r, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    <div className="flex items-center gap-1">
                                        {formatCurrency(r.actualBaseSalary)}
                                        <Info size={12} className="text-slate-300"/>
                                    </div>
                                  </td>
                                  <td 
                                    className="px-4 py-5 font-black text-indigo-600 tabular-nums cursor-help"
                                    onMouseEnter={(e) => setActiveTooltip({ type: 'LHQ_LSL', data: r, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    <div className="flex items-center gap-1">
                                        {formatCurrency(r.actualEfficiencySalary + r.actualPieceworkSalary)}
                                        <Info size={12} className="text-indigo-200"/>
                                    </div>
                                  </td>
                                  <td 
                                    className="px-4 py-5 font-bold text-slate-500 tabular-nums cursor-help"
                                    onMouseEnter={(e) => setActiveTooltip({ type: 'L_K', data: r, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    <div className="flex items-center gap-1">
                                        {formatCurrency(r.otherSalary)}
                                        <Info size={12} className="text-slate-200"/>
                                    </div>
                                  </td>
                                  <td 
                                    className="px-4 py-5 font-bold text-blue-600 tabular-nums cursor-help"
                                    onMouseEnter={(e) => setActiveTooltip({ type: 'PC', data: r, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    <div className="flex items-center gap-1">
                                        {formatCurrency(r.totalAllowance)}
                                        <Info size={12} className="text-blue-100"/>
                                    </div>
                                  </td>
                                  <td 
                                    className="px-4 py-5 font-black text-amber-600 tabular-nums cursor-help"
                                    onMouseEnter={(e) => setActiveTooltip({ type: 'THUONG', data: r, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    <div className="flex items-center gap-1">
                                        {formatCurrency(r.totalBonus)}
                                        <Info size={12} className="text-amber-100"/>
                                    </div>
                                  </td>
                                  <td 
                                    className="px-4 py-5 font-bold text-rose-500 tabular-nums cursor-help"
                                    onMouseEnter={(e) => setActiveTooltip({ type: 'KH_TRU', data: r, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    <div className="flex items-center gap-1">
                                        -{formatCurrency(totalKT)}
                                        <Info size={12} className="text-rose-100"/>
                                    </div>
                                  </td>
                                  <td 
                                    className="px-4 py-5 font-black text-emerald-700 bg-emerald-50/50 text-sm tabular-nums cursor-help"
                                    onMouseEnter={(e) => setActiveTooltip({ type: 'NET', data: r, rect: e.currentTarget.getBoundingClientRect() })}
                                    onMouseLeave={() => setActiveTooltip(null)}
                                  >
                                    <div className="flex items-center gap-1">
                                        {formatCurrency(r.netSalary)}
                                        <Info size={12} className="text-emerald-200"/>
                                    </div>
                                  </td>
                                  <td className="px-4 py-5">{getStatusBadge(r)}</td>
                                  <td className="px-8 py-5 text-right">
                                      <div className="flex justify-end gap-2">
                                          <button 
                                            onClick={() => setAdvanceModal({ recordId: r.id, name: r.userName, current: r.advancePayment, isOpen: true, status: r.status })} 
                                            className={`p-2.5 rounded-xl transition-all shadow-sm ${isDraft ? 'bg-slate-100 text-slate-600 hover:bg-indigo-600 hover:text-white' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`} 
                                            disabled={!isDraft}
                                            title={isDraft ? "Khai báo tạm ứng" : "Bản ghi đã khóa - Không thể tạm ứng"}
                                          >
                                            <DollarSign size={16}/>
                                          </button>
                                          
                                          <button 
                                            onClick={() => setAdjustingRecord(r)} 
                                            className={`p-2.5 rounded-xl transition-all shadow-sm ${isDraft ? 'bg-slate-100 text-slate-600 hover:bg-amber-600 hover:text-white' : 'bg-slate-50 text-slate-300 cursor-not-allowed'}`}
                                            disabled={!isDraft}
                                            title={isDraft ? "Điều chỉnh/Thưởng" : "Bản ghi đã khóa - Không thể điều chỉnh"}
                                          >
                                            <Plus size={16}/>
                                          </button>
                                          
                                          <button onClick={() => setDetailedRecord(r)} className="p-2.5 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg" title="Xem phiếu lương siêu phân rã"><Eye size={16}/></button>
                                          
                                          {isDraft && isOperator && (
                                              <button onClick={() => handleAction(r.id, 'SUBMIT')} className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all" title="Gửi duyệt"><Send size={16}/></button>
                                          )}
                                          
                                          {canActionSalary(r) && !isDraft && r.status !== RecordStatus.APPROVED && (
                                              <>
                                                <button onClick={() => handleAction(r.id, 'APPROVE')} className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-sm hover:bg-emerald-700 transition-all" title="Phê duyệt"><Check size={14}/></button>
                                                <button onClick={() => handleAction(r.id, 'REJECT')} className="p-1.5 bg-rose-600 text-white rounded-lg shadow-sm hover:bg-rose-700 transition-all" title="Từ chối"><X size={14}/></button>
                                              </>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                              );
                          })}
                      </tbody>
                  </table>
              ) : (
                  <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left text-[10px] table-fixed min-w-[2800px]">
                          <thead className="bg-slate-900 text-white font-black uppercase tracking-tighter sticky top-0 z-20">
                              <tr>
                                  <th className="px-6 py-4 w-48 sticky left-0 bg-slate-900 z-30">Nhân viên</th>
                                  <th className="px-2 py-4 w-24">Ctc</th>
                                  <th className="px-2 py-4 w-24">Ctt</th>
                                  <th className="px-2 py-4 w-32">LCB ĐM</th>
                                  <th className="px-2 py-4 w-32 bg-blue-800">LCB Thực</th>
                                  <th className="px-2 py-4 w-32">LHQ ĐM</th>
                                  <th className="px-2 py-4 w-32 bg-indigo-800">LHQ Thực</th>
                                  <th className="px-2 py-4 w-32">LSL ĐM</th>
                                  <th className="px-2 py-4 w-32 bg-emerald-800">LSL Thực</th>
                                  <th className="px-2 py-4 w-28">Hệ số TN</th>
                                  <th className="px-2 py-4 w-32">Thưởng TH_cd</th>
                                  <th className="px-2 py-4 w-32">Phụ cấp PC_cd</th>
                                  <th className="px-2 py-4 w-32">OT Salary</th>
                                  <th className="px-2 py-4 w-32">Lương Khác</th>
                                  <th className="px-2 py-4 w-32 bg-orange-700">TỔNG GROSS</th>
                                  <th className="px-2 py-4 w-32">BHXH (10.5%)</th>
                                  <th className="px-2 py-4 w-28">Công đoàn</th>
                                  <th className="px-2 py-4 w-32">Thuế TNCN</th>
                                  <th className="px-2 py-4 w-32">Khấu trừ khác</th>
                                  <th className="px-2 py-4 w-32 text-rose-400">Tạm ứng</th>
                                  <th className="px-2 py-4 w-24 text-amber-400">% Thử việc</th>
                                  <th className="px-4 py-4 w-40 bg-emerald-900 text-lg font-black">THỰC LĨNH</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-bold tabular-nums">
                              {filtered.map(r => (
                                  <tr key={r.id} className="hover:bg-slate-50 group">
                                      <td className="px-6 py-3 sticky left-0 bg-white z-10 border-r shadow-right group-hover:bg-slate-100">{r.userName}</td>
                                      <td className="px-2 py-3 text-center">{r.Ctc}</td>
                                      <td className="px-2 py-3 text-center text-indigo-600">{r.Ctt}</td>
                                      <td className="px-2 py-3">{formatCurrency(r.LCB_dm)}</td>
                                      <td className="px-2 py-3 bg-blue-50/50">{formatCurrency(r.actualBaseSalary)}</td>
                                      <td className="px-2 py-3">{formatCurrency(r.LHQ_dm)}</td>
                                      <td className="px-2 py-3 bg-indigo-50/50">{formatCurrency(r.actualEfficiencySalary)}</td>
                                      <td className="px-2 py-3">{formatCurrency(r.LSL_dm)}</td>
                                      <td className="px-2 py-3 bg-emerald-50/50">{formatCurrency(r.actualPieceworkSalary)}</td>
                                      <td className="px-2 py-3 text-center">{r.HS_tn.toFixed(1)}</td>
                                      <td className="px-2 py-3">{formatCurrency(r.totalBonus)}</td>
                                      <td className="px-2 py-3">{formatCurrency(r.totalAllowance)}</td>
                                      <td className="px-2 py-3">{formatCurrency(r.overtimeSalary)}</td>
                                      <td className="px-2 py-3">{formatCurrency(r.otherSalary)}</td>
                                      <td className="px-2 py-3 bg-orange-50/50 text-slate-900">{formatCurrency(r.calculatedSalary)}</td>
                                      <td className="px-2 py-3 text-rose-600">-{formatCurrency(r.insuranceDeduction)}</td>
                                      <td className="px-2 py-3 text-rose-600">-{formatCurrency(r.unionFee)}</td>
                                      <td className="px-2 py-3 text-rose-600">-{formatCurrency(r.pitDeduction)}</td>
                                      <td className="px-2 py-3 text-rose-600">-{formatCurrency(r.otherDeductions)}</td>
                                      <td className="px-2 py-3 text-rose-700 bg-rose-50/30">-{formatCurrency(r.advancePayment)}</td>
                                      <td className="px-2 py-3 text-amber-600">{r.probationRate}%</td>
                                      <td className="px-4 py-3 bg-emerald-50 text-emerald-800 text-sm font-black">{formatCurrency(r.netSalary)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      </div>

      {/* MODAL NHẬP SẢN LƯỢNG KHOÁN */}
      {isPieceworkModalOpen && (
          <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 animate-fade-in">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
                  <div className="p-8 bg-blue-600 text-white flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-white/20 rounded-2xl"><Package size={28}/></div>
                          <div>
                              <h3 className="text-xl font-black uppercase tracking-tighter">Nhập Sản Lượng Khoán</h3>
                              <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mt-1">Kỳ tháng: {selectedMonth}</p>
                          </div>
                      </div>
                      <button onClick={() => setIsPieceworkModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={28}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
                      <div className="grid grid-cols-1 gap-4">
                          {allUsers.filter(u => u.paymentType === 'PIECEWORK').map(u => (
                              <div key={u.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-blue-300 transition-all">
                                  <div className="flex items-center gap-4">
                                      <img src={u.avatar} className="w-10 h-10 rounded-full border shadow-sm" alt=""/>
                                      <div>
                                          <p className="font-black text-slate-800 text-sm">{u.name}</p>
                                          <p className="text-[10px] text-slate-400 font-bold uppercase">Mã NV: {u.id}</p>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Target sản phẩm</label>
                                      <input 
                                        type="number"
                                        className="w-32 px-4 py-2 bg-white border-2 border-slate-200 rounded-xl font-black text-blue-600 text-center focus:border-blue-500 outline-none"
                                        value={pieceworkBuffer[u.id] || 0}
                                        onChange={e => setPieceworkBuffer({...pieceworkBuffer, [u.id]: Number(e.target.value)})}
                                      />
                                  </div>
                              </div>
                          ))}
                          {allUsers.filter(u => u.paymentType === 'PIECEWORK').length === 0 && (
                              <div className="py-20 text-center text-slate-300">
                                  <AlertCircle size={48} className="mx-auto mb-4 opacity-10"/>
                                  <p className="font-black uppercase text-xs">Không có nhân sự hưởng lương khoán</p>
                              </div>
                          )}
                      </div>
                  </div>
                  <div className="p-8 bg-slate-50 border-t flex justify-end gap-4 shrink-0">
                      <button onClick={() => setIsPieceworkModalOpen(false)} className="px-8 py-3 font-black text-xs text-slate-400 uppercase tracking-widest">Hủy bỏ</button>
                      <button onClick={handleSavePiecework} className="px-10 py-3 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">Lưu Định Mức Khoán</button>
                  </div>
              </div>
          </div>
      )}

      {/* PHIẾU LƯƠNG SIÊU PHÂN RÃ (CARD VERSION) */}
      {detailedRecord && (
          <div className="fixed inset-0 z-[4000] flex items-start justify-center bg-slate-900/90 backdrop-blur-xl p-4 overflow-y-auto no-print">
              <div className="bg-slate-50 rounded-[56px] shadow-[0_0_100px_rgba(0,0,0,0.5)] w-full max-w-6xl animate-fade-in-up my-4 printable-area flex flex-col max-h-[95vh] overflow-hidden">
                  {/* Modal Header (Dark) */}
                  <div className="p-10 border-b bg-slate-950 text-white flex justify-between items-center rounded-t-[56px] no-print shrink-0">
                      <div className="flex items-center gap-6">
                          <div className="p-4 bg-indigo-600 rounded-[24px] shadow-2xl shadow-indigo-500/20"><FileText size={36}/></div>
                          <div>
                              <h2 className="text-3xl font-black uppercase tracking-tighter">Phiếu Lương Thực Lĩnh</h2>
                              <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest mt-1">Kỳ thanh toán: {detailedRecord.date}</p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <button onClick={() => window.print()} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 transition-all"><Printer size={20}/> In Phiếu Lương</button>
                        <button onClick={() => setDetailedRecord(null)} className="p-4 hover:bg-white/10 rounded-full transition-all text-slate-400"><X size={36}/></button>
                      </div>
                  </div>

                  <div className="p-10 lg:p-14 space-y-10 overflow-y-auto custom-scrollbar flex-1 print:p-0 print:space-y-4">
                      {/* VÙNG 1: THÔNG TIN CHUNG (PRINT ONLY) */}
                      <div className="print-only mb-6">
                          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3 mb-4">
                              <div className="text-left">
                                  <h1 className="text-xl font-black uppercase tracking-tighter">PHIẾU LƯƠNG THỰC LĨNH</h1>
                                  <p className="text-sm font-bold text-slate-600 mt-1">Kỳ thanh toán: {detailedRecord.date}</p>
                              </div>
                              <div className="text-right">
                                  <p className="font-black text-sm">THIEN SON GROUP</p>
                                  <p className="text-[10px] text-slate-500 italic">Xác thực hệ thống nội bộ</p>
                              </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                  <p className="font-bold text-slate-700">Họ và tên:</p>
                                  <p className="text-slate-900 font-black uppercase">{detailedRecord.userName}</p>
                              </div>
                              <div>
                                  <p className="font-bold text-slate-700">Chức vụ:</p>
                                  <p className="text-slate-900">{detailedRecord.positionName}</p>
                              </div>
                              <div>
                                  <p className="font-bold text-slate-700">Phòng ban:</p>
                                  <p className="text-slate-900">{departments.find(d => d.id === detailedRecord.department)?.name}</p>
                              </div>
                              <div>
                                  <p className="font-bold text-slate-700">Hệ số thâm niên:</p>
                                  <p className="text-slate-900">{detailedRecord.HS_tn.toFixed(1)}x</p>
                              </div>
                          </div>
                      </div>

                      {/* Header Info: User Profile */}
                      <div className="bg-white p-10 rounded-[48px] border-4 border-white shadow-xl flex flex-col md:flex-row justify-between items-center gap-10">
                          <div className="flex gap-8 items-center">
                              <div className="relative">
                                  <img src={allUsers.find(u => u.id === detailedRecord.userId)?.avatar} className="w-28 h-28 rounded-[36px] border-4 border-slate-50 shadow-2xl object-cover no-print" alt=""/>
                                  <div className="absolute -bottom-3 -right-3 p-2 bg-emerald-500 text-white rounded-2xl border-4 border-white shadow-lg"><Check size={20}/></div>
                              </div>
                              <div className="text-left">
                                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] mb-1">Nhân sự thụ hưởng</p>
                                  <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">{detailedRecord.userName}</h3>
                                  <p className="text-sm font-bold text-slate-500 mt-2">{detailedRecord.positionName} • {departments.find(d => d.id === detailedRecord.department)?.name}</p>
                                  <div className="mt-4 flex gap-3 no-print">
                                      <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase">ID: #{detailedRecord.userId}</span>
                                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-100">HS Thâm niên: {detailedRecord.HS_tn.toFixed(1)}x</span>
                                      {detailedRecord.probationRate < 100 && (
                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100">Thử việc: {detailedRecord.probationRate}%</span>
                                      )}
                                  </div>
                              </div>
                          </div>
                          <div className="flex flex-col items-end gap-4 text-right">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trạng thái phê duyệt</p>
                              <div className="scale-125 origin-right">{getStatusBadge(detailedRecord)}</div>
                          </div>
                      </div>

                      {/* GRID OF CARDS - SIÊU PHÂN RÃ */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                          
                          {/* CARD 1: LƯƠNG CƠ BẢN */}
                          <div className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-100 flex flex-col justify-between group hover:border-blue-400 transition-all">
                              <div>
                                  <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Briefcase size={20}/></div>
                                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">I. Lương Cơ Bản (LCB)</h4>
                                  </div>
                                  <div className="space-y-4 font-bold text-sm">
                                      <div className="flex justify-between text-slate-400"><span>Định mức (Gross)</span><span>{formatCurrency(detailedRecord.LCB_dm)}</span></div>
                                      <div className="flex justify-between text-slate-600"><span>Công thực / Chuẩn</span><span>{detailedRecord.Ctt} / {detailedRecord.Ctc}</span></div>
                                  </div>
                              </div>
                              <div className="mt-8 pt-4 border-t-2 border-dashed border-blue-50 flex justify-between items-baseline">
                                  <span className="text-[10px] font-black text-blue-400 uppercase">Thành tiền LCB_tt</span>
                                  <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(detailedRecord.actualBaseSalary)}</span>
                              </div>
                          </div>

                          {/* CARD 2: LƯƠNG HIỆU QUẢ */}
                          <div className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-100 flex flex-col justify-between group hover:border-indigo-400 transition-all">
                              <div>
                                  <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Zap size={20}/></div>
                                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">II. Lương Hiệu Quả (KPI)</h4>
                                  </div>
                                  <div className="space-y-4 font-bold text-sm">
                                      {(() => {
                                          const log = detailedRecord.calculationLog ? JSON.parse(detailedRecord.calculationLog) : {};
                                          const isPiecework = log.paymentType === 'PIECEWORK';
                                          return (
                                              <>
                                                  {isPiecework ? (
                                                      <>
                                                          <div className="flex justify-between text-slate-400"><span>Định mức khoán (LSL_dm)</span><span>{formatCurrency(detailedRecord.LSL_dm)}</span></div>
                                                          <div className="flex justify-between text-slate-500"><span>Sản lượng thực (SL_tt)</span><span>{detailedRecord.SL_tt}</span></div>
                                                          <div className="flex justify-between text-slate-500"><span>Đơn giá khoán (DG_k)</span><span>{formatCurrency(detailedRecord.DG_khoan)}</span></div>
                                                      </>
                                                  ) : (
                                                      <>
                                                          <div className="flex justify-between text-slate-400"><span>Lương HQ định mức (dm)</span><span>{formatCurrency(detailedRecord.LHQ_dm)}</span></div>
                                                          <div className="flex justify-between text-slate-500"><span>Công thực / Chuẩn</span><span>{detailedRecord.Ctt} / {detailedRecord.Ctc}</span></div>
                                                      </>
                                                  )}
                                                  <div className="h-px bg-slate-50 my-2"></div>
                                                  <div className="flex justify-between text-emerald-500"><span>Tiền cộng KPI (+)</span><span>+{formatCurrency((log.total_CO_tc || 0) * (detailedRecord.LHQ_dm || detailedRecord.LSL_dm || 0))}</span></div>
                                                  <div className="flex justify-between text-rose-500"><span>Tiền trừ KPI (-)</span><span>-{formatCurrency((log.total_TR_tc || 0) * (detailedRecord.LHQ_dm || detailedRecord.LSL_dm || 0))}</span></div>
                                              </>
                                          );
                                      })()}
                                  </div>
                              </div>
                              <div className="mt-8 pt-4 border-t-2 border-dashed border-indigo-50 flex justify-between items-baseline">
                                  <span className="text-[10px] font-black text-indigo-400 uppercase">Thành tiền LHQ_tt</span>
                                  <span className="text-2xl font-black text-indigo-700 tracking-tighter">{formatCurrency(detailedRecord.actualEfficiencySalary + detailedRecord.actualPieceworkSalary)}</span>
                              </div>
                          </div>

                          {/* CARD 3: LƯƠNG KHÁC */}
                          <div className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-100 flex flex-col justify-between group hover:border-amber-400 transition-all">
                              <div>
                                  <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Calculator size={20}/></div>
                                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">III. Lương Khác (LK)</h4>
                                  </div>
                                  {(() => {
                                      const log = detailedRecord.calculationLog ? JSON.parse(detailedRecord.calculationLog) : {};
                                      return (
                                          <div className="space-y-4 font-bold text-sm">
                                              <div className="flex justify-between text-slate-600"><span>Lương Công nhật (Lcn)</span><span>{formatCurrency(log.Lcn || 0)}</span></div>
                                              <div className="flex justify-between text-slate-600"><span>Lương Tăng ca (Ltc)</span><span>{formatCurrency(log.Ltc || 0)}</span></div>
                                              <div className="flex justify-between text-slate-600"><span>Nghỉ chế độ/lễ (Lncl)</span><span>{formatCurrency(log.Lncl || 0)}</span></div>
                                          </div>
                                      );
                                  })()}
                              </div>
                              <div className="mt-8 pt-4 border-t-2 border-dashed border-amber-50 flex justify-between items-baseline">
                                  <span className="text-[10px] font-black text-amber-500 uppercase">Tổng lương khác</span>
                                  <span className="text-2xl font-black text-slate-900 tracking-tighter">{formatCurrency(detailedRecord.otherSalary)}</span>
                              </div>
                          </div>

                          {/* CARD 4: PHỤ CẤP */}
                          <div className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-100 flex flex-col justify-between group hover:border-emerald-400 transition-all">
                              <div>
                                  <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><TrendingUp size={20}/></div>
                                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">VI. Phụ Cấp (PC)</h4>
                                  </div>
                                  <div className="space-y-4 font-bold text-sm">
                                      <div className="flex justify-between text-slate-500"><span>Phụ cấp cố định (PC_cd)</span><span>{formatCurrency(detailedRecord.totalAllowance - (detailedRecord.adjustments || []).filter(a => a.type === 'ALLOWANCE').reduce((s, a) => s + a.amount, 0))}</span></div>
                                      <div className="flex justify-between text-emerald-600 italic"><span>Phụ cấp linh hoạt (PC_lh)</span><span>+{formatCurrency((detailedRecord.adjustments || []).filter(a => a.type === 'ALLOWANCE').reduce((s, a) => s + a.amount, 0))}</span></div>
                                  </div>
                              </div>
                              <div className="mt-8 pt-4 border-t-2 border-dashed border-emerald-50 flex justify-between items-baseline">
                                  <span className="text-[10px] font-black text-emerald-500 uppercase">Tổng phụ cấp thụ hưởng</span>
                                  <span className="text-2xl font-black text-emerald-700 tracking-tighter">{formatCurrency(detailedRecord.totalAllowance)}</span>
                              </div>
                          </div>

                          {/* CARD 5: THƯỞNG */}
                          <div className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-100 flex flex-col justify-between group hover:border-orange-400 transition-all">
                              <div>
                                  <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                      <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Landmark size={20}/></div>
                                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">V. Tiền Thưởng (TH)</h4>
                                  </div>
                                  <div className="space-y-4 font-bold text-sm">
                                      <div className="flex justify-between text-slate-500"><span>Thưởng định kỳ (TH_cd)</span><span>{formatCurrency(detailedRecord.totalBonus - (detailedRecord.adjustments || []).filter(a => a.type === 'BONUS').reduce((s, a) => s + a.amount, 0))}</span></div>
                                      <div className="flex justify-between text-orange-600 italic"><span>Thưởng nóng / Dự án (TH_lh)</span><span>+{formatCurrency((detailedRecord.adjustments || []).filter(a => a.type === 'BONUS').reduce((s, a) => s + a.amount, 0))}</span></div>
                                  </div>
                              </div>
                              <div className="mt-8 pt-4 border-t-2 border-dashed border-orange-50 flex justify-between items-baseline">
                                  <span className="text-[10px] font-black text-orange-500 uppercase">Tổng tiền thưởng</span>
                                  <span className="text-2xl font-black text-orange-700 tracking-tighter">{formatCurrency(detailedRecord.totalBonus)}</span>
                              </div>
                          </div>

                          {/* CARD 6: KHẤU TRỪ */}
                          <div className="bg-white p-8 rounded-[40px] shadow-lg border border-slate-100 flex flex-col justify-between group hover:border-rose-400 transition-all">
                              <div>
                                  <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
                                      <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Banknote size={20}/></div>
                                      <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest">VI. Khấu Trừ & Nghĩa Vụ</h4>
                                  </div>
                                  <div className="space-y-3 font-bold text-xs">
                                      <div className="flex justify-between text-slate-400"><span>BHXH & BHYT (10.5%)</span><span>-{formatCurrency(detailedRecord.insuranceDeduction)}</span></div>
                                      <div className="flex justify-between text-slate-400"><span>Phí Công đoàn (1%)</span><span>-{formatCurrency(detailedRecord.unionFee)}</span></div>
                                      <div className="flex justify-between text-slate-400"><span>Thuế TNCN (Dự tính)</span><span>-{formatCurrency(detailedRecord.pitDeduction)}</span></div>
                                      <div className="flex justify-between text-rose-500 bg-rose-50/50 px-2 py-1 rounded"><span>Tạm ứng (TU)</span><span>-{formatCurrency(detailedRecord.advancePayment)}</span></div>
                                      <div className="flex justify-between text-slate-400"><span>Khấu trừ khác (KT_kh)</span><span>-{formatCurrency(detailedRecord.otherDeductions)}</span></div>
                                  </div>
                              </div>
                              <div className="mt-8 pt-4 border-t-2 border-dashed border-rose-50 flex justify-between items-baseline">
                                  <span className="text-[10px] font-black text-rose-400 uppercase">Tổng các khoản trừ</span>
                                  <span className="text-2xl font-black text-rose-700 tracking-tighter">-{formatCurrency(detailedRecord.insuranceDeduction + detailedRecord.unionFee + detailedRecord.pitDeduction + detailedRecord.advancePayment + detailedRecord.otherDeductions)}</span>
                              </div>
                          </div>

                      </div>

                      {/* GROSS / NET FINAL SUMMARY */}
                      <div className="bg-slate-950 p-12 rounded-[56px] text-white flex flex-col md:flex-row justify-between items-center relative overflow-hidden shadow-2xl group">
                          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-600 rounded-full blur-[140px] opacity-20 group-hover:scale-125 transition-transform duration-1000"></div>
                          <div className="text-center md:text-left relative z-10">
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-3">TỔNG THU NHẬP CHỊU THUẾ (GROSS)</p>
                              <h3 className="text-4xl font-black tabular-nums tracking-tighter">{formatCurrency(detailedRecord.calculatedSalary)}</h3>
                              <div className="mt-8 flex gap-4 no-print">
                                  <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><CreditCard size={12}/> Bank Transfer</div>
                                  <div className="px-6 py-2 bg-white/5 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={12}/> Bảo mật</div>
                              </div>
                          </div>
                          <div className="h-px w-full md:h-24 md:w-px bg-white/10 my-8 md:my-0 relative z-10"></div>
                          <div className="text-center md:text-right relative z-10">
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em] mb-3">THỰC LĨNH SAU CÙNG (NET)</p>
                              <h2 className="text-7xl font-black tabular-nums tracking-tighter text-white drop-shadow-2xl">{formatCurrency(detailedRecord.netSalary)}</h2>
                          </div>
                      </div>

                      {/* LOG: LỊCH SỬ KPI THUỞNG/PHẠT */}
                      <div className="bg-white rounded-[40px] border-4 border-white shadow-xl overflow-hidden no-print">
                          <div className="p-8 border-b bg-slate-50 flex items-center gap-4">
                              <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><History size={24}/></div>
                              <h4 className="font-black text-slate-800 uppercase text-sm tracking-widest">Lịch sử điều chỉnh KPI & Hiệu suất trong kỳ</h4>
                          </div>
                          <div className="max-h-60 overflow-y-auto custom-scrollbar">
                              {evaluationRequests
                                .filter(e => e.userId === detailedRecord.userId && e.createdAt.startsWith(detailedRecord.date) && e.status === RecordStatus.APPROVED)
                                .map(e => (
                                  <div key={e.id} className="p-6 border-b border-slate-50 hover:bg-slate-50 transition-colors flex justify-between items-center group">
                                      <div className="flex items-center gap-6">
                                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border-2 ${e.type === 'BONUS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                                              {e.type === 'BONUS' ? <ThumbsUp size={24}/> : <ThumbsDown size={24}/>}
                                          </div>
                                          <div>
                                              <p className="font-black text-slate-800 text-sm">{e.criteriaName}</p>
                                              <p className="text-xs text-slate-400 italic mt-1 font-medium">"{e.description || 'Không có ghi chú.'}"</p>
                                          </div>
                                      </div>
                                      <div className="text-right">
                                          <p className={`font-black text-lg ${e.type === 'BONUS' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                              {e.type === 'BONUS' ? '+' : '-'}{e.target === EvaluationTarget.RESERVED_BONUS ? formatCurrency(e.points) : `${e.points}% HQ`}
                                          </p>
                                          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">{new Date(e.createdAt).toLocaleDateString()}</p>
                                      </div>
                                  </div>
                              ))}
                              {evaluationRequests.filter(e => e.userId === detailedRecord.userId && e.createdAt.startsWith(detailedRecord.date) && e.status === RecordStatus.APPROVED).length === 0 && (
                                  <div className="p-20 text-center text-slate-300">
                                      <p className="font-black uppercase text-xs tracking-widest">Không có biến động KPI trong tháng</p>
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* VÙNG 2: BẢNG LƯƠNG CHI TIẾT (PRINT ONLY - DẠNG BẢNG EXCEL) */}
                      <div className="print-only mt-4">
                          <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                              <thead>
                                  <tr className="bg-slate-900 text-white">
                                      <th className="border-2 border-slate-900 px-4 py-3 text-left font-black uppercase">STT</th>
                                      <th className="border-2 border-slate-900 px-4 py-3 text-left font-black uppercase">Nội dung</th>
                                      <th className="border-2 border-slate-900 px-4 py-3 text-right font-black uppercase">Số tiền (VNĐ)</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {(() => {
                                      const log = detailedRecord.calculationLog ? JSON.parse(detailedRecord.calculationLog) : {};
                                      const isPiecework = log.paymentType === 'PIECEWORK';
                                      const rows: Array<{stt: number, content: string, amount: number}> = [];
                                      
                                      // Thu nhập
                                      rows.push({stt: 1, content: '1. Lương cơ bản thực tế (LCB_tt)', amount: detailedRecord.actualBaseSalary});
                                      
                                      if (isPiecework) {
                                          rows.push({stt: 2, content: '2. Lương khoán thực tế (LSL_tt)', amount: detailedRecord.actualPieceworkSalary});
                                      } else {
                                          rows.push({stt: 2, content: '2. Lương hiệu quả thực tế (LHQ_tt)', amount: detailedRecord.actualEfficiencySalary});
                                      }
                                      
                                      rows.push({stt: 3, content: '3. Lương khác (Lk)', amount: detailedRecord.otherSalary});
                                      rows.push({stt: 4, content: '4. Phụ cấp (PC)', amount: detailedRecord.totalAllowance});
                                      rows.push({stt: 5, content: '5. Tiền thưởng (TH)', amount: detailedRecord.totalBonus});
                                      
                                      // Tổng thu nhập
                                      rows.push({stt: 6, content: 'TỔNG THU NHẬP (GROSS)', amount: detailedRecord.calculatedSalary});
                                      
                                      // Khấu trừ
                                      rows.push({stt: 7, content: '6. BHXH & BHYT (10.5%)', amount: -detailedRecord.insuranceDeduction});
                                      rows.push({stt: 8, content: '7. Phí Công đoàn (1%)', amount: -detailedRecord.unionFee});
                                      rows.push({stt: 9, content: '8. Thuế TNCN', amount: -detailedRecord.pitDeduction});
                                      rows.push({stt: 10, content: '9. Tạm ứng (TU)', amount: -detailedRecord.advancePayment});
                                      rows.push({stt: 11, content: '10. Khấu trừ khác', amount: -detailedRecord.otherDeductions});
                                      
                                      // Tổng khấu trừ
                                      const totalDeduction = detailedRecord.insuranceDeduction + detailedRecord.unionFee + detailedRecord.pitDeduction + detailedRecord.advancePayment + detailedRecord.otherDeductions;
                                      rows.push({stt: 12, content: 'TỔNG CÁC KHOẢN TRỪ', amount: -totalDeduction});
                                      
                                      // Thực lĩnh
                                      rows.push({stt: 13, content: 'THỰC LĨNH (NET)', amount: detailedRecord.netSalary});
                                      
                                      return rows.map((row, idx) => {
                                          const isGross = row.content.includes('TỔNG THU NHẬP');
                                          const isTotalDeduction = row.content.includes('TỔNG CÁC KHOẢN TRỪ');
                                          const isNet = row.content.includes('THỰC LĨNH');
                                          return (
                                              <tr key={idx} className={
                                                  isGross ? 'bg-blue-50 font-bold' : 
                                                  isTotalDeduction ? 'bg-rose-50 font-bold' : 
                                                  isNet ? 'bg-emerald-100 font-black text-lg' : ''
                                              }>
                                                  <td className="border-2 border-slate-300 px-4 py-2 text-center">{row.stt || ''}</td>
                                                  <td className="border-2 border-slate-300 px-4 py-2">{row.content}</td>
                                                  <td className="border-2 border-slate-300 px-4 py-2 text-right font-bold">{formatCurrency(Math.abs(row.amount))}</td>
                                              </tr>
                                          );
                                      });
                                  })()}
                              </tbody>
                          </table>
                      </div>

                      {/* VÙNG 3: VÙNG KÝ (PRINT ONLY) */}
                      <div className="print-only mt-8 grid grid-cols-3 gap-6 text-center">
                          <div className="space-y-16">
                              <p className="font-black text-[10px] uppercase text-slate-900">NGƯỜI LẬP BIỂU</p>
                              <p className="text-[9px] text-slate-400 italic">(Ký & Ghi rõ họ tên)</p>
                          </div>
                          <div className="space-y-16">
                              <p className="font-black text-[10px] uppercase text-slate-900">KẾ TOÁN TRƯỞNG</p>
                              <p className="text-[9px] text-slate-400 italic">(Ký & Ghi rõ họ tên)</p>
                          </div>
                          <div className="space-y-16">
                              <p className="font-black text-[10px] uppercase text-slate-900">BAN GIÁM ĐỐC</p>
                              <p className="text-[9px] text-slate-400 italic">(Ký tên & Đóng dấu)</p>
                          </div>
                      </div>
                      
                      {/* Copyright ở cuối trang (mờ) */}
                      <div className="print-only mt-4 text-center">
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-30">© 2025 HuyPQ.ThienSon - All Rights Reserved</p>
                      </div>
                  </div>

                  {/* Footer Modal */}
                  <div className="p-8 bg-slate-100 border-t text-center rounded-b-[56px] no-print shrink-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] opacity-50">© 2025 HuyPQ.ThienSon - All Rights Reserved</p>
                      <button onClick={() => setDetailedRecord(null)} className="mt-4 font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase text-xs tracking-widest">Quay lại bảng lương</button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL ĐIỀU CHỈNH LƯƠNG */}
      {adjustingRecord && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-md text-left">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl animate-fade-in-up overflow-hidden text-left">
                  <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-left">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-500 rounded-2xl shadow-lg"><Plus size={28}/></div>
                          <div>
                              <h3 className="text-xl font-black uppercase tracking-tight">Điều Chỉnh Thu Nhập Thủ Công</h3>
                              <p className="text-xs text-slate-400 uppercase mt-1">Nhân sự: {adjustingRecord.userName}</p>
                          </div>
                      </div>
                      <button onClick={() => setAdjustingRecord(null)} className="hover:bg-white/10 p-2 rounded-full transition-all"><X size={32}/></button>
                  </div>
                  <div className="p-10 space-y-8 text-left">
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2">Danh sách điều chỉnh hiện có</h4>
                          {(adjustingRecord.adjustments || []).length === 0 ? (
                              <p className="text-xs italic text-slate-400 py-4 text-center">Chưa có khoản điều chỉnh tay nào.</p>
                          ) : (
                              <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                                  {adjustingRecord.adjustments.map(adj => (
                                      <div key={adj.id} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                          <div>
                                              <p className="text-xs font-black text-slate-800">{adj.name}</p>
                                              <p className="text-[10px] text-slate-400 uppercase font-bold">{adj.type}</p>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <p className={`font-black ${adj.type === 'DEDUCTION' ? 'text-rose-600' : 'text-emerald-600'}`}>{adj.type === 'DEDUCTION' ? '-' : '+'}{adj.amount.toLocaleString()}đ</p>
                                              {adjustingRecord.status === RecordStatus.DRAFT && (
                                                <button onClick={() => deleteSalaryAdjustment(adjustingRecord.id, adj.id)} className="p-2 text-rose-400 hover:text-rose-600 transition-colors"><Trash2 size={16}/></button>
                                              )}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {adjustingRecord.status === RecordStatus.DRAFT ? (
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const f = new FormData(e.currentTarget);
                            addSalaryAdjustment(adjustingRecord.id, {
                                id: `ADJ${Date.now()}`,
                                name: f.get('name') as string,
                                type: f.get('type') as any,
                                amount: Number(f.get('amount')),
                                note: f.get('note') as string
                            });
                            e.currentTarget.reset();
                        }} className="p-8 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-200 space-y-6">
                            <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Thêm điều chỉnh mới</h4>
                            <div className="grid grid-cols-2 gap-4">
                                <input name="name" required placeholder="Tên khoản (vd: Thưởng nóng)..." className="px-4 py-3 rounded-xl border border-slate-200 font-bold text-xs outline-none focus:border-indigo-500"/>
                                <select name="type" className="px-4 py-3 rounded-xl border border-slate-200 font-black text-[10px] uppercase outline-none focus:border-indigo-500">
                                    <option value="BONUS">Thưởng dự án (Bonus)</option>
                                    <option value="ALLOWANCE">Phụ cấp khác (Allowance)</option>
                                    <option value="OTHER_SALARY">Lương khác (Other)</option>
                                    <option value="DEDUCTION">Khấu trừ tay (Deduction)</option>
                                </select>
                            </div>
                            <div className="relative">
                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                <input name="amount" type="number" required placeholder="Số tiền..." className="w-full pl-10 pr-4 py-4 rounded-2xl border-2 border-slate-100 font-black text-indigo-600 text-lg outline-none focus:border-indigo-500"/>
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700">Xác nhận thêm</button>
                        </form>
                      ) : (
                        <div className="bg-rose-50 p-6 rounded-[32px] border border-rose-100 flex items-center gap-4 text-rose-700">
                            <ShieldAlert size={24}/>
                            <p className="text-xs font-bold">Bảng lương đã chốt. Không thể điều chỉnh thủ công.</p>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL TẠM ỨNG */}
      {advanceModal.isOpen && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left">
              <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden text-left">
                  <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-left">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg"><Banknote size={28}/></div>
                          <div>
                              <h3 className="text-xl font-black uppercase tracking-tight text-left">Khai Báo Tạm Ưng</h3>
                              <p className="text-[10px] text-slate-400 uppercase mt-1 tracking-widest text-left">{advanceModal.name}</p>
                          </div>
                      </div>
                      <button onClick={() => setAdvanceModal({...advanceModal, isOpen: false})} className="hover:bg-white/10 p-2 rounded-full transition-all"><X size={32}/></button>
                  </div>
                  <div className="p-10 space-y-8 font-medium">
                      {advanceModal.status === RecordStatus.DRAFT ? (
                        <>
                          <div className="space-y-2">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 ml-2">Số tiền tạm ứng thực chi</label>
                              <div className="relative">
                                  <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" size={24}/>
                                  <input 
                                      type="number" 
                                      className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-[24px] font-black text-slate-900 text-3xl outline-none focus:border-indigo-500 transition-all shadow-inner text-left" 
                                      value={advanceModal.current}
                                      onChange={e => setAdvanceModal({...advanceModal, current: Number(e.target.value)})}
                                  />
                              </div>
                          </div>
                          <button 
                            onClick={() => { updateAdvancePayment(advanceModal.recordId, advanceModal.current); setAdvanceModal({...advanceModal, isOpen: false}); }}
                            className="w-full py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:bg-black transition-all active:scale-95 border border-white/10"
                          >
                              Cập Nhật Số Tiền Tạm Ưng
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-6 py-8">
                            <ShieldAlert size={64} className="text-rose-500 animate-bounce"/>
                            <div className="text-center space-y-2">
                                <h4 className="font-black text-slate-800 uppercase tracking-widest">Dữ liệu bị khóa</h4>
                                <p className="text-sm text-slate-500">Bảng lương đã gửi đi duyệt, không thể thay đổi thông tin tạm ứng.</p>
                            </div>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default SalarySheet;
