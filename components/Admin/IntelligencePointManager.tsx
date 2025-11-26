
import React, { useState, useEffect, useCallback } from 'react';
import { SystemSource, Subscription } from '../../types';
import { getSources, getPointsBySourceName, deleteIntelligencePoints, createIntelligencePoint, deleteSource, toggleIntelligencePoint, toggleSource, checkIntelligencePointHealth, runCrawler } from '../../api';
import { PlusIcon, TrashIcon, RefreshIcon, RssIcon, ClockIcon, CheckCircleIcon, CloseIcon, ServerIcon, ShieldCheckIcon, PlayIcon, ChevronDownIcon, ChevronRightIcon, GlobeIcon } from '../icons';
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
    
    const [healthStatus, setHealthStatus] = useState<Record<string, { status: string, message: string }>>({});
    const [checkingHealth, setCheckingHealth] = useState<string | null>(null);
    const [togglingPoint, setTogglingPoint] = useState<string | null>(null);
    const [togglingSource, setTogglingSource] = useState<string | null>(null);
    const [runningSource, setRunningSource] = useState<string | null>(null);
    
    // Expanded states for accordion
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

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

    const handleTogglePoint = async (point: Subscription) => {
        setTogglingPoint(point.id);
        try {
            const newStatus = !point.is_active;
            await toggleIntelligencePoint(point.id, newStatus);
            
            // Optimistic update
            setPointsBySource(prev => {
                const newMap = { ...prev };
                const list = newMap[point.source_name];
                if (list) {
                    newMap[point.source_name] = list.map(p => p.id === point.id ? { ...p, is_active: newStatus ? 1 : 0 } : p);
                }
                return newMap;
            });
        } catch (e: any) {
            alert("状态切换失败: " + e.message);
        } finally {
            setTogglingPoint(null);
        }
    };

    const handleToggleSource = async (sourceName: string, currentStatus: boolean) => {
        setTogglingSource(sourceName);
        try {
            const newStatus = !currentStatus;
            await toggleSource(sourceName, newStatus);
            
            // Optimistic update all points under this source
            setPointsBySource(prev => {
                const newMap = { ...prev };
                const list = newMap[sourceName];
                if (list) {
                    newMap[sourceName] = list.map(p => ({ ...p, is_active: newStatus ? 1 : 0 }));
                }
                return newMap;
            });
        } catch (e: any) {
            alert(`源状态切换失败: ${e.message}`);
        } finally {
            setTogglingSource(null);
        }
    };

    const handleCheckHealth = async (point: Subscription) => {
        setCheckingHealth(point.id);
        try {
            const res = await checkIntelligencePointHealth(point.id);
            setHealthStatus(prev => ({ ...prev, [point.id]: res }));
        } catch (e: any) {
            setHealthStatus(prev => ({ ...prev, [point.id]: { status: 'error', message: e.message } }));
        } finally {
            setCheckingHealth(null);
        }
    };

    const handleRunCrawler = async (e: React.MouseEvent, source: SystemSource) => {
        e.stopPropagation();
        if (runningSource) return;
        setRunningSource(source.source_name);
        try {
            await runCrawler(source.source_name);
            alert(`已触发 "${source.source_name}" 的立即采集任务，请关注系统看板的指标变化。`);
        } catch (e: any) {
            alert(`启动失败: ${e.message}`);
        } finally {
            setRunningSource(null);
        }
    };

    const handleAddClick = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setPointToEdit(null);
        setIsModalOpen(true);
    };

    const toggleExpand = (sourceName: string) => {
        setExpandedSources(prev => {
            const newSet = new Set(prev);
            if (newSet.has(sourceName)) newSet.delete(sourceName); else newSet.add(sourceName);
            return newSet;
        });
    };

    // Helper to determine if source is "active" (has at least one active point)
    const isSourceActive = (sourceName: string) => {
        const pts = pointsBySource[sourceName] || [];
        return pts.length > 0 && pts.some(p => p.is_active);
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
                        <span className="text-sm font-bold text-slate-700">源与采集配置</span>
                        <span className="text-[10px] text-slate-400">管理 {sources.length} 个源站点与 {Object.values(pointsBySource).flat().length} 个采集探针</span>
                    </div>
                </div>
                <button 
                    onClick={() => handleAddClick()} 
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
                        <button onClick={() => handleAddClick()} className="text-indigo-600 hover:underline text-sm font-bold">立即添加第一个</button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {sources.map(source => {
                            const points = pointsBySource[source.source_name] || [];
                            const isExpanded = expandedSources.has(source.source_name);
                            const isActive = isSourceActive(source.source_name);
                            const isToggling = togglingSource === source.source_name;

                            return (
                                <div key={source.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden hover:border-indigo-200 transition-all">
                                    {/* Source Header Row */}
                                    <div 
                                        className={`px-4 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50/80' : 'bg-white hover:bg-slate-50'}`}
                                        onClick={() => toggleExpand(source.source_name)}
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90 text-indigo-600' : 'text-slate-400'}`}>
                                                <ChevronRightIcon className="w-5 h-5" />
                                            </div>
                                            
                                            {/* Source Toggle */}
                                            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    onClick={() => handleToggleSource(source.source_name, isActive)}
                                                    disabled={isToggling}
                                                    className={`w-10 h-5 rounded-full relative transition-colors flex-shrink-0 ${isActive ? 'bg-green-500' : 'bg-slate-300'} ${isToggling ? 'opacity-50 cursor-wait' : ''}`}
                                                    title={isActive ? "点击关闭所有采集" : "点击开启所有采集"}
                                                >
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm ${isActive ? 'translate-x-5.5' : 'translate-x-0.5'}`} style={{ left: 0, transform: isActive ? 'translateX(22px)' : 'translateX(2px)' }}></div>
                                                </button>
                                            </div>

                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-indigo-600">
                                                    <ServerIcon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-sm">{source.source_name}</h3>
                                                    <span className="text-xs text-slate-400">{points.length} 个采集点</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 pl-9 md:pl-0" onClick={(e) => e.stopPropagation()}>
                                            <button
                                                onClick={(e) => handleRunCrawler(e, source)}
                                                disabled={runningSource === source.source_name}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                                    runningSource === source.source_name 
                                                    ? 'bg-indigo-50 text-indigo-600 opacity-100' 
                                                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'
                                                }`}
                                            >
                                                {runningSource === source.source_name ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
                                                立即运行
                                            </button>
                                            
                                            <div className="h-4 w-px bg-slate-200 mx-1"></div>

                                            <button 
                                                onClick={() => setConfirmDeleteSource(source)}
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                title="删除整个情报源"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Points List (Collapsible) */}
                                    {isExpanded && (
                                        <div className="border-t border-slate-100 bg-white animate-in slide-in-from-top-2 duration-200">
                                            {points.length === 0 ? (
                                                <div className="text-center py-8 text-xs text-slate-400">该源下暂无具体采集点</div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left text-xs text-slate-600">
                                                        <thead className="bg-slate-50/50 text-slate-500 font-medium border-b border-slate-100">
                                                            <tr>
                                                                <th className="px-6 py-3 w-10"></th>
                                                                <th className="px-4 py-3">采集点名称</th>
                                                                <th className="px-4 py-3">目标 URL</th>
                                                                <th className="px-4 py-3">采集频率 (Cron)</th>
                                                                <th className="px-4 py-3">状态</th>
                                                                <th className="px-4 py-3">健康度</th>
                                                                <th className="px-4 py-3 text-right">操作</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-50">
                                                            {points.map(point => (
                                                                <tr key={point.id} className="hover:bg-slate-50/50 transition-colors group">
                                                                    <td className="px-6 py-3">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                                                    </td>
                                                                    <td className="px-4 py-3 font-medium text-slate-800">{point.point_name}</td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-1.5 max-w-[200px] xl:max-w-[300px]">
                                                                            <GlobeIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                                                                            <a href={point.point_url} target="_blank" rel="noreferrer" className="truncate hover:text-indigo-600 transition-colors" title={point.point_url}>
                                                                                {point.point_url}
                                                                            </a>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-slate-500 font-mono text-[10px]">
                                                                            <ClockIcon className="w-3 h-3" /> {point.cron_schedule}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <button 
                                                                            onClick={() => handleTogglePoint(point)}
                                                                            disabled={togglingPoint === point.id}
                                                                            className={`relative inline-flex h-4 w-8 items-center rounded-full transition-colors focus:outline-none ${point.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
                                                                        >
                                                                            <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${point.is_active ? 'translate-x-4' : 'translate-x-1'}`} />
                                                                        </button>
                                                                    </td>
                                                                    <td className="px-4 py-3">
                                                                        <div className="flex items-center gap-2">
                                                                            {healthStatus[point.id] && (
                                                                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${healthStatus[point.id].status === 'healthy' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                                                                    {healthStatus[point.id].status === 'healthy' ? '正常' : '异常'}
                                                                                </span>
                                                                            )}
                                                                            <button 
                                                                                onClick={() => handleCheckHealth(point)} 
                                                                                disabled={checkingHealth === point.id}
                                                                                className="text-slate-400 hover:text-indigo-600"
                                                                                title="检查健康度"
                                                                            >
                                                                                {checkingHealth === point.id ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheckIcon className="w-3.5 h-3.5" />}
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-right">
                                                                        <button 
                                                                            onClick={() => setConfirmDeletePoint(point)} 
                                                                            className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                                            title="删除采集点"
                                                                        >
                                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
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
