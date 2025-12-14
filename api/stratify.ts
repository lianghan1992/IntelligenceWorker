
// src/api/stratify.ts

import { STRATIFY_SERVICE_PATH } from '../config';
import { StratifyTask, StratifyPage, GenerateStreamParams } from '../types';
import { apiFetch } from './helper';

// --- 1. The Plumber: Universal Stream Generator ---

/**
 * 核心流式生成函数
 * 使用 fetch + ReadableStream 处理 POST SSE，因为标准的 EventSource 不支持 POST body。
 */
export const streamGenerate = async (
    params: GenerateStreamParams,
    onData: (text: string) => void,
    onDone?: () => void,
    onError?: (err: any) => void
) => {
    const token = localStorage.getItem('accessToken');
    const headers: HeadersInit = {
        'Content-Type': 'application/json',
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

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6).trim();
                    if (dataStr === '[DONE]') {
                        // End of stream signal
                        continue;
                    }
                    try {
                        const json = JSON.parse(dataStr);
                        if (json.content) {
                            onData(json.content);
                        }
                    } catch (e) {
                        // Ignore parse errors for partial chunks
                    }
                }
            }
        }

        if (onDone) onDone();

    } catch (error) {
        console.error("Stream generation failed:", error);
        if (onError) onError(error);
    }
};

// --- 2. Persistence (CRUD) ---

export const createStratifyTask = (topic: string): Promise<StratifyTask> =>
    apiFetch<StratifyTask>(`${STRATIFY_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ topic }),
    });

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

// 辅助函数：清洗 LLM 返回的 JSON 字符串
export const parseLlmJson = <T>(text: string): T | null => {
    try {
        // 1. Try direct parse
        return JSON.parse(text);
    } catch (e) {
        // 2. Try to extract from markdown code blocks ```json ... ```
        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch && jsonMatch[1]) {
            try {
                return JSON.parse(jsonMatch[1]);
            } catch (e2) {
                console.error("Failed to parse extracted JSON", e2);
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
