import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../../types';
import { 
    getDeepInsightTasks, 
    uploadDeepInsightTask, 
    getDeepInsightCategoriesWithStats,
    deleteDeepInsightTask,
    fetchDeepInsightCover
} from '../../../api';
import { PlusIcon, RefreshIcon, DocumentTextIcon, TrashIcon, ViewGridIcon, CloudIcon, ChartIcon, GearIcon } from '../../icons';
import { TaskDetail } from './TaskDetail';
import { ConfirmationModal } from '../ConfirmationModal';
import { CategoryManagerModal } from './CategoryManager';

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
        pending: '等待',
        processing: '处理中',
        completed: '完成',
        failed: '失败'
    };
    return <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${styles[status] || 'bg-gray-100 text-gray-600'}`}>{labels[status] || status}</span>;
};

const TaskThumbnail: React.FC<{ taskId: string; index: number }> = ({ taskId, index }) => {
    const [url, setUrl] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(false);

    // 实现顺序/延迟加载效果
    useEffect(() => {
        const timer = setTimeout(() => {
            setShouldLoad(true);
        }, index * 100); // 每个任务延迟 100ms 加载
        return () => clearTimeout(timer);
    }, [index]);

    useEffect(() => {
        if (!shouldLoad) return;
        let active = true;
        fetchDeepInsightCover(taskId).then(u => { 
            if(active && u) {
                setUrl(u);
                setIsLoaded(true);
            }
        });
        return () => { active = false; if(url) URL.revokeObjectURL(url); }
    }, [taskId, shouldLoad]);

    return (
        <div className="w-24 aspect-video bg-slate-100 rounded border overflow-hidden flex items-center justify-center shadow-sm relative group">
            {url ? (
                <img 
                    src={url} 
                    alt="Cover" 
                    className={`w-full h-full object-cover transition-all duration-700 ${isLoaded ? 'opacity-100 scale-100 blur-0' : 'opacity-0 scale-105 blur-sm'}`} 
                />
            ) : (
                <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                    <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                    <span className="text-[8px] font-bold">PDF</span>
                </div>
            )}
            {/* 扫描线动画 */}
            {shouldLoad && !isLoaded && (
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent h-1/2 w-full animate-scan pointer-events-none"></div>
            )}
        </div>
    );
}

export const TaskManager: React.FC = () => {
    const [viewState, setViewState] = useState<'list' | 'detail'>('list');
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<(DeepInsightCategory & { count: number })[]>([]);
    const [totalDocs, setTotalDocs] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [uploadCategoryId, setUploadCategoryId] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

    const fetchDashboardStats = useCallback(async () => {
        try {
            const cats = await getDeepInsightCategoriesWithStats();
            setCategories(cats || []);
        } catch (e) { console.error(e); }
    }, []);

    const fetchTasks = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await getDeepInsightTasks({ page: 1, limit: 50 });
            if (response && Array.isArray(response.items)) {
                setTasks(response.items);
                setTotalDocs(response.total);
            }
            setSelectedIds(new Set());
            fetchDashboardStats();
        } catch (err: any) { console.error(err); } finally { setIsLoading(false); }
    }, [fetchDashboardStats]);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            await uploadDeepInsightTask(file, uploadCategoryId || undefined);
            fetchTasks(); 
        } catch (err: any) { alert(err.message || '上传失败'); } finally {
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
        } catch (err: any) { alert('删除失败'); }
    };

    if (viewState === 'detail' && selectedTaskId) {
        return <TaskDetail taskId={selectedTaskId} onBack={() => { setViewState('list'); setSelectedTaskId(null); fetchTasks(); }} />;
    }

    return (
        <div className="h-full flex flex-col space-y-4">
            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(200%); }
                }
                .animate-scan { animation: scan 2s linear infinite; }
            `}</style>

            {/* Compact Stats Row */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="bg-indigo-600 rounded-xl px-4 py-2 text-white shadow-sm flex items-center gap-3">
                    <DocumentTextIcon className="w-5 h-5 opacity-70" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold uppercase opacity-60 leading-none mb-1">总计文档</span>
                        <span className="text-xl font-black leading-none">{totalDocs}</span>
                    </div>
                </div>

                <div className="flex-1 flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {categories.sort((a,b) => (b.count||0) - (a.count||0)).slice(0, 6).map(cat => (
                        <div key={cat.id} className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0 shadow-sm">
                            <span className="text-xs font-bold text-slate-700 truncate max-w-[100px]">{cat.name}</span>
                            <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-1.5 rounded">{cat.count}</span>
                        </div>
                    ))}
                    <button 
                        onClick={() => setIsCategoryModalOpen(true)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl px-3 py-1.5 flex items-center gap-2 shrink-0 transition-colors"
                    >
                        <GearIcon className="w-3.5 h-3.5" />
                        <span className="text-xs font-bold">分类管理</span>
                    </button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select 
                        value={uploadCategoryId} 
                        onChange={e => setUploadCategoryId(e.target.value)}
                        className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                    >
                        <option value="">选择分类 (可选)</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".pdf,.ppt,.pptx" />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="text-white bg-indigo-600 hover:bg-indigo-700 font-bold rounded-lg text-sm px-5 py-2 flex items-center gap-2 disabled:bg-indigo-300 transition-all active:scale-95"
                    >
                        {isUploading ? <WhiteSpinner /> : <CloudIcon className="w-4 h-4" />}
                        上传文档
                    </button>
                </div>
                <button onClick={fetchTasks} className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 transition-colors shadow-sm">
                    <RefreshIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* List */}
            <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-0">
                <div className="overflow-y-auto flex-1 custom-scrollbar">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-[10px] text-slate-400 uppercase font-black tracking-widest bg-slate-50 sticky top-0 border-b z-10">
                            <tr>
                                <th className="px-6 py-3 w-32">封面 (16:9)</th>
                                <th className="px-6 py-3">文件名称</th>
                                <th className="px-6 py-3 w-28">大小</th>
                                <th className="px-6 py-3 w-32">分类</th>
                                <th className="px-6 py-3 w-24">状态</th>
                                <th className="px-6 py-3 w-24">进度</th>
                                <th className="px-6 py-3 w-32 text-right">时间</th>
                                <th className="px-6 py-3 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.length === 0 && !isLoading ? (
                                <tr><td colSpan={8} className="text-center py-20 text-slate-300 italic">暂无记录</td></tr>
                            ) : (
                                tasks.map((task, index) => (
                                    <tr 
                                        key={task.id} 
                                        className="hover:bg-slate-50 cursor-pointer transition-colors group"
                                        onClick={() => { setSelectedTaskId(task.id); setViewState('detail'); }}
                                    >
                                        <td className="px-6 py-3"><TaskThumbnail taskId={task.id} index={index} /></td>
                                        <td className="px-6 py-3 font-bold text-slate-700 truncate max-w-xs">{task.file_name}</td>
                                        <td className="px-6 py-3 text-[10px] font-mono font-bold text-slate-500">
                                            {formatBytes(task.file_size)}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] font-bold text-slate-500 border border-slate-200">
                                                {task.category_name || '未分类'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3"><StatusBadge status={task.status} /></td>
                                        <td className="px-6 py-3 text-[10px] font-mono font-bold text-slate-400">
                                            {task.total_pages > 0 ? `${task.processed_pages}/${task.total_pages}P` : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-[10px] text-slate-400 font-mono text-right">{new Date(task.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-3 text-center">
                                            <button onClick={(e) => { e.stopPropagation(); setDeleteId(task.id); }} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100">
                                                <TrashIcon className="w-4 h-4" />
                                            </button>
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
                    message="确定要删除此任务及其所有关联数据吗？"
                    onConfirm={handleDelete}
                    onCancel={() => setDeleteId(null)}
                    variant="destructive"
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