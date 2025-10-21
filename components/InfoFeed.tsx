import React, { useState, useMemo, useRef, createRef } from 'react';
import { InfoItem, Subscription } from '../types';
import { SearchIcon, SparklesIcon, ChevronLeftIcon, ChevronRightIcon, BrainIcon } from './icons';
import { InfoDetailModal } from './InfoDetailModal';

interface InfoFeedProps {
    items: InfoItem[];
    subscriptions: Subscription[];
}

// --- Sub-Components ---

const InfluenceIndicator: React.FC<{ influence: InfoItem['influence'] }> = ({ influence }) => {
    const influenceStyles = {
        high: 'bg-red-500 h-full',
        medium: 'bg-yellow-500 h-2/3',
        low: 'bg-gray-300 h-1/3',
    };
    return (
        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gray-200 rounded-l-xl overflow-hidden">
            <div className={`absolute bottom-0 w-full rounded-t-full transition-all duration-500 ${influenceStyles[influence || 'low']}`}></div>
        </div>
    );
};

const InfoCard: React.FC<{ item: InfoItem, onSelect: () => void }> = ({ item, onSelect }) => {
    return (
        <div 
            onClick={onSelect}
            className="w-72 h-40 flex-shrink-0 bg-white rounded-xl border border-gray-200 p-4 pl-6 relative cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-300 group flex flex-col"
        >
            <InfluenceIndicator influence={item.influence} />
            <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full self-start">{item.point_name}</span>
            <h4 className="text-sm font-bold text-gray-800 mt-2.5 mb-1 group-hover:text-blue-600 transition-colors line-clamp-3 flex-grow">
                {item.title}
            </h4>
            <div className="text-xs text-gray-400 mt-auto flex justify-between items-center">
                <span>{item.source_name}</span>
                <span>{new Date(item.publish_date || item.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
        </div>
    );
};

const ThematicChannel: React.FC<{
    title: string;
    summary: string;
    items: InfoItem[];
    onSelectItem: (item: InfoItem) => void;
}> = ({ title, summary, items, onSelectItem }) => {
    const scrollRef = useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const scrollAmount = direction === 'left' ? -300 : 300;
            scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    return (
        <div className="relative group">
            <div className="mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <p className="text-sm text-gray-500 mt-1">{summary}</p>
            </div>
            <div className="relative">
                <div ref={scrollRef} className="flex items-center space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                    {items.map(item => <InfoCard key={item.id} item={item} onSelect={() => onSelectItem(item)} />)}
                </div>
                <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm border rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white">
                    <ChevronLeftIcon className="w-6 h-6 text-gray-600"/>
                </button>
                <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-10 h-10 bg-white/80 backdrop-blur-sm border rounded-full shadow-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-white">
                    <ChevronRightIcon className="w-6 h-6 text-gray-600"/>
                </button>
            </div>
        </div>
    );
};

// --- Main Component ---
export const InfoFeed: React.FC<InfoFeedProps> = ({ items, subscriptions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [modalItem, setModalItem] = useState<InfoItem | null>(null);

    const enhancedItems = useMemo<InfoItem[]>(() => {
        return items.map(item => ({
            ...item,
            influence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
            sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as 'positive' | 'neutral' | 'negative',
            entities: ['特斯拉', 'FSD', '800V', '供应链', '比亚迪', '小米SU7'].sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 4))
        }));
    }, [items]);

    const dailySummary = useMemo(() => {
        const sorted = [...enhancedItems].sort((a, b) => new Date(b.publish_date || b.created_at).getTime() - new Date(a.publish_date || a.created_at).getTime());
        const topItems = sorted.slice(0, 3);
        const uniqueEntities = Array.from(new Set(topItems.flatMap(i => i.entities || [])));
        const summaryText = `今日新增 ${enhancedItems.length} 条情报。AI洞察到 ${uniqueEntities.slice(0, 2).join('、')} 等领域动态值得重点关注。`;
        return { summaryText, topItems };
    }, [enhancedItems]);

    const { channels, latestItems } = useMemo(() => {
        const CLUSTER_KEYWORDS: { [key: string]: { keywords: string[], summary: string } } = {
            '事件追踪: 小米汽车': { keywords: ['小米', 'SU7'], summary: '全面覆盖小米汽车从发布、销售到用户反馈的各类市场与产品信息。' },
            '技术前沿: 800V高压平台': { keywords: ['800V', '高压'], summary: '聚合关于800V高压架构的技术突破、供应链动态及主流车型应用情况。' },
            '竞品动态: 特斯拉 FSD': { keywords: ['特斯拉', 'FSD'], summary: '追踪特斯拉完全自动驾驶技术的最新版本更新、路测表现和市场策略。' },
            '产业链观察: 蔚来换电': { keywords: ['蔚来', '换电'], summary: '聚焦蔚来换电联盟的扩张、技术迭代与商业模式探索。' },
        };
        
        const channels: { title: string; summary: string; items: InfoItem[] }[] = [];
        const singleItems: InfoItem[] = [];
        const assignedItemIds = new Set<string>();

        Object.entries(CLUSTER_KEYWORDS).forEach(([channelName, { keywords, summary }]) => {
            const matchingItems = enhancedItems.filter(item => 
                !assignedItemIds.has(item.id) && keywords.some(kw => item.title.toLowerCase().includes(kw.toLowerCase()) || item.content?.toLowerCase().includes(kw.toLowerCase()))
            );

            if (matchingItems.length > 2) { // Only create a channel if there are enough items
                const sortedItems = [...matchingItems].sort((a, b) => new Date(b.publish_date || b.created_at).getTime() - new Date(a.publish_date || a.created_at).getTime());
                channels.push({ title: channelName, summary, items: sortedItems });
                sortedItems.forEach(item => assignedItemIds.add(item.id));
            }
        });

        enhancedItems.forEach(item => { if (!assignedItemIds.has(item.id)) { singleItems.push(item); } });
        const sortedSingleItems = singleItems.sort((a, b) => new Date(b.publish_date || b.created_at).getTime() - new Date(a.publish_date || a.created_at).getTime());

        return { channels, latestItems: sortedSingleItems };
    }, [enhancedItems]);

    const smartTags = useMemo(() => [
        { label: '高影响力', filter: (i: InfoItem) => i.influence === 'high' },
        { label: '正面情绪', filter: (i: InfoItem) => i.sentiment === 'positive' },
        { label: '负面情绪', filter: (i: InfoItem) => i.sentiment === 'negative' },
    ], []);

    const handleTagClick = (tagLabel: string) => {
        setSelectedTags(prev => prev.includes(tagLabel) ? prev.filter(t => t !== tagLabel) : [...prev, tagLabel]);
    };

    const filterItems = (itemsToFilter: InfoItem[]) => {
        return itemsToFilter.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.content || '').toLowerCase().includes(searchTerm.toLowerCase());

            const matchesTags = selectedTags.length === 0 ||
                selectedTags.every(tagLabel => {
                    const tag = smartTags.find(t => t.label === tagLabel);
                    return tag ? tag.filter(item) : true;
                });
            
            return matchesSearch && matchesTags;
        });
    };
    
    const filteredChannels = useMemo(() => {
        return channels.map(channel => ({
            ...channel,
            items: filterItems(channel.items)
        })).filter(channel => channel.items.length > 0);
    }, [channels, searchTerm, selectedTags]);

    const filteredLatestItems = useMemo(() => filterItems(latestItems), [latestItems, searchTerm, selectedTags]);

    return (
        <div className="flex flex-col h-full bg-gray-50/70 font-sans">
            <div className="p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                            placeholder="搜索情报..."
                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-blue-500" />
                        <span className="text-sm font-semibold text-gray-600">智能筛选:</span>
                        {smartTags.map(tag => (
                            <button
                                key={tag.label}
                                onClick={() => handleTagClick(tag.label)}
                                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                                    selectedTags.includes(tag.label)
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-white hover:bg-gray-100 border'
                                }`}
                            >{tag.label}</button>
                        ))}
                    </div>
                </div>
            </div>

            <main className="flex-1 overflow-y-auto p-6 space-y-10">
                <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-2xl border-2 border-blue-200 shadow-sm relative">
                    <div className="absolute top-4 right-4 text-blue-700 bg-blue-100 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-2">
                        <BrainIcon className="w-4 h-4" /> AI 每日摘要
                    </div>
                    <h2 className="text-xl font-bold text-gray-800">今日情报摘要</h2>
                    <p className="text-gray-600 mt-2 max-w-4xl">{dailySummary.summaryText}</p>
                    <div className="mt-4 flex gap-4">
                        {dailySummary.topItems.map(item => (
                            <div key={item.id} onClick={() => setModalItem(item)} className="bg-white p-3 rounded-lg border flex-1 cursor-pointer hover:border-blue-400 transition-colors">
                                <p className="text-sm font-semibold text-gray-800 line-clamp-2">{item.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{item.source_name}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {filteredChannels.map(channel => (
                    <ThematicChannel key={channel.title} {...channel} onSelectItem={setModalItem} />
                ))}

                <div>
                     <h2 className="text-2xl font-bold text-gray-800 mb-4">最新情报</h2>
                     {filteredLatestItems.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {filteredLatestItems.map(item => (
                                <div key={item.id} onClick={() => setModalItem(item)} className="h-44 bg-white rounded-xl border border-gray-200 p-4 pl-6 relative cursor-pointer hover:shadow-lg hover:border-blue-400 transition-all duration-300 group flex flex-col">
                                    <InfluenceIndicator influence={item.influence} />
                                    <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full self-start">{item.point_name}</span>
                                    <h4 className="text-sm font-bold text-gray-800 mt-2.5 mb-1 group-hover:text-blue-600 transition-colors line-clamp-3 flex-grow">{item.title}</h4>
                                    <div className="text-xs text-gray-400 mt-auto flex justify-between items-center">
                                        <span>{item.source_name}</span>
                                        <span>{new Date(item.publish_date || item.created_at).toLocaleDateString('zh-CN')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                     ) : (
                        <div className="text-center py-10 bg-white rounded-xl border border-dashed">
                            <p className="text-gray-500">根据您的筛选条件，没有找到最新的情报。</p>
                        </div>
                     )}
                </div>
            </main>

            {modalItem && <InfoDetailModal item={modalItem} allItems={enhancedItems} onClose={() => setModalItem(null)} />}
             <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
};
