import React, { useState, useMemo, useEffect } from 'react';
import { Subscription, StrategicLookKey, InsightBriefing, InfoItem } from '../types';
import { LightBulbIcon, UsersIcon, EyeIcon, TrendingUpIcon, GearIcon } from './icons';

// --- Mock Data ---
const mockBriefings: InsightBriefing[] = [
    {
        id: 'brief-1',
        title: '新能源汽车800V高压平台渗透率预测与产业链分析',
        summary: '预计到2025年，800V高压平台在新发布车型中的渗透率将达到35%，主要由高端品牌引领，成本下降将推动其向中端市场普及。核心供应商包括英飞凌、博世等。',
        category: 'industry',
        sourceArticleIds: ['art-1', 'art-2', 'art-8'],
        generatedAt: new Date(Date.now() - 86400000).toISOString(),
    },
    {
        id: 'brief-2',
        title: '特斯拉FSD V12.4核心技术更新与路测表现解读',
        summary: 'V12.4版本在端到端模型上引入了新的神经网络架构，显著提升了城市复杂路口的无保护左转成功率，但对极端天气场景的处理仍有待观察。',
        category: 'competitor',
        entities: ['Tesla'],
        sourceArticleIds: ['art-3'],
        generatedAt: new Date().toISOString(),
    },
    {
        id: 'brief-3',
        title: '蔚来换电联盟最新动态及商业模式分析',
        summary: '蔚来近期与多家主机厂达成换电合作协议，旨在扩大其能源网络覆盖范围，建立行业标准，但面临资产过重和盈利模式的挑战。',
        category: 'competitor',
        entities: ['NIO'],
        sourceArticleIds: ['art-4', 'art-5'],
        generatedAt: new Date(Date.now() - 172800000).toISOString(),
    },
     {
        id: 'brief-4',
        title: '用户对于车载智能座舱大屏的需求趋势与痛点分析',
        summary: '调研显示，用户对大屏的需求已从“尺寸”转向“生态和交互体验”，对内置应用丰富度、语音助手智能程度的关注度显著提升。当前主要痛点包括应用闪退、车机卡顿等。',
        category: 'customer',
        sourceArticleIds: ['art-6'],
        generatedAt: new Date(Date.now() - 259200000).toISOString(),
    },
    {
        id: 'brief-5',
        title: '自动驾驶卡车商业化落地新机遇：干线物流场景',
        summary: '随着“干线物流”场景法规的逐步明确，以及L4级技术在限定区域的成熟，自动驾驶卡车在港口、矿山等封闭场景的商业化落地正在加速。',
        // FIX: The category 'opportunity' is not valid for 'StrategicLookKey'. Changed to 'industry' as it relates to industry trends.
        category: 'industry',
        sourceArticleIds: ['art-7'],
        generatedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    }
];

const mockSourceArticles: InfoItem[] = [
    { id: 'art-1', title: '800V高压快充技术白皮书', source_name: '盖世汽车', publish_date: '2023-10-01', content: '...', point_id: 'p1', point_name: '高压平台', original_url: '#', created_at: '' },
    { id: 'art-2', title: '成本下降推动800V平台普及', source_name: '第一电动网', publish_date: '2023-09-28', content: '...', point_id: 'p1', point_name: '高压平台', original_url: '#', created_at: '' },
    { id: 'art-3', title: '深度解读特斯拉FSD v12.4', source_name: '智能车参考', publish_date: '2023-10-02', content: '...', point_id: 'p2', point_name: '自动驾驶', original_url: '#', created_at: '' },
    { id: 'art-4', title: '蔚来与吉利达成换电合作', source_name: '蔚来官方', publish_date: '2023-09-30', content: '...', point_id: 'p3', point_name: '能源网络', original_url: '#', created_at: '' },
    { id: 'art-5', title: '换电模式的经济学分析', source_name: '财经杂志', publish_date: '2023-09-25', content: '...', point_id: 'p3', point_name: '能源网络', original_url: '#', created_at: '' },
    { id: 'art-6', title: '智能座舱用户体验调研报告', source_name: 'J.D. Power', publish_date: '2023-09-20', content: '...', point_id: 'p4', point_name: '智能座舱', original_url: '#', created_at: '' },
    { id: 'art-7', title: '干线物流自动驾驶政策解读', source_name: '交通运输部', publish_date: '2023-09-15', content: '...', point_id: 'p5', point_name: '商用车', original_url: '#', created_at: '' },
    { id: 'art-8', title: '碳化硅（SiC）在800V平台中的应用', source_name: '半导体行业观察', publish_date: '2023-09-22', content: '...', point_id: 'p1', point_name: '高压平台', original_url: '#', created_at: '' },
];


// --- Components ---

const LookCategoryCard: React.FC<{
    look: { key: StrategicLookKey; label: string; icon: React.FC<any>; description: string };
    isActive: boolean;
    onClick: () => void;
    onSettingsClick: (e: React.MouseEvent) => void;
    hasSettings: boolean;
}> = ({ look, isActive, onClick, onSettingsClick, hasSettings }) => (
    <div
        onClick={onClick}
        className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer relative group ${
            isActive 
                ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300'
        }`}
    >
        <div className="flex items-center space-x-4">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-100'}`}>
                <look.icon className={`w-6 h-6 ${isActive ? 'text-white' : 'text-slate-600'}`} />
            </div>
            <div>
                <h3 className="font-bold">{look.label}</h3>
                <p className={`text-xs ${isActive ? 'text-blue-100' : 'text-slate-500'}`}>{look.description}</p>
            </div>
        </div>
        {hasSettings && (
            <button
                onClick={onSettingsClick}
                className={`absolute top-2 right-2 p-1.5 rounded-full transition-colors ${
                    isActive ? 'text-blue-100 hover:bg-white/20' : 'text-slate-400 hover:bg-slate-200'
                }`}
                aria-label={`设置 ${look.label}`}
            >
                <GearIcon className="w-4 h-4" />
            </button>
        )}
    </div>
);

const InsightBriefingCard: React.FC<{
    briefing: InsightBriefing;
    isActive: boolean;
    onClick: () => void;
}> = ({ briefing, isActive, onClick }) => (
    <div
        onClick={onClick}
        className={`bg-white p-5 rounded-xl border transition-all duration-200 cursor-pointer relative overflow-hidden group ${
            isActive 
                ? 'border-blue-500 shadow-md ring-2 ring-blue-500/20' 
                : 'border-slate-200 hover:shadow-md hover:border-slate-300'
        }`}
    >
        <h4 className="font-bold text-slate-800 pr-4 group-hover:text-blue-600">{briefing.title}</h4>
        <p className="text-sm text-slate-600 mt-2 line-clamp-3">{briefing.summary}</p>
        <div className="text-xs text-slate-400 mt-4 flex justify-between items-center">
            <span>由 {briefing.sourceArticleIds.length} 条情报聚合</span>
            <span>{new Date(briefing.generatedAt).toLocaleDateString('zh-CN')}</span>
        </div>
        {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
    </div>
);

const SourceArticleCard: React.FC<{ article: InfoItem }> = ({ article }) => (
    <div className="bg-white p-4 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors group">
        <p className="font-semibold text-sm text-slate-800 line-clamp-2 group-hover:text-blue-600">{article.title}</p>
        <div className="flex justify-between items-center mt-2 text-xs text-slate-500">
            <span>{article.source_name}</span>
            <span>{new Date(article.publish_date).toLocaleDateString('zh-CN')}</span>
        </div>
    </div>
);

// --- Main Component ---
export const StrategicCockpit: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    const [selectedLook, setSelectedLook] = useState<StrategicLookKey>('industry');
    const [selectedBriefing, setSelectedBriefing] = useState<InsightBriefing | null>(null);

    const lookCategories = [
        { key: 'industry' as StrategicLookKey, label: '看行业', icon: TrendingUpIcon, description: '宏观趋势与政策脉搏', hasSettings: false },
        { key: 'customer' as StrategicLookKey, label: '看客户', icon: UsersIcon, description: '用户需求与市场声音', hasSettings: false },
        { key: 'competitor' as StrategicLookKey, label: '看对手', icon: EyeIcon, description: '核心竞对动态追踪', hasSettings: true },
        { key: 'self' as StrategicLookKey, label: '看自己', icon: LightBulbIcon, description: '企业声誉与产品反馈', hasSettings: true },
    ];

    const filteredBriefings = useMemo(() => {
        return mockBriefings.filter(b => b.category === selectedLook);
    }, [selectedLook]);
    
    // 修复：将setState从useMemo移至useEffect，以避免无限渲染循环和修复白屏问题。
    useEffect(() => {
        if (filteredBriefings.length > 0) {
            // Check if the currently selected briefing is still in the filtered list.
            // If not, or if nothing is selected, select the first one.
            const isCurrentBriefingVisible = filteredBriefings.some(b => b.id === selectedBriefing?.id);
            if (!isCurrentBriefingVisible) {
                setSelectedBriefing(filteredBriefings[0]);
            }
        } else {
            setSelectedBriefing(null);
        }
    }, [filteredBriefings, selectedBriefing]);


    const sourceArticles = useMemo(() => {
        if (!selectedBriefing) return [];
        return mockSourceArticles.filter(a => selectedBriefing.sourceArticleIds.includes(a.id));
    }, [selectedBriefing]);

    const handleLookClick = (key: StrategicLookKey) => {
        setSelectedLook(key);
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <h1 className="text-2xl font-bold text-slate-800">AI情报洞察</h1>
                <p className="text-slate-500 mt-1">从引导式战略视角探索情报，发现决策依据。</p>
            </div>

            {/* Main Content Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-hidden">
                
                {/* Left Panel: Strategic Compass */}
                <div className="lg:col-span-3 h-full overflow-y-auto space-y-4 pr-2 -mr-2">
                    {lookCategories.map((look) => (
                        <LookCategoryCard
                            key={look.key}
                            look={look}
                            isActive={selectedLook === look.key}
                            onClick={() => handleLookClick(look.key)}
                            onSettingsClick={(e) => {
                                e.stopPropagation();
                                alert(`打开 ${look.label} 设置`);
                            }}
                            hasSettings={look.hasSettings}
                        />
                    ))}
                </div>

                {/* Middle Panel: Insight Hub */}
                <div className="lg:col-span-5 h-full overflow-y-auto space-y-4 pr-2 -mr-2">
                    {filteredBriefings.length > 0 ? (
                        filteredBriefings.map(briefing => (
                            <InsightBriefingCard
                                key={briefing.id}
                                briefing={briefing}
                                isActive={selectedBriefing?.id === briefing.id}
                                onClick={() => setSelectedBriefing(briefing)}
                            />
                        ))
                    ) : (
                        <div className="flex items-center justify-center h-full text-center text-slate-500 bg-white rounded-xl border border-dashed">
                           <p>该视角下暂无AI洞察简报</p>
                        </div>
                    )}
                </div>

                {/* Right Panel: Evidence Trail */}
                <div className="lg:col-span-4 h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="p-4 border-b border-slate-200">
                        <h3 className="font-semibold text-slate-800">情报溯源</h3>
                        <p className="text-xs text-slate-500">构成选中洞察的原始情报</p>
                    </div>
                    {sourceArticles.length > 0 ? (
                         <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {sourceArticles.map(article => (
                                <SourceArticleCard key={article.id} article={article} />
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-center text-slate-500 p-4">
                           <p>请在中间栏选择一篇洞察简报<br/>以查看其原始情报来源。</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};