
import React, { useState, useEffect, useCallback } from 'react';
import { SystemSource, Subscription, IntelligenceSourcePublic, IntelligencePointPublic } from '../../types';
import { getSources, getPoints, deletePoints, deleteSource, togglePoint, runPoint } from '../../api/intelligence';
import { getUserSubscribedSources } from '../../api/user';
import { PlusIcon, TrashIcon, RefreshIcon, RssIcon, ClockIcon, CloseIcon, ServerIcon, PlayIcon, ChevronRightIcon, StopIcon } from '../icons';
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
    
    const [togglingPoint, setTogglingPoint] = useState<string | null>(null);
    const [runningSource, setRunningSource] = useState<string | null>(null);
    
    // Expanded states for accordion
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedSources = await getSources();
            // Map IntelligenceSourcePublic to SystemSource
            const mappedSources: SystemSource[] = fetchedSources.map(s => ({
                id: s.id,
                source_name: s.name || s.source_name || '',
                points_count: s.points_count || 0,
                articles_count: s.articles_count || 0
            }));
            setSources(mappedSources);

            const pointsMap: Record<string, Subscription[]> = {};
            const initialExpanded = new Set<string>();
            
            await Promise.all(mappedSources.map(async (source) => {
                const points = await getPoints({ source_name: source.id }); // Using ID for new backend logic if possible, or name
                // Map IntelligencePointPublic to Subscription
                pointsMap[source.source_name] = points.map(p => ({
                    id: p.id,
                    source_id: p.source_uuid, 
                    source_name: p.source_name || source.source_name || '',
                    point_name: p.name || p.point_name || '',
                    point_url: p.url || p.point_url || '',
                    cron_schedule: p.cron_schedule,
                    is_active: p.is_active,
                    url_filters: p.url_filters,
                    extra_hint: p.extra_hint
                }));
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
            await deletePoints([confirmDeletePoint.id]);
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
            // Use ID if available, else name
            await deleteSource(confirmDeleteSource.id);
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
            await togglePoint(point.id, newStatus);
            
            // Optimistic update
            setPointsBySource(prev => {
                const newMap = { ...prev };
                const list = newMap[point.source_name];
                if (list) {
                    newMap[point.source_name] = list.map(p => p.id === point.id ? { ...p, is_active: newStatus } : p);
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
        try {
            const newStatus = !currentStatus;
            const points = pointsBySource[sourceName] || [];
            await Promise.all(points.map(p => togglePoint(p.id, newStatus)));
            
            setPointsBySource(prev => {
                const newMap = { ...prev };
                const list = newMap[sourceName];
                if (list) {
                    newMap[sourceName] = list.map(p => ({ ...p, is_active: newStatus }));
                }
                return newMap;
            });
        } catch (e: any) {
            alert(`源状态切换失败: ${e.message}`);
        }
    };

    const handleRunCrawler = async (e: React.MouseEvent, source: SystemSource) => {
        e.stopPropagation();
        if (runningSource) return;
        setRunningSource(source.source_name);
        try {
            const points = pointsBySource[source.source_name] || [];
            await Promise.all(points.map(p => runPoint(p.id)));
            alert(`已触发 "${source.source_name}" 的立即采集任务。`);
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

    const getPointForModal = (subscription: Subscription | null): IntelligencePointPublic | null => {
        if (!subscription) return null;
        return {
            id: subscription.id,
            uuid: subscription.id,
            source_uuid: subscription.source_id || '',
            source_name: subscription.source_name,
            name: subscription.point_name,
            url: subscription.point_url,
            point_name: subscription.point_name,
            point_url: subscription.point_url,
            cron_schedule: subscription.cron_schedule,
            is_active: !!subscription.is_active,
            url_filters: subscription.url_filters,
            extra_hint: subscription.extra_hint,
            created_at: '',
            status: subscription.is_active ? 'active' : 'inactive', 
            updated_at: '',
            initial_pages: 1
        };
    };

    const getSourcesForModal = (): IntelligenceSourcePublic[] => {
        return sources.map(s => ({
            id: s.id,
            uuid: s.id,
            name: s.source_name,
            source_name: s.source_name,
            main_url: '',
            total_points: s.points_count || 0,
            total_articles: s.articles_count || 0,
            points_count: s.points_count || 0,
            articles_count: s.articles_count || 0,
            created_at: '',
            updated_at: ''
        }));
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            <section className="flex-shrink-0">
                <IntelligenceStats compact={false} />
            </section>

            <section className="flex-1 flex flex-col min-h-0 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                            <span className="hidden sm:inline">新建情报点</span>
                            <span className="sm:hidden">新建</span>
                        </button>
                    </div>
                </div>

                {error && <div className="mx-6 mt-4 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100 text-sm flex items-center gap-2"><CloseIcon className="w-4 h-4"/>{error}</div>}

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-sm text-left hidden md:table">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-3 font-medium">情报源 / 采集点</th>
                                <th className="px-6 py-3 font-medium">目标 URL</th>
                                <th className="px-6 py-3 font-medium w-40">采集频率</th>
                                <th className="px-6 py-3 font-medium w-32">运行状态</th>
                                <th className="px-6 py-3 font-medium text-right w-24">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading && sources.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-400">加载中...</td></tr>
                            ) : sources.length === 0 ? (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-400">暂无配置</td></tr>
                            ) : sources.map(source => {
                                const points = pointsBySource[source.source_name] || [];
                                const isExpanded = expandedSources.has(source.source_name);
                                const isActive = isSourceActive(source.source_name);
                                
                                return (
                                    <React.Fragment key={source.id}>
                                        <tr className="bg-slate-50/80 hover:bg-slate-100/80 transition-colors">
                                            <td colSpan={5} className="px-4 py-2">
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
                                                    
                                                    <div className="flex items-center gap-4">
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
                                                        {/* FIX: Rename 'togglingPointId' to 'togglingPoint' to match state variable name */}
                                                        disabled={togglingPoint === point.id}
                                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${point.is_active ? 'bg-green-500' : 'bg-slate-200'}`}
                                                    >
                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${point.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                                    </button>
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

                    <div className="md:hidden space-y-4 p-4">
                        {/* Mobile View Omitted for brevity */}
                        {sources.length === 0 && <div className="text-center text-slate-400 py-10">暂无配置</div>}
                    </div>
                </div>
            </section>

            {isModalOpen && <IntelligencePointModal onClose={() => setIsModalOpen(false)} onSuccess={fetchData} pointToEdit={getPointForModal(pointToEdit)} sources={getSourcesForModal()} />}
            
            {confirmDeleteSource && (
                <ConfirmationModal
                    title="删除情报源"
                    message={`确定要删除 "${confirmDeleteSource.source_name}" 及其下所有采集点吗？`}
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
