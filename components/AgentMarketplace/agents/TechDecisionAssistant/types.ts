export type StepId = 'init' | 'route' | 'risk' | 'solution' | 'compare';

export interface ReportSection {
    id: StepId;
    title: string;
    status: 'pending' | 'generating' | 'review' | 'done';
    markdown: string;
    html?: string;
    logs?: string[];
    usedModel?: string; // 新增：记录该步骤使用的模型 (e.g. zhipu@glm-4-flash)
}

export interface TechEvalSessionData {
    techName: string;
    techDefinition?: string;
    searchQueries: string[];
    currentStepIndex: number; // 0 to 4
    sections: Record<StepId, ReportSection>;
    messages: ChatMessage[];
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: number;
}