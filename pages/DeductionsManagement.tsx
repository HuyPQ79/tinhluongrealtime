
import React, { useMemo, useState, useEffect } from 'react';
// Add missing DollarSign import from lucide-react
import { ShieldCheck, Landmark, Calculator, Percent, Info, Trash2, Plus, Clock, TrendingUp, AlertCircle, CheckCircle, XCircle, ShieldAlert, Save, DollarSign } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { PitStep, SeniorityRule, UserRole, SystemConfig } from '../types';
import { hasRole } from '../utils/rbac';

const DeductionsManagement: React.FC = () => {
  const { systemConfig, updateSystemConfig, addAuditLog, currentUser, approvePendingConfig, discardPendingConfig } = useAppContext();
  
  // Local state to buffer changes before saving
  const [localConfig, setLocalConfig] = useState<SystemConfig>(systemConfig);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLocalConfig(systemConfig);
    setIsDirty(false);
  }, [systemConfig]);

  const isAdmin = useMemo(() => hasRole(currentUser!, [UserRole.ADMIN]), [currentUser]);
  const isHR = useMemo(() => hasRole(currentUser!, [UserRole.NHAN_SU]), [currentUser]);

  const handleUpdateStep = (id: string, field: keyof PitStep, value: any) => {
    const newSteps = localConfig.pitSteps.map(s => s.id === id ? { ...s, [field]: value } : s);
    setLocalConfig({ ...localConfig, pitSteps: newSteps });
    setIsDirty(true);
  };

  const handleAddStep = () => {
    const newStep: PitStep = { id: `S${Date.now()}`, label: `Bậc ${localConfig.pitSteps.length + 1}`, threshold: 0, rate: 0, subtraction: 0 };
    setLocalConfig({ ...localConfig, pitSteps: [...localConfig.pitSteps, newStep] });
    setIsDirty(true);
  };

  const handleDeleteStep = (id: string) => {
    setLocalConfig({ ...localConfig, pitSteps: localConfig.pitSteps.filter(s => s.id !== id) });
    setIsDirty(true);
  };

  const handleUpdateSeniorityRule = (id: string, field: keyof SeniorityRule, value: any) => {
    const newRules = localConfig.seniorityRules.map(r => r.id === id ? { ...r, [field]: value } : r);
    setLocalConfig({ ...localConfig, seniorityRules: newRules });
    setIsDirty(true);
  };

  const handleAddSeniorityRule = () => {
    const newRule: SeniorityRule = { 
        id: `SR${Date.now()}`, 
        label: 'Mốc mới', 
        minMonths: 0, 
        maxMonths: 12, 
        coefficient: 1.0 
    };
    setLocalConfig({ ...localConfig, seniorityRules: [...localConfig.seniorityRules, newRule] });
    setIsDirty(true);
  };

  const handleDeleteSeniorityRule = (id: string) => {
    setLocalConfig({ ...localConfig, seniorityRules: localConfig.seniorityRules.filter(r => r.id !== id) });
    setIsDirty(true);
  };

  const handleSaveAll = () => {
      if (!isDirty) return;
      
      // updateSystemConfig in AppContext handles ADMIN (direct) vs HR (proposal)
      updateSystemConfig(localConfig);
      
      if (isAdmin) {
          alert("Hệ thống đã cập nhật và áp dụng các thông số tài chính mới.");
      } else {
          alert("Đề xuất của bạn đã được gửi tới Quản trị viên (Admin) để phê duyệt.");
      }
      setIsDirty(false);
  };

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-left">
      {/* HEADER SECTION - REMOVED STICKY TO PREVENT OVERLAP */}
      <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 text-left mb-4">
        <div className="text-left">
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3 text-left">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm"><ShieldCheck size={32} /></div>
              Cấu Hình Thuế & Khấu Trừ
          </h1>
          <p className="text-sm text-slate-500 mt-2 font-medium italic text-left">Thiết lập tham số Bảo hiểm, Biểu thuế tùy chỉnh và Thâm niên công tác.</p>
        </div>
        
        <div className="flex items-center gap-4 text-left">
            {isAdmin && systemConfig.hasPendingChanges && (
                <div className="bg-amber-50 px-5 py-3 rounded-2xl border border-amber-200 flex items-center gap-3 animate-pulse text-left mr-2 shadow-sm">
                    <AlertCircle size={20} className="text-amber-600 text-left"/>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-amber-800 uppercase text-left">Thay đổi chờ duyệt</p>
                        <div className="flex gap-3 mt-1 text-left">
                            <button onClick={approvePendingConfig} className="text-[10px] font-bold text-emerald-600 hover:underline text-left">Duyệt áp dụng</button>
                            <button onClick={discardPendingConfig} className="text-[10px] font-bold text-rose-600 hover:underline text-left">Hủy đề xuất</button>
                        </div>
                    </div>
                </div>
            )}
            
            <button 
                onClick={handleSaveAll}
                disabled={!isDirty}
                className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl transition-all active:scale-95 ${isDirty ? 'bg-indigo-600 text-white shadow-indigo-200 hover:bg-indigo-700' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
                <Save size={18}/> {isAdmin ? 'Lưu & Áp Dụng Hệ Thống' : 'Gửi Đề Xuất Thay Đổi'}
            </button>
        </div>
      </div>

      {!isAdmin && !isHR && (
          <div className="bg-rose-50 p-10 rounded-[40px] border-4 border-rose-100 flex flex-col items-center justify-center text-center text-left">
              <ShieldAlert size={64} className="text-rose-400 mb-6 text-left"/>
              <h2 className="text-2xl font-black text-rose-900 uppercase text-left">Quyền Hạn Hạn Chế</h2>
              <p className="text-slate-500 mt-2 font-medium max-w-md text-left">Khu vực này chứa các thông số định mức tài chính nhạy cảm. Chỉ Admin hoặc Nhân sự được ủy quyền mới có quyền đề xuất thay đổi.</p>
          </div>
      )}

      {(isAdmin || isHR) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
            <div className="lg:col-span-2 space-y-8 text-left">
            {/* TAX BRACKETS */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden text-left">
                <div className="p-8 border-b bg-slate-50/50 flex items-center justify-between text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-xl"><Calculator size={24}/></div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg text-left">Biểu thuế lũy tiến tùy chỉnh</h3>
                </div>
                <button onClick={handleAddStep} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg hover:bg-black transition-all text-left"><Plus size={16} className="text-left"/> Thêm Bậc</button>
                </div>
                <div className="overflow-x-auto text-left">
                <table className="w-full text-left text-xs text-left">
                    <thead className="bg-slate-900 text-white font-black uppercase border-b text-[10px] tracking-widest text-left">
                    <tr className="text-left">
                        <th className="px-8 py-5 text-left">Tên Bậc</th>
                        <th className="px-8 py-5 text-left">Ngưỡng Thu Nhập (≤)</th>
                        <th className="px-8 py-5 text-left">Thuế suất (%)</th>
                        <th className="px-8 py-5 text-left">Số tính nhanh (-)</th>
                        <th className="px-8 py-5 text-right text-left">Thao tác</th>
                    </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-left">
                    {localConfig.pitSteps.sort((a,b) => a.threshold - b.threshold).map(step => (
                        <tr key={step.id} className="hover:bg-indigo-50/30 transition-all text-left group">
                        <td className="px-8 py-6 font-black text-slate-500 text-left">{step.label}</td>
                        <td className="px-8 py-6 text-left">
                            <input type="number" className="w-40 px-4 py-2 border-2 border-slate-100 rounded-xl font-black text-slate-700 text-left outline-none focus:border-indigo-500 bg-white" value={step.threshold} onChange={e => handleUpdateStep(step.id, 'threshold', Number(e.target.value))}/>
                        </td>
                        <td className="px-8 py-6 text-emerald-600 font-black text-left">
                            <div className="flex items-center gap-2 text-left">
                                <input type="number" className="w-20 px-4 py-2 border-2 border-emerald-50 rounded-xl text-center outline-none focus:border-emerald-500 bg-white" value={step.rate} onChange={e => handleUpdateStep(step.id, 'rate', Number(e.target.value))}/>
                                <span className="font-bold text-lg">%</span>
                            </div>
                        </td>
                        <td className="px-8 py-6 text-slate-400 text-left">
                            <input type="number" className="w-40 px-4 py-2 border-2 border-slate-100 rounded-xl text-left outline-none focus:border-indigo-500 bg-white font-bold" value={step.subtraction} onChange={e => handleUpdateStep(step.id, 'subtraction', Number(e.target.value))}/>
                        </td>
                        <td className="px-8 py-6 text-right text-left">
                            <button onClick={() => handleDeleteStep(step.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100 text-left"><Trash2 size={20} className="text-left"/></button>
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>
            </div>

            {/* SENIORITY RULES MANAGEMENT */}
            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden text-left">
                <div className="p-8 border-b bg-indigo-50/50 flex items-center justify-between text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl"><TrendingUp size={24}/></div>
                    <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg text-left">Chính sách Thâm niên (HS_tn)</h3>
                </div>
                <button onClick={handleAddSeniorityRule} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all text-left"><Plus size={16} className="text-left"/> Thêm mốc mới</button>
                </div>
                <div className="p-10 space-y-6 text-left">
                    {localConfig.seniorityRules.map((rule) => (
                        <div key={rule.id} className="p-6 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-wrap items-end gap-6 relative group text-left transition-all hover:bg-white hover:border-indigo-200">
                            <div className="flex-1 min-w-[200px] text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Tên giai đoạn</label>
                                <input className="w-full bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-left outline-none focus:border-indigo-500" value={rule.label} onChange={e => handleUpdateSeniorityRule(rule.id, 'label', e.target.value)}/>
                            </div>
                            <div className="text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Tháng tối thiểu</label>
                                <input type="number" className="w-28 bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-left outline-none focus:border-indigo-500" value={rule.minMonths} onChange={e => handleUpdateSeniorityRule(rule.id, 'minMonths', Number(e.target.value))}/>
                            </div>
                            <div className="text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Tháng tối đa</label>
                                <input type="number" className="w-28 bg-white border-2 border-slate-100 rounded-2xl px-5 py-3 text-sm font-bold text-left outline-none focus:border-indigo-500" value={rule.maxMonths} onChange={e => handleUpdateSeniorityRule(rule.id, 'maxMonths', Number(e.target.value))}/>
                            </div>
                            <div className="text-left">
                                <label className="text-[10px] font-black text-indigo-600 uppercase block mb-2 ml-1 tracking-widest text-left">Hệ số thụ hưởng</label>
                                <input type="number" step="0.1" className="w-28 bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-5 py-3 text-lg font-black text-indigo-700 text-center outline-none focus:ring-2 focus:ring-indigo-300" value={rule.coefficient} onChange={e => handleUpdateSeniorityRule(rule.id, 'coefficient', Number(e.target.value))}/>
                            </div>
                            <button 
                                onClick={() => handleDeleteSeniorityRule(rule.id)}
                                className="p-3 text-slate-300 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100 text-left"
                            >
                                <Trash2 size={24} className="text-left"/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl p-10 grid grid-cols-1 md:grid-cols-2 gap-10 text-left">
                <div className="space-y-3 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left ml-1">Giảm trừ bản thân (GT_bt)</label>
                <div className="relative text-left">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400" size={24}/>
                    <input type="number" className="w-full pl-12 pr-6 py-5 border-2 border-slate-100 rounded-[24px] font-black text-indigo-600 text-3xl text-left outline-none focus:border-indigo-500 bg-slate-50 shadow-inner" value={localConfig.personalRelief} onChange={e => { setLocalConfig({ ...localConfig, personalRelief: Number(e.target.value) }); setIsDirty(true); }}/>
                </div>
                </div>
                <div className="space-y-3 text-left">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left ml-1">Giảm trừ người phụ thuộc (GT_pt)</label>
                <div className="relative text-left">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={24}/>
                    <input type="number" className="w-full pl-12 pr-6 py-5 border-2 border-slate-100 rounded-[24px] font-black text-emerald-600 text-3xl text-left outline-none focus:border-emerald-500 bg-slate-50 shadow-inner" value={localConfig.dependentRelief} onChange={e => { setLocalConfig({ ...localConfig, dependentRelief: Number(e.target.value) }); setIsDirty(true); }}/>
                </div>
                </div>
            </div>
            </div>

            <div className="space-y-8 text-left">
            <div className="bg-slate-900 rounded-[48px] p-10 text-white shadow-2xl text-left relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10"><Percent size={120}/></div>
                <h3 className="font-black text-2xl uppercase tracking-tighter mb-8 text-left relative z-10">Tỷ lệ Bảo hiểm & Phí</h3>
                <div className="space-y-8 text-left relative z-10">
                    <div className="flex justify-between items-center border-b border-white/10 pb-6 text-left">
                        <span className="text-base font-bold text-slate-300 text-left">NLĐ đóng bảo hiểm (%)</span>
                        <div className="flex items-center gap-4 text-left">
                            <input type="number" className="w-24 bg-white/10 border-2 border-white/10 rounded-2xl font-black text-center text-3xl text-white outline-none focus:ring-4 focus:ring-white/20 transition-all" value={localConfig.insuranceRate} onChange={e => { setLocalConfig({ ...localConfig, insuranceRate: Number(e.target.value) }); setIsDirty(true); }}/>
                        </div>
                    </div>
                    <div className="flex justify-between items-center border-b border-white/10 pb-6 text-left">
                        <span className="text-base font-bold text-slate-300 text-left">Kinh phí công đoàn (%)</span>
                        <div className="flex items-center gap-4 text-left">
                            <input type="number" className="w-24 bg-white/10 border-2 border-white/10 rounded-2xl font-black text-center text-3xl text-white outline-none focus:ring-4 focus:ring-white/20 transition-all" value={localConfig.unionFeeRate} onChange={e => { setLocalConfig({ ...localConfig, unionFeeRate: Number(e.target.value) }); setIsDirty(true); }}/>
                        </div>
                    </div>
                    <div className="space-y-4 text-left">
                        <label className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] text-left ml-1">Trần lương đóng bảo hiểm (MAX_BH)</label>
                        <div className="relative text-left">
                             <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" size={28}/>
                             <input type="number" className="w-full bg-white/5 border-2 border-white/10 rounded-[32px] font-black text-3xl pl-16 pr-8 py-6 text-white outline-none focus:ring-4 focus:ring-indigo-500/30 transition-all" value={localConfig.maxInsuranceBase} onChange={e => { setLocalConfig({ ...localConfig, maxInsuranceBase: Number(e.target.value) }); setIsDirty(true); }}/>
                        </div>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-[40px] border border-slate-100 p-8 shadow-xl space-y-6 text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Info size={28}/></div>
                    <h4 className="font-black text-slate-800 uppercase tracking-tight text-left">Quy tắc Vận hành</h4>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed font-medium text-left">
                    Dữ liệu thay đổi sẽ được ghi lại trong <b>Audit Trail</b>. Khi nhấn "Lưu thay đổi", hệ thống sẽ lưu tạm vào cơ sở dữ liệu trên NAS Synology. 
                    <br/><br/>
                    Nếu bạn có quyền <b>Quản trị (Admin)</b>, cấu hình sẽ được áp dụng ngay lập tức cho toàn bộ các bản ghi lương đang ở trạng thái nháp. 
                    Nếu bạn là <b>Nhân sự (HR)</b>, dữ liệu sẽ được chuyển vào trạng thái "Đề xuất thay đổi" chờ Admin phê duyệt Snapshot.
                </p>
            </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default DeductionsManagement;
