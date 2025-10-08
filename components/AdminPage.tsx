import React, { useState, useEffect, useMemo } from 'react';
import { Subscription, ProcessingTask, ApiProcessingTask } from '../types';
import { getProcessingTasks, getPoints } from '../api';
import { PlusIcon, PlayIcon, StopIcon, TrashIcon } from './icons';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { AddEventModal } from './AddEventModal';
import { ConfirmationModal } from './ConfirmationModal';

const StatusBadge: React.FC<{ status: ProcessingTask['status'] }> = ({ status }) => {
    const statusMap = {
        pending: { text: '待处理', color: 'bg-gray-100 text-gray-700' },
        processing: { text: '处理中', color: 'bg-blue-100 text-blue-700' },
        completed: { text: '已完成', color: 'bg-green-100 text-green-700' },
        failed: { text: '失败', color: 'bg-red-100 text-red-700' },
    };
    const { text, color } = statusMap[status] || statusMap.pending;
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>{text}</span>;
};

export const AdminPage: React.FC<{ subscriptions: Subscription[], onSubscriptionsUpdate: (subs: Subscription[]) => void }> = ({ subscriptions, onSubscriptionsUpdate }) => {
    const [tasks, setTasks] = useState<ProcessingTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isAddSubModalOpen, setAddSubModalOpen] = useState(false);
    const [isAddEventModalOpen, setAddEventModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ProcessingTask | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const pointMap = useMemo(() => {
        return new Map(subscriptions.map(sub => [sub.id, { point_name: sub.point_name, source_name: sub.source_name }]));
    }, [subscriptions]);
    
    useEffect(() => {
        const fetchTasks = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { items: apiTasks } = await getProcessingTasks({});
                const enrichedTasks = apiTasks.map((task: ApiProcessingTask): ProcessingTask => {
                    const pointInfo = pointMap.get(task.point_id);
                    return {
                        id: task.id,
                        point_id: task.point_id,
                        article_id: task.article_id,
                        status: task.status,
                        log: task.log,
                        created_at: task.created_at,
                        updated_at: task.updated_at,
                        source_name: pointInfo?.source_name || '未知来源',
                        point_name: pointInfo?.point_name || '未知关注点',
                    };
                });
                setTasks(enrichedTasks);
            } catch (err: any) {
                setError(err.message || "无法加载处理任务");
            } finally {
                setIsLoading(false);
            }
        };

        if (pointMap.size > 0) { // Only fetch tasks if we have points to map them to
             fetchTasks();
        }
    }, [pointMap]);

    const handleAddSubscription = async () => {
        // Here you would call the API to add a subscription
        // and then refetch or update the state
        console.log("Adding subscription...");
        setAddSubModalOpen(false);
        // Refetch subscriptions
        const updatedSubs = await getPoints();
        onSubscriptionsUpdate(updatedSubs);
    };

    const handleDelete = async () => {
        if (!itemToDelete) return;
        setIsDeleting(true);
        try {
            // await deleteTask(itemToDelete.id); // Assuming a deleteTask API function exists
            console.log(`Simulating delete for task ${itemToDelete.id}`);
            await new Promise(res => setTimeout(res, 500));
            setTasks(prev => prev.filter(t => t.id !== itemToDelete!.id));
            setItemToDelete(null);
        } catch (err) {
            console.error("Failed to delete task", err);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="p-6 bg-gray-50/50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-800">后台管理</h1>
                        <p className="text-gray-500 mt-1">监控系统任务、管理情报源和事件。</p>
                    </div>
                     <div className="flex items-center space-x-3">
                        <button onClick={() => setAddSubModalOpen(true)} className="px-4 py-2 bg-white border border-gray-300 text-gray-700 font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            添加订阅点
                        </button>
                        <button onClick={() => setAddEventModalOpen(true)} className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition flex items-center gap-2">
                            <PlusIcon className="w-5 h-5" />
                            新增事件任务
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b">
                        <h2 className="text-lg font-semibold text-gray-800">情报处理任务队列</h2>
                    </div>
                    {isLoading && <div className="p-6 text-center">加载任务中...</div>}
                    {error && <div className="p-6 text-center text-red-500">{error}</div>}
                    {!isLoading && !error && (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">来源/关注点</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">创建时间</th>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">更新时间</th>
                                        <th scope="col" className="relative px-6 py-3"><span className="sr-only">操作</span></th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {tasks.map(task => (
                                        <tr key={task.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{task.source_name}</div>
                                                <div className="text-sm text-gray-500">{task.point_name}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <StatusBadge status={task.status} />
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(task.updated_at).toLocaleString('zh-CN')}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                <button className="p-2 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100 transition"><PlayIcon className="w-4 h-4" title="重新运行" /></button>
                                                <button onClick={() => setItemToDelete(task)} className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-100 transition"><TrashIcon className="w-4 h-4" title="删除" /></button>
                                            </td>
                                        </tr>
                                    ))}
                                    {tasks.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                                                暂无处理任务。
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {isAddSubModalOpen && <AddSubscriptionModal onClose={() => setAddSubModalOpen(false)} onSave={handleAddSubscription} />}
            {isAddEventModalOpen && <AddEventModal onClose={() => setAddEventModalOpen(false)} onSuccess={() => console.log("Event added")} />}
            {itemToDelete && (
                <ConfirmationModal 
                    title="确认删除"
                    message={`您确定要删除这个任务吗？此操作无法撤销。`}
                    onConfirm={handleDelete}
                    onCancel={() => setItemToDelete(null)}
                    isLoading={isDeleting}
                />
            )}
        </div>
    );
};
