
// src/api/stratify.ts

import { STRATIFY_SERVICE_PATH } from '../config';
import { StratifyTask, GenerateStreamParams, StratifyScenario, StratifyScenarioFile, StratifyQueueStatus, LLMChannel, StratifyPrompt } from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- 1. The Plumber: Universal Stream Generator ---

export const streamGenerate = async (
    params: GenerateStreamParams,
    onData: (text: string) => void,
    onDone?: () => void,
    onError?: (err: any) => void,
    onSessionId?: (sessionId: string) => void,
    onReasoning?: (text: string) => void
) => {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
        'Cache-Control': 'no-cache',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${STRATIFY_SERVICE_PATH}/generate/stream`, {
            method: 'POST',
            headers,
            body: JSON.stringify(params),
        });

        if (!response.ok) {
            throw new Error(`Stream Error: ${response.statusText}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) throw new Error("No reader available");

        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; 

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;

                const dataStr = trimmedLine.slice(6).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    
                    if (json.session_id && onSessionId) {
                        onSessionId(json.session_id);
                    }
                    if (json.content && onData) {
                        onData(json.content);
                    }
                    const reasoning = json.reasoning || json.reasoning_content;
                    if (reasoning && onReasoning) {
                        onReasoning(reasoning);
                    }
                } catch (e) {
                    console.warn("Stream parse error:", dataStr, e);
                }
            }
        }
        if (onDone) onDone();
    } catch (error) {
        console.error("Stream generation failed:", error);
        if (onError) onError(error);
    }
};

// --- 2. Scenario Management (Updated Endpoints) ---

export const getScenarios = (): Promise<StratifyScenario[]> =>
    apiFetch<StratifyScenario[]>(`${STRATIFY_SERVICE_PATH}/scenarios`);

export const createScenario = (data: { name: string; title: string; description: string; channel_code?: string; model_id?: string; workflow_config?: any }): Promise<StratifyScenario> =>
    apiFetch<StratifyScenario>(`${STRATIFY_SERVICE_PATH}/scenarios`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updateScenario = (id: string, data: { name?: string; title?: string; description?: string; channel_code?: string; model_id?: string; workflow_config?: any }): Promise<StratifyScenario> =>
    apiFetch<StratifyScenario>(`${STRATIFY_SERVICE_PATH}/scenarios/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deleteScenario = (id: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/scenarios/${id}`, {
        method: 'DELETE',
    });

// Legacy Prompt File Endpoints (Deprecated but kept for backward compatibility if needed)
export const getScenarioFiles = (scenarioId: string): Promise<StratifyScenarioFile[]> =>
    apiFetch<StratifyScenarioFile[]>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios/${scenarioId}/files`);

export const updateScenarioFile = (scenarioId: string, filename: string, content: string, model?: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios/${scenarioId}/files/${filename}`, {
        method: 'PUT',
        body: JSON.stringify({ name: filename, content, model }),
    });

export const deleteScenarioFile = (scenarioId: string, filename: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios/${scenarioId}/files/${filename}`, {
        method: 'DELETE',
    });

// --- 2.1 Prompt Management (New) ---

export const getPrompts = (params: any = {}): Promise<StratifyPrompt[]> => {
    const query = createApiQuery(params);
    return apiFetch<StratifyPrompt[]>(`${STRATIFY_SERVICE_PATH}/prompts${query}`);
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


export const getAvailableModels = (): Promise<string[]> =>
    apiFetch<string[]>(`${STRATIFY_SERVICE_PATH}/common/models`);

// --- 3. Persistence (CRUD) ---

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

// --- 4. System Status ---

export const getStratifyQueueStatus = (): Promise<StratifyQueueStatus> =>
    apiFetch<StratifyQueueStatus>(`${STRATIFY_SERVICE_PATH}/queue/status`);

// --- 5. Assets & Others ---

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

export const parseLlmJson = <T>(text: string): T | null => {
    try {
        let cleanText = text;
        if (text.includes("---FINAL_JSON_OUTPUT---")) {
            cleanText = text.split("---FINAL_JSON_OUTPUT---")[1].trim();
        }
        const jsonMatch = cleanText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) return JSON.parse(jsonMatch[1]);
        return JSON.parse(cleanText);
    } catch (e) {
        return null;
    }
};

// --- 6. LLM Channel Management (New) ---

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

// --- 7. OpenAI Compatible Gateway (New) ---

export const chatCompletions = (data: { model: string; messages: any[]; stream?: boolean; temperature?: number }): Promise<any> => {
    // Note: For streaming, specialized handling (like fetch + reader) is preferred over apiFetch which awaits JSON.
    // This helper assumes non-streaming or returns the raw response for the caller to handle stream if stream=true
    return apiFetch(`${STRATIFY_SERVICE_PATH}/v1/chat/completions`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};
