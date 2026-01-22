
import React from 'react';
import { AgentConfig } from './types';
import { PencilIcon, SparklesIcon, ShieldCheckIcon, DocumentTextIcon, GlobeIcon } from '../icons'; 
import { AGENTS } from '../../agentConfig';

const HtmlVisualEditor = React.lazy(() => import('./agents/HtmlVisualEditor'));
const TechQuadrantAnalysis = React.lazy(() => import('./agents/NewTechQuadrant'));
const TechDecisionAssistant = React.lazy(() => import('./agents/TechDecisionAssistant'));
const UniversalReportGen = React.lazy(() => import('./agents/UniversalReportGen'));

export const AGENT_REGISTRY: AgentConfig[] = [
    {
        id: AGENTS.UNIVERSAL_REPORT_GEN,
        name: '深度研究 (Deep Research)',
        description: '基于全网实时数据的深度研究助手。自动拆解复杂课题，执行多轮次、多维度的信息检索与交叉验证，交付专家级分析报告。',
        category: '数据分析',
        icon: GlobeIcon,
        component: UniversalReportGen,
        tags: ['深度推理', '全网检索', '长文报告']
    },
    {
        id: '5e99897c-6d91-4c72-88e5-653ea162e52b',
        name: '新技术四象限分析',
        description: '从文章库提取技术点，经由 RAG 深度检索与四象限分析，生成可交互的 HTML 研报。',
        category: '数据分析',
        icon: SparklesIcon,
        component: TechQuadrantAnalysis,
        tags: ['RAG', '四象限', 'HTML生成', '文章库']
    },
    {
        id: AGENTS.TECH_DECISION_ASSISTANT,
        name: '技术决策评估助手',
        description: '专为汽车行业技术专家设计。采用分步思维链，深度评估技术路线、识别工程风险并提供解决方案。支持图文混排交付。',
        category: '数据分析',
        icon: ShieldCheckIcon,
        component: TechDecisionAssistant,
        tags: ['技术评估', '风险排查', '图表生成', '深度长文']
    },
    {
        id: 'html-visual-editor', 
        name: 'HTML 视觉设计工坊',
        description: '所见即所得的 HTML 单页编辑器。支持点击修改文字、样式与布局，快速产出精美演示文稿或海报。',
        category: '内容创作',
        icon: PencilIcon,
        component: HtmlVisualEditor,
        tags: ['HTML', '可视化编辑', '低代码']
    }
];
