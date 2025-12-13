
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories, getDeepInsightTasksStats } from '../../api';
import { 
    SearchIcon, RefreshIcon, ArrowRightIcon, SparklesIcon, CalendarIcon, 
    ChipIcon, ViewGridIcon, GlobeIcon, LightningBoltIcon, ChartIcon,
    TruckIcon, BrainIcon, CubeIcon, EyeIcon, ClockIcon, DocumentTextIcon
} from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Assets & Constants ---
const PRIMARY_COLOR = "#2b4bee";

const MOCK_COVERS = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAaHsVrIG9OQVYkwyMx1j2261zbHcD8RW-M2aWirs5XyZXM9RzNnCEF_kPm377tJNIvDBMNv8HHCN2ijHiNlnQzFO3xutAfAwUB8CgPiH6qdSVvNcYMDNhDBFZRfgqsrgSYGlQOS6jX-xBH2AxgE5NuS10xMar0wH1CRnyNzU8C16PtV102noRgRp4G2325PY_vm0kvcMfgwLqWeDZoMvkJja3AUg2cD_A35dOZi2UpQOkpi6H_KryrWHW0A7VfCSkAms-sTgIGB7I',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCwkSJq5q1ni26Olee3483RfsBI4kGBZudhLdeAjaKPhrF-YQH40ZmLqn-HTHjNAz9OLhEuhQy2e5E5QOyBbc8fLCk5LOYQzVr1W1xQ5AHhII1flYW_KrxojcHLOXheNUss3dsmY6HUK1rJQWiG2HUI5Ma4t9STltIzqQZiOMUH_81PeNHmLyQs1_6b8c13QYRe3c8o8uz_BkZgSEjZUZrTdexAsy861fPJbd6BKgO7dfXe2arTS8iReJ9Av6ZqgD6rBuhb8G5QxNw',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuAo_Ky35QeGMbrPEyknzluoeGJXLemavw_DaIjotNg4NG6IUnd3mKf6V0PCAmfoWBDgFlMg6bpg_UQ9060EcZQ0tRxRsnzwto50tahA3LoLfIUvo2IYM8bpIErLUPtRKQ9nhMMHliccYaONoaP1MnRoMIY8Vibzin7L_HZ-wddr2zJ3RaEXlZ5u46FDlp0JXl7QhKx1JGLfbmHtor41s4CItKbGnB6VJW8TBaPUzkAUUudeRKo8RGWnM3GL6pCnEybxPMiZSfaEoDU',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuDi3FMZ9WHe5_ggUX0THN9MbJD36G7FMk1E6MkcZxvF3iSBORa38sI8vpLfgixHAUuqIF9-nZI5PpmHH0_2U6rkAxP8i4Ih55KtrcVtOne_4iFmQQtA0Umr9LsdjCeddaVHo5Ey1n_mbWYGjL749t-kdFdzLhr2rvifLWsq9EyB1jm7hqKVSJsR6yR-DREwUOLug7kTs_cc5uKHFREyLMA7O72JCek0w_rqgc4bFPEO76wfpA0PqEQ0B5dS4HBwbsGoW4Bjpvdze9E',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuC78H4ERVzjD5NmXksg--uRpz3OdZKFIEkuGa0qADRvSooBtWAbvuz2QwtI7fh5UUL2yA43xkAVgQO6CpzSQLuQxUDEkeTd_n_FQnYcmCcMOyp0tXHQV8-0GpWnwlUupDx9H-QNQMoEmpoLBgxl853SiYpUI3liSILoxSaTxKTVbKN7gdRnV-R74GCEmMXl16tOwSStUq5Ffh_0Vh6FWUmJy8zubt-AflvX-LL-dKz1wDltHnZPK6tzWi-JAz_VBzcb9DnUyc4gQ5I',
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBPf90A-b-PL6eDH4r0vA8OwegjrIVXVWlQpjGBjK56tJKSEpP_Z_0Ma0dF2WLzWbbVrDCHIgaHdYJVpD4eXXPQvWd-YmRYDIczAG5SI9i28NWNcndA2Ir0SDd5WoNwUYq52wo1hvvE7yX8Bqj0HrFLqBQSfkudFQ0LF_75hgkbrfWwoXTwjT93eAXcck63-tQp8U8HoGHD9hjRioOtUzXqGEKZitzpsCyAFyO2lw21oW5R_gBrAur-E_CB-51qRdKE1krtrrxM6FY'
];

// Based on ID, pick a deterministic cover
const getCoverImage = (id: string, index: number) => {
    return MOCK_COVERS[(id.charCodeAt(0) + index) % MOCK_COVERS.length];
};

// --- Sub Components ---

const StatCard: React.FC<{ 
    title: string; 
    value: number | string; 
    change?: string; 
    isPositive?: boolean; 
    icon: React.ReactNode;
    color: string;
    progress: number;
}> = ({ title, value, change, isPositive, icon, color, progress }) => (
    <div className="bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] p-5 rounded-2xl relative overflow-hidden group hover:border-[#2b4bee]/40 transition-all hover:shadow-lg">
        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity text-[#2b4bee]">
            {icon}
        </div>
        <p className="text-slate-400 text-xs font-mono uppercase tracking-widest mb-1">{title}</p>
        <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-800">{typeof value === 'number' ? value.toLocaleString() : value}</span>
            {change && (
                <span className={`${isPositive ? 'text-emerald-500 bg-emerald-50' : 'text-orange-500 bg-orange-50'} text-xs font-bold flex items-center px-1.5 py-0.5 rounded-full`}>
                    {isPositive ? '↑' : '↓'} {change}
                </span>
            )}
        </div>
        <div className="w-full bg-slate-100 h-1.5 mt-3 rounded-full overflow-hidden">
            <div 
                className={`h-full ${color} shadow-[0_0_8px_rgba(43,75,238,0.4)] transition-all duration-1000`} 
                style={{ width: `${progress}%` }}
            ></div>
        </div>
    </div>
);

const HeroCard: React.FC<{ task: DeepInsightTask | null; onClick: () => void }> = ({ task, onClick }) => {
    if (!task) return (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 animate-pulse flex items-center justify-center">
            <div className="text-slate-400 font-bold">加载推荐内容...</div>
        </div>
    );

    return (
        <div 
            onClick={onClick}
            className="relative w-full min-h-[400px] md:h-[500px] rounded-3xl overflow-hidden border border-slate-200 bg-white shadow-xl transition-all duration-700 hover:shadow-2xl hover:border-[#2b4bee]/20 group cursor-pointer perspective-1000"
        >
            <div 
                className="absolute inset-0 bg-cover bg-center transition-transform duration-[20s] ease-linear scale-110 group-hover:scale-105" 
                style={{ backgroundImage: `url('https://lh3.googleusercontent.com/aida-public/AB6AXuA-51opXwScHMloPPto5eGXz9WpUlrTtHjb8Sr84JDgdr7AOLdHGt5b0EQFV2qlCTyOzQnmdNVN7HPR_XZptmY2eaiL5A9xu7dsM24XQNG1TJiBnEW0aD8amAE_JoSxB2_SIIXfxRnlvCb5QFD1PhwCxNcPauQuzg0cP8sr91BQF44113Rj2NWJsrqw02rtEvOXERJElN0AQ4VCVw16wWwOOmv_0x_bjpdvMqD-2K9CR1rAtgm7hUqiETEn6FCcge3Qm4iB6bYhv44')` }}
            ></div>
            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/60 to-transparent opacity-90"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#0f172a]/40 to-transparent opacity-80"></div>
            
            {/* Tech UI Elements */}
            <div className="absolute top-10 right-10 w-32 h-32 border-t border-r border-white/20 rounded-tr-3xl opacity-30"></div>
            <div className="absolute bottom-10 left-10 w-32 h-32 border-b border-l border-white/20 rounded-bl-3xl opacity-30"></div>

            <div className="relative h-full flex flex-col justify-end p-8 md:p-16 z-10">
                <div className="flex items-center gap-3 mb-4">
                    <span className="px-2 py-0.5 rounded text-[12px] font-bold tracking-widest uppercase bg-[#2b4bee] text-white border border-[#2b4bee]/50 shadow-lg shadow-[#2b4bee]/20">
                        今日精选
                    </span>
                    <span className="w-12 h-[1px] bg-white/40"></span>
                    <span className="text-xs text-blue-200 font-mono">ID: {task.id.slice(0, 8).toUpperCase()}</span>
                </div>
                <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight max-w-4xl drop-shadow-md">
                    {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                </h1>
                <p className="text-lg text-blue-100/80 max-w-2xl mb-8 font-light leading-relaxed line-clamp-2">
                    {task.file_type.toUpperCase()} 深度解析报告，包含 {task.total_pages} 页核心内容。
                    点击立即进入沉浸式阅读体验，探索行业前沿动态。
                </p>
                <div className="flex flex-wrap items-center gap-6">
                    <button className="relative overflow-hidden group/btn bg-white text-[#2b4bee] px-8 py-3 rounded-lg font-bold tracking-wide transition-all hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:scale-105 active:scale-95">
                        <span className="relative z-10 flex items-center gap-2">
                            开始阅读
                            <ArrowRightIcon className="w-4 h-4" />
                        </span>
                    </button>
                    <div className="flex items-center gap-4 text-sm font-mono text-white/70">
                        <div className="flex items-center gap-2">
                            <EyeIcon className="w-4 h-4" />
                            <span>{Math.floor(Math.random() * 5000) + 1000} 浏览</span>
                        </div>
                        <div className="w-1 h-1 bg-white/40 rounded-full"></div>
                        <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4" />
                            <span>{new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Main Page ---

export const DeepDives: React.FC = () => {
    // Data State
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [stats, setStats] = useState<{ total: number; completed: number; failed: number; processing: number; pending: number } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // UI State
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [readerTask, setReaderTask] = useState<DeepInsightTask | null>(null);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cats, tasksRes, statsRes] = await Promise.all([
                getDeepInsightCategories(),
                getDeepInsightTasks({ limit: 100 }),
                getDeepInsightTasksStats()
            ]);
            setCategories(cats);
            setTasks(tasksRes.items || []);
            setStats(statsRes);
        } catch (error) {
            console.error("Failed to load Deep Insight data", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            const matchesCategory = selectedCategoryId ? task.category_id === selectedCategoryId : true;
            const matchesSearch = searchQuery 
                ? task.file_name.toLowerCase().includes(searchQuery.toLowerCase()) 
                : true;
            return matchesCategory && matchesSearch;
        });
    }, [tasks, selectedCategoryId, searchQuery]);

    // Derived featured task (e.g. most recently completed)
    const featuredTask = useMemo(() => {
        return tasks.find(t => t.status === 'completed') || tasks[0] || null;
    }, [tasks]);

    return (
        <div className="relative min-h-full bg-[#f3f5f9] font-sans text-slate-900 overflow-x-hidden selection:bg-[#2b4bee] selection:text-white pb-20">
            
            {/* 1. Ambient Background */}
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#2b4bee]/5 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-300/10 rounded-full blur-[100px]"></div>
                <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(to right, #2b4bee0d 1px, transparent 1px), linear-gradient(to bottom, #2b4bee0d 1px, transparent 1px)", backgroundSize: "40px 40px" }}></div>
            </div>

            {/* 2. Content Container */}
            <div className="relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                
                {/* Header Actions */}
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 tracking-tight font-display">
                            深度研究 <span className="text-[#2b4bee]">.DeepInsight</span>
                        </h1>
                        <p className="text-slate-500 text-sm mt-1">AI 驱动的沉浸式行业文档解析与知识重构</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-white/80 backdrop-blur rounded-full px-4 h-10 border border-slate-200 focus-within:border-[#2b4bee]/50 focus-within:bg-white transition-all w-64 group shadow-sm">
                            <SearchIcon className="w-4 h-4 text-slate-400 group-focus-within:text-[#2b4bee] transition-colors" />
                            <input 
                                className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 placeholder-slate-400 w-full ml-2 outline-none" 
                                placeholder="搜索报告..." 
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button onClick={loadData} className="w-10 h-10 rounded-full bg-white hover:shadow-md hover:text-[#2b4bee] flex items-center justify-center transition-all border border-slate-200 text-slate-500">
                            <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>

                {/* Hero Section */}
                <section className="mb-12">
                    <HeroCard task={featuredTask} onClick={() => featuredTask && setReaderTask(featuredTask)} />
                </section>

                {/* Stats Grid */}
                <section className="mb-12">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard 
                            title="知识库总量" 
                            value={stats?.total || 0} 
                            change="5.2%" isPositive 
                            icon={<ChartIcon className="w-5 h-5"/>} 
                            color="bg-[#2b4bee]" 
                            progress={70} 
                        />
                        <StatCard 
                            title="解析完成" 
                            value={stats?.completed || 0} 
                            change="1.8%" isPositive 
                            icon={<LightningBoltIcon className="w-5 h-5"/>} 
                            color="bg-emerald-500" 
                            progress={85} 
                        />
                        <StatCard 
                            title="正在处理" 
                            value={stats?.processing || 0} 
                            change="Active" isPositive={false} 
                            icon={<SparklesIcon className="w-5 h-5"/>} 
                            color="bg-orange-500" 
                            progress={40} 
                        />
                        <StatCard 
                            title="待处理队列" 
                            value={stats?.pending || 0} 
                            change="Queue" isPositive={false} 
                            icon={<ClockIcon className="w-5 h-5"/>} 
                            color="bg-purple-500" 
                            progress={20} 
                        />
                    </div>
                </section>

                {/* Filters */}
                <section className="mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="flex gap-4 min-w-max">
                        <button 
                            onClick={() => setSelectedCategoryId(null)}
                            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all border ${
                                selectedCategoryId === null 
                                ? 'bg-[#2b4bee] text-white border-[#2b4bee] shadow-lg shadow-[#2b4bee]/20' 
                                : 'bg-white text-slate-600 border-slate-200 hover:border-[#2b4bee]/30 hover:text-[#2b4bee] hover:shadow-md'
                            }`}
                        >
                            <ViewGridIcon className="w-4 h-4" />
                            全部分类
                        </button>
                        {categories.map(cat => (
                            <button 
                                key={cat.id}
                                onClick={() => setSelectedCategoryId(cat.id)}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wide transition-all border ${
                                    selectedCategoryId === cat.id 
                                    ? 'bg-[#2b4bee] text-white border-[#2b4bee] shadow-lg shadow-[#2b4bee]/20' 
                                    : 'bg-white text-slate-600 border-slate-200 hover:border-[#2b4bee]/30 hover:text-[#2b4bee] hover:shadow-md'
                                }`}
                            >
                                {cat.name.includes('驾驶') ? <ChipIcon className="w-4 h-4"/> :
                                 cat.name.includes('座舱') ? <SparklesIcon className="w-4 h-4"/> :
                                 <CubeIcon className="w-4 h-4"/>}
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Cards Grid */}
                <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTasks.map((task, idx) => {
                        const coverImage = getCoverImage(task.id, idx);
                        const categoryName = categories.find(c => c.id === task.category_id)?.name || '未分类';
                        
                        return (
                            <div 
                                key={task.id} 
                                onClick={() => setReaderTask(task)}
                                className="group relative aspect-[4/3] rounded-2xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow duration-300 border border-slate-200 bg-white"
                            >
                                {/* Active Border Effect */}
                                <div className="absolute inset-0 border border-white/20 group-hover:border-[#2b4bee]/50 transition-all duration-500 z-20 pointer-events-none rounded-2xl"></div>
                                
                                {/* Image Background */}
                                <div 
                                    className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110 z-0" 
                                    style={{ backgroundImage: `url('${coverImage}')` }}
                                ></div>
                                
                                {/* Gradients */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10"></div>
                                
                                {/* Content */}
                                <div className="absolute inset-0 p-6 flex flex-col justify-end z-30 transform transition-transform duration-500 group-hover:-translate-y-2">
                                    <div className="flex items-center gap-2 mb-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                                        <span className="px-2 py-0.5 text-[10px] font-bold bg-[#2b4bee] text-white rounded uppercase tracking-wider shadow-sm">
                                            {categoryName}
                                        </span>
                                        <span className="text-xs text-blue-200 font-mono">
                                            {task.file_type.toUpperCase()}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white leading-tight mb-2 group-hover:text-blue-200 transition-colors line-clamp-2">
                                        {task.file_name}
                                    </h3>
                                    <div className="flex items-center gap-4 text-xs text-slate-300 mt-1">
                                        <span>{new Date(task.created_at).toLocaleDateString()}</span>
                                        <span>{task.total_pages} 页</span>
                                        {task.status === 'completed' && (
                                            <span className="text-emerald-400 flex items-center gap-1">
                                                <SparklesIcon className="w-3 h-3" /> 已解析
                                            </span>
                                        )}
                                    </div>
                                    <div className="h-[2px] w-12 bg-white/30 group-hover:w-full group-hover:bg-[#2b4bee] transition-all duration-700 mt-4"></div>
                                </div>
                            </div>
                        );
                    })}
                </section>

                {filteredTasks.length === 0 && !isLoading && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                            <SearchIcon className="w-10 h-10 text-slate-300 opacity-50" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-800">暂无相关报告</h3>
                        <p className="text-slate-500 mt-2 text-sm">尝试调整筛选条件或搜索关键词</p>
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
