
// src/api/stratify.ts

import { STRATIFY_SERVICE_PATH } from '../config';
import { StratifyTask, GenerateStreamParams, StratifyScenario, StratifyScenarioFile, StratifyQueueStatus, LLMChannel, StratifyPrompt, ModelPricing, AgentSession, SessionSnapshot, UsageStat, UsageSummary } from '../types';
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
    console.warn("Deprecated streamGenerate called. Please use streamChatCompletions.");
};

// --- NEW: OpenAI Compatible Stream Chat ---

export interface ChatCompletionRequest {
    model: string;
    messages: Array<{ role: string; content: string | any[] }>;
    tools?: any[];
    tool_choice?: string | object;
    stream?: boolean;
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
    enable_billing?: boolean;
}

/**
 * 核心修改：
 * 1. URL 修正为 StratifyAI 标准网关路径 /v1/chat/completions
 * 2. 强制传递 X-Session-ID 以确保计费准确
 * 3. 支持 X-App-ID 用于应用级计费追踪
 * 4. 新增 signal 参数支持请求中断
 */
export const streamChatCompletions = async (
    params: ChatCompletionRequest,
    onData: (data: { content?: string; reasoning?: string; tool_calls?: any[] }) => void,
    onDone?: () => void,
    onError?: (err: any) => void,
    sessionId?: string, // Added sessionId support
    appId?: string,      // Added appId support for X-App-ID
    signal?: AbortSignal // Added AbortSignal
) => {
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (sessionId) {
        // @ts-ignore
        headers['X-Session-ID'] = sessionId;
    } else {
        console.warn("streamChatCompletions called without sessionId. Billing may not be tracked.");
    }

    if (appId) {
        // @ts-ignore
        headers['X-App-ID'] = appId;
    }

    try {
        const response = await fetch(`${STRATIFY_SERVICE_PATH}/v1/chat/completions`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...params, stream: true }),
            signal // Pass the signal to fetch
        });

        // Specific handling for 402 Payment Required (Standard HTTP Code)
        if (response.status === 402) {
            throw new Error("INSUFFICIENT_BALANCE");
        }

        if (!response.ok) {
            const errorText = await response.text();
            
            // Enhanced Error Detection: Check body for "Insufficient balance" or "402" 
            // even if the status code is 500 or others.
            if (errorText.includes("Insufficient balance") || errorText.includes("402")) {
                throw new Error("INSUFFICIENT_BALANCE");
            }
            
            throw new Error(`API Error (${response.status}): ${errorText}`);
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
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const dataStr = trimmed.slice(6).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    const delta = json.choices?.[0]?.delta;
                    
                    if (delta) {
                        const content = delta.content;
                        const reasoning = delta.reasoning_content || delta.reasoning; 
                        const tool_calls = delta.tool_calls;
                        
                        if (content || reasoning || tool_calls) {
                            onData({ content, reasoning, tool_calls });
                        }
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }
        if (onDone) onDone();
    } catch (error: any) {
        // Ignore AbortError as it is intentional
        if (error.name === 'AbortError') {
            console.log('Stream aborted by user');
            return;
        }
        console.error("Stream chat failed:", error);
        if (onError) onError(error);
    }
};

// --- Gemini Cookie API Support ---

export const checkGeminiCookieStatus = (): Promise<{ valid: boolean; message: string }> =>
    apiFetch<{ valid: boolean; message: string }>(`${STRATIFY_SERVICE_PATH}/v1/gemini/status`);

export const streamGeminiCookieChat = async (
    params: { messages: Array<{ role: string; content: string }>; model?: string; stream?: boolean },
    onData: (data: { content?: string; reasoning?: string }) => void,
    onDone?: () => void,
    onError?: (err: any) => void
) => {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${STRATIFY_SERVICE_PATH}/v1/gemini/chat`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ ...params, stream: true }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini Chat Error (${response.status}): ${errorText}`);
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
            buffer = lines.pop() || '';

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;

                const dataStr = trimmed.slice(6).trim();
                if (dataStr === '[DONE]') continue;

                try {
                    const json = JSON.parse(dataStr);
                    if (json.content || json.reasoning) {
                        onData({ content: json.content, reasoning: json.reasoning });
                    }
                } catch (e) {
                    // Ignore
                }
            }
        }
        if (onDone) onDone();
    } catch (error) {
        console.error("Stream Gemini chat failed:", error);
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

// --- Tools ---

export interface WebSearchResult {
    title: string;
    link: string;
    content: string;
    icon?: string;
    media?: string;
    publish_date?: string;
}

export const performWebSearch = async (query: string, count: number = 10) => {
    return apiFetch<{ results: WebSearchResult[], usage: any }>(`${STRATIFY_SERVICE_PATH}/v1/search`, {
        method: 'POST',
        body: JSON.stringify({ query, count })
    });
};

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

export const getPromptDetail = async (id: string): Promise<StratifyPrompt> => {
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

export const generatePdf = async (htmlContent: string, filename?: string, options?: { width?: number; height?: number }): Promise<Blob> => {
    let url = `${STRATIFY_SERVICE_PATH}/generate/pdf`;
    
    // Append dimensions as query parameters if provided
    if (options) {
        const params = new URLSearchParams();
        if (options.width) params.append('width', options.width.toString());
        if (options.height) params.append('height', options.height.toString());
        const qs = params.toString();
        if (qs) url += `?${qs}`;
    }

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

export const generateBatchPdf = async (htmlFiles: { html: string; filename: string }[], options?: { width?: number; height?: number }): Promise<Blob> => {
    let url = `${STRATIFY_SERVICE_PATH}/v1/pdf/batch`;
    
    // Append dimensions as query parameters if provided
    if (options) {
        const params = new URLSearchParams();
        if (options.width) params.append('width', options.width.toString());
        if (options.height) params.append('height', options.height.toString());
        const qs = params.toString();
        if (qs) url += `?${qs}`;
    }

    const token = localStorage.getItem('accessToken');
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ html_files: htmlFiles }),
    });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`批量 PDF 生成失败: ${errorText}`);
    }
    return response.blob();
};

export const chatCompletions = (data: { model: string; messages: any[]; stream?: boolean; temperature?: number }, sessionId?: string): Promise<any> => {
    const headers: any = {};
    if (sessionId) headers['X-Session-ID'] = sessionId;

    return apiFetch(`${STRATIFY_SERVICE_PATH}/v1/chat/completions`, {
        method: 'POST',
        body: JSON.stringify(data),
        headers
    });
};

// --- 8. Pricing & Billing Admin ---

export const getPricings = (): Promise<ModelPricing[]> =>
    apiFetch<ModelPricing[]>(`${STRATIFY_SERVICE_PATH}/pricing`);

export const createPricing = (data: Partial<ModelPricing>): Promise<ModelPricing> =>
    apiFetch<ModelPricing>(`${STRATIFY_SERVICE_PATH}/pricing`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updatePricing = (id: string, data: Partial<ModelPricing>): Promise<ModelPricing> =>
    apiFetch<ModelPricing>(`${STRATIFY_SERVICE_PATH}/pricing/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const deletePricing = (id: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/pricing/${id}`, {
        method: 'DELETE',
    });

// --- 14. Session Management ---

export const createSession = (agentId: string, title: string): Promise<AgentSession> =>
    apiFetch<AgentSession>(`${STRATIFY_SERVICE_PATH}/v1/sessions`, {
        method: 'POST',
        body: JSON.stringify({ agent_id: agentId, title }),
    });

export const getSessions = (params: any = {}): Promise<AgentSession[]> => {
    const query = createApiQuery(params);
    return apiFetch<AgentSession[]>(`${STRATIFY_SERVICE_PATH}/v1/sessions${query}`);
}

export const getSession = (id: string): Promise<AgentSession> =>
    apiFetch<AgentSession>(`${STRATIFY_SERVICE_PATH}/v1/sessions/${id}`);

export const updateSession = (id: string, data: Partial<AgentSession>): Promise<AgentSession> =>
    apiFetch<AgentSession>(`${STRATIFY_SERVICE_PATH}/v1/sessions/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });

export const deleteSession = (id: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/v1/sessions/${id}`, {
        method: 'DELETE',
    });

export const createSnapshot = (sessionId: string, stageTag: string, description: string): Promise<SessionSnapshot> =>
    apiFetch<SessionSnapshot>(`${STRATIFY_SERVICE_PATH}/v1/sessions/${sessionId}/snapshots`, {
        method: 'POST',
        body: JSON.stringify({ stage_tag: stageTag, description }),
    });

export const getSnapshots = (sessionId: string): Promise<SessionSnapshot[]> =>
    apiFetch<SessionSnapshot[]>(`${STRATIFY_SERVICE_PATH}/v1/sessions/${sessionId}/snapshots`);

export const restoreSnapshot = (sessionId: string, snapshotId: string): Promise<AgentSession> =>
    apiFetch<AgentSession>(`${STRATIFY_SERVICE_PATH}/v1/sessions/${sessionId}/restore`, {
        method: 'POST',
        body: JSON.stringify({ snapshot_id: snapshotId }),
    });

// --- 15. Statistics ---
export const getUsageStats = (params: any = {}): Promise<UsageStat[]> => {
    const query = createApiQuery(params);
    return apiFetch<UsageStat[]>(`${STRATIFY_SERVICE_PATH}/v1/stats/usage${query}`);
};

export const getUsageSummary = (params: any = {}): Promise<UsageSummary> => {
    const query = createApiQuery(params);
    return apiFetch<UsageSummary>(`${STRATIFY_SERVICE_PATH}/v1/stats/summary${query}`);
};
