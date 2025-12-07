
// src/api/intelligence.ts

import { API_BASE_URL, INTELLIGENCE_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { 
    SpiderSource, 
    SpiderPoint, 
    SpiderTask, 
    PendingArticle, 
    ApprovedArticle,
    PaginatedResponse,
    SearchChunkResult,
    GenericPoint,
    GenericTask
} from '../types';

const INTELSPIDER_PATH = `${API_BASE_URL}/intelspider`;

// --- Type Aliases for Compatibility ---
export type IntelligenceSourcePublic = SpiderSource & {
    points_count?: number;
    articles_count?: number;
    // Map 'source_name' to 'name' if needed by components, or components use source_name
    name?: string; 
};
export type IntelligencePointPublic = SpiderPoint & {
    is_active?: boolean;
    enabled?: boolean;
    name?: string; // SpiderPoint uses point_name? No, interface has point_name. Components expect name.
    url?: string;
    url_filters?: string[];
    extra_hint?: string;
    created_at?: string;
    type?: string;
    mode?: string;
    list_hint?: string;
    list_filters?: string[];
};
export type ArticlePublic = ApprovedArticle & {
    content: string;
    created_at: string;
};
export type PendingArticlePublic = PendingArticle;
export type IntelligenceTaskPublic = SpiderTask & {
    task_type?: string;
};

// --- IntelSpider / Sources ---

export const getSpiderSources = async (): Promise<SpiderSource[]> => 
    apiFetch<SpiderSource[]>(`${INTELSPIDER_PATH}/sources`);

// Alias
export const getSources = async (): Promise<IntelligenceSourcePublic[]> => {
    const sources = await getSpiderSources();
    return sources.map(s => ({ ...s, name: s.source_name }));
};

export const getSpiderPoints = (source_name?: string): Promise<SpiderPoint[]> => {
    const query = source_name ? `?source_name=${encodeURIComponent(source_name)}` : '';
    return apiFetch<SpiderPoint[]>(`${INTELSPIDER_PATH}/points${query}`);
};

// Alias and map fields
export const getPoints = async (params: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    const points = await getSpiderPoints(params.source_name);
    return points.map(p => ({ 
        ...p, 
        name: p.point_name, 
        url: p.point_url, 
        is_active: true // Default to true if not returned? Or add backend field.
    }));
};

export const createSpiderPoint = (data: {
    source_name: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
}): Promise<{ ok: boolean; point_id: string }> => {
    return apiFetch(`${INTELSPIDER_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Alias and map fields
export const createPoint = (data: any): Promise<any> => {
    const payload = {
        source_name: data.source_name,
        point_name: data.name,
        point_url: data.url,
        cron_schedule: data.cron_schedule,
    };
    return createSpiderPoint(payload);
};

export const deletePoints = (ids: string[]): Promise<void> => 
    apiFetch(`${INTELSPIDER_PATH}/points`, { method: 'DELETE', body: JSON.stringify({ ids }) });

export const deleteSource = (name: string): Promise<void> =>
    apiFetch(`${INTELSPIDER_PATH}/sources/${encodeURIComponent(name)}`, { method: 'DELETE' });

export const togglePoint = (id: string, active: boolean): Promise<void> =>
    // Assuming backend endpoint
    apiFetch(`${INTELSPIDER_PATH}/points/${id}/toggle`, { method: 'POST', body: JSON.stringify({ active }) });

export const runSpiderPoint = (point_id: string, pages: number = 1): Promise<{ ok: boolean; processed: number }> => {
    return apiFetch(`${INTELSPIDER_PATH}/points/${point_id}/run-now`, {
        method: 'POST',
        body: JSON.stringify(pages), // Sending integer as body based on doc
    });
};

// Alias
export const runPoint = (id: string): Promise<any> => runSpiderPoint(id);

// --- IntelSpider / Tasks ---

export const getSpiderTasks = (): Promise<SpiderTask[]> => 
    apiFetch<SpiderTask[]>(`${INTELSPIDER_PATH}/tasks`);

// Alias
export const getTasks = async (params: any): Promise<PaginatedResponse<IntelligenceTaskPublic>> => {
    const tasks = await getSpiderTasks();
    // Mock pagination for list API
    return { items: tasks, total: tasks.length, page: 1, limit: 100, totalPages: 1 };
};

// --- IntelSpider / Pending Articles & Review ---

export const createPendingArticle = (data: any): Promise<{ ok: boolean; pending_id: string }> =>
    apiFetch(`${INTELSPIDER_PATH}/pending`, {
        method: 'POST',
        body: JSON.stringify(data),
    });

export const getSpiderPendingArticles = (): Promise<PendingArticle[]> => 
    apiFetch<PendingArticle[]>(`${INTELSPIDER_PATH}/pending`);

// Alias
export const getPendingArticles = async (params: any): Promise<PaginatedResponse<PendingArticlePublic>> => {
    // If backend supports filtering via query params, use them.
    // For now getting all and filtering client side if needed or if backend supports it.
    const query = createApiQuery(params); 
    // Assuming /intelspider/pending supports query params like ?status=pending
    const articles = await apiFetch<PendingArticle[]>(`${INTELSPIDER_PATH}/pending${query}`);
    return { items: articles, total: articles.length, page: 1, limit: 100, totalPages: 1 };
};

export const approveSpiderArticles = (article_ids: string[]): Promise<{ ok: boolean; processed: number }> =>
    apiFetch(`${INTELSPIDER_PATH}/review/approve`, {
        method: 'POST',
        body: JSON.stringify({ article_ids }),
    });

// Alias
export const confirmPendingArticles = (ids: string[]): Promise<any> => approveSpiderArticles(ids);

export const rejectPendingArticles = (ids: string[]): Promise<any> =>
    apiFetch(`${INTELSPIDER_PATH}/review/reject`, { method: 'POST', body: JSON.stringify({ article_ids: ids }) });

// --- IntelSpider / Approved Articles ---

export const getSpiderArticles = (params: { page?: number; limit?: number; source_name?: string; point_id?: string }): Promise<ApprovedArticle[]> => {
    const query = createApiQuery(params);
    return apiFetch<ApprovedArticle[]>(`${INTELSPIDER_PATH}/articles${query}`);
};

// --- Legacy / Intelligence Collection Service ---

export const getIntelligenceStats = (): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/stats`);

// Used by IntelligenceDataManager
export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles${query}`);
};

// Map legacy function
export const searchArticlesFiltered = getArticles; 

export const deleteArticles = (ids: string[]): Promise<void> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles`, { method: 'DELETE', body: JSON.stringify({ ids }) });

export const getArticleById = (id: string): Promise<ArticlePublic> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}`);

export const getArticleHtml = async (id: string): Promise<string> => {
    const res = await fetch(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}/html`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    });
    if (!res.ok) return '';
    return res.text();
};

export const downloadArticlePdf = async (id: string): Promise<Blob> => {
    const res = await fetch(`${INTELLIGENCE_SERVICE_PATH}/articles/${id}/pdf`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
};

export const searchChunks = (params: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks`, { method: 'POST', body: JSON.stringify(params) });

export const exportChunks = (params: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/search/chunks/export`, { method: 'POST', body: JSON.stringify(params) });

export const createLlmSearchTask = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/llm_search/tasks`, { method: 'POST', body: JSON.stringify(data) });

export const getLlmSearchTasks = (params: any): Promise<any> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/llm_search/tasks${query}`);
};

// --- Gemini Settings ---
export const updateGeminiCookies = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`, { method: 'POST', body: JSON.stringify(data) });

export const checkGeminiCookies = (): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/gemini/cookies`);

export const toggleHtmlGeneration = (enable: boolean): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/html_generation/toggle`, { method: 'POST', body: JSON.stringify({ enable }) });

// --- Generic Crawler ---
export const createGenericPoint = (data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points`, { method: 'POST', body: JSON.stringify(data) });

export const updateGenericPoint = (id: string, data: any): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points/${id}`, { method: 'PUT', body: JSON.stringify(data) });

export const getSourcesAndPoints = (): Promise<any[]> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/points/all`);

export const getGenericTasks = (params: any): Promise<any> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/generic/tasks${query}`);
};
