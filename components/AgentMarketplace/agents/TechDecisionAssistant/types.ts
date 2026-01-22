
export type StepId = 'init' | 'route' | 'risk' | 'solution' | 'compare';

export interface ReportSection {
    id: StepId;
    title: string;
    status: 'pending' | 'generating' | 'review' | 'done';
    markdown: string;
    html?: string; // 兼容旧字段，但主要逻辑将迁移至 visuals
    visuals?: Record<string, string>; // 新增：Key为占位符tag, Value为生成的HTML
    logs?: string[];
    usedModel?: string; 
}

export interface TechEvalSessionData {
    techName: string;
    techDefinition?: string;
    searchQueries: string[];
    currentStepIndex: number; // 0 to 4
    sections: Record<StepId, ReportSection>;
    messages: ChatMessage[]; // UI 聊天记录
    llmContext?: Array<{ role: string; content: string }>; // LLM 全局上下文记忆
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string; // New: For thinking process
    timestamp: number;
}
