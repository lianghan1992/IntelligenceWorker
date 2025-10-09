// src/components/AdminPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Subscription, ProcessingTask, AdminView } from '../types';
import {
  addPoint,
  deletePoints,
  getProcessingTasks,
  getAllIntelligencePoints,
  getProcessingTasksStats,
} from '../api';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, TrashIcon, LightBulbIcon, UsersIcon, DiveIcon, VideoCameraIcon, ChevronDownIcon } from './icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CRON_SCHEDULE_MAP: { [key: string]: string } = {
    '*/5 * * * *': '每5分钟',
    '*/30 * * * *': '每30分钟',
    '0 * * * *': '每1小时',
    '0 */2 * * *': '每2小时',
    '0 */3 * * *': '每3小时',
    '0 */6 * * *': '每6小时',
    '0 */12 * * *': '每12小时',
};

const formatCron = (schedule: string): string => {
    return CRON_SCHEDULE_MAP[schedule] || schedule;
};


// --- Intelligence Management Module ---
const IntelligenceManager: React.FC = () => {
    const [points, setPoints] = useState<Subscription[]>([]);
    const [tasks, setTasks] = useState<ProcessingTask[]>([]);
    const [taskStats, setTaskStats] = useState<{[key: string]: number} | null>(null);
    const [openSources, setOpenSources] = useState<Set<string>>(new Set());

    const [isLoading, setIsLoading] = useState({ points: true, tasks: true, stats: true });
    const [error, setError] = useState({ points: '', tasks: '', stats: '' });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalTasks, setTotalTasks] = useState(0);
    const TASKS_PER_PAGE = 20;

    const [statusFilter, setStatusFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [pointFilter, setPointFilter] = useState('');

    const pointsBySource = useMemo(() => {
        return points.reduce((acc, point) => {
            (acc[point.source_name] = acc[point.source_name] || []).push(point);
            return acc;
        }, {} as Record<string, Subscription[]>);
    }, [points]);

    const fetchAllPoints = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, points: true }));
        setError(prev => ({ ...prev, points: ''}));
        try {
            const allPoints = await getAllIntelligencePoints();
            setPoints(allPoints);
        } catch (err: any) {
            setError(prev => ({ ...prev, points: "无法加载情报点: " + err.message }));
        } finally {
            setIsLoading(prev => ({ ...prev, points: false }));
        }
    }, []);

    const fetchStats = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, stats: true }));
        setError(prev => ({ ...prev, stats: ''}));
        try {
            const statsData = await getProcessingTasksStats();
            setTaskStats(statsData);
        } catch (err: any) {
             setError(prev => ({ ...prev, stats: "无法加载任务统计: " + err.message }));
        } finally {
            setIsLoading(prev => ({ ...prev, stats: false }));
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, tasks: true }));
        setError(prev => ({ ...prev, tasks: ''}));
        try {
            const params: any = { page: currentPage, limit: TASKS_PER_PAGE };
            if (statusFilter) params.status = statusFilter;
            if (sourceFilter) params.source_name = sourceFilter;
            if (pointFilter) params.point_name = pointFilter;
            
            const { tasks: apiTasks, totalPages: apiTotalPages, total } = await getProcessingTasks(params);
            setTasks(apiTasks.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
            setTotalPages(apiTotalPages);
            setTotalTasks(total);
        } catch (err: any) {
            setError(prev => ({ ...prev, tasks: err.message || '无法加载任务队列' }));
        } finally {
            setIsLoading(prev => ({ ...prev, tasks: false }));
        }
    }, [currentPage, statusFilter, sourceFilter, pointFilter]);
    
    useEffect(() => {
        fetchAllPoints();
        fetchStats();
    }, [fetchAllPoints, fetchStats]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleSaveNewPoint = async (newPointData: Omit<Subscription, 'id'|'keywords'|'newItemsCount'|'is_active'|'last_triggered_at'|'created_at'|'updated_at'|'source_id'>) => {
        setIsLoading(prev => ({ ...prev, points: true }));
        try {
            await addPoint(newPointData);
            await fetchAllPoints();
            setIsAddModalOpen(false);
        } catch (err: any) {
            setError(prev => ({ ...prev, points: '添加失败: ' + err.message }));
        } finally {
             setIsLoading(prev => ({ ...prev, points: false }));
        }
    };
    
    const handleDeleteSelected = async () => {
        setIsLoading(prev => ({ ...prev, points: true }));
        try {
            await deletePoints(Array.from(selectedPointIds));
            await fetchAllPoints();
            setSelectedPointIds(new Set());
            setIsDeleteConfirmOpen(false);
        } catch (err: any) {
             setError(prev => ({ ...prev, points: '删除失败: ' + err.message }));
        } finally {
            setIsLoading(prev => ({ ...prev, points: false }));
        }
    };

    const handleSelectPoint = (id: string) => {
        const newSelection = new Set(selectedPointIds);
        newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        setSelectedPointIds(newSelection);
    };
    
    const handleSelectSource = (sourceName: string, checked: boolean) => {
        const newSelection = new Set(selectedPointIds);
        const sourcePointIds = (pointsBySource[sourceName] || []).map(p => p.id);
        if (checked) {
            sourcePointIds.forEach(id => newSelection.add(id));
        } else {
            sourcePointIds.forEach(id => newSelection.delete(id));
        }
        setSelectedPointIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSelectedPointIds(e.target.checked ? new Set(points.map(p => p.id)) : new Set());
    };

    const toggleSource = (sourceName: string) => {
        const newOpenSources = new Set(openSources);
        newOpenSources.has(sourceName) ? newOpenSources.delete(sourceName) : newOpenSources.add(sourceName);
        setOpenSources(newOpenSources);
    };

    const getStatusChip = (status: ProcessingTask['status']) => {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('completed')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">完成</span>;
        if (statusLower.includes('processing') || statusLower.includes('jina')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 animate-pulse">处理中</span>;
        if (statusLower.includes('failed')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>;
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">待处理</span>;
    };

    const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCurrentPage(1);
        setter(e.target.value);
    };

    const uniqueSources = useMemo(() => Object.keys(pointsBySource), [pointsBySource]);
    const availablePoints = useMemo(() => {
        if (!sourceFilter) return [];
        return Array.from(new Set(points.filter(p => p.source_name === sourceFilter).map(p => p.point_name)));
    }, [points, sourceFilter]);

    const taskStatusOptions = ['pending_jina', 'completed', 'failed', 'processing'];
    const statusColors: { [key: string]: string } = {
        completed: 'border-green-300 bg-green-50', failed: 'border-red-300 bg-red-50',
        processing: 'border-blue-300 bg-blue-50', pending_jina: 'border-yellow-300 bg-yellow-50',
        total: 'border-gray-300 bg-gray-100',
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">情报点管理</h3>
                    <div className="flex items-center space-x-2">
                        {selectedPointIds.size > 0 && (
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 transition">
                                <TrashIcon className="w-4 h-4" /> <span>删除选中 ({selectedPointIds.size})</span>
                            </button>
                        )}
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                            <PlusIcon className="w-4 h-4" /> <span>添加情报点</span>
                        </button>
                    </div>
                </div>
                {error.points && <p className="text-sm text-red-600 mb-2">{error.points}</p>}
                
                <div className="border rounded-lg overflow-hidden">
                    <div className="p-4 bg-gray-50 flex items-center">
                        <input type="checkbox" className="mr-4" onChange={handleSelectAll} checked={points.length > 0 && selectedPointIds.size === points.length} />
                        <span className="text-xs font-semibold text-gray-600 uppercase">全选</span>
                    </div>
                    {isLoading.points ? <div className="text-center py-8"><Spinner /></div> : 
                     Object.entries(pointsBySource).map(([sourceName, sourcePoints]) => {
                        const isOpen = openSources.has(sourceName);
                        const sourcePointIds = sourcePoints.map(p => p.id);
                        const isSourceSelected = sourcePointIds.every(id => selectedPointIds.has(id));
                        return (
                            <div key={sourceName} className="border-t">
                                <div className="flex items-center p-4 cursor-pointer hover:bg-gray-50" onClick={() => toggleSource(sourceName)}>
                                    <input type="checkbox" className="mr-4" checked={isSourceSelected} onChange={(e) => handleSelectSource(sourceName, e.target.checked)} onClick={e => e.stopPropagation()} />
                                    <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform duration-200 mr-2 ${isOpen ? 'rotate-180' : ''}`} />
                                    <h4 className="font-semibold text-gray-800">{sourceName}</h4>
                                    <span className="ml-2 px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-200 rounded-full">{sourcePoints.length}</span>
                                </div>
                                {isOpen && (
                                    <div className="bg-white">
                                        <table className="w-full text-sm text-left text-gray-600">
                                            <tbody>
                                                {sourcePoints.map(point => (
                                                <tr key={point.id} className="border-t hover:bg-gray-50">
                                                    <td className="p-4 w-12 text-center"><input type="checkbox" onChange={() => handleSelectPoint(point.id)} checked={selectedPointIds.has(point.id)} /></td>
                                                    <td className="px-4 py-3">{point.point_name}</td>
                                                    <td className="px-4 py-3 max-w-xs truncate"><a href={point.point_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{point.point_url}</a></td>
                                                    <td className="px-4 py-3 text-xs">{formatCron(point.cron_schedule)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${point.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{point.is_active ? '采集中' : '未知'}</span>
                                                    </td>
                                                </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )
                     })}
                </div>
            </div>

            {/* Task Queue Manager */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">采集任务队列</h3>
                {error.tasks && <p className="text-sm text-red-600 mb-2">{error.tasks}</p>}
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                    {isLoading.stats ? <div className="col-span-full text-center p-4"><Spinner /></div> : taskStats && Object.entries(taskStats).map(([key, value]) =>(
                        <div key={key} className={`p-4 rounded-lg border ${statusColors[key] || 'bg-gray-50'}`}>
                            <p className="text-sm text-gray-500 capitalize">{key.replace(/_/g, ' ')}</p>
                            <p className="text-2xl font-bold text-gray-800">{value}</p>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-4 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex-1">
                        <label className="text-xs font-medium text-gray-600">状态</label>
                        <select value={statusFilter} onChange={handleFilterChange(setStatusFilter)} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">所有状态</option>
                            {taskStatusOptions.map(status => <option key={status} value={status}>{status}</option>)}
                        </select>
                    </div>
                     <div className="flex-1">
                        <label className="text-xs font-medium text-gray-600">情报源</label>
                        <select value={sourceFilter} onChange={handleFilterChange(setSourceFilter)} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="">所有情报源</option>
                            {uniqueSources.map(source => <option key={source} value={source}>{source}</option>)}
                        </select>
                    </div>
                     <div className="flex-1">
                        <label className="text-xs font-medium text-gray-600">情报点</label>
                        <select value={pointFilter} onChange={handleFilterChange(setPointFilter)} disabled={!sourceFilter} className="w-full mt-1 p-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-200">
                            <option value="">所有情报点</option>
                            {availablePoints.map(point => <option key={point} value={point}>{point}</option>)}
                        </select>
                    </div>
                </div>

                <div className="overflow-x-auto border rounded-lg">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                             <tr>
                                <th className="px-4 py-3">情报源</th>
                                <th className="px-4 py-3">情报点</th>
                                <th className="px-4 py-3">URL</th>
                                <th className="px-4 py-3">状态</th>
                                <th className="px-4 py-3">创建时间</th>
                                <th className="px-4 py-3">最后更新</th>
                            </tr>
                        </thead>
                        <tbody>
                           {isLoading.tasks ? (
                                <tr><td colSpan={6} className="text-center py-8"><Spinner /></td></tr>
                            ) : tasks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500">无匹配的任务</td></tr>
                            ) : tasks.map(task => (
                                <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{task.source_name}</td>
                                    <td className="px-4 py-3">{task.point_name}</td>
                                    <td className="px-4 py-3 font-mono text-xs max-w-xs truncate" title={task.url}>{task.url}</td>
                                    <td className="px-4 py-3">{getStatusChip(task.status)}</td>
                                    <td className="px-4 py-3">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                    <td className="px-4 py-3">{new Date(task.updated_at).toLocaleString('zh-CN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-gray-600">共 {totalTasks} 条记录</span>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1 || isLoading.tasks} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">上一页</button>
                        <span className="text-sm font-semibold">第 {currentPage} / {totalPages} 页</span>
                        <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage >= totalPages || isLoading.tasks} className="px-3 py-1.5 text-sm font-semibold bg-white border rounded-md disabled:opacity-50">下一页</button>
                    </div>
                </div>
            </div>
            {isAddModalOpen && <AddSubscriptionModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveNewPoint} isLoading={isLoading.points} />}
            {isDeleteConfirmOpen && (
                <ConfirmationModal
                    title="确认删除"
                    message={`您确定要删除选中的 ${selectedPointIds.size} 个情报点吗？此操作无法撤销。`}
                    onConfirm={handleDeleteSelected}
                    onCancel={() => setIsDeleteConfirmOpen(false)}
                    isLoading={isLoading.points}
                />
            )}
        </div>
    );
};

// --- Placeholder for other modules ---
const PlaceholderManager: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center justify-center h-full bg-white rounded-xl border border-dashed">
        <p className="text-gray-500">{title} 模块正在开发中...</p>
    </div>
);


// --- Main Admin Page Component ---
export const AdminPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<AdminView>('intelligence');
    
    const navItems: { key: AdminView; label: string; icon: React.FC<any> }[] = [
        { key: 'intelligence', label: '情报管理', icon: LightBulbIcon },
        { key: 'users', label: '用户管理', icon: UsersIcon },
        { key: 'dives', label: '深度洞察', icon: DiveIcon },
        { key: 'events', label: '事件管理', icon: VideoCameraIcon },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'intelligence':
                return <IntelligenceManager />;
            case 'users':
                return <PlaceholderManager title="用户管理" />;
            case 'dives':
                return <PlaceholderManager title="深度洞察管理" />;
            case 'events':
                return <PlaceholderManager title="事件管理" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex h-full bg-gray-100">
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4">
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">管理中心</h2>
                <nav className="flex flex-col space-y-1">
                    {navItems.map(item => (
                        <button
                            key={item.key}
                            onClick={() => setActiveTab(item.key)}
                            className={`flex items-center space-x-3 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                                activeTab === item.key
                                    ? 'bg-blue-50 text-blue-700'
                                    : 'text-gray-600 hover:bg-gray-100'
                            }`}
                        >
                            <item.icon className="w-5 h-5" />
                            <span>{item.label}</span>
                        </button>
                    ))}
                </nav>
            </aside>
            {/* Main Content Area */}
            <main className="flex-1 p-6 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};