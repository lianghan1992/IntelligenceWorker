import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../../types';
import { getDeepInsightTasks, uploadDeepInsightTask, getDeepInsightCategories } from '../../../api';
import { PlusIcon, RefreshIcon, DocumentTextIcon, ChartIcon } from '../../icons';
import { TaskDetail } from './TaskDetail';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const styles: any = {
        pending: 'bg-yellow-100 text-yellow-800',
        processing: 'bg-blue-100 text-blue-800 animate-pulse',
        completed: 'bg-green-100 text-green-800',
        failed: 'bg-red-100 text-red-800 font-bold'
    };
    const labels: any = {
        pending: '等待中',
        processing: '处理中',
        completed: '已完成',
        failed: '失败'
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100'}`}>{labels[status] || status}</span>;
};

export const TaskManager: React.FC = () => {
    const [viewState, setViewState] = useState<'list' | 'detail'>('list');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    
    const [uploadCategoryId, setUploadCategoryId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            // Assuming pagination params are supported, default to page 1
            const response = await getDeepInsightTasks({ page: 1, limit: 50 });
            // Handle API response structure compatibility
            if (Array.isArray(response)) {
                setTasks(response);
            } else if (response && Array.isArray(response.items)) {
                setTasks(response.items);
            } else {
                setTasks([]);
            }
        } catch (err: any) {
            // If endpoint not found, it might be just not implemented on backend yet as per doc ambiguity.
            // But we show error.
            console.warn("Fetch tasks warning:", err);
            // Mock empty if fail for demo UI
            // setTasks([]);
            setError(err.message || '获取任务列表失败 (API可能未就绪)');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchCategories = useCallback(async () => {
        try {
            const data = await getDeepInsightCategories();
            setCategories(data || []);
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => {
        fetchTasks();
        fetchCategories();
    }, [fetchTasks, fetchCategories]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError('');
        try {
            await uploadDeepInsightTask(file, uploadCategoryId || undefined);
            fetchTasks(); // Refresh list
        } catch (err: any) {
            setError(err.message || '上传失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleTaskClick = (id: string) => {
        setSelectedTaskId(id);
        setViewState('detail');
    };

    if (viewState === 'detail' && selectedTaskId) {
        return <TaskDetail taskId={selectedTaskId} onBack={() => { setViewState('list'); setSelectedTaskId(null); fetchTasks(); }} />;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg border mb-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select 
                        value={uploadCategoryId} 
                        onChange={e => setUploadCategoryId(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 min-w-[150px]"
                    >
                        <option value="">选择分类 (可选)</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleUpload} 
                        className="hidden" 
                        accept=".pdf,.ppt,.pptx"
                    />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center gap-2 disabled:bg-blue-300 transition-colors w-full sm:w-auto justify-center"
                    >
                        {isUploading ? <Spinner /> : <PlusIcon className="w-4 h-4" />}
                        上传文档 (PDF/PPT)
                    </button>
                </div>
                <button onClick={fetchTasks} className="p-2.5 bg-white border rounded-lg hover:bg-gray-100 text-gray-600" title="刷新列表">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm">{error}</div>}

            {/* Task List */}
            <div className="flex-1 bg-white rounded-lg border shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3">文件名称</th>
                                <th className="px-6 py-3">类型</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">进度</th>
                                <th className="px-6 py-3">上传时间</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {!isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={6} className="text-center py-10 text-gray-400">暂无任务</td></tr>
                            ) : (
                                tasks.map(task => (
                                    <tr key={task.id} className="bg-white border-b hover:bg-gray-50 cursor-pointer" onClick={() => handleTaskClick(task.id)}>
                                        <td className="px-6 py-4 font-medium text-gray-900 flex items-center gap-2">
                                            <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                                            {task.file_name}
                                        </td>
                                        <td className="px-6 py-4 uppercase">{task.file_type}</td>
                                        <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                                        <td className="px-6 py-4">
                                            {task.total_pages > 0 
                                                ? `${task.processed_pages} / ${task.total_pages} (${Math.round(task.processed_pages/task.total_pages*100)}%)`
                                                : '-'
                                            }
                                        </td>
                                        <td className="px-6 py-4">{new Date(task.created_at).toLocaleString('zh-CN')}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); handleTaskClick(task.id); }}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                查看详情
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
