
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DeepInsightTask, DeepInsightCategory } from '../../types';
import { getDeepInsightTasks, getDeepInsightCategories, fetchDeepInsightCover } from '../../api/deepInsight';
import { SearchIcon, DocumentTextIcon, RefreshIcon, CloudIcon, ArrowRightIcon, SparklesIcon, CalendarIcon, ChipIcon } from '../icons';
import { DeepDiveReader } from './DeepDiveReader';

// --- Helpers ---

const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).replace(/\//g, '-');
};

// 生成基于字符串的确定性哈希，用于分配颜色
const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
};

// 复刻原型中的卡片主题配置 (背景渐变 + 光斑颜色)
const THEMES = [
    { 
        name: 'Blue', 
        bg: 'bg-gradient-to-r from-blue-900 to-slate-900', 
        blob1: 'bg-primary/20', 
        blob2: 'bg-purple-500/10',
        tagBg: 'bg-white/10 text-white ring-white/20',
        texture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDiwQUGV7LNhx3xeloH5vwakHQsn0_EtrUOtmNJJrstG33wMx2QBOfBdfSagVbvwYDYsoCGdRBZmssTusVw_NshuPKrLxR1Fe9L7rhftK4ypmlX4AdiPpb5LkAhp0i3DUAQlUKwGigPrYX7VmLBHcJup2UwVkWLzqyFGFDcruiBRLGZ6vxGyWZRhs1ynnuYTNxgliCJQJ_bFpVuR8tembCAMAEcQxTVAm6vu1I7TgP4ntV22kX3eyukivbKhmXwth-pchq4DqjHfJZe'
    },
    { 
        name: 'Emerald', 
        bg: 'bg-gradient-to-r from-slate-800 to-slate-900', 
        blob1: 'bg-emerald-500/20', 
        blob2: 'bg-teal-500/10',
        tagBg: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
        texture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0x3i0BdIPMFYIhzct_FmGjTxYF1WDKTqSmefgqESBGwNGW2IiCHHs0P1CRQmmvy7mf0nGZE2YEbJ4GQ5ULjn6NIaCnazsKI67nAHqdq-q4TbnH5iYXYWqwR_j3t4LjMhXzbg6vIhNVFPD-q7rjpDb6PYT0Pkeakk6_Zj0dZhD6l8x4wxREUg01C1qHOaSKtl6TwhnIj_ahfjfPjGPP0bI2rethhB1SQ6xqtcG_Nr5cUChvL0268AlCrEXYCe3HSrCHLgTfxaqpjcy'
    },
    { 
        name: 'Indigo', 
        bg: 'bg-gradient-to-r from-indigo-900 to-violet-900', 
        blob1: 'bg-indigo-500/30', 
        blob2: 'bg-blue-500/20',
        tagBg: 'bg-indigo-500/20 text-indigo-200 ring-indigo-500/30',
        texture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCI50LEG0lbVpB5PJug8Wj6Ndb68IH3HJD67i3UdU3z5XAw7UrEgFzYcHQPkAXVGm8Gv8sU1eVABsAFMx6rFkZZ8H66rj0AmIMiD27TjaLenj9dkuEblDjURCxzjWUVWE_Y_IzjThuocIKMAkZxRgTADexIep6FpLgS3m2Ta4CH1CS6phyDv2bVJ2qBZL0aYHYaZzDdpOr8DD2t7iJE9hFkfUhfvkzoktYdtXiyBUTKqktQDT8WHih3tkfiALD0MkbC3kHBjk0Hkaho'
    },
    { 
        name: 'Orange', 
        bg: 'bg-gradient-to-r from-orange-900/80 to-slate-900', 
        blob1: 'bg-orange-500/20', 
        blob2: 'bg-red-500/10',
        tagBg: 'bg-orange-500/20 text-orange-200 ring-orange-500/30',
        texture: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD0E8A587y99dgw_iuIjQDxnkCxrqcXQJQ8swdBGm2hx_B9mYYu9hv8aBj3iqNCQsZkO_mLXs9f8mxYaCHtZE5E0ABLjHLXbH3ydyVTmFbkL_pQqGX23tjv93hgYGAWHSFX8tFt80kkxfDC0-UL-di-EjEw7OJzMGrYAgh3LHJhq-ExUKaTdWpQzH96u6chDULVy4QmG4XpwdZjfytbDk9atoTl68TZCCdSxBWXXWO5Jjmb7IXO05jVUj1Pj3uaR8weusaMEbi1vNvM'
    }
];

// --- Components ---

const PrototypeCard: React.FC<{ task: DeepInsightTask; categoryName?: string; onClick: () => void }> = ({ task, categoryName, onClick }) => {
    // 基于ID选择主题，保证同一卡片颜色固定
    const themeIndex = getHash(task.id) % THEMES.length;
    const theme = THEMES[themeIndex];

    return (
        <div 
            onClick={onClick}
            className="group relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition-all hover:shadow-lg hover:-translate-y-1 cursor-pointer h-full"
        >
            {/* Cover Image Area (32 height unit approx 128px) */}
            <div className="relative h-32 w-full overflow-hidden flex-shrink-0">
                {/* Background Gradient */}
                <div className={`absolute inset-0 ${theme.bg}`}></div>
                
                {/* Decorative Abstract Shapes (Blobs) */}
                <div className={`absolute -right-10 -top-20 h-64 w-64 rounded-full blur-3xl ${theme.blob1}`}></div>
                <div className={`absolute -left-10 -bottom-20 h-64 w-64 rounded-full blur-3xl ${theme.blob2}`}></div>
                
                <div className="relative z-10 flex h-full items-center px-5 w-full">
                    {/* Abstract tech pattern background (Texture) */}
                    <div 
                        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay" 
                        style={{ backgroundImage: `url('${theme.texture}')` }}
                    ></div>
                    
                    {/* Text Content in Cover */}
                    <div className="relative z-20 w-full pr-4">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset backdrop-blur-sm mb-2 ${theme.tagBg}`}>
                            {categoryName || '行业洞察'}
                        </span>
                        <h3 className="text-lg md:text-xl font-bold text-white leading-tight line-clamp-2 drop-shadow-sm tracking-tight">
                            {task.file_name.replace(/\.(pdf|ppt|pptx)$/i, '')}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex flex-col gap-3 p-4 flex-1 justify-end">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            {formatDate(task.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                            <DocumentTextIcon className="w-4 h-4" />
                            {task.total_pages > 0 ? `${task.total_pages}页` : 'PDF'}
                        </span>
                    </div>
                    <span className="text-[#135bec] font-bold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform duration-300">
                        阅读
                        <ArrowRightIcon className="w-4 h-4" />
                    </span>
                </div>
            </div>
        </div>
    );
};

const FilterChip: React.FC<{ label: string; icon?: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ label, icon, isActive, onClick }) => (
    <button
        onClick={onClick}
        className={`
            snap-start shrink-0 flex h-9 items-center gap-2 rounded-full px-4 transition-all active:scale-95 text-sm font-medium whitespace-nowrap
            ${isActive 
                ? 'bg-[#135bec] text-white shadow-lg shadow-blue-500/20' 
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }
        `}
    >
        {icon && <span className={isActive ? 'text-white' : 'text-slate-600'}>{icon}</span>}
        <span>{label}</span>
    </button>
);

// --- Main Page Component ---

export const DeepDives: React.FC = () => {
    const [tasks, setTasks] = useState<DeepInsightTask[]>([]);
    const [categories, setCategories] = useState<DeepInsightCategory[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [readerTask, setReaderTask] = useState<DeepInsightTask | null>(null);
    const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [cats, tasksRes] = await Promise.all([
                getDeepInsightCategories(),
                getDeepInsightTasks({ limit: 100 })
            ]);
            setCategories(cats);
            setTasks(tasksRes.items || []);
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

    const getCategoryName = (id?: string) => {
        if (!id) return undefined;
        return categories.find(c => c.id === id)?.name;
    };

    return (
        <div className="h-full flex flex-col bg-[#f6f6f8] overflow-hidden font-display">
            
            {/* Top App Bar - 适配原型的透明模糊顶栏 */}
            <div className="sticky top-0 z-40 bg-[#f6f6f8]/90 backdrop-blur-md px-5 py-3 flex items-center justify-between border-b border-black/5">
                {/* Title Section */}
                <div className={`transition-all duration-300 ${isMobileSearchOpen ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>
                    <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">深度洞察</h1>
                </div>

                {/* Search Section */}
                <div className={`flex items-center justify-end gap-2 transition-all duration-300 ${isMobileSearchOpen ? 'flex-1 w-full' : ''}`}>
                    {isMobileSearchOpen ? (
                        <div className="flex-1 flex items-center gap-2 animate-in fade-in slide-in-from-right-5">
                            <input 
                                type="text" 
                                placeholder="搜索报告..." 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-4 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#135bec]/20 shadow-sm"
                                autoFocus
                                onBlur={() => !searchQuery && setIsMobileSearchOpen(false)}
                            />
                            <button onClick={() => setIsMobileSearchOpen(false)} className="p-2 text-slate-500 font-bold text-sm whitespace-nowrap">
                                取消
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {/* Desktop Search Box (Hidden on Mobile) */}
                            <div className="hidden md:block relative">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="搜索报告..." 
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-[#135bec]/20 w-64 shadow-sm"
                                />
                            </div>
                            
                            {/* Mobile Search Button */}
                            <button 
                                onClick={() => setIsMobileSearchOpen(true)}
                                className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-slate-100 transition-colors text-slate-600 shadow-sm border border-slate-200"
                            >
                                <SearchIcon className="w-5 h-5" />
                            </button>

                            <button 
                                onClick={loadData}
                                className="flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-slate-100 transition-colors text-slate-600 shadow-sm border border-slate-200"
                            >
                                <RefreshIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filter Chips - Horizontal Scroll */}
            <div className="w-full pt-4 pb-2 bg-[#f6f6f8] z-30">
                <div className="flex gap-3 px-5 overflow-x-auto hide-scrollbar snap-x no-scrollbar">
                    <FilterChip 
                        label="全部" 
                        icon={<ViewGridIcon className="w-4 h-4" />}
                        isActive={selectedCategoryId === null} 
                        onClick={() => setSelectedCategoryId(null)} 
                    />
                    {categories.map(cat => (
                        <FilterChip 
                            key={cat.id} 
                            label={cat.name} 
                            icon={
                                // Simple mapping for icons based on name keywords, fallback to generic
                                cat.name.includes('驾驶') ? <ChipIcon className="w-4 h-4"/> :
                                cat.name.includes('座舱') ? <SparklesIcon className="w-4 h-4"/> :
                                <CloudIcon className="w-4 h-4"/>
                            }
                            isActive={selectedCategoryId === cat.id} 
                            onClick={() => setSelectedCategoryId(cat.id)} 
                        />
                    ))}
                </div>
            </div>

            {/* Report List Content */}
            <main className="flex-1 overflow-y-auto custom-scrollbar p-5 pb-24">
                <div className="max-w-[1920px] mx-auto">
                    {isLoading && tasks.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="h-64 rounded-2xl bg-white p-4 shadow-sm border border-slate-100 animate-pulse flex flex-col">
                                    <div className="h-32 bg-slate-200 rounded-xl w-full mb-4"></div>
                                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                                    <div className="h-4 bg-slate-200 rounded w-1/2 mt-auto"></div>
                                </div>
                            ))}
                        </div>
                    ) : filteredTasks.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                            {filteredTasks.map(task => (
                                <PrototypeCard 
                                    key={task.id} 
                                    task={task} 
                                    categoryName={getCategoryName(task.category_id || undefined)}
                                    onClick={() => setReaderTask(task)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-32 text-center">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-sm border border-slate-100">
                                <CloudIcon className="w-10 h-10 text-slate-300" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">暂无相关报告</h3>
                            <p className="text-slate-500 mt-2 text-sm">尝试调整筛选条件</p>
                            <button 
                                onClick={() => { setSelectedCategoryId(null); setSearchQuery(''); }}
                                className="mt-6 px-6 py-2 bg-white border border-slate-300 rounded-full text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                            >
                                重置筛选
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Reader Modal */}
            {readerTask && (
                <DeepDiveReader 
                    task={readerTask} 
                    onClose={() => setReaderTask(null)} 
                />
            )}

            {/* Helper Component for ViewGrid Icon used in 'All' chip */}
            <div className="hidden">
               {/* Just to ensure icon import usage if not used elsewhere */}
            </div>
        </div>
    );
};

// Local Icon Components for the Prototype Style if needed (using existing icons map)
const ViewGridIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" />
    </svg>
);
