import { StrategicLookKey } from '../../types';
import { LightBulbIcon, UsersIcon, EyeIcon, TrendingUpIcon } from '../icons';

interface SubCategory {
    key: string;
    label: string;
}

interface Category {
    key: StrategicLookKey;
    label: string;
    icon: React.FC<any>;
    description: string;
    hasSettings: boolean;
    children: SubCategory[];
}

export const lookCategories: Category[] = [
    { 
        key: 'industry', 
        label: '看行业', 
        icon: TrendingUpIcon, 
        description: '宏观趋势与政策脉搏', 
        hasSettings: false,
        children: [
            { key: 'tech', label: '新技术' },
            { key: 'industry_new', label: '新行业' },
            { key: 'policy', label: '政策' },
            { key: 'economy', label: '经济' },
            { key: 'society', label: '社会' },
        ]
    },
    { 
        key: 'customer', 
        label: '看客户', 
        icon: UsersIcon, 
        description: '用户需求与市场声音', 
        hasSettings: false,
        children: [
            { key: 'research', label: '用户研究' },
            { key: 'sentiment', label: '用户舆情' },
        ]
    },
    { 
        key: 'competitor', 
        label: '看对手', 
        icon: EyeIcon, 
        description: '核心竞对动态追踪', 
        hasSettings: true,
        children: [
            { key: 'company', label: '竞争企业' },
            { key: 'product', label: '竞争产品' },
            { key: 'tech_compete', label: '竞品技术' },
        ]
    },
    { 
        key: 'self', 
        label: '看自己', 
        icon: LightBulbIcon, 
        description: '企业声誉与产品反馈', 
        hasSettings: true,
        children: [
            { key: 'market', label: '市场' },
            { key: 'user', label: '用户' },
            { key: 'product_self', label: '产品' },
            { key: 'tech_self', label: '技术' },
            { key: 'sentiment_self', label: '舆情' },
        ]
    },
];
