import React, { useState, useMemo } from 'react';
import { InfoItem, Subscription } from '../types';
import { SearchIcon, TagIcon } from './icons';

interface InfoFeedProps {
    items: InfoItem[];
    onSelectItem: (item: InfoItem) => void;
    subscriptions: Subscription[];
}

const InfoCard: React.FC<{ item: InfoItem; onSelect: () => void }> = ({ item, onSelect }) => {
    const source = {
        name: item.source_name,
        iconUrl: `https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`,
    };

    const [imgError, setImgError] = useState(false);

    return (
        <div 
            className="bg-white rounded-xl border border-gray-200 p-5 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all duration-300 group flex flex-col h-full"
            onClick={onSelect}
        >
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
                <div>
                    <p className="font-semibold text-gray-800 text-sm">{source.name}</p>
                    <p className="text-xs text-gray-500">{new Date(item.publish_date || item.created_at).toLocaleDateString('zh-CN')}</p>
                </div>
            </div>
            <h3 className="text-md font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors flex-grow">
                {item.title}
            </h3>
            <div className="mt-auto pt-3">
                <span className="px-2.5 py-1 text-xs font-medium text-blue-800 bg-blue-100 rounded-full inline-flex items-center gap-1.5">
                    <TagIcon className="w-3 h-3" />
                    {item.point_name}
                </span>
            </div>
        </div>
    );
};


export const InfoFeed: React.FC<InfoFeedProps> = ({ items, onSelectItem, subscriptions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPointId, setSelectedPointId] = useState<string | null>(null);

    const subscriptionPoints = useMemo(() => {
        const uniquePoints = new Map<string, { name: string }>();
        subscriptions.forEach(sub => {
            if (!uniquePoints.has(sub.id)) {
                uniquePoints.set(sub.id, { name: sub.point_name });
            }
        });
        return Array.from(uniquePoints.entries()).map(([id, { name }]) => ({ id, name }));
    }, [subscriptions]);

    const filteredItems = useMemo(() => {
        return items.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.source_name.toLowerCase().includes(searchTerm.toLowerCase());
            
            const matchesFilter = !selectedPointId || item.point_id === selectedPointId;
            
            return matchesSearch && matchesFilter;
        });
    }, [items, searchTerm, selectedPointId]);

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
                            <InfoCard key={item.id} item={item} onSelect={() => onSelectItem(item)} />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20">
                        <p className="text-gray-500">没有找到匹配的情报。</p>
                    </div>
                )}
            </div>
        </div>
    );
};
