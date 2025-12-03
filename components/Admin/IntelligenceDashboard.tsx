
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    getSourcesAndPoints, toggleSource, toggleIntelligencePoint, 
    runCrawler, runGenericPoint, 
    getGenericTasks, getPendingArticles, confirmPendingArticles, deletePendingArticles, getPendingArticleDetail,
    createGenericPoint, updateGenericPoint, getGenericPoints,
    deleteSource, deleteGenericSource, deleteIntelligencePoints, deleteGenericPoint
} from '../../api';
import { SourceWithPoints, CrawlerPoint, GenericTask, PendingArticle, GenericPoint } from '../../types';
import { 
    ServerIcon, RefreshIcon, PlayIcon, 
    GlobeIcon, ClockIcon, ExternalLinkIcon,
    ChevronRightIcon, ChevronDownIcon,
    StopIcon, LightningBoltIcon, ViewListIcon,
    CheckCircleIcon, TrashIcon, CheckIcon, PlusIcon, CloseIcon,
    SearchIcon, EyeIcon, DocumentTextIcon, GearIcon, PencilIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const getTypeBadge = (type: string) => {
    switch (type) {
        case 'manual': return { text: '手动配置', bg: 'bg-blue-100 text-blue-700 border-blue-200' };
        case 'generic': return { text: '通用爬虫', bg: 'bg-purple-100 text-purple-700 border-purple-200' };
        case 'mixed': return { text: '混合模式', bg: 'bg-orange-100 text-orange-700 border-orange-200' };
        default: return { text: type, bg: 'bg-gray-100 text-gray-700 border-gray-200' };
    }
};

const formatCron = (cron: string) => {
    if (!cron) return '-';
    // Basic heuristics for common patterns
    if (cron.match(/^0 \*\/(\d+) \* \* \*$/)) return `每${RegExp.$1}小时`;
    if (cron.includes('*/30 * * * *')) return '每30分钟';
    if (cron.match(/^(\d+) (\d+) \* \* \*$/)) return `每天 ${String(RegExp.$2).padStart(2,'0')}:${String(RegExp.$1).padStart(2,'0')}`;
    if (cron.includes('0 0 * * 0')) return '每周';
    return cron;
};

const formatBJTime = (dateStr: string) => {
    if (!dateStr) return '-';
    // Specify Beijing timezone explicitly
    return new Date(dateStr).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
};

// --- Generic Point Modal (Create / Edit) ---
const GenericPointModal: React.FC<{ 
    onClose: () => void; 
    onSuccess: () => void;
    pointToEdit?: CrawlerPoint | null;
}> = ({ onClose, onSuccess, pointToEdit }) => {
    const isEditing = !!pointToEdit;
    
    // Form State
    const [formData, setFormData] = useState({
        source_name: '通用子爬虫',
        point_name: '',
        point_url: '',
        cron_schedule: '0 */6 * * *',
        list_hint: '',
        list_filters: [] as string[]
    });

    // Cron Builder State
    const [cronType, setCronType] = useState<'interval' | 'daily' | 'custom'>('interval');
    const [cronValues, setCronValues] = useState({ interval: '6', time: '08:00', raw: '0 */6 * * *' });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [newFilter, setNewFilter] = useState('');

    // Initialize form data
    useEffect(() => {
        const init = async () => {
            if (pointToEdit) {
                // 1. Set basic info available from the list view immediately
                // Note: We access properties that might exist on CrawlerPoint or we default them
                const baseData = {
                    source_name: pointToEdit.source_name || '',
                    point_name: pointToEdit.point_name || '',
                    point_url: pointToEdit.point_url || '',
                    cron_schedule: pointToEdit.cron_schedule || '0 */6 * * *',
                    list_hint: '', 
                    list_filters: [] as string[]
                };
                
                // Initialize Cron UI based on existing schedule
                const currentCron = baseData.cron_schedule;
                if (currentCron.match(/^0 \*\/(\d+) \* \* \*$/)) {
                    setCronType('interval');
                    setCronValues(prev => ({ ...prev, interval: RegExp.$1, raw: currentCron }));
                } else if (currentCron.match(/^(\d+) (\d+) \* \* \*$/)) {
                    setCronType('daily');
                    const m = RegExp.$1.padStart(2, '0');
                    const h = RegExp.$2.padStart(2, '0');
                    setCronValues(prev => ({ ...prev, time: `${h}:${m}`, raw: currentCron }));
                } else {
                    setCronType('custom');
                    setCronValues(prev => ({ ...prev, raw: currentCron }));
                }

                // Apply initial base data
                setFormData(prev => ({ ...prev, ...baseData }));

                // 2. Fetch full details for generic fields (list_hint, list_filters)
                // We need the source_name to fetch the list of generic points
                if (pointToEdit.type === 'generic' && pointToEdit.source_name) {
                    try {
                        setIsLoading(true);
                        // Fetch detailed configuration for this point
                        const genericPoints = await getGenericPoints(pointToEdit.source_name);
                        const fullPoint = genericPoints.find(p => p.id === pointToEdit.id);
                        
                        if (fullPoint) {
                            setFormData(prev => ({
                                ...prev,
                                list_hint: fullPoint.list_hint || '',
                                list_filters: fullPoint.list_filters || [],
                                // Also update cron/url in case they changed in backend but list view was stale
                                cron_schedule: fullPoint.cron_schedule || prev.cron_schedule,
                                point_url: fullPoint.point_url || prev.point_url
                            }));
                        }
                    } catch (e) {
                        console.error("Failed to load generic point details", e);
                        setError("加载详细配置失败，请检查网络或重试");
                    } finally {
                        setIsLoading(false);
                    }
                }
            } else {
                // Reset for Create mode
                setFormData({
                    source_name: '通用子爬虫',
                    point_name: '',
                    point_url: '',
                    cron_schedule: '0 */6 * * *',
                    list_hint: '',
                    list_filters: []
                });
                setCronType('interval');
                setCronValues({ interval: '6', time: '08:00', raw: '0 */6 * * *' });
            }
        };
        init();
    }, [pointToEdit]);

    const getFinalCron = () => {
        if (cronType === 'interval') return `0 */${cronValues.interval} * * *`;
        if (cronType === 'daily') {
            const [hh, mm] = cronValues.time.split(':');
            return `${Number(mm)} ${Number(hh)} * * *`;
        }
        return cronValues.raw;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddFilter = (e?: React.MouseEvent) => {
        e?.preventDefault();
        const trimmed = newFilter.trim();
        if (trimmed && !formData.list_filters.includes(trimmed)) {
            setFormData(prev => ({ ...prev, list_filters: [...prev.list_filters, trimmed] }));
            setNewFilter('');
        }
    };

    const handleRemoveFilter = (filter: string) => {
        setFormData(prev => ({ ...prev, list_filters: prev.list_filters.filter(f => f !== filter) }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.source_name || !formData.point_name || !formData.point_url) return;
        
        setIsLoading(true);
        setError('');
        const finalCron = getFinalCron();

        try {
            if (isEditing && pointToEdit) {
                await updateGenericPoint(pointToEdit.id, {
                    ...formData,
                    cron_schedule: finalCron,
                    is_active: pointToEdit.is_active // Preserve status
                });
                alert('通用情报点更新成功');
            } else {
                await createGenericPoint({
                    ...formData,
                    cron_schedule: finalCron
                });
                alert('通用情报点创建成功');
            }
            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.message || (isEditing ? '更新失败' : '创建失败'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-800">{isEditing ? '编辑通用情报点' : '新建通用情报点'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">来源名称</label>
                        <input name="source_name" value={formData.source_name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" placeholder="例如: 行业通用源" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">采集点名称</label>
                        <input name="point_name" value={formData.point_name} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="例如: 某某新闻列表" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">目标 URL</label>
                        <input name="point_url" value={formData.point_url} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="https://..." />
                    </div>
                    
                    {/* Cron Builder */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <label className="block text-xs font-bold text-slate-500 mb-2">采集频率设置</label>
                        <div className="flex gap-2 mb-2">
                            <button type="button" onClick={() => setCronType('interval')} className={`flex-1 py-1.5 text-xs rounded border ${cronType === 'interval' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>按间隔</button>
                            <button type="button" onClick={() => setCronType('daily')} className={`flex-1 py-1.5 text-xs rounded border ${cronType === 'daily' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>每天定时</button>
                            <button type="button" onClick={() => setCronType('custom')} className={`flex-1 py-1.5 text-xs rounded border ${cronType === 'custom' ? 'bg-indigo-50 border-indigo-200 text-indigo-700 font-bold' : 'bg-white border-slate-200 text-slate-600'}`}>自定义</button>
                        </div>

                        {cronType === 'interval' && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">每</span>
                                <input type="number" min="1" max="23" value={cronValues.interval} onChange={(e) => setCronValues({...cronValues, interval: e.target.value})} className="w-16 border rounded px-2 py-1 text-center text-sm" />
                                <span className="text-sm text-slate-600">小时执行一次</span>
                            </div>
                        )}
                        {cronType === 'daily' && (
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600">每天</span>
                                <input type="time" value={cronValues.time} onChange={(e) => setCronValues({...cronValues, time: e.target.value})} className="border rounded px-2 py-1 text-sm" />
                                <span className="text-sm text-slate-600">执行</span>
                            </div>
                        )}
                        {cronType === 'custom' && (
                            <div>
                                <input type="text" value={cronValues.raw} onChange={(e) => setCronValues({...cronValues, raw: e.target.value})} className="w-full border rounded px-3 py-1.5 text-sm font-mono" placeholder="Cron Expression" />
                                <p className="text-[10px] text-slate-400 mt-1">分 时 日 月 周 (e.g. 0 12 * * *)</p>
                            </div>
                        )}
                        <div className="mt-2 text-[10px] text-indigo-500 font-mono">
                            预览: {getFinalCron()}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">URL 过滤器 (可选)</label>
                        <div className="flex gap-2 mb-2">
                            <input 
                                value={newFilter} 
                                onChange={e => setNewFilter(e.target.value)} 
                                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddFilter())}
                                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                                placeholder="输入关键词 (如 /2024/)" 
                            />
                            <button type="button" onClick={handleAddFilter} className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold text-gray-600">添加</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.list_filters.map(f => (
                                <span key={f} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-700 text-xs rounded border border-indigo-100">
                                    {f}
                                    <button type="button" onClick={() => handleRemoveFilter(f)} className="hover:text-red-500"><CloseIcon className="w-3 h-3"/></button>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">列表选择器 (可选)</label>
                        <input name="list_hint" value={formData.list_hint} onChange={handleChange} className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="CSS selector for list items" />
                    </div>

                    {error && <p className="text-red-500 text-xs">{error}</p>}

                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 font-medium hover:bg-gray-200 transition-colors">取消</button>
                        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                            {isLoading ? '提交中...' : (isEditing ? '保存修改' : '创建')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Submodule: Overview ---
const IntelligenceOverview: React.FC = () => {
    const [data, setData] = useState<SourceWithPoints[]>([]);
    const [filteredData, setFilteredData] = useState<SourceWithPoints[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
    const [processingAction, setProcessingAction] = useState<string | null>(null);
    
    // Generic Modal State
    const [isGenericModalOpen, setIsGenericModalOpen] = useState(false);
    const [pointToEdit, setPointToEdit] = useState<CrawlerPoint | null>(null);

    const [deleteTarget, setDeleteTarget] = useState<{ type: 'source' | 'point', data: any } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const [filterSource, setFilterSource] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [filterStatus, setFilterStatus] = useState('all');

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getSourcesAndPoints();
            setData(res);
            setExpandedSources(new Set(res.map(s => s.source_name)));
        } catch (e) {
            console.error("Failed to load overview", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        let result = data;
        if (filterSource.trim()) {
            const lower = filterSource.toLowerCase();
            result = result.filter(s => s.source_name.toLowerCase().includes(lower));
        }
        if (filterType !== 'all') {
            result = result.filter(s => s.source_type === filterType);
        }
        if (filterStatus !== 'all') {
            const isActive = filterStatus === 'active';
            result = result.filter(s => s.points.some(p => p.is_active === isActive));
        }
        setFilteredData(result);
    }, [data, filterSource, filterType, filterStatus]);

    const toggleExpand = (sourceName: string) => {
        setExpandedSources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sourceName)) newSet.delete(sourceName);
            else newSet.add(sourceName);
            return newSet;
        });
    };

    const handleRunSource = async (e: React.MouseEvent, sourceName: string) => {
        e.stopPropagation();
        const actionKey = `run_source_${sourceName}`;
        if (processingAction) return;
        setProcessingAction(actionKey);
        try {
            await runCrawler(sourceName);
            alert(`已触发 "${sourceName}" 的立即采集任务。`);
        } catch (e: any) {
            alert(`启动失败: ${e.message}`);
        } finally {
            setProcessingAction(null);
        }
    };

    const handleToggleSource = async (e: React.MouseEvent, sourceName: string, enable: boolean) => {
        e.stopPropagation();
        const actionKey = `toggle_source_${sourceName}`;
        if (processingAction) return;
        setProcessingAction(actionKey);
        try {
            await toggleSource(sourceName, enable);
            setData(prev => prev.map(s => {
                if (s.source_name === sourceName) {
                    return { ...s, points: s.points.map(p => ({ ...p, is_active: enable })) };
                }
                return s;
            }));
        } catch (e: any) {
            alert(`操作失败: ${e.message}`);
        } finally {
            setProcessingAction(null);
        }
    };

    const handleTogglePoint = async (point: CrawlerPoint) => {
        const actionKey = `toggle_point_${point.id}`;
        if (processingAction) return;
        setProcessingAction(actionKey);
        try {
            await toggleIntelligencePoint(point.id, !point.is_active);
            setData(prev => prev.map(s => {
                if (s.source_name === point.source_name) {
                    return {
                        ...s,
                        points: s.points.map(p => p.id === point.id ? { ...p, is_active: !p.is_active } : p)
                    };
                }
                return s;
            }));
        } catch (e: any) {
            alert(`操作失败: ${e.message}`);
        } finally {
            setProcessingAction(null);
        }
    };

    const handleRunPoint = async (point: CrawlerPoint) => {
        const actionKey = `run_point_${point.id}`;
        if (processingAction || point.type !== 'generic') return;
        setProcessingAction(actionKey);
        try {
            await runGenericPoint(point.id);
            alert(`已触发 "${point.point_name}" 的立即采集任务。`);
        } catch (e: any) {
            alert(`启动失败: ${e.message}`);
        } finally {
            setProcessingAction(null);
        }
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            if (deleteTarget.type === 'source') {
                const source = deleteTarget.data as SourceWithPoints;
                if (source.source_type === 'generic') {
                    await deleteGenericSource(source.source_name);
                } else {
                    await deleteSource(source.source_name);
                }
            } else {
                const point = deleteTarget.data as CrawlerPoint;
                if (point.type === 'generic') {
                    await deleteGenericPoint(point.id);
                } else {
                    await deleteIntelligencePoints([point.id]);
                }
            }
            await fetchData();
            setDeleteTarget(null);
        } catch (e: any) {
            alert(`删除失败: ${e.message}`);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleOpenCreateGeneric = () => {
        setPointToEdit(null);
        setIsGenericModalOpen(true);
    };

    const handleEditGenericPoint = (point: CrawlerPoint) => {
        setPointToEdit(point);
        setIsGenericModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header / Filter Bar */}
            <div className="px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-10 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-center">
                    <div className="relative w-full md:w-auto">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="搜索情报源..." 
                            value={filterSource}
                            onChange={(e) => setFilterSource(e.target.value)}
                            className="pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full md:w-48"
                        />
                    </div>
                    
                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full md:w-auto"
                    >
                        <option value="all">所有类型</option>
                        <option value="manual">手动配置</option>
                        <option value="generic">通用爬虫</option>
                        <option value="mixed">混合模式</option>
                    </select>

                    <select 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-full md:w-auto"
                    >
                        <option value="all">所有状态</option>
                        <option value="active">运行中</option>
                        <option value="inactive">已暂停</option>
                    </select>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleOpenCreateGeneric}
                        className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all hover:-translate-y-0.5"
                    >
                        <PlusIcon className="w-4 h-4" />
                        <span>新建通用点</span>
                    </button>
                    <button 
                        onClick={fetchData} 
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm group text-slate-500"
                        title="刷新数据"
                    >
                        <RefreshIcon className={`w-4 h-4 group-hover:rotate-180 transition-transform duration-500 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Table Content */}
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                {isLoading && data.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                        <p className="text-slate-400">正在加载概览数据...</p>
                    </div>
                ) : filteredData.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                        <ServerIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>未找到匹配的情报源配置</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3 w-1/3">情报源</th>
                                    <th className="px-6 py-3 w-32">类型</th>
                                    <th className="px-6 py-3 w-32 text-center">采集点数</th>
                                    <th className="px-6 py-3 w-32 text-center">状态</th>
                                    <th className="px-6 py-3 text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredData.map(source => {
                                    const isExpanded = expandedSources.has(source.source_name);
                                    const activePointsCount = source.points.filter(p => p.is_active).length;
                                    const typeInfo = getTypeBadge(source.source_type);
                                    const sourceRunning = activePointsCount > 0;

                                    return (
                                        <React.Fragment key={source.source_name}>
                                            <tr className="hover:bg-slate-50/50 transition-colors group cursor-pointer" onClick={() => toggleExpand(source.source_name)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <ChevronRightIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        <span className="font-bold text-slate-800 text-base">{source.source_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs px-2 py-0.5 rounded border font-medium ${typeInfo.bg}`}>{typeInfo.text}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-mono text-slate-600 font-bold">{source.points.length}</span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${sourceRunning ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                                        {sourceRunning ? `${activePointsCount} 运行` : '全部暂停'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button 
                                                            onClick={(e) => handleRunSource(e, source.source_name)}
                                                            disabled={processingAction === `run_source_${source.source_name}`}
                                                            className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded transition-colors flex items-center gap-1"
                                                        >
                                                            {processingAction === `run_source_${source.source_name}` ? <Spinner /> : <PlayIcon className="w-3.5 h-3.5" />} 运行
                                                        </button>
                                                        <div className="h-4 w-px bg-slate-200"></div>
                                                        <button 
                                                            onClick={(e) => handleToggleSource(e, source.source_name, true)}
                                                            className="text-xs font-medium text-green-600 hover:bg-green-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            全开
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleToggleSource(e, source.source_name, false)}
                                                            className="text-xs font-medium text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                                                        >
                                                            全关
                                                        </button>
                                                        <div className="h-4 w-px bg-slate-200"></div>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setDeleteTarget({ type: 'source', data: source }); }}
                                                            className="text-xs font-medium text-slate-400 hover:text-red-600 p-1 rounded hover:bg-slate-100 transition-colors"
                                                            title="删除来源"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={5} className="px-0 py-0 border-none bg-slate-50/30">
                                                        <div className="border-t border-b border-slate-100/50 shadow-inner">
                                                            <table className="w-full text-xs text-left">
                                                                <thead>
                                                                    <tr className="text-slate-400 uppercase tracking-wide border-b border-slate-100">
                                                                        <th className="px-12 py-2 font-medium w-1/4">采集点名称</th>
                                                                        <th className="px-6 py-2 font-medium w-1/3">URL</th>
                                                                        <th className="px-6 py-2 font-medium">频率</th>
                                                                        <th className="px-6 py-2 font-medium text-center">状态</th>
                                                                        <th className="px-6 py-2 font-medium text-right">操作</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-100">
                                                                    {source.points.map(point => {
                                                                        // IMPORTANT: Augment point with parent source_name for handlers
                                                                        const pointWithSource = { ...point, source_name: source.source_name };
                                                                        return (
                                                                        <tr key={point.id} className="hover:bg-slate-100/50 transition-colors">
                                                                            <td className="px-12 py-3">
                                                                                <div className="flex items-center gap-2">
                                                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-300"></div>
                                                                                    <span className="font-medium text-slate-700">{point.point_name}</span>
                                                                                    {point.type === 'generic' && <span className="text-[10px] bg-purple-50 text-purple-600 px-1 rounded border border-purple-100">G</span>}
                                                                                </div>
                                                                            </td>
                                                                            <td className="px-6 py-3">
                                                                                <a 
                                                                                    href={point.point_url} 
                                                                                    target="_blank" 
                                                                                    rel="noreferrer" 
                                                                                    className="text-slate-500 hover:text-blue-600 flex items-center gap-1 max-w-[250px] truncate"
                                                                                    title={point.point_url}
                                                                                >
                                                                                    <span className="truncate">{point.point_url}</span>
                                                                                    <ExternalLinkIcon className="w-3 h-3 flex-shrink-0 opacity-50" />
                                                                                </a>
                                                                            </td>
                                                                            <td className="px-6 py-3 font-medium text-slate-600">
                                                                                {formatCron(point.cron_schedule)}
                                                                            </td>
                                                                            <td className="px-6 py-3 text-center">
                                                                                <span className={`inline-block w-2 h-2 rounded-full ${point.is_active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                                            </td>
                                                                            <td className="px-6 py-3 text-right">
                                                                                <div className="flex justify-end gap-2">
                                                                                    {point.type === 'generic' && (
                                                                                        <>
                                                                                            <button 
                                                                                                onClick={() => handleRunPoint(pointWithSource)}
                                                                                                disabled={processingAction === `run_point_${point.id}`}
                                                                                                className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                                                                                title="立即采集"
                                                                                            >
                                                                                                {processingAction === `run_point_${point.id}` ? <Spinner /> : <LightningBoltIcon className="w-3.5 h-3.5"/>}
                                                                                            </button>
                                                                                            <button 
                                                                                                onClick={() => handleEditGenericPoint(pointWithSource)}
                                                                                                className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                                                                                title="编辑"
                                                                                            >
                                                                                                <PencilIcon className="w-3.5 h-3.5" />
                                                                                            </button>
                                                                                        </>
                                                                                    )}
                                                                                    <button 
                                                                                        onClick={() => handleTogglePoint(pointWithSource)}
                                                                                        disabled={processingAction === `toggle_point_${point.id}`}
                                                                                        className={`p-1 rounded transition-colors ${
                                                                                            point.is_active 
                                                                                                ? 'text-red-500 hover:bg-red-50' 
                                                                                                : 'text-green-600 hover:bg-green-50'
                                                                                        }`}
                                                                                        title={point.is_active ? "暂停" : "启用"}
                                                                                    >
                                                                                        {processingAction === `toggle_point_${point.id}` ? <Spinner /> : point.is_active ? <StopIcon className="w-3.5 h-3.5"/> : <PlayIcon className="w-3.5 h-3.5"/>}
                                                                                    </button>
                                                                                    <button 
                                                                                        onClick={() => setDeleteTarget({ type: 'point', data: pointWithSource })}
                                                                                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                                                        title="删除"
                                                                                    >
                                                                                        <TrashIcon className="w-3.5 h-3.5" />
                                                                                    </button>
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );})}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {deleteTarget && (
                <ConfirmationModal
                    title={`确认删除${deleteTarget.type === 'source' ? '情报源' : '采集点'}`}
                    message={`确定要删除 ${deleteTarget.type === 'source' ? `"${(deleteTarget.data as SourceWithPoints).source_name}" 及其下所有采集点` : `"${(deleteTarget.data as CrawlerPoint).point_name}"`} 吗？此操作不可恢复。`}
                    onConfirm={confirmDelete}
                    onCancel={() => setDeleteTarget(null)}
                    confirmText="永久删除"
                    variant="destructive"
                    isLoading={isDeleting}
                />
            )}

            {isGenericModalOpen && (
                <GenericPointModal 
                    onClose={() => setIsGenericModalOpen(false)} 
                    onSuccess={() => { fetchData(); }} 
                    pointToEdit={pointToEdit}
                />
            )}
        </div>
    );
};

// --- Generic Crawler Tasks Wrapper (Already implemented) ---
const GenericTaskList: React.FC = () => {
    const [tasks, setTasks] = useState<GenericTask[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getGenericTasks({ page, limit: 15 });
            setTasks(res.items);
            setTotal(res.total);
        } catch (e) {
            console.error("Failed to load generic tasks", e);
        } finally {
            setIsLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <ViewListIcon className="w-5 h-5 text-indigo-600" />
                    任务执行日志
                </h3>
                <button onClick={fetchTasks} className="p-2 bg-white border rounded-lg text-slate-500 hover:text-indigo-600 shadow-sm transition-all">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-100 sticky top-0">
                        <tr>
                            <th className="px-6 py-4 w-16">ID</th>
                            <th className="px-6 py-4">来源 / 采集点</th>
                            <th className="px-6 py-4">类型</th>
                            <th className="px-6 py-4">阶段</th>
                            <th className="px-6 py-4">详情</th>
                            <th className="px-6 py-4">开始时间</th>
                            <th className="px-6 py-4">结束时间</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {tasks.length === 0 && !isLoading ? (
                            <tr><td colSpan={7} className="text-center py-12 text-slate-400">暂无任务记录</td></tr>
                        ) : (
                            tasks.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-mono text-xs">{t.id.substring(0, 6)}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-800">{t.point_name}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{t.source_name}</div>
                                    </td>
                                    <td className="px-6 py-4"><span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">{t.task_type}</span></td>
                                    <td className="px-6 py-4 font-medium text-slate-700">{t.stage}</td>
                                    <td className="px-6 py-4 text-xs font-mono text-slate-500 max-w-xs truncate" title={t.detail_info}>{t.detail_info}</td>
                                    <td className="px-6 py-4 text-xs text-slate-400 tabular-nums">{formatBJTime(t.start_time)}</td>
                                    <td className="px-6 py-4 text-xs text-slate-400 tabular-nums">{t.end_time ? formatBJTime(t.end_time) : '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 bg-white">
                <span>共 {total} 条记录</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50">上一页</button>
                    <span className="flex items-center px-2">{page}</span>
                    <button disabled={tasks.length < 15} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50">下一页</button>
                </div>
            </div>
        </div>
    );
};

// --- Submodule: Pending Articles ---
const PendingArticleDetailModal: React.FC<{ articleId: string; onClose: () => void; onAction: (id: string, action: 'confirm' | 'delete') => void }> = ({ articleId, onClose, onAction }) => {
    const [detail, setDetail] = useState<PendingArticle | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const res = await getPendingArticleDetail(articleId);
                setDetail(res);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [articleId]);

    if (!detail && loading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"><Spinner /></div>;
    if (!detail) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                    <div className="pr-8">
                        <h3 className="text-lg font-bold text-slate-900 leading-snug">{detail.title}</h3>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="bg-white border px-2 py-0.5 rounded">{detail.source_name}</span>
                            <span className="font-mono">{detail.point_name}</span>
                            <span>•</span>
                            <span>{formatBJTime(detail.publish_date)}</span>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors"><CloseIcon className="w-6 h-6"/></button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30 flex flex-col md:flex-row gap-6">
                    {/* Main Content */}
                    <div className="flex-1 bg-white p-6 rounded-xl border border-slate-200 shadow-sm overflow-auto">
                        <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                            {detail.content || <span className="text-slate-400 italic">内容为空或未抓取正文</span>}
                        </div>
                    </div>

                    {/* Sidebar Metadata */}
                    <div className="w-full md:w-80 flex-shrink-0 space-y-4">
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">Metadata</h4>
                            <div className="text-xs font-mono bg-slate-50 p-3 rounded border border-slate-100 overflow-auto max-h-60">
                                <pre>{JSON.stringify(detail.crawl_metadata || {}, null, 2)}</pre>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-3">Source Link</h4>
                            <a href={detail.original_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-xs break-all flex items-start gap-1">
                                <ExternalLinkIcon className="w-3 h-3 flex-shrink-0 mt-0.5"/>
                                {detail.original_url}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={() => onAction(detail.id, 'delete')} className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold border border-red-200 transition-colors flex items-center gap-2">
                        <TrashIcon className="w-4 h-4"/> 删除
                    </button>
                    <button onClick={() => onAction(detail.id, 'confirm')} className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold shadow-md transition-colors flex items-center gap-2">
                        <CheckIcon className="w-4 h-4"/> 确认入库
                    </button>
                </div>
            </div>
        </div>
    );
};

const PendingArticlesList: React.FC = () => {
    const [articles, setArticles] = useState<PendingArticle[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [processing, setProcessing] = useState(false);
    const [viewingArticleId, setViewingArticleId] = useState<string | null>(null);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getPendingArticles({ page, limit: 20 });
            setArticles(res.items);
            setTotal(res.total);
            setSelectedIds(new Set());
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [page]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const handleAction = async (action: 'confirm' | 'delete', ids?: string[]) => {
        const targetIds = ids || Array.from(selectedIds);
        if (targetIds.length === 0) return;
        
        setProcessing(true);
        try {
            if (action === 'confirm') {
                const res = await confirmPendingArticles(targetIds);
                alert(res.message || `成功入库 ${res.confirmed_count} 篇文章`);
            } else {
                const res = await deletePendingArticles(targetIds);
                alert(res.message || `成功删除 ${res.deleted_count} 篇文章`);
            }
            setSelectedIds(new Set());
            if (viewingArticleId && targetIds.includes(viewingArticleId)) setViewingArticleId(null);
            await fetchArticles();
        } catch (e: any) { 
            alert(`操作失败: ${e.message}`); 
        } finally { 
            setProcessing(false); 
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === articles.length && articles.length > 0) setSelectedIds(new Set());
        else setSelectedIds(new Set(articles.map(a => a.id)));
    };

    return (
        <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-orange-600" />
                    待确认内容 <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-mono">{total}</span>
                </h3>
                <div className="flex gap-3">
                    <button onClick={fetchArticles} className="p-2 bg-white border rounded-lg text-slate-500 hover:text-indigo-600 shadow-sm transition-all">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={() => handleAction('delete')} disabled={processing} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors flex items-center gap-1.5">
                                {processing ? <Spinner /> : <TrashIcon className="w-3.5 h-3.5"/>} 删除 ({selectedIds.size})
                            </button>
                            <button onClick={() => handleAction('confirm')} disabled={processing} className="px-4 py-2 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-md hover:-translate-y-0.5">
                                {processing ? <Spinner /> : <CheckIcon className="w-3.5 h-3.5"/>} 入库 ({selectedIds.size})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b border-slate-100 sticky top-0">
                        <tr>
                            <th className="px-6 py-4 w-12">
                                <input type="checkbox" onChange={toggleAll} checked={articles.length > 0 && selectedIds.size === articles.length} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                            </th>
                            <th className="px-6 py-4">标题</th>
                            <th className="px-6 py-4">来源 / 采集点</th>
                            <th className="px-6 py-4">发布时间</th>
                            <th className="px-6 py-4 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {articles.length === 0 && !isLoading ? (
                            <tr><td colSpan={5} className="text-center py-12 text-slate-400">暂无待确认文章</td></tr>
                        ) : (
                            articles.map(article => (
                                <tr key={article.id} className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedIds.has(article.id) ? 'bg-indigo-50/30' : ''}`} onClick={() => toggleSelect(article.id)}>
                                    <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                        <input type="checkbox" checked={selectedIds.has(article.id)} onChange={() => toggleSelect(article.id)} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{article.title}</td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded inline-block border border-slate-200">{article.source_name}</div>
                                        <div className="text-xs text-slate-400 mt-1">{article.point_name}</div>
                                    </td>
                                    <td className="px-6 py-4 text-xs text-slate-400 tabular-nums">{formatBJTime(article.publish_date)}</td>
                                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            onClick={() => setViewingArticleId(article.id)}
                                            className="text-blue-600 hover:text-blue-800 font-bold text-xs bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors flex items-center gap-1 ml-auto"
                                        >
                                            <EyeIcon className="w-3.5 h-3.5" /> 详情
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-3 border-t border-slate-100 flex justify-between items-center text-xs text-slate-500 bg-white">
                <span>共 {total} 篇文章</span>
                <div className="flex gap-2">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50">上一页</button>
                    <span className="flex items-center px-2">{page}</span>
                    <button disabled={articles.length < 15} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 border rounded-lg hover:bg-slate-50 disabled:opacity-50">下一页</button>
                </div>
            </div>

            {/* Detail Modal */}
            {viewingArticleId && (
                <PendingArticleDetailModal 
                    articleId={viewingArticleId} 
                    onClose={() => setViewingArticleId(null)}
                    onAction={(id, action) => handleAction(action, [id])}
                />
            )}
        </div>
    );
};

// --- Generic Crawler Module Wrapper ---
const GenericCrawlerModule: React.FC = () => {
    const [subTab, setSubTab] = useState<'tasks' | 'pending'>('tasks');

    return (
        <div className="h-full flex flex-col bg-slate-50/50 p-6 gap-6">
            {/* Sub-Navigation */}
            <div className="flex justify-between items-center border-b border-slate-200 pb-1">
                <div className="flex gap-4">
                    <button
                        onClick={() => setSubTab('tasks')}
                        className={`pb-3 px-2 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                            subTab === 'tasks' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <ViewListIcon className="w-4 h-4" /> 任务监控
                    </button>
                    <button
                        onClick={() => setSubTab('pending')}
                        className={`pb-3 px-2 border-b-2 font-bold text-sm flex items-center gap-2 transition-all whitespace-nowrap ${
                            subTab === 'pending' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <CheckCircleIcon className="w-4 h-4" /> 内容审核
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0">
                {subTab === 'tasks' ? <GenericTaskList /> : <PendingArticlesList />}
            </div>
        </div>
    );
};

// --- Main IntelligenceDashboard Export ---
export const IntelligenceDashboard: React.FC = () => {
    // This is the main component exported and used in index.tsx
    // It can switch between sub-modules (Overview, Generic, etc) if needed, 
    // or present a unified dashboard.
    // Based on previous structure, it seems to be using tabs or similar.
    
    // For simplicity based on prompt context, we return the Overview 
    // which now includes Generic management entry points.
    
    // However, looking at original file structure, IntelligenceDashboard seemed to be a container.
    // Let's assume a simple tab structure for full management context.
    
    const [activeTab, setActiveTab] = useState<'overview' | 'generic'>('overview');

    return (
        <div className="h-full flex flex-col">
             <div className="bg-white border-b border-slate-200 px-6 pt-4">
                <h1 className="text-2xl font-bold text-gray-800 mb-4">情报管理中台</h1>
                <div className="flex gap-6">
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`pb-3 px-1 border-b-2 text-sm font-bold transition-colors ${activeTab === 'overview' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        情报源概览
                    </button>
                    <button 
                        onClick={() => setActiveTab('generic')}
                        className={`pb-3 px-1 border-b-2 text-sm font-bold transition-colors ${activeTab === 'generic' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        通用爬虫 & 审核
                    </button>
                </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
                {activeTab === 'overview' ? <IntelligenceOverview /> : <GenericCrawlerModule />}
            </div>
        </div>
    );
};
