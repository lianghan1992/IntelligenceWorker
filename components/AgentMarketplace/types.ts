
import React from 'react';

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    category: '全部' | '数据分析' | '内容创作' | '办公提效' | '开发工具' | '其他';
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    component: React.LazyExoticComponent<React.ComponentType<any>>;
    tags?: string[];
    isBeta?: boolean;
    disabled?: boolean;
    allowedEmails?: string[]; // Optional: restrict access to specific users
}
