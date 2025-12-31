
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useLocation, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  LogOut, 
  Menu,
  X,
  Database,
  ShieldAlert,
  ListChecks,
  Briefcase,
  Calendar,
  TrendingUp,
  ShieldCheck,
  Server,
  Activity,
  Cpu,
  Bell,
  Check,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Info as InfoIcon,
  AlertTriangle,
  User as UserIcon,
  Edit,
  Eye,
  EyeOff
} from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import Dashboard from './pages/Dashboard';
import SalarySheet from './pages/SalarySheet';
import FormulaConfig from './pages/FormulaConfig';
import SystemAudit from './pages/SystemAudit';
import CriteriaManagement from './pages/CriteriaManagement';
import EmployeeManagement from './pages/EmployeeManagement';
import Timekeeping from './pages/Timekeeping';
import SalaryGrids from './pages/SalaryGrids';
import DeductionsManagement from './pages/DeductionsManagement';
import Login from './pages/Login';
import { hasRole, ROLES } from './utils/rbac';
import { UserRole, AppNotification, AppToast, User, UserStatus } from './types';

// Thêm Modal hồ sơ cá nhân
const ProfileModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
    const { currentUser, updateUser, showToast } = useAppContext();
    const [password, setPassword] = useState(currentUser?.password || '');
    const [confirmPassword, setConfirmPassword] = useState(currentUser?.password || '');
    const [name, setName] = useState(currentUser?.name || '');
    const [showPass, setShowPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);

    if (!currentUser) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            showToast("Mật khẩu xác nhận không khớp!", "ERROR");
            return;
        }
        updateUser({ ...currentUser, password, name });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in text-left">
            <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg"><UserIcon size={24}/></div>
                        <h3 className="font-black text-xl uppercase tracking-tighter">Hồ sơ cá nhân</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all"><X size={28}/></button>
                </div>
                <form onSubmit={handleSubmit} className="p-10 space-y-8 font-medium">
                    <div className="flex flex-col items-center gap-4 mb-4">
                        <img src={currentUser.avatar} className="w-24 h-24 rounded-full border-4 border-slate-50 shadow-xl" alt="Avatar"/>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã NV: {currentUser.id}</p>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1 tracking-widest">Họ và tên</label>
                            <input 
                                className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all text-sm" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1 tracking-widest">Mật khẩu mới</label>
                            <div className="relative">
                                <input 
                                    type={showPass ? "text" : "password"}
                                    className="w-full px-5 py-3.5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold outline-none focus:border-indigo-500 transition-all text-sm" 
                                    placeholder="Nhập mật khẩu mới..."
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase block mb-1.5 ml-1 tracking-widest">Xác nhận mật khẩu</label>
                            <div className="relative">
                                <input 
                                    type={showConfirmPass ? "text" : "password"}
                                    className={`w-full px-5 py-3.5 bg-slate-50 border-2 rounded-2xl font-bold outline-none transition-all text-sm ${password === confirmPassword ? 'border-slate-100 focus:border-indigo-500' : 'border-rose-200 focus:border-rose-500'}`} 
                                    placeholder="Xác nhận mật khẩu..."
                                    value={confirmPassword}
                                    onChange={e => setConfirmPassword(e.target.value)}
                                />
                                <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                                    {showConfirmPass ? <EyeOff size={18}/> : <Eye size={18}/>}
                                </button>
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 space-y-3">
                        <button type="submit" className={`w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all ${password !== confirmPassword ? 'opacity-50 cursor-not-allowed' : ''}`} disabled={password !== confirmPassword}>Lưu thay đổi</button>
                        <button type="button" onClick={onClose} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all">Đóng</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ToastContainer = () => {
  const { toasts } = useAppContext();
  
  return (
    <div className="fixed top-6 right-6 z-[9999] space-y-4 pointer-events-none w-full max-w-sm">
        {toasts.map(toast => (
            <div 
                key={toast.id} 
                className="pointer-events-auto bg-white/80 backdrop-blur-xl border border-slate-200 rounded-[24px] shadow-2xl p-5 flex items-start gap-4 animate-fade-in-up overflow-hidden relative group"
            >
                <div className={`mt-0.5 w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    toast.type === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600' :
                    toast.type === 'ERROR' ? 'bg-rose-100 text-rose-600' :
                    toast.type === 'WARNING' ? 'bg-amber-100 text-amber-600' :
                    'bg-indigo-100 text-indigo-600'
                }`}>
                    {toast.type === 'SUCCESS' && <CheckCircle size={22}/>}
                    {toast.type === 'ERROR' && <ShieldAlert size={22}/>}
                    {toast.type === 'WARNING' && <AlertTriangle size={22}/>}
                    {toast.type === 'INFO' && <InfoIcon size={22}/>}
                </div>
                <div className="flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Hệ thống HRM</p>
                    <p className="text-sm font-bold text-slate-800 leading-snug">{toast.message}</p>
                </div>
                {/* Progress bar simulation */}
                <div className={`absolute bottom-0 left-0 h-1 transition-all duration-[4000ms] ease-linear w-full ${
                    toast.type === 'SUCCESS' ? 'bg-emerald-500' :
                    toast.type === 'ERROR' ? 'bg-rose-500' :
                    toast.type === 'WARNING' ? 'bg-amber-500' :
                    'bg-indigo-500'
                }`} style={{ width: '0%', animation: 'progress-shrink 4s linear forwards' }}></div>
            </div>
        ))}
        <style>{`
            @keyframes progress-shrink {
                from { width: 100%; }
                to { width: 0%; }
            }
        `}</style>
    </div>
  );
};

const ProtectedRoute = ({ allowedRoles, children }: { allowedRoles?: UserRole[], children?: React.ReactNode }) => {
  const { currentUser } = useAppContext();
  if (!currentUser) return <Navigate to="/login" replace />;
  if (allowedRoles && !hasRole(currentUser, allowedRoles)) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 bg-white m-8 rounded-3xl border border-dashed border-slate-200">
        <ShieldAlert size={64} className="text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Không có quyền truy cập</h2>
        <p className="text-slate-400 mb-6">Bạn không có quyền xem khu vực này trên máy chủ nội bộ.</p>
        <Link to="/" className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all font-bold">Quay về Trang chủ</Link>
      </div>
    );
  }
  return <>{children}</>;
};

const Sidebar = ({ isOpen, setIsOpen, onOpenProfile }: { isOpen: boolean; setIsOpen: (v: boolean) => void; onOpenProfile: () => void }) => {
  const location = useLocation();
  const { currentUser, logout } = useAppContext();
  
  const allNavItems = [
    { path: '/', icon: LayoutDashboard, label: 'Tổng Quan', roles: [] },
    { path: '/timekeeping', icon: Calendar, label: 'Chấm Công & Đánh Giá', roles: [] },
    { path: '/salary', icon: Users, label: 'Bảng Lương & KPI', roles: [] },
    { path: '/deductions', icon: ShieldCheck, label: 'Thuế & Khấu Trừ', roles: ROLES.HR_ADMINS },
    { path: '/employees', icon: Briefcase, label: 'Quản lý User & Nhân Sự', roles: ROLES.HR_ADMINS },
    { path: '/salary-grids', icon: TrendingUp, label: 'Khung Năng Lực & Lương', roles: ROLES.ADMINS },
    { path: '/criteria', icon: ListChecks, label: 'Cấu Hình Tiêu Chí', roles: ROLES.MANAGERS },
    { path: '/formula', icon: Settings, label: 'Cấu Hình Hệ Thống', roles: ROLES.ADMINS },
    { path: '/audit', icon: Database, label: 'Nhật Ký & Kiểm Soát', roles: ROLES.AUDITORS },
  ];

  const navItems = allNavItems.filter(item => {
    if (item.roles.length === 0) return true;
    return hasRole(currentUser!, item.roles);
  });

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setIsOpen(false)}/>}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 text-white transform transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-3 h-20 px-8 bg-slate-950/50">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <ShieldCheck size={24} className="text-white" />
          </div>
          <div className="overflow-hidden">
            <span className="text-lg font-black tracking-tight text-white block">HRM INTERNAL</span>
            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Synology Station</span>
          </div>
        </div>

        <div className="px-6 py-6 border-b border-white/5">
          <div className="flex items-center gap-4 p-4 bg-white/5 rounded-[24px] hover:bg-white/10 transition-all group border border-white/5 relative overflow-hidden">
            <div className="relative">
                <img src={currentUser?.avatar} alt="User" className="w-12 h-12 rounded-2xl border-2 border-indigo-500 shadow-md object-cover" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-slate-900 rounded-full"></div>
            </div>
            <div className="overflow-hidden flex-1">
              <p className="text-sm font-black truncate text-white">{currentUser?.name}</p>
              <button 
                onClick={onOpenProfile}
                className="text-[9px] font-black text-indigo-400 uppercase tracking-widest leading-none flex items-center gap-1 mt-1 hover:text-white transition-colors"
              >
                <Edit size={10}/> Hồ sơ & Bảo mật
              </button>
            </div>
          </div>
        </div>

        <nav className="px-4 py-6 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] custom-scrollbar">
          {navItems.map((item) => {
             const isActive = location.pathname === item.path;
             return (
                <Link 
                    key={item.path} 
                    to={item.path} 
                    onClick={() => setIsOpen(false)} 
                    className={`flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all duration-200 relative group ${isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                    <item.icon size={22} className={isActive ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'} />
                    <span className="font-bold text-sm tracking-tight">{item.label}</span>
                    {isActive && <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full"></div>}
                </Link>
             );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-6 bg-slate-950/20 backdrop-blur-md border-t border-white/5 space-y-4">
          <div className="flex items-center justify-between px-2">
             <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NAS Connected</span>
             </div>
             <span className="text-[10px] font-black text-slate-600 uppercase">PHP 8.2</span>
          </div>
          <button onClick={logout} className="flex items-center justify-center gap-3 w-full py-4 bg-white/5 text-slate-400 hover:text-white hover:bg-rose-600/20 hover:text-rose-400 rounded-2xl transition-all font-black text-xs uppercase tracking-widest border border-white/5 active:scale-95">
            <LogOut size={18} />
            <span>Đăng Xuất Hệ Thống</span>
          </button>
        </div>
      </aside>
    </>
  );
};

const Header = ({ toggleSidebar }: { toggleSidebar: () => void }) => {
  const { notifications, markNotiRead } = useAppContext();
  const [isNotiOpen, setIsNotiOpen] = useState(false);
  const notiRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
        if (notiRef.current && !notiRef.current.contains(e.target as Node)) setIsNotiOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotiClick = (noti: AppNotification) => {
      markNotiRead(noti.id);
      setIsNotiOpen(false);
      if (noti.actionUrl) navigate(noti.actionUrl);
  };

  return (
    <header className="h-20 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 flex items-center justify-between px-6 lg:px-10 sticky top-0 z-40 shadow-sm no-print">
      <div className="flex items-center gap-6">
        <button onClick={toggleSidebar} className="p-3 text-slate-600 hover:bg-slate-100 rounded-2xl lg:hidden transition-all active:scale-90"><Menu size={24} /></button>
        <div className="hidden sm:flex flex-col">
            <h2 className="text-xl font-black text-slate-900 tracking-tight leading-none">Hệ Thống Lương Thực Lĩnh</h2>
            <div className="flex items-center gap-2 mt-1.5">
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-black rounded uppercase tracking-widest border border-slate-200">Nội Bộ NAS Synology</span>
                <span className="text-slate-300">•</span>
                <span className="text-emerald-500 text-[9px] font-black uppercase tracking-widest flex items-center gap-1"><Server size={10}/> Server: OK</span>
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
         <div className="relative" ref={notiRef}>
             <button 
                onClick={() => setIsNotiOpen(!isNotiOpen)}
                className={`p-3 rounded-2xl transition-all relative ${isNotiOpen ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
             >
                 <Bell size={22}/>
                 {unreadCount > 0 && (
                     <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                        {unreadCount}
                     </span>
                 )}
             </button>

             {isNotiOpen && (
                 <div className="absolute top-full right-0 mt-4 w-96 bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-up">
                    <div className="p-6 border-b bg-slate-50 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-widest">Thông báo hệ thống</span>
                        <button className="text-[10px] font-bold text-indigo-600 hover:underline">Đánh dấu đã đọc</button>
                    </div>
                    <div className="max-h-[450px] overflow-y-auto custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div className="p-12 text-center text-slate-300">
                                <Bell size={48} className="mx-auto mb-4 opacity-10"/>
                                <p className="text-xs font-bold uppercase tracking-widest">Không có thông báo</p>
                            </div>
                        ) : notifications.map(n => (
                            <button 
                                key={n.id}
                                onClick={() => handleNotiClick(n)}
                                className={`w-full p-6 text-left border-b border-slate-50 flex gap-4 transition-all hover:bg-slate-50 relative ${!n.isRead ? 'bg-indigo-50/30' : ''}`}
                            >
                                {!n.isRead && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>}
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                                    n.type === 'WARNING' ? 'bg-amber-100 text-amber-600' : 
                                    n.type === 'DANGER' ? 'bg-rose-100 text-rose-600' : 
                                    'bg-indigo-100 text-indigo-600'
                                }`}>
                                    {n.type === 'WARNING' ? <ShieldAlert size={20}/> : <Bell size={20}/>}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <p className="text-sm font-black text-slate-900 truncate">{n.title}</p>
                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{n.content}</p>
                                    <div className="flex items-center gap-2 mt-3 text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                                        <Clock size={10}/> {new Date(n.createdAt).toLocaleTimeString()} • {new Date(n.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                                <ChevronRight size={16} className="text-slate-300 self-center"/>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 bg-slate-50 text-center">
                        <button className="text-[10px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-colors">Xem tất cả lịch sử</button>
                    </div>
                 </div>
             )}
         </div>

         <div className="hidden md:flex items-center gap-6 bg-slate-50 px-6 py-2.5 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-2">
                <Cpu size={14} className="text-slate-400"/>
                <span className="text-[10px] font-black text-slate-500 uppercase">CPU: 12%</span>
            </div>
            <div className="flex items-center gap-2">
                <Activity size={14} className="text-slate-400"/>
                <span className="text-[10px] font-black text-slate-500 uppercase">Load: 0.45</span>
            </div>
         </div>
      </div>
    </header>
  );
};

const MainLayout: React.FC = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const { currentUser } = useAppContext();
    if (!currentUser) return <Navigate to="/login" replace />;
    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden text-left relative">
            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} onOpenProfile={() => setProfileOpen(true)} />
            <div className="flex-1 flex flex-col min-w-0">
                <Header toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
                <main className="flex-1 overflow-y-auto p-6 lg:p-10 scroll-smooth relative bg-slate-50/50">
                    <div className="max-w-[1600px] mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
            <ProfileModal isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
            <ToastContainer />
        </div>
    );
}

const App = () => (
  <AppProvider children={
    <HashRouter>
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<MainLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="salary" element={<SalarySheet />} />
                <Route path="timekeeping" element={<Timekeeping />} />
                <Route path="deductions" element={
                  <ProtectedRoute allowedRoles={ROLES.HR_ADMINS}>
                    <DeductionsManagement />
                  </ProtectedRoute>
                } />
                <Route path="employees" element={
                  <ProtectedRoute allowedRoles={ROLES.HR_ADMINS}>
                    <EmployeeManagement />
                  </ProtectedRoute>
                } />
                <Route path="salary-grids" element={
                  <ProtectedRoute allowedRoles={ROLES.ADMINS}>
                    <SalaryGrids />
                  </ProtectedRoute>
                } />
                <Route path="criteria" element={
                  <ProtectedRoute allowedRoles={ROLES.MANAGERS}>
                    <CriteriaManagement />
                  </ProtectedRoute>
                } />
                <Route path="formula" element={
                  <ProtectedRoute allowedRoles={ROLES.ADMINS}>
                    <FormulaConfig />
                  </ProtectedRoute>
                } />
                <Route path="audit" element={
                  <ProtectedRoute allowedRoles={ROLES.AUDITORS}>
                    <SystemAudit />
                  </ProtectedRoute>
                } />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    </HashRouter>
  } />
);

export default App;
