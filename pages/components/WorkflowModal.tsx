import React, { useState } from 'react';
import { X } from 'lucide-react';
import { ApprovalWorkflow, SystemRole, SalaryRank } from '../../types';

interface WorkflowModalProps {
  workflow: ApprovalWorkflow | null;
  systemRoles: SystemRole[];
  salaryRanks: SalaryRank[];
  onClose: () => void;
  onSave: (workflow: Partial<ApprovalWorkflow>) => void;
}

export const WorkflowModal: React.FC<WorkflowModalProps> = ({ workflow, systemRoles, salaryRanks, onClose, onSave }) => {
  const [contentType, setContentType] = useState<'ATTENDANCE' | 'EVALUATION' | 'SALARY'>(workflow?.contentType || 'ATTENDANCE');
  const [targetRankIds, setTargetRankIds] = useState<string[]>(workflow?.targetRankIds || []);
  const [initiatorRoleIds, setInitiatorRoleIds] = useState<string[]>(workflow?.initiatorRoleIds || []);
  const [approverRoleIds, setApproverRoleIds] = useState<string[]>(workflow?.approverRoleIds || []);
  const [auditorRoleIds, setAuditorRoleIds] = useState<string[]>(workflow?.auditorRoleIds || []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: workflow?.id,
      contentType,
      targetRankIds,
      initiatorRoleIds,
      approverRoleIds,
      auditorRoleIds,
    });
  };

  const toggleRank = (rankId: string) => {
    setTargetRankIds(prev => 
      prev.includes(rankId) ? prev.filter(id => id !== rankId) : [...prev, rankId]
    );
  };

  const toggleRole = (roleId: string, type: 'initiator' | 'approver' | 'auditor') => {
    if (type === 'initiator') {
      setInitiatorRoleIds(prev => 
        prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
      );
    } else if (type === 'approver') {
      setApproverRoleIds(prev => 
        prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
      );
    } else {
      setAuditorRoleIds(prev => 
        prev.includes(roleId) ? prev.filter(id => id !== roleId) : [...prev, roleId]
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-fade-in-up">
        <div className="p-6 bg-indigo-600 text-white flex justify-between items-center sticky top-0 z-10">
          <h3 className="font-bold text-lg">{workflow ? 'Sửa Luồng Phê Duyệt' : 'Tạo Luồng Phê Duyệt'}</h3>
          <button type="button" onClick={onClose}><X size={24}/></button>
        </div>
        <div className="p-8 space-y-8">
          {/* 1. Content Type (chọn một) */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">1. Nội dung cần phê duyệt (chọn một)</label>
            <div className="grid grid-cols-3 gap-4">
              {(['ATTENDANCE', 'EVALUATION', 'SALARY'] as const).map(type => (
                <label key={type} className={`p-4 border-2 rounded-2xl cursor-pointer transition-all ${contentType === type ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <input 
                    type="radio" 
                    name="contentType" 
                    value={type}
                    checked={contentType === type}
                    onChange={() => setContentType(type)}
                    className="sr-only"
                  />
                  <div className="font-bold text-slate-800">
                    {type === 'ATTENDANCE' && '📋 Bảng Chấm Công'}
                    {type === 'EVALUATION' && '📝 Phiếu Đánh Giá'}
                    {type === 'SALARY' && '💰 Bảng Lương'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* 2. Target Ranks (chọn nhiều) */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">2. Đối tượng áp dụng - Cấp (Rank) (chọn nhiều)</label>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 min-h-[100px] max-h-[200px] overflow-y-auto">
              {salaryRanks.length === 0 ? (
                <p className="text-slate-400 text-sm">Chưa có Rank nào. Vui lòng tạo Rank trong Khung Năng Lực trước.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {salaryRanks.map(rank => (
                    <label key={rank.id} className="flex items-center gap-2 p-3 bg-white border-2 rounded-xl cursor-pointer hover:border-indigo-300 transition-all">
                      <input 
                        type="checkbox" 
                        checked={targetRankIds.includes(rank.id)}
                        onChange={() => toggleRank(rank.id)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <span className="font-bold text-slate-700">{rank.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {targetRankIds.length === 0 && (
              <p className="text-xs text-slate-400 mt-2 italic">Nếu không chọn, sẽ áp dụng cho tất cả các Rank</p>
            )}
          </div>

          {/* 3. Initiator Roles (chọn nhiều) */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">3. Vai trò khởi tạo (chọn nhiều)</label>
            <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-200 min-h-[100px] max-h-[200px] overflow-y-auto">
              {systemRoles.length === 0 ? (
                <p className="text-emerald-600 text-sm font-bold">Chưa có vai trò nào. Vui lòng tạo vai trò trong tab "Vai Trò" trước.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {systemRoles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 p-3 bg-white border-2 border-emerald-200 rounded-xl cursor-pointer hover:border-emerald-400 transition-all">
                      <input 
                        type="checkbox" 
                        checked={initiatorRoleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id, 'initiator')}
                        className="w-4 h-4 text-emerald-600 rounded"
                      />
                      <span className="font-bold text-slate-700">{role.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 4. Approver Roles (chọn nhiều) */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">4. Vai trò phê duyệt (chọn nhiều)</label>
            <div className="p-4 bg-blue-50 rounded-2xl border-2 border-blue-200 min-h-[100px] max-h-[200px] overflow-y-auto">
              {systemRoles.length === 0 ? (
                <p className="text-blue-600 text-sm font-bold">Chưa có vai trò nào. Vui lòng tạo vai trò trong tab "Vai Trò" trước.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {systemRoles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 p-3 bg-white border-2 border-blue-200 rounded-xl cursor-pointer hover:border-blue-400 transition-all">
                      <input 
                        type="checkbox" 
                        checked={approverRoleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id, 'approver')}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="font-bold text-slate-700">{role.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 5. Auditor Roles (chọn nhiều) */}
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-3">5. Vai trò hậu kiểm (chọn nhiều) - Tùy chọn</label>
            <div className="p-4 bg-purple-50 rounded-2xl border-2 border-purple-200 min-h-[100px] max-h-[200px] overflow-y-auto">
              {systemRoles.length === 0 ? (
                <p className="text-purple-600 text-sm font-bold">Chưa có vai trò nào. Vui lòng tạo vai trò trong tab "Vai Trò" trước.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {systemRoles.map(role => (
                    <label key={role.id} className="flex items-center gap-2 p-3 bg-white border-2 border-purple-200 rounded-xl cursor-pointer hover:border-purple-400 transition-all">
                      <input 
                        type="checkbox" 
                        checked={auditorRoleIds.includes(role.id)}
                        onChange={() => toggleRole(role.id, 'auditor')}
                        className="w-4 h-4 text-purple-600 rounded"
                      />
                      <span className="font-bold text-slate-700">{role.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border rounded-xl font-bold text-slate-500">Hủy</button>
          <button type="submit" className="px-10 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg">Lưu Luồng Phê Duyệt</button>
        </div>
      </form>
    </div>
  );
};

