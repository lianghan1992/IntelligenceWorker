import React, { useState, useMemo, useEffect } from 'react';
import { InfoItem, Subscription } from '../types';
import { BookmarkIcon, DocumentTextIcon, CheckIcon, RssIcon } from './icons';
import { getArticles } from '../api';

const InfoCard: React.FC<{ item: InfoItem; onClick: () => void; }> = ({ item, onClick }) => {
    const sourceIconUrl = `https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`;
    const summary = item.content.length > 150 ? item.content.substring(0, 150) + '...' : item.content;
    const tags = [item.point_name].filter(Boolean); // Use point_name as a tag if it exists

    return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 hover:shadow-lg hover:border-blue-500 transition-all duration-300 group relative">
        <div onClick={onClick} className="cursor-pointer">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center flex-wrap gap-x-3 gap-y-2">
                    <img src={sourceIconUrl} alt={item.source_name} className="w-6 h-6 rounded-full bg-gray-100"/>
                    <span className="text-sm font-medium text-gray-600">{item.source_name}</span>
                    <span className="text-xs text-gray-400">{new Date(item.created_at).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
            <span className={`inline-block mb-3 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700`}>
                {`来自关注点: ${item.point_name}`}
            </span>
            <h3 className="font-semibold text-gray-800 mb-2 group-hover:text-blue-600 text-lg">{item.title}</h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{summary}</p>
            <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                    <span key={tag} className="px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 rounded-full">{tag}</span>
                ))}
            </div>
        </div>
        <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors" title="收藏">
                <BookmarkIcon className="w-4 h-4" />
            </button>
            <button className="p-2 bg-gray-100 text-gray-600 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors" title="加入报告">
                <DocumentTextIcon className="w-4 h-4" />
            </button>
        </div>
    </div>
)};

const FilterSidebar: React.FC<{
    selectedPointIds: string[];
    onPointChange: (id: string) => void;
    selectedSourceNames: string[];
    onSourceChange: (name: string) => void;
    onClearFilters: () => void;
    allPoints: Subscription[];
    allSourceNames: string[];
}> = ({ selectedPointIds, onPointChange, selectedSourceNames, onSourceChange, onClearFilters, allPoints, allSourceNames }) => {
    return (
        <aside className="w-full lg:w-72 flex-shrink-0 bg-white border-r border-gray-200 p-5">
            <div className="flex justify-between items-center mb-4">
                 <h2 className="text-lg font-semibold text-gray-800">筛选器</h2>
                 <button onClick={onClearFilters} className="text-sm text-blue-600 hover:underline">清空</button>
            </div>
           
            <div className="space-y-6">
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3">我的关注点</h3>
                    <div className="space-y-2">
                        {allPoints.map(sub => (
                            <label key={sub.id} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedPointIds.includes(sub.id)} onChange={() => onPointChange(sub.id)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-600">{sub.point_name}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="font-semibold text-gray-700 mb-3">情报来源</h3>
                    <div className="space-y-2">
                        {allSourceNames.map(source => (
                            <label key={source} className="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" checked={selectedSourceNames.includes(source)} onChange={() => onSourceChange(source)} className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                                <span className="text-sm text-gray-600">{source}</span>
                            </label>
                        ))}
                    </div>
                </div>
            </div>
        </aside>
    );
};

const TodaysOverview: React.FC<{ items: InfoItem[] }> = ({ items }) => {
    const updatedSubscriptions = useMemo(() => {
        const names = items.map(item => item.point_name).filter(Boolean);
        return new Set(names).size;
    }, [items]);

    const uniqueSources = useMemo(() => {
        const sourceNames = items.map(item => item.source_name).filter(Boolean);
        return new Set(sourceNames).size;
    }, [items]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center space-x-4">
                 <div className="bg-blue-100 text-blue-600 rounded-lg p-3">
                    <DocumentTextIcon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-800">{items.length}</p>
                    <p className="text-sm font-medium text-gray-500">当前显示情报</p>
                </div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center space-x-4">
                 <div className="bg-purple-100 text-purple-600 rounded-lg p-3">
                    <CheckIcon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-800">{updatedSubscriptions}</p>
                    <p className="text-sm font-medium text-gray-500">个关注点有动态</p>
                </div>
            </div>
             <div className="bg-white p-4 rounded-xl border border-gray-200 flex items-center space-x-4">
                 <div className="bg-green-100 text-green-600 rounded-lg p-3">
                    <RssIcon className="w-5 h-5" />
                </div>
                <div>
                    <p className="text-2xl font-bold text-gray-800">{uniqueSources}</p>
                    <p className="text-sm font-medium text-gray-500">个情报来源</p>
                </div>
            </div>
        </div>
    );
};

interface InfoFeedProps {
    items: InfoItem[];
    onSelectItem: (item: InfoItem) => void;
    subscriptions: Subscription[];
}

export const InfoFeed: React.FC<InfoFeedProps> = ({ items: initialItems, onSelectItem, subscriptions }) => {
    const [articles, setArticles] = useState<InfoItem[]>(initialItems);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string|null>(null);

    const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
    const [selectedSourceNames, setSelectedSourceNames] = useState<string[]>([]);
    
    const uniqueSourceNames = useMemo(() => Array.from(new Set(subscriptions.map(sub => sub.source_name))), [subscriptions]);

    useEffect(() => {
        const hasFilters = selectedPointIds.length > 0 || selectedSourceNames.length > 0;
        
        // Don't fetch on initial render or if filters are cleared, just use props
        if (!hasFilters) {
            setArticles(initialItems);
            return;
        }

        const fetchFilteredArticles = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const params: { page: number; limit: number; point_ids?: string[]; source_name?: string } = { page: 1, limit: 100 };
                if (selectedPointIds.length > 0) {
                    params.point_ids = selectedPointIds;
                }
                // The API only supports one source_name at a time. We'll use the first selected one.
                if (selectedSourceNames.length > 0) {
                    params.source_name = selectedSourceNames[0]; 
                }
                const data = await getArticles(params);
                setArticles(data.items);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchFilteredArticles();
    }, [selectedPointIds, selectedSourceNames, initialItems]);


    const handlePointChange = (id: string) => {
        setSelectedPointIds(prev => 
            prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
        );
    };

    const handleSourceChange = (name: string) => {
        setSelectedSourceNames(prev => 
            prev.includes(name) ? prev.filter(sourceName => sourceName !== name) : [...prev, name]
        );
    };

    const clearFilters = () => {
        setSelectedPointIds([]);
        setSelectedSourceNames([]);
    };

    const displayedArticles = useMemo(() => {
       return [...articles].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [articles]);

    return (
        <div className="flex flex-col lg:flex-row h-full">
            <FilterSidebar 
                selectedPointIds={selectedPointIds} 
                onPointChange={handlePointChange}
                selectedSourceNames={selectedSourceNames}
                onSourceChange={handleSourceChange}
                allSourceNames={uniqueSourceNames}
                onClearFilters={clearFilters}
                allPoints={subscriptions}
            />
            <main className="flex-1 p-6 bg-gray-50 overflow-y-auto">
                <TodaysOverview items={displayedArticles} />

                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        情报列表 ({displayedArticles.length} 条)
                    </h2>
                </div>
                
                {isLoading && <div className="text-center py-10">加载中...</div>}
                {error && <div className="text-center py-10 text-red-500">加载失败: {error}</div>}

                {!isLoading && !error && (
                    displayedArticles.length > 0 ? (
                        <div className="space-y-4">
                            {displayedArticles.map(item => (
                                <InfoCard key={item.id} item={item} onClick={() => onSelectItem(item)} />
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-20">
                            <p className="text-gray-500">没有找到符合条件的情报。</p>
                            <button onClick={clearFilters} className="mt-4 px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700">
                                清空筛选条件
                            </button>
                        </div>
                    )
                )}
            </main>
        </div>
    );
};