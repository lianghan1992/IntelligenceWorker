
// src/api/intelligence.ts

import { API_BASE_URL, INTELLIGENCE_SERVICE_PATH } from '../config';
import { apiFetch, createApiQuery } from './helper';
import { 
    SpiderSource, 
    SpiderPoint, 
    SpiderTask, 
    SpiderArticle,
    SpiderStatus,
    PaginatedResponse,
    SearchChunkResult,
    PendingArticle,
    ApprovedArticle
} from '../types';

const INTELSPIDER_PATH = `${API_BASE_URL}/intelspider`;

// --- Type Aliases for Compatibility ---
export type IntelligenceSourcePublic = SpiderSource & {
    points_count?: number;
    articles_count?: number;
};
export type IntelligencePointPublic = SpiderPoint & {
    name?: string;
    url?: string;
    extra_hint?: string; // Legacy
    url_filters?: string[]; // Legacy
    type?: string; // Legacy
    mode?: string; // Legacy
    list_hint?: string; // Legacy
    list_filters?: string[]; // Legacy
};
export type ArticlePublic = ApprovedArticle & {
    content: string;
    created_at: string;
};
export type PendingArticlePublic = PendingArticle;
export type IntelligenceTaskPublic = SpiderTask & {
    source_name?: string;
    point_name?: string;
    detail?: string;
    stage?: string;
    start_time?: string;
};

// --- IntelSpider Service Status ---
export const getSpiderStatus = (): Promise<SpiderStatus> => 
    apiFetch<SpiderStatus>(`${INTELSPIDER_PATH}/status`);

// --- IntelSpider / Sources ---

export const getSpiderSources = async (): Promise<SpiderSource[]> => 
    apiFetch<SpiderSource[]>(`${INTELSPIDER_PATH}/sources`);

// Alias with mapping
export const getSources = async (): Promise<IntelligenceSourcePublic[]> => {
    const sources = await getSpiderSources();
    return sources.map(s => ({ ...s, source_name: s.name }));
};

export const createSpiderSource = (data: { name: string; base_url?: string }): Promise<SpiderSource> => {
    return apiFetch<SpiderSource>(`${INTELSPIDER_PATH}/sources`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

export const deleteSource = (name: string): Promise<void> => {
    // Note: The new API documentation DOES NOT explicitly list a delete source endpoint.
    // Keeping this for compatibility if the backend supports it, otherwise it might fail.
    return apiFetch(`${INTELSPIDER_PATH}/sources/${encodeURIComponent(name)}`, { method: 'DELETE' });
};

// --- IntelSpider / Points ---

export const getSpiderPoints = (source_id?: string): Promise<SpiderPoint[]> => {
    const query = source_id ? `?source_id=${encodeURIComponent(source_id)}` : '';
    return apiFetch<SpiderPoint[]>(`${INTELSPIDER_PATH}/points${query}`);
};

// Alias and map fields
export const getPoints = async (params: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    // The new API filters by source_id, not source_name directly, but let's assume we can map it or 
    // fetch all and filter client side if name provided. 
    // However, for compatibility, if source_name is passed, we might need to find the ID first.
    // Ideally, UI should pass ID.
    const points = await getSpiderPoints();
    const filtered = params.source_name 
        ? points.filter(p => p.source_name === params.source_name) 
        : points;
    
    return filtered.map(p => ({ 
        ...p, 
        name: p.point_name, 
        url: p.point_url,
    }));
};

export const createSpiderPoint = (data: {
    source_id?: string;
    source_name?: string;
    point_name: string;
    point_url: string;
    cron_schedule: string;
    max_depth?: number;
    pagination_instruction?: string;
}): Promise<SpiderPoint> => {
    return apiFetch<SpiderPoint>(`${INTELSPIDER_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Alias
export const createPoint = (data: any): Promise<any> => {
    // Map legacy fields if necessary
    return createSpiderPoint({
        source_name: data.source_name,
        point_name: data.name || data.point_name,
        point_url: data.url || data.point_url,
        cron_schedule: data.cron_schedule,
        max_depth: data.max_depth || 5,
        pagination_instruction: data.pagination_instruction
    });
};

export const runSpiderPoint = (point_id: string): Promise<{ status: string; point_id: string }> => {
    // POST with no body
    return apiFetch(`${INTELSPIDER_PATH}/points/${point_id}/run`, {
        method: 'POST',
    });
};

// Alias
export const runPoint = (id: string): Promise<any> => runSpiderPoint(id);

export const deletePoints = (ids: string[]): Promise<void> => 
    apiFetch(`${INTELSPIDER_PATH}/points`, { method: 'DELETE', body: JSON.stringify({ ids }) });

export const togglePoint = (id: string, active: boolean): Promise<void> =>
    apiFetch(`${INTELSPIDER_PATH}/points/${id}/toggle`, { method: 'POST', body: JSON.stringify({ active }) });


// --- IntelSpider / Tasks ---

export const getSpiderPointTasks = (point_id: string): Promise<SpiderTask[]> => 
    apiFetch<SpiderTask[]>(`${INTELSPIDER_PATH}/points/${point_id}/tasks`);

// Fetch all spider tasks (Admin)
export const getSpiderTasks = (params?: any): Promise<SpiderTask[]> => {
    const query = createApiQuery(params);
    return apiFetch<SpiderTask[]>(`${INTELSPIDER_PATH}/tasks${query}`);
}

// Legacy support: Mock global tasks using a different approach or fail gracefully
export const getTasks = async (params: any): Promise<PaginatedResponse<IntelligenceTaskPublic>> => {
    // The new API does not support global task listing.
    // Return empty for now to avoid breaking legacy calls.
    return { items: [], total: 0, page: 1, limit: 100, totalPages: 1 };
};

// --- IntelSpider / Articles ---

export const getSpiderArticles = (params: { point_id?: string }): Promise<SpiderArticle[]> => {
    const query = createApiQuery(params);
    return apiFetch<SpiderArticle[]>(`${INTELSPIDER_PATH}/articles${query}`);
};

export const getSpiderPendingArticles = async (): Promise<PendingArticle[]> => {
    // Reusing getSpiderArticles but filtering for unreviewed/pending if API supports it, or filter locally.
    // Assuming backend endpoint /articles returns everything.
    const articles = await getSpiderArticles({}); // Fetch all
    // Map to PendingArticle
    return articles.map(a => ({
        id: a.id,
        title: a.title,
        original_url: a.original_url,
        source_name: 'Unknown', // Mapper needed if not in SpiderArticle, assuming backend might not return name directly
        point_name: a.point_id,
        status: a.is_reviewed ? 'approved' : 'pending',
        content: a.content,
        publish_date: a.publish_time,
        created_at: a.collected_at
    }));
}

// Legacy Aliases for Articles
export const getPendingArticles = async (params: any): Promise<PaginatedResponse<PendingArticlePublic>> => {
    // We treat "unreviewed" or just "all" articles as the pool.
    // The new API doesn't distinguish pending vs approved in endpoints, just returns list.
    const articles = await getSpiderArticles({});
    // Map SpiderArticle to PendingArticlePublic
    const mapped = articles.map(a => ({
        id: a.id,
        title: a.title,
        original_url: a.original_url,
        source_name: 'Unknown', // Need to fetch source details or points to map
        point_name: a.point_id, // Placeholder
        status: a.is_reviewed ? 'approved' : 'pending',
        content: a.content,
        publish_date: a.publish_time,
        created_at: a.collected_at
    })) as PendingArticlePublic[];
    
    return { items: mapped, total: mapped.length, page: 1, limit: 100, totalPages: 1 };
};

export const approveSpiderArticles = (article_ids: string[]): Promise<any> => {
    // New API doesn't document approval endpoint. 
    throw new Error("Approval endpoint not available in current API version.");
};
export const confirmPendingArticles = approveSpiderArticles;
export const rejectPendingArticles = (ids: string[]): Promise<any> => {
    throw new Error("Reject endpoint not available in current API version.");
};


// --- Legacy / Intelligence Collection Service (Keep for Dashboard/Search) ---

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