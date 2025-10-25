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
            body_structure: {
                body_casting: null
            }
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
            body_structure: {
                body_casting: null
            }
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
            body_structure: {
                body_casting: null
            }
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
            body_structure: {
                body_casting: null
            }
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
            body_structure: {
                body_casting: null
            }
        },
    },
];

export const mockSuppliers = [
    '华为', 'NVIDIA', '高通', '宁德时代', '禾赛科技', '特斯拉', 'AMD', '海天金属'
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
        firstDisclosedAt: '2023-12-28',
        lastUpdatedAt: '2024-03-28',
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
        firstDisclosedAt: '2023-12-26',
        lastUpdatedAt: '2023-12-26',
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
        firstDisclosedAt: '2024-03-01',
        lastUpdatedAt: '2024-03-01',
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
        firstDisclosedAt: '2023-12-23',
        lastUpdatedAt: '2024-04-10',
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
        firstDisclosedAt: '2019-11-21',
        lastUpdatedAt: '2024-01-30',
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
        firstDisclosedAt: '2024-04-25',
        lastUpdatedAt: '2024-05-30',
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
        firstDisclosedAt: '2021-01-10',
        lastUpdatedAt: '2024-02-28',
        sourceArticle: '传苹果汽车项目泰坦计划已取消',
        sourceUrl: '#',
    },
    {
        id: 'fc8',
        brand: '小米',
        model: 'SU7',
        techDimensionKey: 'smart_driving',
        techName: '端到端模型上车',
        status: 'rumored',
        confidence: 0.60,
        firstDisclosedAt: '2024-06-15',
        lastUpdatedAt: '2024-06-15',
        sourceArticle: '行业分析师预测小米将在年底前测试新的端到端自动驾驶模型',
        sourceUrl: '#',
      },
      {
        id: 'fc9',
        brand: '小米',
        model: 'SU7',
        techDimensionKey: 'smart_driving',
        techName: '哨兵模式2.0（支持远程视频）',
        status: 'rumored',
        confidence: 0.85,
        firstDisclosedAt: '2024-05-20',
        lastUpdatedAt: '2024-06-10',
        sourceArticle: '小米社区用户反馈希望增加远程视频功能的哨兵模式',
        sourceUrl: '#',
      },
];

export const mockAIAnalyses: Record<string, string> = {
    'SU7': '小米SU7正全力冲刺高阶智能驾驶，意图在软件定义汽车的下半场竞争中抢占先机。',
    'M9': '问界M9依托华为全栈技术，在智驾与座舱体验上持续引领，构筑核心壁垒。',
    'MEGA': '理想MEGA通过押注极致的补能效率（5C快充）来定义高端纯电市场，试图在续航焦虑之外开辟新的核心竞争维度。'
};

export const mockTechDimensionAnalyses: Record<string, string> = {
    '小米-smart_driving': '小米在城市NOA和端到端模型上双线发力，展现出追赶第一梯队的决心。',
    '小米-body_structure': '已量产9100t一体化压铸技术，在车身制造工艺上达到行业领先水平。',
    '特斯拉-smart_driving': '纯视觉方案持续迭代，FSD V12的端到端模型是其核心护城河，但Lidar的缺失在部分场景下仍存争议。',
};

export const mockBrandAnalyses: Record<string, string> = {
    '小米': '小米正以‘智能驾驶+智能座舱’为双核心，发挥其在消费电子领域的深厚积累和‘人车家全生态’战略优势，旨在打造极致的无缝用户体验，并通过快速的软件迭代挑战市场现有格局。',
    '问界': '问界深度绑定华为，其核心竞争力在于全栈自研的技术整合能力，通过HI模式将ICT技术赋能汽车，致力于打造“移动的智能空间”。',
    '理想': '理想汽车精准卡位家庭用户，以“增程”技术快速占领市场，并逐步向纯电转型。其产品定义能力和对用户需求的深刻理解是其成功的关键。',
    '蔚来': '蔚来坚持高端品牌定位，通过“换电”模式和极致的用户服务体系构建了强大的品牌护城河，但在成本控制和规模化盈利方面仍面临挑战。',
    '特斯拉': '特斯拉以“第一性原理”颠覆行业，其在三电系统、自动驾驶和生产制造（一体化压铸）方面持续引领，是全球智能电动汽车的标杆。'
};
