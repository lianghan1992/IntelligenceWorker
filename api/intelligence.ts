
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { PaginatedResponse, GenericTask, PendingArticle, InfoItem } from '../types';

// --- Types ---

export interface IntelligenceSourcePublic {
    id: string; 
    name: string;
    main_url?: string;
    points_count: number;
    articles_count: number;
    created_at: string;
}

export interface IntelligencePointPublic {
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
    // Optional compatibility fields
    point_name?: string;
    point_url?: string;
    list_hint?: string;
    list_filters?: string[];
}

export interface IntelligenceTaskPublic {
    id: string;
    source_name: string;
    point_name: string;
    task_type: string;
    url: string;
    stage: string;
    status: string;
    detail_info?: string;
    start_time: string;
    end_time?: string;
    created_at: string;
}

export type PendingArticlePublic = PendingArticle;
export type ArticlePublic = InfoItem;

// --- Source Management ---

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

export const toggleSource = (sourceName: string, enable: boolean): Promise<{ ok: boolean }> => {
    // This functionality is typically handled by iterating points in the frontend,
    // or by a specific backend endpoint if available. 
    // Returning a dummy promise to satisfy import if strictly needed, or implementation if backend supports it.
    return Promise.resolve({ ok: true }); 
};

export const runCrawlerSource = (sourceName: string): Promise<{ ok: boolean }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}/run-now`, {
        method: 'POST',
    });
};

// --- Point Management ---

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

// --- Generic Crawler Points ---
export const createGenericPoint = (data: any) => createPoint({ ...data, mode: 'generic' });

export const updateGenericPoint = (id: string, data: any) => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });
};

export const getGenericTasks = (params: any) => getTasks({...params, task_type: 'generic_crawler'});

// --- Tasks ---

export const getTasks = (params: { page?: number; limit?: number; status_filter?: string; task_type?: string }): Promise<PaginatedResponse<IntelligenceTaskPublic>> => {
    return apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/tasks${createApiQuery(params)}`)
        .then(res => {
             if (Array.isArray(res)) {
                 return { items: res, total: res.length, page: params.page || 1, limit: params.limit || 20, totalPages: 1 };
             }
             return res;
        });
};

// --- Pending Articles ---

export const getPendingArticles = (params: { page?: number; limit?: number }): Promise<PaginatedResponse<PendingArticlePublic>> =>
    apiFetch<any>(`${INTELLIGENCE_SERVICE_PATH}/pending${createApiQuery(params)}`)
        .then(res => {
            if (Array.isArray(res)) return { items: res, total: res.length, page: params.page || 1, limit: params.limit || 20, totalPages: 1 };
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

// --- Article Management ---

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

// --- Search & Chunks ---

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

// --- Legacy Compatibility / Placeholders ---
export const getSourcesAndPoints = async (): Promise<(IntelligenceSourcePublic & { points?: IntelligencePointPublic[] })[]> => {
    const sources = await getSources();
    const points = await getPoints();
    
    return sources.map(s => ({
        ...s,
        points: points.filter(p => p.source_name === s.name)
    }));
};

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
        const activePoints = points.filter(p => p.is_active).length;
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
