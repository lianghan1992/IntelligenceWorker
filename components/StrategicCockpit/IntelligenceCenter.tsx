import React, { useRef, useEffect } from 'react';
import { InfoItem } from '../../types';
import { RssIcon } from '../icons';

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
        <div className="text-xs text-slate-400 mt-3 flex justify-between items-center">
            <span>{article.source_name}</span>
            <span>{new Date(article.publish_date || article.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
    </div>
);

const SkeletonCard: React.FC = () => (
    <div className="bg-white p-4 rounded-xl border-2 border-slate-200">
        <div className="h-5 w-3/4 bg-slate-200 rounded animate-pulse"></div>
        <div className="h-4 w-full bg-slate-200 rounded mt-3 animate-pulse"></div>
        <div className="h-4 w-5/6 bg-slate-200 rounded mt-2 animate-pulse"></div>
        <div className="flex justify-between mt-3">
            <div className="h-3 w-1/4 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-3 w-1/4 bg-slate-200 rounded animate-pulse"></div>
        </div>
    </div>
);

interface IntelligenceCenterProps {
    title: string;
    articles: InfoItem[];
    isLoading: boolean;
    isLoadingMore: boolean;
    error: string | null;
    selectedArticleId: string | null;
    onSelectArticle: (article: InfoItem) => void;
    onLoadMore: () => void;
    hasMore: boolean;
}

export const IntelligenceCenter: React.FC<IntelligenceCenterProps> = ({
    title,
    articles,
    isLoading,
    isLoadingMore,
    error,
    selectedArticleId,
    onSelectArticle,
    onLoadMore,
    hasMore
}) => {
    const loadMoreRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!hasMore || isLoading || isLoadingMore) return;

        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting) {
                    onLoadMore();
                }
            },
            { rootMargin: "200px" } // 在距离视口200px时触发
        );

        const currentRef = loadMoreRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [hasMore, onLoadMore, isLoading, isLoadingMore]);

    return (
        <main className="lg:col-span-6 h-full flex flex-col">
            <div className="p-4 bg-white rounded-t-xl border-b border-slate-200 shadow-sm flex-shrink-0">
                <h3 className="font-bold text-slate-800 text-lg">{title}</h3>
                <p className="text-xs text-slate-500">AI为您聚合的相关情报</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white rounded-b-xl scrollbar-hide">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)
                ) : error ? (
                    <div className="text-center py-20 text-red-500">
                        <p>加载失败: {error}</p>
                    </div>
                ) : articles.length > 0 ? (
                    <>
                        {articles.map(article => (
                            <ArticleCard
                                key={article.id}
                                article={article}
                                isActive={selectedArticleId === article.id}
                                onClick={() => onSelectArticle(article)}
                            />
                        ))}
                        {hasMore && <div ref={loadMoreRef} />}
                        {isLoadingMore && (
                            <>
                                <SkeletonCard />
                                <SkeletonCard />
                            </>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
                        <RssIcon className="w-12 h-12 text-slate-300 mb-4" />
                        <p className="font-semibold">暂无相关情报</p>
                        <p className="text-sm">请尝试选择其他视角或关注点。</p>
                    </div>
                )}
            </div>
        </main>
    );
};