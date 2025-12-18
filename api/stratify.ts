
// src/api/stratify.ts

import { STRATIFY_SERVICE_PATH } from '../config';
import { StratifyTask, StratifyPage, GenerateStreamParams, Scenario } from '../types';
import { apiFetch } from './helper';

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

// --- 2. Scenario & Uploads ---

export const getScenarios = (): Promise<Scenario[]> =>
    apiFetch<Scenario[]>(`${STRATIFY_SERVICE_PATH}/prompts/scenarios`);

export const uploadStratifyFile = (file: File): Promise<{ filename: string; url: string; type: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    return apiFetch(`${STRATIFY_SERVICE_PATH}/common/upload`, {
        method: 'POST',
        body: formData,
    });
};

// --- 3. Persistence (CRUD) ---

export const createStratifyTask = async (topic: string, scenario: string = 'default'): Promise<StratifyTask> => {
    const response = await apiFetch<any>(`${STRATIFY_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: JSON.stringify({ user_input: topic, scenario }),
    });
    return {
        ...response,
        topic: response.input_text || topic
    };
};

export const getStratifyTasks = (): Promise<StratifyTask[]> =>
    apiFetch<StratifyTask[]>(`${STRATIFY_SERVICE_PATH}/tasks`);

export const getStratifyTaskDetail = (taskId: string): Promise<StratifyTask> =>
    apiFetch<StratifyTask>(`${STRATIFY_SERVICE_PATH}/tasks/${taskId}`);

export const getSessionHistory = (sessionId: string): Promise<{role: string, content: string}[]> =>
    apiFetch(`${STRATIFY_SERVICE_PATH}/sessions/${sessionId}/history`);

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
