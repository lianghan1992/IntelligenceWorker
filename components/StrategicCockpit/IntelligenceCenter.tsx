
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
            relative p-4 rounded-xl cursor-pointer mb-3 transition-all duration-300 group
            ${isActive 
                ? 'bg-white shadow-[0_4px_20px_-4px_rgba(79,70,229,0.15)] ring-1 ring-indigo-500/10 z-10 translate-x-1' 
                : 'bg-white shadow-sm hover:shadow-md border border-transparent hover:border-slate-100 hover:-translate-y-0.5'
            }
        `}
    >
        {/* Active Indicator Strip */}
        {isActive && (
            <div className="absolute left-0 top-3 bottom-3 w-1 bg-indigo-500 rounded-r-full"></div>
        )}
        
        {/* Title: Prefer refined_title if available */}
        <h4 className={`text-[14px] md:text-[15px] font-bold leading-snug line-clamp-2 mb-2.5 transition-colors ${isActive ? 'text-indigo-900' : 'text-slate-800 group-hover:text-indigo-700'}`}>
            {article.refined_title || article.title}
        </h4>

        {/* Metadata Row */}
        <div className="flex justify-between items-center text-xs">
            <div className="flex items-center gap-2">
                {/* Source Badge */}
                <span className={`
                    inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase border
                    ${isActive 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                        : 'bg-slate-50 text-slate-500 border-slate-100 group-hover:bg-white group-hover:border-indigo-100 group-hover:text-indigo-600 transition-colors'
                    }
                `}>
                    {article.source_name}
                </span>

                {/* Similarity Badge (Optional) */}
                {article.similarity !== undefined && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100/50">
                        <SparklesIcon className="w-2.5 h-2.5" />
                        {(article.similarity * 100).toFixed(0)}%
                    </span>
                )}
                
                {/* Refined Indicator - Updated Check */}
                {article.has_refined_content && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-600 border border-green-100/50" title="AI重构内容">
                        <ShieldCheckIcon className="w-2.5 h-2.5" />
                        AI Refined
                    </span>
                )}
            </div>

            {/* Date */}
            <span className="flex items-center gap-1 text-[10px] text-slate-400 font-medium tabular-nums">
                {new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric'})}
            </span>
        </div>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-white p-4 rounded-xl border border-slate-100 mb-3 shadow-sm">
        <div className="h-4 w-3/4 bg-slate-100 rounded animate-pulse mb-3"></div>
        <div className="h-4 w-1/2 bg-slate-100 rounded animate-pulse mb-4"></div>
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
        <div className="h-full flex flex-col bg-white">
            {/* Header Section */}
            <div className="flex-shrink-0 bg-white border-b border-slate-100 z-20">
                
                {/* 1. Compass Navigation Row */}
                {categories && setSelectedLook && onSubCategoryClick && activeQuery && (
                    <div className="pt-3 pb-1">
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
                <div className="px-4 py-2 flex items-center justify-between h-[48px] relative overflow-hidden">
                    
                     {/* Standard Content */}
                    <div className={`flex items-center justify-between w-full transition-opacity duration-200 ${isSearchOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                        <div className="flex items-center gap-3 overflow-hidden flex-1">
                             {/* Mobile Back */}
                             <button onClick={onBackToNav} className="md:hidden p-1.5 -ml-1 hover:bg-slate-50 rounded-full text-slate-500">
                                <ChevronLeftIcon className="w-5 h-5"/>
                             </button>

                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-slate-800 text-sm tracking-tight truncate">{title}</h3>
                                    {!isLoading && (
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{totalItems}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <button 
                            onClick={() => setIsSearchOpen(true)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                            title="搜索"
                        >
                            <SearchIcon className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Expandable Search Input */}
                    <div className={`absolute inset-0 bg-white flex items-center px-3 transition-transform duration-300 ease-in-out ${isSearchOpen ? 'translate-y-0' : '-translate-y-full'}`}>
                         <form onSubmit={handleSearchSubmit} className="flex-1 relative flex items-center">
                            <SearchIcon className="absolute left-3 w-3.5 h-3.5 text-slate-400" />
                            <input 
                                ref={inputRef}
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg pl-9 pr-8 py-2 focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all outline-none"
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
                                    <CloseIcon className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </form>
                        <button 
                            onClick={clearSearch} 
                            className="ml-2 text-xs font-bold text-slate-500 hover:text-slate-800 px-2"
                        >
                            取消
                        </button>
                    </div>
                </div>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-3 bg-slate-50/50 custom-scrollbar">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                         <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
                            <CloseIcon className="w-6 h-6 text-red-400" />
                        </div>
                        <p className="text-xs text-red-500 font-medium">{error}</p>
                    </div>
                ) : articles.length > 0 ? (
                    <div className="pb-10">
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
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-slate-400">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                            <RssIcon className="w-8 h-8 text-slate-200" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">暂无相关情报</p>
                        <p className="text-xs text-slate-400 mt-1">请尝试切换分类或关键词</p>
                    </div>
                )}
            </div>

            {/* Footer / Pagination & DMCA */}
            <div className="flex-shrink-0 border-t border-slate-100 bg-white z-10">
                <div className="px-4 py-2 flex justify-between items-center h-[48px]">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Page {currentPage} / {totalPages}</span>
                    <div className="flex items-center gap-1.5">
                        <button 
                            onClick={() => onPageChange(currentPage - 1)} 
                            disabled={currentPage <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 transition-all bg-white shadow-sm"
                        >
                            <ChevronLeftIcon className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-slate-400 transition-all bg-white shadow-sm"
                        >
                            <ChevronRightIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
                
                {/* DMCA Trigger */}
                <div className="px-4 py-2 bg-slate-50/50 flex justify-center border-t border-slate-50">
                    <button 
                        onClick={() => setShowDmcaModal(true)}
                        className="text-[9px] font-bold text-slate-400 hover:text-indigo-600 transition-colors flex items-center gap-1 uppercase tracking-tighter"
                    >
                        <ShieldCheckIcon className="w-3 h-3" />
                        侵权投诉与版权保护 (DMCA)
                    </button>
                </div>
            </div>

            {showDmcaModal && <DMCAComplaintModal onClose={() => setShowDmcaModal(false)} />}
        </div>
    );
};