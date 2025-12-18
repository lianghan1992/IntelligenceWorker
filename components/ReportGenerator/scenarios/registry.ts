
import React from 'react';
import { DefaultScenario } from './default/DefaultScenario';
import { TechEvalScenario } from './tech_eval/TechEvalScenario';

// 场景组件的 Props 定义
export interface ScenarioProps {
    taskId: string;
    topic: string;
    scenario: string;
    sessionId: string;
    context?: any;
    onComplete: () => void;
}

/**
 * 场景注册表：Key 必须对应后端返回的 technical name (slug) 或 UUID
 */
export const SCENARIO_REGISTRY: Record<string, React.FC<ScenarioProps>> = {
    'default': DefaultScenario,
    '通用PPT生成': DefaultScenario,
    // 新增：新技术评估场景 (通过 UUID 或名称映射)
    '50de3a59-0502-4202-9ddb-36ceb07fb3f1': TechEvalScenario,
    'tech_evaluation': TechEvalScenario,
};

// 辅助函数：判断场景是否已在前端实现
export const isScenarioSupported = (name: string) => {
    return !!SCENARIO_REGISTRY[name];
};
