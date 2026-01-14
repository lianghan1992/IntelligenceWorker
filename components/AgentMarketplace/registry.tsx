
import React from 'react';
import { AgentConfig } from './types';
import { ChartIcon, PencilIcon, SparklesIcon } from '../icons'; // Using PencilIcon for visual editor
import { AGENTS } from '../../agentConfig';

const NewTechIdentifier = React.lazy(() => import('./agents/NewTechIdentifier'));
const HtmlVisualEditor = React.lazy(() => import('./agents/HtmlVisualEditor'));
const TechQuadrantAnalysis = React.lazy(() => import('./agents/NewTechQuadrant'));

export const AGENT_REGISTRY: AgentConfig[] = [
    {
        id: AGENTS.NEW_TECH_IDENTIFIER,
        name: '新技术识别 (旧版)',
        description: '上传 CSV/Markdown，自动识别新技术并生成四象限分析 PPT。',
        category: '数据分析',
        icon: ChartIcon,
        component: NewTechIdentifier,
        tags: ['CSV分析', 'PPT生成', '技术评估'],
        disabled: true 
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
        id: 'html-visual-editor', 
        name: 'HTML 视觉设计工坊',
        description: '所见即所得的 HTML 单页编辑器。支持点击修改文字、样式与布局，快速产出精美演示文稿或海报。',
        category: '内容创作',
        icon: PencilIcon,
        component: HtmlVisualEditor,
        tags: ['HTML', '可视化编辑', '低代码']
    }
];
