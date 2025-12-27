
import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { 
    getDeepInsightTasks, 
    getDeepInsightCategories
} from '../../api';
import { 
    SearchIcon, DocumentTextIcon, CalendarIcon, 
    SparklesIcon, ChevronRightIcon, DownloadIcon,
    CloudIcon, ClockIcon, EyeIcon, RefreshIcon, 
    PlayIcon, CheckCircleIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// --- Component: Efficient List Item ---
const InsightListItem: React.FC<{ 
    task: DeepInsightTask; 
    categoryName: string;
    onClick: () => void; 
}> = ({ task, categoryName, onClick }) => {
    const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    // 如果任务本身已经是 completed，我们认为 AI 已经就绪，可以直接查看
    // 这里的 aiStatus 仅用于前端模拟点击“生成”后的加载效果
    
    // 实际状态判断
    const isReady = task.status === 'completed' || aiStatus === 'done';
    const isProcessing = task.status === 'processing' || aiStatus === 'loading';
    const isFailed = task.status === 'failed';

    const handleGenerate = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAiStatus('loading');
        // 模拟请求
        setTimeout(() => {
            setAiStatus('done');
        }, 1500);
    };

    const dateStr = new Date(task.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });

    return (
        <div 
            onClick={isReady ? onClick : undefined}
            className={`
                group flex items-center gap-4 p-4 bg-white border-b border-slate-100 transition-all duration-200
                ${isReady ? 'cursor-pointer hover:bg-slate-50' : 'hover:bg-slate-50/50'}
            `}
        >
            {/* 1. Left: File Icon */}
            <div className="flex-shrink-0">
                <div className={`
                    w-10 h-10 rounded-lg flex items-center justify-center border shadow-sm text-[10px] font-black uppercase
                    ${task.file_type === 'PDF' 
                        ? 'bg-red-50 border-red-100 text-red-600' 
                        : 'bg-orange-50 border-orange-100 text-orange-600'}
                `}>
                    {task.file_type}
                </div>
            </div>

            {/* 2. Middle: Main Info (High Density) */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
                <h3 className={`text-sm font-bold truncate pr-4 ${isReady ? 'text-slate-800 group-hover:text-indigo-600 transition-colors' : 'text-slate-600'}`} title={task.file_name}>
                    {task.file_name.replace(/\.(pdf|ppt|pptx|doc|docx)$/i, '')}
                </h3>
                
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px] font-medium border border-slate-200">
                        {categoryName}
                    </span>
                    <span className="w-px h-2 bg-slate-300"></span>
                    <span>{formatFileSize(task.file_size)}</span>
                    <span className="w-px h-2 bg-slate-300"></span>
                    <span>{task.total_pages > 0 ? `${task.total_pages} P` : '-'}</span>
                    <span className="w-px h-2 bg-slate-300"></span>
                    <span>{dateStr}</span>
                </div>
            </div>

            {/* 3. Right: AI Action & Tools */}
            <div className="flex items-center gap-4">
                
                {/* AI Status / Button */}
                <div className="w-32 flex justify-end">
                    {isReady ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onClick(); }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-all border border-indigo-100 group/btn"
                        >
                            <SparklesIcon className="w-3.5 h-3.5" />
                            <span>AI 导读</span>
                        </button>
                    ) : isProcessing ? (
                        <div className="flex items-center gap-1.5 text-xs text-blue-500 font-medium px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-100">
                            <RefreshIcon className="w-3.5 h-3.5 animate-spin" />
                            <span>分析中...</span>
                        </div>
                    ) : isFailed ? (
                        <span className="text-xs text-red-500 font-medium px-3 py-1.5 bg-red-50 rounded-lg border border-red-100">
                            处理失败
                        </span>
                    ) : (
                        <button 
                            onClick={handleGenerate}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-500 rounded-lg text-xs font-bold border border-slate-200 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <PlayIcon className="w-3.5 h-3.5" />
                            <span>立即分析</span>
                        </button>
                    )}
                </div>

                {/* Secondary Actions (Visible on Hover) */}
                <div className="flex items-center gap-1 w-16 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors" title="下载">
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---

export const DeepDives: React.FC = () => {
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [readerTask, setReaderTask] = useState<DeepInsightTask | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cats, tasksRes] = await Promise.all([
                getDeepInsightCategories().catch(() => []),
                getDeepInsightTasks({ 
                    limit: 100, 
                    page: 1, 
                    category_id: selectedCategoryId, 
                    search: searchQuery 
                }).catch(() => ({ items: [], total: 0 }))
            ]);
            setCategories(cats);
            const items = Array.isArray(tasksRes) ? tasksRes : (tasksRes.items || []);
            // 过滤掉失败的，或者你可以选择保留并显示错误状态
            const validItems = items; 
            setTasks(validItems);
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedCategoryId, searchQuery]);

    useEffect(() => {
        const timer = setTimeout(() => {
            loadData();
        }, 300);
        return () => clearTimeout(timer);
    }, [loadData]);

    return (
        <div className="relative min-h-full bg-[#f8fafc] font-sans text-slate-900 pb-20 flex flex-col">
            
            {/* Header / Toolbar */}
            <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 md:px-8 py-4 shadow-sm">
                <div className="max-w-7xl mx-auto w-full">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        
                        {/* Title */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg text-white shadow-md shadow-indigo-200">
                                <DocumentTextIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">深度洞察索引</h1>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Intelligence Library</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${selectedCategoryId === null ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    全部
                                </button>
                                {categories.slice(0, 5).map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${selectedCategoryId === cat.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            <div className="relative w-full md:w-64 group">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                <input 
                                    className="w-full bg-white border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 rounded-xl pl-9 pr-4 py-2 text-sm transition-all shadow-sm outline-none" 
                                    placeholder="搜索报告标题..." 
                                    type="text"
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[600px]">
                    
                    {/* Header Row */}
                    <div className="flex items-center gap-4 px-6 py-3 bg-slate-50/80 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="w-10 text-center">FMT</div>
                        <div className="flex-1">文档信息 (DOCUMENT INFO)</div>
                        <div className="w-32 text-right pr-6">AI 状态</div>
                        <div className="w-16 text-center">操作</div>
                    </div>

                    {/* Rows */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="p-8 space-y-4">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-4 animate-pulse px-4 py-2 border-b border-slate-50">
                                        <div className="w-10 h-10 bg-slate-100 rounded-lg"></div>
                                        <div className="flex-1 space-y-2 py-1">
                                            <div className="w-1/3 h-3 bg-slate-100 rounded"></div>
                                            <div className="w-1/4 h-2 bg-slate-50 rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center">
                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                    <CloudIcon className="w-8 h-8 text-slate-300" />
                                </div>
                                <h3 className="text-slate-600 font-bold mb-1">暂无文档数据</h3>
                                <p className="text-slate-400 text-sm max-w-xs">请在后台上传或等待爬虫任务完成</p>
                            </div>
                        ) : (
                            <div>
                                {tasks.map((task) => {
                                    const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                                    return (
                                        <InsightListItem
                                            key={task.id}
                                            task={task}
                                            categoryName={categoryName}
                                            onClick={() => setReaderTask(task)}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between items-center">
                        <span>共展示 {tasks.length} 份文档</span>
                        <div className="flex gap-2">
                             <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> 已就绪</span>
                             <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> 待分析</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reader Modal */}
            {readerTask && (
                <DeepDiveReader 
                    task={readerTask} 
                    onClose={() => setReaderTask(null)} 
                />
            )}
        </div>
    );
};
