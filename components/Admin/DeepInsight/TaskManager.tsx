
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../../types';
import { 
    getDeepInsightTasks, 
    uploadDeepInsightTask, 
    getDeepInsightCategories,
    getDeepInsightTasksStats,
    deleteDeepInsightTask,
    fetchDeepInsightCover,
    regenerateDeepInsightSummary,
    regenerateDeepInsightCover
} from '../../../api';
import { PlusIcon, RefreshIcon, DocumentTextIcon, TrashIcon, SparklesIcon, PhotoIcon, CheckCircleIcon } from '../../icons';
import { TaskDetail } from './TaskDetail';
import { ConfirmationModal } from '../ConfirmationModal';

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const WhiteSpinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

// Tiny component for list thumbnail
const TaskThumbnail: React.FC<{ taskId: string }> = ({ taskId }) => {
    const [url, setUrl] = useState<string | null>(null);
    
    useEffect(() => {
        let active = true;
        fetchDeepInsightCover(taskId).then(u => {
            if(active && u) setUrl(u);
        });
        return () => { active = false; if(url) URL.revokeObjectURL(url); }
    }, [taskId]);

    if (!url) return <div className="w-8 h-10 bg-gray-100 rounded border flex items-center justify-center"><DocumentTextIcon className="w-4 h-4 text-gray-300" /></div>;
    return <img src={url} alt="Cover" className="w-8 h-10 object-cover rounded border shadow-sm" />;
}

export const TaskManager: React.FC = () => {
    const [viewState, setViewState] = useState<'list' | 'detail'>('list');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [stats, setStats] = useState<{ total: number; completed: number; failed: number; processing: number; pending: number } | null>(null);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    const [uploadCategoryId, setUploadCategoryId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Multi-select & Batch Actions State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchActionType, setBatchActionType] = useState<'delete' | 'summary' | 'cover' | null>(null);
    const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

    const fetchStats = useCallback(async () => {
        try {
            const data = await getDeepInsightTasksStats();
            setStats(data);
        } catch (e) { console.error("Failed to fetch stats", e); }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            fetchStats();
            const response = await getDeepInsightTasks({ page: 1, limit: 50 });
            if (Array.isArray(response)) {
                setTasks(response);
            } else if (response && Array.isArray(response.items)) {
                setTasks(response.items);
            } else {
                setTasks([]);
            }
            setSelectedIds(new Set()); // Reset selection on fetch
        } catch (err: any) {
            console.warn("Fetch tasks warning:", err);
            setError(err.message || '获取任务列表失败');
        } finally {
            setIsLoading(false);
        }
    }, [fetchStats]);

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
            // The API call now handles the multi-step process (upload -> create -> start)
            await uploadDeepInsightTask(file, uploadCategoryId || undefined);
            fetchTasks(); // Refresh list
        } catch (err: any) {
            setError(err.message || '上传失败');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await deleteDeepInsightTask(deleteId);
            setDeleteId(null);
            fetchTasks();
        } catch (err: any) {
            setError(err.message || '删除失败');
        }
    };

    const handleTaskClick = (id: string) => {
        setSelectedTaskId(id);
        setViewState('detail');
    };

    // --- Multi-select Logic ---
    const toggleSelectAll = () => {
        if (selectedIds.size === tasks.length && tasks.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(tasks.map(t => t.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    // --- Batch Action Handlers ---
    const executeBatchAction = async (action: 'summary' | 'cover' | 'delete') => {
        if (selectedIds.size === 0) return;
        
        setIsBatchProcessing(true);
        setBatchActionType(action);
        const ids = Array.from(selectedIds);
        
        try {
            if (action === 'delete') {
                // Delete actions loop
                // Since API is singular, we loop. Ideally backend supports batch.
                const promises = ids.map(id => deleteDeepInsightTask(id));
                await Promise.all(promises);
                alert(`成功删除 ${ids.length} 个任务`);
                setConfirmBatchDelete(false);
            } else if (action === 'summary') {
                const promises = ids.map(id => regenerateDeepInsightSummary(id));
                await Promise.all(promises);
                alert(`已触发 ${ids.length} 个任务的摘要重新生成`);
            } else if (action === 'cover') {
                const promises = ids.map(id => regenerateDeepInsightCover(id));
                await Promise.all(promises);
                alert(`已触发 ${ids.length} 个任务的封面重新生成`);
            }
            fetchTasks(); // Refresh list
        } catch (e: any) {
            alert(`批量操作部分失败: ${e.message}`);
        } finally {
            setIsBatchProcessing(false);
            setBatchActionType(null);
        }
    };

    if (viewState === 'detail' && selectedTaskId) {
        return <TaskDetail taskId={selectedTaskId} onBack={() => { setViewState('list'); setSelectedTaskId(null); fetchTasks(); }} />;
    }

    return (
        <div className="h-full flex flex-col">
            {/* Stats Overview */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center">
                        <span className="text-2xl font-bold text-gray-800">{stats.total}</span>
                        <span className="text-xs text-gray-500 uppercase font-medium mt-1">总任务</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center">
                        <span className="text-2xl font-bold text-yellow-600">{stats.pending}</span>
                        <span className="text-xs text-gray-500 uppercase font-medium mt-1">等待中</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center">
                        <span className="text-2xl font-bold text-blue-600">{stats.processing}</span>
                        <span className="text-xs text-gray-500 uppercase font-medium mt-1">处理中</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center">
                        <span className="text-2xl font-bold text-green-600">{stats.completed}</span>
                        <span className="text-xs text-gray-500 uppercase font-medium mt-1">已完成</span>
                    </div>
                    <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-col items-center">
                        <span className="text-2xl font-bold text-red-600">{stats.failed}</span>
                        <span className="text-xs text-gray-500 uppercase font-medium mt-1">失败</span>
                    </div>
                </div>
            )}

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-lg border mb-4 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {selectedIds.size > 0 ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                             <div className="px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-100 mr-2">
                                已选 {selectedIds.size} 项
                             </div>
                             
                             <button 
                                onClick={() => executeBatchAction('summary')}
                                disabled={isBatchProcessing}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors border border-blue-200"
                             >
                                {isBatchProcessing && batchActionType === 'summary' ? <Spinner /> : <SparklesIcon className="w-3.5 h-3.5" />}
                                生成摘要
                             </button>
                             
                             <button 
                                onClick={() => executeBatchAction('cover')}
                                disabled={isBatchProcessing}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-600 rounded-lg text-xs font-bold hover:bg-purple-100 transition-colors border border-purple-200"
                             >
                                {isBatchProcessing && batchActionType === 'cover' ? <Spinner /> : <PhotoIcon className="w-3.5 h-3.5" />}
                                生成封面
                             </button>
                             
                             <button 
                                onClick={() => setConfirmBatchDelete(true)}
                                disabled={isBatchProcessing}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-200"
                             >
                                {isBatchProcessing && batchActionType === 'delete' ? <Spinner /> : <TrashIcon className="w-3.5 h-3.5" />}
                                批量删除
                             </button>
                        </div>
                    ) : (
                        <>
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
                                {isUploading ? <WhiteSpinner /> : <PlusIcon className="w-4 h-4" />}
                                上传文档 (PDF/PPT)
                            </button>
                        </>
                    )}
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
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 border-b z-10">
                            <tr>
                                <th className="px-4 py-3 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={tasks.length > 0 && selectedIds.size === tasks.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-3 w-16">封面</th>
                                <th className="px-6 py-3">文件名称</th>
                                <th className="px-6 py-3">类型</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">进度</th>
                                <th className="px-6 py-3">上传时间</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {!isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={8} className="text-center py-10 text-gray-400">暂无任务</td></tr>
                            ) : (
                                tasks.map(task => (
                                    <tr 
                                        key={task.id} 
                                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedIds.has(task.id) ? 'bg-indigo-50/40' : ''}`}
                                        onClick={() => handleTaskClick(task.id)}
                                    >
                                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedIds.has(task.id)}
                                                onChange={() => toggleSelect(task.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-3">
                                            {/* Try to show thumbnail even if not completed, might fall back to icon */}
                                            <TaskThumbnail taskId={task.id} />
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
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
                                            <div className="flex items-center justify-center gap-3">
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleTaskClick(task.id); }}
                                                    className="text-blue-600 hover:underline font-medium"
                                                >
                                                    详情
                                                </button>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }}
                                                    className="text-red-600 hover:bg-red-50 p-1.5 rounded transition-colors"
                                                    title="删除任务"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {deleteId && (
                <ConfirmationModal
                    title="删除任务"
                    message="确定要删除此任务及其所有处理数据吗？此操作不可撤销。"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                    confirmText="删除"
                    variant="destructive"
                />
            )}
            
            {confirmBatchDelete && (
                <ConfirmationModal
                    title="批量删除任务"
                    message={`确定要删除选中的 ${selectedIds.size} 个任务吗？所有相关数据将永久丢失。`}
                    onConfirm={() => executeBatchAction('delete')}
                    onCancel={() => setConfirmBatchDelete(false)}
                    confirmText={`确认删除 ${selectedIds.size} 项`}
                    variant="destructive"
                    isLoading={isBatchProcessing && batchActionType === 'delete'}
                />
            )}
        </div>
    );
};
