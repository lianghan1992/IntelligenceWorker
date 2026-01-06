
import React from 'react';
import { ChipIcon, TrendingUpIcon, ShieldCheckIcon, GlobeIcon, UsersIcon } from '../icons';

export interface SubCategory {
    key: string;
    label: string;
    keywords: string;
}

export interface Category {
    key: string;
    label: string;
    icon: React.FC<any>;
    description: string;
    hasSettings: boolean;
    keywords?: string; // Added optional keywords for main category search
    children: SubCategory[];
}

export const lookCategories: Category[] = [
    { 
        key: 'new_tech', 
        label: '新技术', 
        icon: ChipIcon, 
        description: '追踪前沿技术突破与硬核科技', 
        hasSettings: false,
        keywords: '自动驾驶 智能座舱 三电系统 智能制造 芯片 激光雷达',
        children: []
    },
    { 
        key: 'new_industry', 
        label: '新行业', 
        icon: TrendingUpIcon, 
        description: '洞察新兴赛道与产业变革', 
        hasSettings: false,
        keywords: 'Robotaxi 飞行汽车 低空经济 出海战略 车路云一体化',
        children: []
    },
    { 
        key: 'policy', 
        label: '政策', 
        icon: ShieldCheckIcon, 
        description: '解读法规标准与合规风向', 
        hasSettings: false,
        keywords: '法规标准 产业政策 补贴 关税 数据安全',
        children: []
    },
    { 
        key: 'economy', 
        label: '经济', 
        icon: GlobeIcon, 
        description: '关注资本市场与供应链波动', 
        hasSettings: false,
        keywords: '股市 财报 销量 供应链 投融资 价格战',
        children: []
    },
    { 
        key: 'society', 
        label: '社会', 
        icon: UsersIcon, 
        description: '倾听舆论声音与社会责任', 
        hasSettings: false,
        keywords: '舆情 消费趋势 ESG 碳中和 维权',
        children: []
    },
];
