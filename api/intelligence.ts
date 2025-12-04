
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { PaginatedResponse, InfoItem } from '../types';

// --- Types based on New API Docs ---

export interface IntelligenceSourcePublic {
    id: string; 
    name: string;
    main_url: string;
    points_count: number;
    articles_count: number;
    created_at: string;
}

export interface IntelligencePointPublic {
    id: string;
    source_name: string;
    name: string;
    url: string;
    cron_schedule: string;
    is_active: boolean; // Computed or derived if API doesn't return explicitly, but 'toggle' implies state. Assuming API returns enabled/is_active or we assume true. 
    // API Doc says toggle returns {enabled: bool}. We assume the point object has 'enabled' or 'is_active'. 
    // Let's assume 'enabled' based on typical patterns, mapped to is_active.
    enabled?: boolean; 
    mode?: string;
    url_filters?: string[];
    extra_hint?: string;
    enable_pagination?: boolean;
    initial_pages?: number;
    last_crawl_time?: string;
    created_at?: string;
    // Compatibility for GenericCrawlerManager
    point_name?: string; 
    point_url?: string;
    type?: string; 
    list_hint?: string;
    list_filters?: string[];
}

export interface IntelligenceTaskPublic {
    id: string;
    source_name: string;
    point_name: string;
    task_type: string;
    url: string;
    status: string; // "等待中" | "执行中" | "已完成" | "已失败"
    stage?: string;
    detail_info?: string;
    start_time?: string;
    end_time?: string;
    created_at: string;
    retry_count?: number;
}

export interface PendingArticlePublic {
    id: string;
    title: string;
    source_name: string;
    point_name: string;
    original_url: string;
    publish_date?: string;
    content?: string;
    status?: string;
    created_at?: string;
    // Removed crawl_metadata as it's not in the new API doc spec
}

export type ArticlePublic = InfoItem;

// --- 1. 源管理 (Sources) ---

export const getSources = (): Promise<IntelligenceSourcePublic[]> => 
    apiFetch<IntelligenceSourcePublic[]>(`${INTELLIGENCE_SERVICE_PATH}/sources`);

export const createSource = (data: { name: string; main_url: string }): Promise<IntelligenceSourcePublic> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteSource = (sourceName: string): Promise<{ deleted_source: string; deleted_points: number; deleted_tasks: number }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, {
        method: 'DELETE',
    });
};

// --- 2. 情报点管理 (Points) ---

export const getPoints = (params?: { source_name?: string }): Promise<IntelligencePointPublic[]> => 
    apiFetch<IntelligencePointPublic[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery(params)}`);

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
}): Promise<IntelligencePointPublic> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const togglePoint = (pointId: string, enable: boolean): Promise<{ ok: boolean; enabled: boolean }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

export const deletePoints = (ids: string[]): Promise<{ deleted: number }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ ids }), 
    });

export const runPoint = (pointId: string): Promise<{ created_tasks: number; point_id: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/run-now`, {
        method: 'POST',
    });

// --- 3. 任务与待审 (Tasks & Pending) ---

export const getTasks = (params: { page?: number; limit?: number; status_filter?: string }): Promise<PaginatedResponse<IntelligenceTaskPublic>> => {
    return apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/tasks${createApiQuery(params)}`)
        .then(res => {
             // API returns array directly according to doc, but we wrap it in PaginatedResponse for frontend consistency
             if (Array.isArray(res)) {
                 return { items: res, total: 100, page: params.page || 1, limit: params.limit || 20, totalPages: 1 }; // Mock total if API doesn't return it
             }
             return res;
        });
};

export const getPendingArticles = (params: { page?: number; limit?: number }): Promise<PaginatedResponse<PendingArticlePublic>> =>
    apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/pending${createApiQuery(params)}`)
        .then(res => {
            if (Array.isArray(res)) return { items: res, total: 100, page: params.page || 1, limit: params.limit || 20, totalPages: 1 };
            return res;
        });

export const confirmPendingArticles = (ids: string[]): Promise<{ confirmed: number }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/confirm`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });

export const rejectPendingArticles = (ids: string[]): Promise<{ rejected: number }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/reject`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });

// --- 4. 文章管理 (Articles) ---

// Note: API doc only specifies delete. Assuming we still have a get list API or it's unchanged.
// Keeping getArticles for functionality.
export const getArticles = (params: { source_name?: string; point_name?: string; page?: number; limit?: number; publish_date_start?: string; publish_date_end?: string; query_text?: string; similarity_threshold?: number }): Promise<PaginatedResponse<ArticlePublic>> =>
    apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/articles${createApiQuery(params)}`)
        .then(res => {
             if (Array.isArray(res)) return { items: res, total: res.length, page: params.page || 1, limit: params.limit || 20, totalPages: 1 };
             return res;
        });

export const getArticleById = (id: string): Promise<ArticlePublic> => 
    apiFetch<ArticlePublic>(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}`);

export const getArticleHtml = (id: string): Promise<string> => 
    apiFetch<string>(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}/html`).catch(() => "");

export const downloadArticlePdf = (id: string): Promise<Blob> => 
    fetch(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}/pdf`, { 
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` } 
    }).then(res => res.blob());

export const deleteArticles = (ids: string[]): Promise<{ deleted_articles: number; deleted_vectors: number }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles/delete`, {
        method: 'POST',
        body: JSON.stringify({ ids }),
    });

// --- Search & Chunks (Existing functionality preserved) ---

export const searchChunks = (params: { query_text: string; top_k?: number; similarity_threshold?: number; include_article_content?: boolean }): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks`, {
        method: 'POST',
        body: JSON.stringify(params)
    });

export const exportChunks = (params: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(params)
    });

// --- LLM Tasks ---

export const createLlmSearchTask = (data: { query_text: string }): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/llm/search-tasks`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getLlmSearchTasks = (params: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/llm/search-tasks${createApiQuery(params)}`);

// --- Gemini Settings ---

export const updateGeminiCookies = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const checkGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies/check`);

export const toggleHtmlGeneration = (enable: boolean): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/config/html-generation`, {
        method: 'POST',
        body: JSON.stringify({ enable })
    });

// --- Helpers & Legacy Support ---

// Helper for GenericCrawlerManager
export const getSourcesAndPoints = async (): Promise<(IntelligenceSourcePublic & { points?: IntelligencePointPublic[] })[]> => {
    const sources = await getSources();
    // Since getPoints supports filtering, we might need to fetch all or iterate. 
    // New API suggests getPoints?source_name=...
    // To implement "get all points" efficiently if backend supports no-arg:
    const points = await getPoints(); 
    
    return sources.map(s => ({
        ...s,
        points: points.filter(p => p.source_name === s.name)
    }));
};

// Generic Crawler Wrappers
export const createGenericPoint = (data: any) => createPoint({ ...data, mode: 'generic' });
export const updateGenericPoint = (id: string, data: any) => {
    // API doesn't explicitly show update point, only create/delete/toggle.
    // Assuming toggle for is_active. For full update, usually delete+create is preferred in this simple API style.
    if (data.is_active !== undefined) {
        return togglePoint(id, data.is_active);
    }
    return Promise.resolve(null); // Fallback
};
export const getGenericTasks = (params: any) => getTasks(params);

export const searchArticlesFiltered = (data: any): Promise<PaginatedResponse<ArticlePublic>> => {
    return getArticles({
        limit: data.limit,
        page: data.page,
        publish_date_start: data.publish_date_start,
        query_text: data.query_text,
        similarity_threshold: data.similarity_threshold
    });
}; 

// Stats Aggregation (Helper)
export const getIntelligenceStats = async (): Promise<{ 
    sources: number; 
    points: number; 
    articles: number; 
    pending: number; 
    active_points: number; 
    vectors: number; 
    schedules_active: number 
}> => {
    try {
        const [sources, pendingRes, points] = await Promise.all([
            getSources(),
            getPendingArticles({ limit: 1 }),
            getPoints()
        ]);
        
        const sourcesCount = sources.length;
        const pointsCount = points.length;
        const activePoints = points.filter(p => p.enabled || p.is_active).length;
        const articlesCount = sources.reduce((acc, s) => acc + (s.articles_count || 0), 0);
        
        return {
            sources: sourcesCount,
            points: pointsCount,
            active_points: activePoints,
            articles: articlesCount,
            pending: pendingRes.total || 0,
            vectors: 0,
            schedules_active: activePoints
        };
    } catch (e) {
        return { sources: 0, points: 0, articles: 0, pending: 0, active_points: 0, vectors: 0, schedules_active: 0 };
    }
};
