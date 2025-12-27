
import React, { useState, useEffect, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { 
    getDeepInsightTasks, 
    getDeepInsightCategories
} from '../../api';
import { 
    SearchIcon, DocumentTextIcon, CalendarIcon, 
    SparklesIcon, ChevronRightIcon, DownloadIcon,
    CloudIcon, ClockIcon, EyeIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

const formatFileSize = (bytes?: number) => {
    if (bytes === undefined || bytes === null || bytes === 0) return '-';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// --- Component: Insight Wide Card (Magazine Style) ---
const InsightCard: React.FC<{ 
    task: DeepInsightTask; 
    categoryName: string;
    onClick: () => void; 
}> = ({ task, categoryName, onClick }) => {
    const [aiStatus, setAiStatus] = useState<'idle' | 'loading' | 'done'>('idle');
    const [summary, setSummary] = useState<string>('');

    // 模拟 AI 生成过程
    const handleGenerateSummary = (e: React.MouseEvent) => {
        e.stopPropagation();
        setAiStatus('loading');
        setTimeout(() => {
            setAiStatus('done');
            setSummary(`这份关于《${task.file_name.split('.')[0]}》的报告深入分析了当前市场格局。核心观点指出：1. 技术迭代周期缩短至18个月；2. 供应链本土化率提升至85%；3. 消费者对智能化付费意愿显著增强。建议重点关注第三章节的竞品对比数据。`);
        }, 2000);
    };

    const dateStr = new Date(task.created_at).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const isCompleted = task.status === 'completed';

    return (
        <div 
            onClick={isCompleted ? onClick : undefined}
            className={`
                group relative flex flex-col sm:flex-row gap-6 p-5 bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-300
                ${isCompleted ? 'hover:shadow-xl hover:border-indigo-300 hover:-translate-y-1 cursor-pointer' : 'opacity-70 cursor-not-allowed'}
            `}
        >
            {/* 1. Left: Document Cover Thumbnail (Visual Anchor) */}
            <div className="flex-shrink-0 w-full sm:w-32 md:w-40 aspect-[3/4] relative">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl border border-slate-200 shadow-inner flex flex-col items-center justify-center overflow-hidden transition-transform duration-500 group-hover:scale-[1.02]">
                    {/* Decorative elements to look like a document */}
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                        <DocumentTextIcon className="w-8 h-8 text-indigo-200" />
                    </div>
                    <div className="w-20 h-2 bg-white/60 rounded-full mb-2"></div>
                    <div className="w-14 h-2 bg-white/60 rounded-full mb-2"></div>
                    <div className="w-16 h-2 bg-white/60 rounded-full"></div>
                    
                    {/* Format Badge */}
                    <div className="absolute top-0 right-0 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                        {task.file_type}
                    </div>
                </div>
                {/* Status Overlay */}
                {!isCompleted && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                        <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded shadow-sm border border-slate-100">
                            处理中...
                        </span>
                    </div>
                )}
            </div>

            {/* 2. Right: Content & Intelligence */}
            <div className="flex-1 flex flex-col min-w-0 py-1">
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold border border-indigo-100 uppercase tracking-wide">
                                {categoryName}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                <CalendarIcon className="w-3 h-3" /> {dateStr}
                            </span>
                        </div>
                        <h3 className="text-lg font-extrabold text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors line-clamp-2" title={task.file_name}>
                            {task.file_name.replace(/\.(pdf|ppt|pptx|doc|docx)$/i, '')}
                        </h3>
                    </div>
                    
                    {/* Action Buttons (Visible on Hover) */}
                    <div className="hidden sm:flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
                        <button className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors" title="下载源文件">
                            <DownloadIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* AI Intelligence Section */}
                <div className="flex-1 mt-3">
                    <div className={`
                        relative w-full h-full min-h-[100px] rounded-xl border transition-all duration-500 overflow-hidden
                        ${aiStatus === 'done' 
                            ? 'bg-gradient-to-br from-purple-50/50 to-indigo-50/50 border-indigo-100' 
                            : 'bg-slate-50 border-slate-100 dashed-border'}
                    `}>
                        {aiStatus === 'idle' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
                                <p className="text-xs text-slate-400 mb-3">尚未生成该文档的智能导读</p>
                                <button 
                                    onClick={handleGenerateSummary}
                                    className="group/btn relative inline-flex items-center gap-2 px-5 py-2 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-sm hover:border-indigo-300 hover:text-indigo-600 hover:shadow-md transition-all active:scale-95"
                                >
                                    <SparklesIcon className="w-3.5 h-3.5 text-indigo-500 group-hover/btn:animate-pulse" />
                                    <span>AI 深度解读</span>
                                </button>
                            </div>
                        ) : aiStatus === 'loading' ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <div className="w-8 h-8 relative">
                                    <div className="absolute inset-0 border-2 border-indigo-100 rounded-full"></div>
                                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-full border-t-transparent animate-spin"></div>
                                </div>
                                <span className="mt-3 text-xs font-bold text-indigo-600 animate-pulse">AI 正在阅读并提炼核心观点...</span>
                            </div>
                        ) : (
                            <div className="p-4 relative">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="p-1 bg-indigo-100 rounded text-indigo-600">
                                        <SparklesIcon className="w-3 h-3" />
                                    </div>
                                    <span className="text-xs font-bold text-indigo-900">AI 洞察摘要</span>
                                </div>
                                <p className="text-xs leading-relaxed text-slate-600 text-justify">
                                    {summary}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Meta */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-50 pt-3">
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1">
                            <EyeIcon className="w-3 h-3" /> {task.processed_pages > 0 ? `${task.processed_pages} 页已阅` : '未读'}
                        </span>
                        <span className="w-px h-3 bg-slate-200"></span>
                        <span>{formatFileSize(task.file_size)}</span>
                        <span className="w-px h-3 bg-slate-200"></span>
                        <span className="uppercase">{task.file_type}</span>
                    </div>
                    
                    <div className="flex items-center text-xs font-bold text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-1 group-hover:translate-y-0">
                        立即阅读 <ChevronRightIcon className="w-3.5 h-3.5 ml-0.5" />
                    </div>
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
            
            {/* Header Area */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)]">
                <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        
                        {/* Title */}
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
                                <DocumentTextIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">深度洞察索引</h1>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Strategic Intelligence Library</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto no-scrollbar">
                            <div className="flex bg-slate-100 p-1 rounded-xl">
                                <button 
                                    onClick={() => setSelectedCategoryId(null)}
                                    className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${selectedCategoryId === null ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >
                                    全部
                                </button>
                                {categories.slice(0, 5).map(cat => (
                                    <button 
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${selectedCategoryId === cat.id ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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

            {/* Main Content List */}
            <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {isLoading ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-64 animate-pulse flex gap-6">
                                <div className="w-32 bg-slate-100 rounded-xl h-full"></div>
                                <div className="flex-1 space-y-4 py-2">
                                    <div className="w-1/3 h-4 bg-slate-100 rounded"></div>
                                    <div className="w-3/4 h-6 bg-slate-100 rounded"></div>
                                    <div className="w-full h-24 bg-slate-50 rounded-xl mt-4 border border-slate-100"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : tasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center min-h-[500px] text-center">
                        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6 border border-slate-100 shadow-sm">
                            <CloudIcon className="w-12 h-12 text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-700 mb-2">暂无文档数据</h3>
                        <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
                            还没有上传任何深度报告。请联系管理员在后台上传 PDF 文件，AI 将自动为您解析并生成洞察。
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {tasks.map((task) => {
                            const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                            return (
                                <InsightCard
                                    key={task.id}
                                    task={task}
                                    categoryName={categoryName}
                                    onClick={() => setReaderTask(task)}
                                />
                            );
                        })}
                    </div>
                )}
                
                {!isLoading && tasks.length > 0 && (
                    <div className="mt-12 text-center">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">End of Intelligence List</p>
                    </div>
                )}
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
