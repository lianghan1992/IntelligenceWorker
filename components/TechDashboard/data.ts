import { TechDimensionCategory, VehicleTechSpec, NewTechForecast } from '../../types';

export const techDimensionCategories: TechDimensionCategory[] = [
    {
        key: 'smart_cockpit',
        label: '智能座舱',
        subDimensions: [
            { key: 'cockpit_chip', label: '座舱芯片', description: '智能座舱SoC芯片型号' },
            { key: 'os', label: '操作系统', description: '车载操作系统' },
            { key: 'center_screen', label: '中控屏', description: '中控屏幕尺寸及分辨率' },
            { key: 'instrument_screen', label: '仪表盘', description: '仪表盘屏幕尺寸及类型' },
            { key: 'hud', label: 'HUD', description: '抬头显示系统类型及参数' },
            { key: 'voice_assistant', label: '语音助手', description: '语音助手功能和唤醒词' },
        ],
    },
    {
        key: 'smart_driving',
        label: '智能驾驶',
        subDimensions: [
            { key: 'driving_chip', label: '智驾芯片', description: '智能驾驶SoC芯片型号及总算力' },
            { key: 'lidar', label: '激光雷达', description: '激光雷达数量和型号' },
            { key: 'camera', label: '摄像头', description: '摄像头数量和类型' },
            { key: 'radar', label: '毫米波雷达', description: '毫米波雷达数量' },
            { key: 'driving_level', label: '辅助驾驶等级', description: '系统达到的辅助驾驶等级' },
            { key: 'highway_pilot', label: '高速领航', description: '是否支持高速领航辅助驾驶' },
            { key: 'city_pilot', label: '城市领航', description: '是否支持城市领航辅助驾驶' },
        ],
    },
    {
        key: 'powertrain',
        label: '动力系统',
        subDimensions: [
            { key: 'engine_type', label: '动力类型', description: '纯电、插混、增程等' },
            { key: 'battery_capacity', label: '电池容量', description: '单位 kWh' },
            { key: 'cltc_range', label: 'CLTC续航', description: '单位 km' },
            { key: 'max_power', label: '最大功率', description: '单位 kW' },
            { key: 'max_torque', label: '最大扭矩', description: '单位 N·m' },
        ],
    },
];

export const vehicleTechSpecs: VehicleTechSpec[] = [
    {
        id: 'li-l9-2023',
        name: '理想 L9 2023款 Max',
        brand: '理想',
        model: 'L9',
        year: 2023,
        platform: '理想增程2.0平台',
        specs: {
            smart_cockpit: {
                cockpit_chip: { value: '高通骁龙8155 x2' },
                os: 'LI OS',
                center_screen: '15.7英寸 3K OLED',
                instrument_screen: '4.82英寸 Mini-LED',
                hud: '13.35英寸 高清HUD',
                voice_assistant: '理想同学',
            },
            smart_driving: {
                driving_chip: { value: 'NVIDIA Drive Orin-X x2', details: { '算力': '508 TOPS' } },
                lidar: { value: '1颗', supplier: '禾赛AT128' },
                camera: '11颗',
                radar: '1颗',
                driving_level: 'L2+',
                highway_pilot: '支持',
                city_pilot: '支持',
            },
            powertrain: {
                engine_type: '增程式',
                battery_capacity: '44.5 kWh',
                cltc_range: '1315 km (综合)',
                max_power: '330 kW',
                max_torque: '620 N·m',
            },
        },
    },
    {
        id: 'nio-es8-2023',
        name: '蔚来 ES8 2023款',
        brand: '蔚来',
        model: 'ES8',
        year: 2023,
        platform: 'NT2.0平台',
        specs: {
            smart_cockpit: {
                cockpit_chip: { value: '高通骁龙8155' },
                os: 'Banyan',
                center_screen: '12.8英寸 AMOLED',
                instrument_screen: '10.2英寸 HDR',
                hud: '9.3英寸 增强HUD',
                voice_assistant: 'NOMI',
            },
            smart_driving: {
                driving_chip: { value: 'NVIDIA Drive Orin-X x4', details: { '算力': '1016 TOPS' } },
                lidar: { value: '1颗', supplier: '图达通' },
                camera: '11颗',
                radar: '5颗',
                driving_level: 'L2++',
                highway_pilot: '支持',
                city_pilot: '支持 (NOP+)',
            },
            powertrain: {
                engine_type: '纯电动',
                battery_capacity: '100 kWh',
                cltc_range: '605 km',
                max_power: '480 kW',
                max_torque: '850 N·m',
            },
        },
    },
    {
        id: 'xpeng-g9-2024',
        name: '小鹏 G9 2024款',
        brand: '小鹏',
        model: 'G9',
        year: 2024,
        platform: '800V高压SiC平台',
        specs: {
            smart_cockpit: {
                cockpit_chip: { value: '高通骁龙8155' },
                os: 'Xmart OS 4.0',
                center_screen: '14.96英寸 2K',
                instrument_screen: '10.25英寸 LCD',
                hud: null,
                voice_assistant: '全场景语音2.0',
            },
            smart_driving: {
                driving_chip: { value: 'NVIDIA Drive Orin-X x2', details: { '算力': '508 TOPS' } },
                lidar: { value: '2颗', supplier: '速腾聚创' },
                camera: '12颗',
                radar: '5颗',
                driving_level: 'L2++',
                highway_pilot: '支持 (NGP)',
                city_pilot: '支持 (XNGP)',
            },
            powertrain: {
                engine_type: '纯电动',
                battery_capacity: '98 kWh',
                cltc_range: '702 km',
                max_power: '405 kW',
                max_torque: '717 N·m',
            },
        },
    },
     {
        id: 'aito-m9-2024',
        name: '问界 M9 2024款',
        brand: '问界',
        model: 'M9',
        year: 2024,
        platform: '途灵智能底盘',
        specs: {
            smart_cockpit: {
                cockpit_chip: { value: '麒麟990A' },
                os: 'HarmonyOS 4',
                center_screen: '3块 (15.6+16+10.25)',
                instrument_screen: '12.3英寸 LCD',
                hud: '75英寸 AR-HUD',
                voice_assistant: '小艺智慧语音',
            },
            smart_driving: {
                driving_chip: { value: 'MDC 810', details: { '算力': '400 TOPS' } },
                lidar: { value: '1颗', supplier: '禾赛' },
                camera: '11颗',
                radar: '3颗',
                driving_level: 'L2++',
                highway_pilot: '支持',
                city_pilot: '支持 (NCA)',
            },
            powertrain: {
                engine_type: '增程式',
                battery_capacity: '42 kWh',
                cltc_range: '1362 km (综合)',
                max_power: '365 kW',
                max_torque: '675 N·m',
            },
        },
    }
];

export const newTechForecasts: NewTechForecast[] = [
    {
        id: 'forecast-1',
        brand: '蔚来',
        model: 'ET9',
        techDimensionKey: 'smart_driving',
        techName: '自研智驾芯片 (神玑NX9031)',
        status: 'confirmed',
        confidence: 0.95,
        firstDisclosedAt: '2023-12-23',
        lastUpdatedAt: '2024-01-15',
        sourceArticle: '蔚来NIO Day 2023发布会',
        sourceUrl: 'https://www.nio.cn/nio-day-2023'
    },
    {
        id: 'forecast-2',
        brand: '理想',
        model: 'MEGA',
        techDimensionKey: 'powertrain',
        techName: '5C麒麟电池，充电12分钟续航500公里',
        status: 'confirmed',
        confidence: 1.0,
        firstDisclosedAt: '2023-11-17',
        lastUpdatedAt: '2024-03-01',
        sourceArticle: '理想MEGA发布会',
        sourceUrl: 'https://www.lixiang.com/mega'
    },
    {
        id: 'forecast-3',
        brand: '特斯拉',
        model: 'Model 2 (暂定)',
        techDimensionKey: 'powertrain',
        techName: '下一代紧凑型平台，制造成本降低50%',
        status: 'rumored',
        confidence: 0.8,
        firstDisclosedAt: '2023-03-01',
        lastUpdatedAt: '2024-05-20',
        sourceArticle: '特斯拉投资者日 & 各路媒体报道',
        sourceUrl: '#'
    }
];
