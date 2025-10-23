import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Subscription, StrategicLookKey, InsightBriefing, InfoItem, ApiPoi } from '../../types';
import { lookCategories } from './data';
import { StrategicCompass } from './StrategicCompass';
import { FocusPoints } from './FocusPoints';
import { FocusPointManagerModal } from '../Dashboard/FocusPointManagerModal';
import { getUserPois } from '../../api';

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
    const [selectedSubLook, setSelectedSubLook] = useState<string | null>('tech');
    const [selectedBriefing, setSelectedBriefing] = useState<InsightBriefing | null>(null);
    const [isFocusPointModalOpen, setIsFocusPointModalOpen] = useState(false);
    
    const [pois, setPois] = useState<ApiPoi[]>([]);
    const [isLoadingPois, setIsLoadingPois] = useState(true);

    const fetchPois = useCallback(async () => {
        setIsLoadingPois(true);
        try {
            const userPois = await getUserPois();
            setPois(userPois);
        } catch (err) {
            console.error("Failed to fetch POIs in Cockpit:", err);
        } finally {
            setIsLoadingPois(false);
        }
    }, []);

    useEffect(() => {
        fetchPois();
    }, [fetchPois]);

    const handleModalClose = () => {
        setIsFocusPointModalOpen(false);
        fetchPois(); // Refetch on close
    };


    const filteredBriefings = useMemo(() => {
        // NOTE: Sub-look filtering logic will be added here later.
        // For now, it filters only by the main category.
        return mockBriefings.filter(b => b.category === selectedLook);
    }, [selectedLook]);
    
    useEffect(() => {
        if (filteredBriefings.length > 0) {
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

    return (
        <div className="h-full bg-slate-50 flex flex-col">
            {/* Main Content Area */}
            <div className="flex-1 flex gap-6 p-6 overflow-hidden">
                
                {/* Left Panel: Strategic Compass & Focus Points */}
                <aside className="w-64 flex-shrink-0 h-full overflow-y-auto scrollbar-hide space-y-4">
                    <StrategicCompass
                        categories={lookCategories}
                        selectedLook={selectedLook}
                        setSelectedLook={setSelectedLook}
                        selectedSubLook={selectedSubLook}
                        setSelectedSubLook={setSelectedSubLook}
                    />
                    <FocusPoints 
                        onManageClick={() => setIsFocusPointModalOpen(true)}
                        pois={pois}
                        isLoading={isLoadingPois}
                    />
                </aside>

                {/* Right Content Grid (contains middle and right panels) */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-6 overflow-hidden">
                    {/* Middle Panel: Insight Hub */}
                    <main className="lg:col-span-6 h-full overflow-y-auto space-y-4 pr-2 -mr-2 scrollbar-hide">
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
                    </main>

                    {/* Right Panel: Evidence Trail */}
                    <aside className="lg:col-span-4 h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="p-4 border-b border-slate-200">
                            <h3 className="font-semibold text-slate-800">情报溯源</h3>
                            <p className="text-xs text-slate-500">构成选中洞察的原始情报</p>
                        </div>
                        {sourceArticles.length > 0 ? (
                             <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
                                {sourceArticles.map(article => (
                                    <SourceArticleCard key={article.id} article={article} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-center text-slate-500 p-4">
                               <p>请在中间栏选择一篇洞察简报<br/>以查看其原始情报来源。</p>
                            </div>
                        )}
                    </aside>
                </div>
            </div>
            {isFocusPointModalOpen && <FocusPointManagerModal onClose={handleModalClose} />}
             <style>{`.scrollbar-hide::-webkit-scrollbar { display: none; } .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
};