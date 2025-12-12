
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

// --- File Management (Raw Uploads) ---
export const getDeepInsightUploads = (): Promise<string[]> =>
    apiFetch<string[]>(`${DEEP_INSIGHT_SERVICE_PATH}/uploads`);

export const deleteDeepInsightUpload = (fileName: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/uploads/${fileName}`, {
        method: 'DELETE',
    });

// --- Tasks Core ---

export const getDeepInsightTasks = (params: any): Promise<{ items: DeepInsightTask[], total: number, page: number, limit: number }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: DeepInsightTask[], total: number, page: number, limit: number }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks${query}`); 
};

// Create a task from an existing file in the upload directory
export const createDeepInsightTask = (fileName: string, category_id?: string): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append('file_name', fileName);
    if (category_id) formData.append('category_id', category_id);
    return apiFetch<{ id: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: formData,
    });
};

// Start processing a task
export const startDeepInsightTask = (taskId: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/start`, {
        method: 'POST'
    });

// Convenience: Upload -> Create -> Start
export const uploadDeepInsightTask = async (file: File, category_id?: string): Promise<{ id: string }> => {
    // 1. Upload File
    const uploadFormData = new FormData();
    uploadFormData.append('files[]', file);
    await apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/uploads`, {
        method: 'POST',
        body: uploadFormData,
    });

    // 2. Create Task
    const taskRes = await createDeepInsightTask(file.name, category_id);

    // 3. Start Task (Auto-start for better UX)
    try {
        await startDeepInsightTask(taskRes.id);
    } catch (e) {
        console.warn("Failed to auto-start task", e);
    }

    return taskRes;
};

export const getDeepInsightTask = (taskId: string): Promise<DeepInsightTask> =>
    apiFetch<DeepInsightTask>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}`);

export const getDeepInsightTaskPages = (taskId: string, page = 1, limit = 20): Promise<DeepInsightPagesResponse> =>
    apiFetch<DeepInsightPagesResponse>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages${createApiQuery({ page, limit })}`);

// --- Downloads ---

export const downloadDeepInsightPagePdf = async (taskId: string, pageIndex: number): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载失败');
    return response.blob();
};

// Fetch HTML content for a specific page
export const getDeepInsightPageHtml = async (taskId: string, pageIndex: number): Promise<string> => {
    // Assuming backend endpoint follows pattern or we access static resource if implied by doc
    // If specific endpoint '/html' doesn't exist on page resource, this might need adjustment based on backend implementation.
    // Preserving existing logic as per user code structure.
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/html`; 
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (response.status === 404) return ''; 
    if (!response.ok) throw new Error('加载页面内容失败');
    return response.text();
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

export const downloadDeepInsightOriginalPdf = async (taskId: string): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/original`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载原始文件失败');
    return response.blob();
};

// Fetch cover image as Blob and return Object URL
export const fetchDeepInsightCover = async (taskId: string): Promise<string | null> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/cover`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    try {
        const response = await fetch(url, { headers });
        if (response.status === 404) return null;
        if (!response.ok) return null;
        const blob = await response.blob();
        return URL.createObjectURL(blob);
    } catch (e) {
        console.error("Failed to fetch cover", e);
        return null;
    }
};

// --- Admin APIs (Stats & Management) ---
export const getDeepInsightTasksStats = (): Promise<{ total: number; completed: number; failed: number; processing: number; pending: number }> =>
    apiFetch<{ total: number; completed: number; failed: number; processing: number; pending: number }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/stats`);

export const deleteDeepInsightTask = (taskId: string): Promise<{ ok: boolean }> =>
    apiFetch<{ ok: boolean }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}`, {
        method: 'DELETE',
    });

export const getDeepInsightTaskStatus = (taskId: string): Promise<any> =>
    apiFetch<any>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/status`);


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
