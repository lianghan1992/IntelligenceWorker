
// src/api/deepInsight.ts

import { DeepInsightCategory, DeepInsightTask, DeepInsightPagesResponse } from '../types';
import { 
    getUploadedDocs, 
    getUploadedDocDetail, 
    getDocPreview, 
    getDocTags, 
    uploadDocs, 
    getUploadedDocCover,
    regenerateDocumentSummary,
    regenerateDocumentCover,
    deleteUploadedDoc,
    getUploadedDocsStats,
    getUploadedDocsLight
} from './intelligence';

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

export const getDeepInsightCategoriesWithStats = async (): Promise<(DeepInsightCategory & { count: number })[]> => {
    try {
        const [tags, statList] = await Promise.all([getDocTags(), getUploadedDocsStats()]);
        
        return tags.map(tag => {
            const stat = statList.find(s => s.point_name === tag.name);
            return {
                id: tag.uuid,
                name: tag.name,
                created_at: tag.created_at,
                count: stat ? stat.count : 0
            };
        });
    } catch (e) {
        console.warn("Failed to fetch categories with stats:", e);
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
            // Backend returns KB, convert to Bytes for frontend consistency
            file_size: (doc.file_size || 0) * 1024,
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

export const getDeepInsightTasksLight = async (params: any): Promise<{ items: DeepInsightTask[], total: number, page: number, limit: number }> => {
    try {
        const res = await getUploadedDocsLight({
            page: params.page || 1,
            size: params.limit || 20,
            point_name: params.category_name, // Changed from ID to Name based on API
            publish_date: params.publish_date // If needed
        });

        const items: DeepInsightTask[] = res.items.map((doc: any) => ({
            id: doc.id,
            file_name: doc.title,
            file_type: doc.mime_type ? (doc.mime_type === 'application/pdf' ? 'PDF' : 'DOC') : 'FILE',
            // Backend returns KB, convert to Bytes for frontend consistency
            file_size: (doc.file_size || 0) * 1024,
            status: doc.status,
            total_pages: doc.page_count || 0, // Map page_count to total_pages
            processed_pages: doc.status === 'completed' ? (doc.page_count || 0) : 0, // Assume all pages processed if completed
            category_id: '', // Light API returns point_name, not ID
            category_name: doc.point_name,
            created_at: doc.publish_date || new Date().toISOString(),
            updated_at: doc.publish_date || new Date().toISOString(),
            summary: '', // Not provided in light list
            cover_image: doc.cover_url_template // Optional: can be used for lazy loading
        }));

        return {
            items,
            total: res.total,
            page: res.page,
            limit: res.size
        };
    } catch (e) {
        console.warn("Failed to fetch light tasks:", e);
        return { items: [], total: 0, page: 1, limit: params.limit || 20 };
    }
};

export const getDeepInsightTask = async (taskId: string): Promise<DeepInsightTask> => {
    const doc = await getUploadedDocDetail(taskId);
    return {
        id: doc.uuid,
        file_name: doc.original_filename,
        file_type: 'PDF', // Assuming PDF for now, backend detects type
        // Backend returns KB, convert to Bytes
        file_size: (doc.file_size || 0) * 1024,
        status: doc.status,
        total_pages: doc.page_count,
        processed_pages: doc.process_progress ? Math.floor((doc.process_progress / 100) * doc.page_count) : (doc.status === 'completed' ? doc.page_count : 0),
        category_id: doc.point_uuid,
        category_name: doc.point_name,
        created_at: doc.created_at,
        // Fix: Cast to any to access updated_at which might not be in the strict type definition yet
        updated_at: (doc as any).updated_at || doc.created_at,
        summary: doc.summary,
        cover_image: doc.cover_image
    };
};

export const getDeepInsightTaskPages = async (taskId: string, page = 1, limit = 20): Promise<DeepInsightPagesResponse> => {
    // The new API does not provide a page list endpoint directly, use preview endpoint per page.
    // We return an empty list here to satisfy interface, components should rely on total_pages and fetch previews directly.
    return { items: [], total: 0 };
};

export const fetchDeepInsightCover = async (taskId: string): Promise<string | null> => {
    try {
        const blob = await getUploadedDocCover(taskId);
        if (blob.size === 0) return null;
        return URL.createObjectURL(blob);
    } catch (e) {
        // console.warn(`Failed to fetch cover for task ${taskId}`, e);
        return null;
    }
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
    const res = await uploadDocs({ files: [file], point_id: category_id });
    if (Array.isArray(res) && res.length > 0) {
        return { id: res[0].id || 'pending-refresh' };
    }
    return { id: 'pending-refresh' };
};

// Deletion
export const deleteDeepInsightTask = async (id: string): Promise<any> => { 
    return deleteUploadedDoc(id);
};

// Regeneration Actions
export const regenerateDeepInsightSummary = async (id: string): Promise<void> => {
    await regenerateDocumentSummary(id);
};

export const regenerateDeepInsightCover = async (id: string): Promise<void> => {
    await regenerateDocumentCover(id);
};

// Other stubs to satisfy interface if needed, or remove usage
export const createDeepInsightCategory = async (name: string): Promise<any> => { throw new Error("Use Tag Manager in Admin"); };
export const deleteDeepInsightCategory = async (id: string): Promise<any> => { throw new Error("Use Tag Manager in Admin"); };
export const getDeepInsightUploads = async (): Promise<any> => { return []; }; // Deprecated
export const deleteDeepInsightUpload = async (name: string): Promise<any> => { return {}; }; // Deprecated

// Updated to use uploadDocs correctly
export const uploadDeepInsightFiles = async (files: File[], category_id?: string): Promise<void> => { 
    await uploadDocs({ files, point_id: category_id });
};

export const startDeepInsightTask = async (id: string): Promise<any> => { return {}; }; // Auto started now
export const createDeepInsightTask = async (fileName: string, categoryId?: string): Promise<{ id: string }> => { return { id: 'deprecated' }; }; // Deprecated stub

export const getDeepInsightTasksStats = async (): Promise<any> => { 
    // Mock or implement if stats endpoint exists.
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
