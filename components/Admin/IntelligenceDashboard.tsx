
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
    getSourcesAndPoints, createPoint, createGenericPoint, updateGenericPoint, deleteSource, deletePoints, 
    toggleSource, togglePoint, checkPointHealth, runCrawlerSource, runGenericPoint,
    getIntelligenceStats, getGenericTasks,
    getPendingArticles, getPendingArticleDetail, confirmPendingArticles, rejectPendingArticles,
    getArticles, getArticleHtml, generateArticlePdf, downloadArticlePdf,
    IntelligenceSourcePublic, IntelligencePointPublic, GenericCrawlerTaskPublic, 
    PendingArticlePublic, ArticlePublic, DashboardSource, DashboardPoint
} from '../../api/intelligence';
import { 
    ServerIcon, RssIcon, ViewListIcon, CheckCircleIcon, DatabaseIcon, 
    PlusIcon, RefreshIcon, PlayIcon, StopIcon, TrashIcon, 
    ExternalLinkIcon, ClockIcon, SearchIcon, ShieldCheckIcon,
    ShieldExclamationIcon, QuestionMarkCircleIcon, DownloadIcon,
    ChartIcon, GearIcon, CloseIcon, EyeIcon, CheckIcon, DocumentTextIcon,
    SparklesIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';
import { PendingArticlesManager } from './PendingArticlesManager';
import { IntelligenceDataManager } from './IntelligenceDataManager';
import { IntelligenceChunkManager } from './IntelligenceChunkManager';
import { LlmSortingManager } from './LlmSortingManager';
import { GeminiSettingsManager } from './GeminiSettingsManager';
import { IntelligencePointModal } from './IntelligencePointModal'; // Import the modal

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
    const [sources, setSources] = useState<DashboardSource[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
    
    // Modal & Action States
    const [isPointModalOpen, setIsPointModalOpen] = useState(false);
    const [pointToEdit, setPointToEdit] = useState<any | null>(null);
    
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
        setPointToEdit(null);
        setIsPointModalOpen(true);
    };

    const handleOpenEdit = (point: DashboardPoint) => {
        setPointToEdit(point);
        setIsPointModalOpen(true);
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

    const handleHealthCheck = async (point: DashboardPoint) => {
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

    const handleRunNow = async (source: DashboardSource, point?: DashboardPoint) => {
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
                        <PlusIcon className="w-3.5 h-3.5" /> 新建情报点
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
                <IntelligencePointModal 
                    onClose={() => setIsPointModalOpen(false)} 
                    onSuccess={fetchData} 
                    pointToEdit={pointToEdit} 
                    sources={sources.map(s => ({ ...s, id: s.id, source_name: s.source_name }))}
                />
            )}
        </div>
    );
};

export const IntelligenceDashboard: React.FC = () => {
    const [tab, setTab] = useState<'overview' | 'config' | 'pending' | 'data' | 'chunks' | 'llm' | 'settings'>('overview');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header Tabs */}
            <div className="bg-white border-b px-6 pt-6 pb-0 flex-shrink-0 shadow-sm z-20 overflow-x-auto">
                <h1 className="text-2xl font-extrabold text-slate-800 mb-6 tracking-tight">情报中台管理</h1>
                <div className="flex gap-8">
                    <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={ChartIcon} label="概览" />
                    <TabButton active={tab === 'config'} onClick={() => setTab('config')} icon={ServerIcon} label="采集配置" />
                    <TabButton active={tab === 'pending'} onClick={() => setTab('pending')} icon={CheckCircleIcon} label="待审核" />
                    <TabButton active={tab === 'data'} onClick={() => setTab('data')} icon={DatabaseIcon} label="情报库" />
                    <TabButton active={tab === 'chunks'} onClick={() => setTab('chunks')} icon={ViewListIcon} label="向量索引" />
                    <TabButton active={tab === 'llm'} onClick={() => setTab('llm')} icon={SparklesIcon} label="LLM任务" />
                    <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={GearIcon} label="设置" />
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative">
                {tab === 'overview' && <OverviewPanel />}
                {tab === 'config' && <ConfigPanel />}
                {tab === 'pending' && <PendingArticlesManager />}
                {tab === 'data' && <IntelligenceDataManager />}
                {tab === 'chunks' && <IntelligenceChunkManager />}
                {tab === 'llm' && <LlmSortingManager />}
                {tab === 'settings' && <GeminiSettingsManager />}
            </div>
        </div>
    );
};
