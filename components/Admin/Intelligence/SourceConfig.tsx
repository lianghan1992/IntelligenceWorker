
import React, { useState, useEffect, useCallback } from 'react';
import { SpiderSource, SpiderPoint } from '../../../types';
import { getSpiderSources, createSpiderSource, getSpiderPoints, triggerSpiderTask } from '../../../api/intelligence';
import { ServerIcon, PlusIcon, RefreshIcon, PlayIcon, RssIcon, TrashIcon, ClockIcon, ViewListIcon } from '../../icons';
import { PointModal } from './PointModal';
import { TaskDrawer } from './TaskDrawer';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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
    const [drawerPoint, setDrawerPoint] = useState<SpiderPoint | null>(null);
    
    // Forms
    const [sourceForm, setSourceForm] = useState({ name: '', main_url: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchSources = useCallback(async () => {
        setIsLoadingSources(true);
        try {
            const res = await getSpiderSources();
            setSources(res);
            if (res.length > 0 && !selectedSource) {
                setSelectedSource(res[0]);
            }
        } catch (e) { console.error(e); }
        finally { setIsLoadingSources(false); }
    }, [selectedSource]);

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
            // Task triggered successfully, button state change provides feedback
        } catch (e) { alert('触发任务失败'); }
        finally { setRunningPointId(null); }
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
                        <button
                            key={src.uuid}
                            onClick={() => setSelectedSource(src)}
                            className={`w-full text-left px-3 py-2 md:px-4 md:py-3 rounded-lg text-sm font-medium transition-all border border-transparent ${selectedSource?.uuid === src.uuid ? 'bg-indigo-50 text-indigo-700 border-indigo-100 shadow-sm' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            <div className="flex justify-between items-center">
                                <span className="truncate pr-2">{src.name}</span>
                                {selectedSource?.uuid === src.uuid && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 flex-shrink-0"></div>}
                            </div>
                            {src.main_url && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{src.main_url}</div>}
                        </button>
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
                                    onClick={() => setIsCreatePointModalOpen(true)}
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
                                            <div className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${point.is_active ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-gray-100 text-gray-500'}`}>
                                                {point.is_active ? 'Active' : 'Inactive'}
                                            </div>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4 bg-gray-50 p-2 md:p-3 rounded-lg">
                                            <div className="col-span-2"><span className="text-gray-400">调度规则:</span> <span className="font-mono text-indigo-600 font-bold">{point.cron_schedule}</span></div>
                                            <div><span className="text-gray-400">上次采集:</span> {point.last_crawled_at ? new Date(point.last_crawled_at).toLocaleDateString() : 'Never'}</div>
                                            <div><span className="text-gray-400">深度:</span> {point.initial_pages || 100} 页</div>
                                        </div>

                                        <div className="flex justify-between items-center border-t border-gray-50 pt-3">
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => setDrawerPoint(point)}
                                                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 text-xs"
                                                    title="查看任务日志"
                                                >
                                                    <ViewListIcon className="w-4 h-4" />
                                                    <span className="hidden sm:inline">任务日志</span>
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

            {/* Create Point Modal */}
            <PointModal 
                isOpen={isCreatePointModalOpen}
                onClose={() => setIsCreatePointModalOpen(false)}
                onSave={fetchPoints}
                sourceId={selectedSource?.uuid}
            />

            {/* Task Drawer */}
            {drawerPoint && (
                <TaskDrawer 
                    point={drawerPoint} 
                    onClose={() => setDrawerPoint(null)} 
                />
            )}
        </div>
    );
};
