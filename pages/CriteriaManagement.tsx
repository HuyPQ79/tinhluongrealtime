
import React, { useState } from 'react';
import { Plus, Trash2, Edit, Save, X, ThumbsUp, ThumbsDown, Info, Layers, Target, Settings2, ShieldAlert } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { Criterion, CriterionGroup } from '../types';

const CriteriaManagement: React.FC = () => {
  const { criteriaList, criteriaGroups, addCriterion, updateCriterion, deleteCriterion, addCriterionGroup, updateCriterionGroup, deleteCriterionGroup } = useAppContext();
  
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'GROUPS'>('ITEMS');
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Criterion | null>(null);
  const [editingGroup, setEditingGroup] = useState<CriterionGroup | null>(null);

  const [reasonModal, setReasonModal] = useState<{ isOpen: boolean, type: 'CRITERION' | 'GROUP', id: string, name: string }>({ isOpen: false, type: 'CRITERION', id: '', name: '' });
  const [reasonText, setReasonText] = useState('');

  const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data: Criterion = {
      id: editingItem?.id || `C${Date.now()}`,
      groupId: f.get('groupId') as string,
      name: f.get('name') as string,
      type: f.get('type') as 'BONUS' | 'PENALTY',
      unit: 'PERCENT', 
      value: Number(f.get('value')),
      point: 0, 
      threshold: Number(f.get('threshold') || 0),
      description: f.get('description') as string
    };

    if (editingItem) updateCriterion(data);
    else addCriterion(data);
    setIsItemModalOpen(false);
  };

  const handleSaveGroup = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data: CriterionGroup = {
      id: editingGroup?.id || `CG${Date.now()}`,
      name: f.get('name') as string,
      weight: Number(f.get('weight'))
    };

    if (editingGroup) updateCriterionGroup(data);
    else addCriterionGroup(data);
    setIsGroupModalOpen(false);
  };

  const openDeleteReason = (type: 'CRITERION' | 'GROUP', id: string, name: string) => {
    setReasonModal({ isOpen: true, type, id, name });
    setReasonText('');
  };

  const confirmDelete = () => {
    if (reasonModal.type === 'CRITERION') {
        deleteCriterion(reasonModal.id, reasonText);
    } else {
        deleteCriterionGroup(reasonModal.id, reasonText);
    }
    setReasonModal({ isOpen: false, type: 'CRITERION', id: '', name: '' });
  };

  const totalWeight = criteriaGroups.reduce((acc, g) => acc + g.weight, 0);

  return (
    <div className="space-y-6 animate-fade-in pb-20 text-left">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden text-left">
        <div className="p-6 border-b flex justify-between items-center text-left">
            <div className="text-left">
              <h1 className="text-2xl font-bold text-slate-800 text-left">Cấu Hình Đánh Giá KPI</h1>
              <p className="text-sm text-slate-500 text-left">Phân bổ tỷ trọng Lương HQ và danh mục tiêu chí thưởng/phạt theo %.</p>
            </div>
            <div className="flex gap-2 text-left">
                {activeTab === 'ITEMS' ? (
                    <button onClick={() => { setEditingItem(null); setIsItemModalOpen(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg text-left"><Plus size={18}/> Thêm Tiêu Chí</button>
                ) : (
                    <button onClick={() => { setEditingGroup(null); setIsGroupModalOpen(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg text-left"><Plus size={18}/> Thêm Nhóm</button>
                )}
            </div>
        </div>
        <div className="flex bg-slate-50/50 text-left">
          <button onClick={() => setActiveTab('GROUPS')} className={`px-8 py-4 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'GROUPS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}><Layers size={18}/> Nhóm Tiêu Chí & Tỷ Trọng</button>
          <button onClick={() => setActiveTab('ITEMS')} className={`px-8 py-4 font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'ITEMS' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-white' : 'text-slate-500 hover:text-slate-800'}`}><Settings2 size={18}/> Danh Mục Chi Tiết</button>
        </div>
      </div>

      {activeTab === 'GROUPS' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-left">
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border overflow-hidden text-left">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-left">
                    <tr className="text-left">
                      <th className="px-6 py-4 text-left">Tên Nhóm</th>
                      <th className="px-6 py-4 text-left">Tỷ Trọng (%)</th>
                      <th className="px-6 py-4 text-right text-left">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-left">
                    {criteriaGroups.map(group => (
                      <tr key={group.id} className="hover:bg-slate-50 transition-colors group text-left">
                        <td className="px-6 py-4 font-bold text-slate-800 text-left">{group.name}</td>
                        <td className="px-6 py-4 text-left">
                           <div className="flex items-center gap-4 text-left">
                               <span className="font-black text-indigo-600 w-10 text-left">{group.weight}%</span>
                               <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden text-left">
                                   <div className="h-full bg-indigo-500" style={{ width: `${group.weight}%` }}></div>
                               </div>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-right text-left">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 text-left">
                            <button onClick={() => { setEditingGroup(group); setIsGroupModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-left text-left"><Edit size={16}/></button>
                            <button onClick={() => openDeleteReason('GROUP', group.id, group.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-left text-left"><Trash2 size={16}/></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
            </div>
            <div className="space-y-6 text-left">
                <div className="bg-indigo-600 rounded-2xl p-6 text-white shadow-xl text-left">
                    <h3 className="font-bold flex items-center gap-2 mb-2 text-left"><Target size={20}/> Tổng tỷ trọng</h3>
                    <div className="text-4xl font-black text-left">{totalWeight}%</div>
                    <p className="text-xs text-indigo-100 mt-2 italic text-left">Tổng tỷ trọng phải đạt 100% để đảm bảo Lương HQ được tính chính xác.</p>
                </div>
                <div className="bg-white rounded-2xl p-6 border shadow-sm text-left">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-left"><Info size={18} className="text-amber-500"/> Giải thích nghiệp vụ</h3>
                    <div className="space-y-3 text-xs text-slate-500 leading-relaxed text-left">
                        <p className="text-left"><b>Nhóm tiêu chí:</b> Các đầu mục lớn để phân loại đánh giá.</p>
                        <p className="text-left"><b>Tỷ trọng:</b> Quyết định một nhóm đóng góp bao nhiêu % vào tổng điểm thưởng của tháng.</p>
                        <p className="text-indigo-600 font-bold text-left">Tất cả tiêu chí được tính theo % định mức Lương HQ của nhân sự.</p>
                    </div>
                </div>
            </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden text-left">
          <table className="w-full text-left text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-[10px] uppercase tracking-wider text-left">
              <tr className="text-left">
                <th className="px-6 py-4 text-left">Tiêu Chí</th>
                <th className="px-6 py-4 text-left">Nhóm</th>
                <th className="px-6 py-4 text-left">Phân Loại</th>
                <th className="px-6 py-4 text-left">Giá Trị (% HQ)</th>
                <th className="px-6 py-4 text-left">Ngưỡng Phạt (Lần)</th>
                <th className="px-6 py-4 text-right text-left">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-left">
              {criteriaList.map(item => {
                const group = criteriaGroups.find(g => g.id === item.groupId);
                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group text-left">
                    <td className="px-6 py-4 font-bold text-slate-800 text-left">{item.name}</td>
                    <td className="px-6 py-4 text-xs font-bold text-slate-400 text-left">{group?.name || 'Chưa gán'}</td>
                    <td className="px-6 py-4 text-left">
                      <span className={`px-2 py-1 rounded text-[10px] font-black border uppercase flex items-center gap-1 w-fit ${item.type === 'BONUS' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'}`}>
                        {item.type === 'BONUS' ? <ThumbsUp size={10}/> : <ThumbsDown size={10}/>} {item.type === 'BONUS' ? 'Thưởng' : 'Phạt'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-indigo-600 text-left">
                      {item.value}% HQ
                    </td>
                    <td className="px-6 py-4 font-black text-slate-500 text-left">
                      {item.type === 'PENALTY' ? (item.threshold > 0 ? `Bắt đầu từ lần ${item.threshold + 1}` : 'Từ lần đầu') : '--'}
                    </td>
                    <td className="px-6 py-4 text-right text-left">
                      <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 text-left">
                        <button onClick={() => { setEditingItem(item); setIsItemModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-left"><Edit size={16}/></button>
                        <button onClick={() => openDeleteReason('CRITERION', item.id, item.name)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-left"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ITEM MODAL */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left">
          <form onSubmit={handleSaveItem} className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up overflow-hidden text-left">
            <div className="p-6 bg-slate-900 text-white flex justify-between items-center text-left">
              <h3 className="font-bold text-lg text-left">{editingItem ? 'Sửa Tiêu Chí' : 'Thêm Tiêu Chí'}</h3>
              <button type="button" onClick={() => setIsItemModalOpen(false)} className="text-left"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-4 text-left">
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left">Tên tiêu chí</label>
                <input name="name" required className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-left" defaultValue={editingItem?.name}/>
              </div>
              <div className="text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left">Nhóm quản lý</label>
                <select name="groupId" required className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-left" defaultValue={editingItem?.groupId}>
                    {criteriaGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left">Loại</label>
                  <select name="type" className="w-full px-4 py-2.5 border rounded-xl font-bold bg-white outline-none focus:ring-2 focus:ring-indigo-500 text-left" defaultValue={editingItem?.type}>
                    <option value="BONUS">Thưởng (+)</option>
                    <option value="PENALTY">Phạt (-)</option>
                  </select>
                </div>
                <div className="text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left">Đơn vị neo</label>
                  <div className="w-full px-4 py-2.5 border rounded-xl font-black bg-slate-100 text-slate-400 cursor-not-allowed text-left">% Lương HQ</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-left">
                <div className="text-left">
                   <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left">Giá trị (% HQ)</label>
                   <input name="value" type="number" step="0.1" required className="w-full px-4 py-2.5 border rounded-xl font-black text-indigo-600 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-left" defaultValue={editingItem?.value}/>
                </div>
                <div className="text-left">
                   <label className="text-[10px] font-black text-orange-600 uppercase block mb-1 text-left">Ngưỡng vi phạm</label>
                   <input name="threshold" type="number" min="0" className="w-full px-4 py-2.5 border-2 border-orange-100 rounded-xl font-black bg-orange-50 text-orange-700 outline-none focus:ring-2 focus:ring-orange-500 text-left" defaultValue={editingItem?.threshold || 0}/>
                </div>
              </div>
              <p className="text-[9px] text-slate-400 italic text-left">Ví dụ: Nếu nhập số 2 vào ngưỡng vi phạm, vi phạm lần thứ 1 và 2 sẽ không bị trừ tiền, bắt đầu trừ từ lần thứ 3.</p>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl text-left">
              <button type="button" onClick={() => setIsItemModalOpen(false)} className="px-6 py-2 bg-white border rounded-xl font-bold text-slate-500 text-left">Hủy</button>
              <button type="submit" className="px-10 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg text-left">Lưu Tiêu Chí</button>
            </div>
          </form>
        </div>
      )}

      {/* GROUP MODAL */}
      {isGroupModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left">
            <form onSubmit={handleSaveGroup} className="bg-white rounded-3xl shadow-2xl w-full max-sm animate-fade-in-up overflow-hidden text-left">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center text-left">
                    <h3 className="font-bold text-lg text-left">{editingGroup ? 'Sửa Nhóm' : 'Thêm Nhóm Tiêu Chí'}</h3>
                    <button type="button" onClick={() => setIsGroupModalOpen(false)} className="text-left"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-4 text-left">
                    <div className="text-left">
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left">Tên nhóm</label>
                        <input name="name" required className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-left" defaultValue={editingGroup?.name}/>
                    </div>
                    <div className="text-left">
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left">Tỷ trọng (%)</label>
                        <input name="weight" type="number" min="0" max="100" required className="w-full px-4 py-2.5 border rounded-xl font-black text-indigo-600 bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-left" defaultValue={editingGroup?.weight}/>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl text-left">
                    <button type="button" onClick={() => setIsGroupModalOpen(false)} className="px-6 py-2 bg-white border rounded-xl font-bold text-slate-500 text-left">Hủy</button>
                    <button type="submit" className="px-10 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg text-left">Lưu Nhóm</button>
                </div>
            </form>
          </div>
      )}

      {/* REASON MODAL FOR DELETE */}
      {reasonModal.isOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 text-left">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up p-8 text-left">
                <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center gap-2 text-left">
                    <ShieldAlert size={24} className="text-rose-600 text-left"/> Xác nhận xóa
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
                    <button onClick={() => setReasonModal({ ...reasonModal, isOpen: false })} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors text-left text-left">Hủy</button>
                    <button 
                        onClick={confirmDelete} 
                        disabled={!reasonText.trim()}
                        className="px-8 py-3 bg-rose-600 text-white rounded-xl font-bold shadow-xl shadow-rose-100 hover:bg-rose-700 transition-all uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:grayscale text-left"
                    >
                        Xác nhận xóa
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default CriteriaManagement;
