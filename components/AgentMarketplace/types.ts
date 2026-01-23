
import React from 'react';

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    category: '全部' | '战略研究' | '技术研发' | '市场营销' | '数字化办公' | '其他';
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    component: React.LazyExoticComponent<React.ComponentType<any>>;
    tags?: string[];
    isBeta?: boolean;
    disabled?: boolean;
}
