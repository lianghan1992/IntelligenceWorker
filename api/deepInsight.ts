// src/api/deepInsight.ts

import { DEEP_INSIGHT_SERVICE_PATH } from '../config';
import { DeepInsightCategory, DeepInsightTask, DeepInsightPagesResponse } from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Categories ---
export const getDeepInsightCategories = (): Promise<DeepInsightCategory[]> =>
    apiFetch<DeepInsightCategory[]>(`${DEEP_INSIGHT_SERVICE_PATH}/categories`);

export const createDeepInsightCategory = (name: string, parent_id?: string): Promise<{ id: string; message: string }> => {
    const formData = new FormData();
    formData.append('name', name);
    if (parent_id) formData.append('parent_id', parent_id);
    return apiFetch<{ id: string; message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/categories`, {
        method: 'POST',
        body: formData,
    });
};

export const deleteDeepInsightCategory = (cid: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/categories/${cid}`, {
        method: 'DELETE',
    });

// --- Tasks ---
// Using 'any' for params to support potential list endpoint if added, currently the doc only shows POST upload.
// But assuming standard list behavior for manager. If backend lacks list, this might fail or needs workaround.
// Based on typical pattern, there might be GET /deep_insight/tasks
export const getDeepInsightTasks = (params: any): Promise<{ items: DeepInsightTask[], total: number, page: number, limit: number }> => {
    const query = createApiQuery(params);
    // Note: This endpoint is assumed based on standard patterns as it's essential for a "Manager".
    // If it returns 404, the backend needs to implement it.
    return apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/tasks${query}`); 
};

export const uploadDeepInsightTask = (file: File, category_id?: string): Promise<{ task_id: string; status: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    if (category_id) formData.append('category_id', category_id);
    return apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: formData,
    });
};

export const getDeepInsightTask = (taskId: string): Promise<DeepInsightTask> =>
    apiFetch<DeepInsightTask>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}`);

export const getDeepInsightTaskPages = (taskId: string, page = 1, limit = 20): Promise<DeepInsightPagesResponse> =>
    apiFetch<DeepInsightPagesResponse>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages${createApiQuery({ page, limit })}`);

export const downloadDeepInsightPagePdf = async (taskId: string, pageIndex: number): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载失败');
    return response.blob();
};

export const downloadDeepInsightBundle = async (taskId: string): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/bundle`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载失败');
    return response.blob();
};

// --- Gemini ---
export const updateDeepInsightGeminiCookies = (data: { secure_1psid: string; secure_1psidts: string; http_proxy?: string }): Promise<{ ok: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('secure_1psid', data.secure_1psid);
    formData.append('secure_1psidts', data.secure_1psidts);
    if (data.http_proxy) formData.append('http_proxy', data.http_proxy);
    
    return apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: formData,
    });
};

export const checkDeepInsightGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch<{ has_cookie: boolean; valid: boolean }>(`${DEEP_INSIGHT_SERVICE_PATH}/gemini/cookies/check`);
