
import React, { useState } from 'react';
import { Plus, Trash2, Edit, X, Layers, DollarSign, ChevronDown, Calendar, Gift, Save, ShieldAlert, Target, Info, CalendarClock, Briefcase, Landmark, Clock, TrendingUp } from 'lucide-react';
import { useAppContext } from '../context/AppContext';
import { SalaryRank, SalaryGrade, BonusType, AnnualBonusPolicy, FixedBonusItem } from '../types';

const SalaryGrids: React.FC = () => {
  const { 
    salaryRanks, salaryGrids, bonusTypes, annualBonusPolicies,
    addRank, updateRank, deleteRank,
    addGrade, updateGrade, deleteGrade, 
    addBonusType, deleteBonusType, updateBonusPolicy 
  } = useAppContext();
  
  const [selectedRankId, setSelectedRankId] = useState<string>(salaryRanks[0]?.id || '');
  
  const [isRankModalOpen, setIsRankModalOpen] = useState(false);
  const [editingRank, setEditingRank] = useState<SalaryRank | null>(null);

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<SalaryGrade | null>(null);

  const [isFixedBonusModalOpen, setIsFixedBonusModalOpen] = useState(false);
  const [targetGradeId, setTargetGradeId] = useState<string | null>(null);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  const handleSaveRank = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const data: SalaryRank = {
      id: editingRank?.id || `R_${Date.now()}`,
      name: f.get('name') as string,
      order: Number(f.get('order'))
    };
    if (editingRank) updateRank(data);
    else addRank(data);
    setIsRankModalOpen(false);
  };

  const handleSaveGrade = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const gradeData: SalaryGrade = {
      id: editingGrade?.id || `G_${Date.now()}`,
      rankId: selectedRankId,
      level: Number(f.get('level')),
      baseSalary: Number(f.get('baseSalary')),
      efficiencySalary: 0, 
      fixedAllowance: Number(f.get('fixedAllowance')),
      flexibleAllowance: 0,
      otherSalary: 0,
      fixedBonuses: editingGrade?.fixedBonuses || []
    };

    if (editingGrade) updateGrade(gradeData);
    else addGrade(gradeData);
    setIsGradeModalOpen(false);
  };

  const handleSaveFixedBonus = (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      if (!targetGradeId) return;
      const f = new FormData(e.currentTarget);
      const grade = salaryGrids.find(g => g.id === targetGradeId);
      if (grade) {
          const newBonus: FixedBonusItem = { month: Number(f.get('month')), name: f.get('name') as string, amount: Number(f.get('amount')) };
          updateGrade({ ...grade, fixedBonuses: [...(grade.fixedBonuses || []), newBonus] });
      }
      setIsFixedBonusModalOpen(false);
  };

  const currentRank = salaryRanks.find(r => r.id === selectedRankId);

  return (
    <div className="space-y-6 animate-fade-in pb-20 text-left">
      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden text-left">
        <div className="p-6 border-b flex justify-between items-center text-left text-left">
          <div className="text-left text-left text-left">
            <h1 className="text-2xl font-bold text-slate-800 text-left text-left text-left">Khung Năng Lực & Thâm Niên</h1>
            <p className="text-sm text-slate-500 italic text-left text-left text-left">Quản lý các cấp bậc, bậc lương định mức và chính sách thâm niên công tác.</p>
          </div>
          <div className="flex gap-2 text-left text-left text-left text-left">
            <button onClick={() => { setEditingRank(null); setIsRankModalOpen(true); }} className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg text-left text-left text-left text-left"><Plus size={18}/> Thêm Cấp Mới</button>
            <button onClick={() => { setEditingGrade(null); setIsGradeModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all text-left text-left text-left text-left"><Plus size={18}/> Thêm Bậc Lương</button>
          </div>
        </div>
      </div>

      <div className="space-y-6 text-left text-left">
          {/* SENIORITY POLICY FOUNDATION */}
          <div className="bg-white rounded-3xl border-4 border-indigo-50 p-8 text-left text-left">
              <div className="flex items-center gap-4 mb-8 text-left text-left text-left text-left">
                  <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl text-left text-left text-left"><Clock size={24}/></div>
                  <div className="text-left text-left text-left text-left text-left">
                      <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg text-left text-left text-left">Chính sách thâm niên thụ hưởng (Seniority Coeff)</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase mt-1 text-left text-left text-left">Áp dụng nhân hệ số vào Thưởng Lễ/Tết và Phụ cấp định mức</p>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left text-left text-left">
                  <div className="p-6 bg-slate-50 rounded-2xl border-2 border-slate-100 flex items-center justify-between text-left text-left text-left">
                      <div className="text-left text-left text-left"><p className="text-[10px] font-black text-slate-400 uppercase text-left text-left text-left">Dưới 03 tháng</p><p className="text-xl font-black text-slate-700 text-left text-left text-left text-left">Hệ số 0.5</p></div>
                      <div className="px-3 py-1 bg-white rounded-lg text-[9px] font-black text-slate-400 border text-right text-left text-left">THỬ VIỆC</div>
                  </div>
                  <div className="p-6 bg-indigo-50 rounded-2xl border-2 border-indigo-100 flex items-center justify-between text-left text-left text-left">
                      <div className="text-left text-left text-left text-left"><p className="text-[10px] font-black text-indigo-400 uppercase text-left text-left text-left text-left">Từ 03 - 06 tháng</p><p className="text-xl font-black text-indigo-700 text-left text-left text-left text-left">Hệ số 0.7</p></div>
                      <div className="px-3 py-1 bg-white rounded-lg text-[9px] font-black text-indigo-400 border text-right text-left text-left text-left">HỘI NHẬP</div>
                  </div>
                  <div className="p-6 bg-emerald-50 rounded-2xl border-2 border-emerald-100 flex items-center justify-between text-left text-left text-left">
                      <div className="text-left text-left text-left text-left text-left"><p className="text-[10px] font-black text-emerald-400 uppercase text-left text-left text-left text-left text-left">Trên 06 tháng</p><p className="text-xl font-black text-emerald-700 text-left text-left text-left text-left text-left">Hệ số 1.0</p></div>
                      <div className="px-3 py-1 bg-white rounded-lg text-[9px] font-black text-emerald-400 border text-right text-left text-left text-left text-left">CHÍNH THỨC</div>
                  </div>
              </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row min-h-[600px] text-left text-left text-left">
            <div className="w-full md:w-80 border-r bg-slate-50 overflow-y-auto shrink-0 text-left text-left text-left">
              <div className="p-4 bg-slate-100/50 border-b text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between items-center text-left text-left text-left">
                  Danh mục cấp bậc (Ranks)
              </div>
              {salaryRanks.sort((a,b) => a.order - b.order).map(rank => (
                <div key={rank.id} className={`group flex items-center border-b transition-all ${selectedRankId === rank.id ? 'bg-white border-l-8 border-l-blue-600 shadow-sm' : 'hover:bg-slate-100'}`}>
                  <button onClick={() => setSelectedRankId(rank.id)} className="flex-1 text-left px-6 py-4 flex justify-between items-center text-left text-left text-left text-left">
                      <span className={`text-sm font-bold block text-left text-left text-left ${selectedRankId === rank.id ? 'text-blue-600' : 'text-slate-600'}`}>{rank.name}</span>
                      <ChevronDown size={14} className={selectedRankId === rank.id ? 'text-blue-600' : 'text-slate-300'}/>
                  </button>
                  <div className="pr-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all text-left text-left text-left text-left text-left text-left">
                      <button onClick={() => { setEditingRank(rank); setIsRankModalOpen(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 text-left text-left text-left text-left"><Edit size={14}/></button>
                      <button onClick={() => deleteRank(rank.id)} className="p-1.5 text-slate-400 hover:text-red-600 text-left text-left text-left text-left"><Trash2 size={14}/></button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex-1 p-8 overflow-auto bg-white space-y-8 text-left text-left text-left text-left">
              <div className="flex justify-between items-center border-b pb-4 text-left text-left text-left text-left">
                  <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest flex items-center gap-2 text-left text-left text-left text-left text-left"><Briefcase size={16} className="text-blue-500 text-left text-left text-left text-left text-left"/> CHI TIẾT BẬC LƯƠNG ĐỊNH MỨC</h3>
                  <div className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-lg border border-blue-100 uppercase text-left text-left text-left text-left">Đối tượng: {currentRank?.name}</div>
              </div>

              <table className="w-full text-left text-sm border-collapse rounded-xl overflow-hidden text-left text-left text-left">
                <thead className="bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest text-left text-left text-left">
                  <tr className="text-left text-left text-left">
                    <th className="px-4 py-5 text-center w-20 text-left text-left">Bậc</th>
                    <th className="px-4 py-5 text-left text-left text-left">Lương CB (ĐM)</th>
                    <th className="px-4 py-5 text-left text-left text-left">Thưởng Lễ/Tết Bậc</th>
                    <th className="px-4 py-5 text-right text-left text-left text-left">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-left text-left text-left">
                  {salaryGrids.filter(g => g.rankId === selectedRankId).sort((a,b) => a.level - b.level).map(grade => (
                    <tr key={grade.id} className="hover:bg-slate-50 transition-colors group text-left text-left text-left">
                      <td className="px-4 py-6 font-black text-slate-900 bg-slate-50 text-center border-r text-left text-left text-left">B{grade.level}</td>
                      <td className="px-4 py-6 font-bold text-blue-700 text-left text-left text-left text-left">{formatCurrency(grade.baseSalary)}</td>
                      <td className="px-4 py-6 text-left text-left text-left">
                          <div className="flex flex-wrap gap-2 text-left text-left text-left text-left">
                              {(grade.fixedBonuses || []).map((fb, idx) => (
                                  <div key={idx} className="px-2 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-[9px] font-black rounded-lg flex items-center gap-1.5 shadow-sm group/tag text-left text-left text-left text-left">
                                      <CalendarClock size={10}/> T{fb.month}: {formatCurrency(fb.amount)}
                                      <button onClick={() => {
                                          const updated = grade.fixedBonuses?.filter((_, i) => i !== idx);
                                          updateGrade({...grade, fixedBonuses: updated});
                                      }} className="text-amber-300 hover:text-red-500 text-left text-left text-left text-left"><X size={10}/></button>
                                  </div>
                              ))}
                              <button onClick={() => { setTargetGradeId(grade.id); setIsFixedBonusModalOpen(true); }} className="px-2 py-1 bg-white border border-dashed border-slate-300 text-slate-400 text-[9px] font-bold rounded-lg hover:border-blue-500 hover:text-blue-500 transition-all flex items-center gap-1 text-left text-left text-left text-left"><Plus size={10}/> Thêm Thưởng Lễ</button>
                          </div>
                      </td>
                      <td className="px-4 py-6 text-right text-left text-left text-left text-left">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-left text-left text-left text-left text-left">
                          <button onClick={() => { setEditingGrade(grade); setIsGradeModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg text-left text-left text-left text-left"><Edit size={16}/></button>
                          <button onClick={() => deleteGrade(grade.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg text-left text-left text-left text-left"><Trash2 size={16}/></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </div>

      {/* RANK MODAL */}
      {isRankModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left text-left text-left">
          <form onSubmit={handleSaveRank} className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up text-left text-left text-left text-left">
            <div className="p-6 bg-slate-900 text-white rounded-t-3xl flex justify-between items-center text-left text-left text-left text-left">
              <h3 className="font-bold text-lg text-left text-left text-left text-left">{editingRank ? 'Sửa Cấp Bậc' : 'Thêm Cấp Bậc Mới'}</h3>
              <button type="button" onClick={() => setIsRankModalOpen(false)} className="text-left text-left text-left text-left"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-4 text-left text-left text-left text-left">
              <div className="text-left text-left text-left text-left text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left text-left text-left text-left">Tên Cấp (Rank Name)</label>
                <input name="name" required placeholder="VD: Chuyên viên chính..." className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-left text-left text-left text-left text-left" defaultValue={editingRank?.name}/>
              </div>
              <div className="text-left text-left text-left text-left text-left text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left text-left text-left text-left text-left">Thứ tự ưu tiên (Order)</label>
                <input name="order" type="number" required className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 text-left text-left text-left text-left text-left text-left" defaultValue={editingRank?.order || 5}/>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl text-left text-left text-left text-left">
              <button type="button" onClick={() => setIsRankModalOpen(false)} className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-500 text-left text-left text-left text-left">Hủy</button>
              <button type="submit" className="px-10 py-2 bg-indigo-600 text-white rounded-xl font-bold shadow-lg text-left text-left text-left text-left">Lưu Cấp Bậc</button>
            </div>
          </form>
        </div>
      )}

      {/* GRADE MODAL */}
      {isGradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left text-left text-left">
          <form onSubmit={handleSaveGrade} className="bg-white rounded-3xl shadow-2xl w-full max-lg animate-fade-in-up text-left text-left text-left text-left">
            <div className="p-6 bg-slate-900 text-white rounded-t-3xl flex justify-between items-center text-left text-left text-left text-left text-left">
              <h3 className="font-bold text-lg text-left text-left text-left text-left text-left">{editingGrade ? 'Cập Nhật Bậc Lương' : 'Thêm Bậc Lương Mới'}</h3>
              <button type="button" onClick={() => setIsGradeModalOpen(false)} className="text-left text-left text-left text-left text-left"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-4 text-left text-left text-left text-left text-left">
              <div className="grid grid-cols-2 gap-4 text-left text-left text-left text-left text-left">
                <div className="text-left text-left text-left text-left text-left text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left text-left text-left text-left text-left">Thứ tự Bậc</label>
                  <input name="level" type="number" required className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-50 text-left text-left text-left text-left text-left text-left" defaultValue={editingGrade?.level || 1}/>
                </div>
                <div className="text-left text-left text-left text-left text-left text-left text-left">
                  <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left text-left text-left text-left text-left text-left text-left">Rank (Auto-gán)</label>
                  <input disabled className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-100 text-slate-400 text-left text-left text-left text-left text-left text-left text-left text-left" value={currentRank?.name}/>
                </div>
              </div>
              <div className="text-left text-left text-left text-left text-left text-left text-left text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left text-left text-left text-left text-left text-left text-left">Lương Cơ Bản Định Mức (Gross)</label>
                <input name="baseSalary" type="number" required className="w-full px-4 py-2 border rounded-xl font-black text-blue-600 bg-slate-50 text-left text-left text-left text-left text-left text-left text-left text-left" defaultValue={editingGrade?.baseSalary || 0}/>
              </div>
              <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Phụ cấp cố định (Ăn trưa, xăng...)</label>
                <input name="fixedAllowance" type="number" className="w-full px-4 py-2 border rounded-xl font-bold bg-slate-50 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left" defaultValue={editingGrade?.fixedAllowance || 0}/>
              </div>
            </div>
            <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl text-left text-left text-left text-left text-left text-left">
              <button type="button" onClick={() => setIsGradeModalOpen(false)} className="px-6 py-2 bg-white border border-slate-200 rounded-xl font-bold text-slate-500 text-left text-left text-left text-left text-left text-left">Hủy</button>
              <button type="submit" className="px-10 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg text-left text-left text-left text-left text-left text-left">Lưu Bậc Lương</button>
            </div>
          </form>
        </div>
      )}

      {/* FIXED BONUS MODAL */}
      {isFixedBonusModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm text-left text-left text-left text-left">
            <form onSubmit={handleSaveFixedBonus} className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up text-left text-left text-left text-left text-left text-left">
                <div className="p-6 bg-amber-600 text-white rounded-t-3xl flex justify-between items-center text-left text-left text-left text-left text-left text-left text-left">
                    <div className="flex items-center gap-3 text-left text-left text-left text-left text-left text-left text-left">
                        <CalendarClock size={24} className="text-left text-left text-left text-left text-left text-left text-left"/>
                        <h3 className="font-bold text-lg leading-none text-left text-left text-left text-left text-left text-left text-left text-left">Thêm Thưởng Lễ/Tết Bậc</h3>
                    </div>
                    <button type="button" onClick={() => setIsFixedBonusModalOpen(false)} className="text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left"><X size={24}/></button>
                </div>
                <div className="p-8 space-y-5 text-left text-sm font-medium text-left text-left text-left text-left text-left text-left text-left text-left">
                    <div className="text-left text-left text-left text-left text-left text-left">
                        <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 text-left text-left text-left text-left text-left text-left text-left">Tên dịp lễ</label>
                        <input name="name" required placeholder="VD: Thưởng lễ 30/4..." className="w-full px-4 py-3 border-2 rounded-2xl font-bold outline-none focus:border-amber-500 bg-slate-50 text-left text-left text-left text-left text-left text-left text-left" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-left text-left text-left text-left text-left text-left text-left">
                        <div className="text-left text-left text-left text-left text-left text-left text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 text-left text-left text-left text-left text-left text-left text-left text-left">Tháng áp dụng</label>
                            <select name="month" className="w-full px-4 py-3 border-2 rounded-2xl font-bold bg-white outline-none focus:border-amber-500 text-left text-left text-left text-left text-left text-left text-left text-left">
                                {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>Tháng {i+1}</option>)}
                            </select>
                        </div>
                        <div className="text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1.5 text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Số tiền thưởng</label>
                            <input name="amount" type="number" required placeholder="500000" className="w-full px-4 py-3 border-2 rounded-2xl font-black text-indigo-600 bg-slate-50 text-left text-left text-left text-left text-left text-left text-left text-left text-left" />
                        </div>
                    </div>
                </div>
                <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl text-left text-left text-left text-left text-left text-left text-left text-left text-left">
                    <button type="button" onClick={() => setIsFixedBonusModalOpen(false)} className="px-6 py-2 bg-white border rounded-xl font-bold text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Hủy</button>
                    <button type="submit" className="px-10 py-2 bg-amber-600 text-white rounded-xl font-bold shadow-lg text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left text-left">Lưu Thưởng</button>
                </div>
            </form>
          </div>
      )}
    </div>
  );
};

export default SalaryGrids;
