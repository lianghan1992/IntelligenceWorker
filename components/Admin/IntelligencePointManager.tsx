
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SystemSource, Subscription } from '../../types';
import { getSources, getPointsBySourceName, deleteSource, deleteIntelligencePoints } from '../../api';
import { PlusIcon, TrashIcon, RefreshIcon } from '../icons';
import { IntelligencePointModal } from './IntelligencePointModal';
import { ConfirmationModal } from './ConfirmationModal';

export const IntelligencePointManager: React.FC = () => {
    const [sources, setSources] = useState<SystemSource[]>([]);
    const [selectedSource, setSelectedSource] = useState<SystemSource | null>(null);
    const [points, setPoints] = useState<Subscription[]>([]);
    const [selectedPoints, setSelectedPoints] = useState<Set<string>>(new Set());

    const [isLoadingSources, setIsLoadingSources] = useState(true);
    const [isLoadingPoints, setIsLoadingPoints] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [actionTarget, setActionTarget] = useState<{ type: 'source' | 'points'; data: any } | null>(null);

    const fetchSources = useCallback(async (selectFirst = false) => {
        setIsLoadingSources(true);
        setError(null);
        try {
            const fetchedSources = await getSources();
            setSources(fetchedSources);
            if (selectFirst && fetchedSources.length > 0) {
                return fetchedSources[0];
            }
        } catch (err: any) {
            setError('无法加载情报源: ' + err.message);
        } finally {
            setIsLoadingSources(false);
        }
        return null;
    }, []);

    const refreshAll = useCallback(async () => {
        const currentSelectedId = selectedSource?.id;
        await fetchSources();
        const reselected = sources.find(s => s.id === currentSelectedId) || sources[0] || null;
        setSelectedSource(reselected);

    }, [fetchSources, selectedSource, sources]);

    useEffect(() => {
        fetchSources(true).then(firstSource => {
            if (firstSource) {
                setSelectedSource(firstSource);
            }
        });
    }, [fetchSources]);

    useEffect(() => {
        if (selectedSource) {
            const fetchPoints = async () => {
                setIsLoadingPoints(true);
                setError(null);
                setSelectedPoints(new Set());
                try {
                    const fetchedPoints = await getPointsBySourceName(selectedSource.source_name);
                    setPoints(fetchedPoints);
                } catch (err: any) {
                    setError(`无法加载 '${selectedSource.source_name}' 的情报点: ${err.message}`);
                    setPoints([]);
                } finally {
                    setIsLoadingPoints(false);
                }
            };
            fetchPoints();
        } else {
            setPoints([]);
        }
    }, [selectedSource]);

    const handleSelectAllPoints = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPoints(new Set(points.map(p => p.id)));
        } else {
            setSelectedPoints(new Set());
        }
    };

    const handleSelectPoint = (pointId: string) => {
        setSelectedPoints(prev => {
            const newSet = new Set(prev);
            if (newSet.has(pointId)) {
                newSet.delete(pointId);
            } else {
                newSet.add(pointId);
            }
            return newSet;
        });
    };

    const handleDelete = async () => {
        if (!actionTarget) return;
        
        setError(null);
        try {
            if (actionTarget.type === 'source') {
                await deleteSource(actionTarget.data.source_name);
                setSelectedSource(null); // Deselect source after deletion
            } else {
                await deleteIntelligencePoints(Array.from(actionTarget.data));
            }
            await refreshAll();
        } catch (err: any) {
             setError('删除失败: ' + err.message);
        } finally {
            setActionTarget(null);
        }
    };
    
    const isAllPointsSelected = useMemo(() => points.length > 0 && selectedPoints.size === points.length, [points, selectedPoints]);

    return (
        <>
            {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
            <div className="flex h-full gap-6">
                {/* Left Panel: Sources */}
                <div className="w-1/3 bg-white border rounded-lg flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h2 className="font-semibold text-gray-800">情报源</h2>
                        <button onClick={() => refreshAll()} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-md" title="刷新情报源"><RefreshIcon className="w-4 h-4" /></button>
                    </div>
                    {isLoadingSources ? (
                        <div className="flex-1 flex items-center justify-center text-gray-500">加载中...</div>
                    ) : (
                        <ul className="flex-1 overflow-y-auto p-2">
                            {sources.map(source => (
                                <li key={source.id} onClick={() => setSelectedSource(source)} className={`flex justify-between items-center p-2 rounded-md cursor-pointer transition-colors ${selectedSource?.id === source.id ? 'bg-blue-100 text-blue-700 font-semibold' : 'hover:bg-gray-100'}`}>
                                    <span className="truncate">{source.source_name}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-0.5 text-xs rounded-full ${selectedSource?.id === source.id ? 'bg-blue-200 text-blue-800' : 'bg-gray-200 text-gray-700'}`}>{source.points_count}</span>
                                        <button onClick={(e) => { e.stopPropagation(); setActionTarget({ type: 'source', data: source }); }} className="p-1 hover:bg-red-100 rounded-full text-gray-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Right Panel: Points */}
                <div className="w-2/3 bg-white border rounded-lg flex flex-col">
                    <div className="p-4 border-b flex justify-between items-center">
                        <div>
                            <h2 className="font-semibold text-gray-800">{selectedSource ? `“${selectedSource.source_name}” 的情报点` : '请选择一个情报源'}</h2>
                            {selectedPoints.size > 0 && <span className="text-sm text-gray-500">已选择 {selectedPoints.size} 项</span>}
                        </div>
                        <div className="flex items-center gap-2">
                             {selectedPoints.size > 0 && (
                                <button onClick={() => setActionTarget({ type: 'points', data: selectedPoints })} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 text-sm text-red-600 font-semibold rounded-lg shadow-sm hover:bg-red-100 transition">
                                    <TrashIcon className="w-4 h-4" /> 删除选中
                                </button>
                            )}
                            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                                <PlusIcon className="w-4 h-4" /> 添加情报点
                            </button>
                        </div>
                    </div>
                     <div className="flex-1 overflow-y-auto">
                        {isLoadingPoints ? (
                             <div className="flex items-center justify-center h-full text-gray-500">加载中...</div>
                        ) : !selectedSource ? (
                             <div className="flex items-center justify-center h-full text-gray-500">请从左侧选择一个情报源。</div>
                        ) : points.length === 0 ? (
                            <div className="flex items-center justify-center h-full text-gray-500">该情报源下暂无情报点。</div>
                        ) : (
                            <table className="w-full text-sm text-left text-gray-500">
                                <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                    <tr>
                                        <th scope="col" className="p-4 w-4"><input type="checkbox" checked={isAllPointsSelected} onChange={handleSelectAllPoints} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" /></th>
                                        <th scope="col" className="px-6 py-3">情报点名称</th>
                                        <th scope="col" className="px-6 py-3">URL</th>
                                        <th scope="col" className="px-6 py-3">CRON 计划</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {points.map(point => (
                                        <tr key={point.id} className="bg-white border-b hover:bg-gray-50">
                                            <td className="p-4 w-4"><input type="checkbox" checked={selectedPoints.has(point.id)} onChange={() => handleSelectPoint(point.id)} className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500" /></td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{point.point_name}</td>
                                            <td className="px-6 py-4"><a href={point.point_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-xs">{point.point_url}</a></td>
                                            <td className="px-6 py-4 font-mono text-gray-700">{point.cron_schedule}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            {isModalOpen && <IntelligencePointModal onClose={() => setIsModalOpen(false)} onSuccess={refreshAll} />}
            {actionTarget && (
                <ConfirmationModal
                    title={`确认删除`}
                    message={actionTarget.type === 'source' ? `您确定要删除情报源 “${actionTarget.data.source_name}” 吗？其下所有关联情报点也将被一并删除。` : `您确定要删除选中的 ${actionTarget.data.size} 个情报点吗？`}
                    onConfirm={handleDelete}
                    onCancel={() => setActionTarget(null)}
                />
            )}
        </>
    );
};
