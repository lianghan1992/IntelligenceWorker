
import React from 'react';

export type AgentCategory = 'all' | 'writing' | 'data' | 'image' | 'dev' | 'analysis';

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    category: AgentCategory;
    tags: string[];
    component: React.LazyExoticComponent<React.FC<any>> | React.FC<any>;
    isNew?: boolean;
    isHot?: boolean;
}

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
    all: '全部',
    writing: '写作辅助',
    data: '数据处理',
    image: '图像工具',
    dev: '开发提效',
    analysis: '深度分析'
};
