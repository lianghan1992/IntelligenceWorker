import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { io, Socket } from 'socket.io-client';
import { Event } from '../types';
import { getEvents, ApiTask, stopTask, deleteEventTask, convertApiTaskToFrontendEvent } from '../api';
import { PlusIcon, ChartIcon, StopIcon, TrashIcon } from './icons';
import { AddEventModal } from './AddEventModal';
import { ConfirmationModal } from './ConfirmationModal'; 

const sortEvents = (events: Event[]): Event[] => {
    return [...events].sort((a, b) => {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    });
};

const StatusBadge: React.FC<{ status: Event['status'] }> = ({ status }) => {
    const details = {
        UPCOMING: { text: '待处理', color: 'bg-blue-100 text-blue-800' },
        LIVE: { text: '直播中', color: 'bg-red-100 text-red-800 animate-pulse' },
        SUMMARIZING: { text: 'AI总结中', color: 'bg-yellow-100 text-yellow-800' },
        CONCLUDED: { text: '已结束', color: 'bg-green-100 text-green-800' },
        FAILED: { text: '失败', color: 'bg-red-200 text-red-900' },
    };
    
    const text = status === 'UPCOMING' ? '即将开始' : details[status].text;
    
    return <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${details[status].color}`}>{text}</span>;
};


const TaskTypeBadge: React.FC<{ type: Event['taskType'] }> = ({ type }) => {
    const details = {
        LIVE: { text: '直播', color: 'bg-red-100 text-red-800' },
        OFFLINE: { text: '离线', color: 'bg-purple-100 text-purple-800' },
    }[type];
    return <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${details.color}`}>{details.text}</span>;
};

const TaskManagement: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isAddModalOpen, setAddModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
    const [eventToDelete, setEventToDelete] = useState<Event | null>(null);

    // Filters state
    const [statusFilter, setStatusFilter] = useState(''); // '' for all
    const [sourceFilter, setSourceFilter] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const observer = useRef<IntersectionObserver>();
    const lastEventElementRef = useCallback((node: HTMLTableRowElement | null) => {
        if (isLoading || isFetchingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && page < totalPages) {
                setPage(prevPage => prevPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [isLoading, isFetchingMore, page, totalPages]);

    const performAction = async (taskId: string, action: () => Promise<any>) => {
        setActionLoading(prev => ({ ...prev, [taskId]: true }));
        try {
            const result = await action();
            if (result && result.message) {
              alert(`成功: ${result.message}`);
            }
        } catch (err: any) {
            console.error("Action failed for task", taskId, err);
            alert(`操作失败: ${err.message}`);
        } finally {
            setActionLoading(prev => ({ ...prev, [taskId]: false }));
        }
    }
    
    useEffect(() => {
        const loadEvents = async () => {
            if (page === 1) setIsLoading(true); else setIsFetchingMore(true);
            setError(null);
            try {
                // API supports 'completed' for success and 'failed' for failure.
                const apiStatus = statusFilter === 'success' ? 'completed' : statusFilter;
                const { events: newEvents, totalPages: newTotalPages } = await getEvents(page, 20, apiStatus);
                setEvents(prevEvents => sortEvents(page === 1 ? newEvents : [...prevEvents, ...newEvents]));
                setTotalPages(newTotalPages);
            } catch (err) {
                setError(err instanceof Error ? err.message : '发生未知错误');
            } finally {
                setIsLoading(false);
                setIsFetchingMore(false);
            }
        };
        loadEvents();
    }, [page, statusFilter]);
    
    useEffect(() => {
        // 修复: 修复 socket.io-client 初始化问题。
        const socket: Socket = io();
        socket.on('connect', () => { 
            console.log('Admin WebSocket connected. Joining room: live_recorder');
            socket.emit('join', { room: 'live_recorder' });
        });
        
        socket.on('tasks_status_batch_update', (data: { tasks: ApiTask[] }) => {
            console.log('Admin WebSocket event: tasks_status_batch_update received', data);
            if (data && Array.isArray(data.tasks)) {
                const newEvents = data.tasks.map(convertApiTaskToFrontendEvent);
                setEvents(sortEvents(newEvents));
            }
        });

        return () => { 
            console.log('Admin WebSocket disconnecting.');
            socket.disconnect(); 
        };
    }, []);

    const displayedEvents = useMemo(() => {
        return events.filter(event => {
            const sourceMatch = !sourceFilter || event.organizer.name.toLowerCase().includes(sourceFilter.toLowerCase());
            const startDateMatch = !startDate || new Date(event.startTime) >= new Date(startDate);
            const endDateMatch = !endDate || new Date(event.startTime) <= new Date(endDate + 'T23:59:59'); // Include whole day
            return sourceMatch && startDateMatch && endDateMatch;
        });
    }, [events, sourceFilter, startDate, endDate]);

    const handleAddSuccess = (newEventData: ApiTask) => {
        setAddModalOpen(false);
        console.log("Task created successfully, waiting for WebSocket update.", newEventData);
    };

    const handleDeleteConfirm = async () => {
        if (eventToDelete) {
            const taskId = eventToDelete.id;
            await performAction(taskId, async () => {
                await deleteEventTask(taskId);
                setEvents(prevEvents => prevEvents.filter(event => event.id !== taskId));
            });
            setEventToDelete(null);
        }
    };
    
    const handleStatusChange = (newStatus: string) => {
        setStatusFilter(newStatus);
        setPage(1); // Reset page to 1 when status filter changes
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">情报采集任务管理</h2>
                <button onClick={() => setAddModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
                    <PlusIcon className="w-5 h-5"/> 新增任务
                </button>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700">任务状态</label>
                        <select onChange={(e) => handleStatusChange(e.target.value)} value={statusFilter} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">全部</option>
                            <option value="success">成功</option>
                            <option value="failed">失败</option>
                        </select>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">情报源</label>
                        <input type="text" placeholder="按名称搜索..." value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">开始日期</label>
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                     <div>
                        <label className="text-sm font-medium text-gray-700">结束日期</label>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1 w-full p-2 bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"/>
                    </div>
                </div>
                 <p className="text-xs text-gray-500 mt-2">提示：按情报源和日期筛选仅在当前加载的页面中生效。</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-600">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">标题</th>
                            <th scope="col" className="px-6 py-3">主办方/来源</th>
                            <th scope="col" className="px-6 py-3">源URI</th>
                            <th scope="col" className="px-6 py-3">类型</th>
                            <th scope="col" className="px-6 py-3">计划/创建时间</th>
                            <th scope="col" className="px-6 py-3">任务状态</th>
                            <th scope="col" className="px-6 py-3 text-right">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {displayedEvents.map((event, index) => (
                            <tr ref={events.length === index + 1 ? lastEventElementRef : null} key={event.id} className="bg-white border-b hover:bg-gray-50">
                                <td className="px-6 py-4 font-medium text-gray-900 max-w-xs truncate" title={event.title}>{event.title}</td>
                                <td className="px-6 py-4">{event.organizer.name}</td>
                                <td className="px-6 py-4 max-w-xs truncate" title={event.sourceUri || ''}>{event.sourceUri || 'N/A'}</td>
                                <td className="px-6 py-4"><TaskTypeBadge type={event.taskType} /></td>
                                <td className="px-6 py-4">{new Date(event.startTime).toLocaleString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                                <td className="px-6 py-4"><StatusBadge status={event.status} /></td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center justify-end space-x-2">
                                        <button 
                                            disabled={actionLoading[event.id] || event.taskType !== 'LIVE' || !['UPCOMING', 'LIVE'].includes(event.status)} 
                                            onClick={() => performAction(event.id, () => stopTask(event.id))} 
                                            className="p-2 text-gray-500 hover:text-orange-600 rounded-full hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed" 
                                            title="停止录制并总结">
                                            <StopIcon className="w-4 h-4"/>
                                        </button>
                                        <button 
                                            disabled={actionLoading[event.id]} 
                                            onClick={() => setEventToDelete(event)} 
                                            className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 disabled:opacity-50" 
                                            title="删除任务">
                                            <TrashIcon className="w-4 h-4"/>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {isLoading && <div className="text-center p-4">加载中...</div>}
                {isFetchingMore && <div className="text-center p-4">加载更多...</div>}
                {error && <div className="text-center p-4 text-red-500">{error}</div>}
                {!isLoading && displayedEvents.length === 0 && <div className="text-center p-10 text-gray-500">暂无符合条件的任务</div>}
            </div>
            {isAddModalOpen && <AddEventModal onClose={() => setAddModalOpen(false)} onSuccess={handleAddSuccess} />}
            {eventToDelete && (
                <ConfirmationModal 
                    title="确认删除"
                    message={`您确定要删除任务 “${eventToDelete.title}” 吗？此操作不可撤销。`}
                    onConfirm={handleDeleteConfirm}
                    onCancel={() => setEventToDelete(null)}
                    isLoading={actionLoading[eventToDelete.id]}
                />
            )}
        </div>
    );
}

export const AdminPage: React.FC = () => {
    return (
        <div className="flex h-full bg-gray-50">
            <aside className="w-64 bg-white border-r border-gray-200 flex-shrink-0 hidden md:block">
                <div className="p-4">
                    <h2 className="text-lg font-semibold text-gray-800">管理中心</h2>
                </div>
                <nav className="p-2">
                    <ul>
                        <li>
                            <a href="#" className="flex items-center gap-3 px-3 py-2 text-blue-700 bg-blue-100 rounded-md font-semibold">
                                <ChartIcon className="w-5 h-5" /> 情报采集任务
                            </a>
                        </li>
                    </ul>
                </nav>
            </aside>
            <main className="flex-1 overflow-y-auto">
                <TaskManagement />
            </main>
        </div>
    );
};