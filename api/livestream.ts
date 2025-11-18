// src/api/livestream.ts

import { PaginatedResponse, LivestreamTask } from '../types';
import { apiFetch, createApiQuery } from './helper';

// Helper to convert File to Base64, returning only the data part.
const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64String = result.split(',')[1];
            if (!base64String) {
                reject(new Error("Failed to extract base64 string from file."));
                return;
            }
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
};

const TASKS_PATH = '/api/livestream/tasks';
const PROMPTS_PATH = '/api/livestream/prompts';


// --- Livestream / Events API ---
export const getLivestreamTasks = (params: { page?: number; page_size?: number; [key: string]: any }): Promise<PaginatedResponse<LivestreamTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<LivestreamTask>>(`${TASKS_PATH}${query}`);
};

export const getLivestreamTaskById = (taskId: string): Promise<LivestreamTask> =>
    apiFetch<LivestreamTask>(`${TASKS_PATH}/${taskId}`);

export const createLivestreamTask = async (data: { 
    task_name: string;
    company: string;
    live_url: string; 
    start_time: string; 
    summary_prompt: string;
    direct_download?: boolean;
    image: File 
}): Promise<{ task_id: string; status: string; message: string }> => {
    const cover_image_b64 = await fileToBase64(data.image);
    
    const payload = {
        task_name: data.task_name,
        live_url: data.live_url,
        company: data.company,
        start_time: data.start_time,
        summary_prompt: data.summary_prompt || undefined, // Send undefined if empty to let backend use default
        direct_download: data.direct_download,
        cover_image_b64: cover_image_b64,
    };
    
    return apiFetch<{ task_id: string; status: string; message: string }>(`${TASKS_PATH}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

export const deleteLivestreamTask = (taskId: string): Promise<void> => apiFetch<void>(`${TASKS_PATH}/${taskId}`, { method: 'DELETE' });

export const startTask = (taskId: string): Promise<void> => apiFetch<void>(`${TASKS_PATH}/${taskId}/start`, { method: 'POST' });
export const stopTask = (taskId: string): Promise<void> => apiFetch<void>(`${TASKS_PATH}/${taskId}/stop`, { method: 'POST' });

export const reprocessTask = (taskId: string, params?: { fps_scale?: number; prompt?: string }): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${TASKS_PATH}/${taskId}/reprocess`, {
        method: 'POST',
        body: params ? JSON.stringify(params) : undefined,
    });

export const resummarizeTask = (taskId: string, params?: { summary_prompt?: string }): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${TASKS_PATH}/${taskId}/resummarize`, {
        method: 'POST',
        body: params ? JSON.stringify(params) : undefined,
    });

export const getTaskSummary = async (taskId: string): Promise<string> => {
    const url = `${TASKS_PATH}/${taskId}/summary`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取最终报告失败: ${response.statusText} - ${errorText}`);
    }
    return response.text();
};

export const getTaskManuscript = async (taskId: string): Promise<string> => {
    const url = `${TASKS_PATH}/${taskId}/manuscript`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取原始识别稿失败: ${response.statusText} - ${errorText}`);
    }
    return response.text();
};


export const getLivestreamPrompts = async (): Promise<string[]> => {
    const url = `${PROMPTS_PATH}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP error! status: ${response.status}` }));
        throw new Error(errorData.message || '获取提示词列表失败');
    }

    try {
        const data = await response.json();
        if (data && Array.isArray(data.prompts)) {
            return data.prompts;
        }
        console.warn("getLivestreamPrompts API did not return an object with a 'prompts' array. Received:", data);
        return [];
    } catch (e) {
        console.warn("getLivestreamPrompts failed to parse JSON, returning empty array.", e);
        return [];
    }
};