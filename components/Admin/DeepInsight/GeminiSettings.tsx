import React, { useState, useEffect, useCallback } from 'react';
import { updateDeepInsightGeminiCookies, checkDeepInsightGeminiCookies } from '../../../api';
import { SparklesIcon, ServerIcon, CheckCircleIcon, ShieldExclamationIcon, QuestionMarkCircleIcon, RefreshIcon } from '../../icons';

export const GeminiSettings: React.FC = () => {
    const [formData, setFormData] = useState({
        secure_1psid: '',
        secure_1psidts: '',
        http_proxy: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [cookieStatus, setCookieStatus] = useState<{ has_cookie: boolean; valid: boolean } | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const checkStatus = useCallback(async () => {
        setIsChecking(true);
        try {
            const res = await checkDeepInsightGeminiCookies();
            setCookieStatus(res);
        } catch (error) {
            console.error("Failed to check Deep Insight Gemini cookie status:", error);
            setCookieStatus(null);
        } finally {
            setIsChecking(false);
        }
    }, []);

    useEffect(() => {
        checkStatus();
    }, [checkStatus]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.secure_1psid || !formData.secure_1psidts) {
            setStatus({ type: 'error', message: '请填写必要的 Cookie 字段' });
            return;
        }

        setIsLoading(true);
        setStatus(null);
        try {
            const response = await updateDeepInsightGeminiCookies(formData);
            setStatus({ 
                type: 'success', 
                message: response.message || '更新成功'
            });
            await checkStatus();
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || '更新失败' });
        } finally {
            setIsLoading(false);
        }
    };

    const getStatusDisplay = () => {
        if (!cookieStatus) {
            return {
                bg: 'bg-gray-50',
                border: 'border-gray-200',
                text: 'text-gray-600',
                icon: QuestionMarkCircleIcon,
                label: '状态未知',
                desc: '无法获取当前配置状态'
            };
        }
        if (!cookieStatus.has_cookie) {
            return {
                bg: 'bg-yellow-50',
                border: 'border-yellow-200',
                text: 'text-yellow-700',
                icon: QuestionMarkCircleIcon,
                label: '未配置',
                desc: '系统未检测到 Gemini Cookies'
            };
        }
        if (cookieStatus.valid) {
            return {
                bg: 'bg-green-50',
                border: 'border-green-200',
                text: 'text-green-700',
                icon: CheckCircleIcon,
                label: '运行正常',
                desc: 'Cookies 有效，服务可用'
            };
        }
        return {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-700',
            icon: ShieldExclamationIcon,
            label: '配置失效',
            desc: 'Cookies 已过期或不可用，请重新配置'
        };
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className="p-4 max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <SparklesIcon className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                        <h2 className="text-lg font-bold text-gray-800">深度洞察 - Gemini 配置</h2>
                        <p className="text-xs text-gray-500">用于文档重构与 HTML 生成的 AI 服务配置</p>
                    </div>
                </div>

                {/* Status Section */}
                <div className={`mb-6 p-4 rounded-lg border ${statusDisplay.bg} ${statusDisplay.border} flex items-start justify-between`}>
                    <div className="flex items-start gap-3">
                        <statusDisplay.icon className={`w-5 h-5 mt-0.5 ${statusDisplay.text}`} />
                        <div>
                            <h3 className={`text-sm font-bold ${statusDisplay.text}`}>{statusDisplay.label}</h3>
                            <p className={`text-xs mt-1 opacity-80 ${statusDisplay.text}`}>{statusDisplay.desc}</p>
                        </div>
                    </div>
                    <button 
                        onClick={checkStatus} 
                        disabled={isChecking}
                        className={`p-1.5 rounded-md hover:bg-white/50 transition-colors ${statusDisplay.text}`}
                        title="刷新状态"
                    >
                        <RefreshIcon className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {status && status.type === 'error' && (
                        <div className="p-4 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
                            {status.message}
                        </div>
                    )}
                    {status && status.type === 'success' && (
                        <div className="p-4 rounded-lg text-sm bg-green-50 text-green-700 border border-green-200">
                            {status.message}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">__Secure-1PSID <span className="text-red-500">*</span></label>
                        <input 
                            type="password" 
                            value={formData.secure_1psid}
                            onChange={e => setFormData(p => ({ ...p, secure_1psid: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="输入 Cookie 值..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">__Secure-1PSIDTS <span className="text-red-500">*</span></label>
                        <input 
                            type="password" 
                            value={formData.secure_1psidts}
                            onChange={e => setFormData(p => ({ ...p, secure_1psidts: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                            placeholder="输入 Cookie 值..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">HTTP 代理 (可选)</label>
                        <div className="relative">
                            <ServerIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                value={formData.http_proxy}
                                onChange={e => setFormData(p => ({ ...p, http_proxy: e.target.value }))}
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                                placeholder="http://127.0.0.1:20171 (若留空则使用环境变量)"
                            />
                        </div>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>更新中...</span>
                                </>
                            ) : (
                                '保存配置'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
