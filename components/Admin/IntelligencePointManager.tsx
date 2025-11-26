
import React, { useState, useEffect, useCallback } from 'react';
import { SystemSource, Subscription } from '../../types';
import { getSources, getPointsBySourceName, deleteIntelligencePoints, createIntelligencePoint, deleteSource } from '../../api';
import { PlusIcon, TrashIcon, RefreshIcon, RssIcon, ClockIcon, CheckIcon, CloseIcon } from '../icons';
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
                <div className="flex items-center gap-2">
                    <button onClick={fetchData} className="p-2 bg-white border rounded-lg text-slate-600 hover:bg-slate-50 shadow-sm transition-all" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <span className="text-sm text-slate-500 ml-2">
                        共 {sources.length} 个情报源，包含 {Object.values(pointsBySource).flat().length} 个采集点
                    </span>
                </div>
                <button 
                    onClick={handleAddClick} 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all transform active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" /> 新建采集配置
                </button>
            </div>

            {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center gap-2"><CloseIcon className="w-5 h-5"/>{error}</div>}

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-10">
                {isLoading && sources.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">加载配置中...</div>
                ) : sources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                        <RssIcon className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 font-medium">暂无情报源配置</p>
                        <button onClick={handleAddClick} className="mt-4 text-indigo-600 hover:underline text-sm">立即添加</button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {sources.map(source => (
                            <div key={source.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                {/* Source Header */}
                                <div className="px-5 py-4 bg-slate-50/80 border-b border-slate-100 flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shadow-sm text-indigo-600">
                                            <RssIcon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-800 text-base">{source.source_name}</h3>
                                            <span className="text-xs text-slate-400">{pointsBySource[source.source_name]?.length || 0} 个采集点</span>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setConfirmDeleteSource(source)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                        title="删除整个情报源"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Points List */}
                                <div className="flex-1 p-2">
                                    {(pointsBySource[source.source_name] || []).length === 0 ? (
                                        <div className="text-center py-8 text-xs text-slate-400">该源下暂无具体采集点</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {(pointsBySource[source.source_name] || []).map(point => (
                                                <div key={point.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-indigo-50/50 transition-colors border border-transparent hover:border-indigo-100">
                                                    <div className="min-w-0 flex-1 pr-3">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`w-2 h-2 rounded-full ${point.is_active ? 'bg-green-500' : 'bg-slate-300'}`}></span>
                                                            <h4 className="text-sm font-semibold text-slate-700 truncate" title={point.point_name}>{point.point_name}</h4>
                                                        </div>
                                                        <div className="flex items-center gap-3 text-[10px] text-slate-400">
                                                            <span className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                                                <ClockIcon className="w-3 h-3" />
                                                                {point.cron_schedule}
                                                            </span>
                                                            <a href={point.point_url} target="_blank" rel="noreferrer" className="hover:text-indigo-600 truncate max-w-[120px]">{point.point_url}</a>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditClick(point)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-white rounded shadow-sm border border-transparent hover:border-slate-200">
                                                            <span className="text-xs font-bold">编辑</span>
                                                        </button>
                                                        <button onClick={() => setConfirmDeletePoint(point)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded shadow-sm border border-transparent hover:border-slate-200">
                                                            <TrashIcon className="w-4 h-4" />
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
                />
            )}

            {confirmDeletePoint && (
                <ConfirmationModal
                    title="删除采集点"
                    message={`确定要删除 "${confirmDeletePoint.point_name}" 吗？`}
                    onConfirm={handleDeletePoint}
                    onCancel={() => setConfirmDeletePoint(null)}
                />
            )}
        </div>
    );
};
