
import React, { useState, useEffect, useCallback } from 'react';
import { 
    getSources, createSource, deleteSource,
    getPoints, deletePoints, togglePoint, runPoint, runSource,
    IntelligenceSourcePublic, IntelligencePointPublic
} from '../../api/intelligence';
import { 
    ServerIcon, RssIcon, ViewListIcon, CheckCircleIcon, DatabaseIcon, 
    PlusIcon, RefreshIcon, PlayIcon, StopIcon, TrashIcon, 
    ClockIcon, ChartIcon, GearIcon, SparklesIcon, CloseIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';
import { PendingArticlesManager } from './PendingArticlesManager';
import { IntelligenceDataManager } from './IntelligenceDataManager';
import { IntelligenceChunkManager } from './IntelligenceChunkManager';
import { LlmSortingManager } from './LlmSortingManager';
import { GeminiSettingsManager } from './GeminiSettingsManager';
import { IntelligencePointModal } from './IntelligencePointModal';
import { IntelligenceStats } from './IntelligenceTaskManager';
import { IntelligenceTasksPanel } from './IntelligenceTasksPanel';

// --- Shared Components ---

const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; label: string }> = ({ active, onClick, icon: Icon, label }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all duration-300 whitespace-nowrap flex-shrink-0 ${active ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
    >
        <Icon className={`w-5 h-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
        {label}
        {active && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-600 rounded-t-full animate-in fade-in zoom-in duration-300"></span>}
    </button>
);

// --- Tasks Modal ---
const TasksModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-in fade-in zoom-in-95">
        <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="absolute top-4 right-4 z-10">
                <button onClick={onClose} className="p-2 bg-white/80 hover:bg-slate-100 rounded-full text-slate-500 hover:text-slate-800 transition-colors shadow-sm border border-slate-200">
                    <CloseIcon className="w-5 h-5" />
                </button>
            </div>
            <IntelligenceTasksPanel />
        </div>
    </div>
);

// --- Overview Panel (Integrated Stats + Config + Task Trigger) ---

const OverviewPanel: React.FC = () => {
    // --- Config State ---
    const [sources, setSources] = useState<IntelligenceSourcePublic[]>([]);
    const [selectedSource, setSelectedSource] = useState<IntelligenceSourcePublic | null>(null);
    const [points, setPoints] = useState<IntelligencePointPublic[]>([]);
    
    // UI States
    const [isLoadingSources, setIsLoadingSources] = useState(false);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const [showCreateSource, setShowCreateSource] = useState(false);
    const [newSourceForm, setNewSourceForm] = useState({ name: '', main_url: '' });
    
    // Modals
    const [isPointModalOpen, setIsPointModalOpen] = useState(false);
    const [isTasksModalOpen, setIsTasksModalOpen] = useState(false);
    
    // Delete Confirmation
    const [confirmDelete, setConfirmDelete] = useState<{ type: 'source' | 'point', data: any } | null>(null);

    const fetchSources = useCallback(async () => {
        setIsLoadingSources(true);
        try {
            const res = await getSources();
            setSources(res);
            // Auto-select first source if none selected
            if (!selectedSource && res.length > 0) {
                setSelectedSource(res[0]);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoadingSources(false); }
    }, [selectedSource]);

    useEffect(() => { fetchSources(); }, [fetchSources]);

    const fetchPoints = useCallback(async () => {
        if (!selectedSource) return;
        setIsLoadingPoints(true);
        try {
            const pts = await getPoints({ source_name: selectedSource.name });
            setPoints(pts);
        } catch (e) { console.error(e); }
        finally { setIsLoadingPoints(false); }
    }, [selectedSource]);

    useEffect(() => { fetchPoints(); }, [fetchPoints]);

    const handleCreateSource = async () => {
        if (!newSourceForm.name || !newSourceForm.main_url) return;
        try {
            const newSrc = await createSource(newSourceForm);
            setSources(prev => [...prev, newSrc]);
            setSelectedSource(newSrc);
            setNewSourceForm({ name: '', main_url: '' });
            setShowCreateSource(false);
        } catch (e) { alert('创建失败'); }
    };

    const handleDeleteSource = async () => {
        if (!confirmDelete || confirmDelete.type !== 'source') return;
        try {
            const res = await deleteSource(confirmDelete.data.name);
            alert(`已删除源 "${res.deleted_source}"，包含 ${res.deleted_points} 个采集点和 ${res.deleted_tasks} 个任务。`);
            setConfirmDelete(null);
            setSelectedSource(null);
            fetchSources();
        } catch (e) { alert('删除失败'); }
    };

    const handleDeletePoint = async () => {
        if (!confirmDelete || confirmDelete.type !== 'point') return;
        try {
            await deletePoints([confirmDelete.data.id]);
            setConfirmDelete(null);
            fetchPoints();
        } catch (e) { alert('删除失败'); }
    };

    const handleTogglePoint = async (point: IntelligencePointPublic) => {
        const currentStatus = point.enabled ?? point.is_active;
        try {
            await togglePoint(point.id, !currentStatus);
            // Optimistic update
            setPoints(prev => prev.map(p => p.id === point.id ? { ...p, is_active: !currentStatus, enabled: !currentStatus } : p));
        } catch (e) { alert('操作失败'); }
    };

    const handleRunPoint = async (point: IntelligencePointPublic) => {
        try {
            await runPoint(point.id);
            alert('采集任务已触发');
        } catch (e) { alert('启动失败'); }
    };

    const handleRunSource = async (source: IntelligenceSourcePublic) => {
        try {
            const res = await runSource(source.name);
            alert(`已触发 ${source.name} 下所有采集点任务，共创建 ${res.created_tasks} 个任务。`);
        } catch (e) { alert('启动失败'); }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* 1. Top Area: Stats & Task Trigger */}
            <div className="flex-shrink-0 p-6 pb-0 space-y-6">
                <div className="flex justify-end">
                    <button 
                        onClick={() => setIsTasksModalOpen(true)}
                        className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md transition-all group"
                    >
                        <ClockIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-500" />
                        <span>查看系统任务队列</span>
                    </button>
                </div>
                
                <IntelligenceStats compact={false} />
            </div>

            {/* 2. Main Area: Integrated Config Panel */}
            <div className="flex-1 min-h-0 flex flex-col md:flex-row p-6 gap-6 overflow-hidden">
                
                {/* Left: Sources List */}
                <div className="w-full md:w-72 bg-white rounded-2xl border border-slate-200 flex flex-col flex-shrink-0 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                            <ServerIcon className="w-4 h-4 text-indigo-600" /> 情报源
                        </h3>
                        <button 
                            onClick={() => setShowCreateSource(true)}
                            className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" 
                            title="添加源"
                        >
                            <PlusIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {showCreateSource && (
                        <div className="p-3 bg-indigo-50 border-b border-indigo-100 animate-in slide-in-from-top-2">
                            <input 
                                className="w-full text-xs p-2 rounded border border-indigo-200 mb-2 focus:outline-none focus:border-indigo-500"
                                placeholder="源名称 (如: 懂车帝)"
                                value={newSourceForm.name}
                                onChange={e => setNewSourceForm({...newSourceForm, name: e.target.value})}
                            />
                            <input 
                                className="w-full text-xs p-2 rounded border border-indigo-200 mb-2 focus:outline-none focus:border-indigo-500"
                                placeholder="主页 URL"
                                value={newSourceForm.main_url}
                                onChange={e => setNewSourceForm({...newSourceForm, main_url: e.target.value})}
                            />
                            <div className="flex gap-2">
                                <button onClick={handleCreateSource} disabled={!newSourceForm.name} className="flex-1 bg-indigo-600 text-white text-xs py-1.5 rounded font-bold hover:bg-indigo-700 disabled:opacity-50">确认</button>
                                <button onClick={() => setShowCreateSource(false)} className="flex-1 bg-white text-slate-600 text-xs py-1.5 rounded border border-slate-200 hover:bg-slate-50">取消</button>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                        {isLoadingSources ? (
                            <div className="text-center py-4 text-slate-400 text-xs">加载中...</div>
                        ) : sources.length === 0 ? (
                            <div className="text-center py-4 text-slate-400 text-xs">暂无情报源</div>
                        ) : (
                            sources.map(src => (
                                <div 
                                    key={src.id}
                                    onClick={() => setSelectedSource(src)}
                                    className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all border ${
                                        selectedSource?.id === src.id 
                                        ? 'bg-indigo-50 border-indigo-100 shadow-sm' 
                                        : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
                                    }`}
                                >
                                    <div className="min-w-0">
                                        <div className={`text-sm font-bold truncate ${selectedSource?.id === src.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                                            {src.name}
                                        </div>
                                        <div className="text-[10px] text-slate-400 flex gap-2">
                                            <span>{src.points_count} 采集点</span>
                                            {/* <span>{src.articles_count} 文章</span> */}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setConfirmDelete({ type: 'source', data: src }); }}
                                        className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <TrashIcon className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right: Points Area */}
                <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg flex-shrink-0">
                                <RssIcon className="w-5 h-5" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 truncate">
                                    {selectedSource ? selectedSource.name : '请选择情报源'}
                                </h2>
                                {selectedSource && <p className="text-xs text-slate-400 truncate max-w-[200px] md:max-w-md">{selectedSource.main_url}</p>}
                            </div>
                        </div>
                        {selectedSource && (
                            <div className="flex gap-2 flex-shrink-0">
                                <button onClick={() => handleRunSource(selectedSource)} className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 text-indigo-600 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-50 hover:border-indigo-200 transition-colors">
                                    <PlayIcon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">全部运行</span>
                                </button>
                                <button onClick={fetchPoints} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors">
                                    <RefreshIcon className={`w-5 h-5 ${isLoadingPoints ? 'animate-spin' : ''}`} />
                                </button>
                                <button 
                                    onClick={() => setIsPointModalOpen(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold shadow-md hover:bg-indigo-700 transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <PlusIcon className="w-4 h-4" /> 
                                    <span className="hidden sm:inline">新建采集点</span>
                                    <span className="sm:hidden">新建</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/30 custom-scrollbar">
                        {!selectedSource ? (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400">
                                <ServerIcon className="w-12 h-12 mb-3 opacity-20" />
                                <p>请从左侧选择一个情报源以管理采集配置</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {points.length === 0 && !isLoadingPoints ? (
                                    <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-sm">
                                        该源下暂无采集点，请点击右上角新建。
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                        {points.map(point => {
                                            const isActive = point.enabled ?? point.is_active;
                                            return (
                                                <div key={point.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                                                    <div className={`absolute top-0 left-0 bottom-0 w-1 ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                                                    <div className="pl-3 flex flex-col h-full justify-between">
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="min-w-0 pr-2">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <h5 className="font-bold text-slate-800 truncate">{point.name}</h5>
                                                                    {point.extra_hint && <span className="text-[10px] bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded border border-purple-100 font-medium">Generic</span>}
                                                                </div>
                                                                <a href={point.url} target="_blank" className="text-xs text-slate-400 hover:text-indigo-500 truncate block font-mono mt-0.5" title={point.url}>{point.url}</a>
                                                            </div>
                                                            <div className="flex gap-1 flex-shrink-0">
                                                                <button 
                                                                    onClick={() => handleRunPoint(point)}
                                                                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded transition-colors" 
                                                                    title="立即运行"
                                                                >
                                                                    <PlayIcon className="w-4 h-4" />
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleTogglePoint(point)}
                                                                    className={`p-1.5 rounded transition-colors ${isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:bg-slate-50'}`}
                                                                    title={isActive ? "暂停" : "启用"}
                                                                >
                                                                    {isActive ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                                                                </button>
                                                                <button 
                                                                    onClick={() => setConfirmDelete({ type: 'point', data: point })}
                                                                    className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50">
                                                            <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded"><ClockIcon className="w-3 h-3"/> {point.cron_schedule}</span>
                                                            {point.pagination_type && (
                                                                <span className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100">
                                                                    {point.pagination_type === 'click' ? '点击翻页' : '滚动加载'}
                                                                </span>
                                                            )}
                                                            {point.last_crawl_time && <span className="text-slate-400 ml-auto">上次: {new Date(point.last_crawl_time).toLocaleString()}</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {isPointModalOpen && selectedSource && (
                <IntelligencePointModal 
                    onClose={() => setIsPointModalOpen(false)} 
                    onSuccess={fetchPoints} 
                    pointToEdit={null} // Create Mode
                    sources={[selectedSource]} 
                    preSelectedSourceId={selectedSource.name}
                />
            )}

            {isTasksModalOpen && <TasksModal onClose={() => setIsTasksModalOpen(false)} />}

            {confirmDelete && (
                <ConfirmationModal 
                    title={confirmDelete.type === 'source' ? '删除情报源' : '删除采集点'}
                    message={confirmDelete.type === 'source' 
                        ? `确定删除 "${confirmDelete.data.name}" 吗？该操作将同时删除其下所有采集点和历史任务。`
                        : `确定删除采集点 "${confirmDelete.data.name}" 吗？`
                    }
                    onConfirm={confirmDelete.type === 'source' ? handleDeleteSource : handleDeletePoint}
                    onCancel={() => setConfirmDelete(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};

// --- Main Layout ---
export const IntelligenceDashboard: React.FC = () => {
    const [tab, setTab] = useState<'overview' | 'pending' | 'data' | 'chunks' | 'llm' | 'settings'>('overview');

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header Tabs */}
            <div className="bg-white border-b px-6 pt-6 pb-0 flex-shrink-0 shadow-sm z-20 overflow-x-auto">
                <div className="flex gap-4 md:gap-8">
                    <TabButton active={tab === 'overview'} onClick={() => setTab('overview')} icon={ChartIcon} label="概览与配置" />
                    <TabButton active={tab === 'pending'} onClick={() => setTab('pending')} icon={CheckCircleIcon} label="待审文章" />
                    <TabButton active={tab === 'data'} onClick={() => setTab('data')} icon={DatabaseIcon} label="情报资产" />
                    <TabButton active={tab === 'chunks'} onClick={() => setTab('chunks')} icon={ViewListIcon} label="向量索引" />
                    <TabButton active={tab === 'llm'} onClick={() => setTab('llm')} icon={SparklesIcon} label="LLM任务" />
                    <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={GearIcon} label="设置" />
                </div>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative">
                {tab === 'overview' && <OverviewPanel />}
                {tab === 'pending' && <PendingArticlesManager />}
                {tab === 'data' && <IntelligenceDataManager />}
                {tab === 'chunks' && <IntelligenceChunkManager />}
                {tab === 'llm' && <LlmSortingManager />}
                {tab === 'settings' && <GeminiSettingsManager />}
            </div>
        </div>
    );
};
