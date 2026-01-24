
import { StratifyOutline, InfoItem } from '../../types';

export type PPTStage = 'collect' | 'outline' | 'compose' | 'finalize';

export interface ChatMessage {
    id: string; // Added id
    role: 'system' | 'user' | 'assistant' | 'tool'; // Added tool
    content: string;
    hidden?: boolean;
    reasoning?: string;
    model?: string; // Model used for generation
    timestamp?: number;
    
    // RAG Metadata
    isRetrieving?: boolean; // Is currently searching?
    searchQuery?: string;   // What was searched
    retrievedItems?: InfoItem[]; // Results found
    webResults?: any[]; // Added webResults
    toolType?: string; // Added toolType ('kb' | 'web')

    // Tool calling support
    tool_calls?: any[]; // Added
    tool_call_id?: string; // Added
    
    // UI Metadata
    uiState?: any; // For flexible UI states
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
