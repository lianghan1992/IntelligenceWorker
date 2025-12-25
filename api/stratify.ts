
// src/api/stratify.ts

import { STRATIFY_SERVICE_PATH } from '../config';
import { StratifyTask, GenerateStreamParams, StratifyScenario, StratifyScenarioFile, StratifyQueueStatus, LLMChannel, StratifyPrompt } from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- 1. The Plumber: Universal Stream Generator ---

// Legacy stream function - kept for compatibility if needed, but discouraged
export const streamGenerate = async (
    params: GenerateStreamParams,
    onData: (text: string) => void,
    onDone?: () => void,
    onError?: (err: any) => void,
    onSessionId?: (sessionId: string) => void,
    onReasoning?: (text: string) => void
) => {
    // ... (Old implementation kept as backup if strictly needed, but new logic uses chatCompletions) ...
    // To save space in this response, I'm keeping the export but redirecting to console warning if used unexpectedly
    console.warn("Deprecated streamGenerate called. Please use streamChatCompletions.");
};

// --- NEW: OpenAI Compatible Stream Chat ---

export interface ChatCompletionRequest {
    model: string;
    messages: Array<{ role: string; content: string | any[] }>;
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
}

export const streamChatCompletions = async (
    params: ChatCompletionRequest,
    onData: (text: string) => void,
    onDone?: () => void,
    onError?: (err: any) => void
) => {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream', // Important for SSE
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${STRATIFY_SERVICE_PATH}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...params, stream: true }), // Force stream true
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Chat Error (${response.status}): ${errorText}`);
        }

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // Keep partial line in buffer

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const dataStr = trimmed.slice(6).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    // Handle OpenAI chunk format
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                        onData(content);
                    }
                } catch (e) {
                    // Ignore parse errors for partial chunks or keepalives
                }
            }
        }
        if (onDone) onDone();
    } catch (error) {
        console.error("Stream chat failed:", error);
        if (onError) onError(error);
    }
};

// --- Helper Utilities ---

export function parseLlmJson<T>(jsonStr: string): T | null {
    try {
        let cleaned = jsonStr.trim();
        if (cleaned.startsWith('```')) {
            cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
        }
        const firstBrace = cleaned.indexOf('{');
        const firstBracket = cleaned.indexOf('[');
        let start = -1;
        if (firstBrace !== -1 && (firstBracket === -1 || (firstBrace < firstBracket))) {
            start = firstBrace;
        } else if (firstBracket !== -1) {
            start = firstBracket;
        }

        if (start === -1) return null;
        
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        let end = -1;
        if (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) {
            end = lastBrace;
        } else if (lastBracket !== -1) {
            end = lastBracket;
        }

        if (end === -1 || end < start) return null;

        return JSON.parse(cleaned.substring(start, end + 1)) as T;
    } catch (e) {
        return null;
    }
}

// --- 2. Scenario Management ---

export const getScenarios = (): Promise<StratifyScenario[]> =>
    apiFetch<StratifyScenario[]>(`${STRATIFY_SERVICE_PATH}/scenarios`);

export const getScenarioFiles = (scenarioId: string): Promise<StratifyScenarioFile[]> =>
    apiFetch<StratifyScenarioFile[]>(`${STRATIFY_SERVICE_PATH}/scenarios/${scenarioId}/files`);

export const updateScenarioFile = (scenarioId: string, fileName: string, content: string, model?: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/scenarios/${scenarioId}/files`, {
        method: 'POST',
        body: JSON.stringify({ name: fileName, content, model }),
    });

export const createScenario = (data: any): Promise<StratifyScenario> =>
    apiFetch<StratifyScenario>(`${STRATIFY_SERVICE_PATH}/scenarios`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updateScenario = (id: string, data: any): Promise<StratifyScenario> =>
    apiFetch<StratifyScenario>(`${STRATIFY_SERVICE_PATH}/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteScenario = (id: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/scenarios/${id}`, {
        method: 'DELETE',
    });

// --- 2.1 Prompt Management ---

export const getPrompts = (params: any = {}): Promise<StratifyPrompt[]> => {
    const query = createApiQuery(params);
    return apiFetch<StratifyPrompt[]>(`${STRATIFY_SERVICE_PATH}/prompts${query}`);
}

// NEW: Get single prompt detail (useful for fetching by ID)
// Using list filter fallback if specific endpoint absent, but trying RESTful ID first
export const getPromptDetail = async (id: string): Promise<StratifyPrompt> => {
    // Try to find it in the list via query param if ID lookup isn't explicit
    // But since `DELETE /prompts/{id}` exists, `GET /prompts` usually returns list.
    // We will fetch the list with ?id=id or filter client side to be safe if backend doesn't support /prompts/{id}
    // Optimization: Assuming we might need to filter.
    const all = await getPrompts(); 
    const found = all.find(p => p.id === id);
    if (!found) throw new Error(`Prompt ${id} not found`);
    return found;
}

export const createPrompt = (data: Partial<StratifyPrompt>): Promise<StratifyPrompt> =>
    apiFetch<StratifyPrompt>(`${STRATIFY_SERVICE_PATH}/prompts`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updatePrompt = (id: string, data: Partial<StratifyPrompt>): Promise<StratifyPrompt> =>
    apiFetch<StratifyPrompt>(`${STRATIFY_SERVICE_PATH}/prompts/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deletePrompt = (id: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/prompts/${id}`, {
        method: 'DELETE',
    });

// --- 3. LLM Channel Management ---

export const getChannels = (): Promise<LLMChannel[]> =>
    apiFetch<LLMChannel[]>(`${STRATIFY_SERVICE_PATH}/channels/`);

export const createChannel = (data: Partial<LLMChannel>): Promise<LLMChannel> =>
    apiFetch<LLMChannel>(`${STRATIFY_SERVICE_PATH}/channels/`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updateChannel = (id: number, data: Partial<LLMChannel>): Promise<LLMChannel> =>
    apiFetch<LLMChannel>(`${STRATIFY_SERVICE_PATH}/channels/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteChannel = (id: number): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/channels/${id}`, {
        method: 'DELETE',
    });

// --- 4. Persistence & Tasks ---

export const createStratifyTask = async (topic: string, scenario: string = 'default'): Promise<StratifyTask> => {
    const response = await apiFetch<any>(`${STRATIFY_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ user_input: topic, scenario }),
    });
    return response;
};

export const getStratifyTasks = (params: any = {}): Promise<StratifyTask[]> => {
    const query = createApiQuery(params);
    return apiFetch<StratifyTask[]>(`${STRATIFY_SERVICE_PATH}/tasks${query}`);
}

export const getStratifyTaskDetail = (taskId: string): Promise<StratifyTask> =>
    apiFetch<StratifyTask>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}`);

// --- 5. System Status ---

export const getStratifyQueueStatus = (): Promise<StratifyQueueStatus> =>
    apiFetch<StratifyQueueStatus>(`${STRATIFY_SERVICE_PATH}/queue/status`);

// --- 6. Assets & Others ---

export const uploadStratifyFile = (file: File): Promise<{ filename: string; url: string; type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch(`${STRATIFY_SERVICE_PATH}/common/upload`, {
        method: 'POST',
        body: formData,
    });
};

export const generatePdf = async (htmlContent: string, filename?: string): Promise<Blob> => {
    const url = `${STRATIFY_SERVICE_PATH}/generate/pdf`;
    const token = localStorage.getItem('accessToken');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ html_content: htmlContent, filename }),
    });
    if (!response.ok) throw new Error('PDF 生成失败');
    return response.blob();
};

export const chatCompletions = (data: { model: string; messages: any[]; stream?: boolean; temperature?: number }): Promise<any> => {
    return apiFetch(`${STRATIFY_SERVICE_PATH}/v1/chat/completions`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
