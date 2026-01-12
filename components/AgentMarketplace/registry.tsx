
import React from 'react';
import { AgentConfig } from './types';
import { ChartIcon, PencilIcon } from '../icons'; // Using PencilIcon for visual editor
import { AGENTS } from '../../agentConfig';

const NewTechIdentifier = React.lazy(() => import('./agents/NewTechIdentifier'));
const HtmlVisualEditor = React.lazy(() => import('./agents/HtmlVisualEditor'));

export const AGENT_REGISTRY: AgentConfig[] = [
    {
        id: AGENTS.NEW_TECH_IDENTIFIER,
        name: '新技术识别',
        description: '上传 CSV/Markdown，自动识别新技术并生成四象限分析 PPT。支持批量处理与 PDF 导出。',
        category: '数据分析',
        icon: ChartIcon,
        component: NewTechIdentifier,
        tags: ['CSV分析', 'PPT生成', '技术评估']
    },
    {
        id: 'html-visual-editor', // New local ID, no need to add to global config unless we track billing specifically for it
        name: 'HTML 视觉设计工坊',
        description: '所见即所得的 HTML 单页编辑器。支持点击修改文字、样式与布局，快速产出精美演示文稿或海报。',
        category: '内容创作',
        icon: PencilIcon,
        component: HtmlVisualEditor,
        tags: ['HTML', '可视化编辑', '低代码']
    }
    // Future agents...
];
