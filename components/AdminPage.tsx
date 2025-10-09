// src/components/AdminPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Subscription, ProcessingTask, AdminView } from '../types';
import {
  addPoint,
  deletePoints,
  getProcessingTasks,
  retryProcessingTask,
  getAllIntelligencePoints,
} from '../api';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, TrashIcon, LightBulbIcon, UsersIcon, DiveIcon, VideoCameraIcon } from './icons';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


// --- Intelligence Management Module ---
const IntelligenceManager: React.FC = () => {
    const [points, setPoints] = useState<Subscription[]>([]);
    const [tasks, setTasks] = useState<ProcessingTask[]>([]);
    const [isLoading, setIsLoading] = useState({ points: true, tasks: true });
    const [error, setError] = useState({ points: '', tasks: '' });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPointIds, setSelectedPointIds] = useState<Set<string>>(new Set());
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

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

    const fetchTasks = useCallback(async () => {
        setIsLoading(prev => ({ ...prev, tasks: true }));
        setError(prev => ({ ...prev, tasks: ''}));
        try {
            const { tasks: apiTasks } = await getProcessingTasks(1, 100);
            setTasks(apiTasks);
        } catch (err: any) {
            setError(prev => ({ ...prev, tasks: err.message || '无法加载任务队列' }));
        } finally {
            setIsLoading(prev => ({ ...prev, tasks: false }));
        }
    }, []);
    
    useEffect(() => {
        fetchAllPoints();
        fetchTasks();
    }, [fetchAllPoints, fetchTasks]);

    const handleSaveNewPoint = async (newPointData: Omit<Subscription, 'id' | 'keywords' | 'newItemsCount' | 'is_active' | 'last_triggered_at' | 'created_at' | 'updated_at' | 'source_id'>) => {
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
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedPointIds(newSelection);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedPointIds(new Set(points.map(p => p.id)));
        } else {
            setSelectedPointIds(new Set());
        }
    };

    const getStatusChip = (status: ProcessingTask['status']) => {
        const statusLower = status.toLowerCase();
        if (statusLower.includes('completed')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">完成</span>;
        if (statusLower.includes('processing') || statusLower.includes('jina')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 animate-pulse">处理中</span>;
        if (statusLower.includes('failed')) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>;
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">待处理</span>;
    };

    return (
        <div className="space-y-6">
            {/* Intelligence Points Manager */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-gray-800">情报点列表</h3>
                    <div className="flex items-center space-x-2">
                        {selectedPointIds.size > 0 && (
                            <button onClick={() => setIsDeleteConfirmOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-semibold rounded-lg hover:bg-red-200 transition">
                                <TrashIcon className="w-4 h-4" />
                                <span>删除选中 ({selectedPointIds.size})</span>
                            </button>
                        )}
                        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition">
                            <PlusIcon className="w-4 h-4" />
                            <span>添加情报点</span>
                        </button>
                    </div>
                </div>
                {error.points && <p className="text-sm text-red-600 mb-2">{error.points}</p>}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="p-4 w-4"><input type="checkbox" onChange={handleSelectAll} checked={selectedPointIds.size === points.length && points.length > 0} /></th>
                                <th className="px-4 py-3">情报源</th>
                                <th className="px-4 py-3">情报点</th>
                                <th className="px-4 py-3">URL</th>
                                <th className="px-4 py-3">刷新周期</th>
                                <th className="px-4 py-3">状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading.points ? (
                                <tr><td colSpan={6} className="text-center py-8"><Spinner /></td></tr>
                            ) : points.map(point => (
                                <tr key={point.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="p-4 w-4"><input type="checkbox" onChange={() => handleSelectPoint(point.id)} checked={selectedPointIds.has(point.id)} /></td>
                                    <td className="px-4 py-3 font-medium">{point.source_name}</td>
                                    <td className="px-4 py-3">{point.point_name}</td>
                                    <td className="px-4 py-3 max-w-xs truncate"><a href={point.point_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{point.point_url}</a></td>
                                    <td className="px-4 py-3 font-mono text-xs">{point.cron_schedule}</td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${point.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {point.is_active ? '采集中' : '未知'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Task Queue Manager */}
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <h3 className="text-lg font-bold text-gray-800 mb-4">采集任务队列</h3>
                {error.tasks && <p className="text-sm text-red-600 mb-2">{error.tasks}</p>}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                             <tr>
                                <th className="px-4 py-3">情报点</th>
                                <th className="px-4 py-3">URL</th>
                                <th className="px-4 py-3">状态</th>
                                <th className="px-4 py-3">创建时间</th>
                            </tr>
                        </thead>
                        <tbody>
                           {isLoading.tasks ? (
                                <tr><td colSpan={4} className="text-center py-8"><Spinner /></td></tr>
                            ) : tasks.map(task => (
                                <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{task.point_name}</td>
                                    <td className="px-4 py-3 font-mono text-xs max-w-xs truncate">{task.url}</td>
                                    <td className="px-4 py-3">{getStatusChip(task.status)}</td>
                                    <td className="px-4 py-3">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {isAddModalOpen && <AddSubscriptionModal onClose={() => setIsAddModalOpen(false)} onSave={handleSaveNewPoint} />}
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