import { DeepDive, RecommendedSubscription, TechDimensionCategory, VehicleTechSpec } from './types';

// --- Recommended Subscriptions ---
// 根据用户请求清空示例数据
export const mockRecommendedSubscriptions: RecommendedSubscription[] = [];

// --- Deep Dives ---
// 根据用户请求清空示例数据
export const mockDeepDives: DeepDive[] = [];

// --- New Tech Dashboard Mock Data ---

export const techDimensions: TechDimensionCategory[] = [
    {
        key: 'smart_driving',
        label: '智能驾驶',
        subDimensions: [
            { key: 'chip', label: '计算芯片' },
            { key: 'lidar', label: '激光雷达' },
            { key: 'algorithm', label: '核心算法' },
        ],
    },
    {
        key: 'smart_cockpit',
        label: '智能座舱',
        subDimensions: [
            { key: 'chip', label: '座舱芯片' },
            { key: 'screen', label: '屏幕配置' },
            { key: 'os', label: '操作系统' },
        ],
    },
    {
        key: 'connectivity',
        label: '智能网联',
        subDimensions: [
            { key: 'communication', label: '通讯技术' },
            { key: 'v2x', label: 'V2X' },
        ],
    },
    {
        key: 'chassis',
        label: '智能底盘',
        subDimensions: [
            { key: 'suspension', label: '悬挂系统' },
            { key: 'steering', label: '转向系统' },
        ],
    },
    {
        key: 'power',
        label: '智能动力',
        subDimensions: [
            { key: 'platform', label: '高压平台' },
            { key: 'battery', label: '电池技术' },
            { key: 'motor', label: '电机技术' },
        ],
    },
];

export const mockVehicleSpecs: VehicleTechSpec[] = [
    {
        id: 'wenjie-m7-2023',
        name: '问界 M7 2023款',
        brand: '问界',
        year: 2023,
        specs: {
            smart_driving: { chip: '华为 MDC 610', lidar: '1颗 禾赛AT128', algorithm: 'ADS 1.0' },
            smart_cockpit: { chip: '高通骁龙 8155', screen: '10.25" 仪表 + 15.6" 中控', os: 'HarmonyOS 3' },
            connectivity: { communication: '4G', v2x: '不支持' },
            chassis: { suspension: '前麦弗逊/后多连杆', steering: '电动助力' },
            power: { platform: '400V', battery: '宁德时代 三元锂', motor: '后置单电机' },
        },
    },
    {
        id: 'wenjie-m7-2024',
        name: '问界 M7 2024款',
        brand: '问界',
        year: 2024,
        specs: {
            smart_driving: { chip: '华为 MDC 810', lidar: '1颗 禾赛AT128', algorithm: 'ADS 2.0' },
            smart_cockpit: { chip: '麒麟 990A', screen: '10.25" 仪表 + 15.6" 中控', os: 'HarmonyOS 4' },
            connectivity: { communication: '5G', v2x: '支持' },
            chassis: { suspension: '前双叉臂/后多连杆', steering: '可变转向比' },
            power: { platform: '400V', battery: '宁德时代 三元锂', motor: '前后双电机' },
        },
    },
    {
        id: 'li-l7-2024',
        name: '理想 L7 2024款',
        brand: '理想',
        year: 2024,
        specs: {
            smart_driving: { chip: 'NVIDIA Orin-X (双)', lidar: '1颗 禾赛AT128', algorithm: 'AD Max 3.0' },
            smart_cockpit: { chip: '高通骁龙 8295', screen: '中控+副驾双联屏', os: 'Li OS' },
            connectivity: { communication: '5G', v2x: '支持' },
            chassis: { suspension: '魔毯空气悬架', steering: '可变转向比' },
            power: { platform: '400V', battery: '宁德时代 三元锂', motor: '前后双电机' },
        },
    },
    {
        id: 'li-l8-2024',
        name: '理想 L8 2024款',
        brand: '理想',
        year: 2024,
        specs: {
            smart_driving: { chip: 'NVIDIA Orin-X (双)', lidar: '1颗 禾赛AT128', algorithm: 'AD Max 3.0' },
            smart_cockpit: { chip: '高通骁龙 8295', screen: '中控+副驾+后排娱乐屏', os: 'Li OS' },
            connectivity: { communication: '5G', v2x: '支持' },
            chassis: { suspension: '魔毯空气悬架', steering: '可变转向比' },
            power: { platform: '400V', battery: '宁德时代 三元锂', motor: '前后双电机' },
        },
    },
    {
        id: 'xiaomi-su7-max',
        name: '小米 SU7 Max',
        brand: '小米',
        year: 2024,
        specs: {
            smart_driving: { chip: 'NVIDIA Orin-X (双)', lidar: '1颗 禾赛AT128', algorithm: 'Xiaomi Pilot Max' },
            smart_cockpit: { chip: '高通骁龙 8295', screen: '16.1" 中控 + 7.1" 翻转仪表', os: '澎湃OS' },
            connectivity: { communication: '5G', v2x: '支持' },
            chassis: { suspension: 'CDC空气悬架', steering: '可变转向比' },
            power: { platform: '800V', battery: '宁德时代 麒麟电池', motor: '超级电机V8s' },
        },
    },
];