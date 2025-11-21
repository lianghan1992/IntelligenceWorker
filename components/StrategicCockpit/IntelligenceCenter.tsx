
import React from 'react';
import { InfoItem } from '../../types';
import { RssIcon, ChevronLeftIcon, ChevronRightIcon } from '../icons';

const ArticleCard: React.FC<{
    article: InfoItem;
    isActive: boolean;
    onClick: () => void;
}> = ({ article, isActive, onClick }) => (
    <div
        onClick={onClick}
        className={`
            group p-4 rounded-[16px] transition-all duration-200 cursor-pointer mb-3 border
            ${isActive 
                ? 'bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-200' 
                : 'bg-white border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200'
            }
        `}
    >
        <div className="flex justify-between items-center gap-2 mb-2">
            <span className={`
                inline-flex items-center px-2 py-0.5 text-[10px] font-medium tracking-wide rounded-md
                ${isActive ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}
            `}>
                {article.source_name}
            </span>
            <span className="text-[10px] text-gray-400">
                {new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN')}
            </span>
        </div>
        <h4 className={`font-bold text-[15px] leading-snug line-clamp-2 mb-2 ${isActive ? 'text-blue-900' : 'text-gray-900 group-hover:text-blue-700'}`}>
            {article.title}
        </h4>
        <p className={`text-xs line-clamp-2 leading-relaxed ${isActive ? 'text-blue-800/70' : 'text-gray-500'}`}>
            {article.content}
        </p>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-white p-4 rounded-[16px] border border-gray-100 mb-3 shadow-sm">
        <div className="flex justify-between mb-3">
            <div className="h-4 w-16 bg-gray-200 rounded-md animate-pulse"></div>
            <div className="h-3 w-12 bg-gray-200 rounded-md animate-pulse"></div>
        </div>
        <div className="h-5 w-full bg-gray-200 rounded-md mt-1 animate-pulse"></div>
        <div className="h-5 w-3/4 bg-gray-200 rounded-md mt-2 animate-pulse"></div>
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
    onPageChange
}) => {
    
    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="px-5 py-4 border-b border-gray-100 bg-white flex-shrink-0">
                <h3 className="font-bold text-gray-900 text-lg tracking-tight">{title}</h3>
                <p className="text-xs text-gray-500 mt-0.5">已聚合 {totalItems} 条情报</p>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-3 bg-gray-50/50 custom-scrollbar">
                {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 text-sm font-medium bg-red-50 py-2 px-4 rounded-lg inline-block">{error}</p>
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
                    <div className="flex flex-col items-center justify-center h-full text-center p-8 text-gray-400">
                        <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                            <RssIcon className="w-6 h-6 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">暂无相关情报</p>
                    </div>
                )}
            </div>

            {/* Footer / Pagination */}
            {totalItems > 0 && !isLoading && (
                <div className="flex-shrink-0 p-3 border-t border-gray-100 bg-white flex justify-between items-center">
                    <span className="text-[10px] font-medium text-gray-400">Page {currentPage} of {totalPages}</span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onPageChange(currentPage - 1)} 
                            disabled={currentPage <= 1}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 transition-colors"
                        >
                            <ChevronLeftIcon className="w-4 h-4"/>
                        </button>
                        <button 
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50 hover:text-blue-600 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-400 transition-colors"
                        >
                            <ChevronRightIcon className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
