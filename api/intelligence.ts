

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
    ApprovedArticle,
    SpiderTaskResponse,
    ArticleQuery,
    ArticleResponse
} from '../types';

const INTELSPIDER_PATH = `${API_BASE_URL}/intelspider`;

// --- Type Aliases for Compatibility ---
export type IntelligenceSourcePublic = SpiderSource & {
    points_count?: number; // Legacy prop, might be undefined in new API
    articles_count?: number; // Legacy prop
    source_name?: string; // Mapped alias
};
export type IntelligencePointPublic = SpiderPoint & {
    name?: string; // Mapped alias
    url?: string; // Mapped alias
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

// Alias with mapping for compatibility with old components
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

export const deleteSpiderSource = (sourceId: string): Promise<void> => {
    return apiFetch(`${INTELSPIDER_PATH}/sources/${sourceId}`, { method: 'DELETE' });
};
export const deleteSource = deleteSpiderSource; // Alias

// --- IntelSpider / Points ---

export const getSpiderPoints = (source_id?: string): Promise<SpiderPoint[]> => {
    const query = source_id ? `?source_id=${encodeURIComponent(source_id)}` : '';
    return apiFetch<SpiderPoint[]>(`${INTELSPIDER_PATH}/points${query}`);
};

// Alias and map fields
export const getPoints = async (params: { source_name?: string }): Promise<IntelligencePointPublic[]> => {
    // Note: Old components passed source_name. New API uses ID. 
    // This compat function will just fetch all and filter by name on client side if source_id is not readily available, 
    // or rely on the UI updating to pass source_id.
    // Ideally, UI components should now use `getSpiderPoints` directly.
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
    article_url_filters?: string[];
}): Promise<SpiderPoint> => {
    return apiFetch<SpiderPoint>(`${INTELSPIDER_PATH}/points`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

// Alias
export const createPoint = (data: any): Promise<any> => {
    return createSpiderPoint({
        source_name: data.source_name,
        point_name: data.name || data.point_name,
        point_url: data.url || data.point_url,
        cron_schedule: data.cron_schedule,
        max_depth: data.max_depth || 5,
        pagination_instruction: data.pagination_instruction,
        article_url_filters: data.list_filters
    });
};

export const runSpiderPoint = (point_id: string): Promise<{ status: string; point_id: string }> => {
    return apiFetch(`${INTELSPIDER_PATH}/points/${point_id}/run`, {
        method: 'POST',
    });
};
export const runPoint = (id: string): Promise<any> => runSpiderPoint(id);

export const deleteSpiderPoint = (point_id: string): Promise<void> => {
    return apiFetch(`${INTELSPIDER_PATH}/points/${point_id}`, { method: 'DELETE' });
};
// Compatible Delete (accepts array of IDs, but new API does one by one)
export const deletePoints = async (ids: string[]): Promise<void> => {
    for (const id of ids) {
        await deleteSpiderPoint(id);
    }
};

export const togglePoint = (id: string, active: boolean): Promise<void> => {
    // New API doesn't support explicit toggle endpoint in documentation.
    // Assuming update via recreation or ignoring for now as it's not in the new spec.
    console.warn("Toggle point not supported in new API spec");
    return Promise.resolve();
};


// --- IntelSpider / Tasks ---

export const getSpiderPointTasks = (point_id: string, params?: { page?: number, limit?: number, status?: string, task_type?: string }): Promise<SpiderTaskResponse> => {
    const query = createApiQuery(params);
    return apiFetch<SpiderTaskResponse>(`${INTELSPIDER_PATH}/points/${point_id}/tasks${query}`);
};

// --- IntelSpider / Articles ---

export const getSpiderArticles = (params: ArticleQuery): Promise<ArticleResponse> => {
    const query = createApiQuery(params);
    return apiFetch<ArticleResponse>(`${INTELSPIDER_PATH}/articles${query}`);
};

export const reviewSpiderArticle = (article_id: string, is_reviewed: boolean): Promise<void> => {
    return apiFetch(`${INTELSPIDER_PATH}/articles/${article_id}/review`, {
        method: 'POST',
        body: JSON.stringify({ is_reviewed })
    });
};

export const getSpiderPendingArticles = async (): Promise<PendingArticle[]> => {
    const response = await getSpiderArticles({ limit: 100 }); 
    return response.items.map(a => ({
        id: a.id,
        title: a.title,
        original_url: a.original_url,
        source_name: 'Unknown', 
        point_name: a.point_id,
        status: a.is_reviewed ? 'approved' : 'pending',
        content: a.content,
        publish_date: a.publish_time,
        created_at: a.collected_at
    }));
}

export const getSpiderTasks = async (params?: any): Promise<SpiderTask[]> => {
    // Mock global task fetch or return empty since new API is point-centric
    return [];
};

// Legacy Aliases for Articles
export const getPendingArticles = async (params: any): Promise<PaginatedResponse<PendingArticlePublic>> => {
    const response = await getSpiderArticles({ limit: 100 });
    const mapped = response.items.map(a => ({
        id: a.id,
        title: a.title,
        original_url: a.original_url,
        source_name: 'Unknown', 
        point_name: a.point_id, 
        status: a.is_reviewed ? 'approved' : 'pending',
        content: a.content,
        publish_date: a.publish_time,
        created_at: a.collected_at
    })) as PendingArticlePublic[];
    
    return { items: mapped, total: response.total, page: 1, limit: 100, totalPages: 1 };
};

export const approveSpiderArticles = (article_ids: string[]): Promise<any> => {
    // New API doesn't document batch approval endpoint yet.
    // We will simulate iteration.
    const promises = article_ids.map(id => reviewSpiderArticle(id, true));
    return Promise.all(promises).then(() => ({ ok: true, processed: article_ids.length }));
};
export const confirmPendingArticles = approveSpiderArticles;
export const rejectPendingArticles = (ids: string[]): Promise<any> => {
    return Promise.resolve({ ok: true });
};

// Legacy support for getTasks (global) - New API doesn't support it directly.
export const getTasks = async (params: any): Promise<PaginatedResponse<IntelligenceTaskPublic>> => {
    return { items: [], total: 0, page: 1, limit: 100, totalPages: 1 };
};


// --- Legacy / Intelligence Collection Service (Keep for Dashboard/Search) ---

export const getIntelligenceStats = (): Promise<any> =>
    apiFetch(`${INTELLIGENCE_SERVICE_PATH}/stats`);

// Used by IntelligenceDataManager
export const getArticles = (params: any): Promise<PaginatedResponse<ArticlePublic>> => {
    const query = createApiQuery(params);
    return apiFetch(`${INTELLIGENCE_SERVICE_PATH}/articles${query}`);
};

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

// --- Generic Crawler (Legacy) ---
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
