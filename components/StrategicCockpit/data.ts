
import React from 'react';
import { StrategicLookKey } from '../../types';
import { LightBulbIcon, UsersIcon, EyeIcon, TrendingUpIcon, RssIcon } from '../icons';

export interface SubCategory {
    key: string;
    label: string;
    keywords: string;
}

export interface Category {
    key: StrategicLookKey | 'all';
    label: string;
    icon: React.FC<any>;
    description: string;
    hasSettings: boolean;
    children: SubCategory[];
}

export const lookCategories: Category[] = [
    { 
        key: 'all', 
        label: '所有情报', 
        icon: RssIcon, 
        description: '您订阅的所有情报源的最新动态', 
        hasSettings: false,
        children: []
    },
    { 
        key: 'industry', 
        label: '看行业', 
        icon: TrendingUpIcon, 
        description: '宏观趋势与政策脉搏', 
        hasSettings: false,
        children: [
            { key: 'tech', label: '新技术', keywords: '汽车 新技术 自动驾驶 智能座舱 三电系统 800V 高压平台 激光雷达 芯片' },
            { key: 'industry_new', label: '新行业', keywords: '飞行汽车 机器人出租车 Robotaxi 汽车元宇宙 V2X 车路协同' },
            { key: 'policy', label: '政策', keywords: '汽车 政策 法规 国标 补贴 双积分 新能源汽车 智能网联' },
            { key: 'economy', label: '经济', keywords: '汽车 销量 财报 投融资 股价 市值 供应链 成本' },
            { key: 'society', label: '社会', keywords: '汽车 用户调研 消费趋势 出行方式 充电桩 基础设施 碳中和' },
        ]
    },
    { 
        key: 'customer', 
        label: '看客户', 
        icon: UsersIcon, 
        description: '用户需求与市场声音', 
        hasSettings: false,
        children: [
            { key: 'research', label: '用户研究', keywords: '汽车 用户研究 调研报告 用户画像 消费者偏好 购买意向' },
            { key: 'sentiment', label: '用户舆情', keywords: '汽车 用户评价 口碑 投诉 论坛评论 社交媒体 车主反馈' },
        ]
    },
    { 
        key: 'competitor', 
        label: '看对手', 
        icon: EyeIcon, 
        description: '核心竞对动态追踪', 
        hasSettings: true,
        children: [
            { key: 'company', label: '竞争企业', keywords: '特斯拉 比亚迪 蔚来 小鹏 理想 华为 问界 智界 竞争格局 战略' },
            { key: 'product', label: '竞争产品', keywords: 'Model Y 宋PLUS 汉EV 问界M9 小米SU7 竞品分析 对比' },
            { key: 'tech_compete', label: '竞品技术', keywords: 'FSD 城市NOA 智驾 麒麟电池 刀片电池 CTC技术' },
        ]
    },
    { 
        key: 'self', 
        label: '看自己', 
        icon: LightBulbIcon, 
        description: '企业声誉与产品反馈', 
        hasSettings: true,
        children: [
            { key: 'market', label: '市场', keywords: '市场份额 品牌形象 营销活动 销售策略' },
            { key: 'user', label: '用户', keywords: '用户反馈 用户满意度 社区讨论' },
            { key: 'product_self', label: '产品', keywords: '产品评测 质量问题 OTA升级' },
            { key: 'tech_self', label: '技术', keywords: '技术研发 专利 创新' },
            { key: 'sentiment_self', label: '舆情', keywords: '公司声誉 公关危机 媒体报道' },
        ]
    },
];