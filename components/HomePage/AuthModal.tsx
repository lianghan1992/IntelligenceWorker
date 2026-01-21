
import React, { useState } from 'react';
import { login, register, requestPasswordRecovery, resetPassword } from '../../api';
import { User } from '../../types';
import { CloseIcon, LogoIcon, CheckCircleIcon, ArrowLeftIcon, DocumentTextIcon } from '../icons';
import { WelcomeGiftModal } from './WelcomeGiftModal';

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

type AuthMode = 'login' | 'register' | 'forgot_password' | 'reset_password';

export const AuthModal: React.FC<AuthModalProps> = ({ onLoginSuccess, onClose }) => {
    const [mode, setMode] = useState<AuthMode>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [verificationPending, setVerificationPending] = useState(false);
    
    // Gift Modal State (Note: Gift logic is now deferred until after login, effectively removed from registration flow here)
    const [showGift, setShowGift] = useState(false);
    // const [pendingUser, setPendingUser] = useState<User | null>(null);

    const [loginForm, setLoginForm] = useState({ email: '', password: '' });
    const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetForm, setResetForm] = useState({ token: '', newPassword: '' });

    const handleLoginChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLoginForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setRegisterForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleResetFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setResetForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            const { accessToken, user } = await login(loginForm.email, loginForm.password);
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('user_cache', JSON.stringify(user));
            onLoginSuccess(user);
        } catch (err: any) {
            setError(err.message || '登录失败，请检查您的凭据或确认账号是否已激活。');
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
            // Registration successful, show verification prompt
            setVerificationPending(true);
        } catch (err: any) {
            setError(err.message || '注册失败，请稍后重试。');
        } finally {
            setIsLoading(false);
        }
    };

    // Gift logic is essentially paused for registration now, but we keep this handler if triggered post-login elsewhere
    const handleGiftComplete = () => {
        // No-op for now in this flow
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!forgotEmail) return;
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await requestPasswordRecovery(forgotEmail);
            setSuccessMessage('重置邮件已发送，请检查您的邮箱获取 Token。');
            setMode('reset_password');
        } catch (err: any) {
            setError(err.message || '发送失败，请检查邮箱是否正确。');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetForm.token || !resetForm.newPassword) return;
        setIsLoading(true);
        setError('');
        setSuccessMessage('');
        try {
            await resetPassword(resetForm.token, resetForm.newPassword);
            setSuccessMessage('密码重置成功！正在跳转登录...');
            setTimeout(() => {
                setMode('login');
                setSuccessMessage('');
                setResetForm({ token: '', newPassword: '' });
            }, 1500);
        } catch (err: any) {
            setError(err.message || '重置失败，请检查 Token 是否过期。');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <>
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in-0">
                <div className="bg-white rounded-2xl w-full max-w-md relative shadow-2xl transform transition-all animate-in zoom-in-95 overflow-hidden">
                    <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 transition-colors z-10" disabled={isLoading}>
                        <CloseIcon className="w-6 h-6" />
                    </button>

                    <div className="p-8">
                        {/* Header Logo */}
                        <div className="flex flex-col items-center justify-center gap-3 mb-6">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center">
                                <LogoIcon className="w-10 h-10"/>
                            </div>
                            <div className="flex items-center text-xl tracking-tight">
                                 <span className="font-extrabold text-[#2563EB]">Auto</span>
                                 <span className="font-semibold text-[#7C3AED]">Insight</span>
                            </div>
                        </div>

                        {/* Mode Specific Titles */}
                        {verificationPending ? (
                            <div className="text-center space-y-6">
                                <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto border-4 border-green-100">
                                    <CheckCircleIcon className="w-8 h-8 text-green-500" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">验证邮件已发送</h3>
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        我们已向 <strong>{registerForm.email}</strong> 发送了一封包含激活链接的邮件。
                                        <br/><br/>
                                        请查收邮件并点击链接激活您的账号，即可登录使用。
                                    </p>
                                </div>
                                <button 
                                    onClick={() => { setVerificationPending(false); setMode('login'); }}
                                    className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-600 transition-all"
                                >
                                    返回登录
                                </button>
                            </div>
                        ) : (
                            <>
                                {mode === 'forgot_password' && (
                                    <div className="text-center mb-6">
                                        <h3 className="text-lg font-bold text-slate-800">找回密码</h3>
                                        <p className="text-sm text-slate-500">输入注册邮箱，我们将向您发送重置令牌。</p>
                                    </div>
                                )}
                                
                                {mode === 'reset_password' && (
                                    <div className="text-center mb-6">
                                        <h3 className="text-lg font-bold text-slate-800">重置密码</h3>
                                        <p className="text-sm text-slate-500">请输入邮件中的 Token 和新密码。</p>
                                    </div>
                                )}

                                {/* Tabs (Only for Login/Register) */}
                                {(mode === 'login' || mode === 'register') && (
                                    <div className="flex border-b border-slate-200 mb-6">
                                        <button onClick={() => setMode('login')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mode === 'login' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                            登录
                                        </button>
                                        <button onClick={() => setMode('register')} className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${mode === 'register' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                                            注册
                                        </button>
                                    </div>
                                )}

                                {error && <div className="mb-4 text-sm text-center text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                                {successMessage && (
                                    <div className="mb-4 text-sm text-center text-green-600 bg-green-50 p-3 rounded-lg border border-green-100 flex items-center justify-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4"/> {successMessage}
                                    </div>
                                )}

                                {mode === 'login' && (
                                    <form onSubmit={handleLogin} className="space-y-4">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700">邮箱</label>
                                            <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} required className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between items-center">
                                                <label className="text-sm font-bold text-slate-700">密码</label>
                                                <button type="button" onClick={() => setMode('forgot_password')} className="text-xs text-indigo-600 hover:underline">忘记密码?</button>
                                            </div>
                                            <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} required className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" />
                                        </div>
                                        <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-4 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center transition-all transform active:scale-[0.98]">
                                            {isLoading ? <Spinner /> : '登录'}
                                        </button>
                                    </form>
                                )}

                                {mode === 'register' && (
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

                                {mode === 'forgot_password' && (
                                    <form onSubmit={handleForgotPassword} className="space-y-4">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700">注册邮箱</label>
                                            <input 
                                                type="email" 
                                                value={forgotEmail} 
                                                onChange={(e) => setForgotEmail(e.target.value)} 
                                                required 
                                                placeholder="your@email.com"
                                                className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                                            />
                                        </div>
                                        <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center transition-all">
                                            {isLoading ? <Spinner /> : '发送重置邮件'}
                                        </button>
                                        <div className="flex justify-between mt-4 text-sm">
                                            <button type="button" onClick={() => setMode('login')} className="text-slate-500 hover:text-slate-800 flex items-center gap-1">
                                                <ArrowLeftIcon className="w-3 h-3" /> 返回登录
                                            </button>
                                            <button type="button" onClick={() => setMode('reset_password')} className="text-indigo-600 hover:underline">
                                                已有 Token?
                                            </button>
                                        </div>
                                    </form>
                                )}

                                {mode === 'reset_password' && (
                                    <form onSubmit={handleResetPassword} className="space-y-4">
                                        <div>
                                            <label className="text-sm font-bold text-slate-700">重置 Token</label>
                                            <input 
                                                type="text" 
                                                name="token"
                                                value={resetForm.token} 
                                                onChange={handleResetFormChange} 
                                                required 
                                                placeholder="粘贴邮件中的 Token"
                                                className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-mono text-sm" 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-sm font-bold text-slate-700">新密码</label>
                                            <input 
                                                type="password" 
                                                name="newPassword"
                                                value={resetForm.newPassword} 
                                                onChange={handleResetFormChange} 
                                                required 
                                                placeholder="输入新密码"
                                                className="mt-1 w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" 
                                            />
                                        </div>
                                        <button type="submit" disabled={isLoading} className="w-full py-3.5 mt-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center transition-all">
                                            {isLoading ? <Spinner /> : '重置密码'}
                                        </button>
                                        <button type="button" onClick={() => setMode('login')} className="w-full text-center text-sm text-slate-500 hover:text-slate-800 mt-2">
                                            返回登录
                                        </button>
                                    </form>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Welcome Gift Animation Modal - Keep logic if we ever re-enable post-login gift */}
            {showGift && <WelcomeGiftModal onClose={handleGiftComplete} />}
        </>
    );
};
