// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    apiFetch, createApiQuery 
} from './helper';
import { PaginatedResponse, SystemSource, GenericPoint, GenericTask, LlmSearchTaskItem, SearchChunkResult, ApiPoi } from '../types';

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

export const deleteSource = (name: string): Promise<void> =>
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(name)}`, { method: 'DELETE' });

export const toggleSource = (name: string, enable: boolean): Promise<void> =>
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(name)}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable })
    });

export const runCrawler = (sourceName: string): Promise<void> =>
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}/run`, { method: 'POST' });

// --- Points ---

export const getPoints = (params?: { source_name?: string }): Promise<PointPublic[]> => 
    apiFetch<PointPublic[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery(params)}`);

export const createPoint = (data: {
    source_name: string;
    point_name?: string; // Alias for name to support old usage
    name?: string;
    point_url?: string; // Alias for url
    url?: string;
    cron_schedule: string;
    mode?: string;
    url_filters?: string[];
    extra_hint?: string;
    enable_pagination?: boolean;
    initial_pages?: number;
}): Promise<PointPublic> => {
    // Adapter for legacy property names
    const payload = {
        source_name: data.source_name,
        name: data.name || data.point_name,
        url: data.url || data.point_url,
        cron_schedule: data.cron_schedule,
        mode: data.mode,
        url_filters: data.url_filters,
        extra_hint: data.extra_hint,
        enable_pagination: data.enable_pagination,
        initial_pages: data.initial_pages
    };
    return apiFetch<PointPublic>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(payload),
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

export const checkIntelligencePointHealth = (pointId: string): Promise<{ status: string; message: string }> =>
    apiFetch<{ status: string; message: string }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/health`);

export const getPointsBySourceName = (sourceName: string) => getPoints({ source_name: sourceName });

// --- Stats ---

export const getIntelligenceStats = (): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/stats`);

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

export const getPendingArticleDetail = (id: string) => 
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/${id}`);

export const deletePendingArticles = rejectPendingArticles;

// --- Articles (Assets) ---

export const getArticles = (params: { source_name?: string; point_name?: string; page?: number; limit?: number; query_text?: string }): Promise<PaginatedResponse<ArticlePublic>> =>
    apiFetch<PaginatedResponse<ArticlePublic>>(`${INTELLIGENCE_SERVICE_PATH}/articles${createApiQuery(params)}`);

export const getArticleDetail = (articleId: string): Promise<ArticlePublic> =>
    apiFetch<ArticlePublic>(`${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}`);

export const deleteArticles = (ids: string[]): Promise<void> =>
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/articles`, {
        method: 'DELETE',
        body: JSON.stringify({ ids })
    });

export const getArticleById = getArticleDetail;

export const getArticleHtml = async (id: string): Promise<string> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${id}/html`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Failed to fetch HTML');
    return response.text();
};

export const downloadArticlePdf = async (id: string): Promise<Blob> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${id}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
}

// --- Legacy Support ---

export const getSubscriptions = async (): Promise<any[]> => {
    return []; 
};

// Aliases for compatibility
export const createIntelligencePoint = createPoint;
export const deleteIntelligencePoints = deletePoints;
export const toggleIntelligencePoint = togglePoint;

// Adapter for dashboard search
export const searchArticlesFiltered = (params: any): Promise<{ items: ArticlePublic[], total: number, page: number }> => {
    return getArticles(params).then(res => ({
        items: res.items,
        total: res.total,
        page: res.page
    }));
};

// --- Chunks / RAG ---
export const searchChunks = (params: any): Promise<{ results: SearchChunkResult[] }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks`, {
        method: 'POST',
        body: JSON.stringify(params)
    });

export const exportChunks = (params: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(params)
    });

// --- LLM Sorting ---
export const createLlmSearchTask = (data: { query_text: string }): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/llm_search/tasks`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const getLlmSearchTasks = (params: any): Promise<PaginatedResponse<LlmSearchTaskItem>> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/llm_search/tasks${createApiQuery(params)}`);

// --- Generic Crawler ---
export const getGenericSources = (): Promise<SystemSource[]> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/sources`);

export const getGenericPoints = (sourceName: string): Promise<GenericPoint[]> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points?source_name=${encodeURIComponent(sourceName)}`);

export const createGenericPoint = (data: any): Promise<GenericPoint> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points`, { method: 'POST', body: JSON.stringify(data) });

export const updateGenericPoint = (id: string, data: any): Promise<GenericPoint> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const getGenericTasks = (params: any): Promise<PaginatedResponse<GenericTask>> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/tasks${createApiQuery(params)}`);

// --- Settings ---
export const updateGeminiCookies = (data: any) => 
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/settings/gemini`, { method: 'POST', body: JSON.stringify(data) });

export const checkGeminiCookies = () => 
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/settings/gemini/check`);

export const toggleHtmlGeneration = (enable: boolean) => 
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/settings/html_generation`, { method: 'POST', body: JSON.stringify({ enable }) });
