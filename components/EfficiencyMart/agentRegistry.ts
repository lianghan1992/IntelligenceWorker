
import React from 'react';
import { AgentConfig } from './types';
import { PencilIcon, CodeIcon, ViewGridIcon } from '../icons';

// Lazy Load Agents
const TextPolisher = React.lazy(() => import('./agents/TextPolisher'));

// Registry
export const agents: AgentConfig[] = [
    {
        id: 'text-polisher',
        name: '智能文本润色',
        description: '专为职场打造的写作助手。支持精简、专业化及创意重写，让您的报告和邮件更具说服力。',
        category: 'writing',
        tags: ['写作', '办公', 'AI'],
        icon: PencilIcon,
        component: TextPolisher,
        isNew: true,
        isHot: true
    },
    // Placeholder for future agent
    {
        id: 'json-formatter',
        name: 'JSON 智能清洗',
        description: '自动修复损坏的 JSON 格式，提取关键字段，并生成 TypeScript 类型定义。（演示占位）',
        category: 'dev',
        tags: ['工具', '开发'],
        icon: CodeIcon,
        component: React.lazy(() => Promise.resolve({ default: () => React.createElement('div', { className: "p-10 text-center text-gray-500" }, "Coming Soon...") })),
        isNew: false
    },
     {
        id: 'data-chart',
        name: '数据图表生成',
        description: '输入数据表格，AI 自动推荐并生成最适合的可视化图表。（演示占位）',
        category: 'analysis',
        tags: ['数据', '可视化'],
        icon: ViewGridIcon,
        component: React.lazy(() => Promise.resolve({ default: () => React.createElement('div', { className: "p-10 text-center text-gray-500" }, "Coming Soon...") })),
        isNew: false
    }
];
