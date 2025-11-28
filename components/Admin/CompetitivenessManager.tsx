import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    getCompetitivenessStatus, toggleCompetitivenessService,
    getDimensions, addDimension, updateDimension, deleteDimension,
    getBrands, addBrand,
    batchUpdateSecondaryDimension, analyzeArticleStage1,
    refreshCompetitivenessCookie,
    getTechItems, getTechItemDetail
} from '../../api/competitiveness';
import { CompetitivenessStatus, TechAnalysisTask, CompetitivenessDimension, TechItem } from '../../types';
import { 
    ServerIcon, CheckCircleIcon, ShieldExclamationIcon, RefreshIcon, 
    PlayIcon, StopIcon, ViewGridIcon, TagIcon, PlusIcon, SparklesIcon,
    FunnelIcon, ChartIcon, ChevronRightIcon, QuestionMarkCircleIcon,
    TrashIcon, PencilIcon, CloseIcon, DatabaseIcon, EyeIcon, ChevronLeftIcon,
    AnnotationIcon, ShieldCheckIcon, ClockIcon
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

// --- Reliability Badge Helper ---
const getReliabilityBadge = (score: number) => {
    switch (score) {
        case 4: return { text: '官方证实', className: 'bg-green-100 text-green-700' };
        case 3: return { text: '高可信度', className: 'bg-blue-100 text-blue-700' };
        case 2: return { text: '疑似传闻', className: 'bg-yellow-100 text-yellow-700' };
        case 1: return { text: '已辟谣', className: 'bg-red-100 text-red-700' };
        default: return { text: '未知', className: 'bg-gray-100 text-gray-600' };
    }
};

// --- Sub-View: Service Monitoring ---
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
        <div className="p-6 max-w-5xl mx-auto space-y-8 animate-in fade-in-0 duration-500">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ChartIcon className="w-6 h-6 text-indigo-600"/> 服务运行监控
                </h3>
                <button onClick={fetchStatus} className="p-2 text-gray-500 hover:text-indigo-600 bg-white border rounded-lg shadow-sm hover:shadow transition-all">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Switch Card */}
                <div className={`p-6 rounded-2xl border flex flex-col items-center justify-center gap-5 transition-all shadow-sm ${status?.enabled ? 'bg-green-50/50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <div className={`p-4 rounded-full shadow-inner ${status?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                        <ServerIcon className="w-8 h-8" />
                    </div>
                    <div className="text-center">
                        <div className="text-sm font-medium text-gray-500 uppercase tracking-wide">服务总开关</div>
                        <div className={`text-2xl font-bold mt-1 ${status?.enabled ? 'text-green-700' : 'text-gray-700'}`}>
                            {status?.enabled ? '运行中 (Running)' : '已停止 (Stopped)'}
                        </div>
                    </div>
                    <button 
                        onClick={() => handleToggle(!status?.enabled)}
                        disabled={isToggling || !status}
                        className={`w-full py-2.5 rounded-xl font-bold text-white shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${status?.enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-600 hover:bg-green-700'}`}
                    >
                        {isToggling ? <WhiteSpinner /> : (status?.enabled ? <StopIcon className="w-5 h-5"/> : <PlayIcon className="w-5 h-5"/>)}
                        {status?.enabled ? '停止服务' : '启动服务'}
                    </button>
                </div>

                {/* Worker Status */}
                <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-blue-200 transition-colors">
                    <div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">后台 Worker</div>
                        <div className="flex items-center gap-3">
                            {status?.worker_enabled ? (
                                <div className="p-1.5 bg-green-100 rounded-full"><CheckCircleIcon className="w-6 h-6 text-green-600" /></div>
                            ) : (
                                <div className="p-1.5 bg-yellow-100 rounded-full"><ShieldExclamationIcon className="w-6 h-6 text-yellow-600" /></div>
                            )}
                            <span className={`text-xl font-bold ${status?.worker_enabled ? 'text-green-700' : 'text-yellow-700'}`}>
                                {status?.worker_enabled ? '正常工作' : '未就绪'}
                            </span>
                        </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        负责异步处理文章提取任务队列。
                    </div>
                </div>

                {/* LLM Provider Status */}
                <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between hover:border-purple-200 transition-colors">
                    <div>
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">LLM 引擎</div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-1.5 bg-purple-100 rounded-full"><SparklesIcon className="w-6 h-6 text-purple-600" /></div>
                            <span className="text-xl font-bold text-gray-800 uppercase">{status?.llm_provider || 'Unknown'}</span>
                        </div>
                        {status?.llm_provider === 'gemini_cookie' && (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${status.cookie_health === 'healthy' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                {getCookieHealthIcon(status.cookie_health)}
                                <span className={`text-sm font-bold ${status.cookie_health === 'healthy' ? 'text-green-700' : 'text-red-700'}`}>
                                    Cookie: {getCookieHealthText(status.cookie_health)}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="text-xs text-gray-500 mt-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                        当前使用的 AI 模型服务提供商。
                    </div>
                </div>
            </div>

            {/* Gemini Cookie Management Section (Conditional) */}
            {status?.llm_provider === 'gemini_cookie' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-5 border-b bg-gray-50/80 flex justify-between items-center">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                            Gemini Cookie 管理 (热更新)
                        </h3>
                    </div>
                    <div className="p-6">
                        <p className="text-sm text-gray-500 mb-6 bg-blue-50 text-blue-700 p-3 rounded-lg border border-blue-100">
                            当 LLM 服务出现 429 或 401 错误时，可在此处更新 Cookie。更新后无需重启服务即可生效。
                        </p>
                        
                        <form onSubmit={handleCookieRefresh} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">__Secure-1PSID</label>
                                    <input 
                                        type="password" 
                                        value={cookieForm.secure_1psid}
                                        onChange={e => setCookieForm({...cookieForm, secure_1psid: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="输入新的 __Secure-1PSID 值"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-1.5">__Secure-1PSIDTS</label>
                                    <input 
                                        type="password" 
                                        value={cookieForm.secure_1psidts}
                                        onChange={e => setCookieForm({...cookieForm, secure_1psidts: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        placeholder="输入新的 __Secure-1PSIDTS 值"
                                    />
                                </div>
                            </div>
                            
                            {refreshMessage && (
                                <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${refreshMessage.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                    {refreshMessage.type === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <ShieldExclamationIcon className="w-5 h-5"/>}
                                    {refreshMessage.text}
                                </div>
                            )}

                            <div className="pt-2 flex justify-end">
                                <button 
                                    type="submit" 
                                    disabled={isRefreshingCookie}
                                    className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center gap-2"
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

// --- Sub-View: Metadata Management (Dimensions & Brands) ---
const MetadataManager: React.FC = () => {
    const [dimensions, setDimensions] = useState<CompetitivenessDimension[]>([]);
    const [brands, setBrands] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Modal states
    const [isAddDimensionModalOpen, setIsAddDimensionModalOpen] = useState(false);
    const [editingDimension, setEditingDimension] = useState<CompetitivenessDimension | null>(null);
    const [deletingDimension, setDeletingDimension] = useState<CompetitivenessDimension | null>(null);
    const [newBrand, setNewBrand] = useState('');

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
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
            <div className="flex gap-4 items-center">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <ViewGridIcon className="w-6 h-6 text-indigo-600" /> 元数据管理
                </h3>
                <button onClick={loadData} className="p-2 hover:bg-gray-200 rounded-full text-gray-500"><RefreshIcon className={`w-5 h-5 ${loading?'animate-spin':''}`}/></button>
            </div>

            <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
                {/* Dimensions Column */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50/80 flex justify-between items-center backdrop-blur-sm">
                        <h4 className="font-bold text-gray-700">技术维度 ({dimensions.length})</h4>
                        <button 
                            onClick={() => setIsAddDimensionModalOpen(true)}
                            className="text-xs font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1"
                        >
                            <PlusIcon className="w-3 h-3" /> 新建维度
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        {loading ? <div className="text-center py-10 text-gray-400">加载中...</div> : (
                            <div className="space-y-3">
                                {dimensions.map(d => (
                                    <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <h5 className="font-bold text-gray-800 text-lg">{d.name}</h5>
                                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingDimension(d)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><PencilIcon className="w-4 h-4"/></button>
                                                <button onClick={() => setDeletingDimension(d)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><TrashIcon className="w-4 h-4"/></button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {d.sub_dimensions?.length > 0 ? (
                                                d.sub_dimensions.map(sub => (
                                                    <span key={sub} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium border border-gray-200">
                                                        {sub}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">暂无二级维度</span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Brands Column */}
                <div className="w-full md:w-1/3 flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-gray-50/80 flex justify-between items-center backdrop-blur-sm">
                        <h4 className="font-bold text-gray-700">车企品牌 ({brands.length})</h4>
                    </div>
                    <div className="p-4 border-b bg-white">
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                value={newBrand} 
                                onChange={e => setNewBrand(e.target.value)} 
                                placeholder="添加新品牌..."
                                className="flex-1 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button onClick={handleAddBrand} disabled={!newBrand.trim()} className="px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="flex flex-wrap gap-2">
                            {brands.map(b => (
                                <span key={b} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium shadow-sm hover:border-blue-300 hover:text-blue-600 transition-colors cursor-default select-none">
                                    {b}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {(editingDimension || isAddDimensionModalOpen) && (
                <DimensionEditorModal 
                    dimension={editingDimension} 
                    onClose={() => { setEditingDimension(null); setIsAddDimensionModalOpen(false); }} 
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

// --- Dimension Editor Modal (Create/Edit) ---
const DimensionEditorModal: React.FC<{
    dimension: CompetitivenessDimension | null;
    onClose: () => void;
    onSuccess: () => void;
}> = ({ dimension, onClose, onSuccess }) => {
    const isEditing = !!dimension;
    const [name, setName] = useState(dimension?.name || '');
    const [subDimensions, setSubDimensions] = useState<string[]>(dimension?.sub_dimensions || []);
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
        if (!name.trim()) return;
        setIsLoading(true);
        try {
            if (isEditing) {
                await updateDimension(name, subDimensions);
            } else {
                await addDimension(name, subDimensions);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            alert('保存失败: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in-0">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800">{isEditing ? `编辑维度: ${dimension.name}` : '创建新维度'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">维度名称 (一级)</label>
                        <input 
                            type="text" 
                            value={name}
                            onChange={e => setName(e.target.value)}
                            disabled={isEditing} // Cannot rename ID field in update
                            className={`w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none ${isEditing ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'bg-white'}`}
                            placeholder="例如：智能驾驶"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">二级子维度</label>
                        <div className="flex gap-2 mb-3">
                            <input 
                                type="text" 
                                value={newSub}
                                onChange={e => setNewSub(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddSub()}
                                className="flex-1 border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="输入子维度名称后按回车"
                            />
                            <button onClick={handleAddSub} disabled={!newSub.trim()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-gray-600 transition-colors font-medium">
                                添加
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-1">
                            {subDimensions.map(sub => (
                                <span key={sub} className="inline-flex items-center px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm border border-indigo-100 font-medium animate-in fade-in zoom-in">
                                    {sub}
                                    <button onClick={() => handleRemoveSub(sub)} className="ml-2 text-indigo-400 hover:text-indigo-900 rounded-full hover:bg-indigo-100 p-0.5">
                                        <CloseIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                            {subDimensions.length === 0 && <span className="text-sm text-gray-400 italic py-2">暂无子维度，请添加</span>}
                        </div>
                    </div>
                </div>
                <div className="p-5 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 font-bold text-sm shadow-sm transition-colors">取消</button>
                    <button onClick={handleSave} disabled={isLoading || !name.trim()} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-bold text-sm disabled:opacity-50 shadow-md hover:shadow-lg transition-all flex items-center gap-2">
                        {isLoading ? <WhiteSpinner /> : '保存更改'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Intelligence Database (Stage 2) ---
const IntelligenceDatabase: React.FC = () => {
    const [items, setItems] = useState<TechItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [filters, setFilters] = useState({ brand: '', dimension: '' });
    const [page, setPage] = useState(1); // API pagination support check
    const [selectedItem, setSelectedItem] = useState<TechItem | null>(null);
    
    // Metadata for filters
    const [brands, setBrands] = useState<string[]>([]);
    const [dimensions, setDimensions] = useState<string[]>([]);

    useEffect(() => {
        // Load metadata for filters
        getBrands().then(setBrands);
        getDimensions().then(ds => setDimensions(ds.map(d => d.name)));
    }, []);

    const fetchItems = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getTechItems({
                vehicle_brand: filters.brand || undefined,
                tech_dimension: filters.dimension || undefined,
                skip: (page - 1) * 20,
                limit: 20
            });
            setItems(res);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [filters, page]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleDetailClick = async (itemId: string) => {
        // Fetch full detail with history
        try {
            const detail = await getTechItemDetail(itemId);
            setSelectedItem(detail);
        } catch (e) {
            alert('获取详情失败');
        }
    };

    return (
        <div className="p-6 h-full flex flex-col gap-6 overflow-hidden">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <DatabaseIcon className="w-6 h-6 text-indigo-600" /> 技术情报主表 (Golden Records)
                </h3>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <select 
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm min-w-[140px]"
                        value={filters.brand}
                        onChange={e => { setFilters({...filters, brand: e.target.value}); setPage(1); }}
                    >
                        <option value="">所有品牌</option>
                        {brands.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select 
                        className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm min-w-[140px]"
                        value={filters.dimension}
                        onChange={e => { setFilters({...filters, dimension: e.target.value}); setPage(1); }}
                    >
                        <option value="">所有维度</option>
                        {dimensions.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <button onClick={fetchItems} className="p-2 text-gray-500 hover:text-indigo-600 bg-white border rounded-lg shadow-sm hover:shadow transition-all">
                        <RefreshIcon className={`w-5 h-5 ${isLoading?'animate-spin':''}`}/>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-500 uppercase bg-gray-50/80 sticky top-0 backdrop-blur-sm z-10">
                            <tr>
                                <th className="px-6 py-4">品牌 / 车型</th>
                                <th className="px-6 py-4">技术维度</th>
                                <th className="px-6 py-4">技术名称</th>
                                <th className="px-6 py-4 w-1/3">最新描述</th>
                                <th className="px-6 py-4">可信度</th>
                                <th className="px-6 py-4">更新时间</th>
                                <th className="px-6 py-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {isLoading ? (
                                <tr><td colSpan={7} className="py-20 text-center"><Spinner /></td></tr>
                            ) : items.length === 0 ? (
                                <tr><td colSpan={7} className="py-20 text-center text-gray-400 italic">暂无数据</td></tr>
                            ) : (
                                items.map(item => {
                                    const rel = getReliabilityBadge(item.reliability);
                                    return (
                                        <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-gray-800">{item.vehicle_brand}</div>
                                                <div className="text-xs text-gray-500">{item.vehicle_model}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-700">{item.tech_dimension}</div>
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                    <ChevronRightIcon className="w-3 h-3"/> {item.secondary_tech_dimension}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-indigo-900">{item.name}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-gray-600 line-clamp-2 text-xs leading-relaxed" title={item.description}>
                                                    {item.description}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded text-xs font-bold ${rel.className}`}>
                                                    {rel.text} ({item.reliability})
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-xs text-gray-500 font-mono">
                                                {new Date(item.updated_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => handleDetailClick(item.id)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                                                    title="查看详情与历史"
                                                >
                                                    <EyeIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Simple Pagination */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500">每页 20 条</span>
                    <div className="flex gap-2">
                        <button disabled={page<=1} onClick={() => setPage(p=>p-1)} className="p-1.5 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 shadow-sm"><ChevronLeftIcon className="w-4 h-4"/></button>
                        <span className="px-3 py-1.5 bg-white border rounded-lg text-sm font-medium shadow-sm">{page}</span>
                        <button disabled={items.length < 20} onClick={() => setPage(p=>p+1)} className="p-1.5 bg-white border rounded-lg hover:bg-gray-50 disabled:opacity-50 shadow-sm"><ChevronRightIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            </div>

            {/* Detail Modal */}
            {selectedItem && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-in fade-in-0">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h3 className="text-xl font-extrabold text-gray-900">{selectedItem.name}</h3>
                                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                                    <span className="px-2 py-0.5 bg-white border rounded text-xs font-bold">{selectedItem.vehicle_brand} {selectedItem.vehicle_model}</span>
                                    <span>•</span>
                                    <span>{selectedItem.tech_dimension} / {selectedItem.secondary_tech_dimension}</span>
                                </div>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors"><CloseIcon className="w-6 h-6"/></button>
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                            {/* Current State */}
                            <div className="mb-8 bg-white p-6 rounded-2xl border border-indigo-100 shadow-sm">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <SparklesIcon className="w-4 h-4 text-indigo-500" /> 最新情报状态
                                </h4>
                                <div className="flex items-start gap-4">
                                    <div className="flex-1">
                                        <p className="text-gray-800 leading-relaxed text-lg">{selectedItem.description}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 min-w-[100px]">
                                        <span className={`px-3 py-1 rounded-lg text-sm font-bold border ${getReliabilityBadge(selectedItem.reliability).className.replace('bg-', 'border-').replace('text-', 'text-')}`}>
                                            {getReliabilityBadge(selectedItem.reliability).text}
                                        </span>
                                        <span className="text-xs text-gray-400 font-mono">{new Date(selectedItem.updated_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            {/* History Timeline */}
                            <div className="relative">
                                <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-6 flex items-center gap-2">
                                    <ClockIcon className="w-4 h-4 text-gray-400" /> 演进历史
                                </h4>
                                <div className="absolute top-10 bottom-0 left-[19px] w-0.5 bg-gray-200"></div>
                                <div className="space-y-8 relative">
                                    {selectedItem.history?.sort((a, b) => new Date(b.event_time).getTime() - new Date(a.event_time).getTime()).map((hist) => (
                                        <div key={hist.id} className="flex gap-6 group">
                                            <div className="relative z-10 w-10 h-10 flex-shrink-0 bg-white border-2 border-gray-200 rounded-full flex items-center justify-center group-hover:border-indigo-400 group-hover:scale-110 transition-all shadow-sm">
                                                {hist.change_type === 'Create' ? <PlusIcon className="w-5 h-5 text-green-500"/> :
                                                 hist.change_type === 'Update' ? <PencilIcon className="w-4 h-4 text-blue-500"/> :
                                                 <AnnotationIcon className="w-4 h-4 text-gray-500"/>}
                                            </div>
                                            <div className="flex-1 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm group-hover:shadow-md transition-all">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="text-xs font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{hist.change_type}</span>
                                                    <span className="text-xs text-gray-400 font-mono">{new Date(hist.event_time).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 mb-3">{hist.description_snapshot}</p>
                                                <div className="flex items-center gap-2 text-xs border-t border-gray-50 pt-2">
                                                    <span className="text-gray-400">当时可信度:</span>
                                                    <span className={`font-bold ${getReliabilityBadge(hist.reliability_snapshot).className.split(' ')[1]}`}>
                                                        {getReliabilityBadge(hist.reliability_snapshot).text}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Layout ---
export const CompetitivenessManager: React.FC = () => {
    const [tab, setTab] = useState<'status' | 'meta' | 'data'>('status');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header Tabs */}
            <div className="bg-white border-b px-6 pt-6 pb-0 flex-shrink-0 shadow-sm z-20">
                <h1 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tight">竞争力中台管理</h1>
                <div className="flex gap-8 overflow-x-auto">
                    {[
                        { id: 'status', label: '服务监控', icon: ChartIcon },
                        { id: 'meta', label: '元数据管理', icon: ViewGridIcon },
                        { id: 'data', label: '技术情报库', icon: DatabaseIcon },
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setTab(item.id as any)}
                            className={`pb-4 px-2 border-b-2 text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
                                tab === item.id 
                                    ? 'border-indigo-600 text-indigo-600' 
                                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-200'
                            }`}
                        >
                            <item.icon className={`w-5 h-5 ${tab === item.id ? 'text-indigo-600' : 'text-gray-400'}`} />
                            {item.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative">
                {tab === 'status' && <StatusControlPanel />}
                {tab === 'meta' && <MetadataManager />}
                {tab === 'data' && <IntelligenceDatabase />}
            </div>
        </div>
    );
};