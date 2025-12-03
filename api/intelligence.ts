
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    SearchResult,
   SearchChunksResponse, ExportChunksResponse, LlmSearchRequest, LlmSearchResponse,
   LlmSearchTasksResponse, LlmSearchTaskDetail,
   GenericPoint, GenericTask, PendingArticle, SourceWithPoints
} from '../types';
import { apiFetch, createApiQuery } from './helper';
import { getUserSubscribedSources } from './user';

// --- Intelligence Points & Sources API ---
export const getSubscriptions = async (): Promise<Subscription[]> => {
    const subscribedSources = await getUserSubscribedSources();
    if (subscribedSources.length === 0) {
        return [];
    }
    const pointsPromises = subscribedSources.map(source => 
        getPointsBySourceName(source.source_name)
    );
    const pointsBySource = await Promise.all(pointsPromises);
    return pointsBySource.flat();
};

export const getSources = (): Promise<SystemSource[]> => apiFetch<SystemSource[]>(`${INTELLIGENCE_SERVICE_PATH}/sources`);

export const getSourceNames = (): Promise<string[]> => apiFetch<string[]>(`${INTELLIGENCE_SERVICE_PATH}/sources/names`);

export const getSourcesAndPoints = (): Promise<SourceWithPoints[]> =>
    apiFetch<SourceWithPoints[]>(`${INTELLIGENCE_SERVICE_PATH}/sources-and-points`);

// Updated: Delete source by name
export const deleteSource = (sourceName: string): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });

export const getPointsBySourceName = (sourceName: string): Promise<Subscription[]> =>
    apiFetch<Subscription[]>(`${INTELLIGENCE_SERVICE_PATH}/points${createApiQuery({ source_name: sourceName })}`);
    
export const createIntelligencePoint = (data: Partial<Subscription>): Promise<{ message: string, point_id: string }> => 
    apiFetch<{ message: string, point_id: string }>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

// Updated: Batch delete points with body
export const deleteIntelligencePoints = (pointIds: string[]): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/points`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ point_ids: pointIds }),
    });

// NEW: Toggle point status
export const toggleIntelligencePoint = (pointId: string, enable: boolean): Promise<{ success: boolean, message: string }> =>
    apiFetch<{ success: boolean, message: string }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// NEW: Toggle all points in a source
export const toggleSource = (sourceName: string, enable: boolean): Promise<{ success: boolean, message: string }> =>
    apiFetch<{ success: boolean, message: string }>(`${INTELLIGENCE_SERVICE_PATH}/sources/${encodeURIComponent(sourceName)}/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enable }),
    });

// NEW: Check point health
export const checkIntelligencePointHealth = (pointId: string): Promise<{ status: string, message: string, last_success_time?: string }> =>
    apiFetch<{ status: string, message: string, last_success_time?: string }>(`${INTELLIGENCE_SERVICE_PATH}/points/${pointId}/health`);

// NEW: Run crawler immediately (Source Level)
export const runCrawler = (sourceName: string): Promise<{ message: string; source_name: string; module_path: string }> => {
    return apiFetch<{ message: string; source_name: string; module_path: string }>(
        `${INTELLIGENCE_SERVICE_PATH}/crawlers/${encodeURIComponent(sourceName)}/run-now`,
        {
            method: 'POST'
        }
    );
};

// --- Intelligence Stats ---
export const getIntelligenceStats = (): Promise<{ 
    sources: number; 
    points: number; 
    active_points: number; 
    articles: number; 
    vectors: number; 
    schedules_active: number 
}> => apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);

// --- Articles API ---
export const getArticles = (params: any): Promise<PaginatedResponse<InfoItem>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<InfoItem>>(`${INTELLIGENCE_SERVICE_PATH}/articles${query}`);
};

export const deleteArticles = (ids: string[]): Promise<void> => 
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/articles`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });

export const searchArticlesFiltered = (params: any): Promise<SearchResult> => {
    // Note: Dashboard uses this with query params. 
    // If backend requires POST for filtered search, use searchArticlesFilteredPost instead.
    // For now assuming existing Dashboard integration works with this or we need to align.
    // The provided doc says `POST /search/articles_filtered`. 
    // We will switch to POST to be correct with the latest doc.
    return apiFetch<SearchResult>(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify(params)
    });
};

export const getArticleById = (id: string): Promise<InfoItem> =>
    apiFetch<InfoItem>(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}`);

export const getArticleHtml = async (id: string): Promise<string> => {
    const response = await apiFetch<string>(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}/html`);
    return response;
};

export const downloadArticlePdf = async (id: string): Promise<Blob> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${id}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('Download failed');
    return response.blob();
};

// --- Semantic Search / Chunks ---
export const searchChunks = (params: any): Promise<SearchChunksResponse> => {
    return apiFetch<SearchChunksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/chunks`, {
        method: 'POST',
        body: JSON.stringify(params),
    });
};

export const exportChunks = (params: any): Promise<ExportChunksResponse> => {
    return apiFetch<ExportChunksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, {
        method: 'POST',
        body: JSON.stringify(params),
    });
};

// --- LLM Sorting / Analysis Tasks ---
export const createLlmSearchTask = (data: LlmSearchRequest): Promise<LlmSearchResponse> =>
    apiFetch<LlmSearchResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/llm`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getLlmSearchTasks = (params: any): Promise<LlmSearchTasksResponse> => {
    const query = createApiQuery(params);
    return apiFetch<LlmSearchTasksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/tasks${query}`);
};

// --- Gemini Settings (Crawler Service) ---
export const updateGeminiCookies = (data: { secure_1psid: string; secure_1psidts: string; http_proxy?: string }): Promise<{ initialized: boolean; message: string }> => {
    // Using JSON as per previous implementation compatibility, if doc says Form, change to FormData
    return apiFetch<{ initialized: boolean; message: string }>(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const checkGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch<{ has_cookie: boolean; valid: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies/check`);

export const toggleHtmlGeneration = (enabled: boolean): Promise<{ enabled: boolean }> =>
    apiFetch<{ enabled: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/html-generation/toggle`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
    });

// --- Generic Crawler Points (Admin) ---
export const getGenericSources = (): Promise<{ source_name: string; points_count?: number }[]> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/sources`);

export const getGenericPoints = (sourceName: string): Promise<GenericPoint[]> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points${createApiQuery({ source_name: sourceName })}`);

export const createGenericPoint = (data: any): Promise<void> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const updateGenericPoint = (id: string, data: any): Promise<void> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });

export const getGenericTasks = (params: any): Promise<{ items: GenericTask[], total: number }> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/tasks${query}`);
};

// --- Pending Articles (Admin) ---
export const getPendingArticles = (params: any): Promise<{ items: PendingArticle[], total: number }> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/articles${query}`);
};

export const getPendingArticleDetail = (articleId: string): Promise<PendingArticle> =>
    apiFetch<PendingArticle>(`${INTELLIGENCE_SERVICE_PATH}/pending/articles/${articleId}`);

export const confirmPendingArticles = (ids: string[]): Promise<void> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/articles/confirm`, {
        method: 'POST',
        body: JSON.stringify({ article_ids: ids }),
    });

export const deletePendingArticles = (ids: string[]): Promise<void> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/pending/articles/delete`, {
        method: 'POST',
        body: JSON.stringify({ article_ids: ids }),
    });

// --- Generic Sources Deletion ---
export const deleteGenericSource = (sourceName: string): Promise<void> =>
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/generic/sources/${encodeURIComponent(sourceName)}`, { method: 'DELETE' });

export const deleteGenericPoint = (pointId: string): Promise<void> =>
    apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${pointId}`, { method: 'DELETE' });

// Run Generic Point
export const runGenericPoint = (pointId: string): Promise<{ message: string, point_id: string }> =>
    apiFetch<{ message: string, point_id: string }>(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${pointId}/run-now`, {
        method: 'POST'
    });
