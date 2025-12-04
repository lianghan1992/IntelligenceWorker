
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { PaginatedResponse } from '../types';

// --- Types ---

export interface IntelligenceSourcePublic {
    id: string; 
    source_name: string;
    source_type: 'manual' | 'generic' | 'mixed';
    points_count?: number;
    created_at?: string;
    updated_at?: string;
    points?: IntelligencePointPublic[];
}

export interface IntelligencePointPublic {
    id: string;
    source_id?: string;
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
    is_active: boolean;
    type?: 'manual' | 'generic';
    last_triggered_at?: string;
    created_at: string;
    // Generic specific
    list_hint?: string;
    list_filters?: string[];
}

export interface GenericCrawlerTaskPublic {
    id: string;
    source_name: string;
    point_name: string;
    url: string;
    task_type: string;
    stage: string;
    detail_info: any;
    start_time: string;
    end_time?: string;
    created_at: string;
}

export interface PendingArticlePublic {
    id: string;
    source_name: string;
    point_name: string;
    point_url: string;
    original_url: string;
    title: string;
    publish_date?: string;
    content?: string;
    status: string;
    crawl_metadata?: any;
    created_at: string;
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
    created_at: string;
    summary?: string;
    keywords?: string[];
    sentiment?: string;
}

export interface IntelligenceStats {
    sources: number;
    points: number;
    active_points: number;
    articles: number;
    vectors: number;
    schedules_active: number;
}

// --- Sources & Points Management ---

// GET /api/crawler/sources
export const getSources = (): Promise<any[]> => 
    apiFetch<any[]>(`${INTELLIGENCE_SERVICE_PATH}/sources`);

// GET /api/crawler/sources/names
export const getSourceNames = (): Promise<string[]> =>
    apiFetch<string[]>(`${INTELLIGENCE_SERVICE_PATH}/sources/names`);

// GET /api/crawler/sources-and-points
export const getSourcesAndPoints = (params?: { source_name?: string; point_id?: string }): Promise<IntelligenceSourcePublic[]> => 
    apiFetch<IntelligenceSourcePublic[]>(`${INTELLIGENCE_SERVICE_PATH}/sources-and-points${createApiQuery(params)}`);

// GET /api/crawler/points
export const getPoints = (params?: { source_name?: string }): Promise<IntelligencePointPublic[]> => 
    apiFetch<IntelligencePointPublic[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery(params)}`);

// POST /api/crawler/points (Manual)
export const createPoint = (data: {
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
}): Promise<{ message: string; point_id: string }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// POST /api/crawler/generic/points (Generic)
export const createGenericPoint = (data: {
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
    list_hint?: string;
    list_filters?: string[];
}): Promise<{ message: string; point_id: string }> => {
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// PUT /api/crawler/generic/points/{point_id}
export const updateGenericPoint = (pointId: string, data: Partial<IntelligencePointPublic>): Promise<IntelligencePointPublic> => {
    return apiFetch<IntelligencePointPublic>(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${pointId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

// GET /api/crawler/generic/points/{point_id}
export const getGenericPoint = (pointId: string): Promise<IntelligencePointPublic> =>
    apiFetch<IntelligencePointPublic>(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${pointId}`);

// PUT /api/crawler/generic/sources/{source_name}
export const updateGenericSource = (sourceName: string, data: { new_name?: string; cron_schedule?: string; is_active?: boolean }): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/sources/${encodeURIComponent(sourceName)}`, {
        method: 'PUT',
        body: JSON.stringify(data)
    });

// POST /api/crawler/points/{point_id}/toggle
export const togglePoint = (pointId: string, enable: boolean): Promise<{ success: boolean; message: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// POST /api/crawler/sources/{source_name}/toggle
export const toggleSource = (sourceName: string, enable: boolean): Promise<{ ok: boolean; affected_points: number; enabled: boolean }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// DELETE /api/crawler/points
export const deletePoints = (pointIds: string[]): Promise<{ message: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        body: JSON.stringify({ point_ids: pointIds }),
    });

// DELETE /api/crawler/sources/{source_name}
export const deleteSource = (sourceName: string): Promise<{ message: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, {
        method: 'DELETE',
    });

// GET /api/crawler/points/{point_id}/health
export const checkPointHealth = (pointId: string): Promise<{ status: 'healthy' | 'warning' | 'unhealthy' | 'error'; message: string; last_success_time?: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/health`);

// --- Execution Control ---

// POST /api/crawler/crawlers/{source_name}/run-now (Manual Source)
export const runCrawlerSource = (sourceName: string): Promise<{ message: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/crawlers/${encodeURIComponent(sourceName)}/run-now`, {
        method: 'POST',
    });

// POST /api/crawler/generic/points/{point_id}/run-now (Generic Point)
export const runGenericPoint = (pointId: string): Promise<{ message: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${pointId}/run-now`, {
        method: 'POST',
    });

// --- Tasks / Logs ---

// GET /api/crawler/generic/tasks
export const getGenericTasks = (params: { page?: number; limit?: number; source_name?: string }): Promise<{ total: number; page: number; limit: number; items: GenericCrawlerTaskPublic[] }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/tasks${createApiQuery(params)}`);

// GET /api/crawler/tasks/stats
export const getIntelligenceStats = (): Promise<IntelligenceStats> =>
    apiFetch<IntelligenceStats>(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);

// GET /api/crawler/generic/overview
export const getGenericOverview = (): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/overview`);

// --- Pending Articles (Review) ---

export const getPendingArticles = (params: { page?: number; limit?: number }): Promise<PaginatedResponse<PendingArticlePublic>> =>
    apiFetch<PaginatedResponse<PendingArticlePublic>>(`${INTELLIGENCE_SERVICE_PATH}/pending/articles${createApiQuery(params)}`);

export const getPendingArticleDetail = (articleId: string): Promise<PendingArticlePublic> =>
    apiFetch<PendingArticlePublic>(`${INTELLIGENCE_SERVICE_PATH}/pending/articles/${articleId}`);

export const confirmPendingArticles = (article_ids: string[]): Promise<{ message: string; confirmed_count: number }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/articles/confirm`, {
        method: 'POST',
        body: JSON.stringify({ article_ids }),
    });

export const rejectPendingArticles = (article_ids: string[]): Promise<{ message: string; deleted_count: number }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/articles/delete`, {
        method: 'POST',
        body: JSON.stringify({ article_ids }),
    });

// --- Articles (Assets) ---

export const getArticles = (params: { source_name?: string; point_name?: string; publish_date_start?: string; page?: number; limit?: number }): Promise<PaginatedResponse<ArticlePublic>> =>
    apiFetch<PaginatedResponse<ArticlePublic>>(`${INTELLIGENCE_SERVICE_PATH}/articles${createApiQuery(params)}`);

export const getArticleDetail = (articleId: string): Promise<ArticlePublic> =>
    apiFetch<ArticlePublic>(`${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}`);

export const deleteArticles = (article_ids: string[]): Promise<{ message: string }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles`, {
        method: 'DELETE',
        body: JSON.stringify({ article_ids }),
    });

export const getArticleHtml = async (id: string): Promise<string> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${id}/html`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    return response.text();
};

export const downloadArticlePdf = async (id: string): Promise<Blob> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${id}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('PDF download failed');
    return response.blob();
};

export const generateArticlePdf = (id: string): Promise<{ ok: boolean; pdf_generated: boolean }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/report/pdf/${id}`, { method: 'POST' });

// --- Search (Chunks) ---
export const searchChunks = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

export const exportChunks = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

// --- Legacy Aliases/Stubs for compatibility ---
export const getArticleById = getArticleDetail;
export const deletePendingArticles = rejectPendingArticles;
export const searchArticlesFiltered = (data: any): Promise<any> => 
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify(data)
    });

// --- Settings ---
export const updateGeminiCookies = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: data instanceof FormData ? data : new URLSearchParams(data) // API expects Form Data
    });

export const checkGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies/check`);

export const toggleHtmlGeneration = (enable: boolean): Promise<{ ok: boolean; enabled: boolean }> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/html-generation/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable })
    });

// --- LLM Tasks ---
export const createLlmSearchTask = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/llm`, { method: 'POST', body: JSON.stringify(data) });

export const getLlmSearchTasks = (params: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/tasks${createApiQuery(params)}`);
