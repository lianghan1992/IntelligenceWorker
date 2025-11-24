
import React, { useState } from 'react';
import { updateGeminiCookies } from '../../api';
import { SparklesIcon, ServerIcon } from '../icons';

export const GeminiSettingsManager: React.FC = () => {
    const [formData, setFormData] = useState({
        secure_1psid: '',
        secure_1psidts: '',
        http_proxy: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.secure_1psid || !formData.secure_1psidts) {
            setStatus({ type: 'error', message: '请填写必要的 Cookie 字段' });
            return;
        }

        setIsLoading(true);
        setStatus(null);
        try {
            const response = await updateGeminiCookies(formData);
            setStatus({ 
                type: 'success', 
                message: `更新成功: ${response.message} (初始化状态: ${response.initialized ? '成功' : '失败'})` 
            });
        } catch (err: any) {
            setStatus({ type: 'error', message: err.message || '更新失败' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-100 pb-4">
                    <div className="p-2 bg-purple-100 rounded-lg">
                        <SparklesIcon className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Gemini Cookie 实时更新</h2>
                        <p className="text-xs text-gray-500">无需重启服务即可重建 Gemini 客户端连接</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {status && (
                        <div className={`p-4 rounded-lg text-sm ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            {status.message}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">__Secure-1PSID <span className="text-red-500">*</span></label>
                        <input 
                            type="password" 
                            value={formData.secure_1psid}
                            onChange={e => setFormData(p => ({ ...p, secure_1psid: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                            placeholder="输入 Cookie 值..."
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">__Secure-1PSIDTS <span className="text-red-500">*</span></label>
                        <input 
                            type="password" 
                            value={formData.secure_1psidts}
                            onChange={e => setFormData(p => ({ ...p, secure_1psidts: e.target.value }))}
                            className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
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
                                className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2.5 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                                placeholder="http://127.0.0.1:20171 (若留空则使用环境变量配置)"
                            />
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">如果服务器 `.env` 中已配置代理，此处无需填写。</p>
                    </div>

                    <div className="pt-4">
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                '更新配置并重连'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
