// src/components/AdminPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Subscription, ApiProcessingTask, ProcessingTask, Event } from '../types';
import {
  addPoint,
  updatePoint,
  deletePoint,
  getProcessingTasks,
  retryProcessingTask,
  convertApiTaskToFrontendEvent,
} from '../api';
import { AddSubscriptionModal } from './AddSubscriptionModal';
import { ConfirmationModal } from './ConfirmationModal';
import { PlusIcon, TrashIcon, PlayIcon, StopIcon } from './icons';
import { AddEventModal } from './AddEventModal';
import { getEvents } from '../api';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- 情报点管理组件 ---
const SubscriptionsManager: React.FC<{
  initialSubscriptions: Subscription[];
  onSubscriptionsUpdate: (subs: Subscription[]) => void;
  onAddSource: () => void;
}> = ({ initialSubscriptions, onSubscriptionsUpdate, onAddSource }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleToggleActive = async (sub: Subscription) => {
    try {
      const updatedSub = await updatePoint(sub.id, { is_active: !sub.is_active });
      onSubscriptionsUpdate(
        initialSubscriptions.map(s => (s.id === updatedSub.id ? updatedSub : s))
      );
    } catch (err) {
      console.error('Failed to toggle subscription active state', err);
      setError('更新状态失败，请重试。');
    }
  };

  const handleSaveNew = async (newSubData: Omit<Subscription, 'id' | 'keywords' | 'newItemsCount'>) => {
    setIsLoading(true);
    setError('');
    try {
      const addedSub = await addPoint(newSubData);
      onSubscriptionsUpdate([addedSub, ...initialSubscriptions]);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error('Failed to add subscription', err);
      setError('添加订阅失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    setError('');
    try {
      await deletePoint(itemToDelete.id);
      onSubscriptionsUpdate(initialSubscriptions.filter(s => s.id !== itemToDelete.id));
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete subscription', err);
      setError('删除订阅失败，请重试。');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">情报点管理</h2>
        <div className="flex space-x-2">
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
            >
                <PlusIcon className="w-4 h-4" />
                <span>添加情报点</span>
            </button>
            <button
                onClick={onAddSource}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg shadow-sm hover:bg-gray-50 transition"
            >
                <PlusIcon className="w-4 h-4" />
                <span>添加自定义源 (URL)</span>
            </button>
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="text-xs text-gray-700 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">情报源</th>
              <th className="px-4 py-3">情报点</th>
              <th className="px-4 py-3">URL</th>
              <th className="px-4 py-3">刷新周期</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {initialSubscriptions.map(sub => (
              <tr key={sub.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{sub.source_name}</td>
                <td className="px-4 py-3">{sub.point_name}</td>
                <td className="px-4 py-3 max-w-xs truncate"><a href={sub.point_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{sub.point_url}</a></td>
                <td className="px-4 py-3">{sub.cron_schedule}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sub.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {sub.is_active ? '采集中' : '已暂停'}
                  </span>
                </td>
                <td className="px-4 py-3 flex items-center justify-center space-x-2">
                  <button onClick={() => handleToggleActive(sub)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title={sub.is_active ? '暂停' : '启动'}>
                    {sub.is_active ? <StopIcon className="w-4 h-4" /> : <PlayIcon className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setItemToDelete(sub)} className="p-2 text-red-500 hover:bg-red-100 rounded-full" title="删除">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isAddModalOpen && (
        <AddSubscriptionModal
          onClose={() => setIsAddModalOpen(false)}
          onSave={handleSaveNew}
        />
      )}
      {itemToDelete && (
        <ConfirmationModal
          title="确认删除"
          message={`您确定要删除情报点 "${itemToDelete.point_name}" 吗？此操作无法撤销。`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setItemToDelete(null)}
          isLoading={isLoading}
        />
      )}
    </div>
  );
};

// --- 任务队列组件 ---
const TaskQueueManager: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    const [tasks, setTasks] = useState<ProcessingTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isAddEventModalOpen, setIsAddEventModalOpen] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const { tasks: apiTasks } = await getProcessingTasks(1, 100);
            const enrichedTasks = apiTasks.map(task => {
                const sub = subscriptions.find(s => s.id === task.point_id);
                return {
                    ...task,
                    source_name: sub?.source_name || 'N/A',
                    point_name: sub?.point_name || 'N/A',
                };
            });
            setTasks(enrichedTasks);
        } catch (err: any) {
            setError(err.message || '无法加载任务队列');
        } finally {
            setIsLoading(false);
        }
    }, [subscriptions]);

    useEffect(() => {
        fetchTasks();
         getEvents(1).then(({events}) => setEvents(events));
    }, [fetchTasks]);
    
    const handleRetry = async (taskId: string) => {
        try {
            const updatedTask = await retryProcessingTask(taskId);
            setTasks(tasks.map(t => t.id === taskId ? {
                ...t,
                status: updatedTask.status,
                log: updatedTask.log,
            } : t));
        } catch (err) {
            setError('重试任务失败');
        }
    };
    
    const handleAddEventSuccess = (newEvent: any) => {
        setEvents(prev => [convertApiTaskToFrontendEvent(newEvent), ...prev]);
        setIsAddEventModalOpen(false);
    }
    
    const getStatusChip = (status: ProcessingTask['status']) => {
        switch (status) {
            case 'completed': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">完成</span>;
            case 'processing': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 animate-pulse">处理中</span>;
            case 'failed': return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">失败</span>;
            case 'pending':
            default:
                return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">待处理</span>;
        }
    };

    return (
         <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">任务队列</h2>
                 <button
                    onClick={() => setIsAddEventModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 transition"
                >
                    <PlusIcon className="w-4 h-4" />
                    <span>新增事件任务</span>
                </button>
            </div>
            {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
            {isLoading ? <div className="text-center p-8"><Spinner/></div> : (
                <div className="overflow-x-auto">
                     <table className="w-full text-sm text-left text-gray-600">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-4 py-3">情报点</th>
                                <th className="px-4 py-3">文章ID</th>
                                <th className="px-4 py-3">状态</th>
                                <th className="px-4 py-3">创建时间</th>
                                <th className="px-4 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-4 py-3">{task.point_name}</td>
                                    <td className="px-4 py-3 font-mono text-xs">{task.article_id}</td>
                                    <td className="px-4 py-3">{getStatusChip(task.status)}</td>
                                    <td className="px-4 py-3">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                    <td className="px-4 py-3 text-center">
                                        {task.status === 'failed' && (
                                            <button onClick={() => handleRetry(task.id)} className="font-medium text-blue-600 hover:underline text-xs">重试</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
             {isAddEventModalOpen && <AddEventModal onClose={() => setIsAddEventModalOpen(false)} onSuccess={handleAddEventSuccess} />}
        </div>
    );
};

export const AdminPage: React.FC<{
  subscriptions: Subscription[];
  onSubscriptionsUpdate: (subs: Subscription[]) => void;
  onAddSource: () => void;
}> = ({ subscriptions, onSubscriptionsUpdate, onAddSource }) => {
  return (
    <div className="p-6 bg-gray-50/50 min-h-full space-y-6">
      <SubscriptionsManager 
        initialSubscriptions={subscriptions} 
        onSubscriptionsUpdate={onSubscriptionsUpdate} 
        onAddSource={onAddSource}
      />
      <TaskQueueManager subscriptions={subscriptions} />
    </div>
  );
};
