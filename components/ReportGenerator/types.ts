
import { StratifyOutline, InfoItem } from '../../types';

export type PPTStage = 'collect' | 'outline' | 'compose' | 'finalize';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    hidden?: boolean;
    reasoning?: string;
    model?: string; // Model used for generation
    
    // RAG Metadata
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
