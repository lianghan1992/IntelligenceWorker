
// src/api/stratify.ts

import { STRATIFY_SERVICE_PATH } from '../config';
import { StratifyTask, StratifyPage, GenerateStreamParams } from '../types';
import { apiFetch } from './helper';

// --- 1. The Plumber: Universal Stream Generator ---

/**
 * 核心流式生成函数
 * 使用 fetch + ReadableStream 处理 POST SSE。
 * 适配 StratifyAI 后端 "Plumber Mode" 极简协议。
 * 协议格式: data: {"content": "...", "reasoning": "...", "session_id": "..."}
 */
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
        'Accept': 'text/event-stream', // Explicitly request stream
        'Cache-Control': 'no-cache',   // Prevent caching
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

        // 关键修复：引入缓冲区处理跨 Chunk 的断行问题
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // 将新收到的数据追加到缓冲区
            buffer += decoder.decode(value, { stream: true });
            
            // 按换行符切割，但保留最后一个可能不完整的片段在缓冲区中
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; 

            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine || !trimmedLine.startsWith('data: ')) {
                    continue;
                }

                const dataStr = trimmedLine.slice(6).trim();
                if (dataStr === '[DONE]') {
                    continue;
                }

                try {
                    const json = JSON.parse(dataStr);
                    
                    // 1. Handle Session ID (Stratify Protocol)
                    if (json.session_id && onSessionId) {
                        onSessionId(json.session_id);
                    }

                    // 2. Handle Content (Simplified Pass-through)
                    if (json.content && onData) {
                        onData(json.content);
                    }

                    // 3. Handle Reasoning (Simplified Pass-through)
                    // Backend returns "reasoning", keeping "reasoning_content" for robustness
                    const reasoning = json.reasoning || json.reasoning_content;
                    if (reasoning && onReasoning) {
                        onReasoning(reasoning);
                    }

                } catch (e) {
                    // 仅当 JSON 确实损坏时才忽略，此时缓冲区机制已保证了行完整性
                    console.warn("Stream parse error for line:", dataStr, e);
                }
            }
        }

        // 处理缓冲区中剩余的内容（如果有）
        if (buffer.trim().startsWith('data: ')) {
             try {
                const dataStr = buffer.trim().slice(6).trim();
                if (dataStr !== '[DONE]') {
                    const json = JSON.parse(dataStr);
                    if (json.content && onData) onData(json.content);
                    if ((json.reasoning || json.reasoning_content) && onReasoning) onReasoning(json.reasoning || json.reasoning_content);
                }
             } catch (e) {
                 // ignore final partial chunk if invalid
             }
        }

        if (onDone) onDone();

    } catch (error) {
        console.error("Stream generation failed:", error);
        if (onError) onError(error);
    }
};

// --- 2. Scenario Management (New) ---

export const getScenarios = (): Promise<string[]> =>
    apiFetch<string[]>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios`);

export const createScenario = (name: string): Promise<string> =>
    apiFetch<string>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }) // Assuming body expects { "name": "scenario_name" }
    });

export const deleteScenario = (name: string): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios/${name}`, {
        method: 'DELETE',
    });

export const getScenarioFiles = (scenarioName: string): Promise<string[]> =>
    apiFetch<string[]>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios/${scenarioName}/files`);

export const getScenarioFileContent = (scenarioName: string, fileName: string): Promise<string> =>
    apiFetch<string>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios/${scenarioName}/files/${fileName}`);

// --- 3. Persistence (CRUD) ---

export const createStratifyTask = async (topic: string): Promise<StratifyTask> => {
    // FIX: Backend expects 'user_input', not 'topic'
    const response = await apiFetch<any>(`${STRATIFY_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ user_input: topic }),
    });
    // Map backend response (input_text) to frontend model (topic)
    return {
        ...response,
        topic: response.input_text || topic
    };
};

export const getStratifyTask = (taskId: string): Promise<StratifyTask> =>
    apiFetch<StratifyTask>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}`);

export const updateStratifyTask = (taskId: string, data: Partial<StratifyTask>): Promise<StratifyTask> =>
    apiFetch<StratifyTask>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const saveStratifyPages = (taskId: string, pages: StratifyPage[]): Promise<void> =>
    apiFetch<void>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}/pages`, {
        method: 'POST',
        body: JSON.stringify(pages),
    });

// --- 4. Export ---

export const generatePdf = async (htmlContent: string, filename?: string): Promise<Blob> => {
    const url = `${STRATIFY_SERVICE_PATH}/generate/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers({
        'Content-Type': 'application/json'
    });
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ html_content: htmlContent, filename }),
    });

    if (!response.ok) {
        throw new Error('PDF 生成失败');
    }
    return response.blob();
};

// 辅助函数：清洗 LLM 返回的 JSON 字符串
export const parseLlmJson = <T>(text: string): T | null => {
    try {
        // 0. Try to split by Separator first if present (Frontend helper handles this mostly, but good to have here)
        let cleanText = text;
        if (text.includes("---FINAL_JSON_OUTPUT---")) {
            cleanText = text.split("---FINAL_JSON_OUTPUT---")[1].trim();
        }

        // 1. Try direct parse
        return JSON.parse(cleanText);
    } catch (e) {
        // 2. Try to extract from markdown code blocks ```json ... ```
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch (e2) {
                // ignore
            }
        }
        // 3. Try to extract from generic code blocks ``` ... ```
        const codeMatch = text.match(/```\s*([\s\S]*?)\s*```/);
        if (codeMatch && codeMatch[1]) {
             try {
                return JSON.parse(codeMatch[1]);
            } catch (e3) {
                // Ignore
            }
        }
        return null;
    }
};
