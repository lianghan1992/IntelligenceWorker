import React, { useState, useMemo } from 'react';
import { Subscription, StrategicLookKey, InsightBriefing } from '../types';
import { LightBulbIcon, UsersIcon, EyeIcon, TrendingUpIcon } from './icons';

const lookCategories: { key: StrategicLookKey; label: string; icon: React.FC<React.SVGProps<SVGSVGElement>> }[] = [
    { key: 'industry', label: '行业洞察', icon: TrendingUpIcon },
    { key: 'competitor', label: '竞品分析', icon: EyeIcon },
    { key: 'customer', label: '客户研究', icon: UsersIcon },
    { key: 'opportunity', label: '机会识别', icon: LightBulbIcon },
];

const mockBriefings: InsightBriefing[] = [
    {
        id: 'brief-1',
        title: '新能源汽车800V高压平台渗透率预测',
        summary: '预计到2025年，800V高压平台在新发布车型中的渗透率将达到35%，主要由高端品牌引领，成本下降将推动其向中端市场普及。',
        category: 'industry',
        sourceArticleIds: ['art-1', 'art-2'],
        generatedAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    },
    {
        id: 'brief-2',
        title: '特斯拉FSD V12.4核心技术更新解读',
        summary: 'V12.4版本在端到端模型上引入了新的神经网络架构，显著提升了城市复杂路口的无保护左转成功率。',
        category: 'competitor',
        entities: ['Tesla'],
        sourceArticleIds: ['art-3'],
        generatedAt: new Date().toISOString(),
    },
    {
        id: 'brief-3',
        title: '蔚来换电联盟最新动态分析',
        summary: '蔚来近期与多家主机厂达成换电合作协议，旨在扩大其能源网络覆盖范围，建立行业标准，但面临资产过重和盈利模式的挑战。',
        category: 'competitor',
        entities: ['NIO'],
        sourceArticleIds: ['art-4', 'art-5'],
        generatedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    },
     {
        id: 'brief-4',
        title: '用户对于车载智能座舱大屏的需求趋势',
        summary: '调研显示，用户对大屏的需求已从“尺寸”转向“生态和交互体验”，对内置应用丰富度、语音助手智能程度的关注度显著提升。',
        category: 'customer',
        sourceArticleIds: ['art-6'],
        generatedAt: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
    },
    {
        id: 'brief-5',
        title: '自动驾驶卡车商业化落地新机遇',
        summary: '随着“干线物流”场景法规的逐步明确，以及L4级技术在限定区域的成熟，自动驾驶卡车在港口、矿山等封闭场景的商业化落地正在加速。',
        category: 'opportunity',
        sourceArticleIds: ['art-7'],
        generatedAt: new Date(Date.now() - 86400000 * 5).toISOString(), // 5 days ago
    }
];

const InsightCard: React.FC<{ briefing: InsightBriefing }> = ({ briefing }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all duration-300 group flex flex-col h-full">
        <h3 className="text-md font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{briefing.title}</h3>
        <p className="text-sm text-gray-600 flex-grow mb-4">{briefing.summary}</p>
        <div className="text-xs text-gray-400 mt-auto">
            生成于: {new Date(briefing.generatedAt).toLocaleDateString('zh-CN')}
        </div>
    </div>
);


export const StrategicCockpit: React.FC<{ subscriptions: Subscription[] }> = ({ subscriptions }) => {
    const [selectedLook, setSelectedLook] = useState<StrategicLookKey>('industry');

    const filteredBriefings = useMemo(() => {
        return mockBriefings.filter(b => b.category === selectedLook);
    }, [selectedLook]);
    
    return (
        <div className="p-6 bg-gray-50/50 h-full overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-800">战略驾驶舱</h1>
                    <p className="text-gray-500 mt-1">从高层次视角审视市场格局，发现战略机会。</p>
                </div>

                {/* Main Content */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
                    {/* Tabs for "Looks" */}
                    <div className="p-4 border-b">
                        <div className="flex items-center space-x-2">
                            {lookCategories.map(({ key, label, icon: Icon }) => (
                                <button
                                    key={key}
                                    onClick={() => setSelectedLook(key)}
                                    className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors duration-200 ${
                                        selectedLook === key
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Insights Grid */}
                    <div className="p-6">
                        {filteredBriefings.length > 0 ? (
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {filteredBriefings.map(briefing => (
                                    <InsightCard key={briefing.id} briefing={briefing} />
                                ))}
                            </div>
                        ) : (
                             <div className="text-center py-20">
                                <p className="text-gray-500">该视角下暂无AI生成的洞察简报。</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
