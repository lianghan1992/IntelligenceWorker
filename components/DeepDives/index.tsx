
import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { 
    getDeepInsightTasks, 
    getDeepInsightCategories
} from '../../api';
import { 
    SearchIcon, DocumentTextIcon, CalendarIcon, 
    SparklesIcon, ChevronRightIcon, DownloadIcon,
    ViewGridIcon, ViewListIcon, CloudIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// --- Component: Insight List Row (High Density) ---
const InsightRow: React.FC<{ 
    task: DeepInsightTask; 
    categoryName: string;
    onClick: () => void; 
}> = ({ task, categoryName, onClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done'>('idle');

    // 模拟 AI 生成过程 (前端交互演示)
    const handleGenerateSummary = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAiStatus('loading');
        setTimeout(() => {
            setAiStatus('done');
        }, 1500);
    };

    const dateStr = new Date(task.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const isCompleted = task.status === 'completed';

    // 只有 completed 的任务才允许点击进入阅读
    const handleClick = () => {
        if (isCompleted) onClick();
    };

    return (
        <div 
            onClick={handleClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                group relative flex items-start gap-4 p-4 border-b border-slate-100 bg-white transition-all duration-200
                ${isCompleted ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed'}
            `}
        >
            {/* 1. Left: Visual Anchor (File Type Icon) */}
            <div className="flex-shrink-0 pt-1">
                <div className={`
                    w-12 h-14 rounded-lg flex items-center justify-center border shadow-sm transition-all
                    ${isHovered && isCompleted ? 'bg-white border-indigo-200 shadow-indigo-100 scale-105' : 'bg-slate-50 border-slate-200'}
                `}>
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        {task.file_type || 'PDF'}
                    </span>
                </div>
            </div>

            {/* 2. Middle: Content & AI Action */}
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1.5">
                    <h3 className={`text-base font-bold truncate transition-colors ${isHovered && isCompleted ? 'text-indigo-700' : 'text-slate-800'}`} title={task.file_name}>
                        {task.file_name.replace(/\.(pdf|ppt|pptx|doc|docx)$/i, '')}
                    </h3>
                    <span className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                        {categoryName}
                    </span>
                </div>

                {/* AI Insight Area */}
                <div className="min-h-[24px] flex items-center">
                    {aiStatus === 'idle' ? (
                        <button 
                            onClick={handleGenerateSummary}
                            className={`
                                group/btn flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-all
                                ${isCompleted 
                                    ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:shadow-sm' 
                                    : 'text-slate-400 cursor-not-allowed hidden'} 
                            `}
                        >
                            <SparklesIcon className="w-3.5 h-3.5" />
                            <span className="relative">
                                生成 AI 导读
                                <span className="absolute bottom-0 left-0 w-full h-px bg-indigo-600/30"></span>
                            </span>
                        </button>
                    ) : aiStatus === 'loading' ? (
                        <div className="flex items-center gap-2 text-xs text-indigo-500">
                            <SparklesIcon className="w-3.5 h-3.5 animate-spin" />
                            <span className="animate-pulse">AI 正在阅读并提炼核心观点...</span>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-600 leading-relaxed animate-in fade-in slide-in-from-left-2">
                            <span className="font-bold text-indigo-600 mr-1">AI 洞察:</span>
                            该文档详细分析了 {task.file_name.substring(0, 5)}... 领域的关键技术趋势，指出了供应链降本的三个核心路径。（模拟摘要）
                        </div>
                    )}
                </div>
            </div>

            {/* 3. Right: Metadata & Actions */}
            <div className="flex-shrink-0 flex flex-col items-end gap-3 text-right min-w-[120px]">
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                    <span>{dateStr}</span>
                    <span className="w-px h-3 bg-slate-200"></span>
                    <span>{task.total_pages > 0 ? `${task.total_pages} P` : '-'}</span>
                    <span className="w-px h-3 bg-slate-200"></span>
                    <span>{formatFileSize(task.file_size)}</span>
                </div>

                <div className={`flex items-center gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="下载原始文件">
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={onClick}
                        className="flex items-center gap-1 pl-3 pr-2 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-full shadow-md hover:bg-indigo-600 hover:shadow-indigo-200 transition-all active:scale-95"
                    >
                        阅读
                        <ChevronRightIcon className="w-3.5 h-3.5" />
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
                    limit: 100, // List view can handle more items
                    page: 1, 
                    category_id: selectedCategoryId, 
                    search: searchQuery 
                }).catch(() => ({ items: [], total: 0 }))
            ]);
            setCategories(cats);
            const items = Array.isArray(tasksRes) ? tasksRes : (tasksRes.items || []);
            // Filter out failed tasks for cleaner view
            const validItems = items.filter(t => t.status !== 'failed');
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
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200 px-4 md:px-8 py-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                <div className="max-w-6xl mx-auto w-full">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        
                        {/* Title Area */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-lg shadow-indigo-200">
                                <DocumentTextIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-lg font-extrabold text-slate-800 tracking-tight">深度洞察索引</h1>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Intelligence Index</p>
                            </div>
                        </div>

                        {/* Filter & Search Area */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            {/* Categories */}
                            <div className="hidden md:flex items-center bg-slate-100 p-1 rounded-lg">
                                <button 
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedCategoryId === null ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    全部
                                </button>
                                {categories.slice(0, 4).map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedCategoryId === cat.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {cat.name}
                                    </button>
                                ))}
                            </div>

                            {/* Search */}
                            <div className="relative flex-1 md:w-64 group">
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
            <div className="flex-1 w-full max-w-6xl mx-auto px-4 md:px-8 py-6">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] flex flex-col">
                    
                    {/* List Header */}
                    <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="w-12 text-center">FMT</div>
                        <div className="flex-1 px-4">Document / Insight</div>
                        <div className="min-w-[120px] text-right">Meta</div>
                    </div>

                    {/* Rows */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="p-12 space-y-6">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-4 animate-pulse">
                                        <div className="w-12 h-14 bg-slate-100 rounded-lg"></div>
                                        <div className="flex-1 space-y-2 py-2">
                                            <div className="w-1/3 h-4 bg-slate-100 rounded"></div>
                                            <div className="w-1/4 h-3 bg-slate-50 rounded"></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[400px] text-center">
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-slate-100">
                                    <CloudIcon className="w-10 h-10 text-slate-300" />
                                </div>
                                <h3 className="text-slate-600 font-bold mb-1">暂无文档数据</h3>
                                <p className="text-slate-400 text-sm max-w-xs">请在后台上传或等待爬虫任务完成</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {tasks.map((task) => {
                                    const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                                    return (
                                        <InsightRow
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
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between">
                        <span>Showing {tasks.length} documents</span>
                        {/* Pagination placeholder if needed */}
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
