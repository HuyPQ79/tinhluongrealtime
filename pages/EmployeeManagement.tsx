
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Users, UserPlus, Building2, X, Plus, 
  History, Briefcase, ShieldCheck, DollarSign, 
  User as UserIcon, Info, Trash2, Edit, Calendar, CheckCircle, ArrowRight, Search, Filter, Mail, Phone, BadgeCheck, AlertCircle,
  Clock, FileUp, Download, Check, AlertTriangle, Layers, Briefcase as BriefcaseIcon, UserCheck, MapPin, ShieldAlert,
  CalendarDays, TrendingUp, Lock, Eye, EyeOff, XCircle, Calculator, FileSpreadsheet
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { User, Department, UserRole, SalaryHistoryItem, UserStatus } from '../types';
import { hasRole } from '../utils/rbac';
import * as XLSX from 'xlsx';

const EmployeeManagement: React.FC = () => {
  const { 
    allUsers, departments, salaryRanks, salaryGrids, 
    addUser, updateUser, deleteUser, approveUserUpdate, rejectUserUpdate,
    addDept, updateDept, deleteDept,
    addAuditLog, currentUser, bulkAddUsers, showToast
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'USERS' | 'DEPARTMENTS'>('USERS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');

  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userTabInModal, setUserTabInModal] = useState<'BASIC' | 'TIMELINE' | 'ACCOUNT'>('BASIC');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [isDeptModalOpen, setIsDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);

  const [reasonModal, setReasonModal] = useState<{ isOpen: boolean, type: 'USER' | 'DEPT', id: string, name: string }>({ isOpen: false, type: 'USER', id: '', name: '' });
  const [reasonText, setReasonText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = useMemo(() => hasRole(currentUser!, [UserRole.ADMIN]), [currentUser]);

  const isNew = useMemo(() => {
    if (!editingUser) return false;
    return !allUsers.some(u => u.id === editingUser.id);
  }, [editingUser, allUsers]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const calculateSeniority = (joinDate: string) => {
      const join = new Date(joinDate);
      const now = new Date();
      const months = (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth());
      
      let coeff = 0.5;
      if (months >= 6) coeff = 1.0;
      else if (months >= 3) coeff = 0.7;

      return { months: Math.max(0, months), coeff };
  };

  const filteredUsers = useMemo(() => {
    return (allUsers || []).filter(u => {
      const matchSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = statusFilter === 'ALL' || u.status === statusFilter;
      const matchDept = deptFilter === 'ALL' || u.currentDeptId === deptFilter;
      return matchSearch && matchStatus && matchDept;
    });
  }, [allUsers, searchTerm, statusFilter, deptFilter]);

  const getGradesForRank = (rankId?: string) => {
    if (!rankId) return [];
    return (salaryGrids || []).filter(g => g.rankId === rankId).sort((a,b) => a.level - b.level);
  };

  const handleOpenUserModal = (u: User | null) => {
      if (u) {
        setEditingUser({ ...u, roles: [...u.roles], salaryHistory: [...(u.salaryHistory || [])], assignedDeptIds: [...(u.assignedDeptIds || [])] });
        setConfirmPassword(u.password || '');
      } else {
        setEditingUser({
          id: `NV${Date.now()}`,
          username: '',
          password: '123',
          name: '',
          avatar: `https://ui-avatars.com/api/?name=New+User&background=6366f1&color=fff`,
          joinDate: new Date().toISOString().split('T')[0],
          status: UserStatus.PROBATION,
          roles: [UserRole.NHAN_VIEN],
          numberOfDependents: 0,
          salaryHistory: [],
          assignedDeptIds: [],
          activeAssignments: [],
          currentRankId: salaryRanks[0]?.id || '',
          currentGradeId: '',
          currentPosition: '',
          currentDeptId: (departments || [])[0]?.id || '',
          currentStartDate: new Date().toISOString().split('T')[0],
          paymentType: 'TIME',
          pieceworkUnitPrice: 0,
          efficiencySalary: 0,
          reservedBonusAmount: 0,
          probationRate: 85
        });
        setConfirmPassword('123');
      }
      setUserTabInModal('BASIC');
      setIsUserModalOpen(true);
  };

  const toggleRole = (role: UserRole) => {
    if (!editingUser) return;
    const currentRoles = [...editingUser.roles];
    const index = currentRoles.indexOf(role);
    if (index > -1) {
        if (currentRoles.length > 1) currentRoles.splice(index, 1);
    } else {
        currentRoles.push(role);
    }
    setEditingUser({ ...editingUser, roles: currentRoles });
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Chỉ kiểm tra password khi là user mới hoặc khi password đã được nhập
    if ((isNew || editingUser.password) && editingUser.password !== confirmPassword) {
        showToast("Mật khẩu xác nhận không khớp!", "ERROR");
        setUserTabInModal('ACCOUNT');
        return;
    }
    
    const hasPermission = hasRole(currentUser!, [UserRole.ADMIN, UserRole.NHAN_SU]);
    const isSelfUpdate = currentUser?.id === editingUser.id;

    if (!hasPermission && !isSelfUpdate) {
        alert("Bạn không có quyền thực hiện thay đổi hồ sơ nhân sự.");
        return;
    }

    if (isNew) {
        addUser(editingUser);
    } else {
        updateUser(editingUser);
    }
    setIsUserModalOpen(false);
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();

    // 1. Sheet Nhập dữ liệu
    const entryHeader = [
      "Mã NV", "Họ Tên", "Username", "Mật khẩu", "Ngày vào", "Chức vụ", "Mã Phòng Ban", 
      "Loại lương (TIME/PIECEWORK)", "Lương HQ định mức", "Đơn giá khoán", "Thưởng treo năm", 
      "Số người phụ thuộc", "Tỷ lệ thử việc (%)", "Mã Cấp bậc", "Mã Bậc lương", "Trạng thái"
    ];
    const sampleRow = [
      "NV001", "Nguyễn Văn A", "nv.vana", "123456", "2024-01-01", "Chuyên viên", "D2", 
      "TIME", 5000000, 0, 20000000, 1, 100, "R5", "G_R5_1", "ACTIVE"
    ];
    const wsEntry = XLSX.utils.aoa_to_sheet([entryHeader, sampleRow]);
    XLSX.utils.book_append_sheet(wb, wsEntry, "NHAP_DU_LIEU");

    // 2. Sheet Danh mục Phòng Ban
    const deptData = departments.map(d => ({ "Mã Phòng": d.id, "Tên Phòng Ban": d.name }));
    const wsDept = XLSX.utils.json_to_sheet(deptData);
    XLSX.utils.book_append_sheet(wb, wsDept, "TRA_CUU_PHONG_BAN");

    // 3. Sheet Danh mục Cấp bậc
    const rankData = salaryRanks.map(r => ({ "Mã Cấp": r.id, "Tên Cấp Bậc": r.name }));
    const wsRank = XLSX.utils.json_to_sheet(rankData);
    XLSX.utils.book_append_sheet(wb, wsRank, "TRA_CUU_CAP_BAC");

    // 4. Sheet Danh mục Bậc lương
    const gradeData = salaryGrids.map(g => {
        const rank = salaryRanks.find(r => r.id === g.rankId);
        return { 
            "Mã Bậc": g.id, 
            "Cấp bậc": rank?.name || g.rankId, 
            "Thứ tự bậc": g.level, 
            "Lương CB (VND)": g.baseSalary 
        };
    });
    const wsGrade = XLSX.utils.json_to_sheet(gradeData);
    XLSX.utils.book_append_sheet(wb, wsGrade, "TRA_CUU_BAC_LUONG");

    // 5. Sheet Danh mục Trạng thái & Loại lương
    const statusData = [
        { "Mục": "Trạng thái", "Mã (Code)": "ACTIVE", "Diễn giải": "Đang làm việc" },
        { "Mục": "Trạng thái", "Mã (Code)": "PROBATION", "Diễn giải": "Thử việc" },
        { "Mục": "Trạng thái", "Mã (Code)": "INACTIVE", "Diễn giải": "Đã nghỉ việc" },
        { "Mục": "Trạng thái", "Mã (Code)": "MATERNITY", "Diễn giải": "Nghỉ thai sản" },
        { "Mục": "Loại lương", "Mã (Code)": "TIME", "Diễn giải": "Lương thời gian" },
        { "Mục": "Loại lương", "Mã (Code)": "PIECEWORK", "Diễn giải": "Lương khoán" },
    ];
    const wsStatus = XLSX.utils.json_to_sheet(statusData);
    XLSX.utils.book_append_sheet(wb, wsStatus, "TRA_CUU_MA_KHAC");

    XLSX.writeFile(wb, "Mau_Import_Nhan_Su_HRM_Internal.xlsx");
    showToast("Đã tải file mẫu import (Nhiều sheet tra cứu)", "INFO");
  };

  const handleOpenDeptModal = (d: Department | null) => {
    if (d) {
      setEditingDept({ ...d });
    } else {
      setEditingDept({ id: `D${Date.now()}`, name: '', blockDirectorId: '', budgetNorm: 0, hrId: '' });
    }
    setIsDeptModalOpen(true);
  };

  const handleSaveDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDept) return;
    
    if (!isAdmin) {
        alert("Chỉ Admin mới có quyền cập nhật cấu trúc phòng ban.");
        return;
    }

    const isUpdate = departments.some(d => d.id === editingDept.id);
    if (isUpdate) {
      updateDept(editingDept);
    } else {
      addDept(editingDept);
    }
    setIsDeptModalOpen(false);
  };

  const openDeleteReason = (type: 'USER' | 'DEPT', id: string, name: string) => {
      if (!isAdmin) {
          alert("Hành động xóa yêu cầu quyền Admin.");
          return;
      }
      setReasonModal({ isOpen: true, type, id, name });
      setReasonText('');
  };

  const confirmDelete = () => {
      if (reasonModal.type === 'USER') {
          deleteUser(reasonModal.id, reasonText);
      } else {
          deleteDept(reasonModal.id, reasonText);
      }
      setReasonModal({ isOpen: false, type: 'USER', id: '', name: '' });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          const validDepts = new Set(departments.map(d => d.id));
          const newUsers: User[] = [];
          const errors: string[] = [];

          data.forEach((row: any, idx: number) => {
              const deptId = row["Mã Phòng Ban"] || row["deptId"];
              const userId = String(row["Mã NV"] || row["id"]);

              if (!validDepts.has(deptId)) {
                  errors.push(`Dòng ${idx + 2}: Phòng ban "${deptId}" không tồn tại trên hệ thống.`);
                  return;
              }

              if (allUsers.some(u => u.id === userId)) {
                  errors.push(`Dòng ${idx + 2}: Mã nhân viên "${userId}" đã tồn tại.`);
                  return;
              }

              newUsers.push({
                  id: userId,
                  name: row["Họ Tên"] || row["name"],
                  username: row["Username"] || row["username"],
                  password: String(row["Mật khẩu"] || row["password"] || '123'),
                  avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row["Họ Tên"])}&background=random&color=fff`,
                  joinDate: row["Ngày vào"] || new Date().toISOString().split('T')[0],
                  status: (row["Trạng thái"] as UserStatus) || UserStatus.ACTIVE,
                  roles: [UserRole.NHAN_VIEN],
                  numberOfDependents: Number(row["Số người phụ thuộc"] || row["Người phụ thuộc"] || 0),
                  salaryHistory: [],
                  assignedDeptIds: [],
                  activeAssignments: [],
                  currentDeptId: deptId,
                  currentPosition: row["Chức vụ"] || row["position"],
                  currentRankId: row["Mã Cấp bậc"] || '',
                  currentGradeId: row["Mã Bậc lương"] || '',
                  paymentType: (row["Loại lương (TIME/PIECEWORK)"] === 'PIECEWORK' || row["paymentType"] === 'PIECEWORK') ? 'PIECEWORK' : 'TIME',
                  efficiencySalary: Number(row["Lương HQ định mức"] || row["Lương HQ"] || 0),
                  pieceworkUnitPrice: Number(row["Đơn giá khoán"] || 0),
                  reservedBonusAmount: Number(row["Thưởng treo năm"] || 0),
                  probationRate: Number(row["Tỷ lệ thử việc (%)"] || 100)
              });
          });

          if (errors.length > 0) {
              alert("LỖI IMPORT EXCEL:\n\n" + errors.slice(0, 10).join('\n') + (errors.length > 10 ? '\n...' : ''));
              return;
          }

          if (newUsers.length > 0) {
              bulkAddUsers(newUsers);
          }
      };
      reader.readAsBinaryString(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE: return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case UserStatus.PROBATION: return 'bg-amber-100 text-amber-700 border-amber-200';
      case UserStatus.INACTIVE: return 'bg-slate-100 text-slate-600 border-slate-200';
      case UserStatus.PENDING_APPROVAL: return 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getStatusLabel = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE: return 'Đang làm việc';
      case UserStatus.INACTIVE: return 'Đã nghỉ việc';
      case UserStatus.PROBATION: return 'Thử việc';
      case UserStatus.MATERNITY: return 'Nghỉ thai sản';
      case UserStatus.PENDING_APPROVAL: return 'Chờ phê duyệt';
      default: return status;
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-left">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden text-left">
        <div className="p-6 border-b flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-left">
          <div className="text-left">
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <Users size={28} className="text-indigo-600"/> Quản Lý Tổ Chức
            </h1>
            <p className="text-sm text-slate-500">Thông tin nhân sự chuyên sâu, lịch sử thăng tiến & tài khoản NAS.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            {activeTab === 'USERS' && (
              <>
                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls" onChange={handleImportExcel} />
                <button 
                    onClick={handleDownloadTemplate}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 hover:bg-slate-50 transition-all"
                >
                    <FileSpreadsheet size={16} className="sm:w-[18px] sm:h-[18px]"/> <span className="hidden sm:inline">File mẫu</span>
                </button>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-slate-100 text-slate-700 rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 hover:bg-slate-200 transition-all"
                >
                    <FileUp size={16} className="sm:w-[18px] sm:h-[18px]"/> <span className="hidden sm:inline">Import Excel</span><span className="sm:hidden">Import</span>
                </button>
                <button onClick={() => handleOpenUserModal(null)} className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 bg-indigo-600 text-white rounded-lg sm:rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 shadow-lg hover:bg-indigo-700 transition-all active:scale-95"><UserPlus size={16} className="sm:w-[18px] sm:h-[18px]"/> <span className="hidden sm:inline">Thêm Nhân Viên</span><span className="sm:hidden">Thêm</span></button>
              </>
            )}
            {activeTab === 'DEPARTMENTS' && (
              <button onClick={() => handleOpenDeptModal(null)} className="flex-1 md:flex-none px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:bg-black transition-all active:scale-95"><Plus size={18}/> Thêm Phòng Ban</button>
            )}
          </div>
        </div>
        <div className="flex bg-slate-50/50">
          <button onClick={() => setActiveTab('USERS')} className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'USERS' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><Users size={16} className="sm:w-[18px] sm:h-[18px]"/> <span className="hidden sm:inline">Nhân Sự</span><span className="sm:hidden">NS</span></button>
          <button onClick={() => setActiveTab('DEPARTMENTS')} className={`flex-1 sm:flex-none px-4 sm:px-8 py-3 sm:py-4 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'DEPARTMENTS' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}><Building2 size={16} className="sm:w-[18px] sm:h-[18px]"/> <span className="hidden sm:inline">Phòng Ban</span><span className="sm:hidden">PB</span></button>
        </div>
      </div>

      {activeTab === 'USERS' ? (
        <div className="space-y-4 text-left">
           <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
              <input 
                type="text" 
                placeholder="Tìm tên, mã nhân viên..." 
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <select 
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm bg-white outline-none"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Mọi trạng thái</option>
                {Object.values(UserStatus).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
              </select>
            </div>
          </div>

          {isAdmin && allUsers.some(u => u.status === UserStatus.PENDING_APPROVAL) && (
              <div className="bg-indigo-50 border-2 border-indigo-200 p-6 rounded-[32px] animate-fade-in">
                  <h3 className="font-black text-indigo-900 uppercase text-xs tracking-widest mb-4 flex items-center gap-2">
                      <ShieldAlert size={18}/> Nhân sự chờ phê duyệt thay đổi hồ sơ
                  </h3>
                  <div className="space-y-3">
                      {allUsers.filter(u => u.status === UserStatus.PENDING_APPROVAL).map(u => (
                          <div key={u.id} className="bg-white p-4 rounded-2xl shadow-sm border border-indigo-100 flex flex-col md:flex-row justify-between items-center gap-4">
                              <div className="flex items-center gap-4">
                                  <img src={u.avatar} className="w-10 h-10 rounded-xl border"/>
                                  <div className="text-left">
                                      <p className="font-bold text-slate-800">{u.name}</p>
                                      <p className="text-[10px] text-indigo-600 font-black uppercase italic bg-indigo-50 px-2 rounded-lg py-0.5 mt-1">Thay đổi: {u.pendingUpdateSummary}</p>
                                  </div>
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={() => approveUserUpdate(u.id)} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-md hover:bg-emerald-700 transition-all"><CheckCircle size={14}/> Duyệt áp dụng</button>
                                  <button onClick={() => rejectUserUpdate(u.id)} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1 shadow-md hover:bg-rose-700 transition-all"><XCircle size={14}/> Từ chối</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-sm">
            {/* Mobile: Card Layout */}
            <div className="block md:hidden space-y-3 p-3">
              {filteredUsers.map(u => {
                const mainDept = departments.find(d => d.id === u.currentDeptId);
                const { months, coeff } = calculateSeniority(u.joinDate);
                return (
                  <div key={u.id} className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <img src={u.avatar} className="w-12 h-12 rounded-full border-2 border-indigo-200 shadow-sm" alt=""/>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-900 truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-400">@{u.username}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleOpenUserModal(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit size={18}/></button>
                        <button onClick={() => openDeleteReason('USER', u.id, u.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18}/></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase mb-1">Phòng ban</p>
                        <p className="font-bold text-indigo-700">{mainDept?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-500">{u.currentPosition || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 uppercase mb-1">Thâm niên</p>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-700">{months} tháng</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${coeff >= 1 ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400'}`}>HS: {coeff.toFixed(1)}</span>
                        </div>
                        <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusColor(u.status)}`}>{getStatusLabel(u.status)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Desktop: Table Layout */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest border-b">
                  <tr>
                    <th className="px-4 lg:px-6 py-3 lg:py-4">Nhân viên</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4">Vị trí Chính</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4">Thâm niên (Hệ số)</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4">Trạng thái</th>
                    <th className="px-4 lg:px-6 py-3 lg:py-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map(u => {
                    const mainDept = departments.find(d => d.id === u.currentDeptId);
                    const { months, coeff } = calculateSeniority(u.joinDate);
                    return (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center gap-3">
                            <img src={u.avatar} className="w-10 h-10 rounded-full border shadow-sm" alt=""/>
                            <div className="text-left">
                                <p className="font-bold text-slate-900">{u.name}</p>
                                <p className="text-[10px] text-slate-400">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <p className="font-bold text-indigo-700 text-xs">{mainDept?.name}</p>
                          <p className="text-[10px] text-slate-500 italic">{u.currentPosition}</p>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-700 text-xs">{months} tháng</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-black border ${coeff >= 1 ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400'}`}>HS: {coeff.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getStatusColor(u.status)}`}>{getStatusLabel(u.status)}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-3 lg:py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleOpenUserModal(u)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="Sửa hồ sơ"><Edit size={18}/></button>
                            <button onClick={() => openDeleteReason('USER', u.id, u.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Xóa nhân viên"><Trash2 size={18}/></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.map(dept => {
            const blockDir = allUsers.find(u => u.id === dept.blockDirectorId);
            const hrInCharge = allUsers.find(u => u.id === dept.hrId);
            return (
              <div key={dept.id} className="bg-white p-6 rounded-2xl border shadow-sm hover:border-indigo-500 transition-all flex flex-col justify-between">
                <div className="text-left">
                  <h3 className="font-bold text-slate-800 text-lg">{dept.name}</h3>
                  <div className="mt-2 space-y-2">
                    <p className="text-[10px] font-black text-slate-400 uppercase">Ngân sách dự chi: {formatCurrency(dept.budgetNorm)}</p>
                    <div className="space-y-1">
                      <p className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                        <UserCheck size={14} className="text-blue-500 shrink-0"/> GĐ Khối: {blockDir?.name || <span className="text-red-400 italic">Chưa gán</span>}
                      </p>
                      <p className="text-xs text-slate-600 flex items-center gap-2 font-medium">
                        <ShieldCheck size={14} className="text-purple-500 shrink-0"/> Hậu kiểm (HR): {hrInCharge?.name || <span className="text-red-400 italic">Chưa gán</span>}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2 pt-4 border-t border-slate-50">
                  <button onClick={() => handleOpenDeptModal(dept)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"><Edit size={16}/></button>
                  <button onClick={() => openDeleteReason('DEPT', dept.id, dept.name)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16}/></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* USER MODAL */}
      {isUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <form onSubmit={handleSaveUser} className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-4">
                  <img src={editingUser.avatar} className="w-14 h-14 rounded-full border-2 border-indigo-500 shadow-md"/>
                  <div className="text-left"><h3 className="text-xl font-bold">{editingUser.name || 'Hồ sơ mới'}</h3><p className="text-[10px] text-slate-400 uppercase font-black">Mã NV: {editingUser.id}</p></div>
               </div>
               <button type="button" onClick={() => setIsUserModalOpen(false)}><X size={28}/></button>
            </div>
            
            <div className="flex border-b bg-slate-50">
              <button type="button" onClick={() => setUserTabInModal('BASIC')} className={`px-8 py-4 text-sm font-bold flex items-center gap-2 transition-all ${userTabInModal === 'BASIC' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><UserIcon size={18}/> Bổ nhiệm & Chức danh</button>
              <button type="button" onClick={() => setUserTabInModal('ACCOUNT')} className={`px-8 py-4 text-sm font-bold flex items-center gap-2 transition-all ${userTabInModal === 'ACCOUNT' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><Lock size={18}/> Tài khoản đăng nhập</button>
              <button type="button" onClick={() => setUserTabInModal('TIMELINE')} className={`px-8 py-4 text-sm font-bold flex items-center gap-2 transition-all ${userTabInModal === 'TIMELINE' ? 'bg-white text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}><History size={18}/> Lịch sử công tác</button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-slate-50/20">
              {userTabInModal === 'BASIC' && (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                    <div className="md:col-span-3 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border text-left shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Họ Tên Nhân Viên</label>
                                  <input className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})}/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ngày gia nhập</label>
                                  <input type="date" className="w-full px-4 py-2 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.joinDate} onChange={e => setEditingUser({...editingUser, joinDate: e.target.value})}/>
                                </div>
                                <div>
                                  <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Trạng thái công tác</label>
                                  <select 
                                      className="w-full px-4 py-2 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500" 
                                      value={editingUser.status} 
                                      onChange={e => setEditingUser({...editingUser, status: e.target.value as UserStatus})}
                                  >
                                      {Object.values(UserStatus).map(s => <option key={s} value={s}>{getStatusLabel(s)}</option>)}
                                  </select>
                                </div>
                                
                                {editingUser.status === UserStatus.PROBATION && (
                                    <div className="animate-fade-in-up">
                                      <label className="text-[10px] font-black text-amber-600 uppercase block mb-1">Tỷ lệ lương thử việc (%)</label>
                                      <div className="relative">
                                          <TrendingUp size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500"/>
                                          <input 
                                              type="number" 
                                              className="w-full pl-10 px-4 py-2 border-2 border-amber-100 rounded-xl font-black bg-amber-50 text-amber-700 outline-none focus:border-amber-500" 
                                              value={editingUser.probationRate || 85} 
                                              onChange={e => setEditingUser({...editingUser, probationRate: Number(e.target.value)})}
                                          />
                                      </div>
                                      <p className="text-[9px] text-amber-500 italic mt-1 font-bold">* Nhân với lương Net thực nhận.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        {(() => {
                            const { months, coeff } = calculateSeniority(editingUser.joinDate);
                            return (
                                <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                                    <div className="absolute right-0 bottom-0 opacity-10 -mr-8 -mb-8"><CalendarDays size={120}/></div>
                                    <div className="relative z-10 flex justify-between items-start">
                                        <div className="text-left">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Thâm niên thực tế</p>
                                            <h4 className="text-3xl font-black mt-1">{months} tháng</h4>
                                        </div>
                                        <div className="bg-white/20 px-4 py-2 rounded-2xl border border-white/20 text-center">
                                            <p className="text-[8px] font-black uppercase text-indigo-200">Hệ số thụ hưởng</p>
                                            <p className="text-xl font-black">{coeff.toFixed(1)}x</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    <div className="md:col-span-2 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border space-y-4 text-left shadow-sm">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={16} className="text-indigo-500"/> Vai trò hệ thống</h4>
                            <div className="grid grid-cols-2 gap-3">
                                {Object.values(UserRole).map(role => (
                                    <label key={role} className={`flex items-center gap-2 p-2.5 border rounded-xl hover:bg-slate-50 cursor-pointer transition-all ${editingUser.roles.includes(role) ? 'bg-indigo-50 border-indigo-200' : ''}`}>
                                        <input type="checkbox" className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500" checked={editingUser.roles.includes(role)} onChange={() => toggleRole(role)}/>
                                        <span className="text-[10px] font-bold text-slate-600">{role.replace('_', ' ')}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                  </div>

                  <section className="p-8 bg-white rounded-3xl border shadow-sm space-y-8">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-900 flex items-center gap-3"><Briefcase size={22} className="text-indigo-600"/> QUYẾT ĐỊNH BỔ NHIỆM</h4>
                        <div className="flex p-1 bg-slate-100 rounded-xl">
                            <button type="button" onClick={() => setEditingUser({...editingUser, paymentType: 'TIME'})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${editingUser.paymentType === 'TIME' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Thời gian</button>
                            <button type="button" onClick={() => setEditingUser({...editingUser, paymentType: 'PIECEWORK'})} className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${editingUser.paymentType === 'PIECEWORK' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Khoán</button>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="md:col-span-2 text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Đơn vị công tác</label>
                        <select className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.currentDeptId} onChange={e => setEditingUser({...editingUser, currentDeptId: e.target.value})}>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                      <div className="text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Chức danh / Vị trí</label>
                        <input className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white outline-none focus:border-indigo-500" value={editingUser.currentPosition} onChange={e => setEditingUser({...editingUser, currentPosition: e.target.value})}/>
                      </div>
                      <div className="text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Nhóm Cấp bậc</label>
                        <select className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white outline-none focus:border-indigo-500" value={editingUser.currentRankId} onChange={e => setEditingUser({...editingUser, currentRankId: e.target.value, currentGradeId: ''})}>
                          {salaryRanks.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                      </div>
                      <div className="text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Bậc lương</label>
                        <select className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white outline-none focus:border-indigo-500" value={editingUser.currentGradeId} onChange={e => setEditingUser({...editingUser, currentGradeId: e.target.value})}>
                          <option value="">-- Chọn bậc --</option>
                          {getGradesForRank(editingUser.currentRankId).map(g => <option key={g.id} value={g.id}>Bậc {g.level} ({formatCurrency(g.baseSalary)})</option>)}
                        </select>
                      </div>
                      <div className="text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Ngày hưởng lương mới</label>
                        <input type="date" className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white outline-none" value={editingUser.currentStartDate} onChange={e => setEditingUser({...editingUser, currentStartDate: e.target.value})}/>
                      </div>
                      <div className="text-left">
                        <label className="text-[10px] font-black text-indigo-600 uppercase block mb-1 text-left">Định mức Lương HQ (LHQ_dm)</label>
                        <input type="number" className="w-full px-4 py-2.5 border rounded-xl font-black bg-indigo-50 text-indigo-700 outline-none" value={editingUser.efficiencySalary} onChange={e => setEditingUser({...editingUser, efficiencySalary: Number(e.target.value)})}/>
                      </div>

                      <div className="animate-fade-in text-left">
                          <label className="text-[10px] font-black text-purple-600 uppercase block mb-1">Hạn mức thưởng treo (Năm)</label>
                          <div className="relative">
                              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400"/>
                              <input 
                                  type="number" 
                                  className="w-full pl-10 px-4 py-2.5 border-2 border-purple-100 rounded-xl font-black bg-purple-50 text-purple-700 outline-none focus:border-purple-500" 
                                  value={editingUser.reservedBonusAmount || 0} 
                                  onChange={e => setEditingUser({...editingUser, reservedBonusAmount: Number(e.target.value)})}
                              />
                          </div>
                      </div>

                      {editingUser.paymentType === 'PIECEWORK' && (
                        <div className="animate-fade-in text-left">
                            <label className="text-[10px] font-black text-emerald-600 uppercase block mb-1">Đơn giá khoán (DG_khoan)</label>
                            <div className="relative">
                                <Calculator size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400"/>
                                <input 
                                    type="number" 
                                    className="w-full pl-10 px-4 py-2.5 border-2 border-emerald-100 rounded-xl font-black bg-emerald-50 text-emerald-700 outline-none focus:border-emerald-500" 
                                    value={editingUser.pieceworkUnitPrice || 0} 
                                    onChange={e => setEditingUser({...editingUser, pieceworkUnitPrice: Number(e.target.value)})}
                                />
                            </div>
                        </div>
                      )}
                      
                      <div className="text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Số người phụ thuộc (N_pt)</label>
                        <div className="relative">
                            <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
                            <input 
                                type="number" 
                                min="0"
                                className="w-full pl-10 px-4 py-2.5 border rounded-xl font-bold bg-white outline-none focus:border-indigo-500" 
                                value={editingUser.numberOfDependents || 0} 
                                onChange={e => setEditingUser({...editingUser, numberOfDependents: Math.max(0, Number(e.target.value))})}
                                placeholder="0"
                            />
                        </div>
                        <p className="text-[9px] text-slate-400 italic mt-1">Dùng để tính giảm trừ thuế TNCN</p>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {userTabInModal === 'ACCOUNT' && (
                <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
                    <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 flex items-start gap-4">
                        <Info size={24} className="text-indigo-600 shrink-0 mt-1"/>
                        <p className="text-sm text-indigo-800 font-medium">Khai báo thông tin tài khoản để nhân viên có thể truy cập hệ thống HRM từ mạng nội bộ NAS Synology.</p>
                    </div>
                    <div className="bg-white p-10 rounded-[40px] border shadow-sm space-y-8 text-left">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Tên đăng nhập (Username)</label>
                            <div className="relative">
                                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                <input 
                                    className="w-full pl-12 pr-4 py-4 border-2 border-slate-100 rounded-2xl font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all" 
                                    value={editingUser.username} 
                                    onChange={e => setEditingUser({...editingUser, username: e.target.value.toLowerCase().replace(/\s/g, '')})}
                                    placeholder="vd: nv.nguyenvan"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Mật khẩu truy cập</label>
                                <div className="relative">
                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        className="w-full pl-12 pr-12 py-4 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all" 
                                        value={editingUser.password || ''} 
                                        onChange={e => setEditingUser({...editingUser, password: e.target.value})}
                                        placeholder="Nhập mật khẩu mới..."
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Xác nhận mật khẩu</label>
                                <div className="relative">
                                    <Check className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"}
                                        className={`w-full pl-12 pr-12 py-4 border-2 rounded-2xl font-bold outline-none transition-all ${editingUser.password === confirmPassword ? 'border-slate-100 focus:border-indigo-500' : 'border-rose-200 focus:border-rose-500'}`} 
                                        value={confirmPassword} 
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        placeholder="Xác nhận mật khẩu..."
                                    />
                                    <button 
                                        type="button" 
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors"
                                    >
                                        {showConfirmPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                                    </button>
                                </div>
                                {editingUser.password !== confirmPassword && confirmPassword !== '' && (
                                    <p className="text-[10px] text-rose-500 font-bold mt-2 ml-1 animate-pulse">Mật khẩu xác nhận không khớp!</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
              )}

              {userTabInModal === 'TIMELINE' && (
                <div className="max-w-4xl mx-auto space-y-6">
                   <div className="bg-white p-6 rounded-2xl border shadow-sm border-l-4 border-l-indigo-600 text-left">
                      <h4 className="font-black text-indigo-600 uppercase text-xs">Vị trí hiện tại</h4>
                      <div className="grid grid-cols-2 gap-8 mt-4">
                        <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase">Cơ cấu:</p><p className="font-bold text-slate-800">{editingUser.currentPosition} - {departments.find(d => d.id === editingUser.currentDeptId)?.name}</p></div>
                        <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase">Lương CB:</p><p className="font-bold text-blue-600">{formatCurrency(salaryGrids.find(g => g.id === editingUser.currentGradeId)?.baseSalary || 0)}</p></div>
                      </div>
                   </div>
                   
                   <div className="relative pl-8 border-l-2 border-slate-200 space-y-8 ml-4">
                      {(editingUser.salaryHistory || []).map(h => (
                        <div key={h.id} className="relative bg-white p-4 rounded-xl border shadow-sm animate-fade-in-up text-left">
                           <div className="absolute -left-[42px] top-4 w-6 h-6 rounded-full bg-slate-200 border-4 border-white"></div>
                           <div className="flex justify-between items-start text-left">
                              <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 flex items-center gap-1">
                                <Clock size={10}/> {h.startDate} → {h.endDate || 'Hiện tại'}
                              </span>
                           </div>
                           <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                               <p className="text-xs font-bold text-slate-700">{h.position}</p>
                               <p className="text-[10px] text-slate-500 mt-1">{h.departmentName} • {h.rankName} Bậc {h.gradeLevel}</p>
                           </div>
                        </div>
                      ))}
                      {editingUser.salaryHistory.length === 0 && <p className="text-sm text-slate-300 italic">Chưa có bản ghi lịch sử công tác.</p>}
                   </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 shrink-0">
              <button type="button" onClick={() => setIsUserModalOpen(false)} className="px-8 py-3 bg-white border-2 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-colors">Hủy</button>
              <button 
                type="submit" 
                className={`px-12 py-3 bg-indigo-600 text-white rounded-2xl font-bold shadow-xl hover:bg-indigo-700 active:scale-95 transition-all ${(isNew || editingUser.password) && editingUser.password !== confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={(isNew || editingUser.password) && editingUser.password !== confirmPassword}
              >
                  {isNew ? 'Thêm Nhân Viên' : (isAdmin ? 'Lưu Thay Đổi' : 'Gửi Đề Xuất Cập Nhật')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DEPT MODAL */}
      {isDeptModalOpen && editingDept && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
          <form onSubmit={handleSaveDept} className="bg-white rounded-3xl shadow-2xl w-full max-md animate-fade-in-up overflow-hidden">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
              <h3 className="font-bold text-lg">{editingDept.id ? 'Cập Nhật Đơn Vị' : 'Thêm Đơn Vị Mới'}</h3>
              <button type="button" onClick={() => setIsDeptModalOpen(false)}><X size={28}/></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Tên Đơn vị / Phòng ban</label>
                <input name="name" required className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingDept.name} onChange={e => setEditingDept({...editingDept, name: e.target.value})}/>
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Giám đốc Khối (GĐK)</label>
                <select className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white" value={editingDept.blockDirectorId} onChange={e => setEditingDept({...editingDept, blockDirectorId: e.target.value})}>
                  <option value="">-- Chọn GĐ Khối --</option>
                  {allUsers.filter(u => u.roles.includes(UserRole.GIAM_DOC_KHOI)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Nhân sự phụ trách (HR Hậu kiểm)</label>
                <select className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white" value={editingDept.hrId} onChange={e => setEditingDept({...editingDept, hrId: e.target.value})}>
                  <option value="">-- Chọn Nhân sự phụ trách --</option>
                  {allUsers.filter(u => u.roles.includes(UserRole.NHAN_SU)).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Ngân sách dự chi (Hàng tháng)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                  <input type="number" className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-black text-indigo-600 bg-slate-50" value={editingDept.budgetNorm} onChange={e => setEditingDept({...editingDept, budgetNorm: Number(e.target.value)})}/>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3">
              <button type="button" onClick={() => setIsDeptModalOpen(false)} className="px-6 py-2 bg-white border rounded-xl font-bold text-slate-500">Hủy</button>
              <button type="submit" className="px-10 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg">Lưu Đơn Vị</button>
            </div>
          </form>
        </div>
      )}

      {/* REASON MODAL FOR DELETE */}
      {reasonModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left text-left text-left text-left text-left">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up p-8">
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2">
                    <ShieldAlert size={24} className="text-rose-600"/> Xác nhận xóa
                </h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    Bạn đang yêu cầu xóa <strong>{reasonModal.name}</strong>. Vui lòng nhập lý do để lưu nhật ký.
                </p>
                <textarea 
                    className="w-full p-4 border-2 border-slate-100 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 transition-all text-sm font-medium" 
                    placeholder="Lý do xóa..."
                    rows={4}
                    value={reasonText}
                    onChange={e => setReasonText(e.target.value)}
                />
                <div className="flex gap-3 justify-end">
                    <button onClick={() => setReasonModal({ ...reasonModal, isOpen: false })} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors">Hủy</button>
                    <button onClick={confirmDelete} disabled={!reasonText.trim()} className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50">Xác nhận xóa</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeManagement;
