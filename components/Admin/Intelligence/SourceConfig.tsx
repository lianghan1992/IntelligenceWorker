

import React, { useState, useEffect, useCallback } from 'react';
import { SpiderSource, SpiderPoint, IntelligencePointPublic } from '../../../types';
import { 
    getSpiderSources, createSpiderSource, getSpiderPoints, triggerSpiderTask,
    deleteSource, deleteSpiderPoint, disableSpiderPoint, enableSpiderPoint
} from '../../../api/intelligence';
import { ServerIcon, PlusIcon, RefreshIcon, PlayIcon, RssIcon, TrashIcon, ClockIcon, ViewListIcon, StopIcon, CheckCircleIcon, PencilIcon, DocumentTextIcon } from '../../icons';
import { PointModal } from './PointModal';
import { TaskDrawer } from './TaskDrawer';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// Helper to format Cron nicely
const formatCronDisplay = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length !== 5) return cron;

    const [mm, hh, dom, mon, dow] = parts;
    const time = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;

    if (dom.startsWith('*/') && mon === '*' && dow === '*') {
        const days = dom.substring(2);
        return `每 ${days} 天 ${time}`;
    }
    if (dom === '*' && mon === '*' && dow === '*') {
        return `每天 ${time}`;
    }
    if (dom === '*' && mon === '*' && !isNaN(parseInt(dow))) {
        const days = ['日', '一', '二', '三', '四', '五', '六'];
        return `每周${days[parseInt(dow)]} ${time}`;
    }
    if (!isNaN(parseInt(dom)) && mon === '*' && dow === '*') {
        return `每月 ${dom} 日 ${time}`;
    }
    return cron;
};

export const SourceConfig: React.FC = () => {
    const [sources, setSources] = useState<SpiderSource[]>([]);
    const [selectedSource, setSelectedSource] = useState<SpiderSource | null>(null);
    const [points, setPoints] = useState<SpiderPoint[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(false);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const [runningPointId, setRunningPointId] = useState<string | null>(null);

    // Modal States
    const [isCreateSourceModalOpen, setIsCreateSourceModalOpen] = useState(false);
    const [isCreatePointModalOpen, setIsCreatePointModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<SpiderPoint | null>(null);
    const [drawerPoint, setDrawerPoint] = useState<SpiderPoint | null>(null);
    
    // Action States
    const [deletingSource, setDeletingSource] = useState<SpiderSource | null>(null);
    const [deletingPoint, setDeletingPoint] = useState<SpiderPoint | null>(null);
    const [togglingPointId, setTogglingPointId] = useState<string | null>(null);
    
    // Forms
    const [sourceForm, setSourceForm] = useState({ name: '', main_url: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchSources = useCallback(async () => {
        setIsLoadingSources(true);
        try {
            const res = await getSpiderSources();
            setSources(res);
            
            setSelectedSource(prev => {
                // If list is empty, clear selection
                if (!res || res.length === 0) return null;
                
                // If no previous selection, select first
                if (!prev) return res[0];
                
                // Try to find the previously selected item in the new list to update counts
                const found = res.find(s => s.uuid === prev.uuid);
                
                // If found, return the new object (with updated counts), otherwise fallback to first
                return found || res[0];
            });
        } catch (e) { console.error(e); }
        finally { setIsLoadingSources(false); }
    }, []);

    const fetchPoints = useCallback(async () => {
        if (!selectedSource) {
            setPoints([]);
            return;
        }
        setIsLoadingPoints(true);
        try {
            const res = await getSpiderPoints(selectedSource.uuid);
            setPoints(res);
        } catch (e) { console.error(e); }
        finally { setIsLoadingPoints(false); }
    }, [selectedSource]);

    useEffect(() => { fetchSources(); }, [fetchSources]);
    useEffect(() => { fetchPoints(); }, [fetchPoints]);

    const handleCreateSource = async () => {
        if (!sourceForm.name || !sourceForm.main_url) {
            alert('请填写名称和主站链接');
            return;
        }
        setIsSubmitting(true);
        try {
            const newSource = await createSpiderSource(sourceForm);
            setSources([...sources, newSource]);
            setSelectedSource(newSource);
            setSourceForm({ name: '', main_url: '' });
            setIsCreateSourceModalOpen(false);
        } catch (e) { alert('创建情报源失败'); }
        finally { setIsSubmitting(false); }
    };

    const handleTriggerTask = async (pointId: string, type: 'initial' | 'incremental') => {
        setRunningPointId(pointId);
        try {
            await triggerSpiderTask({ point_uuid: pointId, task_type: type });
            // Refresh list to update status if applicable, though crawl takes time.
            setTimeout(fetchPoints, 1000); 
        } catch (e) { alert('触发任务失败'); }
        finally { setRunningPointId(null); }
    };

    const handleDeleteSourceConfirm = async () => {
        if (!deletingSource) return;
        try {
            await deleteSource(deletingSource.uuid);
            // Clear selection if deleted
            if (selectedSource?.uuid === deletingSource.uuid) {
                setSelectedSource(null);
                setPoints([]);
            }
            await fetchSources();
            setDeletingSource(null);
        } catch (e) { alert('删除失败'); }
    };

    const handleDeletePointConfirm = async () => {
        if (!deletingPoint) return;
        try {
            await deleteSpiderPoint(deletingPoint.uuid);
            await fetchPoints();
            setDeletingPoint(null);
        } catch (e) { alert('删除失败'); }
    };

    const handleTogglePointStatus = async (point: SpiderPoint) => {
        setTogglingPointId(point.uuid);
        try {
            if (point.is_active) {
                await disableSpiderPoint(point.uuid);
            } else {
                await enableSpiderPoint(point.uuid);
            }
            await fetchPoints(); // Refresh from server to ensure sync
        } catch (e) {
            alert('操作失败');
        } finally {
            setTogglingPointId(null);
        }
    };

    /**
     * Fix: Helper to map SpiderPoint to IntelligencePointPublic.
     */
    const getMappedPointToEdit = (p: SpiderPoint | null): IntelligencePointPublic | null => {
        if (!p) return null;
        return {
            ...p,
            id: p.uuid,
            point_name: p.name,
            point_url: p.url,
            url_filters: [],
            extra_hint: '',
            status: p.is_active ? 'active' : 'inactive',
            created_at: '',
            updated_at: ''
        };
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-4 md:gap-6 relative overflow-hidden">
            {/* Left: Sources List */}
            <div className="w-full md:w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden shadow-sm h-48 md:h-full transition-all">
                <div className="p-3 md:p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2 text-sm md:text-base">
                        <ServerIcon className="w-4 h-4 text-indigo-600"/> 情报源列表
                    </h3>
                    <button onClick={fetchSources} className="p-1.5 hover:bg-gray-200 rounded text-gray-500"><RefreshIcon className="w-4 h-4"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                    {sources.map(src => (
                        <div 
                            key={src.uuid} 
                            className={`group flex items-center justify-between w-full px-3 py-2 md:px-4 md:py-3 rounded-lg text-sm font-medium transition-all border border-transparent ${selectedSource?.uuid === src.uuid ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setSelectedSource(src)}>
                                <div className="flex justify-between items-center">
                                    <span className="truncate pr-2">{src.name}</span>
                                    {selectedSource?.uuid === src.uuid && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></div>}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    {src.total_articles !== undefined && (
                                        <span className="text-[10px] text-gray-400 bg-white px-1.5 rounded border border-gray-100 flex items-center gap-1">
                                            <DocumentTextIcon className="w-3 h-3"/> {src.total_articles}
                                        </span>
                                    )}
                                    {src.main_url && <div className="text-[10px] text-gray-400 truncate">{src.main_url}</div>}
                                </div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setDeletingSource(src); }}
                                className="ml-2 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-opacity opacity-0 group-hover:opacity-100 focus:opacity-100"
                                title="删除情报源"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {sources.length === 0 && !isLoadingSources && <div className="text-center text-xs text-gray-400 py-8">暂无情报源</div>}
                </div>
                <div className="p-2 md:p-3 border-t bg-gray-50">
                    <button 
                        onClick={() => setIsCreateSourceModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-bold hover:bg-gray-50 hover:text-indigo-600 transition-colors shadow-sm"
                    >
                        <PlusIcon className="w-4 h-4" /> 新建情报源
                    </button>
                </div>
            </div>

            {/* Right: Points & Config */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-0">
                {!selectedSource ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-6">
                        <ServerIcon className="w-12 h-12 opacity-20 mb-2"/>
                        <p className="text-center text-sm">请选择一个情报源以管理其采集点</p>
                    </div>
                ) : (
                    <>
                        <div className="p-3 md:p-5 border-b bg-white flex justify-between items-center">
                            <div className="min-w-0 flex-1 mr-4">
                                <h3 className="text-base md:text-lg font-bold text-gray-800 flex items-center gap-2 truncate">
                                    {selectedSource.name}
                                    <span className="hidden md:inline-block text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">ID: {selectedSource.uuid.slice(0,8)}</span>
                                </h3>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{selectedSource.main_url || '无主站链接'}</p>
                            </div>
                            <div className="flex gap-2 md:gap-3 flex-shrink-0">
                                <button onClick={fetchPoints} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 border border-transparent hover:border-gray-200"><RefreshIcon className={`w-4 h-4 ${isLoadingPoints?'animate-spin':''}`}/></button>
                                <button 
                                    onClick={() => { setEditingPoint(null); setIsCreatePointModalOpen(true); }}
                                    className="flex items-center gap-1 px-3 py-1.5 md:px-4 md:py-2 bg-indigo-600 text-white rounded-lg text-xs md:text-sm font-bold hover:bg-indigo-700 shadow-md transition-all whitespace-nowrap"
                                >
                                    <PlusIcon className="w-3.5 h-3.5 md:w-4 md:h-4" /> 新建采集点
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto bg-slate-50/50 p-3 md:p-6 custom-scrollbar">
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 md:gap-4">
                                {points.map(point => (
                                    <div key={point.uuid} className="bg-white rounded-xl border border-gray-200 p-4 md:p-5 shadow-sm hover:shadow-md transition-all group">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="min-w-0 pr-2">
                                                <h4 className="font-bold text-gray-800 truncate">{point.name}</h4>
                                                <a href={point.url} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline truncate block mt-0.5" title={point.url}>{point.url}</a>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${point.is_active ? 'bg-green-50 text-green-700 border-green-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                                                    {point.is_active ? 'Active' : 'Disabled'}
                                                </span>
                                                <button 
                                                    onClick={() => { setEditingPoint(point); setIsCreatePointModalOpen(true); }}
                                                    className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                    title="编辑"
                                                >
                                                    <PencilIcon className="w-4 h-4"/>
                                                </button>
                                                <button onClick={() => setDeletingPoint(point)} className="text-gray-400 hover:text-red-500 transition-colors" title="删除">
                                                    <TrashIcon className="w-4 h-4"/>
                                                </button>
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4 bg-gray-50 p-2 md:p-3 rounded-lg">
                                            <div className="col-span-2">
                                                <span className="text-gray-400">调度规则:</span> 
                                                <span className="font-bold text-indigo-600 ml-1" title={point.cron_schedule}>
                                                    {formatCronDisplay(point.cron_schedule)}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">文章总数:</span>
                                                <span className="font-bold text-gray-700 ml-1">{point.total_articles || 0}</span>
                                            </div>
                                            <div>
                                                <span className="text-gray-400">上次采集:</span> 
                                                {point.last_crawled_at ? new Date(point.last_crawled_at).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'}) : 'Never'}
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setDrawerPoint(point)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs"
                                                    title="查看任务日志"
                                                >
                                                    <ViewListIcon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">日志</span>
                                                </button>
                                                <button 
                                                    onClick={() => handleTogglePointStatus(point)}
                                                    disabled={togglingPointId === point.uuid}
                                                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs ${point.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-green-600 hover:bg-green-50'}`}
                                                    title={point.is_active ? "禁用" : "启用"}
                                                >
                                                    {togglingPointId === point.uuid ? <Spinner /> : (point.is_active ? <StopIcon className="w-4 h-4"/> : <CheckCircleIcon className="w-4 h-4"/>)}
                                                    <span className="hidden sm:inline">{point.is_active ? '禁用' : '启用'}</span>
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => handleTriggerTask(point.uuid, 'initial')}
                                                    disabled={runningPointId === point.uuid}
                                                    className="px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                                                    title="首次爬取 (Initial)"
                                                >
                                                    {runningPointId === point.uuid ? <Spinner /> : <PlayIcon className="w-3.5 h-3.5" />} 
                                                    首次
                                                </button>
                                                <button 
                                                    onClick={() => handleTriggerTask(point.uuid, 'incremental')}
                                                    disabled={runningPointId === point.uuid}
                                                    className="px-2 py-1 md:px-3 md:py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:bg-indigo-400"
                                                    title="增量爬取 (Incremental)"
                                                >
                                                    {runningPointId === point.uuid ? <Spinner /> : <PlayIcon className="w-3.5 h-3.5" />} 
                                                    增量
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {points.length === 0 && !isLoadingPoints && (
                                    <div className="col-span-full text-center py-20 text-gray-400 italic">暂无采集点，请点击新建</div>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Create Source Modal */}
            {isCreateSourceModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-in fade-in zoom-in-95">
                    <div className="bg-white rounded-xl w-full max-w-md p-6 shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">新建情报源</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">源名称 <span className="text-red-500">*</span></label>
                                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. 盖世汽车" value={sourceForm.name} onChange={e => setSourceForm({...sourceForm, name: e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">主站链接 <span className="text-red-500">*</span></label>
                                <input className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="https://..." value={sourceForm.main_url} onChange={e => setSourceForm({...sourceForm, main_url: e.target.value})} />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setIsCreateSourceModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-200">取消</button>
                            <button onClick={handleCreateSource} disabled={isSubmitting} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                                {isSubmitting && <Spinner />} 创建
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Point Modal */}
            <PointModal 
                isOpen={isCreatePointModalOpen}
                onClose={() => { setIsCreatePointModalOpen(false); setEditingPoint(null); }}
                onSave={() => { fetchPoints(); setEditingPoint(null); }}
                sourceId={selectedSource?.uuid}
                pointToEdit={getMappedPointToEdit(editingPoint)}
            />

            {/* Task Drawer */}
            {drawerPoint && (
                <TaskDrawer 
                    point={drawerPoint} 
                    onClose={() => setDrawerPoint(null)} 
                />
            )}

            {/* Confirmation Modals */}
            {deletingSource && (
                <ConfirmationModal
                    title="删除情报源"
                    message={`确定要删除 "${deletingSource.name}" 及其所有关联的采集点吗？此操作将停止所有相关任务。`}
                    onConfirm={handleDeleteSourceConfirm}
                    onCancel={() => setDeletingSource(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}

            {deletingPoint && (
                <ConfirmationModal
                    title="删除采集点"
                    message={`确定要删除 "${deletingPoint.name}" 吗？此操作将停止该采集点的所有任务。`}
                    onConfirm={handleDeletePointConfirm}
                    onCancel={() => setDeletingPoint(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
