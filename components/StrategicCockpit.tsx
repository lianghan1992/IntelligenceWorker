import React, { useState, useMemo, useEffect } from 'react';
import { InfoItem, Subscription, StrategicLookKey, InsightBriefing } from '../types';
import { LightBulbIcon, GearIcon, CloseIcon, CheckIcon, TrendingUpIcon, UsersIcon, EyeIcon, HomeIcon, ArrowLeftIcon } from './icons';
import { getArticles } from '../api';

// --- MOCK DATA ---
const mockBriefings: InsightBriefing[] = [
    { id: 'brief_ind_1', category: 'industry', title: '2024年第三季度智能座舱技术趋势分析', summary: '大模型上车与HMI交互成为核心焦点，供应商格局发生变化。', sourceArticleIds: ['art_1', 'art_2'], generatedAt: '2024-10-08T10:00:00Z' },
    { id: 'brief_ind_2', category: 'industry', title: '固态电池商业化路径及挑战', summary: '成本与量产难题仍是主要障碍，多家初创公司公布最新进展。', sourceArticleIds: ['art_3'], generatedAt: '2024-10-07T14:30:00Z' },
    { id: 'brief_cust_1', category: 'customer', title: '新能源车主充电焦虑调查报告', summary: '节假日高速公路充电桩不足问题依然严峻，用户呼吁更智能的路线规划。', sourceArticleIds: [], generatedAt: '2024-10-06T11:00:00Z' },
    { id: 'brief_comp_1', category: 'competitor', title: '特斯拉FSD V13版本路测表现深度解析', summary: '新版本在城市复杂路口处理能力显著提升，但仍存在“幽灵刹车”现象。', entities: ['特斯拉'], sourceArticleIds: [], generatedAt: '2024-10-08T09:00:00Z' },
    { id: 'brief_comp_2', category: 'competitor', title: '比亚迪新一代DM-i 5.0技术发布会要点', summary: '新混动系统在馈电油耗和静谧性方面取得突破性进展，将首搭于汉L车型。', entities: ['比亚迪'], sourceArticleIds: [], generatedAt: '2024-10-05T16:00:00Z' },
    { id: 'brief_self_1', category: 'self', title: '关于[我司]智能驾驶系统的媒体声量分析', summary: '近期媒体正面报道占70%，主要集中在AEB测试表现优异。负面声量主要来自用户对车机卡顿的抱怨。', sourceArticleIds: [], generatedAt: '2024-10-08T12:00:00Z' },
];

const mockSourceArticles: InfoItem[] = [
    { id: 'art_1', point_id: 'p1', source_name: '盖世汽车', point_name: '智能座舱', title: '高通发布第四代座舱平台，算力提升2倍', original_url: '#', publish_date: '2024-10-08', content: '高通今日发布了其第四代骁龙汽车数字座舱平台，采用了更先进的制程工艺...', created_at: '2024-10-08' },
    { id: 'art_2', point_id: 'p2', source_name: '车东西', point_name: '人机交互', title: 'Flyme Auto大模型版UI曝光，更注重自然语言交互', original_url: '#', publish_date: '2024-10-07', content: '最新的Flyme Auto系统截图显示，其深度整合了大语言模型...', created_at: '2024-10-07' },
    { id: 'art_3', point_id: 'p3', source_name: '第一电动网', point_name: '动力电池', title: '卫蓝新能源公布半固态电池量产时间表', original_url: '#', publish_date: '2024-10-06', content: '卫蓝新能源宣布，其半固态电池将于明年第二季度正式量产装车...', created_at: '2024-10-06' },
];

// --- TYPE DEFINITIONS ---
interface StrategicLook {
    key: StrategicLookKey;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    isConfigurable: boolean;
}

// --- CONFIGURATION MODALS ---
const CompetitorConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (selected: string[]) => void;
    sources: { id: string, name: string }[];
    initialSelection: string[];
}> = ({ isOpen, onClose, onSave, sources, initialSelection }) => {
    const [selectedCompetitors, setSelectedCompetitors] = useState<string[]>(initialSelection);

    const toggleSelection = (name: string) => {
        setSelectedCompetitors(prev => prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]);
    };

    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl">
                <div className="p-6 border-b flex justify-between items-center"><h3 className="text-lg font-semibold">设置关注对手</h3><button onClick={onClose}><CloseIcon className="w-6 h-6 text-gray-400" /></button></div>
                <div className="p-6">
                    <label className="font-medium text-gray-700">选择您要追踪的竞争对手 (可多选)</label>
                    <div className="mt-2 flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-gray-50 rounded-lg border">
                        {sources.map(s => (
                            <button key={s.id} onClick={() => toggleSelection(s.name)} className={`px-3 py-1.5 text-sm rounded-full border transition-colors ${selectedCompetitors.includes(s.name) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white hover:bg-gray-100'}`}>
                                {s.name}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                    <button onClick={() => { onSave(selectedCompetitors); onClose(); }} className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg">保存</button>
                </div>
            </div>
        </div>
    );
};

const SelfConfigModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string) => void;
    initialValue: string;
}> = ({ isOpen, onClose, onSave, initialValue }) => {
    const [companyName, setCompanyName] = useState(initialValue);
    if (!isOpen) return null;
    return (
         <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg relative shadow-xl">
                <div className="p-6 border-b flex justify-between items-center"><h3 className="text-lg font-semibold">设置自身信息</h3><button onClick={onClose}><CloseIcon className="w-6 h-6 text-gray-400" /></button></div>
                <div className="p-6">
                    <label htmlFor="company-name" className="font-medium text-gray-700">输入您的公司/品牌名称</label>
                    <input id="company-name" type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="例如：未来智能汽车有限公司" className="mt-2 w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="px-6 py-4 bg-gray-50 flex justify-end">
                    <button onClick={() => { onSave(companyName); onClose(); }} className="py-2 px-6 bg-blue-600 text-white font-semibold rounded-lg">保存</button>
                </div>
            </div>
        </div>
    )
}

// --- UI COMPONENTS ---
const LeftPanel: React.FC<{
    activeLook: StrategicLookKey | null;
    onSelectLook: (key: StrategicLookKey) => void;
    onConfigure: (key: StrategicLookKey) => void;
}> = ({ activeLook, onSelectLook, onConfigure }) => {
    const strategicLooks: StrategicLook[] = [
        { key: 'industry', title: '【看行业】', subtitle: '把握宏观趋势与政策脉搏', icon: <TrendingUpIcon className="w-6 h-6" />, isConfigurable: false },
        { key: 'customer', title: '【看客户】', subtitle: '洞察用户声音与市场需求', icon: <UsersIcon className="w-6 h-6" />, isConfigurable: false },
        { key: 'competitor', title: '【看对手】', subtitle: '追踪核心竞对战略与动态', icon: <EyeIcon className="w-6 h-6" />, isConfigurable: true },
        { key: 'self', title: '【看自己】', subtitle: '审视外界看法与自身声誉', icon: <HomeIcon className="w-6 h-6" />, isConfigurable: true },
        { key: 'opportunity', title: '【看机会】', subtitle: '发现跨界信号与潜在机遇', icon: <LightBulbIcon className="w-6 h-6" />, isConfigurable: false },
    ];
    return (
        <div className="w-[22%] bg-white border-r p-3 space-y-2 flex-shrink-0 h-full overflow-y-auto">
            {strategicLooks.map(look => (
                <div key={look.key} onClick={() => onSelectLook(look.key)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-200 group relative ${activeLook === look.key ? 'bg-blue-50 border-blue-300 border' : 'hover:bg-gray-50'}`}>
                    <div className="flex items-center space-x-4">
                        <div className={`p-3 rounded-lg ${activeLook === look.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>{look.icon}</div>
                        <div>
                            <h3 className="font-bold text-gray-800">{look.title}</h3>
                            <p className="text-sm text-gray-500">{look.subtitle}</p>
                        </div>
                    </div>
                    {look.isConfigurable && (
                        <button onClick={(e) => { e.stopPropagation(); onConfigure(look.key); }} className="absolute top-2 right-2 p-1.5 text-gray-400 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            <GearIcon className="w-4 h-4" />
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
};

const MiddlePanel: React.FC<{
    briefings: InsightBriefing[];
    selectedBriefingId: string | null;
    onSelectBriefing: (briefing: InsightBriefing) => void;
    isLoading: boolean;
}> = ({ briefings, selectedBriefingId, onSelectBriefing, isLoading }) => (
    <div className="w-[38%] bg-gray-50 p-4 h-full overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-800 px-2 pb-2">洞察聚合</h2>
        {isLoading && <div className="text-center p-10 text-gray-500">正在加载洞察简报...</div>}
        {!isLoading && briefings.length === 0 && <div className="text-center p-10 text-gray-500">暂无相关洞察简报。</div>}
        <div className="space-y-3">
            {briefings.map(b => (
                <div key={b.id} onClick={() => onSelectBriefing(b)}
                    className={`p-4 rounded-xl cursor-pointer transition-all border ${selectedBriefingId === b.id ? 'bg-white border-blue-500 shadow-md' : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'}`}>
                    <h3 className="font-bold text-gray-900">{b.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{b.summary}</p>
                    <div className="text-xs text-gray-400 mt-3">由 {b.sourceArticleIds.length} 条情报聚合・{new Date(b.generatedAt).toLocaleDateString()}</div>
                </div>
            ))}
        </div>
    </div>
);

const RightPanel: React.FC<{
    articles: InfoItem[];
    isLoading: boolean;
}> = ({ articles, isLoading }) => {
    const [selectedArticle, setSelectedArticle] = useState<InfoItem | null>(null);

    useEffect(() => {
        setSelectedArticle(null);
    }, [articles]);

    if (isLoading) return <div className="w-[40%] bg-white border-l p-4 h-full overflow-y-auto flex items-center justify-center text-gray-500">正在加载情报源...</div>;
    if (!articles.length) return <div className="w-[40%] bg-white border-l p-4 h-full overflow-y-auto flex items-center justify-center text-gray-500">请先在中间选择一篇洞察简报。</div>;

    return (
        <div className="w-[40%] bg-white border-l p-4 h-full overflow-y-auto">
            {selectedArticle ? (
                <div>
                    <button onClick={() => setSelectedArticle(null)} className="flex items-center gap-2 text-sm font-semibold text-blue-600 mb-4 hover:underline"><ArrowLeftIcon className="w-4 h-4" /> 返回情报列表</button>
                    <h3 className="text-lg font-bold">{selectedArticle.title}</h3>
                    <p className="text-sm text-gray-500 my-2">{selectedArticle.source_name}・{new Date(selectedArticle.publish_date).toLocaleDateString()}</p>
                    <article className="prose prose-sm max-w-none mt-4">{selectedArticle.content}</article>
                    <a href={selectedArticle.original_url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-sm text-blue-600 font-semibold hover:underline">阅读原文 →</a>
                </div>
            ) : (
                <>
                    <h2 className="text-lg font-bold text-gray-800 pb-2">情报溯源</h2>
                    <div className="space-y-3">
                        {articles.map(a => (
                            <div key={a.id} onClick={() => setSelectedArticle(a)}
                                className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 cursor-pointer">
                                <p className="font-semibold text-sm text-gray-800 line-clamp-2">{a.title}</p>
                                <p className="text-xs text-gray-500 mt-1">{a.source_name}・{new Date(a.publish_date).toLocaleDateString()}</p>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// --- MAIN COMPONENT ---
export const StrategicCockpit: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    const [activeLook, setActiveLook] = useState<StrategicLookKey | null>(null);
    const [selectedBriefing, setSelectedBriefing] = useState<InsightBriefing | null>(null);
    
    const [displayedBriefings, setDisplayedBriefings] = useState<InsightBriefing[]>([]);
    const [displayedArticles, setDisplayedArticles] = useState<InfoItem[]>([]);

    const [isLoadingBriefings, setIsLoadingBriefings] = useState(false);
    const [isLoadingArticles, setIsLoadingArticles] = useState(false);
    
    // Config states
    const [isConfigModalOpen, setConfigModalOpen] = useState<StrategicLookKey | null>(null);
    const [competitorConfig, setCompetitorConfig] = useState<string[]>([]);
    const [selfConfig, setSelfConfig] = useState('');
    
    const allSources = useMemo(() => {
        const uniqueSources = new Map<string, string>();
        subscriptions.forEach(sub => {
            if (!uniqueSources.has(sub.source_name)) {
                uniqueSources.set(sub.source_name, sub.source_id || sub.source_name);
            }
        });
        return Array.from(uniqueSources.entries()).map(([name, id]) => ({ id, name }));
    }, [subscriptions]);

    const handleSelectLook = (key: StrategicLookKey) => {
        setActiveLook(key);
        setSelectedBriefing(null);
        setDisplayedArticles([]);
        setIsLoadingBriefings(true);

        // Simulate fetching briefings
        setTimeout(() => {
            let filteredBriefings = mockBriefings.filter(b => b.category === key);
            if (key === 'competitor' && competitorConfig.length > 0) {
                 filteredBriefings = filteredBriefings.filter(b => b.entities && b.entities.some(e => competitorConfig.includes(e)));
            }
            setDisplayedBriefings(filteredBriefings);
            setIsLoadingBriefings(false);
        }, 500);
    };

    const handleSelectBriefing = (briefing: InsightBriefing) => {
        setSelectedBriefing(briefing);
        setIsLoadingArticles(true);
        // Simulate fetching articles
        setTimeout(() => {
            setDisplayedArticles(mockSourceArticles.filter(a => briefing.sourceArticleIds.includes(a.id)));
            setIsLoadingArticles(false);
        }, 500);
    };

    return (
        <div className="flex h-full overflow-hidden bg-gray-50">
            <LeftPanel 
                activeLook={activeLook}
                onSelectLook={handleSelectLook}
                onConfigure={(key) => setConfigModalOpen(key)}
            />
            <MiddlePanel 
                briefings={displayedBriefings}
                selectedBriefingId={selectedBriefing?.id || null}
                onSelectBriefing={handleSelectBriefing}
                isLoading={isLoadingBriefings}
            />
            <RightPanel 
                articles={displayedArticles}
                isLoading={isLoadingArticles}
            />
            <CompetitorConfigModal 
                isOpen={isConfigModalOpen === 'competitor'}
                onClose={() => setConfigModalOpen(null)}
                onSave={setCompetitorConfig}
                sources={allSources}
                initialSelection={competitorConfig}
            />
             <SelfConfigModal
                isOpen={isConfigModalOpen === 'self'}
                onClose={() => setConfigModalOpen(null)}
                onSave={setSelfConfig}
                initialValue={selfConfig}
            />
        </div>
    );
};