
// src/api/deepInsight.ts

import { DEEP_INSIGHT_SERVICE_PATH } from '../config';
import { DeepInsightCategory, DeepInsightTask, DeepInsightPagesResponse } from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Categories ---
export const getDeepInsightCategories = async (): Promise<DeepInsightCategory[]> => {
    return apiFetch<DeepInsightCategory[]>(`${DEEP_INSIGHT_SERVICE_PATH}/categories`);
};

export const createDeepInsightCategory = (name: string, parent_id?: string): Promise<{ id: string; message: string }> => {
    const formData = new FormData();
    formData.append('name', name);
    if (parent_id) formData.append('parent_id', parent_id);
    return apiFetch<{ id: string; message: string; }>(`${DEEP_INSIGHT_SERVICE_PATH}/categories`, {
        method: 'POST',
        body: formData,
    });
};

export const deleteDeepInsightCategory = (category_id: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/categories/${category_id}`, {
        method: 'DELETE',
    });

// --- Uploads (Raw File Management) ---
export const getDeepInsightUploads = (): Promise<string[]> =>
    apiFetch<string[]>(`${DEEP_INSIGHT_SERVICE_PATH}/uploads`);

export const deleteDeepInsightUpload = (fileName: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/uploads/${fileName}`, {
        method: 'DELETE',
    });

export const uploadDeepInsightFiles = (files: File[]): Promise<void> => {
    const uploadFormData = new FormData();
    files.forEach(f => uploadFormData.append('files', f)); // Backend expects 'files' or 'files[]'
    return apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/uploads`, {
        method: 'POST',
        body: uploadFormData,
    });
};

// --- Tasks Core ---

export const getDeepInsightTasks = async (params: any): Promise<{ items: DeepInsightTask[], total: number, page: number, limit: number }> => {
    const apiParams = {
        page: params.page || 1,
        limit: params.limit || 20, // Map limit to standard param if needed, usually 'limit' or 'size'
    };
    
    const query = createApiQuery(apiParams);
    const res = await apiFetch<any>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks${query}`);

    // Map backend response to frontend DeepInsightTask interface
    const items: DeepInsightTask[] = (res.items || []).map((t: any) => ({
        id: t.id,
        file_name: t.file_name,
        file_type: t.file_type || 'PDF',
        file_size: 0, // Backend list might not return size yet
        status: t.status,
        total_pages: t.total_pages || 0,
        processed_pages: t.processed_pages || 0,
        category_id: t.category_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
        // Construct cover image URL dynamically using auth token
        cover_image: t.id ? `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${t.id}/cover?token=${localStorage.getItem('accessToken')}` : undefined
    }));

    return {
        items,
        total: res.total,
        page: res.page,
        limit: res.size || res.limit || apiParams.limit
    };
};

export const createDeepInsightTask = (fileName: string, category_id?: string): Promise<{ id: string }> => {
    const formData = new FormData();
    formData.append('file_name', fileName);
    if (category_id) formData.append('category_id', category_id);
    return apiFetch<{ id: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks`, {
        method: 'POST',
        body: formData,
    });
};

export const startDeepInsightTask = (taskId: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/start`, {
        method: 'POST',
    });

// Convenience: Upload -> Create -> Start (New Flow Wrapper)
export const uploadDeepInsightTask = async (file: File, category_id?: string): Promise<{ id: string }> => {
    // 1. Upload File
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

    // 3. Start Processing
    await startDeepInsightTask(taskRes.id);

    return { id: taskRes.id };
};

export const getDeepInsightTask = (taskId: string): Promise<DeepInsightTask> =>
    apiFetch<any>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}`).then(t => ({
        id: t.id,
        file_name: t.file_name,
        file_type: t.file_type || 'PDF',
        file_size: 0,
        status: t.status,
        total_pages: t.total_pages || 0,
        processed_pages: t.processed_pages || 0,
        category_id: t.category_id,
        created_at: t.created_at,
        updated_at: t.updated_at,
    }));

export const getDeepInsightTaskPages = (taskId: string, page = 1, limit = 20): Promise<DeepInsightPagesResponse> =>
    apiFetch<DeepInsightPagesResponse>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages${createApiQuery({ page, limit })}`);

export const deleteDeepInsightTask = (taskId: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}`, {
        method: 'DELETE',
    });

export const batchDeleteDeepInsightTasks = (ids: string[]): Promise<{ deleted_count: number }> =>
    apiFetch<{ deleted_count: number }>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/batch-delete`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });

export const getDeepInsightTasksStats = (): Promise<{ total: number; completed: number; failed: number; processing: number; pending: number }> =>
    apiFetch<any>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/stats`);

export const getDeepInsightTaskStatus = (taskId: string): Promise<any> =>
    apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/status`);

// --- Downloads ---

async function downloadBlobWithAuth(url: string): Promise<Blob> {
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

export const downloadDeepInsightPagePdf = async (taskId: string, pageIndex: number): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/pdf`;
    return downloadBlobWithAuth(url);
};

export const getDeepInsightPageHtml = async (taskId: string, pageIndex: number): Promise<string> => {
    // This might need a specific endpoint or mapped via pages list
    // Assuming backend might not expose raw HTML text directly for security/CORS, 
    // but if it does:
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/html`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to load page content');
    return response.text();
};

export const downloadDeepInsightBundle = async (taskId: string): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/bundle`;
    return downloadBlobWithAuth(url);
};

export const downloadDeepInsightOriginalPdf = async (taskId: string): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/original`;
    return downloadBlobWithAuth(url);
};

// Preview Helper
export const fetchDeepInsightCover = async (taskId: string): Promise<string | null> => {
    const token = localStorage.getItem('accessToken');
    return `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/cover?token=${token}`;
};

export const getDeepInsightPagePreview = async (docId: string, pageNum: number): Promise<Blob> => {
    // Backend doesn't have explicit page preview image endpoint in summary, 
    // assuming it might serve images via pages list or similar.
    // For now, mapping to pdf page download as placeholder or if backend supports img:
    // const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${docId}/pages/${pageNum}/image`;
    throw new Error("Page preview image endpoint not yet implemented in backend spec");
};

export const getDeepInsightPagePreviewUrl = async (docId: string, pageNum: number): Promise<string | null> => {
    // Return null to force fallback or implement if backend adds image support
    return null; 
}


// --- Gemini Cookie Management ---

export const updateDeepInsightGeminiEnvCookies = (data: { secure_1psid: string; secure_1psidts: string }): Promise<{ message: string }> => {
    const formData = new FormData();
    formData.append('secure_1psid', data.secure_1psid);
    formData.append('secure_1psidts', data.secure_1psidts);
    return apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/gemini/env-cookies`, {
        method: 'PUT',
        body: formData,
    });
};

export const checkDeepInsightGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch<{ has_cookie: boolean; valid: boolean }>(`${DEEP_INSIGHT_SERVICE_PATH}/gemini/cookies/check`);
