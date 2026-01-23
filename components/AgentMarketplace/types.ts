
import React from 'react';

export type AgentCategory = 
    | '全部' 
    | '战略与产品' 
    | '智能研发' 
    | '品牌与营销' 
    | '供应链与制造' 
    | '综合效能';

export interface AgentConfig {
    id: string;
    name: string;
    description: string;
    category: AgentCategory;
    icon: React.FC<React.SVGProps<SVGSVGElement>>;
    component: React.LazyExoticComponent<React.ComponentType<any>>;
    tags?: string[]; // e.g. ["产品经理", "GTM"]
    isBeta?: boolean;
    disabled?: boolean;
    comingSoon?: boolean; // New flag for mock agents
}
