// src/api/livestream.ts

import { LIVESTREAM_SERVICE_PATH } from '../config';
import { PaginatedResponse, LivestreamTask, LivestreamPrompt } from '../types';
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


// --- Livestream / Events API ---
export const getLivestreamTasks = (params: { page?: number; limit?: number; page_size?: number; [key: string]: any }): Promise<PaginatedResponse<LivestreamTask>> => {
    const apiParams = { ...params };
    if (apiParams.limit) {
        apiParams.page_size = apiParams.limit;
        delete apiParams.limit;
    }
    const query = createApiQuery(apiParams);
    return apiFetch<PaginatedResponse<LivestreamTask>>(`${LIVESTREAM_SERVICE_PATH}/tasks${query}`);
};

// Public endpoint is no longer available. Components should use getLivestreamTasks.
// getLivestreamTasksStats is removed as it's not in the new docs.

export const createLivestreamTask = async (data: { url: string; livestream_name: string; start_time: string; prompt_file: string; image?: File }): Promise<LivestreamTask> => {
    let cover_image_b64: string | undefined = undefined;
    if (data.image) {
        cover_image_b64 = await fileToBase64(data.image);
    }
    
    // Mapping frontend field names to backend API field names from the new doc
    const payload = {
        task_name: data.livestream_name,
        live_url: data.url,
        start_time: data.start_time,
        summary_prompt: data.prompt_file,
        cover_image_b64: cover_image_b64,
    };
    
    return apiFetch<LivestreamTask>(`${LIVESTREAM_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

// createHistoryLivestreamTask is removed as it's not in the new docs.

export const deleteLivestreamTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}`, { method: 'DELETE' });

// Paths updated from /listen/start and /listen/stop to /start and /stop
export const startTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/start`, { method: 'POST' });
export const stopTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/stop`, { method: 'POST' });

// Old reanalyze is replaced by reprocess and resummarize
export const reprocessTask = (taskId: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/reprocess`, {
        method: 'POST',
    });

export const resummarizeTask = (taskId: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/resummarize`, {
        method: 'POST',
    });

// getTaskLog is removed as it's not in the new docs.

// getTaskManuscript is replaced by getTaskSummary, which returns plain text.
export const getTaskSummary = async (taskId: string): Promise<string> => {
    const url = `${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/summary`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`获取文稿失败: ${response.statusText}`);
    }
    return response.text();
};

// --- Prompts API ---
export const getLivestreamPrompts = (): Promise<LivestreamPrompt[]> => apiFetch<LivestreamPrompt[]>(`${LIVESTREAM_SERVICE_PATH}/prompts`);

// updateLivestreamPrompt is removed as it's not in the new docs.
