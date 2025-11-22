import React, { useState } from 'react';
import { login, register } from '../../api';
import { User } from '../../types';
import { CloseIcon, LogoIcon } from '../icons';

interface AuthModalProps {
    onLoginSuccess: (user: User) => void;
    onClose: () => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess, onClose }) => {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { accessToken, user } = await login(loginForm.email, loginForm.password);
            localStorage.setItem('accessToken', accessToken);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message || '登录失败，请检查您的凭据。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await register(registerForm.username, registerForm.email, registerForm.password);
            // After successful registration, attempt to log in automatically
            const { accessToken, user } = await login(registerForm.email, registerForm.password);
            localStorage.setItem('accessToken', accessToken);
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message || '注册失败，请稍后重试。');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-md relative shadow-2xl transform transition-all animate-in zoom-in-95 overflow-hidden">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors z-10" disabled={isLoading}>
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="p-8">
                    <div className="flex flex-col items-center justify-center gap-3 mb-8">
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <LogoIcon className="w-10 h-10 text-indigo-600"/>
                        </div>
                        <span className="font-extrabold text-2xl text-slate-900 tracking-tight">Auto Insight</span>
                        <p className="text-slate-500 text-sm">AI 驱动的汽车行业情报平台</p>
                    </div>

                    <div className="flex border-b border-slate-200 mb-6">
                        <button onClick={() => setMode('login')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mode === 'login' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                            登录
                        </button>
                        <button onClick={() => setMode('register')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mode === 'register' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                            注册
                        </button>
                    </div>

                    {error && <div className="mb-4 text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}

                    {mode === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                             <div>
                                <label className="text-sm font-bold text-slate-700">邮箱</label>
                                <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} required className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">密码</label>
                                <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} required className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-4 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center transition-all transform active:scale-[0.98]">
                                {isLoading ? <Spinner /> : '登录'}
                            </button>
                        </form>
                    ) : (
                         <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="text-sm font-bold text-slate-700">用户名</label>
                                <input type="text" name="username" value={registerForm.username} onChange={handleRegisterChange} required className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">邮箱</label>
                                <input type="email" name="email" value={registerForm.email} onChange={handleRegisterChange} required className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                            </div>
                            <div>
                                <label className="text-sm font-bold text-slate-700">密码</label>
                                <input type="password" name="password" value={registerForm.password} onChange={handleRegisterChange} required className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-4 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center transition-all transform active:scale-[0.98]">
                                {isLoading ? <Spinner /> : '创建账户'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};