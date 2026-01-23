
import React from 'react';
import { AgentConfig } from './types';
import { 
    PencilIcon, SparklesIcon, ShieldCheckIcon, DocumentTextIcon, GlobeIcon,
    ChartIcon, ChipIcon, TruckIcon, UsersIcon, CodeIcon, ShieldExclamationIcon,
    SearchIcon, LightningBoltIcon, BrainIcon
} from '../icons'; 
import { AGENTS } from '../../agentConfig';

// Lazy load existing components
const HtmlVisualEditor = React.lazy(() => import('./agents/HtmlVisualEditor'));
const TechQuadrantAnalysis = React.lazy(() => import('./agents/NewTechQuadrant'));
const TechDecisionAssistant = React.lazy(() => import('./agents/TechDecisionAssistant'));
const UniversalReportGen = React.lazy(() => import('./agents/UniversalReportGen'));

// Placeholder component for Coming Soon agents
const PlaceholderAgent = () => <div>Coming Soon</div>;

export const AGENT_REGISTRY: AgentConfig[] = [
    // --- 1. 战略与产品定义战区 (Strategy & Product) ---
    {
        id: AGENTS.UNIVERSAL_REPORT_GEN,
        name: '深度研究 (Deep Research)',
        description: '您的全能战略分析师。自动拆解复杂课题，执行多轮次全网信息检索与交叉验证，交付专家级深度研报。',
        category: '战略与产品',
        icon: GlobeIcon,
        component: UniversalReportGen,
        tags: ['战略分析师', '行业研究']
    },
    {
        id: 'competitor-radar-mock',
        name: '竞品雷达 (Competitor Radar)',
        description: '实时监控竞品动态。自动抓取竞品车型参数、价格变动及配置调整，生成可视化对比矩阵。',
        category: '战略与产品',
        icon: ChartIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['产品经理', '竞品分析'],
        comingSoon: true,
        disabled: true
    },
    {
        id: 'voc-insight-mock',
        name: 'VOC 用户洞察专家',
        description: '倾听用户的声音。聚合车友圈、App 社区及社媒反馈，AI 提炼用户痛点与高频诉求。',
        category: '战略与产品',
        icon: UsersIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['用户研究', '体验管理'],
        comingSoon: true,
        disabled: true
    },

    // --- 2. 智能研发战区 (R&D Intelligence) ---
    {
        id: '5e99897c-6d91-4c72-88e5-653ea162e52b',
        name: '新技术四象限分析',
        description: '前瞻技术猎手。从海量文献中提取技术创新点，经由 RAG 深度检索与四象限评估，生成可交互技术档案。',
        category: '智能研发',
        icon: SparklesIcon,
        component: TechQuadrantAnalysis,
        tags: ['技术预研', 'CTO Office']
    },
    {
        id: AGENTS.TECH_DECISION_ASSISTANT,
        name: '技术决策评估助手',
        description: '资深总工级参谋。分步式思维链，深度评估技术路线（如 800V vs 400V）、识别工程风险并提供解决方案。',
        category: '智能研发',
        icon: ShieldCheckIcon,
        component: TechDecisionAssistant,
        tags: ['系统工程师', '架构师']
    },
    {
        id: 'arxiv-hunter-mock',
        name: 'Arxiv 论文猎手',
        description: '自动驾驶算法工程师的每日必读。自动追踪 CVPR/ICCV 最新论文，提炼 SOTA 模型核心思想。',
        category: '智能研发',
        icon: BrainIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['算法工程师', '自动驾驶'],
        comingSoon: true,
        disabled: true
    },
    {
        id: 'code-copilot-mock',
        name: '嵌入式代码副驾',
        description: '专懂车规级代码的 AI。遵循 MISRA C 标准，辅助编写、审查及生成单元测试用例。',
        category: '智能研发',
        icon: CodeIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['软件工程师', 'BMS/VCU'],
        comingSoon: true,
        disabled: true
    },

    // --- 3. 品牌与营销战区 (Brand & Growth) ---
    {
        id: 'html-visual-editor', 
        name: 'HTML 视觉设计工坊',
        description: '营销物料生产线。所见即所得的可视化编辑器，快速产出精美演示文稿、活动海报或产品落地页。',
        category: '品牌与营销',
        icon: PencilIcon,
        component: HtmlVisualEditor,
        tags: ['内容营销', '设计师']
    },
    {
        id: 'crisis-firefighter-mock',
        name: '舆情危机消防员',
        description: '公关团队的 24h 守卫。实时监测负面舆情，自动生成多版本公关回应话术与声明草稿。',
        category: '品牌与营销',
        icon: ShieldExclamationIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['品牌公关', '媒介经理'],
        comingSoon: true,
        disabled: true
    },
    {
        id: 'sales-coach-mock',
        name: '金牌销售陪练',
        description: '一线销售的 AI 导师。模拟真实客户刁钻提问（如“为什么不买 Model 3？”），实战演练话术。',
        category: '品牌与营销',
        icon: UsersIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['销售培训', '门店顾问'],
        comingSoon: true,
        disabled: true
    },

    // --- 4. 供应链与制造战区 (Supply & Manufacturing) ---
    {
        id: 'price-sentinel-mock',
        name: '原材料价格哨兵',
        description: '采购经理的行情看板。监控碳酸锂、芯片等核心原材料价格波动，提供库存策略建议。',
        category: '供应链与制造',
        icon: ChartIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['采购经理', 'SQE'],
        comingSoon: true,
        disabled: true
    },
    {
        id: 'supplier-risk-mock',
        name: '供应商风险探针',
        description: '供应链安全卫士。通过全网公开信息分析供应商财务状况、法律纠纷及经营风险。',
        category: '供应链与制造',
        icon: SearchIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['供应链管理'],
        comingSoon: true,
        disabled: true
    },

    // --- 5. 综合效能战区 (General Efficiency) ---
    {
        id: 'contract-review-mock',
        name: '智能合同审查',
        description: '法务部的得力助手。自动识别合同中的法律风险条款，比对车企合规标准，生成修改建议。',
        category: '综合效能',
        icon: DocumentTextIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['法务', '合规'],
        comingSoon: true,
        disabled: true
    },
    {
        id: 'energy-policy-mock',
        name: '双碳政策解读',
        description: 'ESG 专员的政策库。实时解读全球碳排放、双积分及新能源补贴政策变化。',
        category: '综合效能',
        icon: LightningBoltIcon,
        component: React.lazy(() => Promise.resolve({ default: PlaceholderAgent })),
        tags: ['ESG', '政府关系'],
        comingSoon: true,
        disabled: true
    }
];
