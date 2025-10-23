import { TechDimensionCategory, VehicleTechSpec, NewTechForecast } from '../../types';

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
     {
        key: 'body_structure',
        label: '智能车身',
        subDimensions: [
            { key: 'body_casting', label: '一体化压铸' },
        ],
    },
];

export const mockVehicleSpecs: VehicleTechSpec[] = [
    {
        id: 'wenjie-m7-2023',
        name: '问界 M7 2023款',
        brand: '问界',
        model: 'M7',
        year: 2023,
        platform: '华为途灵平台',
        specs: {
            smart_driving: { 
                chip: { value: '华为 MDC 610', supplier: '华为' }, 
                lidar: { value: '1颗 禾赛AT128', supplier: '禾赛科技' }, 
                algorithm: { value: 'ADS 1.0', supplier: '华为' } 
            },
            smart_cockpit: { 
                chip: { value: '高通骁龙 8155', supplier: '高通' }, 
                screen: '10.25" 仪表 + 15.6" 中控', 
                os: { value: 'HarmonyOS 3', supplier: '华为' }
            },
            power: { 
                platform: { value: '400V', details: { '最高电压': 450, '充电倍率': '2C'} }, 
                battery: { value: '三元锂', supplier: '宁德时代' }, 
                motor: '后置单电机' 
            },
        },
    },
    {
        id: 'wenjie-m7-2024',
        name: '问界 M7 2024款',
        brand: '问界',
        model: 'M7',
        year: 2024,
        platform: '华为途灵平台',
        specs: {
            smart_driving: { 
                chip: { value: '华为 MDC 810', supplier: '华为' }, 
                lidar: { value: '1颗 禾赛AT128', supplier: '禾赛科技' }, 
                algorithm: { value: 'ADS 2.0', supplier: '华为' }
            },
            smart_cockpit: { 
                chip: { value: '麒麟 990A', supplier: '华为' }, 
                screen: '10.25" 仪表 + 15.6" 中控', 
                os: { value: 'HarmonyOS 4', supplier: '华为' }
            },
            power: { 
                platform: { value: '400V', details: { '最高电压': 450, '充电倍率': '2C'} }, 
                battery: { value: '三元锂', supplier: '宁德时代' }, 
                motor: '前后双电机' 
            },
        },
    },
    {
        id: 'li-l7-2024',
        name: '理想 L7 2024款',
        brand: '理想',
        model: 'L7',
        year: 2024,
        platform: '理想增程2.0平台',
        specs: {
            smart_driving: { 
                chip: { value: '双NVIDIA Orin-X', supplier: 'NVIDIA' }, 
                lidar: { value: '1颗 禾赛AT128', supplier: '禾赛科技' }, 
                algorithm: { value: 'AD Max 3.0', supplier: '理想' }
            },
            smart_cockpit: { 
                chip: { value: '高通骁龙 8295', supplier: '高通' }, 
                screen: '中控+副驾双联屏', 
                os: { value: 'Li OS', supplier: '理想' }
            },
             power: { 
                platform: { value: '400V', details: { '最高电压': 450, '充电倍率': '2C'} }, 
                battery: { value: '三元锂', supplier: '宁德时代' }, 
                motor: '前后双电机' 
            },
        },
    },
     {
        id: 'li-l9-2024',
        name: '理想 L9 2024款',
        brand: '理想',
        model: 'L9',
        year: 2024,
        platform: '理想增程2.0平台',
        specs: {
            smart_driving: { 
                chip: { value: '双NVIDIA Orin-X', supplier: 'NVIDIA' }, 
                lidar: { value: '1颗 禾赛AT128', supplier: '禾赛科技' }, 
                algorithm: { value: 'AD Max 3.0', supplier: '理想' }
            },
            smart_cockpit: { 
                chip: { value: '高通骁龙 8295', supplier: '高通' }, 
                screen: '中控+副驾+后排娱乐屏', 
                os: { value: 'Li OS', supplier: '理想' }
            },
             power: { 
                platform: { value: '400V', details: { '最高电压': 450, '充电倍率': '2C'} }, 
                battery: { value: '三元锂', supplier: '宁德时代' }, 
                motor: '前后双电机' 
            },
        },
    },
    {
        id: 'xiaomi-su7-max',
        name: '小米 SU7 Max',
        brand: '小米',
        model: 'SU7',
        year: 2024,
        platform: '小米摩德纳平台',
        specs: {
            smart_driving: { 
                chip: { value: '双NVIDIA Orin-X', supplier: 'NVIDIA' }, 
                lidar: { value: '1颗 禾赛AT128', supplier: '禾赛科技' }, 
                algorithm: { value: 'Xiaomi Pilot Max', supplier: '小米' }
            },
            smart_cockpit: { 
                chip: { value: '高通骁龙 8295', supplier: '高通' }, 
                screen: '16.1" 中控 + 7.1" 翻转仪表', 
                os: { value: '澎湃OS', supplier: '小米' }
            },
            power: { 
                platform: { value: '800V', details: { '最高电压': 871, '充电倍率': '4C'} }, 
                battery: { value: '麒麟电池', supplier: '宁德时代' }, 
                motor: { value: '超级电机V8s', supplier: '小米自研' }
            },
            body_structure: {
                body_casting: { value: '9100t 一体化压铸', supplier: '海天金属' }
            }
        },
    },
     {
        id: 'tesla-model3-2024',
        name: '特斯拉 Model 3 焕新版',
        brand: '特斯拉',
        model: 'Model 3',
        year: 2024,
        platform: 'Tesla 第三代平台',
        specs: {
            smart_driving: { 
                chip: { value: '自研 FSD Chip (HW 4.0)', supplier: '特斯拉' }, 
                lidar: null, 
                algorithm: { value: 'FSD V12', supplier: '特斯拉' }
            },
            smart_cockpit: { 
                chip: { value: 'AMD Ryzen', supplier: 'AMD' }, 
                screen: '15.4" 中控屏', 
                os: { value: 'Tesla OS', supplier: '特斯拉' }
            },
            power: { 
                platform: { value: '400V', details: { '最高电压': 400, '充电倍率': '2.5C'} }, 
                battery: { value: '磷酸铁锂', supplier: '宁德时代' }, 
                motor: { value: '后置永磁同步电机', supplier: '特斯拉' }
            },
        },
    },
];

export const mockSuppliers = [
    '华为', 'NVIDIA', '高通', '宁德时代', '禾赛科技', '特斯拉', 'AMD'
];
export const mockPlatforms = [
    '华为途灵平台', '理想增程2.0平台', '小米摩德纳平台', 'Tesla 第三代平台'
];

export const mockTechForecasts: NewTechForecast[] = [
    {
        id: 'fc1',
        brand: '小米',
        model: 'SU7',
        techDimensionKey: 'power',
        techName: '自研CTB一体化电池技术',
        status: 'confirmed',
        confidence: 0.95,
        sourceArticle: '小米汽车技术发布会官方纪要',
        sourceUrl: '#',
    },
    {
        id: 'fc2',
        brand: '问界',
        model: 'M9',
        techDimensionKey: 'chassis',
        techName: '华为途灵智能底盘',
        status: 'confirmed',
        confidence: 1.0,
        sourceArticle: '问界M9正式发布，搭载华为多项黑科技',
        sourceUrl: '#',
    },
    {
        id: 'fc3',
        brand: '理想',
        model: 'MEGA',
        techDimensionKey: 'power',
        techName: '5C麒麟电池',
        status: 'confirmed',
        confidence: 1.0,
        sourceArticle: '理想MEGA发布会，号称充电12分钟续航500公里',
        sourceUrl: '#',
    },
    {
        id: 'fc4',
        brand: '蔚来',
        model: 'ET9',
        techDimensionKey: 'chassis',
        techName: '天行智能底盘系统',
        status: 'confirmed',
        confidence: 0.9,
        sourceArticle: 'NIO Day 2023：蔚来发布行政旗舰轿车ET9',
        sourceUrl: '#',
    },
     {
        id: 'fc5',
        brand: '特斯拉',
        model: 'Cybertruck',
        techDimensionKey: 'body_structure',
        techName: '不锈钢外骨骼车身',
        status: 'confirmed',
        confidence: 1.0,
        sourceArticle: '特斯拉Cybertruck中国大陆巡展开启',
        sourceUrl: '#',
    },
     {
        id: 'fc6',
        brand: '小米',
        model: 'SU7',
        techDimensionKey: 'smart_driving',
        techName: '城市NOA将全量推送',
        status: 'rumored',
        confidence: 0.75,
        sourceArticle: '内部消息人士称小米智驾团队正在全力攻克城市NOA',
        sourceUrl: '#',
    },
     {
        id: 'fc7',
        brand: '苹果',
        model: 'Apple Car (已取消)',
        techDimensionKey: 'smart_driving',
        techName: 'L5级全自动驾驶',
        status: 'rumored',
        confidence: 0.2,
        sourceArticle: '传苹果汽车项目泰坦计划已取消',
        sourceUrl: '#',
    },
];
