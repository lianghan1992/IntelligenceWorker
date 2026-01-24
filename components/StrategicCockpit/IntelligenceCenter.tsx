
import React, { useState, useRef, useEffect } from 'react';
import { InfoItem } from '../../types';
import { RssIcon, ChevronLeftIcon, ChevronRightIcon, ClockIcon, SearchIcon, CloseIcon, SparklesIcon, ShieldCheckIcon } from '../icons';
import { StrategicCompass } from './StrategicCompass';
import { Category } from './data';
import { DMCAComplaintModal } from './DMCAComplaintModal';

const ArticleCard: React.FC<{
    article: InfoItem;
    isActive: boolean;
    onClick: () => void;
}> = ({ article, isActive, onClick }) => (
    <div
        onClick={onClick}
        className={`
            relative p-5 rounded-2xl cursor-pointer mb-4 transition-all duration-300 group
            ${isActive 
                ? 'bg-white shadow-[0_8px_30px_-6px_rgba(0,0,0,0.1)] ring-1 ring-black/5 z-10' 
                : 'bg-white/60 hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-md'
            }
        `}
    >
        {/* Active Indicator Strip */}
        {isActive && (
            <div className="absolute left-0 top-6 bottom-6 w-1 bg-slate-800 rounded-r-full"></div>
        )}
        
        {/* Title: Prefer refined_title if available. Bolder font. */}
        <h4 className={`text-[15px] md:text-[16px] font-bold leading-relaxed line-clamp-2 mb-3 transition-colors ${isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'}`}>
            {article.refined_title || article.title}
        </h4>

        {/* Metadata Row */}
        <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
                {/* Source Badge */}
                <span className={`
                    inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border
                    ${isActive 
                        ? 'bg-slate-100 text-slate-600 border-slate-200' 
                        : 'bg-slate-50 text-slate-400 border-slate-100 group-hover:bg-slate-100 group-hover:text-slate-600 transition-colors'
                    }
                `}>
                    {article.source_name}
                </span>

                {/* Similarity Badge (Optional) */}
                {article.similarity !== undefined && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50">
                        <SparklesIcon className="w-2.5 h-2.5" />
                        {(article.similarity * 100).toFixed(0)}%
                    </span>
                )}
                
                {/* Refined Indicator */}
                {article.has_refined_content && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100/50" title="AI重构内容">
                        <ShieldCheckIcon className="w-2.5 h-2.5" />
                        Refined
                    </span>
                )}
            </div>

            {/* Date */}
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-bold tabular-nums opacity-60 group-hover:opacity-100 transition-opacity">
                {new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric'})}
            </span>
        </div>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 mb-4 shadow-sm">
        <div className="h-5 w-3/4 bg-slate-100 rounded animate-pulse mb-3"></div>
        <div className="h-5 w-1/2 bg-slate-100 rounded animate-pulse mb-4"></div>
        <div className="flex justify-between items-center">
            <div className="h-3 w-16 bg-slate-100 rounded animate-pulse"></div>
            <div className="h-3 w-10 bg-slate-100 rounded animate-pulse"></div>
        </div>
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

    // Props for StrategicCompass
    categories?: Category[];
    selectedLook?: string;
    setSelectedLook?: (key: any) => void;
    selectedSubLook?: string | null;
    setSelectedSubLook?: (key: string | null) => void;
    onSubCategoryClick?: (value: string, label: string) => void;
    activeQuery?: { type: string; value: string };
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
    onSearch,
    onBackToNav,
    categories,
    selectedLook,
    setSelectedLook,
    selectedSubLook,
    setSelectedSubLook,
    onSubCategoryClick,
    activeQuery
}) => {
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const [showDmcaModal, setShowDmcaModal] = useState(false);

    useEffect(() => {
        if (isSearchOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isSearchOpen]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchValue.trim() && onSearch) {
            onSearch(searchValue.trim());
        }
    };

    const clearSearch = () => {
        setSearchValue('');
        if (isSearchOpen) {
            setIsSearchOpen(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#f8f9fa]">
            {/* Header Section */}
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 z-20">
                
                {/* 1. Compass Navigation Row */}
                {categories && setSelectedLook && onSubCategoryClick && activeQuery && (
                    <div className="pt-4 pb-2">
                         <StrategicCompass
                            categories={categories}
                            selectedLook={selectedLook || ''}
                            setSelectedLook={setSelectedLook}
                            selectedSubLook={selectedSubLook || null}
                            setSelectedSubLook={setSelectedSubLook || (() => {})}
                            onSubCategoryClick={onSubCategoryClick}
                            activeQuery={activeQuery}
                        />
                    </div>
                )}

                {/* 2. Title & Search Row */}
                <div className="px-5 py-3 flex items-center justify-between h-[56px] relative overflow-hidden">
                    
                     {/* Standard Content */}
                    <div className={`flex items-center justify-between w-full transition-opacity duration-200 ${isSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                             {/* Mobile Back */}
                             <button onClick={onBackToNav} className="md:hidden p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                                <ChevronLeftIcon className="w-5 h-5"/>
                             </button>

                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-3">
                                    <h3 className="font-black text-slate-800 text-base tracking-tight truncate">{title}</h3>
                                    {!isLoading && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                            {totalItems} Items
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2.5 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
                            title="搜索"
                        >
                            <SearchIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Expandable Search Input */}
                    <div className={`absolute inset-0 bg-white flex items-center px-4 transition-transform duration-300 ease-in-out ${isSearchOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                         <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
                            <SearchIcon className="absolute left-3 w-4 h-4 text-slate-400" />
                            <input 
                                ref={inputRef}
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-xl pl-10 pr-10 py-2.5 focus:ring-2 focus:ring-slate-200 focus:bg-white focus:border-slate-300 transition-all outline-none placeholder:text-slate-400 font-medium"
                                placeholder="输入关键词搜索..."
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                onBlur={() => { if (!searchValue) setIsSearchOpen(false); }}
                            />
                            {searchValue && (
                                <button 
                                    type="button" 
                                    onClick={() => setSearchValue('')}
                                    className="absolute right-3 p-1 text-slate-400 hover:text-slate-600"
                                >
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            )}
                        </form>
                        <button 
                            onClick={clearSearch} 
                            className="ml-3 text-sm font-bold text-slate-500 hover:text-slate-800 px-2"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                         <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mb-4">
                            <CloseIcon className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-sm text-slate-600 font-bold">加载失败</p>
                        <p className="text-xs text-slate-400 mt-1">{error}</p>
                    </div>
                ) : articles.length > 0 ? (
                    <div className="pb-12">
                        {articles.map((article) => (
                            <ArticleCard
                                key={article.id}
                                article={article}
                                isActive={selectedArticleId === article.id}
                                onClick={() => onSelectArticle(article)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center p-10 text-slate-400 opacity-60">
                        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-slate-200">
                            <RssIcon className="w-10 h-10 text-slate-300" />
                        </div>
                        <p className="text-base font-bold text-slate-600">暂无相关情报</p>
                        <p className="text-xs text-slate-400 mt-2 max-w-[200px]">请尝试切换分类或搜索其他关键词</p>
                    </div>
                )}
            </div>

            {/* Footer / Pagination & DMCA */}
            <div className="flex-shrink-0 border-t border-slate-200/60 bg-white/80 backdrop-blur z-10">
                <div className="px-5 py-3 flex justify-between items-center h-[56px]">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} / {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onPageChange(currentPage - 1)} 
                            disabled={currentPage <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                            <ChevronLeftIcon className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        >
                            <ChevronRightIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
                
                {/* DMCA Trigger */}
                <div className="px-5 py-2.5 bg-slate-50 flex justify-center border-t border-slate-100">
                    <button 
                        onClick={() => setShowDmcaModal(true)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1.5 uppercase tracking-wide group"
                    >
                        <ShieldCheckIcon className="w-3 h-3 group-hover:text-indigo-500 transition-colors" />
                        版权保护投诉 (DMCA)
                    </button>
                </div>
            </div>

            {showDmcaModal && <DMCAComplaintModal onClose={() => setShowDmcaModal(false)} />}
        </div>
    );
};
