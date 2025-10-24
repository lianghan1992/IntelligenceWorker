import { TechDimensionCategory, VehicleTechSpec } from '../../types';

export const techDimensions: TechDimensionCategory[] = [
    {
        key: 'cockpit',
        label: '智能座舱',
        subDimensions: [
            { key: 'chip', label: '座舱芯片', description: '智能座舱域控制器的主芯片' },
            { key: 'os', label: '操作系统', description: '车载操作系统' },
            { key: 'screen_config', label: '屏幕配置', description: '中控、副驾、仪表、后排等屏幕' },
            { key: 'voice_assistant', label: '语音助手', description: '语音交互能力' },
        ],
    },
    {
        key: 'driving',
        label: '智能驾驶',
        subDimensions: [
            { key: 'chip', label: '智驾芯片', description: '智能驾驶域控制器的主芯片' },
            { key: 'lidar', label: '激光雷达', description: '激光雷达配置及供应商' },
            { key: 'functions', label: '辅助驾驶功能', description: '支持的L2/L2+功能' },
            { key: 'city_pilot', label: '城市领航', description: '城市NOA/NGP等功能' },
        ],
    },
    {
        key: 'powertrain',
        label: '三电系统',
        subDimensions: [
            { key: 'platform_voltage', label: '高压平台', description: '整车高压平台电压' },
            { key: 'battery_capacity', label: '电池容量', description: '动力电池总容量(kWh)' },
            { key: 'battery_chemistry', label: '电芯类型', description: '电池化学体系' },
            { key: 'motor_power', label: '电机功率', description: '驱动电机总功率(kW)' },
        ],
    },
];

export const vehicleSpecs: VehicleTechSpec[] = [
    {
        id: 'li-l7-2024',
        name: '理想 L7 2024款',
        brand: '理想',
        model: 'L7',
        year: 2024,
        platform: '理想增程2.0平台',
        specs: {
            cockpit: {
                chip: { value: '高通骁龙8295', supplier: 'Qualcomm' },
                os: '理想 OS',
                screen_config: '15.7英寸中控 + 15.7英寸副驾',
                voice_assistant: '理想同学',
            },
            driving: {
                chip: { value: 'NVIDIA Orin-X', supplier: 'NVIDIA' },
                lidar: { value: '1颗', supplier: '禾赛' },
                functions: 'ACC, LKA, AEB',
                city_pilot: '城市NOA',
            },
            powertrain: {
                platform_voltage: '400V',
                battery_capacity: { value: '42.8 kWh', supplier: '宁德时代' },
                battery_chemistry: '三元锂',
                motor_power: '330 kW',
            }
        }
    },
    {
        id: 'nio-et7-2024',
        name: '蔚来 ET7 2024款',
        brand: '蔚来',
        model: 'ET7',
        year: 2024,
        platform: 'NT2.0平台',
        specs: {
            cockpit: {
                chip: { value: '高通骁龙8155', supplier: 'Qualcomm' },
                os: 'Banyan OS',
                screen_config: '12.8英寸中控 + 10.2英寸仪表',
                voice_assistant: 'NOMI',
            },
            driving: {
                chip: { value: '4x NVIDIA Orin-X', supplier: 'NVIDIA' },
                lidar: { value: '1颗', supplier: '图达通' },
                functions: 'ACC, LKA, AEB, NOP+',
                city_pilot: '城市NOP+',
            },
            powertrain: {
                platform_voltage: '400V',
                battery_capacity: { value: '100 kWh', supplier: '宁德时代/卫蓝' },
                battery_chemistry: '三元锂/半固态',
                motor_power: '480 kW',
            }
        }
    },
    {
        id: 'xiaomi-su7-2024',
        name: '小米 SU7 2024款',
        brand: '小米',
        model: 'SU7',
        year: 2024,
        platform: '小米摩德纳平台',
        specs: {
            cockpit: {
                chip: { value: '高通骁龙8295', supplier: 'Qualcomm' },
                os: '澎湃 OS',
                screen_config: '16.1英寸中控 + 7.1英寸仪表',
                voice_assistant: '小爱同学',
            },
            driving: {
                chip: { value: '2x NVIDIA Orin-X', supplier: 'NVIDIA' },
                lidar: { value: '1颗', supplier: '禾赛' },
                functions: 'ACC, LKA, AEB, 高速NOA',
                city_pilot: '城市NOA (规划中)',
            },
            powertrain: {
                platform_voltage: '800V',
                battery_capacity: { value: '101 kWh', supplier: '宁德时代' },
                battery_chemistry: '三元锂 (麒麟电池)',
                motor_power: '495 kW',
            }
        }
    },
    {
        id: 'avita-12-2024',
        name: '阿维塔 12 2024款',
        brand: '阿维塔',
        model: '12',
        year: 2024,
        platform: 'CHN平台',
        specs: {
            cockpit: {
                chip: { value: '麒麟990A', supplier: '华为' },
                os: '鸿蒙 OS',
                screen_config: '15.6英寸中控 + 35.4英寸带鱼屏',
                voice_assistant: '小塔',
            },
            driving: {
                chip: { value: '华为MDC 810', supplier: '华为' },
                lidar: { value: '3颗', supplier: '华为' },
                functions: 'ACC, LKA, AEB, 高速NCA',
                city_pilot: '城市NCA',
            },
            powertrain: {
                platform_voltage: '800V',
                battery_capacity: { value: '94.5 kWh', supplier: '宁德时代' },
                battery_chemistry: '三元锂',
                motor_power: '425 kW',
            }
        }
    },
];
