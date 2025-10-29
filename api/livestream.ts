// src/api/livestream.ts

import { LIVESTREAM_SERVICE_PATH } from '../config';
import { PaginatedResponse, LivestreamTask, LivestreamPrompt } from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Livestream / Events API ---
export const getLivestreamTasks = (params: any): Promise<PaginatedResponse<LivestreamTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<LivestreamTask>>(`${LIVESTREAM_SERVICE_PATH}/tasks${query}`);
};

export const getPublicLivestreamTasks = (params: any): Promise<PaginatedResponse<LivestreamTask>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<LivestreamTask>>(`${LIVESTREAM_SERVICE_PATH}/public_tasks${query}`);
};

export const getLivestreamTasksStats = (): Promise<any> => apiFetch<any>(`${LIVESTREAM_SERVICE_PATH}/tasks/stats`);

export const createLivestreamTask = (data: { url: string; livestream_name: string; entity: string; start_time: string; prompt_file: string; image?: File }): Promise<LivestreamTask> => {
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
        if (key === 'image' && value) {
            formData.append(key, value as File);
        } else if (value !== null && value !== undefined) {
            formData.append(key, value as string);
        }
    });
    return apiFetch<LivestreamTask>(`${LIVESTREAM_SERVICE_PATH}/tasks`, { method: 'POST', body: formData });
};

export const createHistoryLivestreamTask = (data: { url: string; livestream_name: string; entity: string; start_time: string; summary_report: string; host_name: string; livestream_image?: string; }): Promise<LivestreamTask> => {
     return apiFetch<LivestreamTask>(`${LIVESTREAM_SERVICE_PATH}/tasks/history`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteLivestreamTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}`, { method: 'DELETE' });
export const startListenTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/listen/start`, { method: 'POST' });
export const stopListenTask = (taskId: string): Promise<void> => apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/listen/stop`, { method: 'POST' });

export const reanalyzeLivestreamTask = (taskId: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/re-analyze`, {
        method: 'POST',
    });

export const getTaskLog = (taskId: string): Promise<{ log_content: string }> =>
    apiFetch<{ log_content: string }>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/log`);

export const getTaskManuscript = (taskId: string, format: 'json' | 'md' = 'json'): Promise<any> =>
    apiFetch<any>(`${LIVESTREAM_SERVICE_PATH}/tasks/${taskId}/manuscript${createApiQuery({ format })}`);

// --- Prompts API ---
export const getLivestreamPrompts = (): Promise<LivestreamPrompt[]> => apiFetch<LivestreamPrompt[]>(`${LIVESTREAM_SERVICE_PATH}/prompts`);
export const updateLivestreamPrompt = (name: string, content: string): Promise<void> =>
    apiFetch<void>(`${LIVESTREAM_SERVICE_PATH}/prompts/${name}`, {
        method: 'POST', // API Doc uses POST for update
        body: JSON.stringify({ content }),
    });