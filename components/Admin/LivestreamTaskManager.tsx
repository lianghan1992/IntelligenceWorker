import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks, deleteLivestreamTask, startTask, stopTask, resummarizeTask, reprocessTask } from '../../api';
import { AddEventModal } from './AddEventModal';
import { 
    PlusIcon, RefreshIcon, TrashIcon,
    ChevronDownIcon, ChevronUpDownIcon, SearchIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';
import { EventReportModal } from './EventReportModal';
import { ManuscriptDisplayModal } from './ManuscriptDisplayModal';
import { ReanalyzeOptionsModal } from './ReanalyzeOptionsModal';
import { StatsDisplayModal } from './StatsDisplayModal';


// --- Internal Components ---
const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === 'recording') return { text: '直播中', className: 'bg-red-100 text-red-800' };
    if (statusLower === 'listening') return { text: '监听中', className: 'bg-cyan-100 text-cyan-800' };
    if (statusLower === 'pending') return { text: '即将开始', className: 'bg-blue-100 text-blue-800' };
    if (statusLower === 'completed') return { text: '已结束', className: 'bg-green-100 text-green-800' };
    if (statusLower === 'processing') return { text: 'AI总结中', className: 'bg-indigo-100 text-indigo-800' };
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
    const [taskToReanalyze, setTaskToReanalyze] = useState<LivestreamTask | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [manuscriptModalTask, setManuscriptModalTask] = useState<LivestreamTask | null>(null);
    const [statsModalTask, setStatsModalTask] = useState<LivestreamTask | null>(null);
    
    // Data state
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
    const [filters, setFilters] = useState({ status: '', search_term: '' });
    const [sort, setSort] = useState({ sort_by: 'start_time', order: 'desc' });
    const [searchTermInput, setSearchTermInput] = useState('');
    const searchTimeout = useRef<number | null>(null);

    const loadTasks = useCallback(async (showLoading = true) => {
        if (showLoading) setIsLoading(true);
        setError(null);
        try {
            const params = {
                page: pagination.page,
                page_size: pagination.limit,
                status: filters.status || undefined,
                search_term: filters.search_term || undefined,
                sort_by: sort.sort_by,
                order: sort.order,
            };
            const tasksResponse = await getLivestreamTasks(params);

            if (tasksResponse && Array.isArray(tasksResponse.items)) {
                setTasks(tasksResponse.items);
                setPagination({
                    page: tasksResponse.page,
                    // FIX: Property 'page_size' does not exist on type 'PaginatedResponse<LivestreamTask>'. Use 'limit' instead.
                    limit: tasksResponse.limit || pagination.limit,
                    total: tasksResponse.total,
                    // FIX: Property 'page_size' does not exist on type 'PaginatedResponse<LivestreamTask>'. Use 'limit' instead.
                    totalPages: tasksResponse.totalPages || Math.ceil(tasksResponse.total / (tasksResponse.limit || pagination.limit)) || 1,
                });
            } else {
                setTasks([]);
                setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '发生未知错误');
        } finally {
            if (showLoading) setIsLoading(false);
        }
    }, [pagination.page, pagination.limit, filters, sort]);

    useEffect(() => {
        loadTasks();
    }, [loadTasks]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTermInput(e.target.value);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        searchTimeout.current = window.setTimeout(() => {
            setFilters(prev => ({ ...prev, search_term: e.target.value }));
            setPagination(prev => ({ ...prev, page: 1 }));
        }, 500);
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, status: e.target.value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleSort = (column: string) => {
        const isAsc = sort.sort_by === column && sort.order === 'asc';
        setSort({ sort_by: column, order: isAsc ? 'desc' : 'asc' });
    };

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

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
            await loadTasks(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : `操作失败`);
        } finally {
            setActionLoading(false);
            setTaskToAction(null);
        }
    };

    const handleConfirmReanalyze = async (reanalyzeAction: 'reprocess' | 'resummarize') => {
        if (!taskToReanalyze) return;

        setActionLoading(true);
        setError(null);
        try {
            if (!taskToReanalyze.id) {
                throw new Error("操作失败：任务ID不存在。");
            }
            if (reanalyzeAction === 'resummarize') {
                await resummarizeTask(taskToReanalyze.id);
            } else {
                await reprocessTask(taskToReanalyze.id);
            }
            await loadTasks(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : `重新分析失败`);
        } finally {
            setActionLoading(false);
            setTaskToReanalyze(null);
        }
    };


    const handleViewReport = (task: LivestreamTask) => {
        if (task.status.toLowerCase() === 'completed' && task.summary_report) {
            setSelectedEvent(task);
        }
    };
    
    return (
        <div className="p-4 md:p-6 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-800">发布会任务管理</h1>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button onClick={() => loadTasks()} className="p-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading && !tasks.length ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex-grow sm:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                        <PlusIcon className="w-4 h-4" /> <span>创建分析任务</span>
                    </button>
                </div>
            </div>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}

            <div className="mb-4 p-4 bg-white rounded-lg border flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={searchTermInput} onChange={handleSearchChange} placeholder="搜索任务名称..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <select value={filters.status} onChange={handleStatusChange} className="bg-white border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">所有状态</option>
                    <option value="recording">直播中</option>
                    <option value="listening">监听中</option>
                    <option value="pending">即将开始</option>
                    <option value="processing">AI总结中</option>
                    <option value="completed">已结束</option>
                    <option value="failed">失败</option>
                </select>
            </div>
            
            <div className="flex-1 overflow-y-auto">
                {/* Desktop Table */}
                <div className="bg-white rounded-lg border overflow-x-auto hidden md:block">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <SortableHeader column="task_name" label="任务名称" sortConfig={sort} onSort={handleSort} />
                                <th scope="col" className="px-6 py-3">分析提示词</th>
                                <SortableHeader column="start_time" label="开始时间" sortConfig={sort} onSort={handleSort} />
                                <SortableHeader column="status" label="状态" sortConfig={sort} onSort={handleSort} />
                                <th scope="col" className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10">加载中...</td></tr>
                            ) : !isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-10">未找到任何任务。</td></tr>
                            ) : (
                                tasks.map(task => {
                                    const statusBadge = getStatusBadge(task.status);
                                    const isActionable = ['processing', 'completed', 'failed'].includes(task.status.toLowerCase());
                                    const isReanalyzable = ['completed', 'failed'].includes(task.status.toLowerCase());
                                    return (
                                    <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            <a href={task.live_url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 hover:underline" title={task.live_url}>
                                                {task.task_name}
                                            </a>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-mono" title={task.summary_prompt}>{task.summary_prompt || '默认'}</td>
                                        <td className="px-6 py-4">{new Date(task.start_time).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                                        <td className="px-6 py-4"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span></td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                                {task.status.toLowerCase() === 'pending' && (
                                                    <button onClick={() => handleAction(task, 'start')} className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200">开始</button>
                                                )}
                                                {['listening', 'recording'].includes(task.status.toLowerCase()) && (
                                                    <button onClick={() => handleAction(task, 'stop')} className="px-2 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200">停止</button>
                                                )}
                                                <button onClick={() => handleViewReport(task)} disabled={!task.summary_report} className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">报告</button>
                                                <button onClick={() => setStatsModalTask(task)} className="px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200">状态详情</button>
                                                <button onClick={() => setManuscriptModalTask(task)} disabled={!isActionable} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">文稿</button>
                                                {isReanalyzable && (
                                                    <button onClick={() => setTaskToReanalyze(task)} className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200">重新分析</button>
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
                     tasks.map(task => {
                        const statusBadge = getStatusBadge(task.status);
                        const isActionable = ['processing', 'completed', 'failed'].includes(task.status.toLowerCase());
                        const isReanalyzable = ['completed', 'failed'].includes(task.status.toLowerCase());
                        return (
                            <div key={task.id} className="bg-white rounded-lg border p-4 shadow-sm">
                                <div className="flex justify-between items-start">
                                    <a href={task.live_url} target="_blank" rel="noopener noreferrer" className="font-bold text-gray-900 pr-4 hover:text-blue-600 hover:underline" title={task.live_url}>
                                        {task.task_name}
                                    </a>
                                    <span className={`flex-shrink-0 px-2 py-1 text-xs font-semibold rounded-full ${statusBadge.className}`}>{statusBadge.text}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t text-sm space-y-2">
                                    <p><strong className="text-gray-500">开始时间: </strong>{new Date(task.start_time).toLocaleString('zh-CN')}</p>
                                    <p><strong className="text-gray-500">提示词: </strong><span className="font-mono text-xs">{task.summary_prompt || '默认'}</span></p>
                                </div>
                                <div className="mt-4 flex items-center justify-end gap-2 flex-wrap">
                                    {task.status.toLowerCase() === 'pending' && (
                                        <button onClick={() => handleAction(task, 'start')} className="px-2 py-1 text-xs font-semibold text-green-700 bg-green-100 rounded-md hover:bg-green-200">开始</button>
                                    )}
                                    {['listening', 'recording'].includes(task.status.toLowerCase()) && (
                                        <button onClick={() => handleAction(task, 'stop')} className="px-2 py-1 text-xs font-semibold text-yellow-700 bg-yellow-100 rounded-md hover:bg-yellow-200">停止</button>
                                    )}
                                    <button onClick={() => handleViewReport(task)} disabled={!task.summary_report} className="px-2 py-1 text-xs font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed">报告</button>
                                    <button onClick={() => setStatsModalTask(task)} className="px-2 py-1 text-xs font-semibold text-teal-700 bg-teal-100 rounded-md hover:bg-teal-200">状态详情</button>
                                    <button onClick={() => setManuscriptModalTask(task)} disabled={!isActionable} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">文稿</button>
                                    {isReanalyzable && (
                                        <button onClick={() => setTaskToReanalyze(task)} className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-100 rounded-md hover:bg-purple-200">重新分析</button>
                                    )}
                                    <button onClick={() => handleAction(task, 'delete')} className="px-2 py-1 text-xs font-semibold text-red-700 bg-red-100 rounded-md hover:bg-red-200">删除</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex-shrink-0 flex flex-col md:flex-row justify-between items-center mt-4 text-sm gap-4">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span>第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>

            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={loadTasks} />}
            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
            {manuscriptModalTask && manuscriptModalTask.id && <ManuscriptDisplayModal taskId={manuscriptModalTask.id} taskName={manuscriptModalTask.task_name} onClose={() => setManuscriptModalTask(null)} />}
            {taskToReanalyze && (
                <ReanalyzeOptionsModal
                    task={taskToReanalyze}
                    onClose={() => setTaskToReanalyze(null)}
                    onConfirm={handleConfirmReanalyze}
                    isLoading={actionLoading}
                />
            )}
            {taskToAction && (
                <ConfirmationModal
                    title={`确认${{ delete: '删除', start: '开始监听', stop: '停止监听' }[taskToAction.action]}任务`}
                    message={`您确定要${{ delete: '删除', start: '开始监听', stop: '停止监听' }[taskToAction.action]} "${taskToAction.task.task_name}" 吗？`}
                    confirmText={`确认${{ delete: '删除', start: '开始', stop: '停止' }[taskToAction.action]}`}
                    onConfirm={confirmAction}
                    onCancel={() => setTaskToAction(null)}
                    isLoading={actionLoading}
                />
            )}
            {statsModalTask && <StatsDisplayModal task={statsModalTask} onClose={() => setStatsModalTask(null)} />}
        </div>
    );
};