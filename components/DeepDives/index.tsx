
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

// --- Component: Professional List Row ---
const InsightRow: React.FC<{ 
    task: DeepInsightTask; 
    categoryName: string;
    onClick: () => void; 
}> = ({ task, categoryName, onClick }) => {
    const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [isHovered, setIsHovered] = useState(false);

    // 模拟 AI 生成过程
    const handleGenerateSummary = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAiStatus('loading');
        setTimeout(() => {
            setAiStatus('done');
        }, 1500);
    };

    const dateStr = new Date(task.created_at).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const isCompleted = task.status === 'completed';

    // 状态渲染逻辑
    const renderAiStatus = () => {
        if (aiStatus === 'loading') {
            return (
                <div className="flex items-center gap-2 text-indigo-600 animate-pulse">
                    <RefreshIcon className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-medium">分析中...</span>
                </div>
            );
        }
        if (aiStatus === 'done') {
            return (
                <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-xs font-bold">摘要已就绪</span>
                </div>
            );
        }
        // Idle state: Default (Not generated yet)
        return (
            <button 
                onClick={handleGenerateSummary}
                className={`
                    flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 group/btn
                    ${isHovered 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'}
                `}
            >
                <SparklesIcon className={`w-3.5 h-3.5 ${isHovered ? 'text-white' : 'text-indigo-500'}`} />
                <span className="text-xs font-bold">AI 深度分析</span>
            </button>
        );
    };

    return (
        <div 
            onClick={isCompleted ? onClick : undefined}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={`
                relative flex items-center gap-4 p-4 border-b border-slate-100 bg-white transition-all duration-200
                ${isCompleted ? 'cursor-pointer hover:bg-slate-50' : 'opacity-60 cursor-not-allowed'}
            `}
        >
            {/* 1. Icon & Type */}
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                {task.file_type === 'PDF' ? (
                    <DocumentTextIcon className={`w-6 h-6 ${isHovered ? 'text-red-500' : ''} transition-colors`} />
                ) : (
                    <DocumentTextIcon className={`w-6 h-6 ${isHovered ? 'text-orange-500' : ''} transition-colors`} />
                )}
            </div>

            {/* 2. Main Info */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold truncate transition-colors ${isHovered ? 'text-indigo-700' : 'text-slate-800'}`} title={task.file_name}>
                        {task.file_name.replace(/\.(pdf|ppt|pptx|doc|docx)$/i, '')}
                    </h3>
                    {!isCompleted && (
                        <span className="text-[10px] bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded">处理中</span>
                    )}
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">{categoryName}</span>
                    <span className="w-px h-3 bg-slate-300"></span>
                    <span className="font-mono">{formatFileSize(task.file_size)}</span>
                </div>
            </div>

            {/* 3. AI Action Area (The "Control" part) */}
            <div className="w-40 flex justify-end">
                {renderAiStatus()}
            </div>

            {/* 4. Meta & Actions */}
            <div className="w-48 flex items-center justify-end gap-6 text-right">
                <div className="flex flex-col items-end text-xs text-slate-400 font-mono">
                    <span>{dateStr}</span>
                    <span>{task.total_pages > 0 ? `${task.total_pages} 页` : '-'}</span>
                </div>
                
                <div className={`flex items-center gap-1 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="下载">
                        <DownloadIcon className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="阅读">
                        <ChevronRightIcon className="w-4 h-4" />
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
                    
                    {/* Table Header */}
                    <div className="flex items-center gap-4 px-6 py-3 bg-slate-50/50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <div className="w-12 text-center">FMT</div>
                        <div className="flex-1">文档名称 (DOCUMENT)</div>
                        <div className="w-40 text-left pl-3">AI 状态 (INSIGHT)</div>
                        <div className="w-48 text-right pr-12">信息 (META)</div>
                    </div>

                    {/* Rows */}
                    <div className="flex-1">
                        {isLoading ? (
                            <div className="p-12 space-y-6">
                                {[1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="flex gap-4 animate-pulse">
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl"></div>
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
                    <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 flex justify-between items-center">
                        <span>共展示 {tasks.length} 份文档</span>
                        <div className="flex gap-1">
                            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                            <span>AI Ready</span>
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
