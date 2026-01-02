
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { User, Lock, ArrowRight, ShieldCheck } from 'lucide-react';

const Login: React.FC = () => {
  const { login } = useAppContext();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); // Reset lỗi cũ
    
    try {
        // Thêm await để đợi login xong hẳn
        const user = await login(username, password);
        
        if (user) {
            // Đăng nhập thành công -> Chuyển trang
            // Dùng replace: true để không cho user back lại trang login
            navigate('/', { replace: true });
        } else {
            setError('Tên đăng nhập hoặc mật khẩu không đúng!');
        }
    } catch (err) {
        setError('Lỗi kết nối server!');
    }
};

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-blue-600 p-8 text-center">
            <div className="mx-auto w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg">
                <ShieldCheck size={32} className="text-blue-600"/>
            </div>
            <h1 className="text-2xl font-bold text-white">HRM PRO SYSTEM</h1>
            <p className="text-blue-100 text-sm mt-1">Hệ thống quản lý Lương & Hiệu suất</p>
        </div>
        
        <form onSubmit={handleLogin} className="p-8 space-y-6">
            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center border border-red-200">
                    {error}
                </div>
            )}
            
            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Tên đăng nhập</label>
                <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Nhập username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                        required
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700">Mật khẩu</label>
                <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="password" 
                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="Nhập mật khẩu"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
            </div>

            <button 
                type="submit" 
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold text-lg hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
            >
                Đăng Nhập <ArrowRight size={20}/>
            </button>

            <div className="text-center text-xs text-slate-400 mt-4">
                <p>Hệ thống quản lý lương nội bộ</p>
                <p>© 2025 HRM Pro Version 2.0</p>
                <p className="mt-2 text-[10px] text-slate-300 italic">Mặc định: admin / 123</p>
            </div>
        </form>
      </div>
    </div>
  );
};

export default Login;
