
import React, { useState, useRef, useEffect } from 'react';
import { InfoItem } from '../../types';
import { RssIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, MenuIcon, ViewGridIcon, SearchIcon, CloseIcon } from '../icons';

const ArticleCard: React.FC<{
    article: InfoItem;
    isActive: boolean;
    onClick: () => void;
}> = ({ article, isActive, onClick }) => (
    <div
        onClick={onClick}
        className={`
            group p-4 sm:p-5 rounded-[16px] transition-all duration-300 cursor-pointer mb-3 border relative overflow-hidden
            ${isActive 
                ? 'bg-white border-indigo-500/30 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/20 z-10' 
                : 'bg-white border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300/50 hover:-translate-y-0.5'
            }
        `}
    >
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500"></div>}
        
        <div className="flex justify-between items-center gap-2 mb-2.5">
            <span className={`
                inline-flex items-center px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-md uppercase
                ${isActive ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-50 text-slate-500 group-hover:bg-slate-100'}
            `}>
                {article.source_name}
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                <ClockIcon className="w-3 h-3" />
                {new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
            </span>
        </div>
        
        <h4 className={`font-bold text-[14px] sm:text-[15px] leading-snug line-clamp-2 mb-2 transition-colors ${isActive ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-700'}`}>
            {article.title}
        </h4>
        
        <p className={`text-xs line-clamp-2 leading-relaxed ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
            {article.content}
        </p>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-white p-5 rounded-[16px] border border-slate-100 mb-3 shadow-sm">
        <div className="flex justify-between mb-3">
            <div className="h-5 w-20 bg-slate-100 rounded-full animate-pulse"></div>
            <div className="h-4 w-16 bg-slate-100 rounded-full animate-pulse"></div>
        </div>
        <div className="h-5 w-full bg-slate-100 rounded-lg mt-1 animate-pulse"></div>
        <div className="h-5 w-3/4 bg-slate-100 rounded-lg mt-2 animate-pulse"></div>
    </div>
);

interface IntelligenceCenterProps {
    title: string;
    articles: InfoItem[];
    isLoading: boolean;
    error: string | null;
    selectedArticleId: string | null;
    onSelectArticle: (article: InfoItem) => void;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (newPage: number) => void;
    isSidebarOpen?: boolean;
    onToggleSidebar?: () => void;
    onSearch?: (query: string) => void; // New prop for search
    onBackToNav?: () => void; // New prop for mobile back navigation
}

export const IntelligenceCenter: React.FC<IntelligenceCenterProps> = ({
    title,
    articles,
    isLoading,
    error,
    selectedArticleId,
    onSelectArticle,
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
    isSidebarOpen = true,
    onToggleSidebar,
    onSearch,
    onBackToNav
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim() && onSearch) {
            onSearch(searchValue.trim());
            // On mobile, close search bar after search to show title (optional)
            // setIsSearchOpen(false); 
        }
    };

    const clearSearch = () => {
        setSearchValue('');
        if (isSearchOpen) {
            setIsSearchOpen(false);
        }
        // Optionally trigger a reset search here if desired
    };

    return (
        <div className="h-full flex flex-col bg-white/50 backdrop-blur-sm">
            {/* Header */}
            <div className="px-4 py-3 md:px-5 md:py-4 border-b border-slate-100 bg-white/80 backdrop-blur flex-shrink-0 items-center h-[64px] md:h-[72px] relative overflow-hidden">
                
                {/* Standard Header Content (Title & Toggle) */}
                <div className={`flex items-center justify-between h-full w-full transition-opacity duration-300 ${isSearchOpen ? 'opacity-0 pointer-events-none absolute inset-0 px-4' : 'opacity-100'}`}>
                    <div className="flex items-center gap-3 overflow-hidden flex-1">
                        {/* Mobile Back Button */}
                        <button 
                            onClick={onBackToNav} 
                            className="md:hidden p-2 -ml-2 hover:bg-slate-50 rounded-full transition-colors"
                        >
                            <ChevronLeftIcon className="w-5 h-5 text-slate-600"/>
                        </button>

                        {/* Desktop Sidebar Toggle */}
                        {onToggleSidebar && (
                            <button 
                                onClick={onToggleSidebar}
                                className={`hidden md:block p-2 rounded-xl transition-all duration-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 flex-shrink-0 ${!isSidebarOpen ? 'bg-indigo-50 text-indigo-600' : ''}`}
                                title={isSidebarOpen ? "收起导航" : "展开导航"}
                            >
                                {isSidebarOpen ? <ViewGridIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
                            </button>
                        )}
                        
                        <div className="flex flex-col min-w-0">
                            <h3 className="font-extrabold text-slate-900 text-base lg:text-lg tracking-tight truncate" title={title}>{title}</h3>
                            {!isLoading && (
                                <p className="text-[10px] text-slate-400 font-medium truncate hidden sm:block">
                                    {totalItems} 条情报
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Search Trigger Button */}
                    <button 
                        onClick={() => setIsSearchOpen(true)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all"
                        title="搜索"
                    >
                        <SearchIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Expanded Search Bar */}
                <div className={`absolute inset-0 bg-white flex items-center px-4 transition-transform duration-300 ease-in-out ${isSearchOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                    <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
                        <SearchIcon className="absolute left-3 w-4 h-4 text-slate-400" />
                        <input 
                            ref={inputRef}
                            type="text" 
                            className="w-full bg-slate-100 border-none text-slate-700 text-sm rounded-full pl-9 pr-8 py-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                            placeholder="输入关键词搜索..."
                            value={searchValue}
                            onChange={(e) => setSearchValue(e.target.value)}
                            onBlur={() => { if (!searchValue) setIsSearchOpen(false); }}
                        />
                        {searchValue && (
                            <button 
                                type="button" 
                                onClick={() => setSearchValue('')}
                                className="absolute right-2 p-1 text-slate-400 hover:text-slate-600"
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                        )}
                    </form>
                    <button 
                        onClick={clearSearch} 
                        className="ml-3 text-sm font-medium text-slate-500 hover:text-slate-800"
                    >
                        取消
                    </button>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-4 bg-slate-50/50 custom-scrollbar">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 text-sm font-medium bg-red-50 py-3 px-6 rounded-xl inline-block border border-red-100">{error}</p>
                    </div>
                ) : articles.length > 0 ? (
                    articles.map((article) => (
                        <ArticleCard
                            key={article.id}
                            article={article}
                            isActive={selectedArticleId === article.id}
                            onClick={() => onSelectArticle(article)}
                        />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-full shadow-sm border border-slate-100 flex items-center justify-center mb-4">
                            <RssIcon className="w-6 h-6 text-slate-300" />
                        </div>
                        <p className="text-sm font-bold text-slate-600">暂无内容</p>
                    </div>
                )}
            </div>

            {/* Footer / Pagination */}
            {totalItems > 0 && !isLoading && (
                <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 bg-white flex justify-between items-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">P {currentPage}/{totalPages}</span>
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => onPageChange(currentPage - 1)} 
                            disabled={currentPage <= 1}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 transition-all"
                        >
                            <ChevronLeftIcon className="w-3.5 h-3.5"/>
                        </button>
                        <button 
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="w-7 h-7 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 transition-all"
                        >
                            <ChevronRightIcon className="w-3.5 h-3.5"/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
