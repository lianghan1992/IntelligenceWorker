import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LivestreamTask } from '../../types';
import { getLivestreamTasks, deleteLivestreamTask, getLivestreamTasksStats, startListenTask, stopListenTask } from '../../api';
import { AddEventModal } from './AddEventModal';
import { AddHistoryEventModal } from './AddHistoryEventModal';
import { 
    PlusIcon, RefreshIcon, DocumentTextIcon, TrashIcon, PlayIcon, StopIcon, EyeIcon, CheckIcon, SparklesIcon,
    ChevronDownIcon, ChevronUpDownIcon, SearchIcon, VideoCameraIcon, CloseIcon
} from '../icons';
import { ConfirmationModal } from './ConfirmationModal';
import { EventReportModal } from './EventReportModal';
import { LogDisplayModal } from './LogDisplayModal';
import { ManuscriptDisplayModal } from './ManuscriptDisplayModal';


// Helper function to safely handle various image data formats from the backend
const getSafeImageSrc = (imageData: string | null | undefined): string | null => {
  // 1. Initial cleanup for falsy or placeholder values
  if (!imageData || imageData.trim() === '' || imageData.toLowerCase() === 'none' || imageData.toLowerCase() === 'null') {
    return null;
  }
  
  // 2. Handle full external URLs
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }

  // 3. Handle potential data URIs, including broken ones due to double-encoding
  if (imageData.startsWith('data:image')) {
    const parts = imageData.split(',');
    if (parts.length < 2) return null; // Malformed

    const prefix = parts[0];
    let payload = parts.slice(1).join(',');

    try {
      // Attempt to decode, checking for double-encoding
      const decodedPayload = atob(payload);

      if (decodedPayload.startsWith('data:image')) {
        // Case: The entire data URI was base64 encoded. The decoded payload is the correct URI.
        // e.g., base64('data:image/jpeg;base64,/9j/...')
        return decodedPayload;
      } else if (decodedPayload.startsWith('/9j/')) {
        // Case: The base64 data was double-encoded.
        // e.g., base64('/9j/...')
        return `${prefix},${decodedPayload}`;
      }
    } catch (e) {
      // Decoding failed, which is expected for a correct, single-encoded base64 string.
      // We can proceed assuming the original imageData is correct.
    }
    
    // If no double-encoding was detected, return the original URI as is.
    return imageData;
  }
  
  // 4. Fallback for raw base64 string without a prefix
  try {
    atob(imageData); // Verify it's valid base64
    return `data:image/jpeg;base64,${imageData}`;
  } catch (e) {
    console.error("Invalid image data format:", imageData);
    return null; // The data is not a URL, not a data URI, and not valid raw base64.
  }
};


// --- Internal Components ---
const StatCard: React.FC<{ title: string; value: number | string; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200 flex items-center gap-4 shadow-sm">
        <div className="bg-blue-100 text-blue-600 p-3 rounded-full flex-shrink-0">{icon}</div>
        <div>
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

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
                // FIX: Use rotated ChevronDownIcon for ascending sort indicator
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
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<LivestreamTask | null>(null);
    const [taskToAction, setTaskToAction] = useState<{task: LivestreamTask, action: 'delete' | 'start' | 'stop'} | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [logModalTask, setLogModalTask] = useState<LivestreamTask | null>(null);
    const [manuscriptModalTask, setManuscriptModalTask] = useState<LivestreamTask | null>(null);
    
    // Data state
    const [stats, setStats] = useState<any>({});
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
                limit: pagination.limit,
                status: filters.status || undefined,
                search_term: filters.search_term || undefined,
                sort_by: sort.sort_by,
                order: sort.order,
            };
            const [tasksResponse, statsResponse] = await Promise.all([
                getLivestreamTasks(params),
                getLivestreamTasksStats()
            ]);

            if (tasksResponse && Array.isArray(tasksResponse.items)) {
                setTasks(tasksResponse.items);
                setPagination({
                    page: tasksResponse.page,
                    limit: tasksResponse.limit,
                    total: tasksResponse.total,
                    totalPages: tasksResponse.totalPages ?? 1,
                });
            } else {
                setTasks([]);
                setPagination({ page: 1, limit: 10, total: 0, totalPages: 1 });
            }
            setStats(statsResponse || {});
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
            switch (action) {
                case 'delete': await deleteLivestreamTask(task.id); break;
                case 'start': await startListenTask(task.id); break;
                case 'stop': await stopListenTask(task.id); break;
            }
            await loadTasks(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : `操作失败`);
        } finally {
            setActionLoading(false);
            setTaskToAction(null);
        }
    };

    const handleViewReport = (task: LivestreamTask) => {
        if (task.status.toLowerCase() === 'completed' && task.summary_report) {
            setSelectedEvent(task);
        }
    };
    
    return (
        <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">发布会任务管理</h1>
                <div className="flex items-center gap-2">
                    <button onClick={() => loadTasks()} className="p-2 bg-white border border-gray-300 text-gray-700 rounded-lg shadow-sm hover:bg-gray-100 transition" title="刷新">
                        <RefreshIcon className={`w-5 h-5 ${isLoading && !tasks.length ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={() => setIsHistoryModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition">
                        <PlusIcon className="w-4 h-4" /> <span>创建历史任务</span>
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                        <PlusIcon className="w-4 h-4" /> <span>创建分析任务</span>
                    </button>
                </div>
            </div>

            {error && <div className="mb-4 text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</div>}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <StatCard title="全部任务" value={stats.total || 0} icon={<DocumentTextIcon className="w-6 h-6"/>} />
                <StatCard title="直播中" value={stats.recording || 0} icon={<VideoCameraIcon className="w-6 h-6"/>} />
                <StatCard title="监听中" value={stats.listening || 0} icon={<EyeIcon className="w-6 h-6"/>} />
                <StatCard title="AI总结中" value={stats.processing || 0} icon={<SparklesIcon className="w-6 h-6"/>} />
                <StatCard title="已完成" value={stats.completed || 0} icon={<CheckIcon className="w-6 h-6"/>} />
                <StatCard title="失败" value={stats.failed || 0} icon={<CloseIcon className="w-6 h-6"/>} />
            </div>

            <div className="mb-4 p-4 bg-white rounded-lg border flex items-center gap-4">
                <div className="relative flex-grow">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input type="text" value={searchTermInput} onChange={handleSearchChange} placeholder="搜索直播名称或主播..." className="w-full bg-white border border-gray-300 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500" />
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
            
            <div className="bg-white rounded-lg border overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3 w-24">封面</th>
                            <SortableHeader column="livestream_name" label="直播名称" sortConfig={sort} onSort={handleSort} />
                            <th scope="col" className="px-6 py-3">主播/公司</th>
                            <SortableHeader column="start_time" label="开始时间" sortConfig={sort} onSort={handleSort} />
                            <SortableHeader column="status" label="状态" sortConfig={sort} onSort={handleSort} />
                            <th scope="col" className="px-6 py-3 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr><td colSpan={6} className="text-center py-10">加载中...</td></tr>
                        ) : tasks.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10">未找到任何任务。</td></tr>
                        ) : (
                            tasks.map(task => {
                                const statusBadge = getStatusBadge(task.status);
                                const imageUrl = getSafeImageSrc(task.livestream_image);
                                const isActionable = ['processing', 'completed', 'failed'].includes(task.status.toLowerCase());
                                return (
                                <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4">
                                        {imageUrl ? <img src={imageUrl} alt="" className="w-16 h-10 object-cover rounded-md bg-gray-200" /> : <div className="w-16 h-10 rounded-md bg-gray-200 flex items-center justify-center"><VideoCameraIcon className="w-6 h-6 text-gray-400"/></div>}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{task.livestream_name}<br/><span className="text-xs text-gray-500 font-normal">{task.entity}</span></td>
                                    <td className="px-6 py-4">{task.host_name}</td>
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
                                            <button onClick={() => setLogModalTask(task)} disabled={!isActionable} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">日志</button>
                                            <button onClick={() => setManuscriptModalTask(task)} disabled={!isActionable} className="px-2 py-1 text-xs font-semibold text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">文稿</button>
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

            <div className="flex justify-between items-center mt-4 text-sm">
                <span className="text-gray-600">共 {pagination.total} 条</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page <= 1} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">上一页</button>
                    <span>第 {pagination.page} / {pagination.totalPages} 页</span>
                    <button onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} className="px-3 py-1 bg-white border rounded-md disabled:opacity-50">下一页</button>
                </div>
            </div>

            {isAddModalOpen && <AddEventModal onClose={() => setIsAddModalOpen(false)} onSuccess={loadTasks} />}
            {isHistoryModalOpen && <AddHistoryEventModal onClose={() => setIsHistoryModalOpen(false)} onSuccess={loadTasks} />}
            {selectedEvent && <EventReportModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
            {logModalTask && <LogDisplayModal taskId={logModalTask.id} taskName={logModalTask.livestream_name} onClose={() => setLogModalTask(null)} />}
            {manuscriptModalTask && <ManuscriptDisplayModal taskId={manuscriptModalTask.id} taskName={manuscriptModalTask.livestream_name} onClose={() => setManuscriptModalTask(null)} />}
            {taskToAction && (
                <ConfirmationModal
                    title={`确认${{ delete: '删除', start: '开始监听', stop: '停止监听' }[taskToAction.action]}任务`}
                    message={`您确定要${{ delete: '删除', start: '开始监听', stop: '停止监听' }[taskToAction.action]} "${taskToAction.task.livestream_name}" 吗？`}
                    confirmText={`确认${{ delete: '删除', start: '开始', stop: '停止' }[taskToAction.action]}`}
                    onConfirm={confirmAction}
                    onCancel={() => setTaskToAction(null)}
                    isLoading={actionLoading}
                />
            )}
        </div>
    );
};