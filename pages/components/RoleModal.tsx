import React, { useState } from 'react';
import { X } from 'lucide-react';
import { SystemRole } from '../../types';

interface RoleModalProps {
  role: SystemRole | null;
  onClose: () => void;
  onSave: (role: SystemRole) => void;
}

export const RoleModal: React.FC<RoleModalProps> = ({ role, onClose, onSave }) => {
  const [code, setCode] = useState(role?.code || '');
  const [name, setName] = useState(role?.name || '');
  const [description, setDescription] = useState(role?.description || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: role?.id || `ROLE_${Date.now()}`,
      code: code.toUpperCase(),
      name,
      description,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up">
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <h3 className="font-bold text-lg">{role ? 'Sửa Vai Trò' : 'Thêm Vai Trò'}</h3>
          <button type="button" onClick={onClose}><X size={24}/></button>
        </div>
        <div className="p-8 space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Mã vai trò</label>
            <input 
              required
              className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" 
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="VD: QUAN_LY"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Tên vai trò</label>
            <input 
              required
              className="w-full px-4 py-2.5 border rounded-xl font-bold bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" 
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="VD: Quản Lý"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Mô tả</label>
            <textarea 
              className="w-full px-4 py-2.5 border rounded-xl font-medium bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" 
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Mô tả vai trò..."
            />
          </div>
        </div>
        <div className="p-6 bg-slate-50 border-t flex justify-end gap-3 rounded-b-3xl">
          <button type="button" onClick={onClose} className="px-6 py-2 bg-white border rounded-xl font-bold text-slate-500">Hủy</button>
          <button type="submit" className="px-10 py-2 bg-slate-900 text-white rounded-xl font-bold shadow-lg">Lưu Vai Trò</button>
        </div>
      </form>
    </div>
  );
};

