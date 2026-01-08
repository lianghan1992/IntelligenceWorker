
import React from 'react';
import { AgentConfig } from './types';
import { ChartIcon } from '../icons'; // Using ChartIcon as placeholder

const NewTechIdentifier = React.lazy(() => import('./agents/NewTechIdentifier'));

export const AGENT_REGISTRY: AgentConfig[] = [
    {
        id: 'new-tech-identifier',
        name: '新技术识别',
        description: '上传 CSV/Markdown，自动识别新技术并生成四象限分析 PPT。支持批量处理与 PDF 导出。',
        category: '数据分析',
        icon: ChartIcon,
        component: NewTechIdentifier,
        tags: ['CSV分析', 'PPT生成', '技术评估']
    },
    // Future agents...
];
