
import React from 'react';
import { StrategicLookKey } from '../../types';
import { LightBulbIcon, TrendingUpIcon, ShieldCheckIcon, GlobeIcon, UsersIcon, ChipIcon, RssIcon } from '../icons';

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
    children: SubCategory[];
}

export const lookCategories: Category[] = [
    { 
        key: 'new_tech', 
        label: '新技术', 
        icon: ChipIcon, 
        description: '追踪前沿技术突破与硬核科技', 
        hasSettings: false,
        children: [
            { key: 'autonomous', label: '自动驾驶', keywords: '自动驾驶 L3 L4 端到端 FSD NOA 激光雷达 智驾芯片' },
            { key: 'cockpit', label: '智能座舱', keywords: '智能座舱 HUD 8295 鸿蒙 座舱芯片 大模型上车 语音交互' },
            { key: 'battery', label: '三电系统', keywords: '固态电池 800V 麒麟电池 4680 碳化硅 电机电控 换电' },
            { key: 'manufacturing', label: '智能制造', keywords: '一体化压铸 智慧工厂 柔性生产 工业互联网' },
        ]
    },
    { 
        key: 'new_industry', 
        label: '新行业', 
        icon: TrendingUpIcon, 
        description: '洞察新兴赛道与产业变革', 
        hasSettings: false,
        children: [
            { key: 'robotaxi', label: 'Robotaxi', keywords: 'Robotaxi 无人出租车 萝卜快跑 Waymo Pony.ai' },
            { key: 'flying_car', label: '低空经济', keywords: '飞行汽车 eVTOL 低空经济 小鹏汇天 亿航智能' },
            { key: 'global', label: '出海战略', keywords: '汽车出口 欧洲反补贴 东南亚市场 墨西哥建厂 汽车出海' },
            { key: 'v2x', label: '车路云一体化', keywords: 'V2X 车路协同 智慧交通 智能网联示范区' },
        ]
    },
    { 
        key: 'policy', 
        label: '政策', 
        icon: ShieldCheckIcon, 
        description: '解读法规标准与合规风向', 
        hasSettings: false,
        children: [
            { key: 'regulation', label: '法规标准', keywords: '汽车国标 准入规则 数据安全法 隐私保护 智能汽车法规' },
            { key: 'subsidy', label: '产业政策', keywords: '新能源补贴 购置税减免 双积分 绿牌政策 以旧换新' },
            { key: 'trade', label: '国际贸易', keywords: '关税 贸易壁垒 欧盟调查 本地化率要求' },
        ]
    },
    { 
        key: 'economy', 
        label: '经济', 
        icon: GlobeIcon, 
        description: '关注资本市场与供应链波动', 
        hasSettings: false,
        children: [
            { key: 'market_performance', label: '股市财报', keywords: '汽车股 财报 营收 净利润 毛利率 市值' },
            { key: 'sales_data', label: '产销数据', keywords: '乘联会 销量排行榜 上险量 交付量 市场份额' },
            { key: 'supply_chain', label: '供应链价格', keywords: '碳酸锂价格 芯片价格 原材料成本 零部件供应' },
            { key: 'investment', label: '投融资', keywords: '汽车融资 IPO 并购 战略投资' },
        ]
    },
    { 
        key: 'society', 
        label: '社会', 
        icon: UsersIcon, 
        description: '倾听舆论声音与社会责任', 
        hasSettings: false,
        children: [
            { key: 'sentiment', label: '舆情热点', keywords: '汽车维权 刹车失灵 质量投诉 品牌公关 负面舆情' },
            { key: 'consumer', label: '消费趋势', keywords: 'Z世代 购车偏好 女性车主 消费降级 增换购' },
            { key: 'esg', label: 'ESG与碳中和', keywords: '汽车碳足迹 绿色供应链 汽车回收 社会责任 可持续发展' },
        ]
    },
];
