
import { StratifyScenario } from '../../types';

// 仅保留场景选择所需的 props 定义
export interface ScenarioSelectorProps {
    scenarios: StratifyScenario[];
    onSelect: (scenario: StratifyScenario) => void;
}
