
import React, { useState, useMemo } from 'react';
import { 
  Lock, 
  Unlock, 
  FileSearch, 
  AlertOctagon,
  Search,
  Filter,
  Calendar,
  Shield,
  Activity,
  User,
  Clock,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { UserRole } from '../types';
import { hasRole } from '../utils/rbac';

const SystemAudit: React.FC = () => {
  const { 
    auditLogs, systemConfig, pendingSystemConfig, 
    toggleSystemLock, toggleApprovalMode, formatDateTime,
    approvePendingConfig, discardPendingConfig, currentUser
  } = useAppContext();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');

  const isAdmin = useMemo(() => hasRole(currentUser!, [UserRole.ADMIN]), [currentUser]);

  const filteredLogs = useMemo(() => {
      return auditLogs.filter(log => {
          const matchSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              log.actor.toLowerCase().includes(searchTerm.toLowerCase());
          const matchAction = filterAction === 'ALL' || log.action === filterAction;
          const matchDate = !filterDate || log.timestamp.startsWith(filterDate);
          return matchSearch && matchAction && matchDate;
      });
  }, [auditLogs, searchTerm, filterAction, filterDate]);

  // Fix: Ensure uniqueActions is inferred as string[] to avoid unknown key/ReactNode errors
  const uniqueActions = useMemo(() => Array.from(new Set(auditLogs.map(log => log.action))), [auditLogs]);

  const getActionColor = (action: string) => {
      if (action.includes('ĐĂNG NHẬP')) return 'bg-blue-100 text-blue-700 border-blue-200';
      if (action.includes('ĐĂNG XUẤT')) return 'bg-slate-100 text-slate-700 border-slate-200';
      if (action.includes('XÓA') || action.includes('KHÓA')) return 'bg-red-100 text-red-700 border-red-200';
      if (action.includes('THÊM') || action.includes('TẠO')) return 'bg-green-100 text-green-700 border-green-200';
      if (action.includes('CẬP NHẬT') || action.includes('SỬA')) return 'bg-orange-100 text-orange-700 border-orange-200';
      if (action.includes('PHÊ DUYỆT')) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      return 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-10 animate-fade-in pb-20 text-left">
      <div className="flex justify-between items-end">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-800 tracking-tighter flex items-center gap-3 text-left">
              <Shield size={32} className="text-indigo-600 text-left"/> Nhật Ký & Kiểm Soát Vận Hành
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium italic text-left">Giám sát toàn bộ hoạt động chỉnh sửa dữ liệu và phê duyệt các thay đổi cấu hình trọng yếu.</p>
        </div>
      </div>

      {/* PENDING CONFIGS SECTION (ONLY FOR ADMIN) */}
      {isAdmin && systemConfig.hasPendingChanges && (
        <div className="bg-indigo-50 border-4 border-indigo-200 rounded-[40px] p-10 shadow-2xl animate-fade-in-up text-left relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5"><AlertOctagon size={120}/></div>
            <div className="flex flex-col lg:flex-row justify-between items-center gap-10 relative z-10 text-left">
                <div className="flex items-center gap-8 text-left">
                    <div className="w-20 h-20 bg-indigo-600 rounded-[32px] flex items-center justify-center text-white shadow-xl animate-pulse text-left"><AlertCircle size={40}/></div>
                    <div className="text-left">
                        <h3 className="font-black text-indigo-950 uppercase text-xl tracking-tight text-left">Phê Duyệt Thay Đổi Cấu Hình</h3>
                        <p className="text-sm text-indigo-700 font-medium mt-1 text-left">Nhân sự vừa gửi đề xuất thay đổi các định mức tài chính/hệ thống.</p>
                        
                        {/* DÒNG THÔNG BÁO TÓM TẮT THAY ĐỔI */}
                        <div className="mt-4 p-4 bg-white/60 rounded-2xl border border-indigo-100 text-left">
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1 text-left">Tóm tắt biến động:</p>
                            <p className="text-xs font-bold text-indigo-900 italic text-left">{systemConfig.pendingChangeSummary || 'Không tìm thấy mô tả chi tiết.'}</p>
                        </div>
                    </div>
                </div>
                <div className="flex gap-4 shrink-0 text-left">
                    <button onClick={discardPendingConfig} className="px-8 py-4 bg-white border-2 border-indigo-200 text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-all text-left">Hủy Đề Xuất</button>
                    <button onClick={approvePendingConfig} className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center gap-3 text-left"><CheckCircle size={20}/> Phê Duyệt & Áp Dụng Hệ Thống</button>
                </div>
            </div>
        </div>
      )}

      {/* Control Panel Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
        <div className={`p-10 rounded-[48px] shadow-xl border-4 transition-all text-left ${systemConfig.isPeriodLocked ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-100'}`}>
          <div className="flex items-center gap-6 mb-6 text-left text-left">
             <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-lg text-left text-left ${systemConfig.isPeriodLocked ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
               {systemConfig.isPeriodLocked ? <Lock size={32} /> : <Unlock size={32} />}
             </div>
             <div className="text-left text-left">
               <h3 className="font-black text-slate-800 text-xl uppercase tracking-tight text-left text-left">Trạng Thái Kỳ Lương</h3>
               <span className={`text-[10px] font-black px-3 py-1 rounded-full mt-2 inline-block border text-left text-left ${systemConfig.isPeriodLocked ? 'bg-rose-200 text-rose-800 border-rose-300' : 'bg-emerald-200 text-emerald-800 border-emerald-300'}`}>
                   {systemConfig.isPeriodLocked ? 'ĐÃ KHÓA SỔ' : 'ĐANG MỞ QUYẾT TOÁN'}
               </span>
             </div>
          </div>
          <p className="text-sm text-slate-500 mb-8 font-medium leading-relaxed italic text-left text-left">
            {systemConfig.isPeriodLocked 
              ? 'Dữ liệu Snapshot trên NAS đã được đóng gói. Không cho phép bất kỳ thay đổi nào từ User.' 
              : 'Hệ thống đang mở cho phép cập nhật số liệu công, KPI và phê duyệt phiếu lương.'}
          </p>
          {isAdmin && (
              <button 
                onClick={toggleSystemLock}
                className={`w-full py-4 font-black rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 text-xs uppercase tracking-widest text-left ${
                  systemConfig.isPeriodLocked 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200' 
                    : 'bg-rose-600 text-white hover:bg-rose-700 shadow-rose-200'
                }`}
              >
                {systemConfig.isPeriodLocked ? <><Unlock size={20} /> MỞ KHÓA KỲ QUYẾT TOÁN</> : <><Lock size={20} /> KHÓA SỔ HÀNG LOẠT</>}
              </button>
          )}
        </div>

        <div className="bg-slate-900 p-10 rounded-[48px] shadow-2xl flex flex-col justify-between text-left">
           <div className="text-left">
               <div className="flex items-center gap-6 mb-6 text-left">
                 <div className="w-16 h-16 bg-white/10 rounded-3xl flex items-center justify-center text-white shadow-xl text-left text-left"><AlertOctagon size={32} /></div>
                 <div className="text-left text-left">
                   <h3 className="font-black text-white text-xl uppercase tracking-tight text-left text-left">Chế Độ Phê Duyệt</h3>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 text-left text-left">Giao thức kiểm soát nội bộ</p>
                 </div>
              </div>
              <div className="flex items-center justify-between bg-white/5 p-6 rounded-3xl border border-white/10 mb-6 text-left text-left">
                <span className="text-sm font-black text-indigo-400 uppercase tracking-widest text-left text-left text-left">
                  {systemConfig.approvalMode === 'POST_AUDIT' ? 'HẬU KIỂM (POST-AUDIT)' : 'KIỂM SOÁT CHẶT (FULL)'}
                </span>
                {isAdmin && (
                    <div className="relative inline-block w-12 mr-2 align-middle select-none transition duration-200 ease-in text-left text-left">
                        <input 
                          type="checkbox" 
                          name="toggle" 
                          id="toggle" 
                          checked={systemConfig.approvalMode === 'FULL_APPROVAL'}
                          onChange={toggleApprovalMode}
                          className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-indigo-600 right-0 checked:right-0"
                          style={{ right: systemConfig.approvalMode === 'FULL_APPROVAL' ? '0' : '50%' }}
                        />
                        <label 
                          htmlFor="toggle" 
                          className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${systemConfig.approvalMode === 'FULL_APPROVAL' ? 'bg-indigo-600' : 'bg-slate-700'}`}
                        ></label>
                    </div>
                )}
              </div>
           </div>
           <div className="text-[10px] text-slate-400 bg-white/5 p-4 rounded-2xl border border-dashed border-white/10 text-left text-left">
              <p className="text-left text-left"><strong className="text-white text-left text-left text-left text-left text-left">Hậu kiểm:</strong> Ưu tiên tốc độ, cho phép HR rà soát sau khi duyệt.</p>
              <p className="mt-1 text-left text-left"><strong className="text-white text-left text-left text-left text-left text-left text-left">Kiểm soát chặt:</strong> Dữ liệu chỉ được đóng Snapshot khi có chữ ký số Admin.</p>
           </div>
        </div>
      </div>

      {/* LOG VIEWER */}
      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-h-[700px] text-left text-left">
        <div className="p-8 border-b border-slate-100 bg-slate-50/50 space-y-6 text-left text-left">
            <div className="flex justify-between items-center text-left text-left">
                <h3 className="font-black text-slate-800 flex items-center gap-3 text-xl uppercase tracking-tighter text-left text-left text-left">
                    <Activity size={24} className="text-indigo-600 text-left text-left text-left"/> Nhật Ký Hệ Thống (Audit Trail)
                </h3>
                <span className="text-xs font-black bg-indigo-600 text-white px-4 py-1.5 rounded-full shadow-lg text-left text-left text-left text-left">
                    {filteredLogs.length} sự kiện
                </span>
            </div>
            
            <div className="flex flex-col md:flex-row gap-4 text-left text-left text-left">
                <div className="relative flex-1 text-left text-left text-left">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-left text-left text-left" size={18} />
                    <input 
                        type="text" 
                        placeholder="Tìm theo nội dung, tên người thực hiện..." 
                        className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-bold focus:border-indigo-500 outline-none transition-all text-left text-left text-left text-left"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-3 text-left text-left text-left">
                    <div className="relative min-w-[200px] text-left text-left text-left text-left text-left text-left">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-left text-left text-left text-left text-left text-left" size={18} />
                        <select 
                            className="w-full pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 appearance-none uppercase text-left text-left text-left text-left text-left"
                            value={filterAction}
                            onChange={e => setFilterAction(e.target.value)}
                        >
                            <option value="ALL">Mọi hành động</option>
                            {uniqueActions.map((act: string) => <option key={act} value={act}>{act}</option>)}
                        </select>
                    </div>
                    <div className="relative text-left text-left text-left text-left text-left text-left text-left">
                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-left text-left text-left text-left text-left text-left text-left" size={18}/>
                        <input 
                            type="date" 
                            className="pl-12 pr-4 py-3.5 bg-white border-2 border-slate-100 rounded-2xl text-sm font-black outline-none focus:border-indigo-500 text-left text-left text-left text-left text-left"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar text-left text-left text-left text-left">
          <table className="w-full text-left border-collapse text-left text-left text-left text-left">
            <thead className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-[0.2em] sticky top-0 z-10 text-left text-left text-left text-left">
              <tr className="text-left text-left text-left text-left">
                <th className="px-8 py-5 border-b border-slate-800 text-left text-left text-left text-left">Thời Gian</th>
                <th className="px-8 py-5 border-b border-slate-800 text-left text-left text-left text-left text-left">Tài Khoản Thực Hiện</th>
                <th className="px-8 py-5 border-b border-slate-800 text-left text-left text-left text-left text-left text-left">Hành Động</th>
                <th className="px-8 py-5 border-b border-slate-800 text-left text-left text-left text-left text-left text-left text-left">Chi Tiết Biến Động Dữ Liệu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-left text-left text-left text-left text-left">
              {filteredLogs.length === 0 ? (
                  <tr className="text-left text-left text-left text-left text-left">
                      <td colSpan={4} className="p-32 text-center text-slate-300 text-left text-left text-left text-left text-left">
                          <FileSearch size={64} className="mx-auto mb-4 opacity-10 text-left text-left text-left text-left text-left text-left"/>
                          <p className="font-black uppercase tracking-widest text-[10px] text-left text-left text-left text-left text-left text-left text-left text-left">Không tìm thấy dữ liệu nhật ký phù hợp</p>
                      </td>
                  </tr>
              ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-indigo-50/30 transition-all group text-left text-left text-left text-left text-left">
                      <td className="px-8 py-6 whitespace-nowrap text-left text-left text-left text-left text-left text-left">
                          <div className="flex items-center gap-3 text-slate-500 text-xs font-mono font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                              <Clock size={14} className="text-indigo-400 text-left text-left text-left text-left text-left text-left text-left text-left text-left"/> {formatDateTime(log.timestamp)}
                          </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                          <div className="flex items-center gap-3 font-black text-slate-800 text-sm text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-indigo-600 border border-slate-200 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><User size={18}/></div>
                              {log.actor}
                          </div>
                      </td>
                      <td className="px-8 py-6 whitespace-nowrap text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black border shadow-sm uppercase tracking-tighter text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-sm text-slate-600 font-medium max-w-xl text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                        <div className="flex flex-col gap-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <span className="text-slate-700 font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left">{log.details}</span>
                            {log.isConfigAction && <span className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><AlertCircle size={10}/> Cấu hình hệ thống</span>}
                        </div>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t flex justify-between items-center px-8 text-left text-left text-left text-left text-left text-left text-left text-left text-left">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] text-left text-left text-left text-left text-left text-left text-left text-left">Lưu trữ Snapshot trên NAS Station • Log Integrity Verified</p>
            <span className="flex items-center gap-2 text-[10px] font-bold text-emerald-600 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><Shield size={14}/> Mã hóa SHA-256</span>
        </div>
      </div>
    </div>
  );
};

export default SystemAudit;
