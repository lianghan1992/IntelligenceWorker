
import React, { useState, useEffect, useCallback } from 'react';
import { SystemSource, Subscription } from '../../types';
import { getSources, getPointsBySourceName, deleteIntelligencePoints, createIntelligencePoint, deleteSource } from '../../api';
import { PlusIcon, TrashIcon, RefreshIcon, RssIcon, ClockIcon, CheckIcon, CloseIcon, ServerIcon } from '../icons';
import { IntelligencePointModal } from './IntelligencePointModal';
import { ConfirmationModal } from './ConfirmationModal';

export const IntelligencePointManager: React.FC = () => {
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [pointsBySource, setPointsBySource] = useState<Record<string, Subscription[]>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [pointToEdit, setPointToEdit] = useState<Subscription | null>(null);
    
    const [confirmDeleteSource, setConfirmDeleteSource] = useState<SystemSource | null>(null);
    const [confirmDeletePoint, setConfirmDeletePoint] = useState<Subscription | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedSources = await getSources();
            setSources(fetchedSources);

            const pointsMap: Record<string, Subscription[]> = {};
            await Promise.all(fetchedSources.map(async (source) => {
                const points = await getPointsBySourceName(source.source_name);
                pointsMap[source.source_name] = points;
            }));
            setPointsBySource(pointsMap);

        } catch (err: any) {
            setError('数据加载失败: ' + err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleDeletePoint = async () => {
        if (!confirmDeletePoint) return;
        try {
            await deleteIntelligencePoints([confirmDeletePoint.id]);
            fetchData();
        } catch (e: any) {
            alert("删除失败: " + e.message);
        } finally {
            setConfirmDeletePoint(null);
        }
    };

    const handleDeleteSource = async () => {
        if (!confirmDeleteSource) return;
        try {
            await deleteSource(confirmDeleteSource.source_name);
            fetchData();
        } catch (e: any) {
            alert("删除失败: " + e.message);
        } finally {
            setConfirmDeleteSource(null);
        }
    }

    const handleAddClick = () => {
        setPointToEdit(null);
        setIsModalOpen(true);
    };

    const handleEditClick = (point: Subscription) => {
        setPointToEdit(point);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm transition-all" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-700">情报源配置</span>
                        <span className="text-[10px] text-slate-400">管理 {sources.length} 个源站点与 {Object.values(pointsBySource).flat().length} 个采集探针</span>
                    </div>
                </div>
                <button 
                    onClick={handleAddClick} 
                    className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all"
                >
                    <PlusIcon className="w-4 h-4" /> 新建采集
                </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2"><CloseIcon className="w-5 h-5"/>{error}</div>}

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                {isLoading && sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600 mb-4"></div>
                        <p className="text-slate-400 text-sm">正在加载配置...</p>
                    </div>
                ) : sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <RssIcon className="w-16 h-16 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium mb-4">暂无情报源配置</p>
                        <button onClick={handleAddClick} className="text-indigo-600 hover:underline text-sm font-bold">立即添加第一个</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {sources.map(source => (
                            <div key={source.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md hover:border-indigo-100 transition-all flex flex-col group">
                                {/* Source Header */}
                                <div className="px-5 py-4 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm text-indigo-600 group-hover:scale-110 transition-transform">
                                            <ServerIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">{source.source_name}</h3>
                                            <span className="text-xs text-slate-400">{pointsBySource[source.source_name]?.length || 0} 个采集点</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setConfirmDeleteSource(source)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        title="删除整个情报源"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Points List */}
                                <div className="flex-1 p-3">
                                    {(pointsBySource[source.source_name] || []).length === 0 ? (
                                        <div className="text-center py-8 text-xs text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-100 m-2">
                                            该源下暂无具体采集点
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {(pointsBySource[source.source_name] || []).map(point => (
                                                <div key={point.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group/point">
                                                    <div className="min-w-0 flex-1 pr-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${point.is_active ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-slate-300'}`}></div>
                                                            <h4 className="text-sm font-semibold text-slate-700 truncate" title={point.point_name}>{point.point_name}</h4>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                            <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                                <ClockIcon className="w-3 h-3" />
                                                                {point.cron_schedule}
                                                            </span>
                                                            <a href={point.point_url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 truncate max-w-[100px] opacity-60 hover:opacity-100">{point.point_url}</a>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover/point:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditClick(point)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-md shadow-sm border border-transparent hover:border-slate-200 transition-all" title="编辑">
                                                            <span className="text-xs font-bold">改</span>
                                                        </button>
                                                        <button onClick={() => setConfirmDeletePoint(point)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md shadow-sm border border-transparent hover:border-slate-200 transition-all" title="删除">
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && <IntelligencePointModal onClose={() => setIsModalOpen(false)} onSuccess={fetchData} pointToEdit={pointToEdit} sources={sources} />}
            
            {confirmDeleteSource && (
                <ConfirmationModal
                    title="删除情报源"
                    message={`确定要删除 "${confirmDeleteSource.source_name}" 及其下所有采集点和历史数据吗？此操作不可恢复。`}
                    onConfirm={handleDeleteSource}
                    onCancel={() => setConfirmDeleteSource(null)}
                    confirmText="确认删除"
                    variant="destructive"
                />
            )}

            {confirmDeletePoint && (
                <ConfirmationModal
                    title="删除采集点"
                    message={`确定要删除 "${confirmDeletePoint.point_name}" 吗？`}
                    onConfirm={handleDeletePoint}
                    onCancel={() => setConfirmDeletePoint(null)}
                    confirmText="删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
