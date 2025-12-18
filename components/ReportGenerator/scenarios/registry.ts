
import React from 'react';
import { DefaultScenario } from './default/DefaultScenario';

// 场景组件的 Props 定义
export interface ScenarioProps {
    taskId: string;
    topic: string;
    scenario: string;
    sessionId: string;
    context?: any;
    onComplete: () => void;
}

// 场景注册表：Key 必须对应后端返回的 scenario_name
export const SCENARIO_REGISTRY: Record<string, React.FC<ScenarioProps>> = {
    'default': DefaultScenario,
    // 未来在这里增加新场景，例如：
    // 'tech_report': TechReportScenario,
};

// 辅助函数：判断场景是否已在前端实现
export const isScenarioSupported = (name: string) => {
    return !!SCENARIO_REGISTRY[name];
};
