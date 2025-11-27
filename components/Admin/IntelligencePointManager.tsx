
import React, { useState, useEffect, useCallback } from 'react';
import { SystemSource, Subscription } from '../../types';
import { getSources, getPointsBySourceName, deleteIntelligencePoints, createIntelligencePoint, deleteSource, toggleIntelligencePoint, toggleSource, checkIntelligencePointHealth, runCrawler } from '../../api';
import { PlusIcon, TrashIcon, RefreshIcon, RssIcon, ClockIcon, CheckCircleIcon, CloseIcon, ServerIcon, ShieldCheckIcon, PlayIcon, ChevronDownIcon, ChevronRightIcon, GlobeIcon, StopIcon } from '../icons';
import { IntelligencePointModal } from './IntelligencePointModal';
import { ConfirmationModal } from './ConfirmationModal';
import { IntelligenceStats } from './IntelligenceTaskManager';

// Cron Helper
const getCronLabel = (cron: string) => {
    const options = [
        { label: '每30分钟', value: '*/30 * * * *' },
        { label: '每小时', value: '0 * * * *' },
        { label: '每2小时', value: '0 */2 * * *' },
        { label: '每3小时', value: '0 */3 * * *' },
        { label: '每4小时', value: '0 */4 * * *' },
        { label: '每6小时', value: '0 */6 * * *' },
        { label: '每8小时', value: '0 */8 * * *' },
        { label: '每12小时', value: '0 */12 * * *' },
        { label: '每天', value: '0 0 * * *' },
        { label: '每周', value: '0 0 * * 0' },
    ];
    const found = options.find(o => o.value === cron);
    return found ? found.label : <span className="font-mono text-[10px]">{cron}</span>;
};

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
    
    // Expanded states for accordion - Default open all for better overview in new design
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedSources = await getSources();
            setSources(fetchedSources);

            const pointsMap: Record<string, Subscription[]> = {};
            const initialExpanded = new Set<string>();
            
            await Promise.all(fetchedSources.map(async (source) => {
                const points = await getPointsBySourceName(source.source_name);
                pointsMap[source.source_name] = points;
                initialExpanded.add(source.source_name);
            }));
            
            setPointsBySource(pointsMap);
            setExpandedSources(initialExpanded);

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

    const handleToggleSource = async (e: React.MouseEvent, sourceName: string, currentStatus: boolean) => {
        e.stopPropagation();
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

    const isSourceActive = (sourceName: string) => {
        const pts = pointsBySource[sourceName] || [];
        return pts.length > 0 && pts.some(p => p.is_active);
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            
            {/* 1. Dashboard Section (Merged) */}
            <section className="flex-shrink-0">
                <IntelligenceStats compact={false} />
            </section>

            {/* 2. Source & Points Config Section */}
            <section className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Toolbar */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div className="flex items-center gap-2">
                        <ServerIcon className="w-5 h-5 text-slate-500" />
                        <h2 className="text-base font-bold text-slate-800">源采集配置</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button onClick={fetchData} className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm">
                            <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button 
                            onClick={(e) => handleAddClick(e)} 
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg shadow hover:bg-indigo-700 transition-all"
                        >
                            <PlusIcon className="w-4 h-4" /> 
                            <span className="hidden sm:inline">新建采集</span>
                            <span className="sm:hidden">新建</span>
                        </button>
                    </div>
                </div>

                {error && <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm flex items-center gap-2"><CloseIcon className="w-4 h-4"/>{error}</div>}

                {/* Multi-dimensional Table Container */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    {/* Desktop Table View */}
                    <table className="w-full text-sm text-left hidden md:table">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 font-medium">情报源 / 采集点</th>
                                <th className="px-6 py-3 font-medium">目标 URL</th>
                                <th className="px-6 py-3 font-medium w-40">采集频率</th>
                                <th className="px-6 py-3 font-medium w-32">运行状态</th>
                                <th className="px-6 py-3 font-medium w-32">健康检查</th>
                                <th className="px-6 py-3 font-medium text-right w-24">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && sources.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-400">加载中...</td></tr>
                            ) : sources.length === 0 ? (
                                <tr><td colSpan={6} className="py-20 text-center text-slate-400">暂无配置</td></tr>
                            ) : sources.map(source => {
                                const points = pointsBySource[source.source_name] || [];
                                const isExpanded = expandedSources.has(source.source_name);
                                const isActive = isSourceActive(source.source_name);
                                
                                return (
                                    <React.Fragment key={source.id}>
                                        {/* Source Group Header */}
                                        <tr className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                                            <td colSpan={6} className="px-4 py-2">
                                                <div className="flex items-center justify-between">
                                                    <div 
                                                        className="flex items-center gap-3 cursor-pointer select-none"
                                                        onClick={() => toggleExpand(source.source_name)}
                                                    >
                                                        <ChevronRightIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-indigo-600 shadow-sm">
                                                                <RssIcon className="w-3.5 h-3.5" />
                                                            </div>
                                                            <span className="font-bold text-slate-800">{source.source_name}</span>
                                                            <span className="text-xs text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">{points.length} 探针</span>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Source Actions Toolbar */}
                                                    <div className="flex items-center gap-4">
                                                        {/* Run Now */}
                                                        <button
                                                            onClick={(e) => handleRunCrawler(e, source)}
                                                            disabled={runningSource === source.source_name}
                                                            className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                                                                runningSource === source.source_name ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500 hover:text-indigo-600 hover:bg-white'
                                                            }`}
                                                            title="立即运行该源下的所有采集"
                                                        >
                                                            {runningSource === source.source_name ? <RefreshIcon className="w-3.5 h-3.5 animate-spin" /> : <PlayIcon className="w-3.5 h-3.5" />}
                                                            运行
                                                        </button>

                                                        {/* Toggle All */}
                                                        <button
                                                            onClick={(e) => handleToggleSource(e, source.source_name, isActive)}
                                                            className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded transition-colors ${
                                                                isActive ? 'text-green-600 hover:bg-green-50' : 'text-slate-400 hover:text-slate-600'
                                                            }`}
                                                            title={isActive ? "暂停所有" : "启用所有"}
                                                        >
                                                            {isActive ? <StopIcon className="w-3.5 h-3.5" /> : <PlayIcon className="w-3.5 h-3.5" />}
                                                            {isActive ? '全开' : '全关'}
                                                        </button>

                                                        <div className="h-3 w-px bg-slate-300"></div>

                                                        <button 
                                                            onClick={() => setConfirmDeleteSource(source)}
                                                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                                                            title="删除来源"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Point Rows */}
                                        {isExpanded && points.map(point => (
                                            <tr key={point.id} className="group hover:bg-slate-50 transition-colors border-l-4 border-l-transparent hover:border-l-indigo-500">
                                                <td className="px-6 py-3 pl-12">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-300 group-hover:bg-indigo-400"></div>
                                                        <span className="font-medium text-slate-700">{point.point_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <a href={point.point_url} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-blue-600 hover:underline truncate block max-w-[250px]" title={point.point_url}>
                                                        {point.point_url}
                                                    </a>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-1.5 text-slate-600 bg-slate-100/50 px-2 py-1 rounded w-fit">
                                                        <ClockIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        <span>{getCronLabel(point.cron_schedule)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <button 
                                                        onClick={() => handleTogglePoint(point)}
                                                        disabled={togglingPoint === point.id}
                                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${point.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${point.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        {healthStatus[point.id] ? (
                                                            <span className={`text-xs px-2 py-0.5 rounded font-medium ${healthStatus[point.id].status === 'healthy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                                {healthStatus[point.id].status === 'healthy' ? '正常' : '异常'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-slate-300">--</span>
                                                        )}
                                                        <button 
                                                            onClick={() => handleCheckHealth(point)} 
                                                            disabled={checkingHealth === point.id}
                                                            className="text-slate-400 hover:text-indigo-600 p-1 hover:bg-indigo-50 rounded"
                                                            title="检查连接"
                                                        >
                                                            <ShieldCheckIcon className={`w-4 h-4 ${checkingHealth === point.id ? 'animate-pulse text-indigo-400' : ''}`} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-right">
                                                    <button 
                                                        onClick={() => setConfirmDeletePoint(point)} 
                                                        className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                        title="删除采集点"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4 p-4">
                        {isLoading && sources.length === 0 ? (
                            <div className="text-center text-slate-400 py-10">加载配置中...</div>
                        ) : sources.length === 0 ? (
                            <div className="text-center text-slate-400 py-10">暂无配置</div>
                        ) : sources.map(source => {
                            const points = pointsBySource[source.source_name] || [];
                            return (
                                <div key={source.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <ServerIcon className="w-4 h-4 text-indigo-500" />
                                            <span className="font-bold text-slate-800">{source.source_name}</span>
                                            <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{points.length}</span>
                                        </div>
                                        <button onClick={() => setConfirmDeleteSource(source)} className="text-slate-400 hover:text-red-600"><TrashIcon className="w-4 h-4" /></button>
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {points.map(point => (
                                            <div key={point.id} className="p-4 flex flex-col gap-3">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h4 className="font-medium text-slate-700">{point.point_name}</h4>
                                                        <a href={point.point_url} className="text-xs text-blue-500 truncate block max-w-[200px] mt-0.5">{point.point_url}</a>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleTogglePoint(point)}
                                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${point.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${point.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-slate-500">
                                                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                                                        <ClockIcon className="w-3 h-3" /> {getCronLabel(point.cron_schedule)}
                                                    </span>
                                                    <div className="flex gap-3">
                                                        <button onClick={() => handleCheckHealth(point)} className="text-indigo-600 flex items-center gap-1">
                                                            <ShieldCheckIcon className="w-3 h-3" /> 检查
                                                        </button>
                                                        <button onClick={() => setConfirmDeletePoint(point)} className="text-red-500 flex items-center gap-1">
                                                            <TrashIcon className="w-3 h-3" /> 删除
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

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
