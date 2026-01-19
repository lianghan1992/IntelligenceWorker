
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../../types';
import { 
    getDeepInsightTasks, 
    uploadDeepInsightTask, 
    getDeepInsightCategoriesWithStats,
    deleteDeepInsightTask,
    fetchDeepInsightCover,
    regenerateDeepInsightSummary,
    regenerateDeepInsightCover
} from '../../../api';
import { PlusIcon, RefreshIcon, DocumentTextIcon, TrashIcon, SparklesIcon, PhotoIcon, ViewGridIcon, CloudIcon, ChartIcon, GearIcon } from '../../icons';
import { TaskDetail } from './TaskDetail';
import { ConfirmationModal } from '../ConfirmationModal';
import { CategoryManagerModal } from './CategoryManager';

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

const formatBytes = (bytes?: number, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

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
    const [categories, setCategories] = useState<(DeepInsightCategory & { count: number })[]>([]);
    const [totalDocs, setTotalDocs] = useState(0);
    
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState('');
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    const [uploadCategoryId, setUploadCategoryId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Batch Actions State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

    // Modal State
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const fetchDashboardStats = useCallback(async () => {
        try {
            const cats = await getDeepInsightCategoriesWithStats();
            setCategories(cats || []);
        } catch (e) {
            console.error("Failed to fetch stats", e);
        }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const response = await getDeepInsightTasks({ page: 1, limit: 50 });
            if (response && Array.isArray(response.items)) {
                setTasks(response.items);
                setTotalDocs(response.total);
            } else {
                setTasks([]);
            }
            setSelectedIds(new Set());
            fetchDashboardStats();
        } catch (err: any) {
            setError(err.message || '获取任务列表失败');
        } finally {
            setIsLoading(false);
        }
    }, [fetchDashboardStats]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            await uploadDeepInsightTask(file, uploadCategoryId || undefined);
            fetchTasks(); 
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

    const executeBatchDelete = async () => {
        setIsBatchProcessing(true);
        try {
            const ids = Array.from(selectedIds);
            await Promise.all(ids.map(id => deleteDeepInsightTask(id)));
            setConfirmBatchDelete(false);
            fetchTasks(); 
        } catch (e: any) {
            alert(`批量删除部分失败: ${e.message}`);
        } finally {
            setIsBatchProcessing(false);
        }
    };

    if (viewState === 'detail' && selectedTaskId) {
        return <TaskDetail taskId={selectedTaskId} onBack={() => { setViewState('list'); setSelectedTaskId(null); fetchTasks(); }} />;
    }

    const topCategories = [...categories].sort((a, b) => b.count - a.count).slice(0, 4);

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Stats Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-indigo-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                        <DocumentTextIcon className="w-20 h-20 text-white" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-wider opacity-80 mb-2">文档库总数</div>
                        <div className="text-5xl font-black">{totalDocs}</div>
                        <div className="mt-4 text-[10px] bg-white/20 inline-block px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                            Real-time Sync
                        </div>
                    </div>
                </div>

                <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-4 px-1">
                        <h4 className="font-bold text-slate-700 flex items-center gap-2">
                            <ChartIcon className="w-5 h-5 text-indigo-500" /> 分类文档统计
                        </h4>
                        <button 
                            onClick={() => setIsCategoryModalOpen(true)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
                        >
                            <GearIcon className="w-3.5 h-3.5" /> 管理分类
                        </button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar pb-1">
                        {topCategories.length === 0 ? (
                             <div className="text-sm text-slate-400 italic px-1">暂无分类数据</div>
                        ) : (
                            topCategories.map(cat => (
                                <div key={cat.id} className="flex-1 min-w-[150px] bg-slate-50 border border-slate-100 rounded-xl p-3 flex items-center justify-between group hover:border-indigo-200 transition-all shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-bold truncate max-w-[110px]" title={cat.name}>{cat.name}</span>
                                        <span className="text-2xl font-black text-slate-800">{cat.count}</span>
                                    </div>
                                    <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-slate-300 group-hover:text-indigo-500 transition-colors shadow-inner">
                                        <ViewGridIcon className="w-4 h-4" />
                                    </div>
                                </div>
                            ))
                        )}
                        {categories.length > 4 && (
                            <div className="flex items-center justify-center px-4 text-[10px] text-slate-400 font-bold uppercase tracking-widest bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                +{categories.length - 4} More
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {selectedIds.size > 0 ? (
                        <div className="flex items-center gap-3 animate-in fade-in slide-in-from-left-2">
                             <div className="px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-black border border-indigo-100">
                                已选 {selectedIds.size} 项
                             </div>
                             <button 
                                onClick={() => setConfirmBatchDelete(true)}
                                disabled={isBatchProcessing}
                                className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-200"
                            >
                                <TrashIcon className="w-4 h-4" /> 批量删除
                             </button>
                        </div>
                    ) : (
                        <>
                            <select 
                                value={uploadCategoryId} 
                                onChange={e => setUploadCategoryId(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg p-2.5 min-w-[160px] focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">选择分类 (可选)</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".pdf,.ppt,.pptx" />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={isUploading}
                                className="text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-sm px-6 py-2.5 flex items-center gap-2 disabled:bg-indigo-300 transition-all shadow-md shadow-indigo-100 active:scale-95"
                            >
                                {isUploading ? <WhiteSpinner /> : <CloudIcon className="w-4 h-4" />}
                                上传文档 (PDF/PPT)
                            </button>
                        </>
                    )}
                </div>
                <button onClick={fetchTasks} className="p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors shadow-sm" title="刷新列表">
                    <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-[10px] text-slate-400 uppercase font-black tracking-widest bg-slate-50 sticky top-0 border-b z-10">
                            <tr>
                                <th className="px-4 py-4 w-10 text-center">
                                    <input 
                                        type="checkbox" 
                                        className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                        checked={tasks.length > 0 && selectedIds.size === tasks.length}
                                        onChange={toggleSelectAll}
                                    />
                                </th>
                                <th className="px-6 py-4 w-16">封面</th>
                                <th className="px-6 py-4">文件名称</th>
                                <th className="px-6 py-4 w-32">大小/类型</th>
                                <th className="px-6 py-4 w-32">分类</th>
                                <th className="px-6 py-4 w-32">状态</th>
                                <th className="px-6 py-4 w-24">进度</th>
                                <th className="px-6 py-4 w-40 text-right">上传时间</th>
                                <th className="px-6 py-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {!isLoading && tasks.length === 0 ? (
                                <tr><td colSpan={10} className="text-center py-24 text-slate-400">暂无任务记录</td></tr>
                            ) : (
                                tasks.map(task => (
                                    <tr 
                                        key={task.id} 
                                        className={`hover:bg-slate-50 cursor-pointer transition-colors group ${selectedIds.has(task.id) ? 'bg-indigo-50/40' : ''}`}
                                        onClick={() => { setSelectedTaskId(task.id); setViewState('detail'); }}
                                    >
                                        <td className="px-4 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                            <input 
                                                type="checkbox" 
                                                className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                checked={selectedIds.has(task.id)}
                                                onChange={() => toggleSelect(task.id)}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <TaskThumbnail taskId={task.id} />
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700 truncate max-w-xs">{task.file_name}</td>
                                        <td className="px-6 py-4 text-[10px] font-mono text-slate-400">
                                            <div className="font-bold text-slate-500">{task.file_type}</div>
                                            <div>{formatBytes(task.file_size)}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 border border-slate-200">
                                                {task.category_name || '未分类'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4"><StatusBadge status={task.status} /></td>
                                        <td className="px-6 py-4 text-xs font-mono font-bold text-slate-600">
                                            {task.total_pages > 0 ? `${task.processed_pages}/${task.total_pages}P` : '-'}
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-400 font-mono text-right">{new Date(task.created_at).toLocaleString('zh-CN', {month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit'})}</td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="删除">
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

            {/* Removed non-existent isOpen prop and used conditional rendering */}
            {deleteId && (
                <ConfirmationModal
                    title="删除任务"
                    message="确定要删除此任务及其所有关联数据吗？"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                    variant="destructive"
                />
            )}
            
            {confirmBatchDelete && (
                <ConfirmationModal
                    title="批量删除"
                    message={`确定要删除选中的 ${selectedIds.size} 个任务吗？所有解析数据将丢失。`}
                    onConfirm={executeBatchDelete}
                    onCancel={() => setConfirmBatchDelete(false)}
                    variant="destructive"
                    isLoading={isBatchProcessing}
                />
            )}

            <CategoryManagerModal 
                isOpen={isCategoryModalOpen}
                onClose={() => setIsCategoryModalOpen(false)}
                onUpdate={fetchDashboardStats}
            />
        </div>
    );
};
