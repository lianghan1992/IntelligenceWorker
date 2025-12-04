
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    getSourcesAndPoints, createPoint, createGenericPoint, updateGenericPoint, deleteSource, deletePoints, 
    toggleSource, togglePoint, checkPointHealth, runCrawlerSource, runGenericPoint,
    getIntelligenceStats, getGenericTasks,
    getPendingArticles, getPendingArticleDetail, confirmPendingArticles, rejectPendingArticles,
    getArticles, getArticleHtml, generateArticlePdf, downloadArticlePdf,
    IntelligenceSourcePublic, IntelligencePointPublic, GenericCrawlerTaskPublic, 
    PendingArticlePublic, ArticlePublic
} from '../../api/intelligence';
import { 
    ServerIcon, RssIcon, ViewListIcon, CheckCircleIcon, DatabaseIcon, 
    PlusIcon, RefreshIcon, PlayIcon, StopIcon, TrashIcon, 
    ExternalLinkIcon, ClockIcon, SearchIcon, ShieldCheckIcon,
    ShieldExclamationIcon, QuestionMarkCircleIcon, DownloadIcon,
    ChartIcon, GearIcon, CloseIcon, EyeIcon, CheckIcon, DocumentTextIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

// --- Shared Components ---

const Spinner: React.FC<{ size?: string, color?: string }> = ({ size = "h-5 w-5", color = "text-indigo-600" }) => (
    <svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all duration-300 ${active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
        {label}
        {active && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full animate-in fade-in zoom-in duration-300"></span>}
    </button>
);

// --- 1. Overview Panel ---

const OverviewPanel: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadStats = async () => {
        setLoading(true);
        try {
            const data = await getIntelligenceStats();
            setStats(data);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { loadStats(); }, []);

    const StatCard = ({ title, value, icon: Icon, color, subText }: any) => (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color} bg-opacity-10 text-opacity-100`}>
                <Icon className={`w-7 h-7 ${color.replace('bg-', 'text-')}`} />
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
                <div className="text-3xl font-extrabold text-slate-800 my-1">{value?.toLocaleString() || 0}</div>
                <p className="text-xs text-slate-500 font-medium">{subText}</p>
            </div>
        </div>
    );

    return (
        <div className="p-8 h-full overflow-y-auto bg-slate-50/50">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">情报系统全景</h2>
                <button onClick={loadStats} className="p-2 bg-white border rounded-xl hover:text-indigo-600 shadow-sm transition-all"><RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <StatCard title="接入情报源" value={stats?.sources} icon={ServerIcon} color="bg-indigo-600" subText="Active Sources" />
                <StatCard title="活跃采集点" value={stats?.active_points} icon={RssIcon} color="bg-blue-500" subText={`Total Points: ${stats?.points || 0}`} />
                <StatCard title="情报资产" value={stats?.articles} icon={DatabaseIcon} color="bg-purple-600" subText="Collected Articles" />
                <StatCard title="向量索引" value={stats?.vectors} icon={ViewListIcon} color="bg-orange-500" subText="Searchable Chunks" />
                <StatCard title="运行中任务" value={stats?.schedules_active} icon={PlayIcon} color="bg-green-500" subText="Active Schedules" />
            </div>
        </div>
    );
};

// --- 2. Configuration Panel (Unified Sources & Points) ---

const ConfigPanel: React.FC = () => {
    const [sources, setSources] = useState<IntelligenceSourcePublic[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
    
    // Modal & Action States
    const [isPointModalOpen, setIsPointModalOpen] = useState(false);
    // Modal data for Create OR Edit
    const [modalData, setModalData] = useState<{
        id?: string; // If present, editing
        source_name: string;
        point_name: string;
        point_url: string;
        cron: string;
        type: 'manual' | 'generic';
        list_hint: string;
        list_filters: string;
    }>({ source_name: '', point_name: '', point_url: '', cron: '0 */6 * * *', type: 'manual', list_hint: '', list_filters: '' });
    
    const [healthCheckStatus, setHealthCheckStatus] = useState<Record<string, { status: string, message: string }>>({});
    const [checkingHealthId, setCheckingHealthId] = useState<string | null>(null);
    const [runningId, setRunningId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSourcesAndPoints();
            setSources(data);
            // Auto expand if only few sources
            if (data.length <= 3) {
                setExpandedSources(new Set(data.map(s => s.source_name)));
            }
        } catch (e) { console.error(e); } 
        finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const toggleExpand = (name: string) => {
        setExpandedSources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(name)) newSet.delete(name); else newSet.add(name);
            return newSet;
        });
    };

    const handleOpenCreate = () => {
        setModalData({ source_name: '', point_name: '', point_url: '', cron: '0 */6 * * *', type: 'manual', list_hint: '', list_filters: '' });
        setIsPointModalOpen(true);
    };

    const handleOpenEdit = (point: IntelligencePointPublic) => {
        setModalData({
            id: point.id,
            source_name: point.source_name,
            point_name: point.point_name,
            point_url: point.point_url,
            cron: point.cron_schedule,
            type: point.type || 'manual', // Fallback to manual if undefined
            list_hint: point.list_hint || '',
            list_filters: point.list_filters ? point.list_filters.join(',') : ''
        });
        setIsPointModalOpen(true);
    };

    const handleSavePoint = async () => {
        if (!modalData.source_name || !modalData.point_name || !modalData.point_url) {
            alert("请填写必要字段");
            return;
        }
        try {
            if (modalData.id) {
                // Editing
                if (modalData.type === 'generic') {
                    await updateGenericPoint(modalData.id, {
                        source_name: modalData.source_name,
                        point_name: modalData.point_name,
                        point_url: modalData.point_url,
                        cron_schedule: modalData.cron,
                        list_hint: modalData.list_hint,
                        list_filters: modalData.list_filters ? modalData.list_filters.split(',') : []
                    });
                } else {
                    // Manual points don't have a direct UPDATE API in docs, usually Delete + Create logic or strictly immutable
                    // For now, only generic supports update as per doc.
                    alert("Manual points update not supported via API directly. Recreating...");
                    await deletePoints([modalData.id]);
                    await createPoint({ 
                        source_name: modalData.source_name, point_name: modalData.point_name, 
                        point_url: modalData.point_url, cron_schedule: modalData.cron 
                    });
                }
            } else {
                // Creating
                if (modalData.type === 'manual') {
                    await createPoint({ 
                        source_name: modalData.source_name, point_name: modalData.point_name, 
                        point_url: modalData.point_url, cron_schedule: modalData.cron 
                    });
                } else {
                    await createGenericPoint({
                        source_name: modalData.source_name, point_name: modalData.point_name,
                        point_url: modalData.point_url, cron_schedule: modalData.cron,
                        list_hint: modalData.list_hint, list_filters: modalData.list_filters ? modalData.list_filters.split(',') : []
                    });
                }
            }
            setIsPointModalOpen(false);
            fetchData();
        } catch (e: any) { alert('保存失败: ' + e.message); }
    };

    const handleToggleSource = async (name: string, current: boolean) => {
        try { await toggleSource(name, !current); fetchData(); } catch (e) { alert('操作失败'); }
    };

    const handleTogglePoint = async (id: string, current: boolean) => {
        try { await togglePoint(id, !current); fetchData(); } catch (e) { alert('操作失败'); }
    };

    const handleDeletePoint = async (id: string) => {
        if (!confirm('确定删除此节点吗？')) return;
        try { await deletePoints([id]); fetchData(); } catch (e) { alert('删除失败'); }
    };

    const handleDeleteSource = async (name: string) => {
        if (!confirm(`确定删除源 "${name}" 及其所有节点吗？`)) return;
        try { await deleteSource(name); fetchData(); } catch (e) { alert('删除失败'); }
    };

    const handleHealthCheck = async (point: IntelligencePointPublic) => {
        setCheckingHealthId(point.id);
        try {
            const res = await checkPointHealth(point.id);
            setHealthCheckStatus(prev => ({ ...prev, [point.id]: res }));
        } catch (e: any) {
            setHealthCheckStatus(prev => ({ ...prev, [point.id]: { status: 'error', message: e.message } }));
        } finally {
            setCheckingHealthId(null);
        }
    };

    const handleRunNow = async (source: IntelligenceSourcePublic, point?: IntelligencePointPublic) => {
        const id = point ? point.id : source.source_name;
        setRunningId(id);
        try {
            if (point && point.type === 'generic') {
                await runGenericPoint(point.id);
            } else {
                await runCrawlerSource(source.source_name);
            }
            alert('任务已触发，请查看任务监控面板。');
        } catch (e: any) {
            alert(`运行失败: ${e.message}`);
        } finally {
            setRunningId(null);
        }
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <ServerIcon className="w-5 h-5 text-indigo-600" /> 源配置管理
                </h3>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={handleOpenCreate} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 shadow-md transition-all text-xs">
                        <PlusIcon className="w-3.5 h-3.5" /> 新建采集点
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-auto p-6 bg-slate-50/50 custom-scrollbar">
                {sources.length === 0 && !isLoading && (
                    <div className="text-center py-20 text-slate-400">暂无配置，请点击新建</div>
                )}
                
                <div className="space-y-4">
                    {sources.map(source => {
                        const isExpanded = expandedSources.has(source.source_name);
                        const points = source.points || [];
                        const hasActive = points.some(p => p.is_active);

                        return (
                            <div key={source.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:shadow-md">
                                {/* Source Header */}
                                <div className="p-4 flex items-center justify-between bg-white cursor-pointer select-none" onClick={() => toggleExpand(source.source_name)}>
                                    <div className="flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg ${source.source_type === 'generic' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                            <RssIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-800 text-sm">{source.source_name}</div>
                                            <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{source.source_type} Source • {points.length} Points</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                                        {source.source_type !== 'generic' && (
                                            <button 
                                                onClick={() => handleRunNow(source)} 
                                                disabled={runningId === source.source_name}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-lg transition-colors" 
                                                title="Run Crawler"
                                            >
                                                <PlayIcon className={`w-4 h-4 ${runningId === source.source_name ? 'animate-spin' : ''}`} />
                                            </button>
                                        )}
                                        <button onClick={() => handleToggleSource(source.source_name, hasActive)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${hasActive ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                                            {hasActive ? 'Running' : 'Paused'}
                                        </button>
                                        <button onClick={() => handleDeleteSource(source.source_name)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </div>

                                {/* Points List */}
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50/30">
                                        {points.map(point => (
                                            <div key={point.id} className="flex items-center justify-between p-3 pl-12 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors group">
                                                <div className="min-w-0 flex-1 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-1.5 h-1.5 rounded-full ${point.is_active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                        <span className="font-semibold text-sm text-slate-700">{point.point_name}</span>
                                                        {point.type === 'generic' && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 rounded border border-purple-100">Generic</span>}
                                                    </div>
                                                    <a href={point.point_url} target="_blank" className="text-xs text-slate-400 hover:text-indigo-500 truncate block mt-0.5 max-w-md">{point.point_url}</a>
                                                </div>
                                                
                                                <div className="flex items-center gap-4">
                                                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white border px-2 py-1 rounded">
                                                        <ClockIcon className="w-3 h-3" /> {point.cron_schedule}
                                                    </div>
                                                    
                                                    {/* Health Check Status */}
                                                    <div className="flex items-center gap-2 w-24 justify-end">
                                                        {healthCheckStatus[point.id] ? (
                                                            <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${healthCheckStatus[point.id].status === 'healthy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                {healthCheckStatus[point.id].status === 'healthy' ? 'OK' : 'Error'}
                                                            </span>
                                                        ) : (
                                                            <button onClick={() => handleHealthCheck(point)} disabled={checkingHealthId === point.id} className="text-slate-300 hover:text-indigo-500 p-1 rounded transition-colors">
                                                                <ShieldCheckIcon className={`w-4 h-4 ${checkingHealthId === point.id ? 'animate-pulse text-indigo-400' : ''}`} />
                                                            </button>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleOpenEdit(point)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="编辑">
                                                            <GearIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                        {point.type === 'generic' && (
                                                            <button onClick={() => handleRunNow(source, point)} disabled={runningId === point.id} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="运行">
                                                                <PlayIcon className={`w-3.5 h-3.5 ${runningId === point.id ? 'animate-spin' : ''}`} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleTogglePoint(point.id, point.is_active)} className={`p-1.5 rounded ${point.is_active ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-100'}`}>
                                                            {point.is_active ? <StopIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                                                        </button>
                                                        <button onClick={() => handleDeletePoint(point.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Create/Edit Modal */}
            {isPointModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b bg-slate-50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{modalData.id ? '编辑采集点' : '新建采集点'}</h3>
                            <button onClick={() => setIsPointModalOpen(false)}><CloseIcon className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            {!modalData.id && (
                                <div className="flex gap-4 mb-2">
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                        <input type="radio" checked={modalData.type === 'manual'} onChange={() => setModalData({...modalData, type: 'manual'})} /> Manual
                                    </label>
                                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 cursor-pointer">
                                        <input type="radio" checked={modalData.type === 'generic'} onChange={() => setModalData({...modalData, type: 'generic'})} /> Generic
                                    </label>
                                </div>
                            )}
                            <input className="w-full border p-2 rounded-lg text-sm" placeholder="Source Name (e.g. 36Kr)" value={modalData.source_name} onChange={e => setModalData({...modalData, source_name: e.target.value})} />
                            <input className="w-full border p-2 rounded-lg text-sm" placeholder="Point Name (e.g. News)" value={modalData.point_name} onChange={e => setModalData({...modalData, point_name: e.target.value})} />
                            <input className="w-full border p-2 rounded-lg text-sm" placeholder="Target URL" value={modalData.point_url} onChange={e => setModalData({...modalData, point_url: e.target.value})} />
                            <input className="w-full border p-2 rounded-lg text-sm font-mono" placeholder="CRON (0 */6 * * *)" value={modalData.cron} onChange={e => setModalData({...modalData, cron: e.target.value})} />
                            {modalData.type === 'generic' && (
                                <>
                                    <input className="w-full border p-2 rounded-lg text-sm" placeholder="List Hint (e.g. news items)" value={modalData.list_hint} onChange={e => setModalData({...modalData, list_hint: e.target.value})} />
                                    <input className="w-full border p-2 rounded-lg text-sm" placeholder="Filters (comma separated urls)" value={modalData.list_filters} onChange={e => setModalData({...modalData, list_filters: e.target.value})} />
                                </>
                            )}
                            <button onClick={handleSavePoint} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 transition-all mt-2">
                                {modalData.id ? '保存修改' : '立即创建'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 3. Review Panel (Pending Articles) ---

const ReviewPanel: React.FC = () => {
    const [articles, setArticles] = useState<PendingArticlePublic[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    
    // Detail Modal State
    const [viewingArticle, setViewingArticle] = useState<PendingArticlePublic | null>(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const fetchPending = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getPendingArticles({ page, limit: 20 });
            setArticles(res.items || []);
            setTotal(res.total);
            setSelectedIds(new Set());
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchPending(); }, [fetchPending]);

    const handleAction = async (action: 'confirm' | 'reject', ids?: string[]) => {
        const targetIds = ids || Array.from(selectedIds);
        if (targetIds.length === 0) return;
        setActionLoading(true);
        try {
            if (action === 'confirm') await confirmPendingArticles(targetIds);
            else await rejectPendingArticles(targetIds);
            fetchPending();
            setViewingArticle(null); // Close modal if open
        } catch (e) { alert('操作失败'); } 
        finally { setActionLoading(false); }
    };

    const openDetail = async (id: string) => {
        setLoadingDetail(true);
        try {
            const detail = await getPendingArticleDetail(id);
            setViewingArticle(detail);
        } catch (e) { alert('加载详情失败'); }
        finally { setLoadingDetail(false); }
    };

    return (
        <div className="h-full flex flex-col p-6 bg-slate-50/50">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <ShieldCheckIcon className="w-6 h-6 text-orange-500" />
                    内容审核 <span className="bg-orange-100 text-orange-600 px-2 py-0.5 rounded text-xs font-mono">{total} Pending</span>
                </h3>
                <div className="flex gap-3">
                    <button onClick={fetchPending} className="p-2 bg-white border rounded-lg hover:text-indigo-600"><RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={() => handleAction('reject')} disabled={actionLoading} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-100 hover:bg-red-100">
                                拒绝 ({selectedIds.size})
                            </button>
                            <button onClick={() => handleAction('confirm')} disabled={actionLoading} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg shadow-md hover:bg-green-700">
                                {actionLoading ? <Spinner color="text-white"/> : '确认入库'} ({selectedIds.size})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                    {articles.map(art => (
                        <div key={art.id} 
                             className={`p-4 mb-3 rounded-xl border transition-all flex gap-4 group ${selectedIds.has(art.id) ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-sm'}`}
                        >
                            <div 
                                onClick={() => setSelectedIds(prev => { const n = new Set(prev); if(n.has(art.id)) n.delete(art.id); else n.add(art.id); return n; })}
                                className="cursor-pointer pt-1"
                            >
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.has(art.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                    {selectedIds.has(art.id) && <span className="text-white font-bold text-xs">✓</span>}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-slate-800 text-base line-clamp-1">{art.title}</h4>
                                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded ml-2 whitespace-nowrap">{art.source_name}</span>
                                </div>
                                <div className="text-xs text-slate-400 flex gap-3 mb-2 items-center">
                                    <span>{art.publish_date ? new Date(art.publish_date).toLocaleDateString() : 'No Date'}</span>
                                    <a href={art.original_url} target="_blank" className="text-blue-500 hover:underline flex items-center gap-1"><ExternalLinkIcon className="w-3 h-3"/> Link</a>
                                    <button onClick={() => openDetail(art.id)} className="text-indigo-600 hover:underline font-bold flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded">
                                        <EyeIcon className="w-3 h-3"/> 查看详情
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 line-clamp-2">{art.content ? art.content.slice(0, 200) + '...' : 'No preview available.'}</p>
                            </div>
                        </div>
                    ))}
                    {!loading && articles.length === 0 && <div className="text-center py-20 text-slate-400">暂无待审核内容</div>}
                </div>
            </div>

            {/* Detail Modal */}
            {viewingArticle && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 leading-snug">{viewingArticle.title}</h3>
                                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                                    <span className="bg-white border border-slate-200 px-2 py-0.5 rounded text-slate-600 font-medium">{viewingArticle.source_name}</span>
                                    <span className="font-mono text-slate-400">{viewingArticle.point_name}</span>
                                    <a href={viewingArticle.original_url} target="_blank" className="text-blue-600 hover:underline flex items-center gap-1"><ExternalLinkIcon className="w-3 h-3"/> 原文</a>
                                </div>
                            </div>
                            <button onClick={() => setViewingArticle(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200"><CloseIcon className="w-6 h-6"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-8 bg-white prose prose-sm max-w-none text-slate-700">
                            <pre className="whitespace-pre-wrap font-sans text-sm">{viewingArticle.content || "文章内容为空"}</pre>
                        </div>
                        <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                            <button onClick={() => handleAction('reject', [viewingArticle.id])} className="px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold border border-red-200">拒绝并删除</button>
                            <button onClick={() => handleAction('confirm', [viewingArticle.id])} className="px-6 py-2 text-white bg-green-600 hover:bg-green-700 rounded-lg text-sm font-bold shadow-md">确认入库</button>
                        </div>
                    </div>
                </div>
            )}
            {loadingDetail && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/20"><Spinner size="w-10 h-10"/></div>}
        </div>
    );
};

// --- 4. Assets Panel (Articles) ---

const AssetPanel: React.FC = () => {
    const [articles, setArticles] = useState<ArticlePublic[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
    
    // Preview State
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    const fetchArticles = useCallback(async () => {
        setLoading(true);
        try {
            const res = await getArticles({ page, limit: 20 }); 
            setArticles(res.items || []);
            setTotal(res.total);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    }, [page]);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    const handleGenPdf = async (id: string) => {
        setGeneratingPdfId(id);
        try {
            // Usually we trigger generation, but let's just download directly if available
            // or trigger generate then download.
            // For now, assume this triggers generation backend side.
            await generateArticlePdf(id);
            // Then trigger download
            const blob = await downloadArticlePdf(id);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${id}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (e) { alert('PDF请求失败'); }
        finally { setGeneratingPdfId(null); }
    };

    const handlePreview = async (id: string) => {
        setLoading(true);
        try {
            const html = await getArticleHtml(id);
            setPreviewHtml(html);
            setIsPreviewOpen(true);
        } catch (e) { alert('加载预览失败'); }
        finally { setLoading(false); }
    };

    return (
        <div className="h-full flex flex-col p-6 bg-white">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <DatabaseIcon className="w-6 h-6 text-indigo-600" /> 情报资产库
                </h3>
                <div className="flex gap-3">
                    <div className="relative">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input type="text" placeholder="Search..." className="pl-9 pr-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none" />
                    </div>
                    <button onClick={fetchArticles} className="p-2 bg-slate-50 border rounded-xl hover:text-indigo-600"><RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
                </div>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 shadow-sm custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">标题</th>
                            <th className="px-6 py-4 w-32">来源</th>
                            <th className="px-6 py-4 w-32">时间</th>
                            <th className="px-6 py-4 w-32 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {articles.map(art => (
                            <tr key={art.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800 line-clamp-1">{art.title}</div>
                                    <a href={art.original_url} target="_blank" className="text-xs text-blue-500 hover:underline truncate block max-w-xs mt-1">{art.original_url}</a>
                                </td>
                                <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-bold text-slate-600">{art.source_name}</span></td>
                                <td className="px-6 py-4 text-xs font-mono">{art.publish_date ? new Date(art.publish_date).toLocaleDateString() : '-'}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button 
                                            onClick={() => handlePreview(art.id)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                            title="预览报告"
                                        >
                                            <DocumentTextIcon className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            onClick={() => handleGenPdf(art.id)} 
                                            disabled={generatingPdfId === art.id}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="下载PDF"
                                        >
                                            {generatingPdfId === art.id ? <Spinner size="h-4 w-4"/> : <DownloadIcon className="w-4 h-4"/>}
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <div className="flex-justify-center mt-4 gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p=>p-1)} className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm">Prev</button>
                <span className="px-4 py-2 text-sm font-bold text-slate-600">{page}</span>
                <button disabled={articles.length < 20} onClick={() => setPage(p=>p+1)} className="px-4 py-2 border rounded-lg disabled:opacity-50 text-sm">Next</button>
            </div>

            {/* HTML Preview Modal */}
            {isPreviewOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-white w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden relative">
                        <button onClick={() => setIsPreviewOpen(false)} className="absolute top-4 right-4 z-50 p-2 bg-black/10 hover:bg-black/20 rounded-full text-slate-600 transition-colors">
                            <CloseIcon className="w-6 h-6"/>
                        </button>
                        <iframe 
                            srcDoc={previewHtml || ''} 
                            className="w-full h-full border-none" 
                            title="Report Preview"
                            sandbox="allow-same-origin"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// --- 5. Tasks Panel (Logs) ---

const TasksPanel: React.FC = () => {
    const [tasks, setTasks] = useState<GenericCrawlerTaskPublic[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const res = await getGenericTasks({ page: 1, limit: 50 });
            setTasks(res.items || []);
        } catch (e) { console.error(e); } 
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTasks(); }, []);

    return (
        <div className="h-full flex flex-col p-6 bg-slate-50/50">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                    <ViewListIcon className="w-6 h-6 text-blue-500" /> 任务监控日志
                </h3>
                <button onClick={fetchTasks} className="p-2 bg-white border rounded-lg hover:text-blue-600"><RefreshIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>

            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm custom-scrollbar">
                <table className="w-full text-sm text-left text-slate-600">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0">
                        <tr>
                            <th className="px-6 py-4">节点</th>
                            <th className="px-6 py-4">类型</th>
                            <th className="px-6 py-4">阶段</th>
                            <th className="px-6 py-4">详情</th>
                            <th className="px-6 py-4">开始时间</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {tasks.map(t => (
                            <tr key={t.id} className="hover:bg-slate-50">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-slate-800">{t.point_name}</div>
                                    <div className="text-xs text-slate-400">{t.source_name}</div>
                                </td>
                                <td className="px-6 py-4"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{t.task_type}</span></td>
                                <td className="px-6 py-4 font-medium">{t.stage}</td>
                                <td className="px-6 py-4 text-xs font-mono max-w-xs truncate">{JSON.stringify(t.detail_info)}</td>
                                <td className="px-6 py-4 text-xs font-mono">{new Date(t.start_time).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- Main Container ---

export const IntelligenceDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'overview' | 'config' | 'tasks' | 'review' | 'assets'>('overview');

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="bg-white border-b border-slate-200 px-6 flex justify-between items-center shadow-sm z-10 flex-shrink-0">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={ChartIcon} label="仪表盘" />
                    <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} icon={ServerIcon} label="源配置" />
                    <TabButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={ViewListIcon} label="任务监控" />
                    <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={ShieldCheckIcon} label="内容审核" />
                    <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={DatabaseIcon} label="情报库" />
                </div>
            </div>

            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'overview' && <OverviewPanel />}
                {activeTab === 'config' && <ConfigPanel />}
                {activeTab === 'tasks' && <TasksPanel />}
                {activeTab === 'review' && <ReviewPanel />}
                {activeTab === 'assets' && <AssetPanel />}
            </div>
        </div>
    );
};
