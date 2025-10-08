import React, { useState, useMemo } from 'react';
import { InfoItem, Subscription } from '../types';
import { DocumentTextIcon, GearIcon, ChartIcon, UsersIcon, SparklesIcon, BellIcon, ArrowUpTrayIcon, EyeIcon } from './icons';

// --- Shared Components ---
const ModuleContainer: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
    <section>
        <div className="flex items-center mb-4">
            <div className="w-6 h-6 mr-2 text-gray-500">{icon}</div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            {children}
        </div>
    </section>
);

const ArticleCard: React.FC<{ item: InfoItem; onAddToBriefing: (item: InfoItem) => void; onClick: () => void; small?: boolean }> = ({ item, onAddToBriefing, onClick, small = false }) => (
    <div className={`bg-white rounded-lg border border-gray-200 hover:border-blue-500 hover:shadow-md transition-all duration-200 p-3 group ${small ? 'text-sm' : ''}`}>
        <div onClick={onClick} className="cursor-pointer">
            <h4 className={`font-semibold text-gray-800 group-hover:text-blue-600 line-clamp-2 ${small ? 'text-sm' : 'text-base'}`}>{item.title}</h4>
            <div className="flex items-center text-xs text-gray-500 mt-2">
                <img src={`https://logo.clearbit.com/${item.source_name.replace(/ /g, '').toLowerCase()}.com`} alt={item.source_name} className="w-4 h-4 mr-1.5 rounded-full"/>
                <span>{item.source_name}</span>
                <span className="mx-1.5">·</span>
                <span>{new Date(item.created_at).toLocaleDateString('zh-CN')}</span>
            </div>
        </div>
        <button onClick={() => onAddToBriefing(item)} className="absolute top-2 right-2 p-1.5 bg-gray-100 rounded-full text-gray-500 hover:bg-blue-100 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" title="加入简报">
            <ArrowUpTrayIcon className="w-4 h-4"/>
        </button>
    </div>
);

// --- Module 1: Industry Radar ---
const IndustryRadar: React.FC<{ items: InfoItem[]; onAddToBriefing: (item: InfoItem) => void; onSelectItem: (item: InfoItem) => void; }> = ({ items, onAddToBriefing, onSelectItem }) => {
    const categorizedItems = useMemo(() => {
        const policy = items.filter(i => /政策|法规|标准|补贴/.test(i.title)).slice(0, 3);
        const tech = items.filter(i => /技术|专利|研发|发布/.test(i.title)).slice(0, 3);
        const market = items.filter(i => /市场|报告|销量|财报|投资/.test(i.title)).slice(0, 3);
        return { policy, tech, market };
    }, [items]);

    return (
        <ModuleContainer title="【看行业】宏观态势雷达" icon={<EyeIcon />}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RadarColumn title="政策法规" icon={<DocumentTextIcon className="w-5 h-5"/>} items={categorizedItems.policy} onAddToBriefing={onAddToBriefing} onSelectItem={onSelectItem}/>
                <RadarColumn title="技术前沿" icon={<GearIcon className="w-5 h-5"/>} items={categorizedItems.tech} onAddToBriefing={onAddToBriefing} onSelectItem={onSelectItem}/>
                <RadarColumn title="市场动态" icon={<ChartIcon className="w-5 h-5"/>} items={categorizedItems.market} onAddToBriefing={onAddToBriefing} onSelectItem={onSelectItem}/>
            </div>
        </ModuleContainer>
    );
};

const RadarColumn: React.FC<{ title: string; icon: React.ReactNode; items: InfoItem[]; onAddToBriefing: (item: InfoItem) => void; onSelectItem: (item: InfoItem) => void; }> = ({ title, icon, items, onAddToBriefing, onSelectItem }) => (
    <div className="bg-gray-50 p-3 rounded-lg">
        <div className="flex items-center text-sm font-semibold text-gray-600 mb-3">
            <div className="w-5 h-5 mr-2">{icon}</div> {title}
        </div>
        <div className="space-y-3">
            {items.length > 0 ? items.map(item => (
                <ArticleCard key={item.id} item={item} onAddToBriefing={onAddToBriefing} onClick={() => onSelectItem(item)} small />
            )) : <p className="text-xs text-gray-400 p-2">暂无相关情报</p>}
        </div>
    </div>
);

// --- Module 2: Competitive Landscape ---
const CompetitiveLandscape: React.FC<{ items: InfoItem[]; allSources: string[]; onAddToBriefing: (item: InfoItem) => void; onSelectItem: (item: InfoItem) => void; }> = ({ items, allSources, onAddToBriefing, onSelectItem }) => {
    const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(() => allSources.slice(0, 4));

    const competitorData = useMemo(() => {
        return selectedCompetitors.map(competitor => ({
            name: competitor,
            items: items.filter(item => item.source_name === competitor).slice(0, 5)
        }));
    }, [items, selectedCompetitors]);
    
    const toggleCompetitor = (name: string) => {
        setSelectedCompetitors(prev => 
            prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
        );
    };

    return (
        <ModuleContainer title="【看对手】竞争格局看板" icon={<UsersIcon />}>
            <div className="mb-4 flex flex-wrap gap-2 border-b pb-4">
                {allSources.map(source => (
                    <button key={source} onClick={() => toggleCompetitor(source)} className={`px-3 py-1 text-sm font-medium rounded-full transition-colors ${selectedCompetitors.includes(source) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {source}
                    </button>
                ))}
            </div>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${Math.max(selectedCompetitors.length, 1)} gap-4`}>
                {competitorData.map(col => (
                    <div key={col.name} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center mb-3">
                             <img src={`https://logo.clearbit.com/${col.name.replace(/ /g, '').toLowerCase()}.com`} alt={col.name} className="w-5 h-5 mr-2 rounded-full"/>
                            <h4 className="font-semibold text-gray-700">{col.name}</h4>
                        </div>
                        <div className="space-y-3">
                            {col.items.length > 0 ? col.items.map(item => (
                                <ArticleCard key={item.id} item={item} onAddToBriefing={onAddToBriefing} onClick={() => onSelectItem(item)} small />
                            )) : <p className="text-xs text-gray-400 p-2">暂无相关情报</p>}
                        </div>
                    </div>
                ))}
            </div>
        </ModuleContainer>
    );
};

// --- Module 3: Market & Opportunity Lens ---
const MarketOpportunityLens: React.FC<{ items: InfoItem[]; onAddToBriefing: (item: InfoItem) => void; onSelectItem: (item: InfoItem) => void; }> = ({ items, onAddToBriefing, onSelectItem }) => {
     const opportunityItems = useMemo(() => {
        return items.filter(i => /用户|痛点|反馈|建议|抱怨/.test(i.title)).slice(0, 5);
    }, [items]);
    return (
        <ModuleContainer title="【看客户/看机会】市场机遇透镜" icon={<SparklesIcon />}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-gray-700 mb-3">潜在机遇信号</h4>
                     <div className="space-y-3">
                        {opportunityItems.length > 0 ? opportunityItems.map(item => (
                            <ArticleCard key={item.id} item={item} onAddToBriefing={onAddToBriefing} onClick={() => onSelectItem(item)} small />
                        )) : <p className="text-xs text-gray-400 p-2">暂未捕捉到明显信号</p>}
                    </div>
                </div>
                <div className="bg-gray-50/70 p-4 rounded-lg flex flex-col items-center justify-center">
                    <h4 className="font-semibold text-gray-700 mb-3">用户热议词云 (占位符)</h4>
                    <p className="text-gray-400 text-sm">此区域将展示AI分析的用户热议话题</p>
                </div>
            </div>
        </ModuleContainer>
    );
};

// --- Module 4: Self-Perception Mirror ---
const SelfPerceptionMirror: React.FC<{ items: InfoItem[]; onAddToBriefing: (item: InfoItem) => void; onSelectItem: (item: InfoItem) => void; }> = ({ items, onAddToBriefing, onSelectItem }) => {
    const [myCompany, setMyCompany] = useState('');
    const selfItems = useMemo(() => {
        if (!myCompany.trim()) return [];
        const companyRegex = new RegExp(myCompany.trim(), 'i');
        return items.filter(item => companyRegex.test(item.title) || companyRegex.test(item.content)).slice(0, 5);
    }, [items, myCompany]);

    return (
         <ModuleContainer title="【看自己】自我审视镜" icon={<EyeIcon />}>
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">输入您的公司/品牌名</label>
                <input 
                    type="text" 
                    value={myCompany}
                    onChange={(e) => setMyCompany(e.target.value)}
                    placeholder="例如：蔚来汽车"
                    className="w-full max-w-sm bg-gray-50 border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-gray-700 mb-3">相关情报动态</h4>
                     <div className="space-y-3">
                        {selfItems.length > 0 ? selfItems.map(item => (
                            <ArticleCard key={item.id} item={item} onAddToBriefing={onAddToBriefing} onClick={() => onSelectItem(item)} small />
                        )) : <p className="text-xs text-gray-400 p-2">请输入公司名以查看相关情报</p>}
                    </div>
                </div>
                 <div className="bg-gray-50/70 p-4 rounded-lg flex flex-col items-center justify-center">
                    <h4 className="font-semibold text-gray-700 mb-3">声誉情感分析 (占位符)</h4>
                    <p className="text-gray-400 text-sm">此区域将展示关于贵公司的情感趋势图</p>
                </div>
            </div>
        </ModuleContainer>
    );
};

// --- Sidebar: AI Strategy Advisor ---
const StrategyAdvisorSidebar: React.FC<{ briefingItems: InfoItem[]; onClearBriefing: () => void; }> = ({ briefingItems, onClearBriefing }) => {
    return (
        <div className="h-full flex flex-col">
            <div className="p-4 border-b">
                <h3 className="text-lg font-bold text-gray-800 flex items-center"><SparklesIcon className="w-5 h-5 mr-2 text-blue-600"/>AI 决策参谋</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Daily Briefing */}
                <div className="bg-gray-100 p-3 rounded-lg">
                    <h4 className="font-semibold text-gray-700 text-sm mb-2">今日情报概要</h4>
                    <p className="text-xs text-gray-600">AI 摘要 (占位符): 行业技术动态显示，固态电池研发进程加速。主要竞争对手A发布了新款车型，市场反馈积极...</p>
                </div>
                {/* Smart Alerts */}
                <div>
                    <h4 className="font-semibold text-gray-700 text-sm mb-2">智能预警</h4>
                    <ul className="space-y-2">
                        <li className="text-xs text-gray-600 bg-red-50 border border-red-200 p-2 rounded-lg"><span className="font-bold text-red-700">[风险]</span> 检测到主要竞争对手发布相关技术专利。</li>
                        <li className="text-xs text-gray-600 bg-green-50 border border-green-200 p-2 rounded-lg"><span className="font-bold text-green-700">[机会]</span> “车载冰箱制冷效果”成为用户热议话题。</li>
                    </ul>
                </div>
                {/* Briefing Generation */}
                <div>
                    <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold text-gray-700 text-sm">决策简报</h4>
                        {briefingItems.length > 0 && <button onClick={onClearBriefing} className="text-xs text-blue-600 hover:underline">清空</button>}
                    </div>
                    <div className="bg-gray-100 p-3 rounded-lg min-h-[100px]">
                        {briefingItems.length > 0 ? (
                            <ul className="space-y-1.5">
                                {briefingItems.map(item => (
                                    <li key={item.id} className="text-xs text-gray-800 truncate">
                                        - {item.title}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-xs text-gray-400 text-center pt-5">点击情报卡片上的<ArrowUpTrayIcon className="w-3 h-3 inline-block mx-1"/>按钮添加</p>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-4 border-t">
                <button 
                    disabled={briefingItems.length === 0}
                    className="w-full py-2.5 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition"
                    onClick={() => alert('AI报告生成功能即将上线！')}
                >
                    一键生成简报
                </button>
            </div>
        </div>
    );
};

// --- Main Component ---
interface InfoFeedProps {
    items: InfoItem[];
    onSelectItem: (item: InfoItem) => void;
    subscriptions: Subscription[];
}

export const InfoFeed: React.FC<InfoFeedProps> = ({ items, onSelectItem, subscriptions }) => {
    const [briefingItems, setBriefingItems] = useState<InfoItem[]>([]);
    
    const allSources = useMemo(() => Array.from(new Set(subscriptions.map(s => s.source_name))), [subscriptions]);

    const handleAddToBriefing = (item: InfoItem) => {
        setBriefingItems(prev => {
            if (prev.find(i => i.id === item.id)) return prev;
            return [...prev, item];
        });
    };

    return (
        <div className="flex h-full bg-gray-50/50">
            <main className="flex-1 overflow-y-auto p-6 space-y-8">
                <IndustryRadar items={items} onAddToBriefing={handleAddToBriefing} onSelectItem={onSelectItem}/>
                <CompetitiveLandscape items={items} allSources={allSources} onAddToBriefing={handleAddToBriefing} onSelectItem={onSelectItem}/>
                <MarketOpportunityLens items={items} onAddToBriefing={handleAddToBriefing} onSelectItem={onSelectItem}/>
                <SelfPerceptionMirror items={items} onAddToBriefing={handleAddToBriefing} onSelectItem={onSelectItem}/>
            </main>
            <aside className="w-80 flex-shrink-0 border-l border-gray-200 bg-white shadow-sm">
                <StrategyAdvisorSidebar briefingItems={briefingItems} onClearBriefing={() => setBriefingItems([])} />
            </aside>
        </div>
    );
};