import React, { useState, useEffect, useCallback } from 'react';
import { 
    getSources, createSource, 
    getPoints, createPoint, togglePoint, deletePoints,
    getTasks, 
    getPendingArticles, confirmPendingArticles, rejectPendingArticles,
    getArticles,
    SourcePublic, PointPublic, TaskPublic, PendingArticlePublic, ArticlePublic
} from '../../api/intelligence';
import { 
    ServerIcon, RssIcon, ViewListIcon, CheckCircleIcon, DatabaseIcon, 
    PlusIcon, RefreshIcon, PlayIcon, StopIcon, TrashIcon, 
    ExternalLinkIcon, ClockIcon, SearchIcon,
    FunnelIcon, CheckIcon, ShieldCheckIcon
} from '../icons';

// --- Common UI Components ---

const Spinner: React.FC<{ size?: string, color?: string }> = ({ size = "h-5 w-5", color = "text-indigo-600" }) => (
    <svg className={`animate-spin ${size} ${color}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const TabButton: React.FC<{ 
    active: boolean; 
    onClick: () => void; 
    icon: React.ElementType; 
    label: string; 
}> = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`
            relative flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all duration-300
            ${active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}
        `}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
        {label}
        {active && (
            <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full animate-in fade-in zoom-in duration-300"></span>
        )}
    </button>
);

// --- Sub-View: Configuration (Sources & Points) ---

const ConfigPanel: React.FC = () => {
    const [sources, setSources] = useState<SourcePublic[]>([]);
    const [selectedSource, setSelectedSource] = useState<SourcePublic | null>(null);
    const [points, setPoints] = useState<PointPublic[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isPointsLoading, setIsPointsLoading] = useState(false);
    
    // Create Modal States
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showPointModal, setShowPointModal] = useState(false);
    const [newSourceName, setNewSourceName] = useState('');
    const [newSourceUrl, setNewSourceUrl] = useState('');
    
    const [newPointData, setNewPointData] = useState({
        name: '', url: '', cron_schedule: '*/30 * * * *', url_filters: ''
    });

    const fetchSources = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getSources();
            setSources(data || []);
            if (data.length > 0 && !selectedSource) {
                setSelectedSource(data[0]);
            }
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, [selectedSource]);

    const fetchPoints = useCallback(async () => {
        if (!selectedSource) return;
        setIsPointsLoading(true);
        try {
            const data = await getPoints({ source_name: selectedSource.name });
            setPoints(data || []);
        } catch (e) { console.error(e); } finally { setIsPointsLoading(false); }
    }, [selectedSource]);

    useEffect(() => { fetchSources(); }, [fetchSources]);
    useEffect(() => { fetchPoints(); }, [fetchPoints]);

    const handleCreateSource = async () => {
        if (!newSourceName || !newSourceUrl) return;
        try {
            await createSource({ name: newSourceName, main_url: newSourceUrl });
            setShowSourceModal(false);
            setNewSourceName('');
            setNewSourceUrl('');
            fetchSources();
        } catch (e) { alert('创建失败'); }
    };

    const handleCreatePoint = async () => {
        if (!selectedSource || !newPointData.name || !newPointData.url) return;
        try {
            await createPoint({
                source_name: selectedSource.name,
                name: newPointData.name,
                url: newPointData.url,
                cron_schedule: newPointData.cron_schedule,
                url_filters: newPointData.url_filters.split(',').filter(s => s.trim())
            });
            setShowPointModal(false);
            setNewPointData({ name: '', url: '', cron_schedule: '*/30 * * * *', url_filters: '' });
            fetchPoints();
        } catch (e) { alert('创建失败'); }
    };

    const handleTogglePoint = async (point: PointPublic) => {
        try {
            await togglePoint(point.id, !point.is_active);
            setPoints(prev => prev.map(p => p.id === point.id ? { ...p, is_active: !p.is_active } : p));
        } catch (e) { alert('操作失败'); }
    };

    const handleDeletePoint = async (id: string) => {
        if(!confirm('确定删除吗？')) return;
        try {
            await deletePoints([id]);
            setPoints(prev => prev.filter(p => p.id !== id));
        } catch (e) { alert('删除失败'); }
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-6 p-6">
            {/* Sources List */}
            <div className="w-full md:w-1/3 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <ServerIcon className="w-5 h-5 text-indigo-500" /> 情报源
                    </h3>
                    <button onClick={() => setShowSourceModal(true)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                    {sources.map(src => (
                        <div 
                            key={src.id}
                            onClick={() => setSelectedSource(src)}
                            className={`
                                p-3 rounded-xl cursor-pointer transition-all border
                                ${selectedSource?.id === src.id 
                                    ? 'bg-indigo-50 border-indigo-200 shadow-sm' 
                                    : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-200'}
                            `}
                        >
                            <div className="flex justify-between items-start">
                                <span className={`font-bold ${selectedSource?.id === src.id ? 'text-indigo-900' : 'text-slate-700'}`}>{src.name}</span>
                                <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border text-slate-400">{src.points_count} 节点</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-1 truncate">{src.main_url}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Points List */}
            <div className="flex-1 flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <RssIcon className="w-5 h-5 text-blue-500" /> 
                        {selectedSource ? `${selectedSource.name} - 采集节点` : '采集节点'}
                    </h3>
                    <div className="flex gap-2">
                        <button onClick={fetchPoints} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg">
                            <RefreshIcon className={`w-4 h-4 ${isPointsLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={() => setShowPointModal(true)}
                            disabled={!selectedSource}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                        >
                            <PlusIcon className="w-3.5 h-3.5" /> 新建节点
                        </button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {points.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                            暂无采集节点
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                            {points.map(point => (
                                <div key={point.id} className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all bg-white group">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${point.is_active ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                            <h4 className="font-bold text-slate-800">{point.name}</h4>
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleTogglePoint(point)} className={`p-1.5 rounded-lg ${point.is_active ? 'text-red-500 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                                                {point.is_active ? <StopIcon className="w-3.5 h-3.5"/> : <PlayIcon className="w-3.5 h-3.5"/>}
                                            </button>
                                            <button onClick={() => handleDeletePoint(point.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                <TrashIcon className="w-3.5 h-3.5"/>
                                            </button>
                                        </div>
                                    </div>
                                    <a href={point.url} target="_blank" className="text-xs text-slate-500 hover:text-blue-600 truncate block mb-3 flex items-center gap-1">
                                        <ExternalLinkIcon className="w-3 h-3"/> {point.url}
                                    </a>
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 bg-slate-50 p-2 rounded-lg">
                                        <span className="font-mono">{point.cron_schedule}</span>
                                        <span>上次运行: {point.last_crawl_time ? new Date(point.last_crawl_time).toLocaleDateString() : '-'}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showSourceModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
                        <h3 className="font-bold text-lg mb-4">新建情报源</h3>
                        <input value={newSourceName} onChange={e => setNewSourceName(e.target.value)} placeholder="名称 (e.g. 懂车帝)" className="w-full mb-3 p-2 border rounded-lg text-sm" />
                        <input value={newSourceUrl} onChange={e => setNewSourceUrl(e.target.value)} placeholder="主页 URL" className="w-full mb-6 p-2 border rounded-lg text-sm" />
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowSourceModal(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                            <button onClick={handleCreateSource} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">创建</button>
                        </div>
                    </div>
                </div>
            )}

            {showPointModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
                        <h3 className="font-bold text-lg mb-4">新建采集节点</h3>
                        <div className="space-y-3">
                            <input value={newPointData.name} onChange={e => setNewPointData({...newPointData, name: e.target.value})} placeholder="节点名称 (e.g. 行业新闻)" className="w-full p-2 border rounded-lg text-sm" />
                            <input value={newPointData.url} onChange={e => setNewPointData({...newPointData, url: e.target.value})} placeholder="列表页 URL" className="w-full p-2 border rounded-lg text-sm" />
                            <input value={newPointData.cron_schedule} onChange={e => setNewPointData({...newPointData, cron_schedule: e.target.value})} placeholder="CRON (e.g. */30 * * * *)" className="w-full p-2 border rounded-lg text-sm font-mono" />
                            <input value={newPointData.url_filters} onChange={e => setNewPointData({...newPointData, url_filters: e.target.value})} placeholder="URL过滤器 (逗号分隔)" className="w-full p-2 border rounded-lg text-sm" />
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowPointModal(false)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                            <button onClick={handleCreatePoint} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">创建</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Sub-View: Logs (Tasks) ---

const LogsPanel: React.FC = () => {
    const [tasks, setTasks] = useState<TaskPublic[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getTasks({ limit: 50 });
            setTasks(data);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const getStatusColor = (s: string) => {
        switch(s) {
            case 'completed': return 'text-green-600 bg-green-50';
            case 'processing': return 'text-blue-600 bg-blue-50';
            case 'failed': return 'text-red-600 bg-red-50';
            default: return 'text-slate-500 bg-slate-50';
        }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <ViewListIcon className="w-5 h-5 text-indigo-500" /> 运行日志
                </h3>
                <button onClick={fetchTasks} className="p-2 bg-white border rounded-lg shadow-sm hover:text-indigo-600">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0">
                            <tr>
                                <th className="px-6 py-3">任务ID</th>
                                <th className="px-6 py-3">节点</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">重试</th>
                                <th className="px-6 py-3">开始时间</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.map(t => (
                                <tr key={t.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-mono text-xs text-slate-400">{t.id.slice(0,8)}</td>
                                    <td className="px-6 py-3">
                                        <div className="font-bold text-slate-800">{t.point_name}</div>
                                        <div className="text-xs text-slate-400">{t.source_name}</div>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${getStatusColor(t.status)}`}>{t.status}</span>
                                    </td>
                                    <td className="px-6 py-3 text-xs">{t.retry_count}</td>
                                    <td className="px-6 py-3 text-xs font-mono">{t.start_time ? new Date(t.start_time).toLocaleString() : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Review (Pending) ---

const ReviewPanel: React.FC = () => {
    const [articles, setArticles] = useState<PendingArticlePublic[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const fetchPending = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getPendingArticles({ limit: 50 });
            setArticles(res.items || []);
            setSelectedIds(new Set());
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchPending(); }, [fetchPending]);

    const handleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleConfirm = async () => {
        if (selectedIds.size === 0) return;
        setIsActionLoading(true);
        try {
            await confirmPendingArticles(Array.from(selectedIds));
            fetchPending();
        } catch (e) { alert('操作失败'); } finally { setIsActionLoading(false); }
    };

    const handleReject = async () => {
        if (selectedIds.size === 0) return;
        setIsActionLoading(true);
        try {
            await rejectPendingArticles(Array.from(selectedIds));
            fetchPending();
        } catch (e) { alert('操作失败'); } finally { setIsActionLoading(false); }
    };

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-orange-500" /> 
                    内容审核 <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs">{articles.length}</span>
                </h3>
                <div className="flex gap-2">
                    <button onClick={fetchPending} className="p-2 bg-white border rounded-lg shadow-sm">
                        <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    {selectedIds.size > 0 && (
                        <>
                            <button onClick={handleReject} disabled={isActionLoading} className="px-4 py-2 bg-red-50 text-red-600 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-100">
                                拒绝 ({selectedIds.size})
                            </button>
                            <button onClick={handleConfirm} disabled={isActionLoading} className="px-4 py-2 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 shadow-md">
                                {isActionLoading ? <Spinner size="h-4 w-4" color="text-white"/> : '入库'} ({selectedIds.size})
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto p-4 space-y-3 custom-scrollbar bg-slate-50/50">
                    {articles.map(art => (
                        <div 
                            key={art.id} 
                            onClick={() => handleSelect(art.id)}
                            className={`
                                p-4 rounded-xl border bg-white cursor-pointer transition-all hover:shadow-md flex gap-4
                                ${selectedIds.has(art.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-200 hover:border-indigo-300'}
                            `}
                        >
                            <div className="pt-1">
                                <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedIds.has(art.id) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                                    {selectedIds.has(art.id) && <CheckIcon className="w-3.5 h-3.5 text-white" />}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-800 text-base mb-1 line-clamp-1">{art.title}</h4>
                                <p className="text-xs text-slate-500 line-clamp-2 mb-2">{art.content?.slice(0, 150)}...</p>
                                <div className="flex items-center gap-3 text-xs text-slate-400">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">{art.source_name}</span>
                                    <span>{new Date(art.created_at).toLocaleString()}</span>
                                    <a href={art.original_url} target="_blank" onClick={e=>e.stopPropagation()} className="text-blue-500 hover:underline flex items-center gap-1">
                                        <ExternalLinkIcon className="w-3 h-3" /> 原文
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                    {articles.length === 0 && !isLoading && (
                        <div className="h-full flex items-center justify-center text-slate-400">暂无待审核内容</div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Sub-View: Assets (Articles) ---

const AssetPanel: React.FC = () => {
    const [articles, setArticles] = useState<ArticlePublic[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchArticles = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await getArticles({ limit: 50 });
            setArticles(res.items || []);
        } catch (e) { console.error(e); } finally { setIsLoading(false); }
    }, []);

    useEffect(() => { fetchArticles(); }, [fetchArticles]);

    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <DatabaseIcon className="w-5 h-5 text-indigo-500" /> 情报资产库
                </h3>
                <button onClick={fetchArticles} className="p-2 bg-white border rounded-lg shadow-sm">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left text-slate-600">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold sticky top-0">
                            <tr>
                                <th className="px-6 py-3">标题</th>
                                <th className="px-6 py-3">来源</th>
                                <th className="px-6 py-3">发布时间</th>
                                <th className="px-6 py-3 text-right">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {articles.map(art => (
                                <tr key={art.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-3 font-bold text-slate-800 max-w-md truncate">
                                        <a href={art.original_url} target="_blank" className="hover:text-indigo-600">{art.title}</a>
                                    </td>
                                    <td className="px-6 py-3">
                                        <span className="text-xs bg-slate-100 px-2 py-1 rounded">{art.source_name}</span>
                                    </td>
                                    <td className="px-6 py-3 text-xs font-mono">{art.publish_date ? new Date(art.publish_date).toLocaleDateString() : '-'}</td>
                                    <td className="px-6 py-3 text-right">
                                        <a href={art.original_url} target="_blank" className="text-indigo-600 hover:underline text-xs">查看</a>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

// --- Main Container ---

export const IntelligenceDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'config' | 'logs' | 'review' | 'assets'>('config');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Navigation Header */}
            <div className="bg-white border-b border-slate-200 px-6 flex justify-between items-center shadow-sm z-10">
                <div className="flex gap-2">
                    <TabButton active={activeTab === 'config'} onClick={() => setActiveTab('config')} icon={ServerIcon} label="采集配置" />
                    <TabButton active={activeTab === 'logs'} onClick={() => setActiveTab('logs')} icon={ViewListIcon} label="运行日志" />
                    <TabButton active={activeTab === 'review'} onClick={() => setActiveTab('review')} icon={ShieldCheckIcon} label="内容审核" />
                    <TabButton active={activeTab === 'assets'} onClick={() => setActiveTab('assets')} icon={DatabaseIcon} label="情报资产" />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'config' && <ConfigPanel />}
                {activeTab === 'logs' && <LogsPanel />}
                {activeTab === 'review' && <ReviewPanel />}
                {activeTab === 'assets' && <AssetPanel />}
            </div>
        </div>
    );
};