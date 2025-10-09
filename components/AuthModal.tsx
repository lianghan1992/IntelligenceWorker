import React, { useState } from 'react';
import { CloseIcon, LogoIcon } from './icons';
import { loginUser, registerUser, forgotPassword } from '../api';
import { User } from '../types';

interface AuthModalProps {
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onLoginSuccess }) => {
    const [view, setView] = useState<'login' | 'register' | 'forgotPassword' | 'forgotSuccess'>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            // API expects email for login
            const user = await loginUser(email, password);
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
            const user = await registerUser(username, email, password);
            onLoginSuccess(user); // Automatically log in after successful registration
        } catch (err: any) {
            setError(err.message || '注册失败，请稍后重试。');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            await forgotPassword(email);
            setView('forgotSuccess');
        } catch (err: any) {
            setError(err.message || '无法发送重置邮件，请检查邮箱地址。');
        } finally {
            setIsLoading(false);
        }
    }

    const renderLogin = () => (
        <form onSubmit={handleLogin} className="space-y-4">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" required className="w-full p-3 bg-gray-100 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" required className="w-full p-3 bg-gray-100 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            <button type="button" onClick={() => setView('forgotPassword')} className="text-sm text-blue-600 hover:underline">忘记密码?</button>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center">
                {isLoading ? <Spinner /> : '登录'}
            </button>
        </form>
    );

    const renderRegister = () => (
        <form onSubmit={handleRegister} className="space-y-4">
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="用户名" required className="w-full p-3 bg-gray-100 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" required className="w-full p-3 bg-gray-100 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" required className="w-full p-3 bg-gray-100 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center">
                {isLoading ? <Spinner /> : '注册'}
            </button>
        </form>
    );
    
    const renderForgotPassword = () => (
        <form onSubmit={handleForgotPassword} className="space-y-4">
            <p className="text-sm text-gray-600">请输入您的邮箱地址，我们将发送密码重置链接。</p>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" required className="w-full p-3 bg-gray-100 rounded-lg border focus:ring-2 focus:ring-blue-500 focus:outline-none"/>
            <button type="submit" disabled={isLoading} className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center">
                {isLoading ? <Spinner /> : '发送重置邮件'}
            </button>
        </form>
    );
    
    const renderForgotSuccess = () => (
        <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-800">邮件已发送</h3>
            <p className="mt-2 text-sm text-gray-600">如果您的邮箱地址存在于我们的系统中，您将会收到一封密码重置邮件。请检查您的收件箱。</p>
            <button onClick={() => setView('login')} className="mt-4 w-full py-3 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">返回登录</button>
        </div>
    );
    
    const mainContent = {
        login: renderLogin,
        register: renderRegister,
        forgotPassword: renderForgotPassword,
        forgotSuccess: renderForgotSuccess,
    }[view];

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" aria-modal="true">
            <div className="bg-white rounded-2xl w-full max-w-sm relative shadow-xl transform transition-all animate-in fade-in-0 zoom-in-95">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors">
                    <CloseIcon className="w-6 h-6" />
                </button>
                <div className="p-8">
                    <div className="text-center mb-6">
                        <LogoIcon className="w-12 h-12 text-blue-600 mx-auto" />
                        <h2 className="mt-2 text-2xl font-bold text-gray-900">
                           {view === 'register' ? '创建账户' : '欢迎回来'}
                        </h2>
                        <p className="text-sm text-gray-500">
                           {view === 'register' ? '已有账户?' : '还没有账户?'}
                           <button onClick={() => setView(view === 'login' ? 'register' : 'login')} className="font-semibold text-blue-600 hover:underline ml-1">
                               {view === 'login' ? '立即注册' : '立即登录'}
                           </button>
                        </p>
                    </div>

                    {error && <div className="mb-4 text-sm text-red-700 bg-red-100 p-3 rounded-lg text-center">{error}</div>}

                    {mainContent()}
                </div>
            </div>
        </div>
    );
};