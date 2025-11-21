import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks, deleteLivestreamTask, startTask, stopTask, resummarizeTask, reprocessTask } from '../../api';
import { AddEventModal } from './AddEventModal';
import { 
    PlusIcon, RefreshIcon, TrashIcon,
    ChevronDownIcon, ChevronUpDownIcon, SearchIcon, CalendarIcon,
    FunnelIcon, ChevronLeftIcon, ChevronRightIcon, FilmIcon, BrainIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';
import { EventReportModal } from './EventReportModal';
import { ManuscriptDisplayModal } from './ManuscriptDisplayModal';
import { StatsDisplayModal } from './StatsDisplayModal';


// --- Internal Components ---
const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'recording') return { text: '直播中', className: 'bg-red-100 text-red-800' };
    if (statusLower === 'downloading') return { text: '下载中', className: 'bg-cyan-100 text-cyan-800' };
    if (statusLower === 'listening') return { text: '监听中', className: 'bg-cyan-100 text-cyan-800' };
    if (statusLower === 'scheduled') return { text: '即将开始', className: 'bg-blue-100 text-blue-800' };
    if (statusLower === 'pending') return { text: '即将开始', className: 'bg-blue-100 text-blue-800' };
    if (statusLower === 'stopping') return { text: '停止中', className: 'bg-yellow-100 text-yellow-800' };
    if (statusLower === 'processing') return { text: 'AI总结中', className: 'bg-indigo-100 text-indigo-800' };
    if (statusLower === 'finished' || statusLower === 'completed') return { text: '已结束', className: 'bg-green-100 text-green-800' };
    if (statusLower === 'failed') return { text: '失败', className: 'bg-red-100 text-red-800 font-bold' };
    return { text: '未知', className: 'bg-gray-100 text-gray-800' };
};

const SortableHeader: React.FC<{
    column: string;
    label: string;
    sortConfig: { sort_by: string; order: string };
    onSort: (column: string) => void;
    className?: string;
}> = ({ column, label, sortConfig, onSort, className = "px-6 py-3" }) => (
    <th scope="col" className={className}>
        <div className="flex items-center gap-1 cursor-pointer select-none" onClick={() => onSort(column)}>
            {label}
            {sortConfig.sort_by === column ? (
                sortConfig.order === 'asc' ? <ChevronDownIcon className="w-3 h-3 rotate-180" /> : <ChevronDownIcon className="w-3 h-3" />
            ) : (
                <ChevronUpDownIcon className="w-3 h-3 text-gray-400" />
            )}
        </div>
    </th>
);


// --- Main Component ---
export const LivestreamTaskManager: React.FC = () => {
    const [tasks, setTasks] = useState<LivestreamTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    
    // Modals and actions state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);
    const [taskToAction, setTaskToAction] = useState<{task: LivestreamTask, action: 'delete' | 'start' | 'stop'} | null>(null);
    const [taskForReanalysis, setTaskForReanalysis] = useState<{task: LivestreamTask, action: 'reprocess' | 'resummarize'} | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [manuscriptModalTask, setManuscriptModalTask] = useState<LivestreamTask | null>(null);
    const [statsModalTask, setStatsModalTask] = useState<LivestreamTask | null>(null);
    
    // Data state
    const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ status: '', search_term: '', company: '', start_date: '' });
    // CHANGE: Default sort by start_time descending
    const [sort, setSort] = useState({ sort_by: 'start_time', order: 'desc' });
    const [searchTermInput, setSearchTermInput] = useState('');
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const searchTimeout = useRef<number | null>(null);
    const isNewQuery = useRef(true);

    const loadTasks = useCallback(async (showLoading?: boolean) => {
        const loading = showLoading === undefined ? true : showLoading;
        if (loading) setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: pagination.page,
                page_size: pagination.limit,
                status: filters.status || undefined,
                search_term: filters.search_term || undefined,
                company: filters.company || undefined,
                start_date: filters.start_date || undefined,
                sort_by: sort.sort_by,
                order: sort.order,
            };
            const tasksResponse = await getLivestreamTasks(params);

            if (tasksResponse && Array.isArray(tasksResponse.items)) {
                const append = !isNewQuery.current && params.page > 1;
                setTasks(prev => append ? [...prev, ...tasksResponse.items] : tasksResponse.items);
                setPagination({
                    page: tasksResponse.page,
                    limit: tasksResponse.limit || pagination.limit,
                    total: tasksResponse.total,
                    totalPages: tasksResponse.totalPages || Math.ceil(tasksResponse.total / (tasksResponse.limit || pagination.limit)) || 1,
                });
            } else {
                setTasks([]);
                setPagination({ page: 1, limit: 20, total: 0, totalPages: 1 });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '发生未知错误');
        } finally {
            if (loading) setIsLoading(false);
            isNewQuery.current = false;
        }
    }, [pagination.page, pagination.limit, filters, sort]);

    useEffect(() => {
        loadTasks(true);
    }, [loadTasks]);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        isNewQuery.current = true;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTermInput(e.target.value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = window.setTimeout(() => {
            isNewQuery.current = true;
            setFilters(prev => ({ ...prev, search_term: e.target.value }));
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 500);
    };

    const handleSort = (column: string) => {
        const isAsc = sort.sort_by === column && sort.order === 'asc';
        isNewQuery.current = true;
        setSort({ sort_by: column, order: isAsc ? 'desc' : 'asc' });
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            isNewQuery.current = true; // Force replace for desktop pagination
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };
    
    // --- Infinite Scroll Logic for Mobile ---
    const observer = useRef<IntersectionObserver | null>(null);
    const lastTaskElementRef = useCallback((node: HTMLDivElement | null) => {
        if (isLoading) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && pagination.page < pagination.totalPages) {
                isNewQuery.current = false; // Force append for infinite scroll
                setPagination(prev => ({ ...prev, page: prev.page + 1 }));
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, pagination.page, pagination.totalPages]);

    const handleAction = (task: LivestreamTask, action: 'delete' | 'start' | 'stop') => {
        setTaskToAction({ task, action });
    };

    const confirmAction = async () => {
        if (!taskToAction) return;

        setActionLoading(true);
        setError(null);
        const { task, action } = taskToAction;
        try {
            if (!task.id) {
                throw new Error("操作失败：任务ID不存在。");
            }
            switch (action) {
                case 'delete': await deleteLivestreamTask(task.id); break;
                case 'start': await startTask(task.id); break;
                case 'stop': await stopTask(task.id); break;
            }
            isNewQuery.current = true;
            await loadTasks(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : `操作失败`);
        } finally {
            setActionLoading(false);
            setTaskToAction(null);
        }
    };

    const handleReanalysisClick = (task: LivestreamTask, action: 'reprocess' | 'resummarize') => {
        setTaskForReanalysis({ task, action });
    };

    const confirmReanalysis = async () => {
        if (!taskForReanalysis) return;
        const { task, action } = taskForReanalysis;

        setActionLoading(true);
        setError(null);
        try {
            if (action === 'resummarize') {
                await resummarizeTask(task.id);
            } else { // 'reprocess'
                await reprocessTask(task.id);
            }
            isNewQuery.current = true;
            await loadTasks(false);
        } catch (err) {
            setError(err instanceof Error ? `操作失败: ${err.message}` : `操作失败`);
        } finally {
            setActionLoading(false);
            setTaskForReanalysis(null);
        }
    };


    const handleViewReport = (task: LivestreamTask) => {
        const status = task.status.toLowerCase();
        if (status === 'completed' || status === 'finished') {
            setSelectedEvent(task);
        }
    };
    
    const getStatusPriority = (status: string): number => {
        const s = status.toLowerCase();
        // Live tasks first
        if (['recording', 'downloading', 'stopping'].includes(s)) return 0;
        // Upcoming tasks next
        if (['listening', 'scheduled', 'pending'].includes(s)) return 1;
        // Then processing
        if (['processing'].includes(s)) return 2;
        // Then finished/completed
        if (['finished', 'completed'].includes(s)) return 3;
        // Then failed
        if (['failed'].includes(s)) return 4;
        // Others last
        return 5;
    };

    const mobileSortedTasks = useMemo(() => {
        return [...tasks].sort((a, b) => {
            const priorityA = getStatusPriority(a.status);
            const priorityB = getStatusPriority(b.status);

            if (priorityA !== priorityB) {
                return priorityA - priorityB;
            }

            const timeA = new Date(a.start_time).getTime();
            const timeB = new Date(b.start_time).getTime();

            // For upcoming tasks (priority 1), sort by soonest start time (ascending)
            if (priorityA === 1) {
                return timeA - timeB;
            }
            
            // For all other groups (Live, Finished, etc.), sort by most recent start time (descending)
            return timeB - timeA;
        });
    }, [tasks]);

    const getStats = (task: LivestreamTask) => {
        try {
            const stats = typeof task.stats_json === 'string'
                ? JSON.parse(task.stats_json)
                : task.stats_json || {};
            return {
                segments: stats.recorded_segments_total ?? 0,
                recognized: stats.ai_recognized_success_total ?? 0,
            };
        } catch {
            return { segments: 0, recognized: 0 };
        }
    };

    const getModalProps = (taskToAction: {task: LivestreamTask, action: 'delete' | 'start' | 'stop'}) => {
        const { action, task } = taskToAction;
        const commonMessage = `您确定要对任务 “${task.task_name}” 执行此操作吗？`;
        switch (action) {
            case 'delete':
                return {
                    title: '确认删除任务',
                    message: `${commonMessage} 此操作将永久删除任务及其所有相关数据，无法撤销。`,
                    confirmText: '永久删除',
                    variant: 'destructive' as const
                };
            case 'stop':
                return {
                    title: '确认停止任务',
                    message: `${commonMessage} 任务将停止录制并开始处理已录制的内容。此操作可能不会立即生效。`,
                    confirmText: '确认停止',
                    variant: 'warning' as const
                };
            case 'start':
                return {
                    title: '确认开始任务',
                    message: `${commonMessage} 系统将开始监听直播状态，并在直播开始时自动录制。`,
                    confirmText: '确认开始',
                    variant: 'default' as const
                };
        }
    };
    
    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
                <h1 className="text-2xl font-bold text-gray-800">发布会任务管理</h1>
                <div className="hidden md:flex items-center gap-2">
                     <button onClick={() => { isNewQuery.current = true; loadTasks(true); }} className="p-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading && !tasks.length ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                        <PlusIcon className="w-4 h-4" /> <span>创建分析任务</span>
                    </button>
                </div>
            </div>

             {/* Mobile Action Bar */}
            <div className="md:hidden flex items-center gap-2 mb-4">
                <button onClick={() => { isNewQuery.current = true; loadTasks(true); }} className="p-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                    <RefreshIcon className={`w-5 h-5 ${isLoading && !tasks.length ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                    <PlusIcon className="w-4 h-4" /> <span>创建任务</span>
                </button>
                <button 
                    onClick={() => setIsFilterVisible(!isFilterVisible)}
                    className="p-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition"
                >
                    <FunnelIcon className="w-5 h-5" />
                </button>
            </div>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}
            
            {/* Filter Panel */}
            <div className={`${isFilterVisible ? 'block' : 'hidden'} md:block mb-4 p-4 bg-white rounded-lg border`}>
                <div className="flex flex-col xl:flex-row items-stretch gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={searchTermInput} onChange={handleSearchChange} placeholder="搜索任务名称..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch gap-4">
                        <input type="text" name="company" value={filters.company} onChange={handleFilterChange} placeholder="搜索车企..." className="w-full sm:w-auto bg-white border border-gray-300 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <div className="relative w-full sm:w-auto">
                            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="date" name="start_date" value={filters.start_date} onChange={handleFilterChange} className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <select name="status" value={filters.status} onChange={handleFilterChange} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">所有状态</option>
                            <option value="scheduled">即将开始</option>
                            <option value="listening">监听中</option>
                            <option value="recording">录制中</option>
                            <option value="downloading">下载中</option>
                            <option value="stopping">停止中</option>
                            <option value="processing">AI总结中</option>
                            <option value="finished">已结束</option>
                            <option value="failed">失败</option>
                        </select>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {/* Desktop Table */}
                <div className="bg-white rounded-lg border overflow-x-auto hidden md:block">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <SortableHeader column="task_name" label="任务名称" sortConfig={sort} onSort={handleSort} />
                                <SortableHeader column="company" label="车企" sortConfig={sort} onSort={handleSort} />
                                <th scope="col" className="px-6 py-3">分析提示词</th>
                                <SortableHeader column="start_time" label="开始时间" sortConfig={sort} onSort={handleSort} />
                                <SortableHeader column="status" label="状态" sortConfig={sort} onSort={handleSort} />
                                <th scope="col" className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10">加载中...</td></tr>
                            ) : !isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10">未找到任何任务。</td></tr>
                            ) : (
                                tasks.map(task => {
                                    const statusBadge = getStatusBadge(task.status);
                                    const statusLower = task.status.toLowerCase();
                                    const isActionable = ['processing', 'finished', 'completed', 'failed'].includes(statusLower);
                                    const isReanalyzable = ['finished', 'completed', 'failed'].includes(statusLower);
                                    return (
                                    <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <a href={task.live_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline" title={task.live_url}>
                                                {task.task_name}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4">{task.company}</td>
                                        <td className="px-6 py-4 text-xs font-mono" title={task.summary_prompt}>{task.summary_prompt || '默认'}</td>
                                        <td className="px-6 py-4">{new Date(task.start_time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span></td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {(statusLower === 'scheduled' || statusLower === 'pending') && (
                                                    <button onClick={() => handleAction(task, 'start')} className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200">开始</button>
                                                )}
                                                {['listening', 'recording', 'downloading'].includes(statusLower) && (
                                                    <button onClick={() => handleAction(task, 'stop')} className="px-2 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200">停止</button>
                                                )}
                                                <button onClick={() => handleViewReport(task)} disabled={!['finished', 'completed'].includes(statusLower)} className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">报告</button>
                                                <button onClick={() => setStatsModalTask(task)} className="px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200">详情</button>
                                                <button onClick={() => setManuscriptModalTask(task)} disabled={!isActionable} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">文稿</button>
                                                {isReanalyzable && (
                                                    <>
                                                        <button onClick={() => handleReanalysisClick(task, 'resummarize')} className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200">重新总结</button>
                                                        <button onClick={() => handleReanalysisClick(task, 'reprocess')} className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200">重新分析</button>
                                                    </>
                                                )}
                                                <button onClick={() => handleAction(task, 'delete')} className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200">删除</button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                 {/* Mobile Cards */}
                <div className="md:hidden space-y-4">
                    {isLoading && tasks.length === 0 ? <div className="text-center py-10 text-gray-500">加载中...</div> :
                     !isLoading && tasks.length === 0 ? <div className="text-center py-10 text-gray-500">未找到任何任务。</div> :
                     mobileSortedTasks.map((task, index) => {
                        const cardContent = (
                            <div className="bg-white rounded-lg border p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div className='flex-1 pr-4'>
                                        <a href={task.live_url} target="_blank" rel="noopener noreferrer" className="font-bold text-gray-900 hover:text-blue-600 hover:underline" title={task.live_url}>
                                            {task.task_name}
                                        </a>
                                        <p className="text-sm text-gray-500 font-medium">{task.company}</p>
                                    </div>
                                    <span className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(task.status).className}`}>{getStatusBadge(task.status).text}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t text-sm space-y-2">
                                    <p><strong className="text-gray-500">开始时间: </strong>{new Date(task.start_time).toLocaleString('zh-CN')}</p>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <FilmIcon className="w-4 h-4 text-gray-400" />
                                            <strong>分段: </strong><span>{getStats(task).segments}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <BrainIcon className="w-4 h-4 text-gray-400" />
                                            <strong>AI识别: </strong><span>{getStats(task).recognized}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                                     {(task.status.toLowerCase() === 'scheduled' || task.status.toLowerCase() === 'pending') && (
                                        <button onClick={() => handleAction(task, 'start')} className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200">开始</button>
                                    )}
                                    {['listening', 'recording', 'downloading'].includes(task.status.toLowerCase()) && (
                                        <button onClick={() => handleAction(task, 'stop')} className="px-2 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200">停止</button>
                                    )}
                                    <button onClick={() => handleViewReport(task)} disabled={!['finished', 'completed'].includes(task.status.toLowerCase())} className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">报告</button>
                                    <button onClick={() => setStatsModalTask(task)} className="px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200">详情</button>
                                    <button onClick={() => setManuscriptModalTask(task)} disabled={!['processing', 'finished', 'completed', 'failed'].includes(task.status.toLowerCase())} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">文稿</button>
                                    {['finished', 'completed', 'failed'].includes(task.status.toLowerCase()) && (
                                        <>
                                            <button onClick={() => handleReanalysisClick(task, 'resummarize')} className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200">重新总结</button>
                                            <button onClick={() => handleReanalysisClick(task, 'reprocess')} className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200">重新分析</button>
                                        </>
                                    )}
                                    <button onClick={() => handleAction(task, 'delete')} className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200">删除</button>
                                </div>
                            </div>
                        );
                        if (mobileSortedTasks.length === index + 1) {
                            return <div ref={lastTaskElementRef} key={task.id}>{cardContent}</div>;
                        }
                        return <div key={task.id}>{cardContent}</div>;
                    })}
                     {isLoading && tasks.length > 0 && <div className="text-center text-gray-500 py-4">加载更多...</div>}
                </div>
            </div>

            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center mt-2 text-sm gap-4 hidden md:flex">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                
                {/* Desktop Pagination */}
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span>第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>

            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={() => { isNewQuery.current = true; loadTasks(true); }} />}
            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
            {manuscriptModalTask && manuscriptModalTask.id && <ManuscriptDisplayModal taskId={manuscriptModalTask.id} taskName={manuscriptModalTask.task_name} onClose={() => setManuscriptModalTask(null)} />}
            {taskForReanalysis && (
                <ConfirmationModal
                    title={taskForReanalysis.action === 'resummarize' ? '确认重新总结' : '确认重新分析'}
                    message={`您确定要对 "${taskForReanalysis.task.task_name}" 执行此操作吗？${taskForReanalysis.action === 'reprocess' ? ' 这将删除现有数据并从头开始完整处理。' : ''}`}
                    confirmText="确认"
                    onConfirm={confirmReanalysis}
                    onCancel={() => setTaskForReanalysis(null)}
                    isLoading={actionLoading}
                    variant={taskForReanalysis.action === 'resummarize' ? 'default' : 'warning'}
                />
            )}
            {taskToAction && (
                <ConfirmationModal
                    {...getModalProps(taskToAction)}
                    onConfirm={confirmAction}
                    onCancel={() => setTaskToAction(null)}
                    isLoading={actionLoading}
                />
            )}
            {statsModalTask && (
                <StatsDisplayModal 
                    task={statsModalTask} 
                    onClose={() => setStatsModalTask(null)} 
                    onReanalyze={(task, action) => {
                        setStatsModalTask(null);
                        handleReanalysisClick(task, action);
                    }}
                />
            )}
        </div>
    );
};