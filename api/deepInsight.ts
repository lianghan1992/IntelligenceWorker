
// src/api/deepInsight.ts

import { DEEP_INSIGHT_SERVICE_PATH, INTELSPIDER_SERVICE_PATH } from '../config';
import { DeepInsightCategory, DeepInsightTask, DeepInsightPagesResponse, UploadedDocument, DocTag } from '../types';
import { apiFetch, createApiQuery } from './helper';

// --- Categories (Mapped to Tags) ---
export const getDeepInsightCategories = async (): Promise<DeepInsightCategory[]> => {
    const tags = await apiFetch<DocTag[]>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags`);
    return tags.map(t => ({
        id: t.uuid,
        name: t.name,
        created_at: t.created_at
    }));
};

export const createDeepInsightCategory = (name: string, parent_id?: string): Promise<{ id: string; message: string }> => {
    // Map to creating a DocTag
    return apiFetch<{ id: string; message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags`, {
        method: 'POST',
        body: JSON.stringify({ name }), // Parent ID not supported in simple tags yet
    }).then((res: any) => ({ id: res.uuid, message: 'Category created' }));
};

export const deleteDeepInsightCategory = (cid: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/tags/${cid}`, {
        method: 'DELETE',
    });

// --- File Management (Raw Uploads) ---
// Note: The new API integrates upload directly into document creation. 
// These specific "Raw Upload" endpoints might be deprecated or used for a different workflow.
// For compatibility, we keep them but warn or redirect if needed.
export const getDeepInsightUploads = (): Promise<string[]> =>
    apiFetch<string[]>(`${DEEP_INSIGHT_SERVICE_PATH}/uploads`);

export const deleteDeepInsightUpload = (fileName: string): Promise<{ message: string }> =>
    apiFetch<{ message: string }>(`${DEEP_INSIGHT_SERVICE_PATH}/uploads/${fileName}`, {
        method: 'DELETE',
    });

export const uploadDeepInsightFiles = (files: File[]): Promise<void> => {
    const uploadFormData = new FormData();
    files.forEach(f => uploadFormData.append('files', f));
    return apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/uploads`, {
        method: 'POST',
        body: uploadFormData,
    });
};

// --- Tasks Core (Mapped to Uploaded Docs / Published Docs) ---

export const getDeepInsightTasks = async (params: any): Promise<{ items: DeepInsightTask[], total: number, page: number, limit: number }> => {
    // Mapping params to new API structure
    const apiParams = {
        page: params.page || 1,
        page_size: params.limit || 20,
        point_uuid: params.category_id,
        keyword: params.search
    };

    const query = createApiQuery(apiParams);
    // Use the specific endpoint for published docs (completed docs under tags)
    const res = await apiFetch<{ items: any[], total: number, page: number, page_size: number }>(`${INTELSPIDER_SERVICE_PATH}/doc-tags/docs${query}`);
    
    // Map response to DeepInsightTask interface for UI compatibility
    const items: DeepInsightTask[] = res.items.map(doc => ({
        id: doc.uuid,
        file_name: doc.original_filename,
        file_type: doc.original_filename.split('.').pop()?.toUpperCase() || 'PDF',
        // Backend returns KB, frontend expects Bytes for formatting. Multiply by 1024.
        file_size: (doc.file_size || 0) * 1024,
        status: doc.status,
        total_pages: doc.page_count,
        processed_pages: doc.process_progress === 100 ? doc.page_count : 0, 
        category_id: doc.point_uuid, 
        category_name: doc.point_name,
        created_at: doc.publish_date || doc.created_at, // Prefer publish_date
        updated_at: doc.created_at
    }));

    return {
        items,
        total: res.total,
        page: res.page,
        limit: res.page_size
    };
};

// Create a task from an existing file in the upload directory
// Legacy support
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
    Promise.resolve({ message: "Task started" });

// Convenience: Upload -> Create -> Start (New Flow)
export const uploadDeepInsightTask = async (file: File, category_id?: string): Promise<{ id: string }> => {
    if (!category_id) throw new Error("Category (Tag) is required for upload");
    
    const formData = new FormData();
    formData.append('files', file);
    formData.append('point_uuid', category_id);
    
    const res = await apiFetch<UploadedDocument[]>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/upload`, {
        method: 'POST',
        body: formData,
    });
    
    return { id: res[0].uuid };
};

export const getDeepInsightTask = async (taskId: string): Promise<DeepInsightTask> => {
    const doc = await apiFetch<UploadedDocument>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${taskId}`);
    return {
        id: doc.uuid,
        file_name: doc.original_filename,
        file_type: doc.mime_type?.split('/')?.[1]?.toUpperCase() || 'PDF',
        // Backend returns KB, frontend expects Bytes.
        file_size: (doc.file_size || 0) * 1024,
        status: doc.status,
        total_pages: doc.page_count,
        processed_pages: Math.floor((doc.process_progress || 0) / 100 * doc.page_count),
        category_id: doc.point_uuid,
        category_name: doc.point_name,
        created_at: doc.publish_date || doc.created_at,
        updated_at: doc.created_at
    };
};

export const getDeepInsightTaskPages = (taskId: string, page = 1, limit = 20): Promise<DeepInsightPagesResponse> =>
    // Legacy endpoint fallback
    apiFetch<DeepInsightPagesResponse>(`${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages${createApiQuery({ page, limit })}`)
    .catch(() => ({ items: [], total: 0 }));

// --- Downloads & Previews ---

export const downloadDeepInsightPagePdf = async (taskId: string, pageIndex: number): Promise<Blob> => {
    const url = `${DEEP_INSIGHT_SERVICE_PATH}/tasks/${taskId}/pages/${pageIndex}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载失败');
    return response.blob();
};

export const getDeepInsightPageHtml = async (taskId: string, pageIndex: number): Promise<string> => {
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
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${taskId}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载失败');
    return response.blob();
};

export const downloadDeepInsightOriginalPdf = async (taskId: string): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${taskId}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载原始文件失败');
    return response.blob();
};

// Fetch cover image (using page 1 preview)
export const fetchDeepInsightCover = async (taskId: string): Promise<string | null> => {
    return getDeepInsightPagePreviewUrl(taskId, 1);
};

// Fetch Page Preview Image (PNG)
export const getDeepInsightPagePreview = async (docId: string, pageNum: number): Promise<Blob> => {
    const url = `${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${docId}/preview/${pageNum}`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Preview failed');
    return response.blob();
};

// Helper to get preview URL for an image (blob)
export const getDeepInsightPagePreviewUrl = async (docId: string, pageNum: number): Promise<string | null> => {
    try {
        const blob = await getDeepInsightPagePreview(docId, pageNum);
        return URL.createObjectURL(blob);
    } catch (e) {
        return null;
    }
}

// --- Admin APIs (Stats & Management) ---
export const getDeepInsightTasksStats = (): Promise<{ total: number; completed: number; failed: number; processing: number; pending: number }> =>
    Promise.resolve({ total: 0, completed: 0, failed: 0, processing: 0, pending: 0 });

export const deleteDeepInsightTask = (taskId: string): Promise<{ ok: boolean }> =>
    apiFetch<{ message: string }>(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${taskId}`, {
        method: 'DELETE',
    }).then(() => ({ ok: true }));

export const getDeepInsightTaskStatus = (taskId: string): Promise<any> =>
    getUploadedDocDetail(taskId);

import { getUploadedDocDetail } from './intelligence';


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

export const updateDeepInsightGeminiEnvCookies = (data: { secure_1psid: string; secure_1psidts: string }): Promise<{ ok: boolean; message: string }> => {
    const formData = new FormData();
    formData.append('secure_1psid', data.secure_1psid);
    formData.append('secure_1psidts', data.secure_1psidts);
    
    return apiFetch(`${DEEP_INSIGHT_SERVICE_PATH}/gemini/env-cookies`, {
        method: 'PUT',
        body: formData,
    });
};

export const checkDeepInsightGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch<{ has_cookie: boolean; valid: boolean }>(`${DEEP_INSIGHT_SERVICE_PATH}/gemini/cookies/check`);
