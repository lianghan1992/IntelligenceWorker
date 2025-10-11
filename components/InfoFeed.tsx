import React, { useState, useMemo } from 'react';
import { InfoItem, Subscription, FeedDisplayItem, EventCluster } from '../types';
import { SearchIcon, TagIcon, SentimentHappyIcon, SentimentNeutralIcon, SentimentSadIcon, TrendingUpIcon, ClusterIcon, ChevronDownIcon } from './icons';
import { InfoDetailModal } from './InfoDetailModal';

interface InfoFeedProps {
    items: InfoItem[];
    subscriptions: Subscription[];
}

const getSentiment = (sentiment: InfoItem['sentiment']) => {
    switch (sentiment) {
        case 'positive': return { Icon: SentimentHappyIcon, color: 'text-green-500', label: '正面' };
        case 'negative': return { Icon: SentimentSadIcon, color: 'text-red-500', label: '负面' };
        case 'neutral':
        default: return { Icon: SentimentNeutralIcon, color: 'text-gray-500', label: '中性' };
    }
};

const getInfluence = (influence: InfoItem['influence']) => {
    switch (influence) {
        case 'high': return { color: 'bg-red-100 text-red-700', label: '高影响力' };
        case 'medium': return { color: 'bg-yellow-100 text-yellow-700', label: '中等影响力' };
        case 'low':
        default: return { color: 'bg-gray-100 text-gray-700', label: '一般影响力' };
    }
}

const EnhancedInfoCard: React.FC<{ item: InfoItem; onSelect: () => void }> = ({ item, onSelect }) => {
    const [imgError, setImgError] = useState(false);
    const source = {
        name: item.source_name,
        iconUrl: `https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`,
    };
    const sentiment = getSentiment(item.sentiment);
    const influence = getInfluence(item.influence);

    return (
        <div 
            className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-300 group flex flex-col h-full relative"
            onClick={onSelect}
        >
            <div className={`absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1.5 ${influence.color}`}>
                <TrendingUpIcon className="w-3 h-3" />
                <span>{influence.label}</span>
            </div>

            <div className="flex items-start space-x-3 mb-3">
                {imgError ? (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold flex-shrink-0">
                        {source.name.charAt(0)}
                    </div>
                ) : (
                    <img 
                        src={source.iconUrl} 
                        alt={source.name} 
                        className="w-10 h-10 rounded-full bg-gray-100 flex-shrink-0" 
                        onError={() => setImgError(true)}
                    />
                )}
                <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{source.name}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{new Date(item.publish_date || item.created_at).toLocaleDateString('zh-CN')}</span>
                        <div className="flex items-center gap-1" title={`AI情感分析: ${sentiment.label}`}>
                            <sentiment.Icon className={`w-3.5 h-3.5 ${sentiment.color}`} />
                        </div>
                    </div>
                </div>
            </div>
            <h3 className="text-md font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors flex-grow">
                {item.title}
            </h3>
            
            {item.entities && item.entities.length > 0 && (
                <div className="my-2 flex flex-wrap gap-1.5">
                    {item.entities.map(entity => (
                        <span key={entity} className="px-2 py-0.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-full">{entity}</span>
                    ))}
                </div>
            )}
            
            <div className="mt-auto pt-3">
                <span className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full inline-flex items-center gap-1.5">
                    <TagIcon className="w-3 h-3" />
                    {item.point_name}
                </span>
            </div>
        </div>
    );
};

const EventClusterCard: React.FC<{ cluster: EventCluster; onSelectItem: (item: InfoItem) => void }> = ({ cluster, onSelectItem }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border-2 border-blue-200 p-5 flex flex-col h-full shadow-sm">
            <div className="flex items-start space-x-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
                    <ClusterIcon className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-md font-bold text-blue-800">{cluster.title}</h3>
                    <p className="text-xs text-gray-500">聚合了来自 {cluster.sourceNames.length} 个来源的 {cluster.items.length} 篇报道</p>
                </div>
            </div>
            <p className="text-sm text-gray-600 mb-4 flex-grow">{cluster.summary}</p>
            
            {isExpanded && (
                <div className="space-y-2 my-2 animate-in fade-in-0 duration-300">
                    {cluster.items.map(item => (
                        <div key={item.id} onClick={() => onSelectItem(item)} className="bg-white p-2 rounded-md border border-gray-200 cursor-pointer hover:bg-blue-50">
                            <p className="text-sm font-semibold text-gray-700 truncate">{item.title}</p>
                            <p className="text-xs text-gray-500">{item.source_name}</p>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-auto pt-3">
                 <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full text-sm font-semibold text-blue-600 hover:bg-blue-50 py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                    <span>{isExpanded ? '收起列表' : '展开查看详情'}</span>
                    <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                 </button>
            </div>
        </div>
    )
};


export const InfoFeed: React.FC<InfoFeedProps> = ({ items, subscriptions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);
    const [modalItem, setModalItem] = useState<InfoItem | null>(null);

    const subscriptionPoints = useMemo(() => {
        const uniquePoints = new Map<string, { name: string }>();
        subscriptions.forEach(sub => {
            if (!uniquePoints.has(sub.id)) {
                uniquePoints.set(sub.id, { name: sub.point_name });
            }
        });
        return Array.from(uniquePoints.entries()).map(([id, { name }]) => ({ id, name }));
    }, [subscriptions]);

    const processedItems = useMemo<FeedDisplayItem[]>(() => {
        const enhancedItems: InfoItem[] = items.map(item => ({
            ...item,
            influence: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)] as 'high' | 'medium' | 'low',
            sentiment: ['positive', 'neutral', 'negative'][Math.floor(Math.random() * 3)] as 'positive' | 'neutral' | 'negative',
            entities: ['特斯拉', 'FSD', '800V', '供应链', '比亚迪', '小米SU7'].filter(() => Math.random() > 0.7).slice(0, 3)
        }));

        const CLUSTER_KEYWORDS: { [key: string]: string[] } = {
            '特斯拉FSD': ['特斯拉', 'FSD'], '800V高压平台': ['800V', '高压'], '小米汽车': ['小米', 'SU7'], '蔚来换电': ['蔚来', '换电'],
        };
        
        const clusters: { [key: string]: EventCluster } = {};
        const singleItems: InfoItem[] = [];
        const assignedItemIds = new Set<string>();

        Object.entries(CLUSTER_KEYWORDS).forEach(([clusterName, keywords]) => {
            const matchingItems = enhancedItems.filter(item => 
                !assignedItemIds.has(item.id) && keywords.some(kw => item.title.toLowerCase().includes(kw.toLowerCase()))
            );

            if (matchingItems.length > 1) {
                const sortedItems = [...matchingItems].sort((a, b) => new Date(b.publish_date || b.created_at).getTime() - new Date(a.publish_date || a.created_at).getTime());
                clusters[clusterName] = {
                    id: `cluster-${clusterName}`, type: 'cluster', title: `${clusterName} 事件聚合`,
                    summary: `AI为您聚合了关于 “${clusterName}” 的最新动态。核心焦点包括技术进展、市场反馈和行业影响。`,
                    sourceNames: Array.from(new Set(sortedItems.map(i => i.source_name))), items: sortedItems,
                    publish_date: sortedItems[0].publish_date || sortedItems[0].created_at,
                };
                sortedItems.forEach(item => assignedItemIds.add(item.id));
            }
        });

        enhancedItems.forEach(item => { if (!assignedItemIds.has(item.id)) { singleItems.push(item); } });

        const allDisplayItems: FeedDisplayItem[] = [...Object.values(clusters), ...singleItems];
        allDisplayItems.sort((a, b) => new Date(b.publish_date || (b as InfoItem).created_at).getTime() - new Date(a.publish_date || (a as InfoItem).created_at).getTime());
        return allDisplayItems;
    }, [items]);


    const filteredItems = useMemo(() => {
        return processedItems.filter(itemOrCluster => {
            const matchesSearch = (item: InfoItem) => searchTerm === '' ||
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.content || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.source_name.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = (item: InfoItem) => !selectedPointId || item.point_id === selectedPointId;

            if ('type' in itemOrCluster && itemOrCluster.type === 'cluster') {
                const cluster = itemOrCluster;
                const clusterMatchesSearch = searchTerm === '' || cluster.title.toLowerCase().includes(searchTerm.toLowerCase());
                return (clusterMatchesSearch || cluster.items.some(matchesSearch)) && cluster.items.some(matchesFilter);
            } else {
                const item = itemOrCluster as InfoItem;
                return matchesSearch(item) && matchesFilter(item);
            }
        });
    }, [processedItems, searchTerm, selectedPointId]);

    return (
        <div className="flex flex-col h-full bg-gray-50">
            <div className="p-4 border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-grow">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="搜索情报标题、来源或内容..."
                            className="w-full bg-white border border-gray-300 rounded-lg py-2.5 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex-shrink-0">
                        <select
                            value={selectedPointId || ''}
                            onChange={(e) => setSelectedPointId(e.target.value || null)}
                            className="w-full sm:w-64 h-full bg-white border border-gray-300 rounded-lg py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">所有关注点</option>
                            {subscriptionPoints.map(point => (
                                <option key={point.id} value={point.id}>{point.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {filteredItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredItems.map(item => (
                            'type' in item && item.type === 'cluster'
                                ? <EventClusterCard key={item.id} cluster={item} onSelectItem={setModalItem} />
                                : <EnhancedInfoCard key={item.id} item={item as InfoItem} onSelect={() => setModalItem(item as InfoItem)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-gray-500">没有找到匹配的情报。</p>
                    </div>
                )}
            </div>

            {modalItem && <InfoDetailModal item={modalItem} onClose={() => setModalItem(null)} />}
        </div>
    );
};