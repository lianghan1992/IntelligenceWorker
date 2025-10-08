import React, { useState, useMemo } from 'react';
import { InfoItem, Subscription } from '../types';
import { DocumentTextIcon, GearIcon, ChartIcon, UsersIcon, SparklesIcon, EyeIcon } from './icons';

// --- Shared Components ---
const ModuleContainer: React.FC<{ title: string; icon: React.ReactNode; description: string; children: React.ReactNode }> = ({ title, icon, description, children }) => (
    <section className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col h-full">
        <div>
            <div className="flex items-center">
                <div className="w-8 h-8 mr-3 text-gray-500 flex-shrink-0">{icon}</div>
                <div>
                    <h2 className="text-xl font-bold text-gray-800">{title}</h2>
                    <p className="text-sm text-gray-500 -mt-1">{description}</p>
                </div>
            </div>
            <div className="mt-4 border-t border-gray-200/80 pt-4 flex-1">
                {children}
            </div>
        </div>
    </section>
);


const ArticleCard: React.FC<{ item: InfoItem; onClick: () => void; small?: boolean }> = ({ item, onClick, small = false }) => (
    <div onClick={onClick} className={`bg-gray-50/80 rounded-lg border border-gray-200/80 hover:border-blue-500 hover:bg-white hover:shadow-md transition-all duration-200 p-3 group cursor-pointer ${small ? 'text-sm' : ''}`}>
        <h4 className={`font-semibold text-gray-800 group-hover:text-blue-600 line-clamp-2 ${small ? 'text-sm' : 'text-base'}`}>{item.title}</h4>
        <div className="flex items-center text-xs text-gray-500 mt-2">
            <img 
                src={`https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`} 
                alt={item.source_name} 
                className="w-4 h-4 mr-1.5 rounded-full"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span>{item.source_name}</span>
            <span className="mx-1.5">·</span>
            <span>{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
        </div>
    </div>
);


// --- Module 1: Industry Radar ---
const IndustryRadar: React.FC<{ items: InfoItem[]; onSelectItem: (item: InfoItem) => void; }> = ({ items, onSelectItem }) => {
    const categorizedItems = useMemo(() => {
        const policy = items.filter(i => /政策|法规|标准|补贴/.test(i.title)).slice(0, 3);
        const tech = items.filter(i => /技术|专利|研发|发布/.test(i.title)).slice(0, 3);
        const market = items.filter(i => /市场|报告|销量|财报|投资/.test(i.title)).slice(0, 3);
        return { policy, tech, market };
    }, [items]);

    return (
        <ModuleContainer title="【看行业】" icon={<EyeIcon className="w-8 h-8"/>} description="把握宏观政策、前沿技术与市场脉搏">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <RadarColumn title="政策法规" icon={<DocumentTextIcon className="w-5 h-5"/>} items={categorizedItems.policy} onSelectItem={onSelectItem}/>
                <RadarColumn title="技术前沿" icon={<GearIcon className="w-5 h-5"/>} items={categorizedItems.tech} onSelectItem={onSelectItem}/>
                <RadarColumn title="市场动态" icon={<ChartIcon className="w-5 h-5"/>} items={categorizedItems.market} onSelectItem={onSelectItem}/>
            </div>
        </ModuleContainer>
    );
};

const RadarColumn: React.FC<{ title: string; icon: React.ReactNode; items: InfoItem[]; onSelectItem: (item: InfoItem) => void; }> = ({ title, icon, items, onSelectItem }) => (
    <div className="bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center text-sm font-semibold text-gray-600 mb-3">
            <div className="w-5 h-5 mr-2">{icon}</div> {title}
        </div>
        <div className="space-y-3">
            {items.length > 0 ? items.map(item => (
                <ArticleCard key={item.id} item={item} onClick={() => onSelectItem(item)} small />
            )) : <p className="text-xs text-gray-400 p-2">暂无相关情报</p>}
        </div>
    </div>
);

// --- Module 2: Competitive Landscape ---
const CompetitiveLandscape: React.FC<{ items: InfoItem[]; allSources: string[]; onSelectItem: (item: InfoItem) => void; }> = ({ items, allSources, onSelectItem }) => {
    const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(() => allSources.slice(0, 3));

    const competitorItems = useMemo(() => {
        if (selectedCompetitors.length === 0) return [];
        return items
            .filter(item => selectedCompetitors.includes(item.source_name))
            .slice(0, 10);
    }, [items, selectedCompetitors]);
    
    const toggleCompetitor = (name: string) => {
        setSelectedCompetitors(prev => 
            prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
        );
    };

    return (
        <ModuleContainer title="【看对手】" icon={<UsersIcon className="w-8 h-8"/>} description="追踪核心竞对动态，洞察其战略意图">
            <div className="flex flex-col h-full">
                <div className="mb-3 flex flex-wrap gap-2 border-b pb-3">
                    {allSources.slice(0, 8).map(source => (
                        <button key={source} onClick={() => toggleCompetitor(source)} className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${selectedCompetitors.includes(source) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                            {source}
                        </button>
                    ))}
                </div>
                <div className="space-y-3 flex-1 overflow-y-auto">
                    {competitorItems.length > 0 ? competitorItems.map(item => (
                        <ArticleCard key={item.id} item={item} onClick={() => onSelectItem(item)} small />
                    )) : <p className="text-xs text-gray-400 p-4 text-center">请选择对手以查看情报</p>}
                </div>
            </div>
        </ModuleContainer>
    );
};

// --- Module 3: Market & Opportunity Lens ---
const MarketOpportunityLens: React.FC<{ items: InfoItem[]; onSelectItem: (item: InfoItem) => void; }> = ({ items, onSelectItem }) => {
     const opportunityItems = useMemo(() => {
        return items.filter(i => /用户|痛点|反馈|建议|抱怨/.test(i.title)).slice(0, 5);
    }, [items]);
    return (
        <ModuleContainer title="【看机会】" icon={<SparklesIcon className="w-8 h-8"/>} description="聚焦终端用户声音，发现潜在市场空白">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                <div className="space-y-3">
                    {opportunityItems.length > 0 ? opportunityItems.map(item => (
                        <ArticleCard key={item.id} item={item} onClick={() => onSelectItem(item)} small />
                    )) : <p className="text-xs text-gray-400 p-2 text-center">暂未捕捉到明显信号</p>}
                </div>
                <div className="bg-gray-50/70 p-4 rounded-lg flex flex-col items-center justify-center">
                    <h4 className="font-semibold text-gray-700 mb-3 text-sm">用户热议词云 (占位符)</h4>
                    <p className="text-gray-400 text-xs text-center">此区域将展示AI分析的用户热议话题</p>
                </div>
            </div>
        </ModuleContainer>
    );
};

// --- Module 4: Self-Perception Mirror ---
const SelfPerceptionMirror: React.FC<{ items: InfoItem[]; onSelectItem: (item: InfoItem) => void; }> = ({ items, onSelectItem }) => {
    const [myCompany, setMyCompany] = useState('');
    const selfItems = useMemo(() => {
        if (!myCompany.trim()) return [];
        const companyRegex = new RegExp(myCompany.trim(), 'i');
        return items.filter(item => companyRegex.test(item.title) || companyRegex.test(item.content)).slice(0, 5);
    }, [items, myCompany]);

    return (
         <ModuleContainer title="【看自己】" icon={<EyeIcon className="w-8 h-8"/>} description="聚合外界声音，了解自身市场声誉">
            <div className="flex flex-col h-full">
                <div className="mb-3">
                    <input 
                        type="text" 
                        value={myCompany}
                        onChange={(e) => setMyCompany(e.target.value)}
                        placeholder="输入您的公司/品牌名，例如：蔚来汽车"
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                    <div className="space-y-3">
                        {selfItems.length > 0 ? selfItems.map(item => (
                            <ArticleCard key={item.id} item={item} onClick={() => onSelectItem(item)} small />
                        )) : <p className="text-xs text-gray-400 p-2 text-center">请输入公司名以查看相关情报</p>}
                    </div>
                     <div className="bg-gray-50/70 p-4 rounded-lg flex flex-col items-center justify-center">
                        <h4 className="font-semibold text-gray-700 mb-3 text-sm">声誉情感分析 (占位符)</h4>
                        <p className="text-gray-400 text-xs text-center">此区域将展示关于贵公司的情感趋势图</p>
                    </div>
                </div>
            </div>
        </ModuleContainer>
    );
};

// --- Main Component ---
interface InfoFeedProps {
    items: InfoItem[];
    onSelectItem: (item: InfoItem) => void;
    subscriptions: Subscription[];
}

export const InfoFeed: React.FC<InfoFeedProps> = ({ items, onSelectItem, subscriptions }) => {
    const allSources = useMemo(() => Array.from(new Set(subscriptions.map(s => s.source_name))), [subscriptions]);

    return (
        <main className="h-full bg-gray-50/50 p-6 overflow-y-auto">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-800">战略情报驾驶舱</h1>
                <p className="text-gray-500 mt-1">基于“五看”方法论，从战略全局视角洞察行业动态。</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <IndustryRadar items={items} onSelectItem={onSelectItem}/>
                <CompetitiveLandscape items={items} allSources={allSources} onSelectItem={onSelectItem}/>
                <MarketOpportunityLens items={items} onSelectItem={onSelectItem}/>
                <SelfPerceptionMirror items={items} onSelectItem={onSelectItem}/>
            </div>
        </main>
    );
};
