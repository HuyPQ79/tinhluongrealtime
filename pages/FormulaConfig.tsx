import React, { useState, useEffect } from 'react';
import { 
  Save, Plus, Trash2, Edit, Sigma, Briefcase, DollarSign, X, Calculator, 
  Info, CheckCircle, Clock, BookOpen, Search, ListChecks, ShieldCheck, 
  Zap, AlertTriangle, Database, HardDrive, RotateCcw, FileText, Download, Upload, Server, ShieldAlert
} from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { DailyWorkItem, SalaryFormula, SalaryVariable, UserRole, RecordStatus, ApprovalStep, SystemRole, ApprovalWorkflow } from '../types';
import { WorkflowModal } from './components/WorkflowModal';
import { FormulaEditor } from './components/FormulaEditor';
import { reloadFormulasVariables } from '../services/api';

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
    addAuditLog, systemRoles, addSystemRole, updateSystemRole, deleteSystemRole,
    approvalWorkflows, addApprovalWorkflow, updateApprovalWorkflow, deleteApprovalWorkflow,
    salaryRanks
  } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'FORMULAS' | 'VARIABLES' | 'APPROVAL' | 'VAI_TRO' | 'DAILY_WORK' | 'MAINTENANCE'>('FORMULAS');
  const [varSearch, setVarSearch] = useState('');
  
  const [isBackupLoading, setIsBackupLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>('2025-05-15 03:00 AM');
  
  const [isReloading, setIsReloading] = useState(false);

  const [isDWModalOpen, setIsDWModalOpen] = useState(false);
  const [editingDWItem, setEditingDWItem] = useState<DailyWorkItem | null>(null);

  const [isFModalOpen, setIsFModalOpen] = useState(false);
  const [editingFormula, setEditingFormula] = useState<SalaryFormula | null>(null);

  const [isVarModalOpen, setIsVarModalOpen] = useState(false);
  const [editingVar, setEditingVar] = useState<SalaryVariable | null>(null);

  // SystemRoles & ApprovalWorkflows
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<SystemRole | null>(null);
  const [isWorkflowModalOpen, setIsWorkflowModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<ApprovalWorkflow | null>(null);

  // REASON MODAL FOR DELETE
  const [reasonModal, setReasonModal] = useState<{ isOpen: boolean, type: 'FORMULA' | 'DW' | 'VAR' | 'ROLE', id: string, name: string }>({ isOpen: false, type: 'FORMULA', id: '', name: '' });
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
          addAuditLog('BACKUP DATABASE', 'Đã thực hiện sao lưu cơ sở dữ liệu HRM');
          alert("Sao lưu cơ sở dữ liệu phpMyAdmin thành công!");
      }, 2000);
  };

  const handleReloadFormulasVariables = async () => {
    if (!confirm('Bạn có chắc muốn nạp lại toàn bộ công thức và biến số từ seeder? Hành động này sẽ cập nhật dữ liệu hiện có.')) {
      return;
    }
    
    setIsReloading(true);
    try {
      const result = await reloadFormulasVariables();
      alert(`Đã nạp lại thành công!\n- ${result.formulasCount} công thức\n- ${result.variablesCount} biến số`);
      addAuditLog('RELOAD_FORMULAS_VARIABLES', `Đã nạp lại ${result.formulasCount} công thức và ${result.variablesCount} biến số`);
      // Reload page data
      window.location.reload();
    } catch (error: any) {
      alert(`Lỗi: ${error.message || 'Không thể nạp lại công thức và biến số'}`);
    } finally {
      setIsReloading(false);
    }
  };

  const handleSaveFormula = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newFormula: SalaryFormula = {
        id: editingFormula ? editingFormula.id : `F${Date.now()}`,
        name: (form.elements.namedItem('fname') as HTMLInputElement).value,
        targetField: (form.elements.namedItem('targetField') as HTMLSelectElement).value,
        formulaExpression: formulaExpression || (form.elements.namedItem('expression') as HTMLTextAreaElement)?.value || '',
        isActive: true,
        order: editingFormula ? editingFormula.order : formulas.length + 1,
        description: (form.elements.namedItem('desc') as HTMLTextAreaElement).value
    };
    if (editingFormula) updateFormula(newFormula);
    else addFormula(newFormula);
    setIsFModalOpen(false);
    setFormulaExpression('');
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
    } else if (reasonModal.type === 'VAR') {
        deleteSalaryVariable(reasonModal.id, reasonText);
    } else if (reasonModal.type === 'ROLE') {
        deleteSystemRole(reasonModal.id, reasonText);
    }
    setReasonModal({ isOpen: false, type: 'FORMULA', id: '', name: '' });
  };

  // SystemRoles handlers
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newRole: SystemRole = {
      id: editingRole ? editingRole.id : `role_${Date.now()}`,
      code: (form.elements.namedItem('code') as HTMLInputElement).value.toUpperCase(),
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      description: (form.elements.namedItem('description') as HTMLTextAreaElement).value || undefined
    };
    if (editingRole) {
      updateSystemRole(newRole);
    } else {
      addSystemRole(newRole);
    }
    setIsRoleModalOpen(false);
    setEditingRole(null);
  };

  // ApprovalWorkflow handlers
  const handleSaveWorkflow = async (workflow: Partial<ApprovalWorkflow>) => {
    const newWorkflow: ApprovalWorkflow = {
      id: editingWorkflow?.id || `wf_${Date.now()}`,
      contentType: workflow.contentType || 'ATTENDANCE',
      targetRankIds: workflow.targetRankIds || [],
      initiatorRoleIds: workflow.initiatorRoleIds || [],
      approverRoleIds: workflow.approverRoleIds || [],
      auditorRoleIds: workflow.auditorRoleIds || [],
      effectiveFrom: editingWorkflow?.effectiveFrom || new Date().toISOString(),
      effectiveTo: editingWorkflow?.effectiveTo,
      version: editingWorkflow?.version || 1,
      createdAt: editingWorkflow?.createdAt || new Date().toISOString()
    };
    
    if (editingWorkflow) {
      await updateApprovalWorkflow(newWorkflow);
    } else {
      await addApprovalWorkflow(newWorkflow);
    }
    setIsWorkflowModalOpen(false);
    setEditingWorkflow(null);
  };

  return (
    <div className="space-y-10 pb-20 text-left animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 text-left">
        <div className="text-left text-left">
            <h1 className="text-3xl font-black text-slate-800 tracking-tighter text-left">Cấu Hình Vận Hành Hệ Thống</h1>
            <p className="text-sm text-slate-500 font-medium italic mt-2 text-left">Thiết lập logic lương, workflow phê duyệt và bảo trì hệ thống.</p>
        </div>
        <div className="flex gap-3 text-left">
            {activeTab === 'FORMULAS' && (
              <>
                <button 
                  onClick={handleReloadFormulasVariables}
                  disabled={isReloading}
                  className={`px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl transition-all active:scale-95 ${
                    isReloading 
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {isReloading ? (
                    <>
                      <RotateCcw size={18} className="animate-spin"/> Đang nạp...
                    </>
                  ) : (
                    <>
                      <RotateCcw size={18}/> Nạp Lại Công Thức & Biến Số
                    </>
                  )}
                </button>
                <button 
                  onClick={() => { setEditingFormula(null); setFormulaExpression(''); setIsFModalOpen(true); }} 
                  className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"
                >
                  <Plus size={18}/> Tạo Công Thức
                </button>
              </>
            )}
            {activeTab === 'VARIABLES' && <button onClick={() => { setEditingVar(null); setIsVarModalOpen(true); }} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-black transition-all active:scale-95"><Plus size={18}/> Thêm Biến Số</button>}
            {activeTab === 'VAI_TRO' && <button onClick={() => { setEditingRole(null); setIsRoleModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"><Plus size={18}/> Thêm Vai Trò</button>}
            {activeTab === 'APPROVAL' && <button onClick={() => { setEditingWorkflow(null); setIsWorkflowModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"><Plus size={18}/> Tạo Luồng Phê Duyệt</button>}
            {activeTab === 'DAILY_WORK' && <button onClick={() => { setEditingDWItem(null); setIsDWModalOpen(true); }} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"><Plus size={18}/> Thêm Nghiệp Vụ</button>}
        </div>
      </div>

      <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden text-left">
        <div className="flex border-b bg-slate-50/50 overflow-x-auto custom-scrollbar text-left">
          <button onClick={() => setActiveTab('FORMULAS')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'FORMULAS' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><Sigma size={18}/> Logic Lương</button>
          <button onClick={() => setActiveTab('VARIABLES')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'VARIABLES' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><BookOpen size={18}/> Biến Số</button>
          <button onClick={() => setActiveTab('VAI_TRO')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'VAI_TRO' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><ShieldCheck size={18}/> Vai Trò</button>
          <button onClick={() => setActiveTab('APPROVAL')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'APPROVAL' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><ListChecks size={18}/> Phê Duyệt</button>
          <button onClick={() => setActiveTab('DAILY_WORK')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'DAILY_WORK' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><Briefcase size={18}/> Công Nhật</button>
          <button onClick={() => setActiveTab('MAINTENANCE')} className={`px-10 py-5 font-black text-[11px] uppercase tracking-widest flex items-center gap-3 transition-all shrink-0 ${activeTab === 'MAINTENANCE' ? 'text-indigo-600 border-b-4 border-indigo-600 bg-white' : 'text-slate-400 hover:text-slate-800'}`}><Server size={18}/> Bảo Trì Hệ Thống</button>
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
                                  <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg text-left">Lưu Trữ Dữ Liệu</h3>
                                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest text-left">Hệ Thống Lưu Trữ</p>
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
                                onClick={() => alert("Hệ thống đang quét dữ liệu định kỳ trên máy chủ nội bộ.")}
                                className="w-full py-4 bg-white border-2 border-slate-200 text-slate-800 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all hover:border-amber-500 hover:text-amber-600 active:scale-95"
                              >
                                <FileText size={18}/> Quản lý File Lưu Trữ
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'VAI_TRO' && (
            <div className="max-w-5xl mx-auto space-y-10 text-left animate-fade-in-up">
                <div className="bg-purple-600 text-white p-10 rounded-[50px] flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-purple-500/20 text-left">
                   <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center text-white border border-white/20 shadow-xl shrink-0"><ShieldCheck size={40}/></div>
                   <div className="text-center md:text-left text-left">
                       <h3 className="font-black uppercase text-xl tracking-tighter text-left">Quản Lý Vai Trò Hệ Thống</h3>
                       <p className="text-sm text-purple-100 mt-2 font-medium leading-relaxed italic opacity-80 text-left">Khai báo các vai trò được sử dụng trong luồng phê duyệt và phân quyền.</p>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                    {systemRoles.map(role => (
                        <div key={role.id} className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col justify-between group hover:bg-white hover:border-purple-200 transition-all text-left">
                            <div className="space-y-4 text-left">
                                <div className="flex items-center justify-between text-left">
                                    <code className="text-xs font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-lg">{role.code}</code>
                                    <div className="flex gap-2 text-left">
                                        <button onClick={() => { setEditingRole(role); setIsRoleModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"><Edit size={16}/></button>
                                        <button onClick={() => openDeleteReason('ROLE', role.id, role.name)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                                <h4 className="font-black text-slate-800 text-lg tracking-tight text-left">{role.name}</h4>
                                {role.description && (
                                    <p className="text-xs text-slate-400 italic leading-relaxed text-left">"{role.description}"</p>
                                )}
                            </div>
                        </div>
                    ))}
                    {systemRoles.length === 0 && (
                        <div className="col-span-full p-12 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-300 text-center">
                            <ShieldCheck size={48} className="mx-auto text-slate-400 mb-4"/>
                            <p className="text-slate-500 font-bold">Chưa có vai trò nào. Nhấn "Thêm Vai Trò" để bắt đầu.</p>
                        </div>
                    )}
                </div>
            </div>
          )}

          {activeTab === 'APPROVAL' && (
            <div className="max-w-6xl mx-auto space-y-10 text-left animate-fade-in-up">
                <div className="bg-indigo-600 text-white p-10 rounded-[50px] flex flex-col md:flex-row items-center gap-8 shadow-2xl shadow-indigo-500/20 text-left">
                   <div className="w-20 h-20 bg-white/20 rounded-[32px] flex items-center justify-center text-white border border-white/20 shadow-xl shrink-0"><ShieldCheck size={40}/></div>
                   <div className="text-center md:text-left text-left">
                       <h3 className="font-black uppercase text-xl tracking-tighter text-left">Cấu Hình Luồng Phê Duyệt</h3>
                       <p className="text-sm text-indigo-100 mt-2 font-medium leading-relaxed italic opacity-80 text-left">Thiết lập luồng phê duyệt theo nội dung, đối tượng và vai trò. Dữ liệu lưu snapshot từ thời điểm ấn Lưu.</p>
                   </div>
                </div>

                <div className="space-y-6 text-left">
                    {approvalWorkflows.filter(w => !w.effectiveTo).length === 0 ? (
                        <div className="p-12 bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-300 text-center">
                            <ShieldCheck size={48} className="mx-auto text-slate-400 mb-4"/>
                            <p className="text-slate-500 font-bold">Chưa có luồng phê duyệt nào. Nhấn "Tạo Luồng Phê Duyệt" để bắt đầu.</p>
                        </div>
                    ) : (
                        approvalWorkflows.filter(w => !w.effectiveTo).map((workflow, index) => {
                            const contentTypeLabels: Record<string, string> = {
                                'ATTENDANCE': '📋 Bảng Chấm Công',
                                'EVALUATION': '📝 Phiếu Đánh Giá',
                                'SALARY': '💰 Bảng Lương'
                            };
                            const targetRanks = salaryRanks.filter(r => workflow.targetRankIds.includes(r.id));
                            const initiatorRoles = systemRoles.filter(r => workflow.initiatorRoleIds.includes(r.id));
                            const approverRoles = systemRoles.filter(r => workflow.approverRoleIds.includes(r.id));
                            const auditorRoles = systemRoles.filter(r => workflow.auditorRoleIds?.includes(r.id) || false);
                            
                            return (
                                <div key={workflow.id} className="p-8 bg-slate-50 rounded-[40px] border border-slate-200 flex flex-col gap-6 relative group transition-all hover:bg-white hover:border-indigo-200 text-left">
                                    <div className="flex items-center justify-between text-left">
                                        <div className="flex items-center gap-4 text-left">
                                            <div className="w-14 h-14 bg-indigo-600 text-white rounded-[24px] flex items-center justify-center font-black text-lg shrink-0 shadow-xl">#{index + 1}</div>
                                            <div className="text-left">
                                                <h4 className="font-black text-slate-800 text-lg tracking-tight text-left">{contentTypeLabels[workflow.contentType] || workflow.contentType}</h4>
                                                <p className="text-xs text-slate-400 mt-1 text-left">Áp dụng từ: {new Date(workflow.effectiveFrom).toLocaleDateString('vi-VN')}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 text-left">
                                            <button onClick={() => { setEditingWorkflow(workflow); setIsWorkflowModalOpen(true); }} className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit size={18}/></button>
                                            <button onClick={() => deleteApprovalWorkflow(workflow.id)} className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={18}/></button>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Đối tượng (Rank)</p>
                                            <div className="flex flex-wrap gap-2 text-left">
                                                {targetRanks.length > 0 ? targetRanks.map(r => (
                                                    <span key={r.id} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold">{r.name}</span>
                                                )) : <span className="text-xs text-slate-400 italic">Tất cả các Rank</span>}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Vai trò khởi tạo</p>
                                            <div className="flex flex-wrap gap-2 text-left">
                                                {initiatorRoles.map(r => (
                                                    <span key={r.id} className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold">{r.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Vai trò phê duyệt</p>
                                            <div className="flex flex-wrap gap-2 text-left">
                                                {approverRoles.map(r => (
                                                    <span key={r.id} className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">{r.name}</span>
                                                ))}
                                            </div>
                                        </div>
                                        
                                        <div className="p-4 bg-white rounded-2xl border border-slate-100 text-left">
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-2 text-left">Vai trò hậu kiểm</p>
                                            <div className="flex flex-wrap gap-2 text-left">
                                                {auditorRoles.length > 0 ? auditorRoles.map(r => (
                                                    <span key={r.id} className="px-3 py-1 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold">{r.name}</span>
                                                )) : <span className="text-xs text-slate-400 italic">Không có</span>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    
                    {/* Cấu hình số giờ tối đa cho HR hậu kiểm */}
                    <div className="p-8 bg-white rounded-[40px] border-2 border-indigo-200 shadow-lg">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center"><Clock size={24}/></div>
                            <div>
                                <h4 className="font-black text-slate-800 text-lg">Số giờ tối đa cho HR hậu kiểm</h4>
                                <p className="text-xs text-slate-400 mt-1">Thời gian tối đa (tính bằng giờ) mà HR có thể thực hiện hậu kiểm sau khi bản ghi được phê duyệt</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                min="1"
                                max="168"
                                value={systemConfig.maxHoursForHRReview || 72}
                                onChange={(e) => {
                                    const value = Math.max(1, Math.min(168, Number(e.target.value) || 72));
                                    updateSystemConfig({ ...systemConfig, maxHoursForHRReview: value });
                                }}
                                className="w-32 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-black text-indigo-600 text-center focus:border-indigo-500 outline-none"
                            />
                            <span className="text-sm font-bold text-slate-600">giờ</span>
                            <span className="text-xs text-slate-400 italic">(Mặc định: 72 giờ = 3 ngày)</span>
                        </div>
                    </div>
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
                            <button onClick={() => {setEditingFormula(f); setFormulaExpression(f.formulaExpression); setIsFModalOpen(true);}} className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit size={20}/></button>
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
      
      {/* MODAL SYSTEM ROLE */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 text-left">
          <form onSubmit={handleSaveRole} className="bg-white rounded-[40px] shadow-2xl w-full max-w-md animate-fade-in-up text-left overflow-hidden">
            <div className="p-8 bg-purple-600 text-white flex justify-between items-center text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-white/20 rounded-2xl shadow-lg"><ShieldCheck size={28}/></div>
                    <h3 className="font-black text-xl tracking-tighter uppercase text-left">{editingRole ? 'Sửa Vai Trò' : 'Thêm Vai Trò Mới'}</h3>
                </div>
                <button type="button" onClick={() => { setIsRoleModalOpen(false); setEditingRole(null); }} className="hover:bg-white/10 p-2 rounded-full transition-all text-white"><X size={28}/></button>
            </div>
            <div className="p-10 space-y-8 text-left">
                <div className="text-left">
                    <label className="text-[11px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Mã vai trò (Code)</label>
                    <input name="code" required className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-purple-500 bg-slate-50 transition-all text-sm uppercase text-left" defaultValue={editingRole?.code} placeholder="VD: KE_TOAN_LUONG, QUAN_LY..."/>
                    <p className="text-[9px] text-slate-400 mt-2 italic text-left">Mã vai trò phải viết hoa, dùng dấu gạch dưới</p>
                </div>
                <div className="text-left">
                    <label className="text-[11px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Tên vai trò</label>
                    <input name="name" required className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl font-black outline-none focus:border-purple-500 bg-slate-50 transition-all text-sm text-left" defaultValue={editingRole?.name} placeholder="VD: Kế Toán Lương, Quản Lý..."/>
                </div>
                <div className="text-left">
                    <label className="text-[11px] font-black text-slate-400 uppercase block mb-2 ml-1 tracking-widest text-left">Mô tả (Tùy chọn)</label>
                    <textarea name="description" className="w-full px-6 py-4 border-2 border-slate-100 rounded-2xl font-medium outline-none focus:border-purple-500 bg-slate-50 transition-all text-sm text-left" rows={3} defaultValue={editingRole?.description} placeholder="Mô tả chức năng và quyền hạn của vai trò này..."/>
                </div>
            </div>
            <div className="p-8 border-t flex justify-end gap-4 bg-slate-50 text-left">
                <button type="button" onClick={() => { setIsRoleModalOpen(false); setEditingRole(null); }} className="px-10 py-4 font-black text-xs uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all text-left">Bỏ qua</button>
                <button type="submit" className="px-12 py-4 bg-purple-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-2xl shadow-purple-500/20 hover:bg-purple-700 transition-all">Lưu Vai Trò</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL APPROVAL WORKFLOW */}
      {isWorkflowModalOpen && (
        <WorkflowModal
          workflow={editingWorkflow}
          systemRoles={systemRoles}
          salaryRanks={salaryRanks}
          onClose={() => { setIsWorkflowModalOpen(false); setEditingWorkflow(null); }}
          onSave={handleSaveWorkflow}
        />
      )}

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
                    <div className="space-y-2">
                      <FormulaEditor
                        value={formulaExpression}
                        onChange={(newValue) => {
                          setFormulaExpression(newValue);
                          const form = document.querySelector('form') as HTMLFormElement;
                          if (form) {
                            const exprInput = form.elements.namedItem('expression') as HTMLTextAreaElement;
                            if (exprInput) {
                              exprInput.value = newValue;
                            }
                          }
                        }}
                        variables={salaryVariables}
                        onValidate={(isValid, error) => {
                          // Validation feedback
                        }}
                      />
                      <input type="hidden" name="expression" value={formulaExpression} />
                    </div>
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