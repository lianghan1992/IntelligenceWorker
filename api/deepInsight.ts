
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
export const getDeepInsightTasks = (params: any): Promise<{ items: DeepInsightTask[], total: number, page: number, limit: number }> => {
    const query = createApiQuery(params);
    return apiFetch<{ items: DeepInsightTask[], total: number, page: number, limit: number }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks${query}`); 
};

// Updated Upload Logic: Upload -> Create Task -> Start Task
export const uploadDeepInsightTask = async (file: File, category_id?: string): Promise<{ id: string }> => {
    // 1. Upload File (Use 'files' key as per curl example -F 'files=@...')
    const uploadFormData = new FormData();
    uploadFormData.append('files', file); 
    await apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/uploads`, {
        method: 'POST',
        body: uploadFormData,
    });

    // 2. Create Task
    const createFormData = new FormData();
    createFormData.append('file_name', file.name);
    if (category_id) createFormData.append('category_id', category_id);
    const taskRes = await apiFetch<{ id: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: createFormData,
    });

    // 3. Start Task (Auto-start for better UX)
    try {
        await apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskRes.id}/start`, {
            method: 'POST'
        });
    } catch (e) {
        console.warn("Failed to auto-start task", e);
    }

    return taskRes;
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

// Fetch HTML content for a specific page
export const getDeepInsightPageHtml = async (taskId: string, pageIndex: number): Promise<string> => {
    // Assuming page HTMLs are standard assets managed by the backend logic
    // Placeholder path based on typical structure, likely served statically or via a specific endpoint if documented
    // Since doc mentions /pages list, we might iterate that.
    // For now, to support HTML mode, we assume the backend serves it or we use the PDF mode primarily.
    // If strictly following the provided doc, there is no direct "get html content" endpoint, only PDF download.
    // However, usually the system allows accessing the HTML via the static file path returned in `html_path`.
    // We'll assume standard auth-protected static file access for now or rely on PDF.
    // If you have a specific endpoint for HTML content, please add it. 
    // Fallback: return empty string to force PDF mode if not available.
    return ""; 
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

// NEW: Download Original PDF
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

// --- New Admin APIs (Stats & Management) ---
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
