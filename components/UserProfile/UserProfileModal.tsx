
import React, { useState } from 'react';
import { User } from '../../types';
import { requestPasswordRecovery, resetPassword } from '../../api';
import { CloseIcon, UserIcon, ShieldCheckIcon, CheckCircleIcon, ArrowLeftIcon, ClockIcon } from '../icons';

interface UserProfileModalProps {
    user: User;
    onClose: () => void;
}

const Spinner = () => <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>;

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, onClose }) => {
    const [activeTab, setActiveTab] = useState<'info' | 'security'>('info');
    
    // Security States
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [step, setStep] = useState<'request' | 'reset'>('request');
    const [resetForm, setResetForm] = useState({ token: '', newPassword: '' });

    const handleSendEmail = async () => {
        setIsLoading(true);
        setMessage(null);
        try {
            await requestPasswordRecovery(user.email);
            setMessage({ type: 'success', text: '验证邮件已发送，请查收 Token。' });
            setStep('reset');
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || '发送失败，请重试。' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resetForm.token || !resetForm.newPassword) return;
        setIsLoading(true);
        setMessage(null);
        try {
            // resetPassword expects (email, code, new_password)
            await resetPassword(user.email, resetForm.token, resetForm.newPassword);
            setMessage({ type: 'success', text: '密码修改成功！下次登录请使用新密码。' });
            setResetForm({ token: '', newPassword: '' });
            // Optional: Close modal or stay to show success
            setTimeout(() => {
                setStep('request');
            }, 3000);
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || '修改失败，Token 可能已失效。' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in zoom-in-95">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col border border-slate-200">
                
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <UserIcon className="w-5 h-5 text-indigo-600"/> 个人资料
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                        <CloseIcon className="w-5 h-5"/>
                    </button>
                </div>

                <div className="flex flex-1 min-h-[300px]">
                    {/* Sidebar */}
                    <div className="w-32 bg-slate-50 border-r border-slate-200 p-2 flex flex-col gap-1">
                        <button 
                            onClick={() => setActiveTab('info')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors ${activeTab === 'info' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            基本信息
                        </button>
                        <button 
                            onClick={() => setActiveTab('security')}
                            className={`px-3 py-2 rounded-lg text-xs font-bold text-left transition-colors ${activeTab === 'security' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}
                        >
                            账号安全
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6">
                        {activeTab === 'info' && (
                            <div className="space-y-6 animate-in slide-in-from-right-4 fade-in">
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-2xl font-bold text-indigo-600 border-2 border-white shadow-md">
                                        {user.username.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="text-xl font-bold text-slate-900">{user.username}</h4>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-4 mt-6">
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">用户 ID</div>
                                        <div className="text-xs font-mono text-slate-700">{user.id}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="text-xs text-slate-400 font-bold uppercase mb-1">当前计划</div>
                                        <div className="font-bold text-indigo-600">{user.plan_name}</div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-2">
                                        <ClockIcon className="w-4 h-4 text-slate-400"/>
                                        <div className="text-xs text-slate-500">
                                            注册于 {new Date(user.created_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="animate-in slide-in-from-right-4 fade-in">
                                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                    <ShieldCheckIcon className="w-4 h-4 text-green-600"/> 修改登录密码
                                </h4>
                                
                                {message && (
                                    <div className={`mb-4 p-3 rounded-lg text-xs font-medium flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                        {message.type === 'success' ? <CheckCircleIcon className="w-4 h-4"/> : null}
                                        {message.text}
                                    </div>
                                )}

                                {step === 'request' ? (
                                    <div className="space-y-4">
                                        <p className="text-xs text-slate-500 leading-relaxed bg-blue-50 p-3 rounded-lg border border-blue-100">
                                            为了您的账号安全，修改密码需要验证您的注册邮箱。点击下方按钮，我们将向 <b>{user.email}</b> 发送验证 Token。
                                        </p>
                                        <button 
                                            onClick={handleSendEmail}
                                            disabled={isLoading}
                                            className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                                        >
                                            {isLoading ? <Spinner/> : '发送验证邮件'}
                                        </button>
                                        <button 
                                            onClick={() => setStep('reset')} 
                                            className="w-full text-xs text-slate-400 hover:text-indigo-600 underline text-center"
                                        >
                                            我已经有 Token 了
                                        </button>
                                    </div>
                                ) : (
                                    <form onSubmit={handleResetPassword} className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5">验证 Token</label>
                                            <input 
                                                type="text"
                                                value={resetForm.token}
                                                onChange={e => setResetForm({...resetForm, token: e.target.value})}
                                                placeholder="粘贴邮件中的 Token"
                                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1.5">新密码</label>
                                            <input 
                                                type="password"
                                                value={resetForm.newPassword}
                                                onChange={e => setResetForm({...resetForm, newPassword: e.target.value})}
                                                placeholder="设置新密码"
                                                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                                                required
                                            />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <button 
                                                type="button" 
                                                onClick={() => setStep('request')}
                                                className="px-4 py-2 bg-white border border-slate-300 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
                                            >
                                                <ArrowLeftIcon className="w-3 h-3"/>
                                            </button>
                                            <button 
                                                type="submit"
                                                disabled={isLoading}
                                                className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-70"
                                            >
                                                {isLoading ? <Spinner/> : '确认修改'}
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
