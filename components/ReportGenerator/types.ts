
export interface AgentState {
    status: 'idle' | 'input' | 'processing' | 'completed' | 'failed';
    currentPhase?: string;
    progress?: number;
    streamContent?: string;
    thoughtContent?: string;
    result?: any;
}

export interface ContextData {
    files: Array<{ name: string; url: string; type: string }>;
    vector_snippets: Array<{ title: string; content: string }>;
    url_content: Array<{ title: string; url: string; content: string }>;
}
