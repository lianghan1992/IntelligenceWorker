// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { PaginatedResponse } from '../types';

// --- Types based on new API Docs ---

export interface SourcePublic {
    id: string;
    name: string;
    main_url: string;
    points_count: number;
    articles_count: number;
    created_at: string;
}

export interface PointPublic {
    id: string;
    source_id: string;
    source_name: string;
    name: string;
    url: string;
    cron_schedule: string;
    is_active: boolean;
    mode?: string;
    url_filters?: string[];
    extra_hint?: string;
    enable_pagination?: boolean;
    initial_pages?: number;
    last_crawl_time?: string;
    created_at: string;
}

export interface TaskPublic {
    id: string;
    source_name: string;
    point_name: string;
    task_type: string;
    url: string;
    status: string;
    start_time?: string;
    end_time?: string;
    retry_count: number;
    created_at: string;
}

export interface PendingArticlePublic {
    id: string;
    point_id?: string;
    source_name: string;
    point_name: string;
    original_url: string;
    title: string;
    publish_date?: string;
    content?: string;
    status: string;
    created_at: string;
    updated_at: string;
    crawl_metadata?: any;
}

export interface ArticlePublic {
    id: string;
    point_id?: string;
    title: string;
    original_url: string;
    publish_date?: string;
    content: string;
    source_name: string;
    point_name: string;
    is_atomic?: boolean;
    created_at: string;
    updated_at: string;
}

// --- Sources ---

export const getSources = (): Promise<SourcePublic[]> => 
    apiFetch<SourcePublic[]>(`${INTELLIGENCE_SERVICE_PATH}/sources`);

export const createSource = (data: { name: string; main_url: string }): Promise<SourcePublic> =>
    apiFetch<SourcePublic>(`${INTELLIGENCE_SERVICE_PATH}/sources`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// Note: Delete/Toggle sources are not explicitly in the main workflow doc, 
// but implied or might be supported. We keep them if compatible or mock.
// The docs only listed GET /sources and POST /sources. 
// We will assume creation is the main "Admin" action.

// --- Points ---

export const getPoints = (params?: { source_name?: string }): Promise<PointPublic[]> => 
    apiFetch<PointPublic[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery(params)}`);

export const createPoint = (data: {
    source_name: string;
    name: string;
    url: string;
    cron_schedule: string;
    mode?: string;
    url_filters?: string[];
    extra_hint?: string;
    enable_pagination?: boolean;
    initial_pages?: number;
}): Promise<PointPublic> => {
    return apiFetch<PointPublic>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const togglePoint = (pointId: string, enable: boolean): Promise<{ ok: boolean; enabled: boolean }> =>
    apiFetch<{ ok: boolean; enabled: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

export const deletePoints = (pointIds: string[]): Promise<{ deleted: number }> =>
    apiFetch<{ deleted: number }>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify(pointIds),
    });

// --- Tasks / Logs ---

export const getTasks = (params: { status_filter?: string; page?: number; limit?: number }): Promise<TaskPublic[]> =>
    apiFetch<TaskPublic[]>(`${INTELLIGENCE_SERVICE_PATH}/tasks${createApiQuery(params)}`);

// --- Pending Articles (Review) ---

export const getPendingArticles = (params: { page?: number; limit?: number }): Promise<PaginatedResponse<PendingArticlePublic>> =>
    apiFetch<PaginatedResponse<PendingArticlePublic>>(`${INTELLIGENCE_SERVICE_PATH}/pending${createApiQuery(params)}`);

export const confirmPendingArticles = (ids: string[]): Promise<{ confirmed: number }> =>
    apiFetch<{ confirmed: number }>(`${INTELLIGENCE_SERVICE_PATH}/pending/confirm`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });

export const rejectPendingArticles = (ids: string[]): Promise<{ rejected: number }> =>
    apiFetch<{ rejected: number }>(`${INTELLIGENCE_SERVICE_PATH}/pending/reject`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });

// --- Articles (Assets) ---

export const getArticles = (params: { source_name?: string; point_name?: string; page?: number; limit?: number }): Promise<PaginatedResponse<ArticlePublic>> =>
    apiFetch<PaginatedResponse<ArticlePublic>>(`${INTELLIGENCE_SERVICE_PATH}/articles${createApiQuery(params)}`);

export const getArticleDetail = (articleId: string): Promise<ArticlePublic> =>
    apiFetch<ArticlePublic>(`${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}`);

// --- Legacy / Compatibility / Mocked Methods ---
// Keeping these to ensure other components don't break during the transition.

export const getArticleById = getArticleDetail;

export const getArticleHtml = async (id: string): Promise<string> => {
    // Mock implementation or mapped to detail
    const article = await getArticleDetail(id);
    return article.content; // Simple fallback
};

export const downloadArticlePdf = async (id: string): Promise<Blob> => {
    // Placeholder, as PDF download isn't in new doc
    throw new Error("PDF download not supported in this version.");
}

export const searchArticlesFiltered = async (params: any): Promise<{ items: any[], total: number, page: number }> => {
    // Map legacy search to new getArticles
    const res = await getArticles({ 
        page: params.page, 
        limit: params.limit,
        source_name: params.source_names?.[0] // Simplified mapping
    });
    return {
        items: res.items, // Use items from paginated response
        total: res.total, // Use total from paginated response
        page: params.page || 1
    };
};

// Removed conflicting exports that are present in api/user.ts
// export const getUserPois ...
// export const getUserSubscribedSources ...
// export const addUserSourceSubscription ...
// export const deleteUserSourceSubscription ...

// Re-export for compatibility with IntelligencePointManager if it still exists
export const getPointsBySourceName = (sourceName: string) => getPoints({ source_name: sourceName });
export const deleteSource = async (name: string) => {}; // No delete source in doc
export const toggleSource = async (name: string, enable: boolean) => {}; // No toggle source in doc
export const runCrawler = async (sourceName: string) => {}; // No run crawler in doc
export const checkIntelligencePointHealth = async (id: string) => ({ status: 'unknown', message: 'Not supported' });

export const searchChunks = async (params: any) => ({ results: [] });
export const exportChunks = async (params: any) => ({ export_data: [] });
export const createLlmSearchTask = async (data: any) => {};
export const getLlmSearchTasks = async (params: any) => ({ items: [], total: 0 });

// Updated Stubs to accept arguments
export const getGenericSources = async () => [] as any[];
export const getGenericPoints = async (sourceName?: string) => [] as any[];
export const createGenericPoint = async (data: any) => ({} as any);
export const updateGenericPoint = async (id: string, data: any) => ({} as any);
export const getGenericTasks = async (params: any) => ({ items: [], total: 0 });

export const getPendingArticleDetail = async (id: string) => ({} as any);
export const deletePendingArticles = rejectPendingArticles;
export const deleteArticles = async (ids: string[]) => {}; 
export const getIntelligenceStats = async () => ({ sources: 0, points: 0, active_points: 0, articles: 0, vectors: 0, schedules_active: 0 });

// Updated Stubs to accept arguments
export const updateGeminiCookies = async (data: any) => ({} as any);
export const checkGeminiCookies = async () => ({ has_cookie: false, valid: false });
export const toggleHtmlGeneration = async (enable: boolean) => ({} as any);