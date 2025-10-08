import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Subscription, RecommendedSubscription, SystemSource } from '../types';
import { mockRecommendedSubscriptions } from '../mockData';
import { getSources } from '../api';
import { DashboardWidgets } from './DashboardWidgets';
import { PlusIcon, BookmarkIcon, ChevronLeftIcon, ChevronRightIcon, DocumentTextIcon, UsersIcon } from './icons';

interface IntelligenceSubscriptionManagerProps {
    subscriptions: Subscription[];
}

const IntelligenceSubscriptionManager: React.FC<IntelligenceSubscriptionManagerProps> = ({ subscriptions }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [canScroll, setCanScroll] = React.useState({ left: false, right: false });

    const checkScrollability = useCallback(() => {
        const el = scrollContainerRef.current;
        if (el) {
            const hasOverflow = el.scrollWidth > el.clientWidth;
            setCanScroll({
                left: hasOverflow && el.scrollLeft > 0,
                right: hasOverflow && el.scrollLeft < el.scrollWidth - el.clientWidth - 1,
            });
        }
    }, []);

    useEffect(() => {
        const el = scrollContainerRef.current;
        checkScrollability();
        window.addEventListener('resize', checkScrollability);
        el?.addEventListener('scroll', checkScrollability);
        return () => {
            window.removeEventListener('resize', checkScrollability);
            el?.removeEventListener('scroll', checkScrollability);
        };
    }, [subscriptions, checkScrollability]);
    
    const handleScroll = (direction: 'left' | 'right') => {
        const el = scrollContainerRef.current;
        if (el) {
            const scrollAmount = el.clientWidth * 0.8;
            el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
        }
    };

    const SubscriptionCard: React.FC<{ sub: Subscription }> = ({ sub }) => (
        <div 
            className="relative bg-white p-4 rounded-xl border border-gray-200 flex flex-col h-40 hover:shadow-md hover:border-blue-400 transition-all cursor-pointer group w-64 flex-shrink-0 snap-start"
            title={`URL: ${sub.point_url}`}
        >
            {sub.newItemsCount !== undefined && (
                <div className={`absolute top-2.5 right-2.5 text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center ring-2 ring-white ${sub.newItemsCount > 0 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {sub.newItemsCount}
                </div>
            )}
            
            <div className="flex-grow">
                 <div className="flex items-start">
                    <BookmarkIcon className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                    <h4 className="font-semibold text-gray-800 group-hover:text-blue-600 line-clamp-2 text-base h-12">{sub.point_name}</h4>
                </div>
            </div>
           
            <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-gray-100">
                {sub.keywords.map(kw => (
                    <span key={kw} className="px-2 py-0.5 text-xs font-medium text-purple-700 bg-purple-100 rounded-full">{kw}</span>
                ))}
            </div>
        </div>
    );
    
    return (
        <div className="relative group">
            <div 
                ref={scrollContainerRef}
                className="flex items-stretch gap-4 pb-4 overflow-x-auto snap-x snap-mandatory scroll-smooth"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {subscriptions.map(sub => <SubscriptionCard key={sub.id} sub={sub} />)}
                <style>{`
                    .overflow-x-auto::-webkit-scrollbar {
                        display: none;
                    }
                `}</style>
            </div>
             {canScroll.left && (
                <button
                    onClick={() => handleScroll('left')}
                    className="absolute top-1/2 -translate-y-1/2 -left-4 w-9 h-9 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    aria-label="Scroll left"
                >
                    <ChevronLeftIcon className="w-5 h-5 text-gray-700" />
                </button>
            )}
            {canScroll.right && (
                <button
                    onClick={() => handleScroll('right')}
                    className="absolute top-1/2 -translate-y-1/2 -right-4 w-9 h-9 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-opacity opacity-0 group-hover:opacity-100 disabled:opacity-0"
                    aria-label="Scroll right"
                >
                    <ChevronRightIcon className="w-5 h-5 text-gray-700" />
                </button>
            )}
        </div>
    );
};

const RecommendedSubscriptionCard: React.FC<{ sub: RecommendedSubscription }> = ({ sub }) => {
    const [isAdded, setIsAdded] = React.useState(false);
    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col h-full group transition-all hover:shadow-md hover:border-blue-400">
             <div className="flex-grow">
                <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800 pr-2">{sub.title}</h4>
                    <button
                        onClick={() => setIsAdded(true)}
                        disabled={isAdded}
                        className="flex-shrink-0 px-3 py-1 text-xs font-semibold rounded-full transition-colors disabled:bg-green-100 disabled:text-green-800 bg-blue-50 text-blue-700 hover:bg-blue-100"
                    >
                        {isAdded ? "已添加" : "添加"}
                    </button>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{sub.description}</p>
             </div>
             <div className="mt-2 flex flex-wrap gap-1.5 pt-3 border-t border-gray-100">
                {sub.keywords.map(kw => (
                    <span key={kw} className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">{kw}</span>
                ))}
            </div>
        </div>
    );
};

const SystemSourceCard: React.FC<{ source: SystemSource }> = ({ source }) => {
    const [isAdded, setIsAdded] = React.useState(false);

    return (
        <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col h-full transition-all hover:shadow-md hover:border-blue-400 group">
            <div className="flex items-start gap-3 mb-2">
                <img src={source.iconUrl} alt={source.name} className="w-10 h-10 rounded-md flex-shrink-0" />
                <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-800 truncate">{source.name}</h4>
                    <p className="text-xs text-gray-500">{source.category}</p>
                </div>
            </div>

            <p className="text-sm text-gray-600 line-clamp-2 mb-3 flex-grow">{source.description}</p>
            
            <div className="flex justify-between items-center text-xs text-gray-500 mb-3 gap-2">
                <div className="flex items-center gap-1" title={`${source.infoCount?.toLocaleString('zh-CN')}条情报`}>
                    <DocumentTextIcon className="w-4 h-4 text-gray-400" />
                    <span>{source.infoCount?.toLocaleString('zh-CN', { notation: 'compact' }) || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-1" title={`${source.subscriberCount?.toLocaleString('zh-CN')}人订阅`}>
                    <UsersIcon className="w-4 h-4 text-gray-400" />
                    <span>{source.subscriberCount?.toLocaleString('zh-CN', { notation: 'compact' }) || 'N/A'}</span>
                </div>
            </div>

            <button 
                onClick={() => setIsAdded(!isAdded)} 
                className={`w-full py-2 text-sm font-semibold rounded-lg transition-colors ${
                    isAdded 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
            >
                {isAdded ? '✓ 已添加' : '+ 订阅'}
            </button>
        </div>
    );
}

interface DashboardProps {
    subscriptions: Subscription[];
    onAddSubscription: () => void;
    onAddSource: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ subscriptions, onAddSubscription, onAddSource }) => {
    const [systemSources, setSystemSources] = useState<SystemSource[]>([]);
    const [isLoadingSources, setIsLoadingSources] = useState(true);

    useEffect(() => {
        const fetchSources = async () => {
            try {
                setIsLoadingSources(true);
                const sources = await getSources();
                setSystemSources(sources);
            } catch (error) {
                console.error("Failed to fetch system sources:", error);
            } finally {
                setIsLoadingSources(false);
            }
        };
        fetchSources();
    }, []);

    return (
        <div className="p-6 space-y-8">
            <DashboardWidgets />

            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">我的关注点</h2>
                    <button onClick={onAddSubscription} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                        <PlusIcon className="w-4 h-4"/> 添加关注点
                    </button>
                 </div>
                <IntelligenceSubscriptionManager subscriptions={subscriptions} />
            </div>

            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">推荐关注点</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {mockRecommendedSubscriptions.map(sub => <RecommendedSubscriptionCard key={sub.id} sub={sub} />)}
                </div>
            </div>

            <div>
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold text-gray-800">情报源订阅</h2>
                    <button onClick={onAddSource} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 text-sm text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                        <PlusIcon className="w-4 h-4"/> 添加自定义源
                    </button>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                     {isLoadingSources 
                        ? <p className="col-span-full text-center p-4">加载情报源...</p> 
                        : systemSources.map(source => <SystemSourceCard key={source.id} source={source} />)
                    }
                 </div>
            </div>

        </div>
    );
};