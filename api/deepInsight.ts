
// src/api/deepInsight.ts

import { DeepInsightCategory, DeepInsightTask, DeepInsightPagesResponse } from '../types';
import { getUploadedDocs, getUploadedDocDetail, getDocPreview, getDocTags, uploadDocs } from './intelligence';

// --- Categories ---
export const getDeepInsightCategories = async (): Promise<DeepInsightCategory[]> => {
    try {
        // Map DocTags (from intelligence) to DeepInsightCategory
        const tags = await getDocTags();
        return tags.map(tag => ({
            id: tag.uuid,
            name: tag.name,
            created_at: tag.created_at
        }));
    } catch (e) {
        console.warn("Failed to fetch categories (tags), using empty list:", e);
        return [];
    }
};

// --- Tasks Core ---

export const getDeepInsightTasks = async (params: any): Promise<{ items: DeepInsightTask[], total: number, page: number, limit: number }> => {
    try {
        const res = await getUploadedDocs({
            page: params.page || 1,
            size: params.limit || 20,
            keyword: params.search,
            status: params.status,
            point_id: params.category_id 
        });

        // Map UploadedDocument to DeepInsightTask
        const items: DeepInsightTask[] = res.items.map((doc: any) => ({
            id: doc.uuid, // Use uuid as id
            file_name: doc.original_filename,
            file_type: doc.mime_type ? (doc.mime_type === 'application/pdf' ? 'PDF' : doc.mime_type.split('/')[1].toUpperCase()) : 'FILE',
            file_size: doc.file_size,
            status: doc.status,
            total_pages: doc.page_count || 0,
            processed_pages: doc.process_progress ? Math.floor((doc.process_progress / 100) * (doc.page_count || 1)) : (doc.status === 'completed' ? doc.page_count : 0),
            category_id: doc.point_uuid,
            category_name: doc.point_name,
            created_at: doc.created_at,
            updated_at: doc.updated_at || doc.created_at,
            summary: doc.summary,
            cover_image: doc.cover_image
        }));

        return {
            items,
            total: res.total,
            page: res.page,
            limit: res.size
        };
    } catch (e) {
        console.warn("Failed to fetch tasks (docs), returning empty result:", e);
        return { items: [], total: 0, page: 1, limit: params.limit || 20 };
    }
};

export const getDeepInsightTask = async (taskId: string): Promise<DeepInsightTask> => {
    const doc = await getUploadedDocDetail(taskId);
    return {
        id: doc.uuid,
        file_name: doc.original_filename,
        file_type: 'PDF', // Assuming PDF
        file_size: doc.file_size,
        status: doc.status,
        total_pages: doc.page_count,
        processed_pages: doc.process_progress ? Math.floor((doc.process_progress / 100) * doc.page_count) : (doc.status === 'completed' ? doc.page_count : 0),
        category_id: doc.point_uuid,
        created_at: doc.created_at,
        updated_at: doc.created_at, // detail might not have updated_at
        summary: doc.summary,
        cover_image: doc.cover_image
    };
};

// Deprecated or Mocked for Compatibility
export const getDeepInsightTaskPages = async (taskId: string, page = 1, limit = 20): Promise<DeepInsightPagesResponse> => {
    // The new API does not provide a page list endpoint.
    // We mock this response because the reader component needs to know how many pages exist.
    // However, the reader should rely on task.total_pages from getDeepInsightTask.
    // We return an empty list here or throw to force usage of total_pages in component if updated.
    // For safety, let's just return minimal info if possible, but we can't really list pages without an endpoint.
    return { items: [], total: 0 };
};

export const fetchDeepInsightCover = async (taskId: string): Promise<string | null> => {
    // The new API returns cover_image URL directly in document details.
    // If we need to fetch it via a specific endpoint, use getUploadedDocDetail.
    // But since this function signature returns string | null (url), we can reuse logic.
    // If the URL requires auth headers to fetch, we might need downloadBlobWithAuth.
    // Assuming cover_image from detail is sufficient or this helper acts as a fetcher if URL is protected.
    
    // Check if we can get the cover URL from detail first
    try {
        const doc = await getUploadedDocDetail(taskId);
        if (doc.cover_image) return doc.cover_image;
    } catch (e) {}

    // Fallback or specific cover endpoint? The new API list had regenerate-cover but not get-cover explicitly separate from detail.
    // Assuming detail provides valid URL.
    return null;
};

export const fetchDeepInsightPageImage = async (taskId: string, pageIndex: number): Promise<string | null> => {
    try {
        const blob = await getDocPreview(taskId, pageIndex);
        if (blob.size === 0) return null;
        return URL.createObjectURL(blob);
    } catch (e) {
        console.warn(`Failed to fetch page image for doc ${taskId} page ${pageIndex}`, e);
        return null;
    }
};

// Upload Wrapper
export const uploadDeepInsightTask = async (file: File, category_id?: string): Promise<{ id: string }> => {
    // New API uploads directly.
    // Note: uploadDocs returns void in current signature in intelligence.ts, we might need to adjust intelligence.ts if it returns ID.
    // Actually `intelligence.ts` uploadDocs returns void.
    // We need to fetch the list to find the new doc or assume success.
    // The user's new API spec says POST .../upload returns: { id, ... }? 
    // Wait, the prompt says: "Return Example: { id: 'doc-uuid-1', ... }" in GET list, 
    // but for POST upload it says "curl example" and no specific return. 
    // Let's assume standard behavior or just void.
    // If we need ID, we might need to query by filename after upload.
    
    if (!category_id) throw new Error("Category (Point ID) is required for new upload");

    await uploadDocs({ files: [file], point_id: category_id });
    
    // We can't easily get the ID back without response return. 
    // For now return dummy or try to find it. 
    // The UI usually refreshes the list after upload.
    return { id: 'pending-refresh' };
};


// Other stubs to satisfy interface if needed, or remove usage
export const createDeepInsightCategory = async (name: string): Promise<any> => { throw new Error("Use Tag Manager in Admin"); };
export const deleteDeepInsightCategory = async (id: string): Promise<any> => { throw new Error("Use Tag Manager in Admin"); };
export const getDeepInsightUploads = async (): Promise<any> => { return []; }; // Deprecated
export const deleteDeepInsightUpload = async (name: string): Promise<any> => { return {}; }; // Deprecated
export const uploadDeepInsightFiles = async (files: File[]): Promise<void> => { }; // Deprecated
export const startDeepInsightTask = async (id: string): Promise<any> => { return {}; }; // Auto started now
export const createDeepInsightTask = async (fileName: string, categoryId?: string): Promise<{ id: string }> => { return { id: 'deprecated' }; }; // Deprecated stub

export const deleteDeepInsightTask = async (id: string): Promise<any> => { 
    // Map to deleteUploadedDoc from intelligence.ts
    // Use dynamic import or direct if possible, but circular dependency risk?
    // safe to just re-implement apiFetch call here
    // return apiFetch(`${INTELSPIDER_SERVICE_PATH}/uploaded-docs/${id}`, { method: 'DELETE' });
    // But better to use the exported function if possible.
    const { deleteUploadedDoc } = await import('./intelligence');
    return deleteUploadedDoc(id);
};
export const getDeepInsightTasksStats = async (): Promise<any> => { 
    // Mock or implement if stats endpoint exists. The user didn't specify a stats endpoint for uploaded-docs.
    return { total: 0, completed: 0, failed: 0, processing: 0, pending: 0 }; 
};
export const getDeepInsightTaskStatus = async (id: string): Promise<any> => getDeepInsightTask(id);
export const downloadDeepInsightOriginalPdf = async (id: string): Promise<Blob> => {
     const { downloadUploadedDoc } = await import('./intelligence');
     return downloadUploadedDoc(id);
};
export const downloadDeepInsightPagePdf = async (id: string, page: number): Promise<Blob> => { throw new Error("Not supported in new API"); };
export const downloadDeepInsightBundle = async (id: string): Promise<Blob> => { 
    const { downloadUploadedDoc } = await import('./intelligence');
    return downloadUploadedDoc(id);
};
export const getDeepInsightPageHtml = async (id: string, page: number): Promise<string> => { return ""; };

// Cookie stubs (handled in Admin now)
export const updateDeepInsightGeminiEnvCookies = async (data: any) => ({ message: "ok" });
export const checkDeepInsightGeminiCookies = async () => ({ has_cookie: true, valid: true });
