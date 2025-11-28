

import React, { useState, useEffect, useCallback } from 'react';
import { 
    getCompetitivenessStatus, toggleCompetitivenessService,
    getDimensions, addDimension, updateDimension, deleteDimension,
    getBrands, addBrand,
    batchUpdateSecondaryDimension, analyzeArticleStage1,
    refreshCompetitivenessCookie
} from '../../api/competitiveness';
import { CompetitivenessStatus, TechAnalysisTask, CompetitivenessDimension } from '../../types';
import { 
    ServerIcon, CheckCircleIcon, ShieldExclamationIcon, RefreshIcon, 
    PlayIcon, StopIcon, ViewGridIcon, TagIcon, PlusIcon, SparklesIcon,
    FunnelIcon, ChartIcon, ChevronRightIcon, QuestionMarkCircleIcon,
    TrashIcon, PencilIcon, CloseIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const WhiteSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Sub-View: System Status & Control ---
const StatusControlPanel: React.FC = () => {
    const [status, setStatus] = useState<CompetitivenessStatus | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isToggling, setIsToggling] = useState(false);
    
    // Cookie Refresh State
    const [cookieForm, setCookieForm] = useState({ secure_1psid: '', secure_1psidts: '' });
    const [isRefreshingCookie, setIsRefreshingCookie] = useState(false);
    const [refreshMessage, setRefreshMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getCompetitivenessStatus();
            setStatus(res);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async (enable: boolean) => {
        setIsToggling(true);
        try {
            const res = await toggleCompetitivenessService(enable);
            setStatus(prev => prev ? { ...prev, enabled: res.enabled } : null);
        } catch (error) {
            alert('操作失败');
        } finally {
            setIsToggling(false);
        }
    };

    const handleCookieRefresh = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cookieForm.secure_1psid || !cookieForm.secure_1psidts) {
            setRefreshMessage({ type: 'error', text: '请填写所有 Cookie 字段' });
            return;
        }
        setIsRefreshingCookie(true);
        setRefreshMessage(null);
        try {
            const res = await refreshCompetitivenessCookie(cookieForm);
            setRefreshMessage({ type: 'success', text: res.message });
            setCookieForm({ secure_1psid: '', secure_1psidts: '' }); // Clear on success
            // Refresh status to update health indicator
            fetchStatus();
        } catch (err: any) {
            setRefreshMessage({ type: 'error', text: err.message || '更新失败，请检查 Cookie 是否有效' });
        } finally {
            setIsRefreshingCookie(false);
        }
    };

    const getCookieHealthIcon = (health?: string) => {
        switch (health) {
            case 'healthy': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'unhealthy': return <ShieldExclamationIcon className="w-5 h-5 text-red-500" />;
            case 'error': return <ShieldExclamationIcon className="w-5 h-5 text-red-500" />;
            default: return <QuestionMarkCircleIcon className="w-5 h-5 text-gray-400" />;
        }
    };

    const getCookieHealthText = (health?: string) => {
        switch (health) {
            case 'healthy': return '健康';
            case 'unhealthy': return '异常';
            case 'error': return '错误';
            default: return '未知';
        }
    };

    return (
        <div className="p-6 max-w-4xl space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">服务运行状态</h3>
                <button onClick={fetchStatus} className="p-2 text-gray-500 hover:text-indigo-600 bg-white border rounded-lg shadow-sm">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Main Switch Card */}
                <div className={`p-6 rounded-xl border-2 flex flex-col items-center justify-center gap-4 transition-all ${status?.enabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`p-3 rounded-full ${status?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                        <ServerIcon className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <div className="text-sm font-medium text-gray-500">服务总开关</div>
                        <div className={`text-xl font-bold ${status?.enabled ? 'text-green-700' : 'text-gray-700'}`}>
                            {status?.enabled ? '已启用 (Running)' : '已禁用 (Stopped)'}
                        </div>
                    </div>
                    <button 
                        onClick={() => handleToggle(!status?.enabled)}
                        disabled={isToggling || !status}
                        className={`px-6 py-2 rounded-lg font-bold text-white shadow-md transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${status?.enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isToggling ? <WhiteSpinner /> : (status?.enabled ? <StopIcon className="w-4 h-4"/> : <PlayIcon className="w-4 h-4"/>)}
                        {status?.enabled ? '停止服务' : '启动服务'}
                    </button>
                </div>

                {/* Worker Status */}
                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">后台 Worker</div>
                        <div className="flex items-center gap-2">
                            {status?.worker_enabled ? (
                                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                            ) : (
                                <ShieldExclamationIcon className="w-5 h-5 text-yellow-500" />
                            )}
                            <span className="text-lg font-semibold text-gray-800">{status?.worker_enabled ? '正常工作' : '未就绪'}</span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-4">
                        负责异步处理文章提取任务。
                    </div>
                </div>

                {/* LLM Provider Status */}
                <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between">
                    <div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">LLM 引擎</div>
                        <div className="flex items-center gap-2 mb-2">
                            <SparklesIcon className="w-5 h-5 text-purple-500" />
                            <span className="text-lg font-semibold text-gray-800 uppercase">{status?.llm_provider || 'Unknown'}</span>
                        </div>
                        {status?.llm_provider === 'gemini_cookie' && (
                            <div className="flex items-center gap-2 bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                {getCookieHealthIcon(status.cookie_health)}
                                <span className={`text-sm font-medium ${status.cookie_health === 'healthy' ? 'text-green-700' : 'text-red-600'}`}>
                                    Cookie: {getCookieHealthText(status.cookie_health)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-4">
                        当前使用的 AI 模型服务提供商。
                    </div>
                </div>
            </div>

            {/* Gemini Cookie Management Section (Conditional) */}
            {status?.llm_provider === 'gemini_cookie' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            Gemini Cookie 管理 (热更新)
                        </h3>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-500 mb-4">
                            当 LLM 服务出现 429 或 401 错误时，可在此处更新 Cookie。更新后无需重启服务即可生效。
                        </p>
                        
                        <form onSubmit={handleCookieRefresh} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">__Secure-1PSID</label>
                                <input 
                                    type="password" 
                                    value={cookieForm.secure_1psid}
                                    onChange={e => setCookieForm({...cookieForm, secure_1psid: e.target.value})}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="输入新的 __Secure-1PSID 值"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">__Secure-1PSIDTS</label>
                                <input 
                                    type="password" 
                                    value={cookieForm.secure_1psidts}
                                    onChange={e => setCookieForm({...cookieForm, secure_1psidts: e.target.value})}
                                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    placeholder="输入新的 __Secure-1PSIDTS 值"
                                />
                            </div>
                            
                            {refreshMessage && (
                                <div className={`p-3 rounded-lg text-sm ${refreshMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {refreshMessage.text}
                                </div>
                            )}

                            <div className="pt-2">
                                <button 
                                    type="submit" 
                                    disabled={isRefreshingCookie}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isRefreshingCookie ? <WhiteSpinner /> : <RefreshIcon className="w-4 h-4" />}
                                    刷新 Cookie
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Dimension Editor Modal ---
const DimensionEditorModal: React.FC<{
    dimension: CompetitivenessDimension;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ dimension, onClose, onSuccess }) => {
    const [subDimensions, setSubDimensions] = useState<string[]>(dimension.sub_dimensions || []);
    const [newSub, setNewSub] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddSub = () => {
        const trimmed = newSub.trim();
        if (trimmed && !subDimensions.includes(trimmed)) {
            setSubDimensions([...subDimensions, trimmed]);
            setNewSub('');
        }
    };

    const handleRemoveSub = (sub: string) => {
        setSubDimensions(subDimensions.filter(s => s !== sub));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateDimension(dimension.name, subDimensions);
            onSuccess();
            onClose();
        } catch (error: any) {
            alert('更新失败: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">编辑维度: {dimension.name}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">管理二级子维度</label>
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                value={newSub}
                                onChange={e => setNewSub(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddSub()}
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="输入子维度名称后按回车"
                            />
                            <button onClick={handleAddSub} disabled={!newSub.trim()} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
                            {subDimensions.map(sub => (
                                <span key={sub} className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm border border-indigo-100">
                                    {sub}
                                    <button onClick={() => handleRemoveSub(sub)} className="ml-2 text-indigo-400 hover:text-indigo-900">
                                        <CloseIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {subDimensions.length === 0 && <span className="text-sm text-gray-400 italic">暂无子维度</span>}
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium text-sm">取消</button>
                    <button onClick={handleSave} disabled={isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm disabled:opacity-50 flex items-center gap-2">
                        {isLoading ? <Spinner /> : '保存更改'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Metadata Management ---
const MetadataManager: React.FC = () => {
    const [dimensions, setDimensions] = useState<CompetitivenessDimension[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [newDimension, setNewDimension] = useState('');
    const [newBrand, setNewBrand] = useState('');
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [editingDimension, setEditingDimension] = useState<CompetitivenessDimension | null>(null);
    const [deletingDimension, setDeletingDimension] = useState<CompetitivenessDimension | null>(null);

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [d, b] = await Promise.all([getDimensions(), getBrands()]);
            setDimensions(d);
            setBrands(b);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddDimension = async () => {
        if (!newDimension.trim()) return;
        try {
            await addDimension(newDimension.trim());
            setNewDimension('');
            loadData();
        } catch (e) {
            alert('添加失败');
        }
    };

    const handleAddBrand = async () => {
        if (!newBrand.trim()) return;
        try {
            await addBrand(newBrand.trim());
            setNewBrand('');
            loadData();
        } catch (e) {
            alert('添加失败');
        }
    };

    const handleDeleteDimensionConfirm = async () => {
        if (!deletingDimension) return;
        try {
            await deleteDimension(deletingDimension.name);
            setDeletingDimension(null);
            loadData();
        } catch (e: any) {
            alert('删除失败: ' + e.message);
        }
    };

    return (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8 h-full overflow-hidden">
            {/* Dimensions Column */}
            <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <ViewGridIcon className="w-5 h-5 text-indigo-600" />
                        一级技术维度 ({dimensions.length})
                    </h3>
                    <button onClick={loadData} className="p-1 hover:bg-gray-200 rounded"><RefreshIcon className="w-4 h-4 text-gray-500"/></button>
                </div>
                <div className="p-4 border-b bg-white">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newDimension} 
                            onChange={e => setNewDimension(e.target.value)} 
                            placeholder="输入新维度名称..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button onClick={handleAddDimension} disabled={!newDimension.trim()} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? <div className="text-center py-4 text-gray-400">加载中...</div> : (
                        <div className="space-y-3">
                            {dimensions.map(d => (
                                <div key={d.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-100 hover:bg-indigo-50/50 transition-all group">
                                    <div>
                                        <div className="font-medium text-slate-800">{d.name}</div>
                                        <div className="text-xs text-slate-500 mt-1">
                                            {d.sub_dimensions?.length || 0} 个子维度
                                        </div>
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button 
                                            onClick={() => setEditingDimension(d)}
                                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md"
                                            title="编辑子维度"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button 
                                            onClick={() => setDeletingDimension(d)}
                                            className="p-1.5 text-red-600 hover:bg-red-100 rounded-md"
                                            title="删除维度"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Brands Column */}
            <div className="flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                        <TagIcon className="w-5 h-5 text-blue-600" />
                        车企品牌库 ({brands.length})
                    </h3>
                    <button onClick={loadData} className="p-1 hover:bg-gray-200 rounded"><RefreshIcon className="w-4 h-4 text-gray-500"/></button>
                </div>
                <div className="p-4 border-b bg-white">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            value={newBrand} 
                            onChange={e => setNewBrand(e.target.value)} 
                            placeholder="输入新品牌名称..."
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <button onClick={handleAddBrand} disabled={!newBrand.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 disabled:opacity-50">
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {loading ? <div className="text-center py-4 text-gray-400">加载中...</div> : (
                        <div className="flex flex-wrap gap-2">
                            {brands.map(b => (
                                <span key={b} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm border border-blue-100 font-medium">
                                    {b}
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {editingDimension && (
                <DimensionEditorModal 
                    dimension={editingDimension} 
                    onClose={() => setEditingDimension(null)} 
                    onSuccess={loadData} 
                />
            )}
            
            {deletingDimension && (
                <ConfirmationModal
                    title="确认删除维度"
                    message={`您确定要删除 "${deletingDimension.name}" 吗？该操作不可撤销。`}
                    onConfirm={handleDeleteDimensionConfirm}
                    onCancel={() => setDeletingDimension(null)}
                    confirmText="删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};

// --- Sub-View: Data Cleaning ---
const DataCleaner: React.FC = () => {
    const [form, setForm] = useState({ old_name: '', new_name: '', tech_dimension: '' });
    const [dimensions, setDimensions] = useState<CompetitivenessDimension[]>([]);
    const [result, setResult] = useState<{ message: string, updated_count: number } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        getDimensions().then(setDimensions).catch(console.error);
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setResult(null);
        try {
            const res = await batchUpdateSecondaryDimension({
                old_name: form.old_name,
                new_name: form.new_name,
                tech_dimension: form.tech_dimension || undefined
            });
            setResult(res);
            setForm({ old_name: '', new_name: '', tech_dimension: '' }); // Reset on success
        } catch (error: any) {
            alert('更新失败: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-amber-50/50">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <FunnelIcon className="w-5 h-5 text-amber-600" />
                        子维度清洗工具
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">用于将 LLM 提取的非标准子维度名称（如“激光雷达系统”）批量归一化为标准名称（如“LiDAR”）。</p>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">旧名称 (Old Name)</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="例如：激光雷达系统"
                            value={form.old_name}
                            onChange={e => setForm({...form, old_name: e.target.value})}
                        />
                    </div>
                    <div className="flex justify-center">
                        <ChevronRightIcon className="w-6 h-6 text-gray-400 rotate-90 md:rotate-0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">新名称 (New Name)</label>
                        <input 
                            required
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none"
                            placeholder="例如：LiDAR"
                            value={form.new_name}
                            onChange={e => setForm({...form, new_name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">限定一级维度 (可选)</label>
                        <select 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                            value={form.tech_dimension}
                            onChange={e => setForm({...form, tech_dimension: e.target.value})}
                        >
                            <option value="">全部维度</option>
                            {dimensions.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                        </select>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading || !form.old_name || !form.new_name}
                        className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50 mt-4"
                    >
                        {loading ? '处理中...' : '执行批量更新'}
                    </button>
                </form>

                {result && (
                    <div className="p-4 bg-green-50 text-green-700 border-t border-green-100 flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" />
                        <span>{result.message} (影响 {result.updated_count} 条记录)</span>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-View: Analysis Debugger ---
const AnalysisDebugger: React.FC = () => {
    const [input, setInput] = useState({
        article_id: '',
        title: '',
        content: ''
    });
    const [result, setResult] = useState<TechAnalysisTask[] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleAnalyze = async () => {
        if (!input.article_id && !input.content) {
            setError('请至少提供 Article ID 或 Content');
            return;
        }
        setLoading(true);
        setError('');
        setResult(null);
        try {
            // If only ID is provided, backend will likely fetch content from DB. 
            // If content is provided, backend uses it directly.
            const res = await analyzeArticleStage1(input);
            setResult(res);
        } catch (e: any) {
            setError(e.message || '分析请求失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <SparklesIcon className="w-5 h-5 text-purple-600" />
                    Stage 1 分析调试
                </h3>
                <p className="text-sm text-gray-500 mt-1">手动触发 LLM 提取，验证文章解析逻辑与 Prompt 效果。</p>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 overflow-hidden">
                {/* Input Panel */}
                <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article ID (UUID)</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm"
                            placeholder="Optional if content is provided"
                            value={input.article_id}
                            onChange={e => setInput({...input, article_id: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article Title</label>
                        <input 
                            type="text" 
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                            placeholder="文章标题"
                            value={input.title}
                            onChange={e => setInput({...input, title: e.target.value})}
                        />
                    </div>
                    <div className="flex-1 flex flex-col">
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Article Content</label>
                        <textarea 
                            className="flex-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono resize-none focus:ring-2 focus:ring-purple-500 outline-none"
                            placeholder="在此粘贴文章全文进行测试..."
                            value={input.content}
                            onChange={e => setInput({...input, content: e.target.value})}
                        ></textarea>
                    </div>
                    <button 
                        onClick={handleAnalyze} 
                        disabled={loading}
                        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg shadow-md transition-colors disabled:opacity-50"
                    >
                        {loading ? 'AI 分析中...' : '运行 Stage 1 提取'}
                    </button>
                </div>

                {/* Output Panel */}
                <div className="flex-1 bg-gray-900 rounded-xl border border-gray-800 p-4 overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center mb-2 text-gray-400 text-xs uppercase font-bold tracking-wider">
                        <span>Analysis Result (JSON)</span>
                        {result && <span className="text-green-400">{result.length} Items Found</span>}
                    </div>
                    <div className="flex-1 overflow-auto custom-scrollbar bg-black/50 rounded-lg p-2">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-purple-400 animate-pulse">Processing...</div>
                        ) : error ? (
                            <div className="text-red-400 font-mono text-sm">{error}</div>
                        ) : result ? (
                            <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap break-all">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        ) : (
                            <div className="text-gray-600 font-mono text-xs text-center mt-20">Waiting for input...</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Layout ---
export const CompetitivenessManager: React.FC = () => {
    const [tab, setTab] = useState<'status' | 'meta' | 'cleaning' | 'debug'>('status');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header Tabs */}
            <div className="bg-white border-b px-6 pt-6 pb-0 flex-shrink-0">
                <h1 className="text-2xl font-extrabold text-slate-800 mb-6">竞争力中台管理</h1>
                <div className="flex gap-8 overflow-x-auto">
                    {[
                        { id: 'status', label: '服务监控', icon: ChartIcon },
                        { id: 'meta', label: '元数据管理', icon: ViewGridIcon },
                        { id: 'cleaning', label: '数据清洗', icon: FunnelIcon },
                        { id: 'debug', label: '分析调试', icon: SparklesIcon },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id as any)}
                            className={`pb-3 px-1 border-b-2 text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                                tab === item.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            <item.icon className="w-4 h-4" />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative">
                {tab === 'status' && <StatusControlPanel />}
                {tab === 'meta' && <MetadataManager />}
                {tab === 'cleaning' && <DataCleaner />}
                {tab === 'debug' && <AnalysisDebugger />}
            </div>
        </div>
    );
};