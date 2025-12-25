
import { StratifyTask, StratifyScenario } from '../../types';

export type AgentViewMode = 'picker' | 'workstation';

export interface AgentState {
    status: 'idle' | 'input' | 'processing' | 'completed' | 'failed';
    streamContent: string;
    thoughtContent: string;
    resultHtml?: string;
}

export interface ScenarioCardProps {
    scenario: StratifyScenario;
    onClick: () => void;
}
