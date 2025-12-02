
import React, { useState, useEffect, useCallback } from 'react';
import { updateGeminiCookies, checkGeminiCookies, toggleHtmlGeneration } from '../../api';
import { SparklesIcon, ServerIcon, CheckCircleIcon, ShieldExclamationIcon, QuestionMarkCircleIcon, RefreshIcon, DocumentTextIcon, PlayIcon, StopIcon } from '../icons';

const Spinner: React.FC<{ white?: boolean }> = ({ white }) => (
    <svg className={`animate-spin h-4 w-4 ${white ? 'text-white' : 'text-current'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const GeminiSettingsManager: React.FC = () => {
    const [formData, setFormData] = useState({ secure_1psid: '', secure_1psidts: '', http_proxy: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [isTogglingHtml, setIsTogglingHtml] = useState(false);
    const [cookieStatus, setCookieStatus] = useState<{ has_cookie: boolean; valid: boolean } | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [htmlGenStatus, setHtmlGenStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const checkStatus = useCallback(async () => {
        setIsChecking(true);
        try {
            const res = await checkGeminiCookies();
            setCookieStatus(res);
        } catch (error) {
            setCookieStatus(null);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => { checkStatus(); }, [checkStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setStatus(null);
        try {
            const response = await updateGeminiCookies(formData);
            setStatus({ type: 'success', message: `配置更新成功 (${response.initialized ? 'Initialized' : 'Saved'})` });
            await checkStatus();
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || '更新失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleHtml = async (enable: boolean) => {
        setIsTogglingHtml(true);
        try {
            const response = await toggleHtmlGeneration(enable);
            setHtmlGenStatus({ type: 'success', message: response.enabled ? 'HTML生成已开启' : 'HTML生成已关闭' });
        } catch (err: any) {
            setHtmlGenStatus({ type: 'error', message: err.message });
        } finally {
            setIsTogglingHtml(false);
        }
    };

    const getStatusDisplay = () => {
        if (!cookieStatus) return { color: 'text-gray-500', bg: 'bg-gray-100', icon: QuestionMarkCircleIcon, label: '状态未知' };
        if (!cookieStatus.has_cookie) return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: QuestionMarkCircleIcon, label: '未配置' };
        if (cookieStatus.valid) return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircleIcon, label: '运行正常' };
        return { color: 'text-red-600', bg: 'bg-red-100', icon: ShieldExclamationIcon, label: '配置失效' };
    };

    const st = getStatusDisplay();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* HTML Generation Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-indigo-200 transition-colors">
                <div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DocumentTextIcon className="w-6 h-6" /></div>
                        <div>
                            <h4 className="font-bold text-slate-800">HTML 智能排版</h4>
                            <p className="text-xs text-slate-500">爬取文章后自动生成美化报告</p>
                        </div>
                    </div>
                    {htmlGenStatus && (
                        <div className={`mb-4 p-2 rounded text-xs font-medium flex items-center gap-2 ${htmlGenStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {htmlGenStatus.type === 'success' ? <CheckCircleIcon className="w-3 h-3"/> : <ShieldExclamationIcon className="w-3 h-3"/>}
                            {htmlGenStatus.message}
                        </div>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-3 mt-4">
                    <button onClick={() => handleToggleHtml(true)} disabled={isTogglingHtml} className="py-2.5 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {isTogglingHtml ? <Spinner /> : <PlayIcon className="w-4 h-4"/>} 开启
                    </button>
                    <button onClick={() => handleToggleHtml(false)} disabled={isTogglingHtml} className="py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
                        {isTogglingHtml ? <Spinner /> : <StopIcon className="w-4 h-4"/>} 关闭
                    </button>
                </div>
            </div>

            {/* Gemini Config Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 hover:border-purple-200 transition-colors">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><SparklesIcon className="w-6 h-6" /></div>
                        <div>
                            <h4 className="font-bold text-slate-800">Gemini 引擎</h4>
                            <div className={`mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold ${st.bg} ${st.color}`}>
                                <st.icon className="w-3 h-3" /> {st.label}
                            </div>
                        </div>
                    </div>
                    <button onClick={checkStatus} disabled={isChecking} className="text-slate-400 hover:text-indigo-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors">
                        <RefreshIcon className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <input type="password" value={formData.secure_1psid} onChange={e => setFormData(p => ({ ...p, secure_1psid: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-shadow" placeholder="__Secure-1PSID" />
                    </div>
                    <div>
                        <input type="password" value={formData.secure_1psidts} onChange={e => setFormData(p => ({ ...p, secure_1psidts: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 px-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-shadow" placeholder="__Secure-1PSIDTS" />
                    </div>
                    <div className="relative">
                        <ServerIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input type="text" value={formData.http_proxy} onChange={e => setFormData(p => ({ ...p, http_proxy: e.target.value }))} className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-shadow" placeholder="HTTP Proxy (Optional)" />
                    </div>
                    
                    {status && (
                        <div className={`text-xs p-3 rounded-lg flex items-center gap-2 ${status.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {status.type === 'success' ? <CheckCircleIcon className="w-4 h-4"/> : <ShieldExclamationIcon className="w-4 h-4"/>}
                            {status.message}
                        </div>
                    )}

                    <button type="submit" disabled={isLoading} className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm rounded-xl shadow-md transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? <Spinner white /> : '保存配置'}
                    </button>
                </form>
            </div>
        </div>
    );
};
