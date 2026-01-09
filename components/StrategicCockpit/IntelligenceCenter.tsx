
import React, { useState, useRef, useEffect } from 'react';
import { InfoItem } from '../../types';
import { RssIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, SearchIcon, CloseIcon } from '../icons';

const ArticleCard: React.FC<{
    article: InfoItem;
    isActive: boolean;
    onClick: () => void;
}> = ({ article, isActive, onClick }) => (
    <div
        onClick={onClick}
        className={`
            group p-4 rounded-xl transition-all duration-200 cursor-pointer mb-2 border relative
            ${isActive 
                ? 'bg-indigo-600/5 border-indigo-600/20' 
                : 'bg-transparent hover:bg-white border-transparent hover:border-slate-200 hover:shadow-sm'
            }
        `}
    >
        <div className="flex justify-between items-start mb-1.5">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isActive ? 'text-indigo-600' : 'text-slate-500 group-hover:text-indigo-600'} transition-colors`}>
                {article.source_name}
            </span>
            <span className="text-[10px] text-slate-400">
                {new Date(article.publish_date || article.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
        </div>
        
        <h3 className={`text-sm font-semibold leading-snug ${isActive ? 'text-indigo-900' : 'text-slate-600 group-hover:text-slate-900'} transition-colors line-clamp-3`}>
            {article.title}
        </h3>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="p-4 rounded-xl border border-transparent mb-2">
        <div className="flex justify-between mb-2">
            <div className="h-3 w-16 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-3 w-10 bg-slate-200 rounded animate-pulse"></div>
        </div>
        <div className="h-4 w-full bg-slate-200 rounded animate-pulse mb-1"></div>
        <div className="h-4 w-2/3 bg-slate-200 rounded animate-pulse"></div>
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
    onSearch?: (query: string) => void; 
    onBackToNav?: () => void;
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
    onPageChange,
    onSearch,
}) => {
    const [searchValue, setSearchValue] = useState('');

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim() && onSearch) {
            onSearch(searchValue.trim());
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Search Bar Area */}
            <div className="px-4 pb-4 pt-0">
                <form onSubmit={handleSearchSubmit} className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        className="w-full pl-9 pr-4 py-2 bg-white border-none rounded-lg text-sm focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 shadow-sm"
                        placeholder="Search insights..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                    />
                    {searchValue && (
                        <button 
                            type="button" 
                            onClick={() => setSearchValue('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <CloseIcon className="w-3 h-3" />
                        </button>
                    )}
                </form>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto px-2 pb-2 custom-scrollbar space-y-1">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                ) : error ? (
                    <div className="text-center py-10 px-4">
                        <p className="text-red-500 text-xs bg-red-50 py-2 px-4 rounded-lg">{error}</p>
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
                    <div className="flex flex-col items-center justify-center pt-20 text-center px-8 text-slate-400">
                        <RssIcon className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs">暂无相关情报</p>
                    </div>
                )}
            </div>

            {/* Pagination Footer */}
            {totalPages > 1 && (
                <div className="flex-shrink-0 px-4 py-3 border-t border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm">
                    <button 
                        onClick={() => onPageChange(currentPage - 1)} 
                        disabled={currentPage <= 1}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors"
                    >
                        <ChevronLeftIcon className="w-4 h-4"/>
                    </button>
                    <span className="text-[10px] font-medium text-slate-400">Page {currentPage} of {totalPages}</span>
                    <button 
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className="p-1 rounded hover:bg-slate-200 text-slate-500 disabled:opacity-30 transition-colors"
                    >
                        <ChevronRightIcon className="w-4 h-4"/>
                    </button>
                </div>
            )}
        </div>
    );
};
