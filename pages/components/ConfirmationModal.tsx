import React from 'react';
import { ShieldAlert, X, AlertCircle, CheckCircle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info' | 'success';
  requireReason?: boolean;
  reason?: string;
  onReasonChange?: (reason: string) => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy',
  type = 'warning',
  requireReason = false,
  reason = '',
  onReasonChange
}) => {
  if (!isOpen) return null;

  const typeStyles = {
    danger: {
      icon: ShieldAlert,
      iconColor: 'text-rose-600',
      iconBg: 'bg-rose-100',
      buttonBg: 'bg-rose-600 hover:bg-rose-700',
      borderColor: 'border-rose-200'
    },
    warning: {
      icon: AlertCircle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      buttonBg: 'bg-amber-600 hover:bg-amber-700',
      borderColor: 'border-amber-200'
    },
    info: {
      icon: AlertCircle,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
      borderColor: 'border-blue-200'
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-emerald-600',
      iconBg: 'bg-emerald-100',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-700',
      borderColor: 'border-emerald-200'
    }
  };

  const style = typeStyles[type];
  const Icon = style.icon;

  const canConfirm = !requireReason || (reason && reason.trim().length > 0);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md animate-fade-in-up p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className={`p-3 ${style.iconBg} rounded-2xl`}>
            <Icon size={24} className={style.iconColor} />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-black text-slate-800 mb-2">{title}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={20} />
          </button>
        </div>

        {requireReason && (
          <div className="mb-6">
            <label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">
              Lý do {type === 'danger' ? 'từ chối' : type === 'warning' ? 'cảnh báo' : ''}
            </label>
            <textarea
              className="w-full p-4 border-2 border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 text-sm font-medium resize-none"
              placeholder="Vui lòng nhập lý do..."
              rows={4}
              value={reason}
              onChange={(e) => onReasonChange?.(e.target.value)}
            />
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button 
            onClick={onClose}
            className="px-6 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors rounded-xl"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`px-8 py-3 ${style.buttonBg} text-white rounded-xl font-bold shadow-xl transition-all uppercase text-[10px] tracking-widest disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

