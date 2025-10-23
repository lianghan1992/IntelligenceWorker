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
        className={`bg-white p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
            isActive 
                ? 'border-blue-500 shadow-md' 
                : 'border-slate-200 hover:shadow-md hover:border-slate-300'
        }`}
    >
        <h4 className="font-bold text-slate-800 group-hover:text-blue-600 text-base">{article.title}</h4>
        <p className="text-sm text-slate-600 mt-2 line-clamp-2">{article.content}</p>
        <div className="mt-3 flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md">
                {article.source_name}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-md">
                {new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN')}
            </span>
        </div>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
        <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-4 w-full bg-slate-200 rounded mt-3 animate-pulse"></div>
        <div className="h-4 w-5/6 bg-slate-200 rounded mt-2 animate-pulse"></div>
        <div className="flex items-center space-x-2 mt-3">
            <div className="h-5 w-1/4 bg-slate-200 rounded-md animate-pulse"></div>
            <div className="h-5 w-1/4 bg-slate-200 rounded-md animate-pulse"></div>
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
        <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex-shrink-0">
                <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                <p className="text-xs text-slate-500">AI为您聚合的相关情报</p>
            </div>

            {/* Content List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                ) : error ? (
                    <div className="text-center py-20 text-red-500">
                        <p>加载失败: {error}</p>
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
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                        <RssIcon className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="font-semibold">暂无相关情报</p>
                        <p className="text-sm">请尝试选择其他视角或关注点。</p>
                    </div>
                )}
            </div>

            {/* Footer / Pagination */}
            {totalItems > 0 && !isLoading && (
                <div className="flex-shrink-0 p-3 border-t border-slate-200 flex justify-between items-center text-sm">
                    <span className="text-slate-600 font-medium">共 {totalItems} 条</span>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onPageChange(currentPage - 1)} 
                            disabled={currentPage <= 1}
                            className="p-1.5 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronLeftIcon className="w-4 h-4 text-slate-600"/>
                        </button>
                        <span className="text-slate-600">
                            第 {currentPage} / {totalPages} 页
                        </span>
                        <button 
                            onClick={() => onPageChange(currentPage + 1)}
                            disabled={currentPage >= totalPages}
                            className="p-1.5 rounded-md border bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ChevronRightIcon className="w-4 h-4 text-slate-600"/>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
