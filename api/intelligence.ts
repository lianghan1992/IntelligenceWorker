
// src/api/intelligence.ts

import { INTELLIGENCE_SERVICE_PATH } from '../config';
import { 
    Subscription, InfoItem, SystemSource, PaginatedResponse, 
    SearchResult,
   SearchChunksResponse, ExportChunksResponse, LlmSearchRequest, LlmSearchResponse,
   LlmSearchTasksResponse, LlmSearchTaskDetail
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
// Fix: Explicitly set Content-Type for DELETE with body to avoid 422
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

// NEW: Run crawler immediately
export const runCrawler = (sourceName: string): Promise<{ message: string; source_name: string; module_path: string }> =>
    apiFetch<{ message: string; source_name: string; module_path: string }>(`${INTELLIGENCE_SERVICE_PATH}/crawlers/${encodeURIComponent(sourceName)}/run-now`, {
        method: 'POST',
    });

// --- Articles API ---
export const getArticles = (params: any): Promise<PaginatedResponse<InfoItem>> => {
    const query = createApiQuery(params);
    return apiFetch<PaginatedResponse<InfoItem>>(`${INTELLIGENCE_SERVICE_PATH}/articles${query}`);
};

export const getArticleById = (articleId: string): Promise<InfoItem> => 
    apiFetch<InfoItem>(`${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}`);

// Updated: Batch delete articles with query params to support GET-like calls if needed, or stick to body. 
// Doc says query params supported for frontend link convenience.
export const deleteArticles = (articleIds: string[]): Promise<void> => {
    // Construct query string for IDs
    const searchParams = new URLSearchParams();
    articleIds.forEach(id => searchParams.append('article_ids', id));
    return apiFetch<void>(`${INTELLIGENCE_SERVICE_PATH}/articles?${searchParams.toString()}`, {
        method: 'DELETE',
    });
};

export const getArticleHtml = async (articleId: string): Promise<string> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}/html`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) return '';
    return response.text();
};

export const downloadArticlePdf = async (articleId: string): Promise<Blob> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/articles/${articleId}/pdf`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载失败');
    return response.blob();
};

export const generateArticlePdf = (articleId: string): Promise<{ ok: boolean, pdf_generated: boolean }> =>
    apiFetch<{ ok: boolean, pdf_generated: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/report/pdf/${articleId}`, {
        method: 'POST',
    });

export const toggleHtmlGeneration = (enable: boolean): Promise<{ ok: boolean; enabled: boolean }> =>
    apiFetch<{ ok: boolean; enabled: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/html-generation/toggle?enable=${enable}`, {
        method: 'POST',
    });

export const updateGeminiCookies = (data: { secure_1psid: string; secure_1psidts: string; http_proxy?: string }): Promise<{ ok: boolean; message: string; initialized: boolean }> => {
    const formData = new FormData();
    formData.append('secure_1psid', data.secure_1psid);
    formData.append('secure_1psidts', data.secure_1psidts);
    if (data.http_proxy) formData.append('http_proxy', data.http_proxy);
    
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`, {
        method: 'POST',
        body: formData,
    });
};

export const checkGeminiCookies = (): Promise<{ has_cookie: boolean; valid: boolean }> =>
    apiFetch<{ has_cookie: boolean; valid: boolean }>(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies/check`);


// --- Search API ---
export const searchArticlesFiltered = (params: any): Promise<PaginatedResponse<InfoItem>> => {
    return apiFetch<PaginatedResponse<InfoItem>>(`${INTELLIGENCE_SERVICE_PATH}/search/articles_filtered`, {
        method: 'POST',
        body: JSON.stringify(params),
    });
};

// ... keep other search functions ...
export const getFeed = (params: any): Promise<PaginatedResponse<InfoItem>> => {
    return apiFetch<PaginatedResponse<InfoItem>>(`${INTELLIGENCE_SERVICE_PATH}/feed`, {
        method: 'POST',
        body: JSON.stringify(params),
    });
};

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

// --- LLM Search Task API ---
export const createLlmSearchTask = (data: LlmSearchRequest): Promise<LlmSearchResponse> =>
    apiFetch<LlmSearchResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/llm`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getLlmSearchTasks = (params: { page?: number; limit?: number }): Promise<LlmSearchTasksResponse> => {
    const query = createApiQuery(params);
    return apiFetch<LlmSearchTasksResponse>(`${INTELLIGENCE_SERVICE_PATH}/search/tasks${query}`);
};

export const getLlmSearchTask = (taskId: string): Promise<LlmSearchTaskDetail> =>
    apiFetch<LlmSearchTaskDetail>(`${INTELLIGENCE_SERVICE_PATH}/search/tasks/${taskId}`);

export const downloadLlmTaskResult = async (taskId: string): Promise<Blob> => {
    const url = `${INTELLIGENCE_SERVICE_PATH}/search/tasks/${taskId}/download`;
    const token = localStorage.getItem('accessToken');
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error('下载失败');
    return response.blob();
};

export const getIntelligenceStats = (): Promise<any> => 
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/tasks/stats`);