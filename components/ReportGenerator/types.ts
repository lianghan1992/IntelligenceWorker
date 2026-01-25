
import { StratifyOutline, InfoItem } from '../../types';

export type PPTStage = 'collect' | 'outline' | 'compose' | 'finalize';

export interface ToolCall {
    id: string;
    type: 'function';
    function: {
        name: string;
        arguments: string;
    };
}

export interface ChatMessage {
    id?: string;
    role: 'system' | 'user' | 'assistant' | 'tool'; // Added 'tool' role
    content: string;
    hidden?: boolean;
    reasoning?: string;
    model?: string; // Model used for generation
    timestamp?: number;
    
    // Agent Metadata
    tool_calls?: ToolCall[];
    tool_call_id?: string;

    // RAG Metadata (UI State)
    isRetrieving?: boolean; // Is currently searching?
    searchQuery?: string;   // What was searched
    retrievedItems?: InfoItem[]; // Results found
}

export interface PPTPageData {
    title: string;
    summary: string;
    content: string;
    html?: string;
    isGenerating?: boolean;
    chatHistory?: ChatMessage[]; // Store context for redesigning this specific page
}

export interface PPTData {
    topic: string;
    referenceMaterials: string;
    outline: StratifyOutline | null;
    pages: PPTPageData[];
}

export interface SharedGeneratorProps {
    sessionId?: string;
    onRefreshSession?: () => void;
    onHandleInsufficientBalance?: () => void;
}
