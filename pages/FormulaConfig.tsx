import React, { useState, useEffect } from 'react';
import { 
  Save, Plus, Trash2, Edit, Sigma, Briefcase, DollarSign, X, Calculator, 
  Info, CheckCircle, Clock, BookOpen, Search, ListChecks, ShieldCheck, 
  Zap, AlertTriangle, Database, HardDrive, RotateCcw, FileText, Download, Upload, Server, ShieldAlert
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DailyWorkItem, SalaryFormula, SalaryVariable, UserRole, RecordStatus, ApprovalStep } from '../types';

/**
 * FormulaConfig component handles system-level configurations including salary formulas,
 * system variables, approval workflows, and daily work item catalogs.
 */
const FormulaConfig: React.FC = () => {
  const { 
    dailyWorkCatalog, addDailyWorkItem, updateDailyWorkItem, deleteDailyWorkItem, 
    formulas, addFormula, updateFormula, deleteFormula,
    systemConfig, updateSystemConfig,
    salaryVariables, addSalaryVariable, updateSalaryVariable, deleteSalaryVariable,
    addAuditLog
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'FORMULAS' | 'VARIABLES' | 'APPROVAL' | 'DAILY_WORK' | 'MAINTENANCE'>('FORMULAS');
  const [varSearch, setVarSearch] = useState('');
  
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>('2025-05-15 03:00 AM');

  const [isDWModalOpen, setIsDWModalOpen] = useState(false);
  const [editingDWItem, setEditingDWItem] = useState<DailyWorkItem | null>(null);

  const [isFModalOpen, setIsFModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<SalaryFormula | null>(null);

  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<SalaryVariable | null>(null);

  // REASON MODAL FOR DELETE
  const [reasonModal, setReasonModal] = useState<{ isOpen: boolean, type: 'FORMULA' | 'DW' | 'VAR', id: string, name: string }>({ isOpen: false, type: 'FORMULA', id: '', name: '' });
  const [reasonText, setReasonText] = useState('');

  const handleSaveDW = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const name = (form.elements.namedItem('name') as HTMLInputElement).value;
    const price = Number((form.elements.namedItem('price') as HTMLInputElement).value);
    if (editingDWItem) updateDailyWorkItem({ id: editingDWItem.id, name, unitPrice: price });
    else addDailyWorkItem({ id: `DW${Date.now()}`, name, unitPrice: price });
    setIsDWModalOpen(false);
  };

  const handleBackup = () => {
      setIsBackupLoading(true);
      setTimeout(() => {
          setIsBackupLoading(false);
          setLastBackup(new Date().toLocaleString());
          addAuditLog('BACKUP DATABASE', 'Đã thực hiện sao lưu cơ sở dữ liệu HRM lên Volume NAS');
          alert("Sao lưu cơ sở dữ liệu phpMyAdmin thành công!");
      }, 2000);
  };

  const handleSaveFormula = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newFormula: SalaryFormula = {
        id: editingFormula ? editingFormula.id : `F${Date.now()}`,
        name: (form.elements.namedItem('fname') as HTMLInputElement).value,
        targetField: (form.elements.namedItem('targetField') as HTMLSelectElement).value,
        formulaExpression: (form.elements.namedItem('expression') as HTMLTextAreaElement).value,
        isActive: true,
        order: editingFormula ? editingFormula.order : formulas.length + 1,
        description: (form.elements.namedItem('desc') as HTMLTextAreaElement).value
    };
    if (editingFormula) updateFormula(newFormula);
    else addFormula(newFormula);
    setIsFModalOpen(false);
  };

  const handleSaveVar = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newVar: SalaryVariable = {
        code: (form.elements.namedItem('code') as HTMLInputElement).value,
        name: (form.elements.namedItem('name') as HTMLInputElement).value,
        desc: (form.elements.namedItem('desc') as HTMLTextAreaElement).value,
        group: (form.elements.namedItem('group') as HTMLInputElement).value || 'HỆ THỐNG'
    };
    if (editingVar) updateSalaryVariable(newVar);
    else addSalaryVariable(newVar);
    setIsVarModalOpen(false);
  };

  const openDeleteReason = (type: 'FORMULA' | 'DW' | 'VAR', id: string, name: string) => {
    setReasonModal({ isOpen: true, type, id, name });
    setReasonText('');
  };

  const confirmDelete = () => {
    if (reasonModal.type === 'FORMULA') {
        deleteFormula(reasonModal.id, reasonText);
    } else if (reasonModal.type === 'DW') {
        deleteDailyWorkItem(reasonModal.id, reasonText);
    } else {
        deleteSalaryVariable(reasonModal.id, reasonText);
    }
    setReasonModal({ isOpen: false, type: 'FORMULA', id: '', name: '' });
  };

  const addApprovalStep = () => {
      const newStep: ApprovalStep = {
          id: `step_${Date.now()}`,
          role: UserRole.QUAN_LY,
          label: 'Bước phê duyệt mới',
          statusOnEnter: RecordStatus.PENDING_MANAGER,
          approvalType: 'DECISIVE',
          condition: 'ALL'
      };
      updateSystemConfig({ approvalWorkflow: [...(systemConfig.approvalWorkflow || []), newStep] });
  };

  const deleteApprovalStep = (id: string) => {
      updateSystemConfig({ approvalWorkflow: systemConfig.approvalWorkflow.filter(s => s.id !== id) });
  };

  const updateStepValue = (id: string, field: keyof ApprovalStep, value: any) => {
      const updated = systemConfig.approvalWorkflow.map(s => {
          if (s.id === id) {
              const newStep = { ...s, [field]: value };
              if (field === 'role') {
                  if (value === UserRole.QUAN_LY) newStep.statusOnEnter = RecordStatus.PENDING_MANAGER;
                  if (value === UserRole.GIAM_DOC_KHOI) newStep.statusOnEnter = RecordStatus.PENDING_GDK;
                  if (value === UserRole.BAN_LANH_DAO) newStep.statusOnEnter = RecordStatus.PENDING_BLD;
                  if (value === UserRole.NHAN_SU) newStep.statusOnEnter = RecordStatus.PENDING_HR;
              }
              return newStep;
          }
          return s;
      });
      updateSystemConfig({ approvalWorkflow: updated });
  };

  return (
    <div className="space-y-10 pb-20 text-left animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div className="text-left text-left">
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter text-left">Cấu Hình Vận Hành Hệ Thống</h1>
            <p className="text-sm text-slate-500 font-medium italic mt-2 text-left">Thiết lập logic lương, workflow phê duyệt và bảo trì máy chủ Synology Station.</p>
        </div>
        <div className="flex gap-3 text-left">
            {activeTab === 'FORMULAS' && <button onClick={() => { setEditingFormula(null); setIsFModalOpen(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"><Plus size={18}/> Tạo Công Thức</button>}
            {activeTab === 'VARIABLES' && <button onClick={() => { setEditingVar(null); setIsVarModalOpen(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"><Plus size={18}/> Thêm Biến Số</button>}
            {activeTab === 'APPROVAL' && <button onClick={addApprovalStep} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"><Plus size={18}/> Thêm Cấp Phê Duyệt</button>}
            {activeTab === 'DAILY_WORK' && <button onClick={() => { setEditingDWItem(null); setIsDWModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"><Plus size={18}/> Thêm Nghiệp Vụ</button>}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden text-left">
        <div className="flex border-b bg-slate-50/50 overflow-x-auto custom-scrollbar text-left">
          <button onClick={() => setActiveTab('FORMULAS')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'FORMULAS' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><Sigma size={18}/> Logic Lương</button>
          <button onClick={() => setActiveTab('VARIABLES')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'VARIABLES' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><BookOpen size={18}/> Biến Số</button>
          <button onClick={() => setActiveTab('APPROVAL')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'APPROVAL' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><ListChecks size={18}/> Phê Duyệt</button>
          <button onClick={() => setActiveTab('DAILY_WORK')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'DAILY_WORK' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><Briefcase size={18}/> Công Nhật</button>
          <button onClick={() => setActiveTab('MAINTENANCE')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'MAINTENANCE' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><Server size={18}/> Bảo Trì NAS</button>
        </div>

        <div className="p-10 text-left">
          {activeTab === 'MAINTENANCE' && (
              <div className="max-w-4xl mx-auto space-y-10 animate-fade-in-up text-left">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                      <div className="bg-slate-50 border border-slate-200 p-8 rounded-[40px] space-y-6 group hover:border-indigo-300 transition-all text-left">
                          <div className="flex items-center gap-4 text-left">
                              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:rotate-6 transition-transform"><Database size={28}/></div>
                              <div className="text-left">
                                  <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg text-left">Cơ Sở Dữ Liệu</h3>
                                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest text-left">MariaDB / phpMyAdmin</p>
                              </div>
                          </div>
                          <div className="space-y-4 text-left">
                              <div className="p-5 bg-white rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm text-left">
                                  <div className="flex flex-col text-left">
                                      <span className="text-[10px] font-black text-slate-400 uppercase mb-1 text-left">Bản sao lưu gần nhất</span>
                                      <span className="text-xs font-black text-slate-700 text-left">{lastBackup || 'Chưa bao giờ'}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black border border-emerald-100 text-right">
                                      <CheckCircle size={10}/> Health: 100%
                                  </div>
                              </div>
                              <button 
                                onClick={handleBackup}
                                disabled={isBackupLoading}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 ${isBackupLoading ? 'bg-slate-200 text-slate-400' : 'bg-slate-900 text-white shadow-xl hover:bg-black'}`}
                              >
                                {isBackupLoading ? <><RotateCcw size={18} className="animate-spin"/> Đang xử lý...</> : <><Download size={18}/> Tạo Bản Sao Lưu Ngay</>}
                              </button>
                          </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 p-8 rounded-[40px] space-y-6 group hover:border-amber-300 transition-all text-left">
                          <div className="flex items-center gap-4 text-left">
                              <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center text-white shadow-xl group-hover:rotate-6 transition-transform text-left"><HardDrive size={28}/></div>
                              <div className="text-left text-left">
                                  <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg text-left">Lưu Trữ Snapshot</h3>
                                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest text-left">NAS File Station</p>
                              </div>
                          </div>
                          <div className="space-y-4 text-left">
                              <div className="p-5 bg-white rounded-3xl border border-slate-100 flex justify-between items-center shadow-sm text-left">
                                  <div className="flex flex-col text-left text-left">
                                      <span className="text-[10px] font-black text-slate-400 uppercase mb-1 text-left">Dung lượng sử dụng</span>
                                      <span className="text-xs font-black text-slate-700 text-left">12.5 GB / 500 GB</span>
                                  </div>
                                  <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden border border-slate-50 text-right">
                                      <div className="h-full bg-amber-500 w-[2.5%]"></div>
                                  </div>
                              </div>
                              <button 
                                onClick={() => alert("Hệ thống Snapshot đang quét dữ liệu định kỳ trên máy chủ nội bộ.")}
                                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:border-amber-500 hover:text-amber-600 active:scale-95"
                              >
                                <FileText size={18}/> Quản lý File Snapshot
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'APPROVAL' && (
            <div className="max-w-5xl mx-auto space-y-10 text-left animate-fade-in-up">
                <div className="bg-indigo-600 text-white p-10 rounded-[50px] flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-indigo-500/20 text-left">
                   <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center text-white border border-white/20 shadow-xl shrink-0"><ShieldCheck size={40}/></div>
                   <div className="text-center md:text-left text-left">
                       <h3 className="font-black uppercase text-xl tracking-tighter text-left">Luồng Phê Duyệt Thông Minh</h3>
                       <p className="text-sm text-indigo-100 mt-2 font-medium leading-relaxed italic opacity-80 text-left">Cơ chế phê duyệt đa cấp tự động bỏ qua các bước không liên quan đến vị trí của nhân sự được thụ hưởng.</p>
                   </div>
                </div>

                <div className="flex justify-end mb-6">
                    <button 
                        onClick={addApprovalStep}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-indigo-700 transition-all"
                    >
                        <Plus size={18}/> Thêm Bước Phê Duyệt
                    </button>
                </div>

                <div className="space-y-6 text-left text-left">
                    {systemConfig.approvalWorkflow.length === 0 ? (
                        <div className="p-12 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-300 text-center">
                            <ShieldCheck size={48} className="mx-auto text-slate-400 mb-4"/>
                            <p className="text-slate-500 font-bold">Chưa có bước phê duyệt nào. Nhấn "Thêm Bước Phê Duyệt" để bắt đầu.</p>
                        </div>
                    ) : (
                        systemConfig.approvalWorkflow.map((step, index) => (
                            <div key={step.id} className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col md:flex-row items-center gap-8 relative group transition-all hover:bg-white hover:border-indigo-200 text-left">
                                <div className="w-14 h-14 bg-slate-900 text-white rounded-[24px] flex items-center justify-center font-black text-lg shrink-0 shadow-xl group-hover:bg-indigo-600 transition-all">#{index + 1}</div>
                                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full text-left">
                                    <div className="text-left text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-widest text-left">Tiêu đề bước</label>
                                        <input className="w-full px-4 py-3 border rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white transition-all text-left" value={step.label} onChange={e => updateStepValue(step.id, 'label', e.target.value)}/>
                                    </div>
                                    <div className="text-left text-left">
                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-2 block ml-1 tracking-widest text-left">Phân quyền xử lý</label>
                                        <select className="w-full px-4 py-3 border rounded-2xl font-bold text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-left" value={step.role} onChange={e => updateStepValue(step.id, 'role', e.target.value)}>
                                            <option value={UserRole.QUAN_LY}>Quản Lý</option>
                                            <option value={UserRole.GIAM_DOC_KHOI}>Giám Đốc Khối</option>
                                            <option value={UserRole.BAN_LANH_DAO}>Tổng Giám Đốc</option>
                                            <option value={UserRole.NHAN_SU}>Nhân Sự (Hậu kiểm)</option>
                                        </select>
                                    </div>
                                    <div className="text-left text-left">
                                        <label className="text-[10px] font-black text-indigo-400 uppercase mb-2 block ml-1 tracking-widest text-left">Trạng thái khi vào bước</label>
                                        <select className="w-full px-4 py-3 border border-indigo-100 rounded-2xl font-black text-xs bg-indigo-50 text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-left" value={step.statusOnEnter} onChange={e => updateStepValue(step.id, 'statusOnEnter', e.target.value)}>
                                            <option value={RecordStatus.PENDING_MANAGER}>PENDING_MANAGER</option>
                                            <option value={RecordStatus.PENDING_GDK}>PENDING_GDK</option>
                                            <option value={RecordStatus.PENDING_BLD}>PENDING_BLD</option>
                                            <option value={RecordStatus.PENDING_HR}>PENDING_HR</option>
                                        </select>
                                    </div>
                                    <div className="text-left text-left">
                                        <label className="text-[10px] font-black text-orange-400 uppercase mb-2 block ml-1 tracking-widest text-left">Tính chất duyệt</label>
                                        <select className="w-full px-4 py-3 border border-orange-100 rounded-2xl font-black text-xs bg-orange-50 text-orange-700 outline-none focus:ring-2 focus:ring-orange-500 transition-all text-left" value={step.approvalType || 'DECISIVE'} onChange={e => updateStepValue(step.id, 'approvalType', e.target.value)}>
                                            <option value="DECISIVE">Quyết Định Chốt</option>
                                            <option value="INFORMATIVE">Chỉ Thông Báo</option>
                                        </select>
                                    </div>
                                </div>
                                <button onClick={() => deleteApprovalStep(step.id)} className="p-4 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all opacity-0 group-hover:opacity-100"><Trash2 size={24}/></button>
                            </div>
                        ))
                    )}
                </div>
            </div>
          )}
          
          {activeTab === 'FORMULAS' && (
              <div className="grid grid-cols-1 gap-6 text-left animate-fade-in-up text-left">
                  {formulas.sort((a,b) => a.order - b.order).map(f => (
                      <div key={f.id} className="p-8 border rounded-[32px] bg-white hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all flex flex-col md:flex-row justify-between items-start md:items-center group gap-6 text-left border-slate-100 text-left">
                          <div className="space-y-4 flex-1 text-left text-left">
                              <div className="flex items-center gap-4 text-left text-left">
                                  <span className="text-[11px] font-black bg-slate-900 text-white px-4 py-1 rounded-full shadow-lg border-2 border-white">#{f.order}</span>
                                  <h4 className="font-black text-slate-800 uppercase tracking-tight text-lg text-left">{f.name}</h4>
                              </div>
                              <div className="relative text-left">
                                  <code className="text-sm text-indigo-700 bg-slate-50 px-6 py-4 rounded-2xl font-mono block border border-slate-100 text-left overflow-x-auto text-left">
                                      {f.formulaExpression}
                                  </code>
                              </div>
                              <p className="text-xs text-slate-400 font-medium italic mt-2 px-1 text-left">"{f.description}"</p>
                          </div>
                          <div className="flex gap-2 shrink-0 text-left text-right">
                            <button onClick={() => {setEditingFormula(f); setIsFModalOpen(true);}} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit size={20}/></button>
                            <button onClick={() => openDeleteReason('FORMULA', f.id, f.name)} className="p-4 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={20}/></button>
                          </div>
                      </div>
                  ))}
              </div>
          )}

          {activeTab === 'VARIABLES' && (
            <div className="space-y-10 text-left animate-fade-in-up text-left">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                    {salaryVariables.filter(v => v.name.includes(varSearch) || v.code.includes(varSearch)).map(v => (
                        <div key={v.code} className="p-8 border-2 border-slate-50 rounded-[40px] bg-white hover:border-indigo-200 hover:shadow-2xl transition-all group text-left">
                            <div className="flex items-center justify-between mb-4 text-left">
                                <div className="flex items-center gap-3 text-left">
                                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl group-hover:rotate-12 transition-transform"><BookOpen size={18}/></div>
                                    <code className="text-xs font-black text-indigo-600 uppercase tracking-widest text-left">{"{"}{v.code}{"}"}</code>
                                </div>
                                <div className="flex gap-1 text-left">
                                    <button onClick={() => { setEditingVar(v); setIsVarModalOpen(true); }} className="p-2 text-slate-200 hover:text-indigo-600 transition-colors"><Edit size={16}/></button>
                                    <button onClick={() => openDeleteReason('VAR', v.code, v.name)} className="p-2 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                </div>
                            </div>
                            <h5 className="font-black text-slate-800 text-base tracking-tight text-left">{v.name}</h5>
                            <p className="text-[11px] text-slate-400 mt-3 italic font-medium leading-relaxed text-left border-t pt-3 border-slate-50 group-hover:text-slate-600 transition-colors">"{v.desc}"</p>
                        </div>
                    ))}
                </div>
            </div>
          )}

          {activeTab === 'DAILY_WORK' && (
            <div className="space-y-10 text-left animate-fade-in-up text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 text-left">
                {dailyWorkCatalog.map(item => (
                  <div key={item.id} className="p-10 border border-slate-100 rounded-[48px] flex flex-col justify-between group hover:border-indigo-400 hover:shadow-2xl hover:shadow-indigo-500/5 transition-all bg-white relative overflow-hidden text-left">
                    <div className="relative z-10 text-left">
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 text-left">Đơn giá / Ngày</span>
                        <h4 className="font-black text-slate-800 uppercase tracking-tighter text-xl mt-4 leading-tight text-left">{item.name}</h4>
                        <div className="mt-8 flex items-baseline gap-2 text-left">
                            <p className="text-4xl font-black text-slate-900 tracking-tighter text-left">{new Intl.NumberFormat('vi-VN').format(item.unitPrice)}</p>
                            <span className="text-xs text-slate-400 font-black uppercase tracking-widest">VND</span>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-10 opacity-0 group-hover:opacity-100 transition-all relative z-10 translate-y-2 group-hover:translate-y-0 text-left">
                        <button onClick={() => { setEditingDWItem(item); setIsDWModalOpen(true); }} className="flex-1 py-3 bg-indigo-50 text-indigo-600 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2"><Edit size={16}/> Sửa</button>
                        <button onClick={() => openDeleteReason('DW', item.id, item.name)} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* REASON MODAL FOR DELETE */}
      {reasonModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up p-8 text-left">
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 text-left">
                    <ShieldAlert size={24} className="text-rose-600"/> Xác nhận xóa
                </h3>
                <p className="text-sm text-slate-500 mb-6 leading-relaxed text-left">
                    Bạn đang yêu cầu xóa <strong>{reasonModal.name}</strong>. Vui lòng nhập lý do xóa để lưu vào nhật ký kiểm soát.
                </p>
                <textarea 
                    className="w-full p-4 border-2 border-slate-100 rounded-2xl mb-6 outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50 transition-all text-sm font-medium text-left" 
                    placeholder="Lý do xóa..."
                    rows={4}
                    value={reasonText}
                    onChange={e => setReasonText(e.target.value)}
                />
                <div className="flex gap-3 justify-end text-left">
                    <button onClick={() => setReasonModal({ ...reasonModal, isOpen: false })} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors text-left">Hủy</button>
                    <button 
                        onClick={confirmDelete} 
                        disabled={!reasonText.trim()}
                        className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:grayscale"
                    >
                        Xác nhận xóa
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* MODAL DANH MỤC CÔNG NHẬT */}
      {isDWModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 text-left">
          <form onSubmit={handleSaveDW} className="bg-white rounded-[40px] shadow-2xl w-full max-w-md animate-fade-in-up text-left overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-left">
                <div className="flex items-center gap-4 text-left text-left">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg text-left"><Briefcase size={28}/></div>
                    <h3 className="font-black text-xl tracking-tighter uppercase text-left">{editingDWItem ? 'Sửa Nghiệp Vụ' : 'Thêm Nghiệp Vụ Mới'}</h3>
                </div>
                <button type="button" onClick={() => setIsDWModalOpen(false)} className="hover:bg-white/10 p-2 rounded-full transition-all text-white"><X size={28}/></button>
            </div>
            <div className="p-10 space-y-8 text-left">
                <div className="text-left text-left text-left">
                    <label className="text-[11px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Tên công việc nghiệp vụ</label>
                    <input name="name" required className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-indigo-500 bg-slate-50 transition-all text-sm text-left" defaultValue={editingDWItem?.name} placeholder="VD: Bốc xếp, Kiểm kho..."/>
                </div>
                <div className="text-left text-left text-left">
                    <label className="text-[11px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Đơn giá định mức / Ngày công</label>
                    <div className="relative text-left">
                        <DollarSign className="absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" size={24}/>
                        <input name="price" type="number" required className="w-full pl-16 pr-6 py-5 border-2 border-slate-100 rounded-2xl font-black text-slate-900 text-3xl outline-none focus:border-indigo-500 bg-slate-50 transition-all text-left" defaultValue={editingDWItem?.unitPrice} placeholder="250000"/>
                    </div>
                </div>
            </div>
            <div className="p-8 border-t flex justify-end gap-4 bg-slate-50 text-left">
                <button type="button" onClick={() => setIsDWModalOpen(false)} className="px-10 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all text-left">Bỏ qua</button>
                <button type="submit" className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-indigo-500/20">Lưu Nghiệp Vụ</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CẤU HÌNH CÔNG THỨC */}
      {isFModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 text-left">
          <form onSubmit={handleSaveFormula} className="bg-white rounded-[40px] shadow-2xl w-full max-w-2xl animate-fade-in-up text-left overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-left">
                <div className="flex items-center gap-4 text-left">
                    <Sigma size={28}/>
                    <h3 className="font-black text-xl tracking-tighter uppercase text-left">{editingFormula ? 'Sửa Công Thức' : 'Thêm Công Thức Lương'}</h3>
                </div>
                <button type="button" onClick={() => setIsFModalOpen(false)}><X size={28}/></button>
            </div>
            <div className="p-10 space-y-6 text-left">
                <div className="grid grid-cols-2 gap-6 text-left">
                    <div className="text-left text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Tên gợi nhớ</label>
                        <input name="fname" required className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50 text-left" defaultValue={editingFormula?.name} />
                    </div>
                    <div className="text-left text-left">
                        <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Trường dữ liệu đích</label>
                        <select name="targetField" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold bg-white text-left" defaultValue={editingFormula?.targetField}>
                            <option value="actualBaseSalary">Lương CB thực tế</option>
                            <option value="actualEfficiencySalary">Lương HQ thực tế</option>
                            <option value="actualPieceworkSalary">Lương Khoán thực tế</option>
                            <option value="otherSalary">Lương khác</option>
                            <option value="overtimeSalary">Lương Tăng ca</option>
                            <option value="calculatedSalary">Lương Gross</option>
                            <option value="netSalary">Thực lĩnh NET</option>
                        </select>
                    </div>
                </div>
                <div className="text-left text-left">
                    <label className="text-[10px] font-black text-indigo-600 uppercase block mb-1 text-left">Biểu thức công thức (Excel style)</label>
                    <textarea name="expression" required className="w-full px-4 py-4 border-2 border-indigo-50 rounded-2xl font-mono text-sm min-h-[100px] bg-slate-950 text-indigo-400 text-left" defaultValue={editingFormula?.formulaExpression} placeholder="({LCB_dm} / {Ctc}) * {Ctt}" />
                </div>
                <div className="text-left text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Diễn giải nghiệp vụ</label>
                    <textarea name="desc" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 text-left" defaultValue={editingFormula?.description} placeholder="Mô tả cách thức tính toán của công thức này..." />
                </div>
            </div>
            <div className="p-8 border-t flex justify-end gap-4 bg-slate-50 text-left">
                <button type="button" onClick={() => setIsFModalOpen(false)} className="px-10 py-4 font-bold text-slate-500">Hủy</button>
                <button type="submit" className="px-12 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Cập Nhật Công Thức</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL BIẾN SỐ */}
      {isVarModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 text-left">
          <form onSubmit={handleSaveVar} className="bg-white rounded-[40px] shadow-2xl w-full max-w-md animate-fade-in-up text-left overflow-hidden">
            <div className="p-8 bg-slate-900 text-white flex justify-between items-center text-left">
                <div className="flex items-center gap-4 text-left">
                    <BookOpen size={28}/>
                    <h3 className="font-black text-xl tracking-tighter uppercase text-left">{editingVar ? 'Sửa Biến Số' : 'Thêm Biến Số Hệ Thống'}</h3>
                </div>
                <button type="button" onClick={() => setIsVarModalOpen(false)}><X size={28}/></button>
            </div>
            <div className="p-10 space-y-6 text-left">
                <div className="text-left text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Mã biến (Code - Không dấu, không cách)</label>
                    <input name="code" required disabled={!!editingVar} className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-mono text-indigo-600 font-bold bg-slate-50 text-left" defaultValue={editingVar?.code} placeholder="VD: LCB_dm" />
                </div>
                <div className="text-left text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Tên hiển thị</label>
                    <input name="name" required className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold bg-white text-left" defaultValue={editingVar?.name} />
                </div>
                <div className="text-left text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Nhóm biến</label>
                    <input name="group" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl font-bold bg-slate-50 text-left" defaultValue={editingVar?.group} placeholder="HỆ THỐNG / ĐỊNH MỨC / THỰC TẾ" />
                </div>
                <div className="text-left text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1 text-left">Mô tả biến số</label>
                    <textarea name="desc" className="w-full px-4 py-3 border-2 border-slate-100 rounded-2xl text-sm bg-slate-50 text-left" defaultValue={editingVar?.desc} />
                </div>
            </div>
            <div className="p-8 border-t flex justify-end gap-4 bg-slate-50 text-left text-left text-left">
                <button type="button" onClick={() => setIsVarModalOpen(false)} className="px-10 py-4 font-bold text-slate-500 text-left">Hủy</button>
                <button type="submit" className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Lưu Biến Số</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default FormulaConfig;