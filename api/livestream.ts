// src/api/livestream.ts

import { LIVESTREAM_SERVICE_PATH } from '../config';
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


// --- Livestream / Events API ---
// Updated to use page_size as per new docs
export const getLivestreamTasks = (params: { page?: number; page_size?: number; [key: string]: any }): Promise<PaginatedResponse<LivestreamTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<LivestreamTask>>(`${LIVESTREAM_SERVICE_PATH}/tasks${query}`);
};

// Removed getPublicLivestreamTasks and getLivestreamTasksStats as they are deprecated.

// Updated to use JSON body with Base64 image, as per new docs.
export const createLivestreamTask = async (data: { url: string; livestream_name: string; start_time: string; prompt_file: string; image?: File }): Promise<{ task_id: string; status: string; message: string }> => {
    let cover_image_b64: string | undefined = undefined;
    if (data.image) {
        cover_image_b64 = await fileToBase64(data.image);
    }
    
    // Mapping frontend field names to backend API field names from the new doc
    const payload = {
        task_name: data.livestream_name,
        live_url: data.url,
        start_time: data.start_time,
        summary_prompt: data.prompt_file || undefined, // Send undefined if empty
        cover_image_b64: cover_image_b64,
    };
    
    return apiFetch<{ task_id: string; status: string; message: string }>(`${LIVESTREAM_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: JSON.stringify(payload),
    });
};

// Removed createHistoryLivestreamTask as it's deprecated.

export const deleteLivestreamTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}`, { method: 'DELETE' });

// Updated paths from /listen/start and /listen/stop to /start and /stop
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

// Removed getTaskLog as it's deprecated.

// Replaced getTaskManuscript with getTaskSummary, which returns plain text.
export const getTaskSummary = async (taskId: string): Promise<string> => {
    const url = `${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/summary`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) {
        headers.set('Authorization', `Bearer ${token}`);
    }
    const response = await fetch(url, { headers });
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`获取文稿失败: ${response.statusText} - ${errorText}`);
    }
    return response.text();
};

// --- Prompts API ---
// The API now returns an object { prompts: [...] }.
export const getLivestreamPrompts = async (): Promise<string[]> => {
    const url = `${LIVESTREAM_SERVICE_PATH}/prompts`;
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
        // As per docs, API returns an object like { prompts: ["file1.md", "file2.md"] }
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


// Removed updateLivestreamPrompt as it's deprecated.