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
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl w-full max-w-md relative shadow-xl transform transition-all animate-in zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors" disabled={isLoading}>
                    <CloseIcon className="w-6 h-6" />
                </button>

                <div className="p-8">
                    <div className="flex justify-center items-center gap-2 mb-6">
                        <LogoIcon className="w-8 h-8 text-blue-600"/>
                        <span className="font-bold text-xl text-gray-800">Vantage AI</span>
                    </div>

                    <div className="flex border-b mb-6">
                        <button onClick={() => setMode('login')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${mode === 'login' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                            登录
                        </button>
                        <button onClick={() => setMode('register')} className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${mode === 'register' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                            注册
                        </button>
                    </div>

                    {error && <div className="mb-4 text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

                    {mode === 'login' ? (
                        <form onSubmit={handleLogin} className="space-y-4">
                             <div>
                                <label className="text-sm font-medium text-gray-700">邮箱</label>
                                <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} required className="mt-1 w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">密码</label>
                                <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} required className="mt-1 w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3 mt-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center">
                                {isLoading ? <Spinner /> : '登录'}
                            </button>
                        </form>
                    ) : (
                         <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">用户名</label>
                                <input type="text" name="username" value={registerForm.username} onChange={handleRegisterChange} required className="mt-1 w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">邮箱</label>
                                <input type="email" name="email" value={registerForm.email} onChange={handleRegisterChange} required className="mt-1 w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">密码</label>
                                <input type="password" name="password" value={registerForm.password} onChange={handleRegisterChange} required className="mt-1 w-full p-2.5 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full py-3 mt-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-blue-300 flex items-center justify-center">
                                {isLoading ? <Spinner /> : '创建账户'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};