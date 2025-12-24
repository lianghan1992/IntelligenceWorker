
import React from 'react';
import { TechEvalScenario } from './tech_eval/TechEvalScenario';
import { GeneralPptScenario } from './general_ppt/GeneralPptScenario';
import { InnovationTechScenario } from './innovation_tech/InnovationTechScenario';
import { StratifyScenario, StratifyTask } from '../../../types';

// 场景组件的 Props 定义
export interface ScenarioProps {
    taskId: string;
    topic: string;
    scenario: string;
    sessionId: string;
    context?: any;
    onComplete: () => void;
    initialTask?: StratifyTask | null; // 用于传入历史任务数据进行状态恢复
}

/**
 * 场景注册表
 * Key 建议同时配置 UUID 和 别名(name)，以确保无论后端返回哪种标识符都能匹配
 */
export const SCENARIO_REGISTRY: Record<string, React.FC<ScenarioProps>> = {
    // 通用场景 (已迁移至 general_ppt 模块)
    'default': GeneralPptScenario,
    
    // 通用PPT生成 (独立模块)
    '89dc71e5-ee59-4cbc-9b21-24518176c0b1': GeneralPptScenario,
    'general_ppt': GeneralPptScenario,
    '通用PPT生成': GeneralPptScenario,
    
    // 新技术评估场景
    '50de3a59-0502-4202-9ddb-36ceb07fb3f1': TechEvalScenario,
    'tech_evaluation': TechEvalScenario,
    'tech_assessment': TechEvalScenario, // 修复：兼容历史数据的命名
    '新技术评估': TechEvalScenario,

    // 创新技术分析场景 (New)
    '43a73bc4-0fae-4aa7-8854-e4fdfaf89a07': InnovationTechScenario,
    'innovation_tech_analysis': InnovationTechScenario,
    '创新技术分析': InnovationTechScenario,
    'NewTechnologyIdentification': InnovationTechScenario, // 新增：映射后端场景名
};

/**
 * 辅助函数：判断场景是否已在前端实现
 * 同时检查 ID 和 Name 字段
 */
export const isScenarioSupported = (scenario: StratifyScenario) => {
    return !!SCENARIO_REGISTRY[scenario.id] || !!SCENARIO_REGISTRY[scenario.name];
};

/**
 * 辅助函数：根据场景对象获取对应的组件
 */
export const getScenarioComponent = (scenario: StratifyScenario | string) => {
    if (typeof scenario === 'string') return SCENARIO_REGISTRY[scenario];
    return SCENARIO_REGISTRY[scenario.id] || SCENARIO_REGISTRY[scenario.name];
};
