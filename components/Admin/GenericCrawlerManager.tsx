
import React, { useState, useEffect, useCallback } from 'react';
import { GenericCrawlerTaskItem, Subscription } from '../../types';
import { getGenericPoints, getGenericTasks, updateGenericPoint, deleteIntelligencePoints, runCrawler, toggleSource } from '../../api';
import { GenericCrawlerModal } from './GenericCrawlerModal';
import { 
    PlusIcon, RefreshIcon, PlayIcon, StopIcon, TrashIcon, PencilIcon, 
    ChevronRightIcon, RssIcon, ClockIcon, GlobeIcon, ChevronLeftIcon, 
    ViewListIcon, ServerIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';

// --- Helper Functions ---
const getScheduleLabel = (cron: string) => {
    const options = [
        { label: '每3小时', value: '0 */3 * * *' },
        { label: '每8小时', value: '0 */8 * * *' },
        { label: '每24小时', value: '0 0 * * *' },
        { label: '每3天', value: '0 0 */3 * *' },
        { label: '每周', value: '0 0 * * 0' },
    ];
    return options.find(o => o.value === cron)?.label || cron;
};

// --- Task List Component ---
const TaskList: React.FC = () => {
    const [tasks, setTasks] = useState<GenericCrawlerTaskItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

    const fetchTasks = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const res = await getGenericTasks({ page, limit: pagination.limit });
            setTasks(res.items || []);
            setPagination(p => ({ ...p, page, total: res.total }));
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, [pagination.limit]);

    useEffect(() => {
        fetchTasks(1);
    }, [fetchTasks]);

    const totalPages = Math.ceil(pagination.total / pagination.limit);

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 flex items-center gap-2">
                    <ViewListIcon className="w-5 h-5 text-gray-500" />
                    任务日志
                </h3>
                <button onClick={() => fetchTasks(1)} className="p-2 hover:bg-white rounded-lg text-gray-500 transition-colors border border-transparent hover:border-gray-200">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase bg-gray-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3">来源 / 任务</th>
                            <th className="px-6 py-3">阶段</th>
                            <th className="px-6 py-3">开始时间</th>
                            <th className="px-6 py-3">详情</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading && tasks.length === 0 ? (
                            <tr><td colSpan={4} className="py-10 text-center text-gray-400">加载中...</td></tr>
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan={4} className="py-10 text-center text-gray-400">暂无任务记录</td></tr>
                        ) : (
                            tasks.map(task => (
                                <tr key={task.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{task.source_name}</div>
                                        <div className="text-xs text-gray-500">{task.point_name}</div>
                                        <div className="text-[10px] text-gray-400 mt-0.5">{task.task_type}</div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${task.stage === 'Error' ? 'bg-red-100 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                                            {task.stage}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-xs font-mono text-gray-500">
                                        {new Date(task.start_time).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-xs text-gray-600 max-w-xs truncate" title={task.detail_info}>
                                        {task.detail_info}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
            {pagination.total > 0 && (
                <div className="p-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                    <span className="text-xs text-gray-500">共 {pagination.total} 条</span>
                    <div className="flex gap-2">
                        <button disabled={pagination.page <= 1} onClick={() => fetchTasks(pagination.page - 1)} className="p-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"><ChevronLeftIcon className="w-4 h-4"/></button>
                        <span className="text-xs font-medium px-2 py-1">{pagination.page}</span>
                        <button disabled={pagination.page >= totalPages} onClick={() => fetchTasks(pagination.page + 1)} className="p-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50"><ChevronRightIcon className="w-4 h-4"/></button>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Config List Component ---
export const GenericCrawlerManager: React.FC = () => {
    const [view, setView] = useState<'config' | 'tasks'>('config');
    const [points, setPoints] = useState<Subscription[]>([]);
    const [groupedPoints, setGroupedPoints] = useState<Record<string, Subscription[]>>({});
    const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPoint, setEditingPoint] = useState<Subscription | null>(null);
    const [deletePoint, setDeletePoint] = useState<Subscription | null>(null);
    const [runningSource, setRunningSource] = useState<string | null>(null);

    const loadPoints = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getGenericPoints();
            setPoints(data);
            const groups: Record<string, Subscription[]> = {};
            const initialExpanded = new Set<string>();
            data.forEach(p => {
                if (!groups[p.source_name]) {
                    groups[p.source_name] = [];
                    initialExpanded.add(p.source_name); // Default expand all
                }
                groups[p.source_name].push(p);
            });
            setGroupedPoints(groups);
            setExpandedSources(prev => prev.size === 0 ? initialExpanded : prev);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (view === 'config') loadPoints();
    }, [view, loadPoints]);

    const toggleExpand = (source: string) => {
        setExpandedSources(prev => {
            const next = new Set(prev);
            if (next.has(source)) next.delete(source); else next.add(source);
            return next;
        });
    };

    const handleTogglePoint = async (point: Subscription) => {
        try {
            await updateGenericPoint(point.id, { is_active: point.is_active ? 0 : 1 });
            loadPoints(); // Refresh to reflect state
        } catch (e) { alert('操作失败'); }
    };

    const handleToggleSource = async (e: React.MouseEvent, sourceName: string, enable: boolean) => {
        e.stopPropagation();
        try {
            await toggleSource(sourceName, enable);
            loadPoints();
        } catch (e) { alert('操作失败'); }
    };

    const handleDeleteConfirm = async () => {
        if (!deletePoint) return;
        try {
            await deleteIntelligencePoints([deletePoint.id]);
            setDeletePoint(null);
            loadPoints();
        } catch (e) { alert('删除失败'); }
    };

    const handleRunSource = async (e: React.MouseEvent, sourceName: string) => {
        e.stopPropagation();
        setRunningSource(sourceName);
        try {
            await runCrawler(sourceName);
            alert(`已触发 "${sourceName}" 的采集任务`);
        } catch (e: any) { alert(e.message); }
        finally { setRunningSource(null); }
    };

    return (
        <div className="p-6 h-full flex flex-col bg-slate-50/50">
            <div className="flex-shrink-0 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">通用爬虫管理</h1>
                    <div className="flex gap-4">
                        <button onClick={() => setView('config')} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${view === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>采集配置</button>
                        <button onClick={() => setView('tasks')} className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${view === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>任务日志</button>
                    </div>
                </div>
                {view === 'config' && (
                    <button 
                        onClick={() => { setEditingPoint(null); setIsModalOpen(true); }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition-colors"
                    >
                        <PlusIcon className="w-4 h-4" /> 新建采集点
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-hidden">
                {view === 'tasks' ? (
                    <TaskList />
                ) : (
                    <div className="h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                        <div className="flex-1 overflow-auto custom-scrollbar">
                            {isLoading && points.length === 0 ? (
                                <div className="py-20 text-center text-gray-400">加载中...</div>
                            ) : Object.keys(groupedPoints).length === 0 ? (
                                <div className="py-20 text-center text-gray-400">暂无配置，请点击右上角新建。</div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {Object.entries(groupedPoints).map(([source, groupPoints]) => {
                                        const isExpanded = expandedSources.has(source);
                                        const isActive = groupPoints.some(p => p.is_active);
                                        return (
                                            <div key={source} className="bg-white">
                                                {/* Source Header */}
                                                <div className="flex items-center justify-between px-4 py-3 bg-gray-50/50 hover:bg-gray-100/50 transition-colors">
                                                    <div 
                                                        className="flex items-center gap-3 cursor-pointer select-none flex-1"
                                                        onClick={() => toggleExpand(source)}
                                                    >
                                                        <ChevronRightIcon className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center text-indigo-600 shadow-sm">
                                                                <ServerIcon className="w-4 h-4" />
                                                            </div>
                                                            <span className="font-bold text-gray-800">{source}</span>
                                                            <span className="text-xs bg-white px-2 py-0.5 rounded border text-gray-500">{groupPoints.length} 个采集点</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <button 
                                                            onClick={(e) => handleRunSource(e, source)}
                                                            disabled={runningSource === source}
                                                            className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                            title="立即运行"
                                                        >
                                                            <PlayIcon className={`w-4 h-4 ${runningSource === source ? 'animate-pulse text-blue-600' : ''}`} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => handleToggleSource(e, source, !isActive)}
                                                            className={`text-xs font-medium px-2 py-1 rounded transition-colors ${isActive ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-500 bg-gray-200 hover:bg-gray-300'}`}
                                                        >
                                                            {isActive ? '全开' : '全关'}
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Points List */}
                                                {isExpanded && (
                                                    <div className="divide-y divide-gray-50 border-t border-gray-100">
                                                        {groupPoints.map(point => (
                                                            <div key={point.id} className="flex items-center justify-between px-6 py-3 pl-14 hover:bg-gray-50 transition-colors group">
                                                                <div className="flex-1 min-w-0 pr-4">
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-medium text-gray-700 truncate">{point.point_name}</span>
                                                                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded flex items-center gap-1">
                                                                            <ClockIcon className="w-3 h-3"/> {getScheduleLabel(point.cron_schedule)}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                                                        <GlobeIcon className="w-3 h-3" />
                                                                        <a href={point.point_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline truncate max-w-md">{point.point_url}</a>
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-4">
                                                                    <button 
                                                                        onClick={() => handleTogglePoint(point)}
                                                                        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${point.is_active ? 'bg-green-500' : 'bg-gray-200'}`}
                                                                    >
                                                                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${point.is_active ? 'translate-x-4' : 'translate-x-0'}`} />
                                                                    </button>
                                                                    
                                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                        <button onClick={() => { setEditingPoint(point); setIsModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><PencilIcon className="w-4 h-4"/></button>
                                                                        <button onClick={() => setDeletePoint(point)} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><TrashIcon className="w-4 h-4"/></button>
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
                            )}
                        </div>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <GenericCrawlerModal 
                    onClose={() => setIsModalOpen(false)} 
                    onSuccess={loadPoints} 
                    pointToEdit={editingPoint} 
                />
            )}

            {deletePoint && (
                <ConfirmationModal 
                    title="删除采集点" 
                    message={`确定要删除 "${deletePoint.point_name}" 吗？此操作不可恢复。`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setDeletePoint(null)}
                    confirmText="删除"
                    variant="destructive"
                />
            )}
        </div>
    );
};
