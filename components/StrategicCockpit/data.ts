
import { ChipIcon, TrendingUpIcon, ShieldCheckIcon, GlobeIcon, UsersIcon, ViewGridIcon } from '../icons';

export interface SubCategory {
    key: string;
    label: string;
    keywords: string;
}

export interface Category {
    key: string;
    label: string;
    icon: any;
    description: string;
    hasSettings: boolean;
    keywords?: string;
    children: SubCategory[];
}

export const lookCategories: Category[] = [
    {
        key: 'all',
        label: '全部',
        icon: ViewGridIcon,
        description: '全网情报聚合，实时更新',
        hasSettings: false,
        children: []
    },
    { 
        key: 'new_tech', 
        label: '新技术', 
        icon: ChipIcon, 
        description: '自动驾驶、智能座舱、三电系统等技术突破', 
        hasSettings: false,
        children: []
    },
    { 
        key: 'new_industry', 
        label: '新行业', 
        icon: TrendingUpIcon, 
        description: 'Robotaxi、飞行汽车、出海等新赛道', 
        hasSettings: false,
        children: []
    },
    { 
        key: 'policy', 
        label: '政策', 
        icon: ShieldCheckIcon, 
        description: '法规标准、补贴政策、数据安全', 
        hasSettings: false,
        children: []
    },
    { 
        key: 'economy', 
        label: '经济', 
        icon: GlobeIcon, 
        description: '股市财报、供应链价格、投融资', 
        hasSettings: false,
        children: []
    },
    { 
        key: 'society', 
        label: '社会', 
        icon: UsersIcon, 
        description: '舆情热点、消费趋势、ESG', 
        hasSettings: false,
        children: []
    },
];