
export interface Message {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    reasoning?: string; // 新增：思考过程
    stage?: 'analysis' | 'visual'; // 标记这条消息属于哪个阶段
    timestamp: number;
}

export type WorkStage = 'analysis' | 'visual';

export interface ScenarioState {
    stage: WorkStage;
    topic: string;
    analysisContent: string; // Markdown content
    visualCode: string; // HTML content
    messages: Message[];
    isStreaming: boolean;
}
