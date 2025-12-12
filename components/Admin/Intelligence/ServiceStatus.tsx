
import React, { useState, useEffect } from 'react';
import { getServiceHealth, getProxies, addProxy, deleteProxy, testProxy, checkIntelGeminiStatus, updateIntelGeminiCookies, toggleIntelHtmlGeneration } from '../../../api/intelligence';
import { SpiderProxy } from '../../../types';
import { RefreshIcon, CheckCircleIcon, ShieldExclamationIcon, PlusIcon, TrashIcon, PlayIcon, ServerIcon, ChevronDownIcon, ChevronRightIcon, SparklesIcon, CloseIcon, StopIcon, DocumentTextIcon, QuestionMarkCircleIcon, ShieldCheckIcon } from '../../icons';
import { TaskList } from './TaskList';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const WhiteSpinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export const ServiceStatus: React.FC = () => {
    const [status, setStatus] = useState<string | null>(null);
    const [proxies, setProxies] = useState<SpiderProxy[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingProxies, setIsLoadingProxies] = useState(false);
    
    // Proxy Section State
    const [isProxySectionExpanded, setIsProxySectionExpanded] = useState(false);
    const [isAddingProxy, setIsAddingProxy] = useState(false);
    const [newProxy, setNewProxy] = useState({ url: '', enabled: true });
    const [isSavingProxy, setIsSavingProxy] = useState(false);
    const [testingUrl, setTestingUrl] = useState<string | null>(null);

    // Gemini State
    const [geminiStatus, setGeminiStatus] = useState<{ valid: boolean; message: string } | null>(null);
    const [isCheckingGemini, setIsCheckingGemini] = useState(false);
    const [isCookieModalOpen, setIsCookieModalOpen] = useState(false);
    const [cookieForm, setCookieForm] = useState({ secure_1psid: '', secure_1psidts: '' });
    const [isUpdatingCookie, setIsUpdatingCookie] = useState(false);

    // HTML Gen State
    const [isHtmlSettingsOpen, setIsHtmlSettingsOpen] = useState(false);
    const [isTogglingHtml, setIsTogglingHtml] = useState(false);

    const fetchStatus = async () => {
        setIsLoading(true);
        try {
            const res = await getServiceHealth();
            setStatus(res.status);
        } catch (e) { 
            setStatus('error');
        } finally { 
            setIsLoading(false); 
        }
    };

    const fetchProxies = async () => {
        setIsLoadingProxies(true);
        try {
            const res = await getProxies();
            setProxies(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingProxies(false);
        }
    };

    const fetchGeminiStatus = async () => {
        setIsCheckingGemini(true);
        try {
            const res = await checkIntelGeminiStatus();
            setGeminiStatus(res);
        } catch (e) {
            setGeminiStatus({ valid: false, message: 'Check failed' });
        } finally {
            setIsCheckingGemini(false);
        }
    };

    useEffect(() => { 
        fetchStatus(); 
        fetchProxies();
        fetchGeminiStatus();
    }, []);

    const handleAddProxy = async () => {
        if (!newProxy.url.trim()) return;
        setIsSavingProxy(true);
        try {
            await addProxy({ url: newProxy.url, enabled: true });
            setNewProxy({ url: '', enabled: true });
            setIsAddingProxy(false);
            fetchProxies();
        } catch (e) {
            alert('添加代理失败');
        } finally {
            setIsSavingProxy(false);
        }
    };

    const handleDeleteProxy = async (url: string) => {
        if (!confirm('确定要删除此代理吗？')) return;
        try {
            await deleteProxy(url);
            fetchProxies();
        } catch (e) {
            alert('删除代理失败');
        }
    };

    const handleTestProxy = async (url: string) => {
        setTestingUrl(url);
        try {
            const res = await testProxy(url);
            setProxies(prev => prev.map(p => {
                if (p.url === url) {
                    return { ...p, latency_ms: res.success ? res.latency_ms : -1 };
                }
                return p;
            }));
        } catch (e) {
            setProxies(prev => prev.map(p => p.url === url ? { ...p, latency_ms: -1 } : p));
        } finally {
            setTestingUrl(null);
        }
    };

    const handleUpdateCookie = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cookieForm.secure_1psid || !cookieForm.secure_1psidts) {
            alert('请填写所有必填项');
            return;
        }
        setIsUpdatingCookie(true);
        try {
            await updateIntelGeminiCookies(cookieForm);
            setIsCookieModalOpen(false);
            setCookieForm({ secure_1psid: '', secure_1psidts: '' });
            fetchGeminiStatus();
            alert('Cookie 更新成功');
        } catch (e: any) {
            alert('更新失败: ' + (e.message || '未知错误'));
        } finally {
            setIsUpdatingCookie(false);
        }
    };

    const handleHtmlToggle = async (enabled: boolean) => {
        setIsTogglingHtml(true);
        try {
            const res = await toggleIntelHtmlGeneration(enabled);
            alert(`操作成功: ${res.message}`);
            setIsHtmlSettingsOpen(false);
        } catch (e: any) {
            alert(`操作失败: ${e.message}`);
        } finally {
            setIsTogglingHtml(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* System Status Card - Compact Width */}
                <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <h3 className="text-base font-bold text-gray-800">系统运行状态</h3>
                        <button onClick={fetchStatus} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-full ${status === 'ok' ? 'bg-green-100' : 'bg-red-100'}`}>
                            {status === 'ok' ? (
                                <CheckCircleIcon className="w-6 h-6 text-green-600" />
                            ) : (
                                <ShieldExclamationIcon className="w-6 h-6 text-red-600" />
                            )}
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">IntelSpider Service</div>
                            <div className={`text-lg font-bold ${status === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                                {status === 'ok' ? '运行正常' : '服务异常'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gemini Status Card - Compact Width */}
                <div className="p-5 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-purple-600" />
                            <h3 className="text-base font-bold text-gray-800">Gemini 引擎状态</h3>
                        </div>
                        <button onClick={fetchGeminiStatus} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                            <RefreshIcon className={`w-4 h-4 ${isCheckingGemini ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`inline-block w-2.5 h-2.5 rounded-full ${geminiStatus?.valid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                            <span className={`text-sm font-medium ${geminiStatus?.valid ? 'text-green-700' : 'text-red-600'}`}>
                                {geminiStatus?.valid ? 'Cookie 有效' : 'Cookie 无效/过期'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setIsHtmlSettingsOpen(true)}
                                className="text-xs px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-bold shadow-sm border border-blue-200"
                            >
                                HTML 生成
                            </button>
                            <button 
                                onClick={() => setIsCookieModalOpen(true)}
                                className="text-xs px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-bold shadow-sm"
                            >
                                更新 Cookie
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Proxy Management Card (Collapsible) */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden transition-all duration-300">
                <div 
                    className="p-6 border-b bg-gray-50 flex justify-between items-center cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setIsProxySectionExpanded(!isProxySectionExpanded)}
                >
                    <div className="flex items-center gap-3">
                        {isProxySectionExpanded ? <ChevronDownIcon className="w-5 h-5 text-gray-500" /> : <ChevronRightIcon className="w-5 h-5 text-gray-500" />}
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <ServerIcon className="w-5 h-5 text-indigo-600"/> 代理管理
                        </h3>
                        {!isProxySectionExpanded && proxies.length > 0 && (
                            <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
                                {proxies.length} active
                            </span>
                        )}
                    </div>
                    {isProxySectionExpanded && (
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <button onClick={fetchProxies} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-gray-500 transition-all border border-transparent hover:border-gray-200">
                                <RefreshIcon className={`w-4 h-4 ${isLoadingProxies ? 'animate-spin' : ''}`} />
                            </button>
                            <button 
                                onClick={() => setIsAddingProxy(!isAddingProxy)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shadow-sm"
                            >
                                <PlusIcon className="w-3.5 h-3.5" /> 新增代理
                            </button>
                        </div>
                    )}
                </div>

                {isProxySectionExpanded && (
                    <div className="animate-in slide-in-from-top-2">
                        {isAddingProxy && (
                            <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                                <div className="flex flex-col md:flex-row gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="代理地址 (e.g., http://127.0.0.1:7890)" 
                                        value={newProxy.url}
                                        onChange={e => setNewProxy({...newProxy, url: e.target.value})}
                                        className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                    <button 
                                        onClick={handleAddProxy}
                                        disabled={isSavingProxy || !newProxy.url}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 min-w-[80px] flex justify-center"
                                    >
                                        {isSavingProxy ? <Spinner /> : '保存'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b">
                                    <tr>
                                        <th className="px-6 py-3">代理地址</th>
                                        <th className="px-6 py-3">启用状态</th>
                                        <th className="px-6 py-3">延迟测试</th>
                                        <th className="px-6 py-3">备注</th>
                                        <th className="px-6 py-3 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {isLoadingProxies && proxies.length === 0 ? (
                                        <tr><td colSpan={5} className="py-8 text-center text-gray-400">加载中...</td></tr>
                                    ) : proxies.length === 0 ? (
                                        <tr><td colSpan={5} className="py-8 text-center text-gray-400">暂无代理配置</td></tr>
                                    ) : (
                                        proxies.map((proxy) => (
                                            <tr key={proxy.url} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 font-mono text-gray-800">{proxy.url}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${proxy.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                                        {proxy.enabled ? 'Enabled' : 'Disabled'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {proxy.latency_ms !== undefined && (
                                                        <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${proxy.latency_ms >= 0 && proxy.latency_ms < 500 ? 'bg-green-50 text-green-700' : proxy.latency_ms >= 500 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'}`}>
                                                            {proxy.latency_ms >= 0 ? `${proxy.latency_ms}ms` : 'Failed'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">{proxy.note || '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <button 
                                                            onClick={() => handleTestProxy(proxy.url)}
                                                            disabled={testingUrl === proxy.url}
                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg border border-transparent hover:border-blue-100 transition-all"
                                                            title="测试连接"
                                                        >
                                                            {testingUrl === proxy.url ? <Spinner /> : <PlayIcon className="w-4 h-4" />}
                                                        </button>
                                                        <button 
                                                            onClick={() => handleDeleteProxy(proxy.url)}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all"
                                                            title="删除代理"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Task List Section */}
            <div className="h-[600px]">
                <TaskList />
            </div>

            {/* Cookie Update Modal */}
            {isCookieModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-purple-600" /> 更新 Gemini Cookie
                            </h3>
                            <button onClick={() => setIsCookieModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateCookie} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">__Secure-1PSID</label>
                                <input 
                                    type="password"
                                    value={cookieForm.secure_1psid}
                                    onChange={e => setCookieForm({...cookieForm, secure_1psid: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="输入 __Secure-1PSID 值..."
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">__Secure-1PSIDTS</label>
                                <input 
                                    type="password"
                                    value={cookieForm.secure_1psidts}
                                    onChange={e => setCookieForm({...cookieForm, secure_1psidts: e.target.value})}
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                    placeholder="输入 __Secure-1PSIDTS 值..."
                                />
                            </div>
                            <div className="flex justify-end pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isUpdatingCookie}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isUpdatingCookie ? <WhiteSpinner /> : '保存更新'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isHtmlSettingsOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="p-5 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                <DocumentTextIcon className="w-5 h-5 text-blue-600" /> HTML 生成管理
                            </h3>
                            <button onClick={() => setIsHtmlSettingsOpen(false)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
                                <CloseIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-6 bg-blue-50 p-3 rounded-lg border border-blue-100">
                                开启后，系统将在爬取文章时自动调用 LLM 将 Markdown 内容转换为美化的 HTML 格式。这可能会增加 Token 消耗。
                            </p>
                            <div className="flex gap-3 justify-center">
                                <button 
                                    onClick={() => handleHtmlToggle(true)}
                                    disabled={isTogglingHtml}
                                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTogglingHtml ? <WhiteSpinner /> : <PlayIcon className="w-4 h-4" />}
                                    开启生成
                                </button>
                                <button 
                                    onClick={() => handleHtmlToggle(false)}
                                    disabled={isTogglingHtml}
                                    className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isTogglingHtml ? <WhiteSpinner /> : <StopIcon className="w-4 h-4" />}
                                    停止生成
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
